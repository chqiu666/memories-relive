-- memories 主表
CREATE TABLE IF NOT EXISTS memories (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,          -- Blob URL 或相对路径
    model_url   TEXT,            -- 默认网页加载用的 30% 采样 PLY（兼容旧字段）
    model_full_url TEXT,         -- 完整 PLY，作为保存和备份
    model_web_url TEXT,          -- 30% 采样 PLY，详情页加载
    model_garden_url TEXT,       -- 10% 采样 PLY，Garden 加载
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_full_url TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_web_url TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_garden_url TEXT;

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
