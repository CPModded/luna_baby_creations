# Luna Baby Creations — header responsive

## Fichiers à placer à la racine du dépôt Next.js

- `components/Header.tsx` — header client, logo, liens et panneau mobile accessible.
- `components/Header.module.css` — styles responsive, états hover et animations.
- `app/layout.tsx` — intègre le header et transmet le rôle d’administration depuis la session serveur existante.
- `public/logo.png` — logo fourni en pièce jointe, converti de JPEG en PNG pour cet usage.

Le titre « Luna Baby » est centré dans le header, avec « Créations faites avec douceur » en sous-titre. La navigation conserve Accueil, Boutique, Coffrets, Personnalisation, À propos, Contact, Compte et Panier. Le lien Admin/Administration apparaît uniquement pour un compte dont le rôle est OWNER, ADMIN ou MANAGER. L’authentification n’est pas modifiée.

Menu compact sous 1050 px : panneau latéral défilant, fermeture par clic sur le fond, Échap ou navigation, focus initial sur le premier lien et attributs ARIA.
