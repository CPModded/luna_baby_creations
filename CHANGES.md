# Modifications

- `app/admin/messages/page.tsx` et `app/admin/messages/MessageActions.tsx` : affichage des actions lu/non lu et formulaire de réponse reliés aux routes API.
- `app/admin/promos/page.tsx`, `PromoForm.tsx`, `PromoActions.tsx` : interface de gestion des promotions (liste, création, activation/désactivation, suppression).
- `app/admin/layout.tsx` : lien « Promotions » dans la navigation d’administration.
- `app/api/admin/promos/route.ts` : route API de gestion des codes promo, reprise du ZIP précédent.
- `app/api/admin/messages/[id]/reply/route.ts` : sauvegarde de la réponse même si Resend échoue, avec un message explicite si le domaine n’est pas vérifié.
- `app/api/contact/route.ts` : notification adressée à `ADMIN_EMAIL`, avec l’adresse demandée comme valeur par défaut.
- `lib/db.ts` : ajout des opérations DB pour `message_replies` et `promo_codes`, selon les colonnes SQL utilisées par les routes.
- `database/migrations/20261031000000_messages_promos.sql` : tables de réponses et promotions requises par ces routes.
- `components/CartClient.tsx` et `app/checkout/page.tsx` : saisie et conservation du code promo, transmis à `/api/checkout`.
- `next.config.mjs` : renommé depuis `next.config.js` pour préserver la syntaxe ESM sans ajouter `type: module` (le dépôt contient aussi `server.js` en CommonJS).
