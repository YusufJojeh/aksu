import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Run `vercel env pull .env.local` after connecting Neon, then re-run with:')
  console.error('  node --env-file=.env.local scripts/migrate.mjs')
  process.exit(1)
}

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')
const schema = readFileSync(schemaPath, 'utf8')
const statements = schema.split(';').map((s) => s.trim()).filter(Boolean)

const sql = neon(url)
for (const statement of statements) {
  console.log(`Running: ${statement.slice(0, 60)}...`)
  await sql.query(statement)
}
console.log(`Applied ${statements.length} statement(s) from db/schema.sql`)
