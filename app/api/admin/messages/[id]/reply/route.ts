import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const schema = z.object({
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(10_000),
}).strict()

type RouteContext = { params: Promise<{ id: string }> }
type Admin = { id: string; email: string; role: string }

export async function POST(request: Request, context: RouteContext) {
  let admin: Admin
  try {
    admin = await requireAdmin() as Admin
  } catch {
    return NextResponse.json({ error: 'Accès réservé à l’équipe administration.' }, { status: 403 })
  }
  if (admin.role !== 'OWNER' && admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seuls le propriétaire et les administrateurs peuvent répondre.' }, { status: 403 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 })
  }
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Réponse invalide.' }, { status: 400 })
  }

  const { id } = await context.params
  if (!id?.trim()) return NextResponse.json({ error: 'Identifiant de message invalide.' }, { status: 400 })

  try {
    const message = await db.contactMessage.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })
    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
      return NextResponse.json({ error: 'L’envoi des e-mails n’est pas configuré.' }, { status: 503 })
    }

    let emailStatus: 'SENT' | 'FAILED' = 'SENT'
    let providerId: string | null = null
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const result = await resend.emails.send({
        from: process.env.MAIL_FROM,
        to: message.email,
        replyTo: admin.email,
        subject: parsed.data.subject,
        text: parsed.data.body,
      })
      if (result.error) throw new Error(result.error.message || 'Le fournisseur e-mail a refusé le message.')
      providerId = result.data?.id ?? null
    } catch (error) {
      emailStatus = 'FAILED'
      console.error('Envoi de réponse Resend échoué.', error)
    }

    const reply = await db.messageReply.create({
      data: {
        message_id: id,
        admin_id: admin.id,
        subject: parsed.data.subject,
        body: parsed.data.body,
        email_status: emailStatus,
        provider_id: providerId,
      },
    })
    await db.contactMessage.update({ where: { id }, data: { read: true } })

    if (emailStatus === 'FAILED') {
      return NextResponse.json({ ok: false, reply, error: 'La réponse a été enregistrée, mais son envoi a échoué.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, reply }, { status: 201 })
  } catch (error) {
    console.error('Erreur lors du traitement de la réponse.', error)
    return NextResponse.json({ error: 'Impossible de traiter la réponse.' }, { status: 500 })
  }
}
