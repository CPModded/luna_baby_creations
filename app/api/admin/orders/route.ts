import { NextResponse } from 'next/server'
import { db, OrderStatus } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const previousStatus: Record<string, string> = {
  [OrderStatus.PROCESSING]: OrderStatus.PAID,
  [OrderStatus.SHIPPED]: OrderStatus.PROCESSING,
  [OrderStatus.DELIVERED]: OrderStatus.SHIPPED,
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Accès réservé à l’équipe administration.' }, { status: 403 })
  }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 }) }
  if (typeof body?.id !== 'string' || !body.id || typeof body?.status !== 'string') {
    return NextResponse.json({ error: 'Identifiant ou statut invalide.' }, { status: 400 })
  }
  const expectedPrevious = previousStatus[body.status]
  if (!expectedPrevious) return NextResponse.json({ error: 'Transition de statut non autorisée.' }, { status: 400 })
  try {
    const order = await db.order.findUnique({ where: { id: body.id } })
    if (!order) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
    if (order.status !== expectedPrevious) return NextResponse.json({ error: 'Le statut de la commande a changé. Actualisez la page.' }, { status: 409 })
    const updated = await db.order.update({ where: { id: body.id }, data: { status: body.status } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Impossible de modifier le statut de la commande.', error)
    return NextResponse.json({ error: 'Impossible de modifier cette commande.' }, { status: 500 })
  }
}
