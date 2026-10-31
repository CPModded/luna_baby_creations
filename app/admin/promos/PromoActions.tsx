'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
type Props = { id: string; active: boolean; code: string }
export default function PromoActions({ id, active, code }: Props) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function update(method: 'PATCH' | 'DELETE', body: Record<string, unknown>) {
    if (method === 'DELETE' && !window.confirm(`Supprimer le code ${code} ?`)) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/promos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Opération impossible.')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur réseau.') } finally { setBusy(false) }
  }
  return <div><div className="admin-actions"><button className="small-btn" disabled={busy} onClick={() => update('PATCH', { id, active: !active })}>{active ? 'Désactiver' : 'Activer'}</button><button className="small-btn" disabled={busy} onClick={() => update('DELETE', { id })}>Supprimer</button></div>{error && <small role="alert" style={{ color: '#a00' }}>{error}</small>}</div>
}
