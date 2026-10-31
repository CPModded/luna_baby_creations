import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'

function resolveSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET
  if (!raw || raw.length < 32) {
    throw new Error('AUTH_SECRET_MISSING_OR_TOO_SHORT: AUTH_SECRET must be defined and at least 32 characters long.')
  }
  return new TextEncoder().encode(raw)
}

const secret = resolveSecret()

export async function createSession(userId: string, role?: string) {
  // On inclut le rôle dans le payload JWT pour que le middleware puisse
  // vérifier l'accès /admin sans avoir à consulter la base à chaque requête.
  const token = await new SignJWT({ userId, ...(role ? { role } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
  const c = await cookies()
  c.set('luna_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSession() {
  const c = await cookies()
  c.delete('luna_session')
}

export async function getCurrentUser() {
  try {
    const c = await cookies()
    const token = c.get('luna_session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    if (typeof payload.userId !== 'string') return null
    return db.user.findUnique({ where: { id: payload.userId } })
  } catch {
    return null
  }
}

export async function requireAdmin() {
  const u = await getCurrentUser()
  if (!u || !['OWNER', 'ADMIN', 'MANAGER'].includes(u.role)) throw new Error('UNAUTHORIZED')
  return u
}

export async function requireOwner() {
  const u = await getCurrentUser()
  if (!u || u.role !== 'OWNER') throw new Error('UNAUTHORIZED')
  return u
}

export async function canManageUsers() {
  const u = await getCurrentUser()
  return Boolean(u && u.role === 'OWNER')
}
