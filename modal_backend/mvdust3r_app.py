"""
MV-DUSt3R+ Modal App — Multi-view 3D Reconstruction
Deploys MV-DUSt3R+ on Modal for serverless GPU inference.

Usage:
    MODAL_ENVIRONMENT=dev-mvdust3r modal run modal_backend/mvdust3r_app.py

Put 4-12 images in modal_backend/test_images/ and run. Output goes to modal_backend/output/.
"""

import modal
import io
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Modal App & Image
# ---------------------------------------------------------------------------
APP_NAME = "memories-relive-mvdust3r"
VOLUME_NAME = "mvdust3r-model-cache"
MODEL_CACHE_PATH = "/cache/models"
CHECKPOINT_NAME = "MVDp_s2.pth"  # MV-DUSt3R+ stage-2 (best quality)
CHECKPOINT_URL = (
    "https://huggingface.co/Zhenggang/MV-DUSt3R/resolve/main/checkpoints/MVDp_s2.pth"
)
TIMEOUT_SECONDS = 900  # 15 min — first run downloads ~8GB + inference can be slow

app = modal.App(name=APP_NAME)
model_volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

mvdust3r_image = (
    modal.Image.debian_slim(python_version="3.12")
    # System deps for OpenCV, OpenGL rendering, git, compilers
    .apt_install(
        "git", "wget", "libgl1-mesa-glx", "libglib2.0-0",
        "libsm6", "libxext6", "libxrender-dev",
        "build-essential", "ninja-build",
    )
    # PyTorch 2.5.1 + CUDA 12.1
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        index_url="https://download.pytorch.org/whl/cu121",
    )
    # Clone MV-DUSt3R+ repo into the container
    .run_commands(
        "git clone https://github.com/facebookresearch/mvdust3r.git /workspace/mvdust3r",
    )
    # Install MV-DUSt3R+ Python dependencies (minus torch, already installed)
    .pip_install(
        "imageio[ffmpeg]",
        "numpy==1.26.4",
        "roma",
        "matplotlib",
        "tqdm",
        "opencv-python-headless",
        "scipy",
        "einops",
        "trimesh",
        "tensorboard",
        "pyglet<2",
        "huggingface-hub[torch]>=0.22",
        "h5py",
        "scikit-learn",
        "gsplat==1.4.0",
        "torchmetrics[image]==1.6.0",
        "pillow>=11.0.0",
        "pillow-heif>=0.16.0",
        "fvcore",
        "iopath",
    )
    # pytorch3d — download prebuilt conda package and extract to site-packages
    # This mirrors MV-DUSt3R+'s install.sh approach (conda tar for py312_cu121_pyt241)
    .run_commands(
        "wget -q https://anaconda.org/pytorch3d/pytorch3d/0.7.8/download/linux-64/pytorch3d-0.7.8-py312_cu121_pyt241.tar.bz2 -O /tmp/pytorch3d.tar.bz2",
        "mkdir -p /tmp/pytorch3d_pkg && cd /tmp/pytorch3d_pkg && tar xjf /tmp/pytorch3d.tar.bz2",
        "cp -r /tmp/pytorch3d_pkg/lib/python3.12/site-packages/* /usr/local/lib/python3.12/site-packages/ 2>/dev/null || "
        "cp -r /tmp/pytorch3d_pkg/lib/python*/site-packages/* /usr/local/lib/python3.12/site-packages/",
        "rm -rf /tmp/pytorch3d.tar.bz2 /tmp/pytorch3d_pkg",
    )
)



# ---------------------------------------------------------------------------
# Helper: download / cache checkpoint
# ---------------------------------------------------------------------------
def _ensure_checkpoint(device: str = "cpu") -> str:
    """Download checkpoint to Modal Volume if not already cached. Returns path."""
    import os
    ckpt_path = os.path.join(MODEL_CACHE_PATH, CHECKPOINT_NAME)
    if os.path.exists(ckpt_path):
        logger.info("Checkpoint already cached at %s", ckpt_path)
        return ckpt_path

    logger.info("Downloading checkpoint from %s ...", CHECKPOINT_URL)
    os.makedirs(MODEL_CACHE_PATH, exist_ok=True)

    import urllib.request
    urllib.request.urlretrieve(CHECKPOINT_URL, ckpt_path)

    model_volume.commit()
    logger.info("Checkpoint saved and committed to volume.")
    return ckpt_path


# ---------------------------------------------------------------------------
# Core inference function
# ---------------------------------------------------------------------------
@app.function(
    gpu="a10g",
    volumes={MODEL_CACHE_PATH: model_volume},
    timeout=TIMEOUT_SECONDS,
    image=mvdust3r_image,
    memory=32768,  # 32 GB RAM — model is large
)
def reconstruct_scene(
    image_bytes_list: list[bytes],
    image_size: int = 512,
    conf_threshold: float = 3.0,
) -> dict:
    """
    Run MV-DUSt3R+ multi-view reconstruction.

    Args:
        image_bytes_list: List of image file bytes (at least 2 images).
        image_size: Resize images to this before inference (224 or 512).
        conf_threshold: Confidence threshold for filtering low-quality points.

    Returns:
        dict with reconstruction results.
    """
    import sys
    import os
    import time
    import tempfile
    import numpy as np
    import torch

    # Add mvdust3r to Python path
    sys.path.insert(0, "/workspace/mvdust3r")

    from dust3r.model import AsymmetricCroCo3DStereo
    from dust3r.utils.device import to_numpy

    device = "cuda"

    # 1) Save incoming bytes to temp files so load_images can read them
    tmp_paths = []
    tmpdir = tempfile.mkdtemp(prefix="mvdust3r_")
    for i, img_bytes in enumerate(image_bytes_list):
        path = os.path.join(tmpdir, f"input_{i:04d}.png")
        with open(path, "wb") as f:
            f.write(img_bytes)
        tmp_paths.append(path)

    logger.info("Received %d images, loading...", len(tmp_paths))

    # Auto-convert HEIC files to JPEG (DUSt3R load_images uses PIL which can't read HEIC)
    import pillow_heif
    for idx, path in enumerate(tmp_paths):
        if path.lower().endswith((".heic", ".heif")):
            logger.info("Converting HEIC to JPEG: %s", path)
            heif_file = pillow_heif.open_heif(path, convert_hdr_to_8bit=True)
            img_pil = heif_file.to_pillow()
            new_path = path.rsplit(".", 1)[0] + ".jpg"
            img_pil.save(new_path, format="JPEG", quality=95)
            tmp_paths[idx] = new_path

    # 2) Load model
    ckpt_path = _ensure_checkpoint()
    logger.info("Loading model from %s", ckpt_path)
    model = AsymmetricCroCo3DStereo.from_pretrained(ckpt_path).to(device)
    logger.info("Model loaded successfully.")

    # Adapt MV-DUSt3R+ model for standard pair-based inference:
    # 1) Disable multi-ref flag (MVDp_s2 sets m_ref_flag=True which asserts n_ref>1)
    model.m_ref_flag = False
    model.n_ref = 1
    # 2) Wrap forward: model.forward(view1, view2s_all) expects view2s_all as a LIST,
    #    but DUSt3R's inference() passes a single dict view2.
    _original_forward = model.forward
    def _patched_forward(view1, view2):
        res1, res2s = _original_forward(view1, [view2])
        return res1, res2s[0]
    model.forward = _patched_forward

    # 3) Standard DUSt3R pair-based inference pipeline
    import copy
    from dust3r.inference import inference
    from dust3r.utils.image import load_images
    from dust3r.image_pairs import make_pairs
    from dust3r.cloud_opt import global_aligner, GlobalAlignerMode

    imgs = load_images(tmp_paths, size=image_size, verbose=True)
    if len(imgs) == 1:
        imgs = [imgs[0], copy.deepcopy(imgs[0])]
        imgs[1]["idx"] = 1

    pairs = make_pairs(imgs, scene_graph="complete", prefilter=None, symmetrize=True)

    # Run inference
    torch.cuda.synchronize()
    t_start = time.time()
    output = inference(pairs, model, device, batch_size=1, verbose=True)
    torch.cuda.synchronize()
    t_inf = time.time()

    # Global alignment
    mode = (
        GlobalAlignerMode.PointCloudOptimizer
        if len(imgs) > 2
        else GlobalAlignerMode.PairViewer
    )
    scene = global_aligner(output, device=device, mode=mode, verbose=True)

    if mode == GlobalAlignerMode.PointCloudOptimizer:
        scene.compute_global_alignment(init="mst", niter=300, schedule="linear", lr=0.01)
    torch.cuda.synchronize()
    t_opt = time.time()

    inference_time = t_inf - t_start
    optimization_time = t_opt - t_inf
    logger.info("Inference: %.2fs, Optimization: %.2fs", inference_time, optimization_time)

    # 4) Extract point cloud + colors
    pts_3d = scene.get_pts3d()
    rgbs = scene.imgs

    scene.min_conf_thr = float(scene.conf_trf(torch.tensor(conf_threshold)))
    masks = to_numpy(scene.get_masks())

    all_pts = np.concatenate([to_numpy(p)[m] for p, m in zip(pts_3d, masks)])
    all_rgb = np.concatenate([r[m] for r, m in zip(rgbs, masks)])

    # 5) Export as GLB for Three.js
    import trimesh
    pct = trimesh.PointCloud(
        all_pts.reshape(-1, 3),
        colors=(all_rgb.reshape(-1, 3) * 255).astype(np.uint8)
    )
    glb_buffer = io.BytesIO()
    pct.export(glb_buffer, file_type="glb")
    glb_bytes = glb_buffer.getvalue()

    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)

    return {
        "num_points": int(all_pts.shape[0]),
        "num_views": len(imgs),
        "inference_time": round(inference_time, 3),
        "optimization_time": round(optimization_time, 3),
        "glb_bytes": glb_bytes,
        "points_shape": list(all_pts.shape),
    }



# ---------------------------------------------------------------------------
# Local entrypoint for testing: `modal run modal_backend/mvdust3r_app.py`
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def main():
    """Process all images in test_images/ and output GLB to output/."""
    from pathlib import Path

    print("=" * 60)
    print("MV-DUSt3R+ — Multi-view 3D Reconstruction")
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
    if len(image_files) < 2:
        print(f"❌ Need at least 2 images in {test_dir}, found {len(image_files)}.")
        return

    print(f"Found {len(image_files)} images in {test_dir}:")
    for f in image_files:
        print(f"   {f.name}")

    # Read all image bytes
    images_bytes = []
    for f in image_files:
        images_bytes.append(f.read_bytes())

    print(f"\nSending {len(images_bytes)} images to cloud for reconstruction...")
    result = reconstruct_scene.remote(images_bytes)

    # Save GLB
    glb_path = out_dir / "scene.glb"
    with open(glb_path, "wb") as f:
        f.write(result["glb_bytes"])

    print("\n✅ Reconstruction complete!")
    print(f"   Points:            {result['num_points']}")
    print(f"   Views:             {result['num_views']}")
    print(f"   Inference time:    {result['inference_time']}s")
    print(f"   Optimization time: {result['optimization_time']}s")
    print(f"   GLB saved to:      {glb_path}")
    print(f"   GLB size:          {glb_path.stat().st_size / 1024:.1f} KB")
