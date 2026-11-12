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

Les corrections de l'inventaire antérieures à ces deux lots se trouvent déjà dans `docs/DEVELOPMENT_LOG.md`. Ne pas les ajouter comme « tâches à refaire ».

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
