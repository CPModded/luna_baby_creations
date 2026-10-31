'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthButtons from '@/components/AuthButtons'

const messages: Record<string,string> = { oauth_not_configured: 'La connexion sociale n’est pas encore configurée.', oauth_failed: 'La connexion a échoué. Réessayez.', email_unverified: 'Le fournisseur n’a pas confirmé votre adresse email.', state: 'La demande a expiré. Recommencez.' }
export default function AccountClient() {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const search = useSearchParams()
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) { setError(data.error || 'Connexion impossible.'); return }
      router.refresh()
    } catch { setError('Connexion temporairement indisponible.') } finally { setBusy(false) }
  }
  return <main className="luna-auth-page"><section className="luna-auth-card">
    <Image src="/logo.png" alt="Luna Baby Créations" width={78} height={78} className="luna-auth-logo" priority />
    <p className="luna-auth-kicker">Luna Baby Créations</p>
    <h1>{mode === 'login' ? 'Ravie de vous retrouver' : 'Créer mon compte'}</h1>
    <p className="luna-auth-intro">{mode === 'login' ? 'Connectez-vous pour retrouver vos commandes et factures.' : 'Rejoignez notre univers de douceur et de créations personnalisées.'}</p>
    {search.get('auth_error') && <div className="luna-auth-error" role="alert">{messages[search.get('auth_error')!] || 'La connexion n’a pas abouti.'}</div>}
    <AuthButtons />
    <div className="luna-auth-divider"><span>ou avec votre email</span></div>
    <form className="luna-auth-form" onSubmit={submit}>
      {mode === 'register' && <label>Votre nom<input autoComplete="name" required minLength={2} maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></label>}
      <label>Adresse email<input type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></label>
      <label>Mot de passe<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 8} maxLength={128} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />{mode === 'register' && <small>8 caractères minimum</small>}</label>
      {error && <div className="luna-auth-error" role="alert">{error}</div>}
      <button disabled={busy} className="luna-auth-submit">{busy ? 'Patientez…' : mode === 'login' ? 'Me connecter' : 'Créer mon compte'}</button>
    </form>
    <p className="luna-auth-switch">{mode === 'login' ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'} <button type="button" onClick={()=>{setError('');setMode(mode === 'login' ? 'register' : 'login')}}>{mode === 'login' ? 'Créer un compte' : 'Me connecter'}</button></p>
  </section></main>
}
