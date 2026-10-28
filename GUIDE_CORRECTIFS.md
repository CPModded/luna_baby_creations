# Guide des correctifs — Luna Baby Creations

## Nature du diagnostic

`clipboard.txt` est un export Repomix de fichiers du dépôt (69 entrées de code/configuration), pas un journal de build ou de déploiement. Il décrit un projet Next.js 15 / React 19 avec App Router, TypeScript et un adaptateur PostgreSQL `pg` (`lib/postgres.ts` / `lib/db.ts`). Le schéma indique qu'Eternodes fournit l'instance PostgreSQL. MongoDB est encore mentionné dans les scripts comme source historique de migration vers PostgreSQL; aucun ORM Prisma n'est utilisé. Le dépôt n'indique pas de fournisseur d'hébergement Next.js distinct d'Eternodes.

Aucune erreur de build précise n'apparaît dans ce fichier. Les incompatibilités repérées sont dans l'intégration de l'ancienne livraison auth avec le vrai dépôt : création OAuth envoyant `passwordHash: null` alors que la colonne PostgreSQL est `NOT NULL`; le nouvel attribut `emailVerified` n'était pas accepté par l'adaptateur DB; les formulaires Apple `form_post` pouvaient suivre une redirection 307 et répéter le POST; et remplacer `app/globals.css` par le fichier du snapshot aurait écrasé les styles courants du dépôt.

## Fichiers de l'archive à déposer/remplacer

Les chemins sont relatifs à la racine du dépôt :

- `app/api/auth/login/route.ts` — login par email/mot de passe avec validation, normalisation email, limitation de tentatives et rôles admin OWNER/ADMIN/MANAGER.
- `app/api/auth/register/route.ts` — inscription email/mot de passe; les rôles ne sont jamais acceptés depuis le client.
- `app/api/auth/logout/route.ts` — révocation de session et déconnexion.
- `app/api/auth/oauth/route.ts` et `app/api/auth/oauth/callback/[provider]/route.ts` — OAuth Google et Apple, contrôle `state`/PKCE, validation d'email et liaison à un compte existant uniquement sur email vérifié. Les retours Apple utilisent une redirection 303 et réutilisent l’email de la liaison enregistrée si Apple ne le renvoie qu’au premier consentement.
- `app/compte/AccountClient.tsx` et `app/compte/page.tsx` — interface de compte/social login et affichage des commandes.
- `app/admin-login/page.tsx` — formulaire d'accès administrateur.
- `components/AuthButtons.tsx` — bouton Google et bouton Apple conditionnel aux appareils Apple (l'endpoint OAuth est accessible depuis le flux du bouton).
- `components/Header.tsx`, `components/Header.module.css`, `public/logo.png` — header livré précédemment; le lien Administration est transmis à OWNER/ADMIN/MANAGER.
- `app/globals.css` — styles d'auth ajoutés à la fin des styles présents dans le snapshot du dépôt. Si le fichier a été modifié depuis cet export, fusionner uniquement le bloc `/* Styles connexion Luna Baby */` au lieu d'écraser les changements plus récents.
- `lib/auth.ts`, `lib/auth-rate-limit.ts`, `lib/db.ts`, `middleware.ts` — sessions persistantes en base, protection des pages admin, adaptation des colonnes OAuth et limitation basique des tentatives.
- `database/migrations/20261028_auth.sql` — migration des tables de comptes fournisseurs/sessions et du champ `emailVerified`.

Aucun fichier complet du dépôt n'est fourni en remplacement. L'archive ne contient pas de dépendances externes qui ne figurent déjà dans `package.json` (notamment `jose`, `bcryptjs`, `pg`, `zod`).

## Actions hébergeur et base de données

1. Sauvegarder la base PostgreSQL et vérifier que l'application pointe vers la bonne `DATABASE_URL` Eternodes.
2. Dans la console SQL de cette base, exécuter une fois `database/migrations/20261028_auth.sql`, après le schéma principal. Cela rend `passwordHash` nullable pour OAuth, sans toucher aux mots de passe des comptes existants; crée `auth_accounts`, `auth_sessions` et `users.emailVerified`.
3. Dans les variables d'environnement de l'hébergeur, définir `AUTH_SECRET` avec une valeur aléatoire secrète d'au moins 32 caractères. L'application échoue volontairement à valider une session si cette valeur manque ou est trop courte. Ne pas déposer les secrets dans le dépôt.
4. Garder `DATABASE_URL` existante; définir `AUTH_URL` (origine HTTPS publique, sans slash final), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, et, si Apple est activé, `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`. Garder les variables existantes `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OWNER_EMAIL`, `PGSSL` selon l'installation.
5. Configurer les URI de redirection OAuth exactes : `/api/auth/oauth/callback/google` et `/api/auth/oauth/callback/apple` sur le domaine configuré dans `AUTH_URL`. Pour Apple, `APPLE_ID` est le Services ID et la clé `.p8` reste un secret hébergeur.
6. Redéployer l'application. Tester l'inscription, connexion/déconnexion, Google, Apple sur appareil Apple, accès admin pour les trois rôles, et accès refusé pour CUSTOMER.

## Sécurité et limites

- Le scan de `clipboard.txt` n'a trouvé aucune valeur ressemblant à un secret réel ou une URL de base avec identifiants. Il contient des exemples/placholders de secrets uniquement; ne pas publier de vraies valeurs si elles sont ajoutées ultérieurement.
- La détection du bouton Apple côté client est une commodité d'interface, pas un contrôle d'identité de l'appareil. Le contrôle d'accès réel est le callback avec state/token vérifiés.
- Le rate-limit livré est en mémoire d'un processus; derrière plusieurs instances, compléter avec une protection distribuée/règle hébergeur.
- OAuth lie un nouvel identifiant fournisseur à un compte par email uniquement après validation d'email côté fournisseur. Les comptes existants et leurs rôles sont conservés.
- Le code a été adapté au snapshot, mais aucune connexion à Eternodes/Google/Apple n'a été effectuée. Vérifier les URI et variables réelles dans les consoles fournisseurs avant usage production.
