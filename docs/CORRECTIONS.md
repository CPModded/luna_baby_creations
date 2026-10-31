# Corrections appliquées au projet `luna_baby_creations`

Toutes les corrections sont listées par fichier. Les chemins sont relatifs à la
racine du dépôt Next.js original.

> **Aucun secret réel n'est inventé.** Les champs `AUTH_SECRET`,
> `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
> `ADMIN_PASSWORD`, etc. restent à renseigner via `.env` (voir `.env.example`).

---

## 1. `app/api/webhooks/stripe/route.ts` (réécrit)

- Réponse **HTTP 400** immédiate si `STRIPE_WEBHOOK_SECRET` est absent ou si
  l'en-tête `stripe-signature` manque (avant toute vérification de signature).
- Vérification de la signature Stripe avec
  `stripe.webhooks.constructEvent(raw, sig, webhookSecret)` (échec → 400).
- **Idempotence** via une nouvelle table `processed_events` :
  - `INSERT INTO processed_events (id, "receivedAt") VALUES ($1, NOW())
     ON CONFLICT (id) DO NOTHING RETURNING id`
  - Si la requête ne retourne aucune ligne, l'événement est déjà traité :
    on renvoie `{ received: true, duplicate: true }` et on **stop** avant
    la logique métier.
- L'INSERT utilise le helper existant `query()` de `lib/postgres.ts` (le
  client `db` de `lib/db.ts` n'expose pas `$queryRaw`).
- Conserve exactement la logique métier d'origine (mise à jour `status='PAID'`,
  décrément de stock, email via Resend avec PDF en pièce jointe).

## 2. `lib/auth.ts` (réécrit) et `middleware.ts` (réécrit)

- Suppression complète du secret par défaut `'development-secret-change-me'`.
- Helper `resolveSecret()` : lève l'erreur
  `AUTH_SECRET_MISSING_OR_TOO_SHORT: AUTH_SECRET must be defined and at least
  32 characters long.` si la variable est absente ou trop courte.
- `createSession(userId, role?)` : le rôle est désormais inclus dans le
  payload JWT (`{ userId, role }`) pour permettre la vérification côté
  middleware sans requête DB.
- `middleware.ts` :
  - Restreint la protection aux routes `/admin/*` (sauf `/admin-login`).
  - Refuse tout rôle connu non autorisé (`OWNER`/`ADMIN`/`MANAGER`) via
    `payload.role` ; si le rôle est absent du payload, on laisse passer
    (le contrôle fin se fait dans le layout serveur).

## 3. `app/admin/factures/page.tsx` (réécrit)

- Remplacement de `import { Order } from '@/lib/mongodb'` + `Order.find({})`
  par la couche Postgres existante&nbsp;:
  ```ts
  import { db } from '@/lib/db'
  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true },
  })
  ```
- Conserve le rendu identique (mêmes colonnes, même lien `/api/invoice/${id}`).

## 4. `lib/stripe.ts` (réécrit)

- Suppression de la valeur de repli `'sk_test_placeholder'`.
- Erreur explicite `STRIPE_SECRET_KEY_MISSING` si la variable est absente.

## 5. `app/api/auth/login/route.ts` (corrigé)

- Ajout de `role: true` dans le `select` du `findUnique`.
- `admin: ['OWNER','ADMIN','MANAGER'].includes(u.role)` au lieu de
  `admin: u.role === 'ADMIN'`. Permet au front d'accepter MANAGER.

## 6. `app/api/admin/orders/route.ts` (réécrit)

- Validation de l'entrée avec **zod** (`z.enum` basé sur les statuts réels
  exportés depuis `lib/db.ts` : `PENDING`, `PAID`, `PROCESSING`, `SHIPPED`,
  `DELIVERED`, `CANCELLED`).
- Réponse **HTTP 400** avec message explicite si le statut est invalide,
  **HTTP 403** si non authentifié, **HTTP 500** sinon.
- `zod` est déjà listé dans `package.json` (`"zod": "^3.25.76"`) — pas
  besoin de l'ajouter.

## 7. `middleware.ts` (corrigé)

- Voir point 2 ci-dessus : vérification du rôle `OWNER/ADMIN/MANAGER` dans
  le payload JWT pour les routes `/admin/*`.

## 8. `start.sh` (corrigé) et fichiers à supprimer

- `start.sh` : remplace `next dev` par `next start -H 0.0.0.0 -p "$PORT"`
  (défaut `PORT=3000` via `SERVER_PORT`/`PORT`).
- Effectue un `next build` si le dossier `.next/` est absent.
- **`server.js` : à supprimer manuellement** (le `start.sh` ne le lance plus ;
  il reste un spawn `next dev` sans valeur ajoutée). Le `package.json`
  `"start"` utilise déjà `next start` directement.
- **`lib/mongodb.ts` et `mongoose` du `package.json` : à conserver pour le
  moment.** Le script `scripts/migrate-mongo-to-postgres.mjs` et
  `lib/mongodb.ts` les utilisent toujours. Une fois la migration Mongo →
  Postgres effectuée et `lib/mongodb.ts` supprimé du code, retirer aussi
  `mongoose` du `package.json` (déclaration présente, dépendance utile
  tant que la migration existe).

## 9. `.env.example` (nouveau)

Couvre, à partir des variables réellement utilisées dans le code&nbsp;:

| Variable | Source |
| --- | --- |
| `AUTH_SECRET` | `lib/auth.ts`, `middleware.ts` |
| `DATABASE_URL` | `lib/postgres.ts`, `lib/db.ts` |
| `PGSSL` | `lib/postgres.ts` |
| `STRIPE_SECRET_KEY` | `lib/stripe.ts`, `app/api/checkout/route.ts` |
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts` |
| `NEXT_PUBLIC_SITE_URL` | `app/api/auth/logout/route.ts`, `app/api/checkout/route.ts` |
| `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL` | `app/api/contact/route.ts`, `app/api/webhooks/stripe/route.ts` |
| `OWNER_EMAIL`, `ADMIN_PASSWORD` | `app/api/auth/register/route.ts`, `lib/db.ts` |
| `MONGODB_URI` | `lib/mongodb.ts`, `scripts/migrate-mongo-to-postgres.mjs` |

## 10. `app/mentions-legales/page.tsx` (réécrit)

- Page de mentions légales française complète, conservant le style existant
  (`page`, `container`, `page-head`, `form`, `h2`, `muted`, `notice`).
- Champs à compléter clairement marqués **[À COMPLÉTER]** :
  - Raison sociale / nom, forme juridique, adresse, SIRET, TVA, capital
  - Email, téléphone
  - Directeur de la publication (nom, qualité, email)
  - Hébergeur (dénomination, adresse, téléphone)
- Sections standard : propriété intellectuelle, données personnelles,
  cookies, droit applicable, contact.
- Bandeau `notice` rappelant que chaque `[À COMPLÉTER]` doit être remplacé
  avant mise en production.

---

## Fichiers à supprimer

- `server.js` (racine) — remplacé par `start.sh` + `next start`.
- Une fois la migration Mongo → Postgres validée :
  - `lib/mongodb.ts`
  - dépendance `mongoose` dans `package.json`

## Étapes manuelles

1. **Générer `AUTH_SECRET`** (au moins 32 caractères) :
   ```sh
   openssl rand -base64 48
   ```
   Coller la valeur dans `.env` (`AUTH_SECRET=...`).

2. **Appliquer la migration SQL** :
   ```sh
   psql "$DATABASE_URL" -f database/migrations/20260101000000_processed_events.sql
   # ou, après adaptation, appliquer via votre outil de migration habituel.
   ```

3. **Configurer le webhook Stripe** :
   - Dashboard Stripe → Developers → Webhooks → Add endpoint
   - URL : `https://<votre-domaine>/api/webhooks/stripe`
   - Events à écouter : au minimum `checkout.session.completed`
   - Récupérer le **Signing secret** (`whsec_...`) et le mettre dans
     `STRIPE_WEBHOOK_SECRET` du `.env`.

4. **(Optionnel) Supprimer `server.js` et, après migration, `lib/mongodb.ts`
   + `mongoose`** : voir liste ci-dessus.

## Incertitudes

- L'export Repomix étant compressé sur une seule ligne par fichier, certaines
  longues instructions étaient **tronquées visuellement** mais aucun signe
  d'ambiguïté n'a été détecté ; tous les fichiers reconstruits sont
  syntaxiquement valides au sens de l'aperçu TypeScript disponible dans
  l'export.
- Le champ `role` ajouté au JWT (point 2) est **optionnel** : les sessions
  existantes restent valides (le middleware tolère un payload sans rôle).
