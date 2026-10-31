import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Accès réservé à l’équipe administration.' }, { status: 403 }) }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 }) }
  if (typeof body?.id !== 'string' || !body.id || typeof body?.read !== 'boolean') {
    return NextResponse.json({ error: 'Identifiant ou état de lecture invalide.' }, { status: 400 })
  }
  try {
    const message = await db.contactMessage.update({ where: { id: body.id }, data: { read: body.read } })
    return NextResponse.json(message)
  } catch (error: any) {
    if (String(error?.message).includes('record not found')) return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })
    console.error('Impossible de mettre à jour le message.', error)
    return NextResponse.json({ error: 'Impossible de mettre à jour ce message.' }, { status: 500 })
  }
}
