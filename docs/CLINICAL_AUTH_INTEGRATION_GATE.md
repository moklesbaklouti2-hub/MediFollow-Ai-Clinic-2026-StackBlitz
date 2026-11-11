# Passage de la préparation à la protection réelle des routes cliniques

État au 10 novembre 2026 : **NON PRÊT POUR DES DONNÉES PATIENT RÉELLES OU UN DÉPLOIEMENT PUBLIC**.

## Vérification du serveur réel

Dans `server/index.ts`, les trois routes sensibles sont toujours montées directement :
- `POST /api/clinical/analyze`
- `POST /api/commands/interpret`
- `POST /api/chat`

Aucun garde d'authentification n'est encore branché à ces routes. Les contrôles HTTP 401/403 réussis concernent des **fixtures isolées**, pas les routes ci-dessus. `GET /api/health` peut rester public s'il ne révèle aucune information sensible.

## Travaux réalisés (branche audit uniquement)

- Hachage scrypt des mots de passe, données de test fictives.
- Contrôleur de connexion/déconnexion isolé, verrouillage en mémoire et protection contre les vérifications parallèles.
- Sessions aléatoires expirables, révocables, avec capacité limitée.
- Garde de session Express isolé et tests HTTP synthétiques.
- Aucun identifiant réel créé, aucune migration de comptes ou interface de connexion déployée.

## Critères de sortie indispensables

1. Définir le mode d'accès réel (tablette locale, Codespaces, serveur privé ou accès Internet) et HTTPS.
2. Approvisionner l'identité du médecin et le hachage de son mot de passe exclusivement côté serveur, sans secret dans Vite, GitHub ou les journaux.
3. Prévoir une connexion utilisable dans l'interface et la transmission sûre de la session.
4. Monter le garde sur **les trois routes réelles** avec refus par défaut ; préserver un chemin de santé sans données cliniques.
5. Vérifier HTTP 401 anonyme/invalide/expiré/révoqué et 200 authentifié sur **chacune des trois routes réelles**, sans appel au fournisseur IA lors des tests négatifs.
6. Tester les échecs de connexion parallèles, la déconnexion, l'expiration, le redémarrage et les erreurs réseau.
7. Mettre en place une limitation de tentatives adaptée au déploiement (stockage partagé si plusieurs processus), HTTPS et stockage sûr des sessions.
8. Vérifier la non-régression du frontend et de la dictée sur tablette Android.
9. Obtenir l'accord explicite avant activation sur `main` ; ne pas considérer la réussite de fixtures comme une certification de sécurité.

**Décision actuelle :** ne pas monter automatiquement les gardes sur les routes réelles tant que le mode d'accès et la connexion frontend ne sont pas définis.
