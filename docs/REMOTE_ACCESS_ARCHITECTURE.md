# Architecture cible : accès multi-appareils et distant

Décision utilisateur (10 novembre 2026) : MediFollow AI doit être utilisable sur tablette Android, ordinateur et autres appareils, y compris à distance via Internet. Un seul médecin administrateur au départ ; extension multi-utilisateurs possible ensuite.

## Architecture de référence (à valider avant déploiement)

- Frontend React/Vite accessible sur HTTPS, adapté aux écrans mobiles.
- API Express derrière un reverse proxy TLS ; **ne jamais exposer directement le port 3001 à Internet**.
- Identité et autorisation vérifiées **sur le serveur**, sur chaque requête clinique. Le navigateur ne définit jamais le rôle.
- Connexion via mécanisme de session serveur avec cookie `HttpOnly`, `Secure`, `SameSite` adapté à l'architecture, et défense CSRF si cookies ; envisager une origine unique pour frontend et API.
- Sessions expirables et révocables ; secrets côté serveur uniquement, rotation et révocation après incident.
- HTTPS obligatoire, HSTS après validation de la configuration, limitation des tentatives persistante/partagée, journalisation de sécurité sans données cliniques ni jetons.
- Stockage chiffré et sauvegardes chiffrées avec restauration testée ; contrôle d'accès patient par patient lors de l'évolution multi-utilisateurs.
- Sauvegarde des données cliniques et synchronisation entre appareils **non résolues** par l'actuel export/import JSON local ; choisir une base persistante et définir un plan de migration avant tout usage réel.
- Contrôler les obligations tunisiennes de protection des données personnelles et de santé avec les autorités et professionnels compétents avant mise en production.

## À ne pas faire

- Ne pas utiliser un secret statique exposé dans Vite ni localStorage pour des jetons durables.
- Ne pas publier Codespaces ou un serveur Express brut comme service clinique de production.
- Ne pas monter automatiquement les gardes isolés sur les routes réelles sans parcours de connexion frontend et tests bout en bout.
- Ne pas présenter les fixtures 401/403 comme la preuve d'une authentification active.

## Séquence de réalisation

1. Choisir l'hébergement de production, la région de stockage et la stratégie de sauvegarde en fonction des exigences légales et des coûts.
2. Préparer un environnement de test sans patients réels, sur une origine HTTPS unique.
3. Ajouter configuration serveur fail-closed, provisionnement sécurisé du compte, cookies de session et protection CSRF.
4. Adapter le frontend au login/logout et aux réponses 401/403.
5. Protéger les trois vraies routes `/api/clinical/analyze`, `/api/commands/interpret`, `/api/chat`.
6. Exécuter tests de sécurité et non-régression sur tablette et ordinateur.
7. Valider stockage persistant, sauvegardes, confidentialité, supervision, et procédure de reprise.
8. N'activer en production et ne modifier `main` qu'après accord explicite.

**Statut : architecture cible documentée, pas de mise en production ni de sécurité clinique certifiée.**
