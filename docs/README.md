# Luna Baby Créations — paquet projet complet

Fichiers regroupés depuis les archives produites pendant la conversation, les fichiers individuels disponibles et le code source téléversé. Les destinations sont relatives à la racine du projet Next.js. Pour les doublons, les corrections de `fichiers-complets.zip` / `fichiers-corriges.zip` prévalent sur l’archive projet de base; le header provient de `luna_header_menu.zip`. Le fichier `lib/db.ts` est le code complet téléversé, complété par le helper transactionnel `processPaidCheckout` décrit dans `docs/db-changes.md`.

## Inventaire fichier → destination

| Fichier dans le paquet | Destination projet |
|---|---|
| `.env.example` | `.env.example` |
| `.gitignore` | `.gitignore` |
| `CORRECTIONS.md` | `CORRECTIONS.md` |
| `GUIDE-CONNEXION.md` | `GUIDE-CONNEXION.md` |
| `GUIDE_CORRECTIFS.md` | `GUIDE_CORRECTIFS.md` |
| `INSTALL_ETERNODES.md` | `INSTALL_ETERNODES.md` |
| `README-LIVRAISON.md` | `README-LIVRAISON.md` |
| `VALIDATION.md` | `VALIDATION.md` |
| `app/a-propos/page.tsx` | `app/a-propos/page.tsx` |
| `app/admin/clients/UserRoleActions.tsx` | `app/admin/clients/UserRoleActions.tsx` |
| `app/admin/clients/page.tsx` | `app/admin/clients/page.tsx` |
| `app/admin/commandes/OrderActions.tsx` | `app/admin/commandes/OrderActions.tsx` |
| `app/admin/commandes/page.tsx` | `app/admin/commandes/page.tsx` |
| `app/admin/factures/page.tsx` | `app/admin/factures/page.tsx` |
| `app/admin/layout.tsx` | `app/admin/layout.tsx` |
| `app/admin/messages/MessageActions.tsx` | `app/admin/messages/MessageActions.tsx` |
| `app/admin/messages/page.tsx` | `app/admin/messages/page.tsx` |
| `app/admin/page.tsx` | `app/admin/page.tsx` |
| `app/admin/parametres/page.tsx` | `app/admin/parametres/page.tsx` |
| `app/admin/produits/ProductActions.tsx` | `app/admin/produits/ProductActions.tsx` |
| `app/admin/produits/page.tsx` | `app/admin/produits/page.tsx` |
| `app/admin-login/page.tsx` | `app/admin-login/page.tsx` |
| `app/api/admin/messages/route.ts` | `app/api/admin/messages/route.ts` |
| `app/api/admin/orders/route.ts` | `app/api/admin/orders/route.ts` |
| `app/api/admin/products/route.ts` | `app/api/admin/products/route.ts` |
| `app/api/admin/users/route.ts` | `app/api/admin/users/route.ts` |
| `app/api/auth/login/route.ts` | `app/api/auth/login/route.ts` |
| `app/api/auth/logout/route.ts` | `app/api/auth/logout/route.ts` |
| `app/api/auth/oauth/callback/[provider]/route.ts` | `app/api/auth/oauth/callback/[provider]/route.ts` |
| `app/api/auth/oauth/route.ts` | `app/api/auth/oauth/route.ts` |
| `app/api/auth/register/route.ts` | `app/api/auth/register/route.ts` |
| `app/api/checkout/route.ts` | `app/api/checkout/route.ts` |
| `app/api/contact/route.ts` | `app/api/contact/route.ts` |
| `app/api/invoice/[id]/route.ts` | `app/api/invoice/[id]/route.ts` |
| `app/api/webhooks/stripe/route.ts` | `app/api/webhooks/stripe/route.ts` |
| `app/cgv/page.tsx` | `app/cgv/page.tsx` |
| `app/checkout/page.tsx` | `app/checkout/page.tsx` |
| `app/coffrets/page.tsx` | `app/coffrets/page.tsx` |
| `app/commande/page.tsx` | `app/commande/page.tsx` |
| `app/compte/AccountClient.tsx` | `app/compte/AccountClient.tsx` |
| `app/compte/page.tsx` | `app/compte/page.tsx` |
| `app/confidentialite/page.tsx` | `app/confidentialite/page.tsx` |
| `app/contact/page.tsx` | `app/contact/page.tsx` |
| `app/globals.css` | `app/globals.css` |
| `app/layout.tsx` | `app/layout.tsx` |
| `app/mentions-legales/page.tsx` | `app/mentions-legales/page.tsx` |
| `app/page.tsx` | `app/page.tsx` |
| `app/panier/page.tsx` | `app/panier/page.tsx` |
| `app/personnalisation/page.tsx` | `app/personnalisation/page.tsx` |
| `app/produit/[slug]/page.tsx` | `app/produit/[slug]/page.tsx` |
| `app/shop/page.tsx` | `app/shop/page.tsx` |
| `components/AddToCart.tsx` | `components/AddToCart.tsx` |
| `components/AuthButtons.tsx` | `components/AuthButtons.tsx` |
| `components/CartClient.tsx` | `components/CartClient.tsx` |
| `components/Header.module.css` | `components/Header.module.css` |
| `components/Header.tsx` | `components/Header.tsx` |
| `components/Personalizer.tsx` | `components/Personalizer.tsx` |
| `database/migrations/20260101000000_processed_events.sql` | `database/migrations/20260101000000_processed_events.sql` |
| `database/migrations/20261028_auth.sql` | `database/migrations/20261028_auth.sql` |
| `database/schema.sql` | `database/schema.sql` |
| `docs/NOTE_HEADER.md` | `docs/NOTE_HEADER.md` |
| `docs/changes.md` | `docs/changes.md` |
| `docs/db-changes.md` | `docs/db-changes.md` |
| `lib/auth-rate-limit.ts` | `lib/auth-rate-limit.ts` |
| `lib/auth.ts` | `lib/auth.ts` |
| `lib/data.ts` | `lib/data.ts` |
| `lib/db.ts` | `lib/db.ts` |
| `lib/invoice.ts` | `lib/invoice.ts` |
| `lib/mongodb.ts` | `lib/mongodb.ts` |
| `lib/postgres.ts` | `lib/postgres.ts` |
| `lib/stripe.ts` | `lib/stripe.ts` |
| `middleware.ts` | `middleware.ts` |
| `next-env.d.ts` | `next-env.d.ts` |
| `next.config.mjs` | `next.config.mjs` |
| `package.json` | `package.json` |
| `public/logo.png` | `public/logo.png` |
| `public/products/coffret.svg` | `public/products/coffret.svg` |
| `public/products/fleurie.svg` | `public/products/fleurie.svg` |
| `public/products/keyring.svg` | `public/products/keyring.svg` |
| `public/products/nude.svg` | `public/products/nude.svg` |
| `public/products/pastel.svg` | `public/products/pastel.svg` |
| `public/products/rattle.svg` | `public/products/rattle.svg` |
| `scripts/migrate-mongo-to-postgres.mjs` | `scripts/migrate-mongo-to-postgres.mjs` |
| `scripts/setup-postgres.mjs` | `scripts/setup-postgres.mjs` |
| `server.js` | `server.js` |
| `start.sh` | `start.sh` |
| `tsconfig.json` | `tsconfig.json` |

## Ordre d’application recommandé

1. Faire une sauvegarde du dépôt et copier les fichiers du paquet à la racine du projet, en conservant les chemins affichés ci-dessus.
2. Contrôler la compatibilité de `package.json` avec les dépendances importées et installer les dépendances verrouillées par le projet.
3. Renseigner les variables de `.env.example` (ne pas réutiliser les exemples/valeurs placeholder).
4. Vérifier le schéma PostgreSQL puis appliquer les migrations fournies : `database/migrations/20261028_auth.sql` et `database/migrations/20260101000000_processed_events.sql` (en complément du schéma initial adapté).
5. Lancer le build et les tests du projet, puis tester l’authentification, le checkout, le webhook et les vues admin avec des services de test avant déploiement.

## Variables d’environnement

- Principales : `DATABASE_URL`, `AUTH_SECRET` (au moins 32 caractères), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`.
- Initialisation du compte administrateur : `ADMIN_EMAIL`, `ADMIN_PASSWORD` (si seed requis), et `OWNER_EMAIL` (facultatif).
- E-mail (facultatif pour le fonctionnement, requis pour envoi) : `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL`.
- PostgreSQL : `PGSSL` (facultatif).
- Migration historique seulement : `MONGODB_URI`.
- Coordonnées facture : `SITE_NAME`, `SITE_ADDRESS`, `SITE_EMAIL` (selon le module facture; valeurs de repli disponibles).

## Points de vigilance

- Remplacer tous les champs `[À COMPLÉTER]` de la page Mentions légales avant publication.
- Configurer un endpoint Stripe `https://<domaine>/api/webhooks/stripe` pour `checkout.session.completed` et `checkout.session.async_payment_succeeded`; vérifier que le secret `whsec_...` est celui de cet endpoint.
- Appliquer la migration `processed_events` avant d’activer le webhook : sinon, les confirmations échouent et Stripe réessaie. Tester montant, devise, stock et redirections en mode test.
- Le helper `processPaidCheckout` du fichier `lib/db.ts` utilise une transaction PostgreSQL pour la déduplication, la transition vers PAID et la décrémentation atomique du stock. Consulter `docs/db-changes.md` pour les risques d’inventaire et notes sur les requêtes admin.
- Les corrections d’auth et certaines sources proviennent d’archives antérieures : compiler et exécuter des tests d’intégration contre les versions réelles du dépôt et le schéma SQL avant déploiement. `CORRECTIONS.md` présente les corrections et tâches manuelles, dont les fichiers historiques Mongo/serveur.
- `server.js`, fichiers de guide, et scripts/fichiers issus du projet sont conservés quand présents dans l’archive complète; ils ne sont pas nécessairement nécessaires au déploiement corrigé.
- Fichiers uploadés non copiés comme fichiers applicatifs faute de destination identifiable ou parce qu’ils sont des exports de source : `IMG_1739.jpeg`, `IMG_2401.png`, `IMG_2402.png`, `clipboard.txt`, `repomix-output-CPModded-luna_baby_creations.xml 2.txt`, `repomix-output-CPModded-luna_baby_creations.xml.txt`, `repomix-output-archive-2026-10-29T115312+0100 2.zip.xml.txt`, `iLoveZIP_Create.zip`, `iLoveZIP_Create 2.zip`. Les sources téléversées `db.ts`, `invoice.ts`, `page*.tsx`, `route*.ts` et `stripe.ts` ont été prises en compte, avec les versions de correction plus récentes lorsqu’elles existaient.

Documentation fournie : `docs/changes.md`, `docs/db-changes.md`, `CORRECTIONS.md`, `docs/NOTE_HEADER.md`.
