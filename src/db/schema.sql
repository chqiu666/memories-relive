-- memories 主表
CREATE TABLE IF NOT EXISTS memories (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,          -- Blob URL 或相对路径
    model_url   TEXT,            -- Blob URL 或相对路径
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- traces 痕迹子表（每个 memory 有多个 trace/tile）
CREATE TABLE IF NOT EXISTS traces (
    id          SERIAL PRIMARY KEY,
    memory_id   TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    position    JSONB NOT NULL DEFAULT '[0,0,0]',  -- [x, y, z]
    label       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    expand_dir  TEXT,                               -- 'up' | 'down' | null
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_traces_memory_id ON traces(memory_id);
