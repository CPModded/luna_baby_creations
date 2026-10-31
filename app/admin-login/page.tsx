'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function AdminLogin() {
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [error,setError]=useState('')
  const router=useRouter()
  async function submit(e:React.FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok)return setError(d.error||'Connexion impossible.');if(!d.admin)return setError('Ce compte n’a pas accès à l’administration.');router.push('/admin') }
  return <main className="luna-auth-page"><form className="luna-auth-card" onSubmit={submit}><h1>Administration</h1><p className="luna-auth-intro">Connexion réservée à l’équipe Luna Baby.</p><label className="luna-auth-form">Adresse email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="luna-auth-form">Mot de passe<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="luna-auth-error">{error}</div>}<button className="luna-auth-submit">Se connecter</button></form></main>
}
