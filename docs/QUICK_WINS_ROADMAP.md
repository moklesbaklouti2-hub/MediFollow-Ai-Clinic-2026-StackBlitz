# MediFollow AI — tableau de productivité et lots anti-doublons

**Dernière vérification :** 11 novembre 2026 · **Branche de travail :** `audit-stabilisation-2026-11-10` · **PR #2 :** brouillon, non fusionnée.

## Règle d'exécution

1. Vérifier le `HEAD` distant, `docs/DEVELOPMENT_LOG.md`, les fichiers et les commits récents.
2. Ne pas refaire une fonctionnalité déjà réalisée ou un test déjà validé. Un défaut nouveau dans un module existant doit être décrit comme une régression **distincte**.
3. Choisir en priorité les changements **S** (petits, indépendants et réversibles), puis **M** (moyens). Conserver les changements **L** ou risqués pour la fin, après revue.
4. Un lot est **VALIDÉ** uniquement lorsque la CI des **11 jobs** est terminée, réussie et rattachée au `HEAD` exact. Ignorer tout SHA obsolète, run annulé ou encore en cours.
5. Traiter un lot à la fois sur la même branche pour ne pas annuler les vérifications du précédent. Ne jamais fusionner `main`, déployer, utiliser de vraies données patients ou engager une dépense sans autorisation explicite.

## Orientation cabinet médical — décision du 13 novembre 2026

**Priorité confirmée :** MediFollow AI sert d'abord un cabinet de médecine de famille, et non une pharmacie. Les prochains lots rapides se concentrent sur le dossier médical, la consultation structurée, la continuité du suivi (notamment gériatrie, pédiatrie, prévention et maladies chroniques), HELIOS, la dictée médicale, les ordonnances/examens comme documents et l'ergonomie clinique.

La gestion du stock reste un module secondaire pour les consommables, médicaments utilisés ponctuellement et matériel du cabinet. **Ne pas lancer de nouveaux lots courants consacrés à la délivrance de médicaments** ; n'y revenir que pour une anomalie critique de sécurité, une régression bloquante ou une demande explicite de l'utilisateur.

**Ordre de traitement :** (1) petites corrections cliniques réellement distinctes et sécurisation dossier/consultation, (2) parcours de suivi et prévention, (3) qualité du copilote médical/voix et ergonomie, (4) fonctionnalités plus lourdes après tests. Tous les changements restent préparés sur la branche dédiée, sans patient réel, dépenses, déploiement ni fusion de `main`.

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
| QW-020 | S | Filtrer la page courante des commandes vocales avant l'appel IA | `d0cd56e` | [43051564614](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43051564614) : 11/11 réussis | VALIDÉ |
| QW-021 | S | Refuser les contextes de chat non-objets, plutôt que les ignorer silencieusement | `321e8bd` | [43062353490](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43062353490) : 11/11 réussis | VALIDÉ |
| QW-022 | S | Refuser les historiques de chat mal typés au lieu de les ignorer | `aa05e29` | [43063926576](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43063926576) : 11/11 réussis | VALIDÉ |
| QW-023 | S | Refuser les messages mal formés à l'intérieur d'un historique de chat | `905e686` | [43064903608](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43064903608) : 11/11 réussis | VALIDÉ |
| QW-024 | S | Ne jamais associer automatiquement un ancien document au premier patient homonyme | `0fbf120` | [43066257633](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43066257633) : 11/11 réussis | VALIDÉ |
| QW-025 | S | Afficher sur le Dashboard le nombre de documents non reliés à un patient confirmé | `ef6b280` | [43066907748](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43066907748) : 11/11 réussis | VALIDÉ |
| QW-026 | S | Empêcher la suppression d'un article référencé par un mouvement ou une ordonnance | `5e33a6c` | [43067615083](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43067615083) : 11/11 réussis | VALIDÉ |
| QW-027 | S | Préparer une validation finale unique et séparer le travail automatisable des tests utilisateur | `2bc52a2` | [43068444582](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43068444582) : 11/11 réussis | VALIDÉ |
| QW-028 | M | HELIOS Follow-up : suivi saisi, enregistré et échéances sur le Dashboard | `c3d8005` | [43070138253](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43070138253) : 11/11 réussis | VALIDÉ |
| QW-029 | S | HELIOS Follow-up : liste des contrôles à revoir, triée, sans confondre les patients | `ec4c87c` | [43070798343](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43070798343) : 11/11 réussis | VALIDÉ |
| QW-030 | S | HELIOS Follow-up : clôture confirmée et sécurisée d'un contrôle depuis la liste | `980fb01` | [43071549570](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43071549570) : 11/11 réussis | VALIDÉ |
| QW-031 | S | Refuser la sauvegarde des consultations/ordonnances sans identifiant patient unique et existant | `945ddb5` | [43072162714](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43072162714) : 11/11 réussis | VALIDÉ |
| QW-032 | S | HELIOS Follow-up : bloquer les actions rapides si l'identifiant patient n'est pas unique | `8900254` | [43074071020](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43074071020) : 11/11 réussis | VALIDÉ |
| QW-033 | S | Refuser l'ouverture du dossier patient détaillé si identifiant absent ou dupliqué | `1e7fbbb` | [43074639442](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43074639442) : 11/11 réussis | VALIDÉ |
| QW-034 | S | Associer chaque dernière constante à la date de sa propre consultation | `4b2c254` | [43075351256](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43075351256) : 11/11 réussis | VALIDÉ |
| QW-035 | M | HELIOS Clinical Memory : aperçu local des allergies, traitements déclarés et diagnostics documentés | `71ef53a` | [43076444812](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43076444812) : 11/11 réussis | VALIDÉ |
| QW-036 | S | HELIOS Clinical Memory : montrer séparément les antécédents médicaux, chirurgicaux et familiaux déclarés | `4e09894` | [43077404223](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43077404223) : 11/11 réussis | VALIDÉ |
| QW-037 | M | HELIOS Trends : comparaison brute des deux dernières valeurs datées, par constante | `f77660c` | [43078179664](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43078179664) : 11/11 réussis | VALIDÉ |
| QW-038 | S | HELIOS Prevention : aide-mémoire documentaire non prescriptif, limité au dossier confirmé | `9a8d09a` | [43079491902](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43079491902) : 11/11 réussis | VALIDÉ |
| QW-039 | S | HELIOS Referral : aperçu documentaire de la dernière consultation datée, sans décision ni transmission | `6c88021` | [43080135951](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43080135951) : 11/11 réussis | VALIDÉ |
| QW-040 | S | HELIOS Document Reader : texte fictif collé, aperçu local temporaire, sans analyse ni sauvegarde | `56fac16` | [43080614809](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43080614809) : 11/11 réussis | VALIDÉ |
| QW-041 | S | HELIOS Medical Academy : répertoire de liens institutionnels sans synthèse clinique | `0fa50a0` | [43081138047](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43081138047) : 11/11 réussis | VALIDÉ |
| QW-042 | S | HELIOS Consultation Express : répartir une note fictive strictement étiquetée vers le formulaire existant, sans sauvegarde auto | `09774f5` | [43082144977](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43082144977) : 11/11 réussis | VALIDÉ |
| QW-043 | S | Consultation Express : réinitialisation confirmée et désactivation IA lors d'un changement de patient | `be4415e` | [43082689433](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43082689433) : 11/11 réussis | VALIDÉ |
| QW-044 | S | HELIOS Parcours spécialisés : regroupement documentaire des consultations par spécialité, par patient | `7999281` | [43083698062](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43083698062) : 11/11 réussis | VALIDÉ |
| QW-045 | S | Statistiques descriptives Dashboard : spécialités et motifs saisis, uniquement dossiers confirmés | `896845e` (code), régression `737c4f3` | [43099912726](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43099912726) : 11/11 réussis + tests locaux | VALIDÉ (régression) |
| QW-046 | S | Dossier médical unifié : chronologie datée robuste et spécialité consignée | `737c4f3` | [43099912726](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43099912726) : 11/11 réussis + tests locaux | VALIDÉ |
| QW-047 | S | Chronologie des ordonnances : affichage des analyses, imagerie et autres éléments consignés | `6624f2b` | [43101047632](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43101047632) : V2 11/11 réussis | VALIDÉ |
| QW-048 | S | Chronologie : rendre explicite le statut d'une ordonnance, notamment brouillon ou annulée | `7d8dcdd` | CI [43102108140](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/actions/runs/43102108140) incomplète ; nouveau test groupé requis | EN VALIDATION |
| QW-049 | S | Chronologie du dossier patient : filtre local consultations / ordonnances sans altérer les dossiers | `9eca29e` (préparation) | Groupe QW-049–051 : V2 11/11 + tests Codespaces requis | EN VALIDATION GROUPÉE |
| QW-050 | S | Recherche locale dans la chronologie par motif, spécialité, médicament ou examen, sans IA externe | `7ef8eae` (préparation) | Groupe QW-049–051 : V2 11/11 + tests Codespaces requis | EN VALIDATION GROUPÉE |
| QW-051 | S | Filtre local des ordonnances par statut (annulée, brouillon, inconnue, etc.) | `e7927a5` (préparation) | Groupe QW-049–051 : V2 11/11 + tests Codespaces requis | EN VALIDATION GROUPÉE |

| QW-052 | S | Filtre de chronologie par date début/fin, bornes inclusives et dates invalides explicites | branche de préparation | Tests locaux QW-048–055 requis, CI sur intégration audit | PRÉPARÉ NON VALIDÉ |
| QW-053 | S | Filtrer les consultations par spécialité réellement consignée, y compris « non renseignée » | branche de préparation | Test du tri, des dossiers confirmés et du reset de filtre | PRÉPARÉ NON VALIDÉ |
| QW-054 | S | Afficher 10/25/50 événements ou la totalité de la chronologie, sans perte de données | branche de préparation | Tests de limites, compteurs et non-mutation | PRÉPARÉ NON VALIDÉ |
| QW-055 | S | Réinitialiser tous les filtres de chronologie au changement de patient ou par bouton | branche de préparation | Tests UI de remise à zéro, dossiers fictifs croisés | PRÉPARÉ NON VALIDÉ |
| QW-056 | S | Compteurs de complétude documentaire de la chronologie (dates, spécialités, statuts) | branche de préparation | Test de source par dossier, non-inférence et immutabilité | PRÉPARÉ NON VALIDÉ |

| QW-057 | S | Indicateur local du nombre de filtres actifs de la chronologie | branche de préparation (`2dc3766`) | Contrat synthétique et essai UI fictif | PRÉPARÉ NON VALIDÉ |
| QW-058 | S | Annonce accessible et non intrusive du nombre de résultats de chronologie après filtrage | branche de préparation | Test synthétique + lecteur écran et navigation clavier à la validation finale | PRÉPARÉ NON VALIDÉ |

| QW-059 | S | Expliquer une période inversée et associer le message aux deux champs de date | branche de préparation | Contrat synthétique et essai des dates inversées | PRÉPARÉ NON VALIDÉ |

| QW-060 | S | Inclure les contrats UI QW-057–059 dans la campagne complète hors ligne | branche de préparation | Contrat de câblage et test:complete requis | PRÉPARÉ NON VALIDÉ |

| QW-061 | S | Accès direct à tous les résultats correspondants lorsque la limite masque des événements | branche de préparation | Contrat synthétique et essai fictif avec filtres conservés | PRÉPARÉ NON VALIDÉ |

| QW-062 | S | Expliquer le périmètre et le caractère local de la recherche chronologique, avec aide accessible | branche de préparation | Contrat synthétique et essai fictif de recherche | PRÉPARÉ NON VALIDÉ |
| QW-063 | S | Chronologie ascendante ou descendante ; dates inconnues toujours en dernier | branche de préparation | Test synthétique de tri, immutabilité et contrat UI ; Codespaces requis | PRÉPARÉ NON VALIDÉ |
| QW-064 | S | Visualiser seulement les événements aux dates manquantes ou invalides | branche de préparation | Tests fictifs, remise à zéro et absence d'écriture ; Codespaces requis | PRÉPARÉ NON VALIDÉ |
| QW-065 | S | Repérer les événements avec champs documentaires incomplets (dates, spécialités, statuts) | branche de préparation | Cohérence avec compteurs QW-056, tests fictifs et absence d'écriture | PRÉPARÉ NON VALIDÉ |
| QW-066 | S | Filtrer les ordonnances par catégorie d'élément consigné, anciens traitements inclus | branche de préparation | Test fictif 4 catégories ; aucun acte considéré effectué, aucune écriture | PRÉPARÉ NON VALIDÉ |
| QW-067 | S | Mettre à jour les contrats automatisés QW-057–061 après l'ajout des nouveaux filtres | branche de préparation | Vérifier source et exécuter la suite `test:complete` sur Codespaces | PRÉPARÉ NON VALIDÉ |
| QW-068 | S | Test d'intégration pure des filtres, tri et pagination avec deux patients fictifs | branche de préparation | `npm run test:timeline-composition` inclus dans `test:complete` ; Codespaces requis | PRÉPARÉ NON VALIDÉ |
| QW-069 | S | Éviter le tri redondant des documents de base lors des saisies et changements de filtres UI | branche de préparation | Contrat source useMemo et compilation/test réel Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-070 | S | HELIOS Follow-up : signaler les contrôles planifiés exclus des échéances faute de date valide | branche de préparation | Tests fictifs et contrat Dashboard ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-071 | S | HELIOS Follow-up : compter séparément les contrôles valides au-delà de 7 jours | branche de préparation | Test synthétique bornes inclusives et contrat Dashboard ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-072 | S | HELIOS Follow-up : liste des plans datés incorrectement, ouverture uniquement sur identité unique confirmée | branche de préparation | Cas fictifs, non-mutation et contrat UI sans clôture ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-073 | S | HELIOS Follow-up : liste repliable des suivis futurs au-delà de 7 jours, avec identité patient confirmée | branche de préparation | Tri fictif, bornes et non-mutation, contrat UI ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-074 | S | Vérifier la cohérence des compteurs et listes HELIOS Follow-up sur tous les horizons, y compris changement d’année | branche de préparation | Test fictif de partition, non-mutation et concordance ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-075 | S | Recherche locale des objectifs consignés dans les trois listes HELIOS Follow-up, insensible aux accents | branche de préparation | Tests synthétiques, zéro mutation, recherche UI Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-076 | S | Refuser toute modification de consultation si son identifiant est absent ou dupliqué après import | branche de préparation | Tests synthétiques et contrat du hook de stockage ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-077 | S | Refuser la suppression de consultations pour un identifiant absent ou dupliqué après import | branche de préparation | Tests synthétiques et contrat du hook ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-078 | S | Refuser l'ouverture d'un formulaire et la clôture rapide d'un suivi lorsque la consultation est ambiguë ou le patient non confirmé | branche de préparation | Contrats des actions UI et test manuel fictif Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-079 | S | Bloquer la sauvegarde d'une consultation déjà ouverte si l'identifiant est devenu ambigu ou si le patient sélectionné diffère de celui consigné | branche de préparation | Contrat synthétique et validation UI Codespaces requise | PRÉPARÉ NON VALIDÉ |

| QW-080 | S | Refuser les modifications d'ordonnance lorsque son identifiant est absent ou dupliqué après import | branche de préparation | Test synthétique et contrat du hook ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-081 | S | Refuser toute suppression d'ordonnance lorsque son identifiant est absent ou dupliqué après import | branche de préparation | Test fictif et contrat du hook ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-082 | S | Bloquer toute modification de dossier patient lorsque son identifiant est absent ou dupliqué après import | branche de préparation | Tests fictifs et contrat du hook ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-083 | S | Empêcher la suppression de plusieurs dossiers patients portant le même identifiant après import, avant toute écriture en corbeille | branche de préparation | Contrat et données fictives ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-084 | S | Bloquer la restauration depuis une corbeille contenant plusieurs dossiers avec le même identifiant | branche de préparation | Test fictif et contrat de la restauration ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-085 | S | Vérifier l'identifiant patient unique au point central de création d'une consultation, pas seulement dans le formulaire | branche de préparation | Contrat et cas fictifs ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-086 | S | Vérifier l'identifiant patient unique avant toute création d'ordonnance depuis le hook central, quelle que soit l'interface | branche de préparation | Contrat du hook et cas fictifs ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-087 | S | Préserver les ordonnances référencées par un mouvement de stock, même si le statut importé est absent ou ancien | branche de préparation | Tests fictifs, trace non mutée et contrat hook ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-088 | S | Afficher explicitement le refus de suppression d'ordonnance lorsque le stockage ou la traçabilité bloque l'action | branche de préparation | Contrat d'interface et essai fictif Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-089 | S | Empêcher qu'une modification d'ordonnance ou une préparation de délivrance réattribue silencieusement l'ordonnance à un autre patient | branche de préparation | Tests fictifs et contrat central ; Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-090 | S | Refuser toute délivrance si l'ordonnance enregistrée est dupliquée ou liée à un patient différent de la sélection confirmée | branche de préparation | Contrat UI et scénario fictif de stock Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-091 | S | Vérifier l'ordonnance actuelle et l'identité patient avant toute annulation avec réintégration de stock | branche de préparation | Tests fictifs et contrat avant mouvement ; Codespaces requis | PRÉPARÉ NON VALIDÉ |
| QW-092 | S | Empêcher les retours partiels de stock sur mouvement ou ordonnance ambiguë, patient différent ou statut obsolète | branche de préparation | Contrat source QW-092 et essais fictifs Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-093 | S | Refuser l'ouverture d'une ordonnance ambiguë ou déplacée vers un autre patient ; charger uniquement sa version courante | branche de préparation | Contrat UI et tests fictifs Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-094 | S | Protéger au point central les ordonnances annulées ou délivrées contre toute suppression, même sans journal de stock | branche de préparation | Contrat du hook, tests de données fictives et CI requise | PRÉPARÉ NON VALIDÉ |

| QW-095 | S | Bloquer la délivrance et la déduction de stock si le statut enregistré d'une ordonnance est déjà « annulée » | branche de préparation | Contrat source, test fictif et CI Codespaces requis | PRÉPARÉ NON VALIDÉ |

| QW-096 | S | Refuser une sauvegarde d'édition obsolète sur ordonnance annulée/délivrée ou patient réattribué | branche de préparation | Contrat source, test fictif Codespaces et CI requis | PRÉPARÉ NON VALIDÉ |

| QW-097 | S | Verrouiller les modifications d'ordonnances finalisées au hook central ; autoriser uniquement la transition documentaire de délivrée à annulée | branche de préparation | Tests fictifs et validation de l'exception d'annulation en CI nécessaires | PRÉPARÉ NON VALIDÉ |

| QW-098 | S | Exiger des mouvements de retour complets, non ambigus et du même patient avant de passer une ordonnance délivrée à « annulée » | branche de préparation | Tests fictifs de mouvements et validation Codespaces/CI requises | PRÉPARÉ NON VALIDÉ |

| QW-099 | S | Refuser la suppression d'une ordonnance dont le statut importé est explicitement inconnu ; conserver les dossiers historiques | branche de préparation | Tests fictifs, compilation et CI requises | PRÉPARÉ NON VALIDÉ |

| QW-100 | S | Autoriser la délivrance seulement sur statut courant explicite « brouillon » ou « validée », jamais sur statut importé inconnu/absent | branche de préparation | Tests fictifs et validation Codespaces/CI sur SHA final | PRÉPARÉ NON VALIDÉ |

| QW-101 | S | Afficher fidèlement le statut documentaire des ordonnances dans l'historique, sans assimiler « validée » ou « inconnue » à un brouillon | branche de préparation | Contrat UI et tests Codespaces/CI requis | PRÉPARÉ NON VALIDÉ |

| QW-102 | S | Empêcher le statut « délivrée » sans trace de stock liée à la bonne ordonnance et au bon patient, avec mouvements uniques et quantités valides | branche de préparation | Tests fictifs et CI sur SHA final requis | PRÉPARÉ NON VALIDÉ |

| QW-103 | S | Refuser l'annulation d'une ordonnance affichée non délivrée lorsque des mouvements de stock liés existent (statut obsolète après écriture échouée) | branche de préparation | Tests fictifs, compilation et CI sur le SHA exact requis | PRÉPARÉ NON VALIDÉ |

| QW-104 | S | Verrouiller toute réécriture du contenu d'une ordonnance dès qu'un mouvement de stock existe, malgré un statut brouillon obsolète ; permettre seulement sa finalisation documentaire contrôlée | branche de préparation | Tests fictifs, compilation et CI 11/11 requis | PRÉPARÉ NON VALIDÉ |

| QW-105 | S | Refuser la création via le hook d'une ordonnance déjà déclarée délivrée/annulée, sans statut valide ou avec horodatage final fictif | branche de préparation | Tests fictifs, compilation et CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |

| QW-106 | S | Rendre immutable la date initiale d'une ordonnance et refuser les horodatages de délivrance/annulation détachés du changement de statut | branche de préparation | Tests fictifs, compilation et CI 11/11 sur SHA exact requis | PRÉPARÉ NON VALIDÉ |

| QW-107 | S | Interdire le retour du statut « validée » vers « brouillon » et la reclassification implicite de statuts importés inconnus | branche de préparation | Contrat de transitions et tests fictifs Codespaces/CI requis | PRÉPARÉ NON VALIDÉ |

| QW-108 | S | Exiger l'horodatage validatedAt lors du passage d'une ordonnance existante de « brouillon » à « validée », pour conserver sa traçabilité | branche de préparation | Tests synthétiques, compilation et CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |

| QW-109 | S | Exiger un validatedAt ISO pour toute ordonnance créée directement « validée » et refuser un horodatage de validation prématuré sur un brouillon | branche de préparation | Contrats fictifs, compilation et CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |

| QW-110 | S | Afficher un refus explicite et demander la réconciliation avant toute nouvelle délivrance si l'ordonnance non finalisée possède déjà des mouvements de stock | branche de préparation | Tests fictifs, compilation et CI 11/11 sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-111 | S | Refuser immédiatement l'annulation d'une ordonnance au statut absent ou inconnu avant confirmation et traitement du stock | branche de préparation | Contrats fictifs, compilation et CI exacte à valider | PRÉPARÉ NON VALIDÉ |

| QW-112 | S | Distinguer en lecture seule les statuts d'ordonnance absents (dossiers anciens) des valeurs importées inconnues ou invalides | branche de préparation | Tests fictifs, compilation et CI exacte requis | PRÉPARÉ NON VALIDÉ |

| QW-113 | S | Refuser la création d'une ordonnance dont le nouvel identifiant existe déjà dans les ordonnances ou les traces de stock importées | branche de préparation | Tests fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-114 | S | Refuser toute modification de contenu sur une ordonnance importée au statut absent ou inconnu, dans le hook et le formulaire, sans affecter les transitions finalisées autorisées | branche de préparation | Tests fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-115 | S | Expliquer immédiatement le refus de modification d'une ordonnance avec mouvements de stock déjà enregistrés, avant toute sauvegarde de l'ancien formulaire | branche de préparation | Tests fictifs, compilation et CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |

| QW-116 | M | Vérifier au niveau du service de stock qu'une délivrance vise une ordonnance unique, un patient confirmé, le bon lien patient et un statut autorisé, sans casser le rejeu idempotent | branche de préparation | Tests de délivrance fictive, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-117 | S | Refuser une nouvelle délivrance si des retours ou autres mouvements orphelins sont déjà liés à l'ordonnance sans trace de délivrance d'origine ; conserver le rejeu idempotent | branche de préparation | Tests stock fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-118 | S | Sécuriser la modification centrale des consultations : garder l'association au patient confirmé et refuser les réaffectations silencieuses via le hook | branche de préparation | Tests cliniques fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-119 | S | Rendre immuable la date de création d'une consultation et réserver sa date technique de modification au hook central, sans bloquer l'édition clinique ordinaire | branche de préparation | Tests fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-120 | S | Refuser au niveau des créations et modifications de consultations les suivis HELIOS à date invalide, statut inconnu ou objectif trop long, sans altérer les dossiers sans suivi | branche de préparation | Tests de suivi fictifs, compilation et CI 11/11 sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-121 | S | Refuser la création d'une consultation si le nouvel identifiant est déjà présent dans l'historique clinique ou une sauvegarde importée ; préserver les dossiers existants | branche de préparation | Tests cliniques fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-122 | S | Vérifier au niveau du hook la présence d'un motif et d'une spécialité avant toute création de consultation, sans imposer la règle aux anciens dossiers | branche de préparation | Tests de consultations fictives, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-123 | S | Harmoniser la clôture HELIOS avec la validation centrale des plans | branche de préparation | Tests fictifs et CI requis | PRÉPARÉ NON VALIDÉ |

| QW-124 | S | Refuser les dates cliniques impossibles ou ambiguës à la création d'une consultation et lors d'une correction explicite, avec le validateur partagé de la chronologie, sans bloquer les anciens dossiers autrement modifiés | branche de préparation | Tests fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-125 | S | Empêcher qu'une ancienne ligne de suivi HELIOS marque terminé un contrôle dont la date, l'objectif ou le statut ont changé ; vérifier à nouveau après confirmation | branche de préparation | Tests fictifs, compilation et 11 jobs CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-126 | S | Refuser l'enregistrement d'une consultation éditée depuis une ancienne version lorsque ses champs cliniques ont changé ailleurs, sans effacer la saisie non sauvegardée | branche de préparation | Tests de régression fictifs, compilation et CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-127 | S | Éviter l'écrasement d'une consultation modifiée après le contrôle du formulaire en comparant aussi sa version clinique au niveau du hook central | branche de préparation | Tests fictifs, compilation et CI 11/11 sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |

| QW-128 | S | Transmettre au hook central la version clinique revérifiée avant de marquer un suivi HELIOS terminé, afin de refuser un changement intervenu entre la confirmation et la sauvegarde | branche de préparation | Tests de suivi fictifs, compilation et 11 jobs CI sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |
| QW-129 | S | Refuser la clôture HELIOS depuis une liste obsolète si un champ clinique a changé depuis son affichage, avant et après confirmation, même avec un plan de suivi identique | branche de préparation | Tests fictifs, compilation et CI 11/11 sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |
| QW-130 | S | Exiger une version clinique attendue pour tout enregistrement d'un suivi HELIOS « Terminé », y compris les appels directs au hook, sans bloquer les autres modifications | branche de préparation | Tests fictifs, compilation et CI 11/11 sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |
| QW-131 | S | Réparer le contrat de test QW-079 devenu obsolète après l'ajout du contrôle de version clinique QW-127 ; vérifier que le formulaire conserve l'appel sécurisé à trois arguments et la validation du patient avant écriture | branche de préparation | Vérification statique ciblée conforme ; exécution TS/Codespaces et CI 11/11 sur HEAD exact requises | PRÉPARÉ NON VALIDÉ |
| QW-132 | S | Éviter d'afficher comme « Contrôle prévu » un suivi HELIOS importé dont le statut est absent ou inconnu ; afficher explicitement « Statut de suivi à vérifier » dans l'historique sans altérer le dossier | branche de préparation | Tests fictifs, compilation et CI 11/11 sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |
| QW-133 | S | Afficher explicitement « Date de suivi à vérifier » dans l'historique HELIOS si la date d'un plan ancien/importé est absente ou invalide, sans écriture ni déduction d'échéance | branche de préparation | Tests fictifs, compilation et CI 11/11 sur HEAD exact requis | PRÉPARÉ NON VALIDÉ |
| QW-134 | S | Dans l’historique des consultations, ne plus afficher une identité patient non confirmée à partir d’un nom importé ou d’un premier identifiant dupliqué ; masquer l’action Modifier si patient ou consultation ambigu | branche de préparation | Tests fictifs et contrat UI ajoutés ; compilation, tests et CI 11/11 sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-135 | S | Réutiliser les validateurs de chronologie existants pour afficher et trier les dates des consultations : dates importées invalides visibles après les dates fiables et sans date inventée | branche de préparation | Tests fictifs de tri/affichage ajoutés ; compilation, tests et CI 11/11 sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-136 | S | Dans l'historique HELIOS, afficher les objectifs de suivi importés uniquement s'ils sont des textes de 500 caractères au maximum ; signaler les valeurs absentes, non textuelles ou excessives sans conversion ni écriture | branche de préparation | Tests fictifs et contrat d'affichage ajoutés ; compilation et CI 11/11 sur HEAD exact requises | PRÉPARÉ NON VALIDÉ |
| QW-137 | S | Réutiliser la protection des objectifs HELIOS importés dans les trois listes de suivi (à revoir, dates à corriger, au-delà de 7 jours) afin de ne pas rendre directement les objets, tableaux ou textes excessifs | branche de préparation | Tests fictifs et contrat des trois listes ajoutés ; compilation et CI 11/11 sur HEAD exact requises | PRÉPARÉ NON VALIDÉ |
| QW-138 | S | Dans les trois listes de suivi HELIOS, ne proposer ni ouverture ni clôture lorsque l'identifiant de consultation est absent ou dupliqué ; laisser la ligne visible pour revue et signaler le conflit sans modifier le dossier | branche de préparation | Tests fictifs, contrat des trois listes ; compilation et CI 11/11 sur HEAD exact requises | PRÉPARÉ NON VALIDÉ |
| QW-139 | S | Ne proposer la clôture rapide dans les contrôles HELIOS à revoir que si le plan importé est valide (objectif textuel de taille autorisée), tout en permettant son ouverture pour correction | branche de préparation | Tests fictifs ciblés ajoutés ; compilation et CI 11/11 sur SHA exact requises | PRÉPARÉ NON VALIDÉ |
| QW-140 | S | Signaler séparément les statuts de suivi HELIOS importés absents ou inconnus, en lecture seule, sans inférer contrôle, échéance ni urgence | branche de préparation | Tests fictifs de sélection et contrat de liste ajoutés ; compilation/CI sur SHA exact requises | PRÉPARÉ NON VALIDÉ |
| QW-141 | S | Identifier l'origine de chaque contrôle HELIOS dans les trois listes en affichant la date de consultation validée et le motif documenté | branche de préparation | Contrats d'affichage fictifs ajoutés ; compilation/CI sur SHA exact requises | PRÉPARÉ NON VALIDÉ |
| QW-142 | S | Distinguer suivis en retard, aujourd'hui et à venir par date civile valide sans conclure à une urgence | branche de préparation | Tests fictifs ; build et CI 11/11 requis | PRÉPARÉ NON VALIDÉ |
| QW-143 | S | Distinguer les clés React des consultations importées aux ID dupliqués dans les cinq listes HELIOS/historique, sans mutation des dossiers | branche de préparation | Contrats UI fictifs ; build/CI requis | PRÉPARÉ NON VALIDÉ |
| QW-144 | S | Afficher la spécialité source dans les quatre listes HELIOS et protéger l'historique des spécialités importées non textuelles | branche de préparation | Tests fictifs ; build/CI requis | PRÉPARÉ NON VALIDÉ |
| QW-145 | S | Bloquer l'ouverture d'une consultation dont le suivi importé a un statut absent ou inconnu afin d'éviter sa reclassification implicite lors d'une édition clinique sans rapport | branche de préparation | Tests fictifs et garde-fou formulaire ; build et CI 11/11 requis | PRÉPARÉ NON VALIDÉ |
| QW-146 | S | Charger uniquement des dates civiles valides dans l'éditeur de suivi, avec confirmation explicite avant correction d'une date importée invalide | branche de préparation | Tests fictifs, contrat de consentement ; build/CI requis | PRÉPARÉ NON VALIDÉ |
| QW-147 | S | Charger uniquement un objectif textuel de 500 caractères au plus dans l'éditeur et demander confirmation avant remplacement d'une valeur importée malformée | branche de préparation | Tests fictifs, contrat de consentement ; build/CI requis | PRÉPARÉ NON VALIDÉ |
| QW-148 | S | Assurer le tri des trois listes HELIOS avec des identifiants importés non textuels, sans écriture | branche de préparation | Fixtures fictives et CI 11/11 sur HEAD requis | PRÉPARÉ NON VALIDÉ |
| QW-149 | S | Afficher le motif de consultation importé en sécurité dans quatre listes HELIOS et l'historique | branche de préparation | Tests fictifs et CI 11/11 sur HEAD requis | PRÉPARÉ NON VALIDÉ |
| QW-150 | S | Protéger l'affichage des diagnostics historiques importés non textuels | branche de préparation | Tests fictifs et CI 11/11 sur HEAD requis | PRÉPARÉ NON VALIDÉ |
| QW-151 | S | Protéger l'affichage des noms de patients importés non textuels dans les cinq listes | branche de préparation | Tests fictifs et CI 11/11 sur HEAD requis | PRÉPARÉ NON VALIDÉ |
| QW-152 | S | Réparer les contrats de tests QW-032, QW-134 et QW-141 devenus obsolètes après la protection QW-149/QW-151 des noms et motifs importés, sans relâcher les garde-fous | branche de préparation | Échec réel GitHub Actions #43477900374 analysé ; revalidation CI 11/11 du SHA suivant requise | PRÉPARÉ NON VALIDÉ |
| QW-153 | S | Protéger l'éditeur contre une valeur importée non textuelle : spécialité, sans modifier le dossier source | branche de préparation | Tests fictifs et CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-154 | S | Protéger l'éditeur contre une valeur importée non textuelle : motif, sans modifier le dossier source | branche de préparation | Tests fictifs et CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-155 | S | Protéger l'éditeur contre une valeur importée non textuelle : diagnostic, sans modifier le dossier source | branche de préparation | Tests fictifs et CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-156 | S | HELIOS Clinical Memory : refuser toute association de diagnostics à un identifiant patient importé vide ou ambigu | branche de préparation | Test d'isolement fictif, CI 11/11 sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-157 | S | HELIOS Clinical Memory : ne pas convertir des dates de diagnostics impossibles ou ambiguës en dates médicales fiables | branche de préparation | Tests dates fictives, CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-158 | S | HELIOS Clinical Memory : filtrer les consultations sans identifiant traçable, ordonner les diagnostics documentés de façon déterministe | branche de préparation | Test de provenance fictif, CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-159 | S | HELIOS Prevention : refuser les âges importés décimaux ou impossibles sans inventer la valeur | branche de préparation | Tests âge fictif, CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-160 | S | HELIOS Prevention : utiliser les dates cliniques strictes et le lien patient confirmé pour la dernière consultation documentée | branche de préparation | Tests multi-patients fictifs, CI sur SHA exact requis | PRÉPARÉ NON VALIDÉ |
| QW-161 | S | Trends utilise les dates de chronologie validées et écarte celles impossibles, sans déduction clinique | branche de préparation | Tests fictifs automatisés, 11 jobs CI requis sur le HEAD exact | PRÉPARÉ NON VALIDÉ |
| QW-162 | S | Trends ignore les constantes issues de consultations sans identifiant textuel traçable | branche de préparation | Tests fictifs automatisés, 11 jobs CI requis sur le HEAD exact | PRÉPARÉ NON VALIDÉ |
| QW-163 | S | Trends ne compte pas deux fois les consultations importées à identifiant dupliqué | branche de préparation | Tests fictifs automatisés, 11 jobs CI requis sur le HEAD exact | PRÉPARÉ NON VALIDÉ |
| QW-164 | S | Referral choisit la dernière consultation via une date validée, et non Date.parse permissif | branche de préparation | Tests fictifs automatisés, 11 jobs CI requis sur le HEAD exact | PRÉPARÉ NON VALIDÉ |
| QW-165 | S | Referral refuse les sources de consultation sans ID unique ou avec ID dupliqué | branche de préparation | Tests fictifs automatisés, 11 jobs CI requis sur le HEAD exact | PRÉPARÉ NON VALIDÉ |
| QW-166 | S | Parcours spécialisés : exclure du comptage les consultations à identifiant absent ou dupliqué | branche de préparation | Tests fictifs ajoutés au contrôle CI clinique | PRÉPARÉ NON VALIDÉ |
| QW-167 | S | Parcours spécialisés : afficher la dernière consultation uniquement si sa date est chronologiquement fiable | branche de préparation | Test dates impossibles et CI 11/11 requis | PRÉPARÉ NON VALIDÉ |
| QW-168 | S | Statistiques HELIOS Activité : exclure des comptages les consultations sans identifiant traçable | branche de préparation | Tests fictifs ajoutés au job clinique | PRÉPARÉ NON VALIDÉ |
| QW-169 | S | Statistiques HELIOS Activité : exclure les consultations importées avec identifiants dupliqués | branche de préparation | Tests fictifs, CI sur SHA exact | PRÉPARÉ NON VALIDÉ |
| QW-170 | S | Clarifier dans Dashboard les exclusions pour lien patient ambigu ou identifiant consultation non confirmé | branche de préparation | Contrat UI et CI sur SHA exact | PRÉPARÉ NON VALIDÉ |
| QW-171 | S | Refuser la suppression implicite d'un suivi importé malformé lors d'une modification clinique sans rapport | branche de préparation | Guard test fictif, CI 11/11 requis | PRÉPARÉ NON VALIDÉ |
| QW-172 | S | Permettre la correction explicite d'un suivi importé tout en conservant les données sources avant sauvegarde | branche de préparation | Tests non-mutation, CI 11/11 requis | PRÉPARÉ NON VALIDÉ |
| QW-173 | S | Demander une confirmation distincte avant de supprimer un suivi HELIOS valide en vidant le formulaire | branche de préparation | Contrat UI et tests fictifs, CI 11/11 requis | PRÉPARÉ NON VALIDÉ |

| QW-174 | S | Clinical Memory : exclure les diagnostics à ID de consultation dupliqué | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-175 | S | Prevention : exclure les dates de consultations à ID dupliqué | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-176 | S | Tests de collisions inter-patients et non-mutation des deux aperçus | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |

| QW-177 | S | Rejeter les heures hors plage dans la chronologie clinique partagée | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-178 | S | Prevention : départager les dates de même instant de façon stable | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-179 | S | Tests fictifs de rollover et de fuseaux équivalents sans mutation | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-180 | S | Graphiques Patients : rejeter les valeurs cliniques partielles et non numériques | branche de préparation | Tests fictifs et CI 11/11 requis sur SHA exact | PRÉPARÉ NON VALIDÉ |
| QW-181 | S | Graphiques Patients : ne tracer que des dates de consultation validées, avec affichage civil cohérent | branche de préparation | Tests fictifs et CI 11/11 requis sur SHA exact | PRÉPARÉ NON VALIDÉ |
| QW-182 | S | Graphiques Patients : exclure les consultations sans ID unique et conserver un ordre déterministe | branche de préparation | Tests fictifs et CI 11/11 requis sur SHA exact | PRÉPARÉ NON VALIDÉ |
| QW-183 | S | Création patient : limiter les âges saisis à un entier documenté entre 0 et 130 ans | branche de préparation | Tests fictifs et CI 11/11 requis sur SHA exact | PRÉPARÉ NON VALIDÉ |
| QW-184 | S | Modification patient : utiliser le même validateur d’âge que la création et protéger les imports anciens | branche de préparation | Tests fictifs et CI 11/11 requis sur SHA exact | PRÉPARÉ NON VALIDÉ |
| QW-185 | S | Liste Patients : ne plus attribuer la dernière visite à un patient absent ou dupliqué | branche de préparation | Tests fictifs et CI 11/11 sur HEAD exact | PRÉPARÉ NON VALIDÉ |
| QW-186 | S | Liste Patients : exclure les dates issues de consultations sans identifiant unique | branche de préparation | Tests fictifs et CI 11/11 sur HEAD exact | PRÉPARÉ NON VALIDÉ |
| QW-187 | S | Liste Patients : conserver un tri déterministe des dates valides et protéger les identifiants spéciaux | branche de préparation | Tests fictifs et CI 11/11 sur HEAD exact | PRÉPARÉ NON VALIDÉ |

Les corrections de l'inventaire antérieures à ces deux lots se trouvent déjà dans `docs/DEVELOPMENT_LOG.md`. Ne pas les ajouter comme « tâches à refaire ».

| QW-188 | S | Consultation Express : refuser les libellés hérités du prototype JavaScript | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-189 | S | Tests fictifs de liste fermée des libellés Express et doublons | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |

| QW-190 | S | Express : lier le brouillon brut au patient confirmé dès la saisie | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-191 | S | Express : bloquer la saisie et le transfert en cas de patient changé | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-192 | S | Tests fictifs de liaison du brouillon avant transfert | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |

| QW-193 | S | Express : bloquer la sauvegarde tant que la note brute non vide n’est pas transférée | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-194 | S | Express : préserver la note brute lors de l’ouverture d’une consultation existante | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |
| QW-195 | S | Contrats automatisés des deux garde-fous Express | branche de préparation | CI 11/11 requise | PRÉPARÉ NON VALIDÉ |

## File de travail proposée (non commencée)

| Priorité | ID | Taille estimative | Objectif précis | Critère de clôture |
| --- | --- | --- | --- | --- |

| 1 | QW-006B | M — intervention utilisateur | Vérifier sur Chrome Android : refus/autorisation micro, réseau, interruption, reprise volontaire et absence de boucle | Essais manuels avec données fictives indispensables ; ne pas marquer validé sans vérification |
| 2 | QW-007 | L — bloquant production | Revoir les contrôles d'authentification/autorisation des vraies routes cliniques et l'exposition réseau | Tests d'intégration 401/403 réels + revue de sécurité |
| 3 | QW-008 | L — bloquant production | Revoir conformité/confidentialité du flux de données vers les fournisseurs IA | Décision documentée et vérifiée avant données réelles |

**Ces propositions ne certifient ni l'absence d'autres défauts ni une autorisation de mise en production.** Réévaluer la taille à la lecture du code ; ne pas commencer une tâche si elle est déjà couverte par un commit récent.

## Bilan de la session

- Historique des lots confirmés dans la table ci-dessus. Tous les lots QW-001 à QW-026 ne sont pas nécessairement contigus ; le prochain travail doit être identifié après lecture du dernier SHA et du plan global, sans relancer un lot déjà vert.
- Pour les totaux de tests, compter chaque lot indépendamment ; n'inclure que les jobs et SHA vérifiés.
- Aucun nouveau fournisseur, abonnement, endpoint réseau ou déploiement.
- Le présent tableau de suivi est un lot documentaire distinct, à valider par sa propre CI.
