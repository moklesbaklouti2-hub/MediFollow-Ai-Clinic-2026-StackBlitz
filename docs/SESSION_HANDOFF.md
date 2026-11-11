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

### 2026-11-10 20 h — Relais sécurité (contrat fictif)
- **Branche :** `audit-stabilisation-2026-11-10` ; **code :** `074ffe015ed02fac457715963e44812e3fd61722` ; **journal :** `362b049dc622eb06219fa24086b0c41845f7a25f`.
- **Module/fichiers :** sécurité simulée ; `scripts/test-access-decision-contract.mjs`, `docs/DEVELOPMENT_LOG.md`, ce relais.
- **Achevé :** garde contre assignations nulles, chaînes et identifiant vide ; 15 scénarios fictifs présents.
- **Contrôles :** deux lectures indépendantes du code et de la version distante ; tests locaux non exécutés. CI du commit code #54 : in_progress / résultat non disponible au moment de la lecture ; vérifier son résultat final.
- **Blocage :** aucune authentification effective n'est fournie par ce script ; aucune preuve de sécurité d'un serveur public.
- **Reprise :** inspecter la CI du dernier commit et les routes Express, puis sélectionner un correctif isolé sans changer le comportement clinique sans autorisation. Aucun test utilisateur requis pour ce lot ; les essais Android/microphone restent EN ATTENTE — intervention utilisateur.

### 2026-11-10 — CI #64 verte : caractères de contrôle fictifs
- **Commit :** `3f5bce7cbd0481c161de8e5940a4b19cd1f20fa1` ; **workflow #64 : vert**, 37 s, confirmé par capture GitHub Actions fournie par l'utilisateur.
- **Portée :** les scénarios fictifs du contrat d'accès utilisent désormais de véritables caractères échappés de tabulation et de retour à la ligne ; correction du test après les échecs #62 et #63.
- **Limites :** le contrat reste une simulation hors ligne, non reliée aux routes Express ; la CI verte ne certifie pas la sécurité d'un déploiement.
- **Suite :** examiner la stratégie d'authentification effective et les frontières des routes cliniques sans activer de blocage ni toucher à `main` ; utiliser uniquement des données fictives.

### 2026-11-10 — Contrôle de reprise : CI #66 et critères de clôture
- **Source de validation :** capture GitHub Actions transmise par l'utilisateur : exécutions #64, #65 et #66 vertes ; #66 au commit abrégé `b318c7c` (41 s). Ce constat concerne les workflows visibles, pas un audit de production.
- **État de la branche :** comparaison GitHub `main...audit-stabilisation-2026-11-10` : 135 commits en avance, 0 en retard au moment de ce contrôle ; `main` inchangée par cette session.
- **Priorité bloquante avant clôture :** les tests d'accès 401/403 sont **fictifs** et non raccordés aux routes Express. Ne pas qualifier l'application de sécurisée pour des patients réels ni la déployer publiquement.
- **Critères de clôture de la boucle de stabilisation :** (1) CI verte sur le commit final ; (2) compilation et quatre suites de régression hors ligne réussies ; (3) aucune donnée réelle ni secret dans les tests ; (4) vérification explicite de l'absence d'authentification effective sur les routes cliniques et décision documentée de ne pas déployer tant que ce point n'est pas traité ; (5) revue des écarts restants et des tests Android non exécutés ; (6) aucune fusion vers `main` sans accord utilisateur.
- **Prochaine tâche indépendante :** préparer un test HTTP local fictif démontrant le comportement réel des routes cliniques en accès non authentifié, sans exposer le serveur ni modifier la politique d'accès en production. Éviter toute activation implicite d'un middleware bloquant.
- **Avancement :** le pourcentage annoncé dans la conversation est une estimation de suivi, non un indicateur calculé à partir des workflows.

### 2026-11-10 21 h — Relais sonde HTTP réelle (locale)
- **Module :** sécurité API ; **branche :** `audit-stabilisation-2026-11-10` ; **commits :** `a3b1e8131a3051031ed22961f191af2e6f467eb4` (sonde), `57c19aa0d218c1c703ae750b28705996bb214cb5` (CI), `2c312775b93d622bfe7cf5a6827f5e3067d42a54` (journal).
- **Fichiers :** `scripts/test-local-http-auth-boundary.mjs`, `.github/workflows/medifollow-audit.yml`, `docs/DEVELOPMENT_LOG.md`, ce relais.
- **Achevé :** sonde HTTP Express locale avec entrées fictives et absence de clés IA ; aucune modification des routes ou données patients.
- **Vérification :** revue statique en deux passes ; **CI du dernier commit non encore confirmée**. Dernière CI observée avant les changements : #74 verte sur `c406842`.
- **Blocage :** authentification réelle non implémentée, tests Android non exécutés. Ne pas déployer ni fusionner.
- **Reprise :** consulter le dernier run Actions ; si la sonde échoue, lire les logs du job `access-decision-contract`, corriger puis retester. Sinon, poursuivre l'audit des routes cliniques et définir une migration d'authentification avec accord explicite avant activation.

### 2026-11-10 22 h — Sonde HTTP : prévention des faux positifs si port occupé
- **Module :** tests sécurité API ; **branche :** `audit-stabilisation-2026-11-10` ; **commit code :** `ff34a3c42f3ce24cca162ce73ac29da32686203e`.
- **Fichier :** `scripts/test-local-http-auth-boundary.mjs`. Vérification préalable TCP sur 127.0.0.1:3001 : refuser le test si un autre processus occupe le port, au lieu de risquer de tester ce processus par erreur.
- **Contrôle 1 :** relecture distante du script après commit : garde présente, assertions HTTP originales et arrêt du processus conservés. **Contrôle 2 :** deux essais Node isolés de la logique TCP (port libre : false ; port occupé par serveur fictif : true), tous deux conformes ; aucun test Express complet effectué.
- **Limites :** `npm run test:complete`, workflow Actions sur ce commit, tests HTTP complets et Chrome Android non exécutés/confirmés dans cette session. Aucune authentification serveur réelle ajoutée, aucun patient réel, aucun secret ni déploiement. **EN ATTENTE — BLOCAGE TECHNIQUE :** confirmer le job `access-decision-contract` du dernier commit ; si échec, consulter les logs et corriger. **EN ATTENTE — intervention utilisateur :** essais microphone sur Android ultérieurement.
- **Prochaine tâche indépendante :** contrôler le résultat CI de la sonde, puis poursuivre les tests d'accès 401/403 avec données fictives ; aucune activation de middleware sensible sans validation.

### 2026-11-10 23 h — Relais fiabilité HTTP locale
- **Module :** sécurité API / CI ; **branche :** `audit-stabilisation-2026-11-10` ; **commits code/test/CI :** `1e085637`, `da5813f`, `a2fe020`, `b592b68` ; **journal :** `f98d04bd`.
- **Fichiers touchés :** `scripts/port-availability.mjs`, `scripts/test-port-availability.mjs`, `scripts/test-local-http-auth-boundary.mjs`, `.github/workflows/medifollow-audit.yml`, `docs/DEVELOPMENT_LOG.md`, ce relais.
- **Achevé :** garde TCP réutilisable, test occupé/libéré intégré à CI. Contrôle technique : test Node.js local isolé PASS. Contrôle indépendant : relecture des fichiers distants, raccordement confirmé. Pas de test complet Express ou navigateur effectué.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** résultat du workflow du dernier commit à confirmer ; ne pas confondre étape configurée et exécution réussie. Authentification effective des routes cliniques non certifiée ; ne pas déployer.
- **Prochaine tâche indépendante :** vérifier CI `access-decision-contract`, diagnostiquer les logs si échec, puis tester les refus d'accès 401/403 sur des fixtures fictives sans changer la politique de production.
- **EN ATTENTE — intervention utilisateur :** Chrome Android/microphone lorsque disponible, résultat attendu : refus de permission et reprise manuelle sans boucle.

### 2026-11-10 23 h 56 — Relais sonde TCP bornée
- **Module :** CI / sonde HTTP ; **branche :** `audit-stabilisation-2026-11-10` ; **commit code :** `a312e4cc6ca8f62f68b1cc1d1819e2bd55abd083`.
- **Fichier :** `scripts/port-availability.mjs`. Ajout d'un délai de 1500 ms : une connexion TCP bloquée est considérée indisponible ; garde contre les résolutions multiples.
- **Contrôle 1 :** syntaxe Node.js et test occupé/libéré exécutés dans une copie isolée de la fonction sous Node : PASS. **Contrôle 2 :** relecture indépendante du fichier distant : délai, nettoyage du socket et comportement refus/connexion présents. Le scénario réseau réellement bloqué n'a pas été reproduit.
- **CI :** statuts GitHub du SHA documentaire antérieur non disponibles (tableaux vides) ; aucun succès Actions récent attesté. **Limites :** pas de build complet, test Express ni Android ; aucune donnée réelle et aucun déploiement.
- **Reprise :** consulter le job `access-decision-contract` sur le dernier SHA ; si vert, examiner les routes HTTP cliniques ; si rouge, analyser les logs. Authentification effective toujours non certifiée.

### 2026-11-11 00 h 57 — Relais CI / sondes concurrentes
- **Branche :** `audit-stabilisation-2026-11-10` ; **code :** `cbcc5d76707c6172447a7db82f4864bb716986c0` ; **journal :** `4bce9527871d193cf33cd1d84d7c094eee280c60`.
- **Fichiers :** `scripts/test-port-availability.mjs`, `docs/DEVELOPMENT_LOG.md`, ce relais.
- **Réalisé :** régression concurrente sur huit sondes loopback fictives ; tests Node isolés exécutés deux fois et réussis ; code distant relu.
- **Dernier CI confirmé avant changement :** run `42926489358` sur `bccc2ecb0486ea5a1c9410050122a35e18d3aae3`, dix jobs `completed/success`. **CI du nouveau HEAD non encore confirmée.**
- **Reprise :** vérifier le SHA actuel de la PR #2, puis les jobs du run correspondant exactement à ce SHA. Si rouge, consulter les logs ; si vert, poursuivre le contrôle des routes cliniques. Pas de déploiement, ni fusion, ni données réelles. Tests Android/microphone toujours EN ATTENTE — intervention utilisateur.

### 2026-11-11 — Relais CI : ignorer les contrôles incomplets et SHA obsolètes
- **Point de départ :** `0c1197b9f9c8d2cd146485151fd3f6689189c7ec`, run `42927687305`, tentative 1 : completed/success et 11 jobs réussis vérifiés directement par API GitHub. Événement `6782718864` traité ; événement `6782702837` ignoré (run `42927664076`, contrôles annulés et SHA ancien).
- **Correctif :** `.github/workflows/medifollow-audit.yml` ne publie plus de commentaire VERT/ROUGE si un contrôle est annulé, ignoré ou inconnu ; vérifie le HEAD distant avant publication. Une erreur API refuse la publication. Le consommateur doit toujours revérifier le run terminé et le HEAD, car cette vérification préalable ne supprime pas toute course concurrente.
- **Test :** `scripts/test-ci-relay.mjs` exécute le vrai bloc Bash du workflow avec un faux `gh` sans réseau ni secrets : 53 cas réussis (vert, échecs, états incomplets, SHA obsolète, erreur API). Test ajouté au job de régression CI existant.
- **Contrôle 1 :** les 53 cas passent après correction d'une interpolation JavaScript dans le test ; inventaire sécurité API, repli clinique 429 et coordination exécutés avec succès.
- **Contrôle 2 :** revue du diff, `git diff --check` et vérification des branches success/failure/incomplètes. Aucune modification du code clinique. Pas de build application ni de test navigateur dans ce lot CI ; la CI du nouveau commit reste à vérifier.
- **Commit :** cette entrée, le test et le workflow sont livrés ensemble ; utiliser le SHA du commit contenant cette entrée, sans commit documentaire supplémentaire.
- **Reprise :** attendre le résultat CI de ce commit puis poursuivre l'audit des accès cliniques. Ne pas déployer, fusionner ou utiliser des données réelles. Les tests Android/microphone restent en attente.

### 2026-11-11 — Fiabilité sessions et annulation CSRF (lot parallèle)
- **Base vérifiée :** `adceed5a4543d13e0edc45c6c9ed8917f76ae20f`, événement `6782801140`, workflow `42928316379`, tentative 1 completed/success, 11 jobs réussis. Deux sous-tâches sur fichiers distincts, intégrées par un seul coordinateur.
- **Sessions :** `server/security/sessionStore.ts` refuse les horloges invalides ou débordantes lors de la création et de la vérification ; 13 assertions ajoutées dans `scripts/test-session-store.mts`. Le défaut NaN a été reproduit sur la version précédente.
- **Client :** `src/services/doctorAuthClient.ts` conserve l'annulation pendant la lecture du corps CSRF au lieu de la transformer en erreur 503. Régressions annulation et JSON malformé dans `scripts/test-doctor-clinical-transport.mts` ; aucun POST clinique après ces erreurs.
- **Contrôle 1 :** suites session-store, doctor-clinical-transport et doctor-session-guard exécutées avec `node --import tsx` : PASS ; test statique doctor-auth-client : PASS. Le CLI tsx a initialement échoué sur son socket IPC (EPERM) ; l'import Node exécute les mêmes tests sans serveur IPC.
- **Contrôle 2 :** revue des diffs, `git diff --check`, `npm run build` : PASS. Avertissement Vite existant sur bundle >500 kB. Aucun test Android ni certification médicale ; aucun mode de sécurité activé ou déploiement.
- **Commit :** code, tests et journaux regroupés dans le commit contenant cette entrée. CI de ce nouveau commit à confirmer au prochain événement.
- **Reprise :** examiner les refus/expirations dans les parcours intégrés et poursuivre la stabilisation du périmètre existant. Le fichier package-lock généré pour l'installation locale n'est pas inclus.
