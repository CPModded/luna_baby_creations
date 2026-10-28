# Installation — Luna Baby Créations (Eternodes / Pterodactyl)

## Déploiement

1. Décompressez `luna_baby_creations_v3_complet.zip` directement dans `/home/container`. Les dossiers `app/`, `components/`, `lib/`, `public/`, `database/` et `scripts/` doivent se trouver à la racine du serveur — sans dossier parent intermédiaire.
2. Choisissez un serveur Node.js 24 dans Pterodactyl et configurez les variables d’environnement dans le panneau.
3. Définissez au minimum `DATABASE_URL` (PostgreSQL Eternodes) et `AUTH_SECRET` (secret aléatoire long, au moins 32 caractères). Configurez également `AUTH_URL` avec l’URL HTTPS publique du site. Les clés Stripe, Resend, Google ou Apple ne sont nécessaires que si vous activez ces fonctions.
4. Exécutez, dans `/home/container` :

   ```sh
   npm install && npm run build && npm start
   ```

   La commande `start` écoute sur `SERVER_PORT` si Eternodes le définit, sinon sur le port `3000`. Réglez le port alloué dans Pterodactyl en conséquence.

## Base PostgreSQL et OAuth

Appliquez d’abord `database/schema.sql` à la base, puis exécutez une fois `database/migrations/20261028_auth.sql` pour les sessions et comptes OAuth. Configurez les URI de retour Google/Apple sur `/api/auth/oauth/callback/google` et `/api/auth/oauth/callback/apple` sur le domaine déclaré dans `AUTH_URL`.

Ne déposez pas de vrais secrets dans les fichiers du projet ou dans l’archive. `.env.example` est un modèle uniquement; renseignez les valeurs réelles dans les variables d’environnement Pterodactyl.
