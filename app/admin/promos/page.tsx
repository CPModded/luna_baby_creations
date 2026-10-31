export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import PromoActions from './PromoActions'
import PromoForm from './PromoForm'
function formatDate(value: Date | string | null) { return value ? new Date(value).toLocaleDateString('fr-FR') : '—' }
export default async function AdminPromos() {
  const promos = await db.promoCode.findMany({ orderBy: { created_at: 'desc' } })
  return <><div className="admin-top"><div><h1 style={{ margin: 0 }}>Promotions</h1><span className="muted">Codes de réduction et leur statut</span></div></div><PromoForm />
    <div className="admin-card"><table className="table"><thead><tr><th>Code</th><th>Réduction</th><th>Utilisations</th><th>Expiration</th><th>État</th><th>Actions</th></tr></thead><tbody>{promos.length ? promos.map((promo: any) => <tr key={promo.id}><td><strong>{promo.code}</strong></td><td>{promo.type === 'PERCENT' ? `${promo.value} %` : `${(promo.value / 100).toFixed(2).replace('.', ',')} €`}</td><td>{promo.used_count}{promo.max_uses == null ? '' : ` / ${promo.max_uses}`}</td><td>{formatDate(promo.expires_at)}</td><td><span className="badge">{promo.active ? 'Active' : 'Inactive'}</span></td><td><PromoActions id={promo.id} code={promo.code} active={Boolean(promo.active)} /></td></tr>) : <tr><td colSpan={6}>Aucun code promotionnel enregistré.</td></tr>}</tbody></table></div>
  </>
}
