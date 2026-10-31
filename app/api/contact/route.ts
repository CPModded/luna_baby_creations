import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { Resend } from 'resend'

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(120),
  email: z.string().trim().email('Adresse e-mail invalide.').max(254),
  subject: z.string().trim().min(2, 'Le sujet est requis.').max(120),
  message: z.string().trim().min(5, 'Le message doit contenir au moins 5 caractères.').max(10000),
})

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Formulaire invalide.' }, { status: 400 })
  }

  const message = parsed.data
  try {
    await db.contactMessage.create({ data: message })
  } catch (error) {
    console.error('Impossible d’enregistrer le message de contact.', error)
    return NextResponse.json({ error: 'Votre message n’a pas pu être enregistré. Veuillez réessayer.' }, { status: 500 })
  }

  // L’envoi d’e-mail est une notification facultative : une panne Resend ne doit
  // ni annuler l’enregistrement ni transformer la demande en échec côté client.
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const result = await resend.emails.send({
        from: process.env.MAIL_FROM,
        to: process.env.ADMIN_EMAIL || 'admin@lunababy.fr',
        replyTo: message.email,
        subject: `Luna Baby · ${message.subject}`,
        text: `${message.name} <${message.email}>\n\n${message.message}`,
      })
      if (result.error) console.warn('Notification contact Resend non envoyée.', result.error)
    } catch (error) {
      console.warn('Notification contact Resend non envoyée.', error)
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
