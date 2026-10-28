import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { rateLimit } from '@/lib/auth-rate-limit'
const input = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) })
export async function POST(req: Request) {
  const limited = rateLimit(req, 'login', 8, 15 * 60_000)
  if (limited) return limited
  let data
  try { data = input.parse(await req.json()) } catch { return NextResponse.json({ error: 'Adresse email ou mot de passe invalide.' }, { status: 400 }) }
  try {
    const user = await db.user.findUnique({ where: { email: data.email.toLowerCase() }, select: { passwordHash: true } })
    const hash = user?.passwordHash
    const valid = typeof hash === 'string' && await bcrypt.compare(data.password, hash)
    if (!valid) return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })
    const full = await db.user.findUnique({ where: { email: data.email.toLowerCase() } })
    await createSession(full.id, full.role)
    return NextResponse.json({ ok: true, admin: ['OWNER', 'ADMIN', 'MANAGER'].includes(full.role), role: full.role })
  } catch (e) { console.error('[auth/login]', e); return NextResponse.json({ error: 'Connexion temporairement indisponible.' }, { status: 503 }) }
}
