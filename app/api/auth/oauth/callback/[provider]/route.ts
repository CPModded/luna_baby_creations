import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { query } from '@/lib/postgres'

const appleKeys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))
function base(req: NextRequest) { return process.env.AUTH_URL || req.nextUrl.origin }
async function appleSecret() {
  const raw = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const kid = process.env.APPLE_KEY_ID, team = process.env.APPLE_TEAM_ID, client = process.env.APPLE_ID
  if (!raw || !kid || !team || !client) throw new Error('APPLE_CONFIG_MISSING')
  const key = await importPKCS8(raw, 'ES256')
  return new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' }).setIssuer(team).setSubject(client).setAudience('https://appleid.apple.com').setIssuedAt().setExpirationTime('5m').sign(key)
}
async function callback(req: NextRequest, provider: string) {
  const home = new URL('/compte', base(req))
  const errorRedirect = (code: string) => { const u = new URL(home); u.searchParams.set('auth_error', code); return NextResponse.redirect(u, 303) }
  try {
    if (!['google', 'apple'].includes(provider)) return errorRedirect('provider')
    const form = req.method === 'POST' ? await req.formData() : null
    const value = (name: string) => req.method === 'GET' ? req.nextUrl.searchParams.get(name) : (typeof form?.get(name) === 'string' ? form.get(name) as string : null)
    const state = value('state')
    const code = value('code')
    const stateCookie = req.cookies.get('luna_oauth_state')?.value
    const verifier = req.cookies.get('luna_oauth_verifier')?.value
    if (!state || !code || stateCookie !== `${provider}.${state}` || !verifier) return errorRedirect('state')
    const clientId = provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.APPLE_ID
    const clientSecret = provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : await appleSecret()
    if (!clientId || !clientSecret) return errorRedirect('oauth_not_configured')
    const origin = base(req)
    const redirectUri = `${origin}/api/auth/oauth/callback/${provider}`
    const tokenResponse = await fetch(provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://appleid.apple.com/auth/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code_verifier: verifier }),
      cache: 'no-store',
    })
    if (!tokenResponse.ok) return errorRedirect('oauth_failed')
    const tokens = await tokenResponse.json() as { access_token?: string; id_token?: string }
    if (provider === 'google') {
      const infoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store' })
      if (!infoResponse.ok) return errorRedirect('oauth_failed')
      const info = await infoResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string }
      if (!info.sub || !info.email || info.email_verified !== true) return errorRedirect('email_unverified')
      return finish(req, provider, info.sub, info.email, info.name || 'Cliente Luna Baby')
    }
    if (!tokens.id_token) return errorRedirect('oauth_failed')
    const { payload } = await jwtVerify(tokens.id_token, appleKeys, { issuer: 'https://appleid.apple.com', audience: clientId })
    let email = typeof payload.email === 'string' ? payload.email : ''
    const verified = payload.email_verified === true || payload.email_verified === 'true'
    if (!payload.sub) return errorRedirect('email_unverified')
    if (!email) {
      // Apple peut ne transmettre l'email qu'à la première autorisation; l'identifiant sub reste vérifié par Apple.
      const linked = await query('SELECT email FROM auth_accounts WHERE provider=$1 AND "providerAccountId"=$2', ['apple', payload.sub])
      email = linked.rows[0]?.email || ''
    } else if (!verified) return errorRedirect('email_unverified')
    if (!email) return errorRedirect('email_unverified')
    let name = 'Cliente Luna Baby'
    const userValue = form?.get('user')
    if (typeof userValue === 'string') try { const user = JSON.parse(userValue); name = [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ') || name } catch {}
    return finish(req, provider, payload.sub, email, name)
  } catch (e) { console.error(`[auth/${provider}/callback]`, e); return errorRedirect('oauth_failed') }
}
async function finish(req: NextRequest, provider: string, subject: string, email: string, name: string) {
  const home = new URL('/compte', base(req))
  try {
    const emailNorm = email.trim().toLowerCase()
    const account = await query('SELECT "userId" FROM auth_accounts WHERE provider=$1 AND "providerAccountId"=$2', [provider, subject])
    let userId: string
    if (account.rowCount) userId = account.rows[0].userId
    else {
      // Les comptes ne sont associés à un compte existant que via un email vérifié (Google/Apple).
      let existing = await db.user.findUnique({ where: { email: emailNorm } })
      if (existing) {
        userId = existing.id
      } else {
        const ownerEmails = (process.env.OWNER_EMAIL || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
        const created = await db.user.create({ data: { name: name.slice(0, 120), email: emailNorm, passwordHash: null, emailVerified: new Date(), role: ownerEmails.includes(emailNorm) ? 'OWNER' : 'CUSTOMER' } })
        userId = created.id
      }
      await query('INSERT INTO auth_accounts (id, "userId", provider, "providerAccountId", email) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider,"providerAccountId") DO NOTHING', [randomUUID(), userId, provider, subject, emailNorm])
    }
    const user = await db.user.findUnique({ where: { id: userId } })
    await createSession(userId, user?.role)
    const response = NextResponse.redirect(home, 303)
    response.cookies.set('luna_oauth_state', '', { path: '/api/auth/oauth', maxAge: 0 })
    response.cookies.set('luna_oauth_verifier', '', { path: '/api/auth/oauth', maxAge: 0 })
    return response
  } catch (e) { console.error('[auth/oauth/link]', e); const u = new URL(home); u.searchParams.set('auth_error', 'oauth_failed'); return NextResponse.redirect(u, 303) }
}
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) { const { provider } = await ctx.params; return callback(req, provider) }
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) { const { provider } = await ctx.params; return callback(req, provider) }
