import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../_lib/auth.js'
import { getSql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return

  try {
    const sql = getSql()
    const [byEmployee, byClinic, byDay, totalRows] = await Promise.all([
      sql`select employee_name, count(*)::int as count from reports group by employee_name order by count desc limit 50`,
      sql`select clinic_id, count(*)::int as count from reports group by clinic_id`,
      sql`select date_trunc('day', created_at) as day, count(*)::int as count from reports where created_at > now() - interval '90 days' group by day order by day asc`,
      sql`select count(*)::int as count from reports`,
    ])
    const total = (totalRows[0] as { count: number } | undefined)?.count ?? 0
    res.status(200).json({ byEmployee, byClinic, byDay, total })
  } catch (error) {
    console.error('Failed to compute analytics', error)
    res.status(503).json({ error: 'storage_unavailable' })
  }
}
