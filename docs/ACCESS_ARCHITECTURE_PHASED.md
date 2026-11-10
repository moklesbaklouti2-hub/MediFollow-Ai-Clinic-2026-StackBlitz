# Architecture d'accès progressive — MediFollow AI

**Décision utilisateur (10 novembre 2026) :** un médecin unique actuellement ; plusieurs utilisateurs possibles ultérieurement.

## Phase 1 — médecin unique
- Un compte médecin administrateur individuel, sans mot de passe ni secret dans le dépôt.
- Authentification réelle côté serveur avant tout accès aux routes cliniques ; sessions sécurisées, expiration, révocation et protection contre les tentatives répétées.
- Refuser par défaut les requêtes anonymes (401) et les accès non autorisés (403).
- Le frontend devra transmettre la session selon une méthode sécurisée et gérer explicitement la déconnexion et les erreurs d'accès.
- Le déploiement exige HTTPS, une configuration explicite des origines, et un stockage des secrets hors dépôt.
- Aucun contournement « mode développement » ou rôle envoyé par le navigateur ne doit accorder l'accès.
- Choisir et intégrer une solution d'identité adaptée au mode d'hébergement avant d'activer les gardes sur les routes existantes.

## Phase 2 — utilisateurs multiples
- Identités distinctes, rôles (médecin, infirmier, administratif) et permissions minimales.
- Contrôle de l'accès à chaque dossier patient, consultation et prescription, côté serveur.
- Journal d'audit sans détails médicaux sensibles ; révocation des comptes et sessions.
- Préparer les migrations de données, sans activer de rôles fictifs en production.

## État du code vérifié
- Les routes Express `/api/clinical/analyze`, `/api/commands/interpret` et `/api/chat` n'ont pas de middleware d'authentification réel identifié.
- Le test HTTP 401/403/200 actuel porte sur une application Express **isolée**, non sur ces routes.
- Le test HTTP local sur les vraies routes observe des erreurs de validation 400 sans authentification : **bloquant pour une exposition publique**.
- Les tests verts ne certifient pas la protection des données patients.

## Conditions avant mise en production
1. Choisir l'hébergement et le mécanisme d'identité/session.
2. Ajouter l'authentification côté serveur et adapter le frontend dans une branche dédiée.
3. Tester sur les véritables routes : anonyme 401, rôle non autorisé 403, médecin autorisé, session expirée, tentative d'usurpation, et autorisation par dossier.
4. Vérifier confidentialité des données envoyées aux fournisseurs IA, sécurité du stockage, HTTPS et essais Android.
5. Obtenir une validation explicite avant toute fusion dans `main`.

**Ne pas activer une protection partielle qui rendrait l'interface inutilisable ou donnerait une fausse impression de sécurité.**
