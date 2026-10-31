'use client'

import { useState } from 'react'

type ContactForm = { name: string; email: string; subject: string; message: string }

export default function Contact() {
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', subject: 'Question', message: '' })

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Envoi impossible. Veuillez réessayer.')
      setOk(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur réseau est survenue. Veuillez réessayer.')
    } finally {
      setBusy(false)
    }
  }

  function update<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  return <main className="page"><div className="container">
    <div className="page-head"><h1>Contact ♡</h1><p className="muted">Une question ? N'hésitez pas à nous contacter.</p></div>
    {ok ? <div className="notice center" role="status">Merci ! Votre message a bien été envoyé. Nous vous répondrons sous 24 à 48h.</div> :
      <form className="form" onSubmit={send}>
        <label htmlFor="contact-name">Nom</label>
        <input id="contact-name" className="input" name="name" autoComplete="name" minLength={2} maxLength={120} required value={form.name} onChange={e => update('name', e.target.value)} />
        <label htmlFor="contact-email">Email</label>
        <input id="contact-email" className="input" name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={e => update('email', e.target.value)} />
        <label htmlFor="contact-subject">Sujet</label>
        <select id="contact-subject" className="input" name="subject" value={form.subject} onChange={e => update('subject', e.target.value)}>
          <option>Question</option><option>Commande</option><option>Personnalisation</option><option>Retour</option>
        </select>
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" className="input" name="message" rows={7} minLength={5} maxLength={10000} required value={form.message} onChange={e => update('message', e.target.value)} />
        {error && <p className="notice" role="alert">{error}</p>}
        <button className="btn full" style={{ marginTop: 15 }} type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer le message'}</button>
      </form>
    }
  </div></main>
}
