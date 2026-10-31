import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Accès réservé à l’équipe administration.' }, { status: 403 }) }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 }) }
  if (typeof body?.id !== 'string' || !body.id || typeof body?.active !== 'boolean') {
    return NextResponse.json({ error: 'Identifiant ou état du produit invalide.' }, { status: 400 })
  }
  try {
    const product = await db.product.update({ where: { id: body.id }, data: { active: body.active } })
    return NextResponse.json(product)
  } catch (error: any) {
    if (String(error?.message).includes('record not found')) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
    console.error('Impossible de modifier le produit.', error)
    return NextResponse.json({ error: 'Impossible de modifier ce produit.' }, { status: 500 })
  }
}
