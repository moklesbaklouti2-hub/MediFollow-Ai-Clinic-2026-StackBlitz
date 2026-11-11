# MediFollow AI — tableau de productivité et lots anti-doublons

**Dernière vérification :** 11 novembre 2026 · **Branche de travail :** `audit-stabilisation-2026-11-10` · **PR #2 :** brouillon, non fusionnée.

## Règle d'exécution

1. Vérifier le `HEAD` distant, `docs/DEVELOPMENT_LOG.md`, les fichiers et les commits récents.
2. Ne pas refaire une fonctionnalité déjà réalisée ou un test déjà validé. Un défaut nouveau dans un module existant doit être décrit comme une régression **distincte**.
3. Choisir en priorité les changements **S** (petits, indépendants et réversibles), puis **M** (moyens). Conserver les changements **L** ou risqués pour la fin, après revue.
4. Un lot est **VALIDÉ** uniquement lorsque la CI des **11 jobs** est terminée, réussie et rattachée au `HEAD` exact. Ignorer tout SHA obsolète, run annulé ou encore en cours.
5. Traiter un lot à la fois sur la même branche pour ne pas annuler les vérifications du précédent. Ne jamais fusionner `main`, déployer, utiliser de vraies données patients ou engager une dépense sans autorisation explicite.

## Lots terminés et vérifiés

| ID | Taille | Lot effectué | Commit final | CI GitHub Actions | Statut |
| --- | --- | --- | --- | --- | --- |
| QW-001 | S | Éviter le rappel d'histoire lorsque l'interrogatoire ciblé contient des réponses | `7d5b656` | [43029297289](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43029297289) : 11/11 réussis | VALIDÉ |
| QW-002 | S | Interpréter la tension au format numérique avec `mmHg` / `mm Hg` | `cd920dc` | [43029745419](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43029745419) : 11/11 réussis | VALIDÉ |
| QW-003 | S | Limiter « ex soudain » à l'occurrence ORL et préserver les autres phrases | SHA du lot à vérifier | Contrôle des 11 jobs requis sur HEAD | EN VALIDATION |

Les corrections de l'inventaire antérieures à ces deux lots se trouvent déjà dans `docs/DEVELOPMENT_LOG.md`. Ne pas les ajouter comme « tâches à refaire ».

## File de travail proposée (non commencée)

| Priorité | ID | Taille estimative | Objectif précis | Critère de clôture |
| --- | --- | --- | --- | --- |
| 1 | QW-004 | S | Vérifier les formulaires de consultation pour les rappels redondants restants, hors QW-001 | Nouveau défaut reproduit puis test de régression |
| 3 | QW-005 | M | Contrôler l'accessibilité et le parcours de lecture vocale ponctuelle | UI fonctionnelle, tests et accord explicite pour données sensibles |
| 4 | QW-006 | M — intervention utilisateur | Tester permissions microphone, reprise et interruption sur Chrome Android | Essais manuels documentés avec données fictives |
| 5 | QW-007 | L — bloquant production | Revoir les contrôles d'authentification/autorisation des vraies routes cliniques et l'exposition réseau | Tests d'intégration 401/403 réels + revue de sécurité |
| 6 | QW-008 | L — bloquant production | Revoir conformité/confidentialité du flux de données vers les fournisseurs IA | Décision documentée et vérifiée avant données réelles |

**Ces propositions ne certifient ni l'absence d'autres défauts ni une autorisation de mise en production.** Réévaluer la taille à la lecture du code ; ne pas commencer une tâche si elle est déjà couverte par un commit récent.

## Bilan de la session

- Deux petites corrections fonctionnelles **validées** : QW-001 et QW-002.
- **14 nouveaux cas de tests fonctionnels** (6 + 8) dans le moteur clinique.
- Aucun nouveau fournisseur, abonnement, endpoint réseau ou déploiement.
- Le présent tableau de suivi est un lot documentaire distinct, à valider par sa propre CI.
