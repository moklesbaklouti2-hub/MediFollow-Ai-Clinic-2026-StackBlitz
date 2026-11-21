# MediFollow AI — revue des accès API (pré-déploiement)

**Statut : audit statique, non validé en production.** Cette note n'autorise aucun déploiement.

## Surface examinée
Lecture de `server/index.ts` sur `audit-stabilisation-2026-11-10` :
- `GET /api/health`
- `POST /api/clinical/analyze`
- `POST /api/commands/interpret`
- `POST /api/chat`
- `app.listen(PORT, '0.0.0.0')` : écoute sur toutes les interfaces du conteneur.

Les routes POST acceptent des données du client ; aucun contrôle d'identité et de rôle n'a été identifié au niveau de ces déclarations. Cela ne démontre pas à lui seul une exposition Internet : la configuration de l'hébergement et les autres couches doivent être inspectées.

## Risque à traiter avant toute mise en ligne
Une API clinique accessible sans authentification pourrait exposer des informations de santé, consommer les quotas IA et permettre des actions non autorisées. **Ne pas utiliser de données réelles de patients tant que la confidentialité et les contrôles d'accès ne sont pas vérifiés.**

## Conditions de validation
1. Définir le modèle d'identité : médecin, personnel autorisé, patient ; sessions et permissions.
2. Refuser par défaut les requêtes non authentifiées aux routes cliniques, commandes et chat ; documenter les exceptions.
3. Vérifier l'isolation des données entre comptes et rôles, y compris les pièces jointes.
4. Définir une politique explicite de CORS, limitation de débit, journalisation sans données sensibles et protection des clés serveur.
5. Tester les réponses 401/403, les accès croisés et les charges utiles invalides avec des données fictives.
6. Vérifier l'exposition réelle de Codespaces et des ports ; ne pas rendre l'API publique par inadvertance.
7. Exécuter la compilation, les tests hors ligne et les tests HTTP avant toute proposition de fusion.

**Décision requise :** aucun changement de mécanisme d'authentification ni déploiement sans choix préalable du modèle d'accès et validation explicite. Ce document n'ajoute pas de protection technique.
