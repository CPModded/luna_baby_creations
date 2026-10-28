import { NextResponse } from 'next/server'
const hits = new Map<string, { count: number; until: number }>()
export function rateLimit(req: Request, action: string, max: number, windowMs: number) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const key = `${action}:${forwarded}`
  const now = Date.now()
  let entry = hits.get(key)
  if (!entry || entry.until <= now) { entry = { count: 0, until: now + windowMs }; hits.set(key, entry) }
  entry.count++
  if (hits.size > 5000) for (const [k, v] of hits) if (v.until <= now) hits.delete(k)
  if (entry.count <= max) return null
  return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.until - now) / 1000)) } })
}
