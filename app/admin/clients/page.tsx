export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import UserRoleActions from './UserRoleActions';
export default async function Clients(){
  const [users, current] = await Promise.all([db.user.findMany({orderBy:{createdAt:'desc'},include:{_count:{select:{orders:true}}}}), getCurrentUser()]);
  const canManage = current?.role === 'OWNER';
  return <><div className="admin-top"><div><h1 style={{margin:0}}>Clients et accès</h1><span className="muted">Comptes, historique et permissions</span></div></div>
  {canManage && <div className="notice" style={{marginBottom:16}}>Le propriétaire peut attribuer les rôles Gestionnaire et Administrateur. Les comptes clients n’ont aucun accès à l’administration.</div>}
  <div className="admin-card"><table className="table"><thead><tr><th>Nom</th><th>Email</th><th>Rôle / permissions</th><th>Commandes</th><th>Créé le</th></tr></thead><tbody>{users.map((u:any)=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{canManage?<UserRoleActions id={u.id} role={u.role} isOwner={u.role==='OWNER'}/>:u.role==='OWNER'?'Propriétaire':u.role==='ADMIN'?'Administrateur':u.role==='MANAGER'?'Gestionnaire':'Client'}</td><td>{u._count.orders}</td><td>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table></div></>;
}
