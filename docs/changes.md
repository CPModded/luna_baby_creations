# Résumé des corrections

Fichiers fournis à copier vers les chemins du projet (alias `@/lib/...` et imports relatifs préservés) :

| Livrable | Destination projet |
|---|---|
| `contact-route.ts` | `app/api/contact/route.ts` |
| `contact-page.tsx` | `app/contact/page.tsx` |
| `admin-dashboard-page.tsx` | `app/admin/page.tsx` |
| `admin-orders-page.tsx` | `app/admin/commandes/page.tsx` |
| `admin-messages-page.tsx` | `app/admin/messages/page.tsx` |
| `admin-message-actions.tsx` | `app/admin/messages/MessageActions.tsx` |
| `admin-orders-route.ts` | `app/api/admin/orders/route.ts` |
| `admin-products-route.ts` | `app/api/admin/products/route.ts` |
| `admin-messages-route.ts` | `app/api/admin/messages/route.ts` |
| `admin-users-route.ts` | `app/api/admin/users/route.ts` |
| `invoice.ts` | `lib/invoice.ts` |

- Contact : validation Zod avec limites de longueur, réponses distinctes pour requête invalide et panne DB; l’e-mail Resend reste facultatif et son échec n’annule plus l’enregistrement. La page affiche les erreurs réseau/serveur, bloque les soumissions répétées et indique le chargement.
- Messages : lecture triée et présentation robuste des champs/date, état vide, lien e-mail, et action marquer lu/non lu avec gestion des erreurs. La route PATCH valide l’identifiant et le booléen `read` et requiert `requireAdmin`.
- Commandes : dashboard et liste filtrés sur `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`; les commandes `PENDING` sont donc exclues du nombre et de la liste admin. La route commandes autorise les rôles administration prévus par `requireAdmin` et limite les transitions aux états de préparation/livraison.
- Routes admin produits/messages/commandes : contrôle `requireAdmin`, validation des corps, erreurs HTTP distinguées. La route de gestion des rôles utilise `requireOwner` (restriction volontaire et existante : seul le propriétaire peut attribuer les rôles). Le listing et le marquage des messages sont séparés dans le Server Component admin et le endpoint PATCH authentifié.
- Facture : génération PDF via `pdf-lib`, lignes détaillées, sous-total/livraison/TVA/total, coordonnées et nom par `SITE_NAME`, `SITE_ADDRESS`, `SITE_EMAIL` avec valeurs de repli, logo `public/logo.png` si accessible (sinon monogramme). Pas de dépendance IA.

## Identification des sources uploadées

- `route(2).ts` : `app/api/contact/route.ts`.
- `route(3).ts` : `app/api/admin/orders/route.ts`.
- `route(4).ts` : `app/api/admin/products/route.ts`.
- `route(5).ts` : `app/api/admin/messages/route.ts`.
- `route(6).ts` : `app/api/admin/users/route.ts`.
- `page.tsx` : page contact; `page(1).tsx` : dashboard admin; `page(2).tsx` : messages admin.
- `invoice.ts` : `lib/invoice.ts`.
- Le dossier d’uploads contenait également `route.ts` (checkout) et `route(1).ts` (webhook Stripe), hors périmètre de ces corrections. `db.ts` confirme les méthodes CRUD contact et le filtre `status: { in: [...] }` utilisés ici.
