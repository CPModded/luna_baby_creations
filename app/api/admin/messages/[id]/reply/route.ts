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
    const mailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)
    let emailStatus: 'SENT' | 'FAILED' = mailConfigured ? 'SENT' : 'FAILED'
    let emailMessage = mailConfigured ? '' : 'E-mail non envoyé : l’envoi n’est pas configuré.'
    let providerId: string | null = null
    try {
      if (!mailConfigured) throw new Error('MAIL_NOT_CONFIGURED')
      const resend = new Resend(process.env.RESEND_API_KEY!)
      const result = await resend.emails.send({
        from: process.env.MAIL_FROM,
        to: message.email,
        replyTo: admin.email,
        subject: parsed.data.subject,
        text: parsed.data.body,
      })
      if (result.error) {
        const providerError = result.error as any
        const failure = new Error(providerError.message || 'Le fournisseur e-mail a refusé le message.') as Error & { code?: string; statusCode?: number; providerType?: string }
        failure.code = providerError.code
        failure.statusCode = providerError.statusCode ?? providerError.status
        failure.providerType = providerError.name
        throw failure
      }
      providerId = result.data?.id ?? null
    } catch (error: any) {
      emailStatus = 'FAILED'
      const providerError = error?.cause || error
      const details = [providerError?.message, providerError?.name, providerError?.code, providerError?.statusCode, providerError?.status, providerError?.providerType].filter(Boolean).join(' ').toLowerCase()
      emailMessage = providerError?.message === 'MAIL_NOT_CONFIGURED'
        ? 'E-mail non envoyé : l’envoi n’est pas configuré.'
        : (details.includes('403') || details.includes('validation_error') || details.includes('domain') || details.includes('verified'))
          ? 'E-mail non envoyé : domaine non vérifié par Resend.'
          : 'La réponse a été enregistrée, mais l’e-mail n’a pas pu être envoyé.'
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
      return NextResponse.json({ ok: true, emailSent: false, reply, message: emailMessage }, { status: 201 })
    }
    return NextResponse.json({ ok: true, emailSent: true, reply }, { status: 201 })
  } catch (error) {
    console.error('Erreur lors du traitement de la réponse.', error)
    return NextResponse.json({ error: 'Impossible de traiter la réponse.' }, { status: 500 })
  }
}