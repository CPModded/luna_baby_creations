'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MessageActions({ id, read }: { id: string; read: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function toggleRead() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: !read }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Mise à jour impossible.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur réseau.')
    } finally {
      setBusy(false)
    }
  }
  return <div><button className="small-btn" type="button" disabled={busy} onClick={toggleRead}>{busy ? 'Mise à jour…' : read ? 'Marquer non lu' : 'Marquer lu'}</button>{error && <small role="alert">{error}</small>}</div>
}
