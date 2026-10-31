import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/auth'

export async function PATCH(req: Request) {
  try { await requireOwner() } catch { return NextResponse.json({ error: 'Accès réservé au propriétaire du site.' }, { status: 403 }) }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 }) }
  const id = typeof body?.id === 'string' ? body.id : ''
  const role = body?.role
  if (!id || !['CUSTOMER', 'MANAGER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Utilisateur ou rôle invalide.' }, { status: 400 })
  }
  try {
    const target = await db.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
    if (target.role === 'OWNER') return NextResponse.json({ error: 'Le compte propriétaire ne peut pas être modifié ici.' }, { status: 403 })
    const updated = await db.user.update({ where: { id }, data: { role } })
    return NextResponse.json({ ok: true, user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role } })
  } catch (error) {
    console.error('Impossible de modifier le rôle.', error)
    return NextResponse.json({ error: 'Impossible de modifier ce compte.' }, { status: 500 })
  }
}
