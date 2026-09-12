import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | undefined

export function getSql(): NeonQueryFunction<false, false> {
  if (!sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set — connect the Neon integration for this project first.')
    sql = neon(url)
  }
  return sql
}
