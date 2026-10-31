import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function resolveSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET
  if (!raw || raw.length < 32) {
    throw new Error('AUTH_SECRET_MISSING_OR_TOO_SHORT: AUTH_SECRET must be defined and at least 32 characters long.')
  }
  return new TextEncoder().encode(raw)
}

const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER'])

export async function middleware(req: NextRequest) {
  // Ne protège que les routes /admin (à l'exclusion de la page de connexion).
  if (!req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname === '/admin-login') {
    return NextResponse.next()
  }
  const token = req.cookies.get('luna_session')?.value
  if (!token) return NextResponse.redirect(new URL('/admin-login', req.url))

  let payload: any
  try {
    const secret = resolveSecret()
    const verified = await jwtVerify(token, secret)
    payload = verified.payload
  } catch {
    return NextResponse.redirect(new URL('/admin-login', req.url))
  }

  // Si un rôle est présent dans le JWT, on vérifie qu'il fait partie des rôles autorisés.
  const role = typeof payload?.role === 'string' ? payload.role : null
  if (role && !ADMIN_ROLES.has(role)) {
    return NextResponse.redirect(new URL('/admin-login', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
