'use client'
import { useEffect, useState } from 'react'

export default function AuthButtons() {
  const [apple, setApple] = useState(false)
  useEffect(() => {
    const ua = navigator.userAgent
    const appleDevice = /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setApple(appleDevice)
  }, [])
  return <div className="luna-auth-providers">
    <a className="luna-auth-provider google" href="/api/auth/oauth?provider=google"><span aria-hidden="true">G</span> Continuer avec Google</a>
    {apple && <a className="luna-auth-provider apple" href="/api/auth/oauth?provider=apple"><span aria-hidden="true">●</span> Continuer avec Apple</a>}
  </div>
}
