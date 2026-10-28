import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'
import { query } from './postgres'

const COOKIE = 'luna_session'
const WEEK = 60 * 60 * 24 * 7
function secretBytes(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters')
  return new TextEncoder().encode(secret)
}
function secureCookie() { return process.env.NODE_ENV === 'production' }

export async function createSession(userId: string, role?: string) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('AUTH_USER_NOT_FOUND')
  const sid = crypto.randomUUID()
  const expires = new Date(Date.now() + WEEK * 1000)
  await query('INSERT INTO auth_sessions (id, "userId", "expiresAt") VALUES ($1,$2,$3)', [sid, userId, expires])
  const token = await new SignJWT({ userId, role: role || user.role, sid })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secretBytes())
  const jar = await cookies()
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: secureCookie(), path: '/', maxAge: WEEK })
}

export async function clearSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretBytes())
      if (typeof payload.sid === 'string') await query('DELETE FROM auth_sessions WHERE id=$1', [payload.sid])
    } catch { /* cookie may be expired or invalid */ }
  }
  jar.delete(COOKIE)
}

export async function getCurrentUser() {
  try {
    const jar = await cookies()
    const token = jar.get(COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secretBytes())
    if (typeof payload.userId !== 'string' || typeof payload.sid !== 'string') return null
    const active = await query('SELECT 1 FROM auth_sessions WHERE id=$1 AND "userId"=$2 AND "expiresAt">NOW()', [payload.sid, payload.userId])
    if (!active.rowCount) return null
    return await db.user.findUnique({ where: { id: payload.userId } })
  } catch { return null }
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || !['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)) throw new Error('UNAUTHORIZED')
  return user
}
export async function requireOwner() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'OWNER') throw new Error('UNAUTHORIZED')
  return user
}
export async function canManageUsers() {
  const user = await getCurrentUser()
  return Boolean(user && user.role === 'OWNER')
}
