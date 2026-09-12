import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE_NAME = 'admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function requireSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', requireSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function checkPasscode(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSCODE
  if (!expected) return false
  return safeEqual(submitted, expected)
}

export function createSessionCookie(): string {
  const payload = String(Date.now() + SESSION_TTL_MS)
  const token = `${payload}.${sign(payload)}`
  const secure = process.env.VERCEL_ENV ? '; Secure' : ''
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const key = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (key) cookies[key] = decodeURIComponent(value)
  }
  return cookies
}

export function isAdminAuthenticated(req: VercelRequest): boolean {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME]
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!safeEqual(signature, sign(payload))) return false
  return Number(payload) > Date.now()
}

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (isAdminAuthenticated(req)) return true
  res.status(401).json({ error: 'unauthorized' })
  return false
}
