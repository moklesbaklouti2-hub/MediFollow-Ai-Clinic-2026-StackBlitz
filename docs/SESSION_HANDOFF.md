# MediFollow AI — relais de sessions

> Coordination du développement sur `audit-stabilisation-2026-11-10`.
> Ce fichier ne déclenche **aucune** session ChatGPT. Il documente le relais pour la prochaine session autorisée.

## État technique connu (2026-11-10)

- Branche de travail : `audit-stabilisation-2026-11-10` ; **ne pas modifier ni fusionner `main`** sans validation.
- Workflow : `.github/workflows/medifollow-audit.yml` (commit `0f02d7ac957967eefb3053e8830da47674d8afab`).
- Travaux automatisés indépendants : compilation TypeScript/Vite, résilience IA, régression clinique, dictionnaire médical, dictée HELIOS.
- Résultats d'exécution GitHub Actions : **non vérifiés à la création de ce relais**. Ne pas présumer que les tests ont réussi.
- Aucun agent IA parallèle de codage n'est installé par ce workflow ; les jobs GitHub Actions ne font que compiler et tester.
- Aucun accès aux données réelles, aucun secret ni appel IA payant requis par le workflow.

## Protocole obligatoire à chaque session

1. Lire les derniers commits distants, `docs/DEVELOPMENT_LOG.md` et ce relais **avant** toute écriture.
2. Examiner les résultats du workflow du commit actuel si accessibles. Distinguer les tests réellement exécutés des tests simplement configurés.
3. Choisir une tâche indépendante, petite et vérifiable. Privilégier sécurité, compilation et non-régression.
4. Ne pas travailler simultanément sur les mêmes fichiers qu'une autre session. Vérifier la version distante immédiatement avant écriture ; jamais de push forcé.
5. Exécuter les contrôles disponibles ; si impossibles, expliquer pourquoi et ne pas déclarer le travail validé.
6. Si un serveur, un quota ou un outil bloque, tenter au plus trois approches distinctes, puis basculer vers un autre module indépendant.
7. Enregistrer les changements dans un commit réversible, mettre à jour le journal et laisser un relais : module, fichiers, SHA, tests, anomalies, prochaine tâche.
8. Ne jamais fusionner, déployer, modifier des données réelles, engager des dépenses ou approuver une décision clinique sans autorisation explicite.

## Modules indépendants et prochaines tâches candidates

| Module | Prochaine tâche candidate | Conditions |
| --- | --- | --- |
| HELIOS / dictée | Vérifier le module `src/services/medicalSpeech.ts` après extraction et ses tests directs | Compiler et tester avant de conclure |
| Consultations | Auditer le modèle de pièces jointes et la séparation données/présentation | Pas de données réelles ni de migration destructive |
| Sécurité clinique | Vérifier les tests de régression et les cas de négation/chiffres | Suggestions non appliquées sans confirmation médicale |
| Espace patient | Définir les frontières d'accès et la sélection explicite des informations | Ne pas exposer de dossiers ou données privées |
| Formation continue | Préparer les structures et critères de provenance des recommandations | Pas d'affirmation de certification sans preuve |
| CI / coordination | Vérifier les exécutions GitHub Actions et corriger les erreurs réelles | Ne pas lancer d'agents autonomes payants ou non autorisés |

## Résultat attendu

Une progression mesurable en modifications de code réellement testées, avec un minimum d'attente entre tâches **au sein d'une même session**. Les sessions ChatGPT programmées restent limitées par leur calendrier ; GitHub Actions ne peut pas les redémarrer immédiatement.

### 2026-11-10 19 h — Contrat des hypothèses différentielles (relais)
- **Module :** sécurité clinique ; **branche :** `audit-stabilisation-2026-11-10`.
- **Commits :** code `3bbaaf8cd4d1e9c8719fb831176b2fdfdc80cb84`, test `267f8e687e2c73d23b4b564067a94f950ddc25e3`.
- **Fichiers :** `server/index.ts`, `server/ai/test-clinical-regression.ts`.
- **Modification :** exclure les hypothèses IA dont le diagnostic ou l'argument est absent, vide ou de type incorrect ; aucune prescription ni donnée patient modifiée.
- **Contrôle 1 :** relecture ciblée du prédicat et assertion statique ajoutée à la suite existante ; **npm non exécuté**.
- **Contrôle 2 :** essai JavaScript isolé sur cinq entrées fictives (valide, libellé vide, justification vide, justification numérique, null) : une hypothèse valide conservée. Ce n'est ni un test de la route HTTP ni un test médical.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** exécuter `npm run test:complete` et vérifier la CI sur la branche ; aucun succès de build/CI attesté ici.
- **Prochaine tâche indépendante :** examiner les accès aux routes API et les refus d'accès sans activer d'authentification risquant de casser l'application ; préserver la validation médecin et ne jamais déployer.

### 2026-11-10 — Validation CI de la protection de /api/health
- **Commit testé :** `359619514808ce7d535aa085dd99c7a2a4a784b8` ; **workflow GitHub Actions #47 : vert**, durée **38 secondes**, confirmé par capture de l'interface GitHub Actions fournie par l'utilisateur.
- **Portée :** régression statique de la réponse de santé publique ; le test interdit la réintroduction accidentelle de métadonnées de fournisseurs IA ou de secrets dans le gestionnaire de cette route.
- **Limite :** un workflow vert ne démontre ni une authentification des routes cliniques ni la sécurité d'un déploiement public. Le contrat de permissions reste documentaire et non appliqué.
- **Suite prioritaire :** préparer une stratégie d'authentification sans casser les flux existants ; écrire d'abord des tests fictifs pour les réponses 401/403 et la séparation des rôles. Ne pas activer de middleware bloquant, ne pas déployer et ne pas fusionner `main` sans validation explicite.
