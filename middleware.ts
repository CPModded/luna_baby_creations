import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function secretBytes() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET_MISSING')
  return new TextEncoder().encode(secret)
}
const ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER'])
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (!path.startsWith('/admin') || path === '/admin-login') return NextResponse.next()
  try {
    const token = req.cookies.get('luna_session')?.value
    if (!token) throw new Error('NO_SESSION')
    const { payload } = await jwtVerify(token, secretBytes())
    if (typeof payload.userId !== 'string' || typeof payload.sid !== 'string' || typeof payload.role !== 'string' || !ROLES.has(payload.role)) throw new Error('NOT_ADMIN')
    return NextResponse.next()
  } catch { return NextResponse.redirect(new URL('/admin-login', req.url)) }
}
export const config = { matcher: ['/admin/:path*'] }
