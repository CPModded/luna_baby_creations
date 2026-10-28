import { Order } from '@/lib/mongodb'
import { euro } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function Invoices() {
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
    .exec()

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
            {orders.map((o) => (
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