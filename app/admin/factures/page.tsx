import { db } from '@/lib/db'
import { euro } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function Invoices() {
  // Utilise la couche Postgres existante (comme les autres pages admin),
  // en remplacement de l'ancien Order.find() basé sur MongoDB.
  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true },
  })

  return (
    <>
      <div className="admin-top">
        <div>
          <h1 style={{ margin: 0 }}>Factures</h1>
          <span className="muted">
            Génération PDF automatique par commande
          </span>
        </div>
      </div>

      <div className="admin-card">
        <table className="table">
          <thead>
            <tr>
              <th>N° facture</th>
              <th>Client</th>
              <th>Date</th>
              <th>Total</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id}>
                <td>{o.invoiceNumber}</td>
                <td>{o.customerName || o.email}</td>
                <td>
                  {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td>{euro(o.total)}</td>
                <td>
                  <a className="small-btn" href={`/api/invoice/${o.id}`}>
                    Télécharger
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
