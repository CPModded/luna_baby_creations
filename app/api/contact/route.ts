import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(5).max(10_000),
  website: z.string().max(500).optional(),
}).strict()

const MAX_BYTES = 16 * 1024
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 5
const requestsByIp = new Map<string, number[]>()

function isRateLimited(ip: string, now = Date.now()): boolean {
  const recent = (requestsByIp.get(ip) ?? []).filter(time => now - time < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    requestsByIp.set(ip, recent)
    return true
  }
  recent.push(now)
  requestsByIp.set(ip, recent)
  if (requestsByIp.size > 5_000) {
    for (const [key, times] of requestsByIp) {
      if (!times.some(time => now - time < RATE_WINDOW_MS)) requestsByIp.delete(key)
    }
  }
  return false
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez plus tard.' }, { status: 429 })
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Le formulaire est trop volumineux.' }, { status: 413 })
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return NextResponse.json({ error: 'Impossible de lire la requête.' }, { status: 400 })
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Le formulaire est trop volumineux.' }, { status: 413 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 })
  }
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Formulaire invalide.' }, { status: 400 })
  }

  const { website, ...message } = parsed.data
  // Répondre comme un succès aux robots qui remplissent le champ honeypot.
  if (website?.trim()) return NextResponse.json({ ok: true }, { status: 200 })

  try {
    await db.contactMessage.create({ data: message })
  } catch (error) {
    console.error('Enregistrement contact impossible.', error)
    return NextResponse.json({ error: 'Votre message n’a pas pu être enregistré.' }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const result = await resend.emails.send({
        from: process.env.MAIL_FROM,
        to: process.env.ADMIN_EMAIL || 'contact.luna.babycreation@gmail.com',
        replyTo: message.email,
        subject: `Luna Baby · ${message.subject}`,
        text: `${message.name} <${message.email}>\n\n${message.message}`,
      })
      if (result.error) console.warn('Échec notification Resend:', result.error)
    } catch (error) {
      console.warn('Échec notification Resend:', error)
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}