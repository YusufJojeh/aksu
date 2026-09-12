import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkPasscode, createSessionCookie } from '../_lib/auth.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }

  const passcode = req.body?.passcode
  if (typeof passcode !== 'string' || !checkPasscode(passcode)) {
    res.status(401).json({ error: 'invalid_passcode' })
    return
  }

  res.setHeader('Set-Cookie', createSessionCookie())
  res.status(200).json({ ok: true })
}
