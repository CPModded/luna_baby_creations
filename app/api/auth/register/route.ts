import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { rateLimit } from '@/lib/auth-rate-limit'
const input = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), password: z.string().min(8).max(128) })
export async function POST(req: Request) {
  const limited = rateLimit(req, 'register', 5, 60 * 60_000)
  if (limited) return limited
  let data
  try { data = input.parse(await req.json()) } catch { return NextResponse.json({ error: 'Vérifiez le nom, l’adresse email et le mot de passe (8 caractères minimum).' }, { status: 400 }) }
  try {
    const email = data.email.toLowerCase()
    const exists = await db.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 })
    const ownerEmails = (process.env.OWNER_EMAIL || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean)
    const user = await db.user.create({ data: { name: data.name, email, passwordHash: await bcrypt.hash(data.password, 12), role: ownerEmails.includes(email) ? 'OWNER' : 'CUSTOMER' } })
    await createSession(user.id, user.role)
    return NextResponse.json({ ok: true, role: user.role }, { status: 201 })
  } catch (e) { console.error('[auth/register]', e); return NextResponse.json({ error: 'Impossible de créer le compte pour le moment.' }, { status: 503 }) }
}
