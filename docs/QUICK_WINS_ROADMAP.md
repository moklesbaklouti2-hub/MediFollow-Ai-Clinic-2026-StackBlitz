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
| QW-003 | S | Limiter « ex soudain » à l'occurrence ORL et préserver les autres phrases | `19fdebc` | [43031459300](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43031459300) : 11/11 réussis | VALIDÉ |
| QW-004 | S | Vider l'interrogatoire ciblé après la sauvegarde, sans perdre les réponses si échec | `5599f56` | [43031944830](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43031944830) : 11/11 réussis | VALIDÉ |
| QW-005 | M | Lecture ponctuelle confirmée et fermeture silencieuse de l'Orb | `b4805ab` | [43032937029](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43032937029) : 11/11 réussis | VALIDÉ |
| QW-006A | S | Bloquer toute commande vocale résiduelle après erreur de reconnaissance | `d9a7c52` | [43033964358](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43033964358) : 11/11 réussis | VALIDÉ |
| QW-006C | S | Empêcher la lecture d'une réponse IA arrivée après fermeture ou réouverture de l'Orb | `513d9dc` | [43035037173](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43035037173) : 11/11 réussis | VALIDÉ |
| QW-009 | S | Reconnaître les pluriels de douleur thoracique et leurs négations | `b826fa3` | [43036062298](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43036062298) : 11/11 réussis | VALIDÉ |
| QW-010 | S | Ne pas masquer les antécédents manquants par des rubriques vides et intégrer le contexte gynéco-obstétrical | `d87032e` | [43036660236](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43036660236) : 11/11 réussis | VALIDÉ |
| QW-011 | S | Refuser retour/annulation sur identifiant de lot ambigu après import | `52eed62` | [43038818380](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43038818380) : 11/11 réussis | VALIDÉ |
| QW-012 | S | Rejeter sans exception les requêtes de retour/annulation mal formées | `fe6a516` | [43039835513](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43039835513) : 11/11 réussis | VALIDÉ |
| QW-013 | S | Désactiver la mise en cache des réponses des trois routes cliniques, succès et erreur | `6603fe6` | [43043178304](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43043178304) : 11/11 réussis | VALIDÉ |
| QW-014 | S | Refuser les JSON non textuels dans les messages de chat et commandes vocales | `6ca700d` | [43044403101](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43044403101) : 11/11 réussis | VALIDÉ |
| QW-015 | S | Empêcher tout démarrage du serveur en production sans mode d'accès distant explicitement validé | `95f0568` | [43046896275](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43046896275) : 11/11 réussis | VALIDÉ |
| QW-016 | S | Refuser les messages chat de plus de 12 000 caractères avant fournisseur IA | `af94893` | [43047596054](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43047596054) : 11/11 réussis | VALIDÉ |
| QW-017 | S | Appliquer les en-têtes anti-cache même aux erreurs de parsing JSON 400/413 | `3287db6` | [43049245293](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43049245293) : 11/11 réussis | VALIDÉ |
| QW-018 | S | Ne pas exposer les fragments de corps JSON ni les détails de parseur dans les erreurs 400/413 | `574f54f` | [43049887780](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43049887780) : 11/11 réussis | VALIDÉ |
| QW-019 | S | Journaliser uniquement opération et statut des erreurs IA, jamais le contenu brut | `f49abdb` | [43050970258](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43050970258) : 11/11 réussis | VALIDÉ |
| QW-020 | S | Filtrer la page courante des commandes vocales avant l'appel IA | SHA à vérifier | 19 contrôles fictifs + CI 11/11 | EN VALIDATION |

Les corrections de l'inventaire antérieures à ces deux lots se trouvent déjà dans `docs/DEVELOPMENT_LOG.md`. Ne pas les ajouter comme « tâches à refaire ».

## File de travail proposée (non commencée)

| Priorité | ID | Taille estimative | Objectif précis | Critère de clôture |
| --- | --- | --- | --- | --- |

| 1 | QW-006B | M — intervention utilisateur | Vérifier sur Chrome Android : refus/autorisation micro, réseau, interruption, reprise volontaire et absence de boucle | Essais manuels avec données fictives indispensables ; ne pas marquer validé sans vérification |
| 2 | QW-007 | L — bloquant production | Revoir les contrôles d'authentification/autorisation des vraies routes cliniques et l'exposition réseau | Tests d'intégration 401/403 réels + revue de sécurité |
| 3 | QW-008 | L — bloquant production | Revoir conformité/confidentialité du flux de données vers les fournisseurs IA | Décision documentée et vérifiée avant données réelles |

**Ces propositions ne certifient ni l'absence d'autres défauts ni une autorisation de mise en production.** Réévaluer la taille à la lecture du code ; ne pas commencer une tâche si elle est déjà couverte par un commit récent.

## Bilan de la session

- Historique des lots confirmés dans la table ci-dessus. Prochain lot : QW-009, formes plurielles thoraciques.
- Pour les totaux de tests, compter chaque lot indépendamment ; n'inclure que les jobs et SHA vérifiés.
- Aucun nouveau fournisseur, abonnement, endpoint réseau ou déploiement.
- Le présent tableau de suivi est un lot documentaire distinct, à valider par sa propre CI.
