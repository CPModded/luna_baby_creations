export const dynamic = 'force-dynamic'

import { db, OrderStatus } from '@/lib/db'
import { euro } from '@/lib/data'
import Link from 'next/link'

const paidStatuses = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]

export default async function Admin() {
  const [orders, products, users, messages, paid] = await Promise.all([
    db.order.count({ where: { status: { in: paidStatuses } } }),
    db.product.count({ where: { active: true } }),
    db.user.count(),
    db.contactMessage.count({ where: { read: false } }),
    db.order.aggregate({ where: { status: { in: paidStatuses } }, _sum: { total: true } }),
  ])
  const recent = await db.order.findMany({ where: { status: { in: paidStatuses } }, take: 8, orderBy: { createdAt: 'desc' } })

  return <><div className="admin-top"><div><h1 style={{ margin: 0 }}>Dashboard</h1><span className="muted">Vue d'ensemble de Luna Baby · {users} comptes</span></div><Link className="btn" href="/shop">Voir la boutique</Link></div>
    <div className="stats">
      <div className="stat"><span>Chiffre d'affaires</span><b>{euro(paid._sum.total || 0)}</b></div>
      <div className="stat"><span>Commandes payées</span><b>{orders}</b></div>
      <div className="stat"><span>Produits actifs</span><b>{products}</b></div>
      <div className="stat"><span>Messages non lus</span><b>{messages}</b></div>
    </div>
    <div className="admin-card"><h2 style={{ fontWeight: 400 }}>Dernières commandes payées</h2>
      <table className="table"><thead><tr><th>Facture</th><th>Client</th><th>Total</th><th>Statut</th></tr></thead>
        <tbody>{recent.length ? recent.map((order: any) => <tr key={order.id}><td>{order.invoiceNumber}</td><td>{order.customerName || order.email}</td><td>{euro(order.total)}</td><td><span className="badge">{order.status}</span></td></tr>) : <tr><td colSpan={4}>Aucune commande payée pour le moment.</td></tr>}</tbody>
      </table>
    </div>
  </>
}
