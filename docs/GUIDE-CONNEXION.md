# Connexion Luna Baby — guide sans console

## Avant de commencer

Cette mise à jour utilise la base PostgreSQL déjà présente. Les rôles `OWNER`, `ADMIN`, `MANAGER` restent inchangés. La migration crée les tables de sessions et de liens OAuth. Les adresses Google/Apple ne sont liées à un compte existant qu'après validation de l'email par le fournisseur.

**Adresse de rappel à configurer chez les deux fournisseurs :**

`https://VOTRE-DOMAINE/api/auth/oauth/callback/google` (Google)

`https://VOTRE-DOMAINE/api/auth/oauth/callback/apple` (Apple)

Remplacez `VOTRE-DOMAINE` par le vrai nom de domaine de production, sans `/` final. Pour tester un domaine d'aperçu, ajoutez aussi son URI de rappel dans les réglages OAuth.

## 1. Créer les identifiants Google

1. Connectez-vous à [Google Cloud Console](https://console.cloud.google.com/) et créez ou choisissez un projet.
2. Ouvrez **API et services → Écran de consentement OAuth**. Choisissez **Externe**, renseignez le nom « Luna Baby Créations », l'email de support et les coordonnées exigées. Publiez l'application quand Google le demande. En mode test, seuls les testeurs listés peuvent se connecter.
3. Ouvrez **Identifiants → Créer des identifiants → ID client OAuth** et sélectionnez **Application Web**.
4. Dans **Origines JavaScript autorisées**, ajoutez `https://VOTRE-DOMAINE`.
5. Dans **URI de redirection autorisés**, ajoutez exactement `https://VOTRE-DOMAINE/api/auth/oauth/callback/google`.
6. Copiez l'ID client et le secret client dans les variables `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.

## 2. Créer Sign in with Apple

La création des identifiants Apple requiert l'adhésion Apple Developer payante, un compte d'équipe et l'activation de l'authentification à deux facteurs.

1. Ouvrez [Apple Developer → Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
2. Dans **Identifiers**, ajoutez un **App ID** si l'équipe n'en possède pas encore. Activez **Sign in with Apple**.
3. Ajoutez un identifiant **Services ID** (par exemple `fr.votredomaine.lunababy.web`) et activez **Sign in with Apple** pour cet identifiant.
4. Dans la configuration Web du Services ID, choisissez le **Primary App ID** correspondant. Ajoutez le domaine (ex. `VOTRE-DOMAINE`, sans protocole) et l'URL de retour exacte `https://VOTRE-DOMAINE/api/auth/oauth/callback/apple`.
5. Dans **Keys**, créez une clé et cochez **Sign in with Apple**; associez l'App ID demandé. Téléchargez le fichier `.p8` une seule fois.
6. Renseignez `APPLE_ID` avec l'identifiant Services ID, `APPLE_TEAM_ID` (Membership Details), `APPLE_KEY_ID` (page de la clé), et `APPLE_PRIVATE_KEY` avec le contenu complet du fichier `.p8`, y compris les lignes `BEGIN/END PRIVATE KEY`. Gardez le fichier et les identifiants secrets.

Le bouton Apple est masqué sur les appareils non-Apple. La détection côté navigateur reconnaît iPhone/iPad/Mac et iPadOS présenté comme Mac grâce à `maxTouchPoints`; le serveur n'utilise le user-agent qu'en complément.

## 3. Déposer les variables chez l'hébergeur

1. Ouvrez le tableau de bord de votre hébergeur et le projet/site Luna Baby.
2. Dans **Settings / Configuration → Environment Variables** (ou **Variables d'environnement**), ajoutez chaque variable de `.env.example` utilisée par votre installation: `AUTH_URL`, `AUTH_SECRET`, `DATABASE_URL`, `PGSSL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, et éventuellement `OWNER_EMAIL`.
3. `AUTH_URL` doit être l'URL HTTPS du site public sans slash final. `DATABASE_URL` est l'URL PostgreSQL déjà fournie par l'hébergeur. Ne copiez jamais de vraies clés dans GitHub.
4. Enregistrez, puis utilisez **Redeploy / Redéployer** pour que les variables soient prises en compte. Une valeur vide dans `.env.example` est un emplacement à remplir, pas une vraie clé.

## 4. Exécuter la migration dans l'éditeur SQL web

1. Ouvrez le tableau de bord de votre base PostgreSQL, puis **SQL Editor / Query / Console SQL**.
2. Vérifiez que `database/schema.sql` a déjà été appliqué (il crée notamment `users`). Cette migration n'initialise pas les produits ni les autres tables du site.
3. Dans GitHub, ouvrez `database/migrations/20261028_auth.sql`, cliquez **Raw**, copiez tout le texte SQL et collez-le dans l'éditeur web de la bonne base.
4. Cliquez **Run / Exécuter**. Le script est idempotent (peut être rejoué); ne l'exécutez pas dans une autre base que celle reliée à `DATABASE_URL`.
5. Vérifiez dans l'interface des tables que `auth_accounts`, `auth_sessions` et la colonne `users.emailVerified` existent. Aucun terminal/console serveur n'est nécessaire.

## 5. Envoyer les fichiers via l'interface GitHub

1. Téléchargez l'archive fournie et décompressez-la sur votre ordinateur.
2. Ouvrez le dépôt GitHub `luna_baby_creations`, sélectionnez la branche utilisée pour le site.
3. Pour chaque fichier de l'archive, ouvrez/créez le chemin correspondant dans le dépôt. Pour envoyer plusieurs fichiers, utilisez **Add file → Upload files** et déposez les fichiers avec leurs dossiers. GitHub peut ne pas préserver les dossiers vides; seuls les dossiers contenant des fichiers comptent.
4. Vérifiez les chemins (par ex. `app/api/auth/oauth/callback/[provider]/route.ts`, `lib/auth.ts`, `middleware.ts`) avant de valider.
5. Créez un commit sur la branche puis laissez l'hébergeur redéployer. N'effacez aucun autre fichier du dépôt.

## À savoir / limites

- Il s'agit de routes OAuth maison intégrées à l'ORM SQL existant, pas d'Auth.js. Cela évite de remplacer l'accès aux tables et au rôle utilisés par le projet.
- Le rate-limit est en mémoire du processus: il protège les tentatives simples sur une instance, mais ne remplace pas une limitation distribuée si l'hébergement lance plusieurs instances.
- `APPLE_PRIVATE_KEY` est une clé secrète, à coller uniquement dans les secrets de l'hébergeur.
- Aucun fichier existant n'est supprimé par cette archive. Les anciens endpoints email existants sont remplacés par les versions contenues dans cette livraison. Pas de fichier à supprimer manuellement.
- Le propriétaire est déterminé par `OWNER_EMAIL` (email séparés par virgule) ou par le mécanisme de promotion OWNER déjà existant du projet. Ne partagez pas cette variable publiquement.
