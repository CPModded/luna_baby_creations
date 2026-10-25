'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function UserRoleActions({id, role, isOwner}:{id:string;role:string;isOwner:boolean}) {
  const [value,setValue] = useState(role);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const router = useRouter();
  if (isOwner) return <span>Propriétaire</span>;
  async function save() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/users',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id,role:value})});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Modification impossible.');
      router.refresh();
    } catch (e:any) { setError(e?.message || 'Erreur réseau.'); }
    finally { setBusy(false); }
  }
  return <div style={{display:'grid',gap:6,minWidth:140}}>
    <select className="input" aria-label="Rôle du compte" value={value} onChange={e=>setValue(e.target.value)}>
      <option value="CUSTOMER">Client</option><option value="MANAGER">Gestionnaire</option><option value="ADMIN">Administrateur</option>
    </select>
    <button className="small-btn" type="button" disabled={busy || value===role} onClick={save}>{busy?'Enregistrement…':'Enregistrer'}</button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
