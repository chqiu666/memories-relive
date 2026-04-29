/**
 * Seed 脚本：把现有 memories.json 数据导入 Postgres
 * 运行方式：npx tsx src/db/seed.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'

async function seed() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL 未设置。请先执行 vercel env pull .env.local')
        process.exit(1)
    }

    const sql = neon(databaseUrl)

    // 建表：memories
    await sql`
        CREATE TABLE IF NOT EXISTS memories (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            thumbnail_url TEXT,
            model_url   TEXT,
            model_full_url TEXT,
            model_web_url TEXT,
            model_garden_url TEXT,
            photo_latitude DOUBLE PRECISION,
            photo_longitude DOUBLE PRECISION,
            photo_location_source TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `

    await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_full_url TEXT`
    await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_web_url TEXT`
    await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS model_garden_url TEXT`
    await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS photo_latitude DOUBLE PRECISION`
    await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS photo_longitude DOUBLE PRECISION`
    await sql`ALTER TABLE memories ADD COLUMN IF NOT EXISTS photo_location_source TEXT`

    // 建表：traces
    await sql`
        CREATE TABLE IF NOT EXISTS traces (
            id          SERIAL PRIMARY KEY,
            memory_id   TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
            position    JSONB NOT NULL DEFAULT '[0,0,0]',
            label       TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            expand_dir  TEXT,
            sort_order  INT NOT NULL DEFAULT 0,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `

    // 索引
    await sql`CREATE INDEX IF NOT EXISTS idx_traces_memory_id ON traces(memory_id)`

    console.log('✅ 表结构已创建')

    // 读取现有 memories.json
    const dataPath = join(__dirname, '..', 'data', 'memories.json')
    const memories = JSON.parse(readFileSync(dataPath, 'utf-8'))

    for (const mem of memories) {
        // Upsert memory
        await sql`
            INSERT INTO memories (id, title, description, thumbnail_url, model_url, model_full_url)
            VALUES (${mem.id}, ${mem.title}, ${mem.description}, ${mem.thumbnail}, ${mem.modelSrc}, ${mem.modelSrc})
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                thumbnail_url = EXCLUDED.thumbnail_url,
                model_url = EXCLUDED.model_url,
                model_full_url = EXCLUDED.model_full_url,
                updated_at = now()
        `
        console.log(`  📦 Memory: ${mem.id}`)

        // 删除旧 traces 再重新插入
        await sql`DELETE FROM traces WHERE memory_id = ${mem.id}`

        if (mem.tiles && Array.isArray(mem.tiles)) {
            for (let i = 0; i < mem.tiles.length; i++) {
                const tile = mem.tiles[i]
                await sql`
                    INSERT INTO traces (memory_id, position, label, description, expand_dir, sort_order)
                    VALUES (
                        ${mem.id},
                        ${JSON.stringify(tile.position)},
                        ${tile.label || ''},
                        ${tile.description || ''},
                        ${tile.expandDir || null},
                        ${i}
                    )
                `
                console.log(`    🔖 Trace: ${tile.label}`)
            }
        }
    }

    console.log('\n✅ Seed 完成！所有数据已导入 Postgres。')
}

seed().catch((err) => {
    console.error('❌ Seed 失败:', err)
    process.exit(1)
})
