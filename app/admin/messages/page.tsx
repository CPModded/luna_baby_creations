export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import MessageActions from './MessageActions'

export default async function Messages() {
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })
  return <><div className="admin-top"><div><h1 style={{ margin: 0 }}>Messages</h1><span className="muted">Demandes reçues via le formulaire contact</span></div></div>
    <div className="admin-card"><table className="table"><thead><tr><th>Date</th><th>Client</th><th>Sujet</th><th>Message</th><th>État</th></tr></thead>
      <tbody>{messages.length ? messages.map((message: any) => <tr key={message.id}>
        <td>{new Date(message.createdAt).toLocaleString('fr-FR')}</td>
        <td>{message.name}<br /><a href={`mailto:${encodeURIComponent(message.email)}`}>{message.email}</a></td>
        <td>{message.subject}</td><td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.message}</td>
        <td><MessageActions id={message.id} read={Boolean(message.read)} /></td>
      </tr>) : <tr><td colSpan={5}>Aucun message reçu pour le moment.</td></tr>}</tbody>
    </table></div>
  </>
}
