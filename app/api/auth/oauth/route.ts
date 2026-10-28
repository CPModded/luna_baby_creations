import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'node:crypto'

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider')
  if (provider !== 'google' && provider !== 'apple') return NextResponse.json({ error: 'Fournisseur non pris en charge.' }, { status: 404 })
  const clientId = provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.APPLE_ID
  if (!clientId) return NextResponse.redirect(new URL('/compte?auth_error=oauth_not_configured', req.url))
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const origin = process.env.AUTH_URL || new URL(req.url).origin
  const redirectUri = `${origin}/api/auth/oauth/callback/${provider}`
  const auth = new URL(provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://appleid.apple.com/auth/authorize')
  auth.searchParams.set('client_id', clientId)
  auth.searchParams.set('redirect_uri', redirectUri)
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('state', state)
  auth.searchParams.set('code_challenge', challenge)
  auth.searchParams.set('code_challenge_method', 'S256')
  if (provider === 'google') {
    auth.searchParams.set('scope', 'openid email profile')
    auth.searchParams.set('prompt', 'select_account')
  } else {
    auth.searchParams.set('scope', 'name email')
    auth.searchParams.set('response_mode', 'form_post')
  }
  const res = NextResponse.redirect(auth)
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set('luna_oauth_state', `${provider}.${state}`, { httpOnly: true, secure, sameSite: provider === 'apple' ? 'none' : 'lax', path: '/api/auth/oauth', maxAge: 600 })
  res.cookies.set('luna_oauth_verifier', verifier, { httpOnly: true, secure, sameSite: provider === 'apple' ? 'none' : 'lax', path: '/api/auth/oauth', maxAge: 600 })
  return res
}
