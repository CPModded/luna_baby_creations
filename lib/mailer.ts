import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // false pour 587, true pour 465
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporter
}

export async function sendMail(opts: {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}) {
  const t = getTransporter()
  if (!t) {
    console.warn('SMTP non configuré, mail non envoyé.')
    return false
  }
  try {
    await t.sendMail({
      from: `"Luna Baby Creations" <${process.env.MAIL_SENDER}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      replyTo: opts.replyTo,
    })
    return true
  } catch (error) {
    console.error('Envoi SMTP échoué.', error)
    return false
  }
}