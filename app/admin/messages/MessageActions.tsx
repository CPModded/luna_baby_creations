'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Props = { id: string; read: boolean; email: string; subject: string }
export default function MessageActions({ id, read, email, subject }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [replyOpen, setReplyOpen] = useState(false)
  const [replySubject, setReplySubject] = useState(subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`)
  const [body, setBody] = useState('')
  async function toggleRead() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, read: !read }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Mise à jour impossible.')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur réseau.') }
    finally { setBusy(false) }
  }
  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(`/api/admin/messages/${encodeURIComponent(id)}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: replySubject, body }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Envoi de la réponse impossible.')
      setBody(''); setReplyOpen(false); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur réseau.') }
    finally { setBusy(false) }
  }
  return <div style={{ minWidth: 190 }}>
    <button className="small-btn" type="button" disabled={busy} onClick={toggleRead}>{busy ? 'Mise à jour…' : read ? 'Marquer non lu' : 'Marquer lu'}</button>{' '}
    <button className="small-btn" type="button" disabled={busy} onClick={() => setReplyOpen(value => !value)}>{replyOpen ? 'Annuler' : 'Répondre'}</button>
    {replyOpen && <form onSubmit={sendReply} style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      <label>À <input className="input" type="email" value={email} readOnly /></label>
      <label>Sujet <input className="input" required minLength={2} maxLength={200} value={replySubject} onChange={event => setReplySubject(event.target.value)} /></label>
      <label>Message <textarea className="input" required minLength={2} maxLength={10000} rows={5} value={body} onChange={event => setBody(event.target.value)} /></label>
      <button className="small-btn" type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer la réponse'}</button>
    </form>}
    {error && <small role="alert" style={{ display: 'block', color: '#a00' }}>{error}</small>}
  </div>
}
