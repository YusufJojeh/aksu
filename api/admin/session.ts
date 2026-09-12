import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAdminAuthenticated } from '../_lib/auth.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ authenticated: isAdminAuthenticated(req) })
}
