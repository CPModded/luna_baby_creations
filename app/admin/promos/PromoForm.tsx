'use client'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
export default function PromoForm() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [type, setType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const formElement = event.currentTarget; const form = new FormData(formElement)
    const maxUsesText = String(form.get('max_uses') || '').trim(); const expiresText = String(form.get('expires_at') || '').trim(); const value = Number(form.get('value'))
    try {
      const response = await fetch('/api/admin/promos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: form.get('code'), type, value: type === 'AMOUNT' ? Math.round(value * 100) : value, max_uses: maxUsesText ? Number(maxUsesText) : null, expires_at: expiresText ? new Date(expiresText).toISOString() : null }) })
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Création impossible.')
      formElement.reset(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur réseau.') } finally { setBusy(false) }
  }
  return <form className="admin-form" onSubmit={submit}>
    <h2 style={{ fontWeight: 400, marginTop: 0 }}>Créer un code promotionnel</h2>
    <label htmlFor="promo-code">Code</label><input id="promo-code" name="code" required minLength={2} maxLength={64} pattern="[A-Za-z0-9_-]+" placeholder="LUNA10" />
    <div className="two"><div><label htmlFor="promo-type">Réduction</label><select id="promo-type" value={type} onChange={event => setType(event.target.value as 'PERCENT' | 'AMOUNT')}><option value="PERCENT">Pourcentage (%)</option><option value="AMOUNT">Montant (€)</option></select></div><div><label htmlFor="promo-value">Valeur {type === 'AMOUNT' ? '(€)' : '(%)'}</label><input id="promo-value" name="value" type="number" min="1" max={type === 'PERCENT' ? 100 : undefined} step={type === 'AMOUNT' ? '0.01' : '1'} required /></div></div>
    <div className="two"><div><label htmlFor="promo-max-uses">Nombre maximal d’utilisations (facultatif)</label><input id="promo-max-uses" name="max_uses" type="number" min="1" /></div><div><label htmlFor="promo-expires">Expiration (facultatif)</label><input id="promo-expires" name="expires_at" type="datetime-local" /></div></div>
    {error && <div className="notice" role="alert">{error}</div>}<button className="btn" type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer la promotion'}</button>
  </form>
}
