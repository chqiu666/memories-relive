/**
 * One-off script to update trace positions after re-picking coordinates.
 * Run with: node scripts/update-trace-positions.mjs
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL)

const updates = [
    // gsapp-making — "Shattered Plaster"
    {
        memory_id: 'gsapp-making',
        label: 'Shattered Plaster',
        position: [-0.9618, 0.2638, 0.3476],
    },
    // concrete-surface — "Pigeon Footprints"
    {
        memory_id: 'concrete-surface',
        label: 'Pigeon Footprints',
        position: [1.1015, -4.1457, -1.2061],
    },
    // concrete-surface — "Carved Text"
    {
        memory_id: 'concrete-surface',
        label: 'Carved Text',
        position: [1.9166, -4.2009, -1.0311],
    },
    // indoor-sofa — "Cat Scratches"
    {
        memory_id: 'indoor-sofa',
        label: 'Cat Scratches',
        position: [0.4962, -0.1711, -0.3409],
    },
]

async function main() {
    for (const u of updates) {
        const posJson = JSON.stringify(u.position)
        await sql`
            UPDATE traces
            SET position = ${posJson}::jsonb
            WHERE memory_id = ${u.memory_id} AND label = ${u.label}
        `
        console.log(`✓ Updated ${u.memory_id} / ${u.label} → ${posJson}`)
    }
    console.log('Done.')
}

main().catch(console.error)
