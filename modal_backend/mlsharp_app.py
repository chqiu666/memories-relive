"""
ml-sharp Modal App — Single-Image Gaussian Splatting
Deploys Apple's SHARP model on Modal for serverless GPU inference.

Based on: https://github.com/kstonekuan/ml-sharp-web-viewer

Usage:
    MODAL_ENVIRONMENT=dev-sharp modal run modal_backend/mlsharp_app.py

Put images in modal_backend/test_images/ and run. Output PLY files go to modal_backend/output/.
"""

import modal
import io
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Modal App & Image
# ---------------------------------------------------------------------------
APP_NAME = "memories-relive-mlsharp"
VOLUME_NAME = "mlsharp-model-cache"
MODEL_CACHE_PATH = "/cache/models"
DEFAULT_MODEL_URL = "https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt"
TIMEOUT_SECONDS = 300

app = modal.App(name=APP_NAME)
model_volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

mlsharp_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    # PyTorch 2.5.1 + CUDA 12.1
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        index_url="https://download.pytorch.org/whl/cu121",
    )
    .pip_install(
        "timm>=1.0.0",
        "scipy>=1.11.0",
        "plyfile>=1.0.0",
        "imageio>=2.30.0",
        "pillow-heif>=0.16.0",
        "numpy>=1.24.0",
        "click>=8.0.0",
        "fastapi[standard]",
    )
    # gsplat requires CUDA compilation
    .run_commands("pip install gsplat --no-build-isolation")
    # Clone ml-sharp and add src/ to PYTHONPATH (avoids pyproject.toml's >=3.13 check)
    .run_commands(
        "git clone https://github.com/kstonekuan/ml-sharp-web-viewer.git /workspace/ml-sharp",
    )
    .env({"PYTHONPATH": "/workspace/ml-sharp/src:$PYTHONPATH"})
    # pillow-heif is already installed above for HEIC support
)



# ---------------------------------------------------------------------------
# Helper: load image from bytes
# ---------------------------------------------------------------------------
def _load_image_from_bytes(image_bytes: bytes, filename: str):
    """Load an image from bytes and extract focal length from EXIF."""
    import numpy as np
    import pillow_heif
    from pathlib import Path
    from PIL import ExifTags, Image

    file_ext = Path(filename).suffix.lower()
    buffer = io.BytesIO(image_bytes)

    if file_ext in [".heic"]:
        heif_file = pillow_heif.open_heif(buffer, convert_hdr_to_8bit=True)
        img_pil = heif_file.to_pillow()
    else:
        img_pil = Image.open(buffer)

    # Extract EXIF data
    img_exif = img_pil.getexif().get_ifd(0x8769)
    exif_dict = {ExifTags.TAGS[k]: v for k, v in img_exif.items() if k in ExifTags.TAGS}

    # Handle image orientation
    exif_orientation = exif_dict.get("Orientation", 1)
    if exif_orientation == 3:
        img_pil = img_pil.transpose(Image.Transpose.ROTATE_180)
    elif exif_orientation == 6:
        img_pil = img_pil.transpose(Image.Transpose.ROTATE_270)
    elif exif_orientation == 8:
        img_pil = img_pil.transpose(Image.Transpose.ROTATE_90)

    # Extract focal length
    f_35mm = exif_dict.get("FocalLengthIn35mmFilm", exif_dict.get("FocalLenIn35mmFilm"))
    if f_35mm is None or f_35mm < 1:
        f_35mm = exif_dict.get("FocalLength")
        if f_35mm is None:
            logger.warning("No focal length in EXIF for %s, using 30mm default.", filename)
            f_35mm = 30.0
        elif f_35mm < 10.0:
            f_35mm *= 8.4  # crude approximation for non-35mm sensors

    img = np.asarray(img_pil)
    if img.ndim < 3 or img.shape[2] == 1:
        img = np.dstack((img, img, img))
    img = img[:, :, :3]  # Remove alpha if present

    # Convert focal length to pixels
    height, width = img.shape[:2]
    f_px = f_35mm * np.sqrt(width**2.0 + height**2.0) / np.sqrt(36**2 + 24**2)

    return img, f_px


def _convert_heic_to_jpeg(image_bytes: bytes) -> bytes:
    """Convert HEIC bytes to JPEG bytes."""
    import pillow_heif
    heif_file = pillow_heif.open_heif(io.BytesIO(image_bytes), convert_hdr_to_8bit=True)
    img_pil = heif_file.to_pillow()
    buf = io.BytesIO()
    img_pil.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Core inference function
# ---------------------------------------------------------------------------
@app.function(
    gpu="a10g",
    volumes={MODEL_CACHE_PATH: model_volume},
    timeout=TIMEOUT_SECONDS,
    image=mlsharp_image,
)
def predict_gaussian_splat(image_bytes: bytes, filename: str) -> tuple[str, bytes]:
    """
    Run SHARP inference on a single image.

    Args:
        image_bytes: Raw image file bytes.
        filename: Original filename (used for format detection).

    Returns:
        Tuple of (output_filename, ply_bytes).
    """
    import numpy as np
    import torch
    import torch.nn.functional as F
    import sys
    from pathlib import Path

    # Ensure ml-sharp source is on the path
    sys.path.insert(0, "/workspace/ml-sharp/src")

    from sharp.models import PredictorParams, create_predictor
    from sharp.utils.gaussians import unproject_gaussians
    from sharp.utils import color_space as cs_utils
    from plyfile import PlyData, PlyElement

    logger.info("Processing %s on Modal GPU", filename)

    # Auto-convert HEIC to JPEG
    from pathlib import Path as _Path
    if _Path(filename).suffix.lower() in (".heic", ".heif"):
        logger.info("Converting HEIC to JPEG: %s", filename)
        image_bytes = _convert_heic_to_jpeg(image_bytes)
        filename = _Path(filename).stem + ".jpg"

    # Load image from bytes
    image, f_px = _load_image_from_bytes(image_bytes, filename)
    height, width = image.shape[:2]

    device = torch.device("cuda")

    # Load or download model
    model_path = Path(MODEL_CACHE_PATH) / "sharp_model.pt"

    def download_model():
        logger.info("Downloading model from %s", DEFAULT_MODEL_URL)
        state = torch.hub.load_state_dict_from_url(
            DEFAULT_MODEL_URL, progress=True, map_location=device
        )
        model_path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(state, model_path)
        model_volume.commit()
        logger.info("Model cached to volume")
        return state

    if model_path.exists():
        logger.info("Loading cached model from volume")
        try:
            state_dict = torch.load(model_path, weights_only=False, map_location=device)
        except Exception as e:
            logger.warning("Cached model is corrupted: %s", e)
            model_path.unlink()
            model_volume.commit()
            state_dict = download_model()
    else:
        state_dict = download_model()

    gaussian_predictor = create_predictor(PredictorParams())
    gaussian_predictor.load_state_dict(state_dict)
    gaussian_predictor.eval()
    gaussian_predictor.to(device)

    internal_shape = (1536, 1536)
    image_pt = torch.from_numpy(image.copy()).float().to(device).permute(2, 0, 1) / 255.0
    disparity_factor = torch.tensor([f_px / width]).float().to(device)

    image_resized_pt = F.interpolate(
        image_pt[None],
        size=(internal_shape[1], internal_shape[0]),
        mode="bilinear",
        align_corners=True,
    )

    logger.info("Running inference")
    with torch.no_grad():
        gaussians_ndc = gaussian_predictor(image_resized_pt, disparity_factor)

    intrinsics = (
        torch.tensor(
            [
                [f_px, 0, width / 2, 0],
                [0, f_px, height / 2, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
            ]
        )
        .float()
        .to(device)
    )

    intrinsics_resized = intrinsics.clone()
    intrinsics_resized[0] *= internal_shape[0] / width
    intrinsics_resized[1] *= internal_shape[1] / height

    gaussians = unproject_gaussians(
        gaussians_ndc, torch.eye(4).to(device), intrinsics_resized, internal_shape
    )

    # --- Serialize to standard point cloud PLY ---
    # Output format matches working PLY files: xyz + normals + uchar RGBA
    # (NOT 3DGS format with f_dc_*/scale/rot — standard viewers can't display that)
    logger.info("Serializing to PLY (standard point cloud format)")

    xyz = gaussians.mean_vectors.flatten(0, 1).detach().cpu().numpy()  # [N, 3]

    # Convert colors: model outputs linear RGB, convert to sRGB then to 0-255
    colors_linear = gaussians.colors.flatten(0, 1).detach().cpu()      # [N, 3]
    colors_srgb = cs_utils.linearRGB2sRGB(colors_linear).numpy()       # [N, 3] in [0, 1]
    colors_u8 = np.clip(colors_srgb * 255, 0, 255).astype(np.uint8)   # [N, 3] as uint8

    # Opacity → alpha
    opacities = gaussians.opacities.flatten(0, 1).detach().cpu().numpy()  # [N]
    alpha_u8 = np.clip(opacities * 255, 0, 255).astype(np.uint8)         # [N]

    # Dummy normals (zeros — not computed by SHARP)
    normals = np.zeros_like(xyz, dtype=np.float32)  # [N, 3]

    num_points = len(xyz)

    dtype_full = [
        ("x", "f4"), ("y", "f4"), ("z", "f4"),
        ("nx", "f4"), ("ny", "f4"), ("nz", "f4"),
        ("red", "u1"), ("green", "u1"), ("blue", "u1"), ("alpha", "u1"),
    ]

    elements = np.empty(num_points, dtype=dtype_full)
    elements["x"] = xyz[:, 0]
    elements["y"] = xyz[:, 1]
    elements["z"] = xyz[:, 2]
    elements["nx"] = normals[:, 0]
    elements["ny"] = normals[:, 1]
    elements["nz"] = normals[:, 2]
    elements["red"] = colors_u8[:, 0]
    elements["green"] = colors_u8[:, 1]
    elements["blue"] = colors_u8[:, 2]
    elements["alpha"] = alpha_u8

    vertex_elements = PlyElement.describe(elements, "vertex")

    # Add empty face element (0 faces) — required by macOS SceneKit Quick Look.
    # Working PLY files from MeshLab/VCGLIB include this; without it,
    # SceneKitQLPreviewExtension crashes.
    face_dtype = np.dtype([("vertex_indices", "O")])
    face_data = np.empty(0, dtype=face_dtype)
    face_elements = PlyElement.describe(face_data, "face")

    plydata = PlyData([vertex_elements, face_elements],
                      comments=["VCGLIB generated"])
    buffer = io.BytesIO()
    plydata.write(buffer)
    buffer.seek(0)
    ply_bytes = buffer.read()

    # Log color stats for debugging
    logger.info("Color stats: R=[%d,%d] G=[%d,%d] B=[%d,%d] mean_opacity=%.3f",
                colors_u8[:, 0].min(), colors_u8[:, 0].max(),
                colors_u8[:, 1].min(), colors_u8[:, 1].max(),
                colors_u8[:, 2].min(), colors_u8[:, 2].max(),
                opacities.mean())

    output_filename = Path(filename).stem + ".ply"
    logger.info("Done processing %s — %d points, %.1f KB PLY",
                filename, num_points, len(ply_bytes) / 1024)

    return output_filename, ply_bytes


# ---------------------------------------------------------------------------
# Web endpoint: called by Next.js /api/generate from Vercel
# Deploy with: MODAL_ENVIRONMENT=dev-mlsharp modal deploy modal_backend/mlsharp_app.py
# ---------------------------------------------------------------------------
from fastapi import UploadFile, File
from fastapi.responses import Response

@app.function(
    gpu="a10g",
    volumes={MODEL_CACHE_PATH: model_volume},
    timeout=TIMEOUT_SECONDS,
    image=mlsharp_image,
)
@modal.fastapi_endpoint(method="POST", label="predict")
async def predict_web(image: UploadFile = File(...)):
    """
    HTTP endpoint for ml-sharp inference.

    POST multipart/form-data with an 'image' field.
    Returns PLY bytes with Content-Type: application/octet-stream.
    """
    image_bytes = await image.read()
    filename = image.filename or "upload.jpg"

    output_filename, ply_bytes = predict_gaussian_splat.local(image_bytes, filename)

    return Response(
        content=ply_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Output-Filename": output_filename,
        },
    )


# ---------------------------------------------------------------------------
# Local entrypoint: `MODAL_ENVIRONMENT=dev-mlsharp modal run modal_backend/mlsharp_app.py`
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def main():
    """Process every image in test_images/ and save PLY outputs to output/."""
    import time
    from pathlib import Path

    print("=" * 60)
    print("ml-sharp — Single-Image Gaussian Splatting")
    print("=" * 60)

    # Resolve paths relative to this file's location
    base_dir = Path(__file__).resolve().parent
    test_dir = base_dir / "test_images"
    out_dir = base_dir / "output"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Collect images
    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".bmp", ".tiff"}
    image_files = sorted(
        p for p in test_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if not image_files:
        print(f"❌ No images found in {test_dir}")
        return

    print(f"Found {len(image_files)} images in {test_dir}:")
    for f in image_files:
        print(f"   {f.name}")

    # Process each image individually
    total_start = time.time()
    for idx, img_path in enumerate(image_files, 1):
        print(f"\n[{idx}/{len(image_files)}] Processing {img_path.name}...")
        image_bytes = img_path.read_bytes()

        t0 = time.time()
        output_filename, ply_bytes = predict_gaussian_splat.remote(image_bytes, img_path.name)
        elapsed = time.time() - t0

        # Save PLY
        ply_path = out_dir / output_filename
        with open(ply_path, "wb") as f:
            f.write(ply_bytes)

        print(f"   ✅ {output_filename} — {len(ply_bytes) / 1024:.1f} KB — {elapsed:.1f}s")

    total_elapsed = time.time() - total_start
    print(f"\n{'=' * 60}")
    print(f"✅ All {len(image_files)} images processed in {total_elapsed:.1f}s")
    print(f"   Output directory: {out_dir}")

