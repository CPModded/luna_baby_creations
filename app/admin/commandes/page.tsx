export const dynamic = 'force-dynamic'

import { db, OrderStatus } from '@/lib/db'
import { euro } from '@/lib/data'
import OrderActions from './OrderActions'

const paidStatuses = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]

export default async function Orders() {
  const orders = await db.order.findMany({ where: { status: { in: paidStatuses } }, include: { items: true }, orderBy: { createdAt: 'desc' } })
  return <><div className="admin-top"><div><h1 style={{ margin: 0 }}>Commandes</h1><span className="muted">Commandes payées, préparation et expédition</span></div></div>
    <div className="admin-card"><table className="table"><thead><tr><th>Facture</th><th>Client</th><th>Date</th><th>Total</th><th>Statut</th><th>Action</th></tr></thead>
      <tbody>{orders.length ? orders.map((order: any) => <tr key={order.id}><td>{order.invoiceNumber}</td><td>{order.customerName || order.email}</td><td>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td><td>{euro(order.total)}</td><td><span className="badge">{order.status}</span></td><td><OrderActions id={order.id} status={order.status} /></td></tr>) : <tr><td colSpan={6}>Aucune commande payée pour le moment.</td></tr>}</tbody>
    </table></div>
  </>
}
