# MediFollow AI — journal de développement

## 2026-11-10 — Correction ciblée de la dictée médicale

- **Objectif :** rendre opérantes les limites de mots du contexte ORL et la détection Unicode des mots dictés ; les expressions « excellent » restent des suggestions soumises à confirmation médicale.
- **Fichier modifié :** `src/components/OrbAssistant.tsx`.
- **Commits :** `e4c39719b7dac9dc9c63050a83da127855ad6606` (Unicode et début des expressions), `56e18648531e0a600e3686613bae836e8d1b1aa7` (fin des expressions).
- **Contrôle 1 :** relecture ciblée du code modifié et vérification des motifs réguliers ; corrections des antislashs doubles qui empêchaient les correspondances attendues.
- **Contrôle 2 :** lecture indépendante du fichier distant après commits et quatre scénarios JavaScript fictifs (contexte ORL positif/négatif) : 4/4 conformes. Vérification isolée de l'expression Unicode pour « dyspnée » : conforme.
- **Limites :** tests JavaScript ciblés uniquement ; compilation TypeScript, suite `npm run test:all-offline`, interface Chrome Android et scénarios vocaux réels **non exécutés**. Aucune validation médicale.
- **Statut :** correctif versionné, validation complète en attente.
- **Prochaine étape :** lancer `npm run build && npm run test:all-offline`, puis vérifier la dictée sur Android et les confirmations proposées.

## 2026-11-10 — HELIOS : arrêt des relances du microphone après erreur terminale

- **Objectif :** éviter une boucle de réactivation de la reconnaissance vocale après refus de permission, interdiction du service ou absence de microphone sur Chrome Android.
- **Fichier modifié :** `src/components/OrbAssistant.tsx` ; **commit :** `18e00c3da2f5017a24331f5923f8c4add53059c6`.
- **Contrôle 1 :** vérification du flux `onerror` → `onend` : désactivation de l'écoute automatique pour `not-allowed`, `service-not-allowed`, `audio-capture` ; les erreurs récupérables ne changent pas de comportement.
- **Contrôle 2 :** relecture indépendante du fichier distant après commit et simulation Node.js de six codes d'erreur : les trois erreurs terminales empêchent une relance, les trois autres conservent le comportement existant (6/6 conformes à la logique testée).
- **Limites :** simulation ciblée de la logique seulement ; compilation TypeScript, tests d'intégration et essai Chrome Android **non exécutés**. L'erreur réseau peut encore entraîner des relances ; elle sera à traiter avec temporisation/limite de tentatives.
- **Statut :** correctif versionné, validation intégrée en attente. **Suite :** `npm run build && npm run test:all-offline`, puis test des permissions sur Android.

### 2026-11-10 — HELIOS : échec réseau et démarrage du microphone
- Commit : `aeccbc22730c07abec4f6e714b6fa14c0d2d86f4`.
- Fichier : `src/components/OrbAssistant.tsx`.
- Correction : la perte du service réseau vocal coupe les relances automatiques ; un échec synchrone de `recognition.start()` désarme aussi l'écoute automatique. Le médecin peut relancer manuellement. Aucun changement des données cliniques.
- Contrôle 1 : inspection des branches `onerror` et `catch`, cohérence avec les refus d'autorisation déjà traités ; contrôle statique ciblé de la logique.
- Contrôle 2 : relecture du fichier distant après commit et vérification statique de cinq invariants (réseau, exception de démarrage, interruption, fallback texte, absence de parole) : 5/5 présents. Ces contrôles ne prouvent pas l'exécution navigateur.
- Non exécutés : compilation TypeScript, tests hors ligne du projet, essais Chrome Android. Validation intégrée toujours requise.
- Suite : tester sur appareil la reprise manuelle après perte réseau et les commandes composées ; exécuter `npm run build && npm run test:all-offline`.

### 2026-11-10 — HELIOS : éviter les relances en boucle après absence de parole
- **Correctif :** `de580652a52a5053a794e36c05c6e3c5d498d46a` dans `src/components/OrbAssistant.tsx` : l'événement `no-speech` désarme désormais la relance automatique des commandes vocales. Le médecin peut relancer l'écoute manuellement. Aucun changement des données cliniques.
- **Contrôle 1 :** diff minimal ciblé sur le gestionnaire `onerror` ; relecture du code et maintien du message explicite « Aucune parole détectée ».
- **Contrôle 2 :** nouvelle lecture indépendante du fichier GitHub après commit ; cinq invariants statiques contrôlés : arrêt après `no-speech`, relance manuelle accessible, commande d'arrêt, fallback texte, message d'absence de parole. **5/5 présents** ; tests statiques uniquement.
- **Limites :** aucune compilation TypeScript, suite complète hors ligne ou validation sur Android réalisée dans cette session ; ne pas assimiler ces vérifications à une validation navigateur.
- **Suite :** `npm run build && npm run test:all-offline`, puis essais Chrome Android de la dictée silencieuse, des permissions et de la reprise manuelle.

### 2026-11-10 — HELIOS : commande vocale d'arrêt avec ponctuation
- **Commit :** `c48021bf27e9fca48d6257ce5dd79a124761d498` ; fichier : `src/components/OrbAssistant.tsx`.
- **Correction :** la commande d'arrêt reconnaît désormais les variantes courtes avec ponctuation et « l'écoute » ; les phrases différentes telles que « stop ordonnance » ne sont pas interprétées comme un arrêt de microphone.
- **Contrôle 1 :** revue du remplacement minimal, 8 scénarios JavaScript fictifs positifs/négatifs (8/8 conformes).
- **Contrôle 2 :** relecture du fichier distant après commit et vérification du motif présent. Pas de test navigateur ni de compilation complète.
- **Limites :** la suite TypeScript et `npm run test:all-offline` restent non exécutées ; les variantes vocales Android réelles nécessitent validation. Aucun changement de données patient.

### 2026-11-10 — HELIOS : classement des alternatives de dictée sans correspondance partielle
- **Commit code :** `415d98d1163ae5d7ff450da6313dc7c945877705` (`src/components/OrbAssistant.tsx`).
- **Correction :** la préférence pour une alternative contenant un terme médical s'applique uniquement aux mots/expressions complets, sans détecter un terme comme fragment d'un autre mot. Aucune correction automatique de transcription ajoutée.
- **Contrôle 1 :** inspection du changement ciblé et exécution Node.js de cinq scénarios fictifs (mot complet, fragment, expression composée, ponctuation, préfixe) : 5/5 conformes.
- **Contrôle 2 :** relecture indépendante du fichier distant après commit : nouveau motif présent, ancien `includes` absent. Aucune modification des dossiers ou prescriptions.
- **Limites :** compilation TypeScript, suite complète hors ligne et validation Android non exécutées ; correction ciblée à confirmer en intégration.
- **Suite :** `npm run build && npm run test:all-offline` dans Codespaces, puis dictée réelle sur Android.


### 2026-11-10 — Validation stricte de deux champs de réponse clinique
- **Commit code :** `79276a5c1d75daa9ab83afc4292dd93c352d21fc` ; fichier `server/index.ts`.
- **Correction :** l'API refuse désormais une réponse IA clinique sans justification textuelle de priorité ou sans tableau d'options de question, au lieu de masquer ces erreurs de contrat. Aucun changement des prescriptions ou données réelles.
- **Contrôle 1 :** diff limité à deux vérifications de type, cohérent avec le schéma JSON existant ; absence de modification des routes voisines.
- **Contrôle 2 :** nouvelle lecture distante du fichier après commit et quatre assertions statiques sur le contrat (4/4 présentes). **Ce ne sont pas des tests d'exécution.**
- **Non exécutés :** `npm run build`, `npm run test:all-offline`, tests d'intégration et tests médicaux. Environnement local sans accès réseau au dépôt ; aucun résultat de compilation n'est revendiqué.
- **Suite :** vérifier compilation et tests hors ligne dans Codespaces ; contrôler le comportement de la route avec réponses IA fictives valides et invalides.

### 2026-11-10 — Nettoyage du lexique médical (branche audit)
- **Branche :** `audit-stabilisation-2026-11-10` ; **commit :** `6d03a314a39ceb3516db65c0c5416c7469ceebe6`.
- **Correction :** suppression de deux entrées strictement dupliquées (`asthénie` et `dyspepsie`) dans `src/data/medicalDictionary.ts`. L'entrée `défense abdominale` apparaît dans deux domaines distincts (`semiologie` et `digestif`) et a été conservée intentionnellement.
- **Vérification :** inspection du contenu GitHub avant modification, contrôle des occurrences dans le contenu écrit (1 occurrence de chaque terme corrigé). Aucun autre terme modifié.
- **Non exécutés :** `npm run build`, tests automatisés du projet et dictée sur Android. **EN ATTENTE — intervention utilisateur** pour les tests sur appareil, lorsque l'accès sera disponible. La validation clinique n'est pas revendiquée.
- **Suite :** exécuter les tests techniques dans un environnement disposant du dépôt ; renforcer les tests de régression du lexique et des routes cliniques.

### 2026-11-10 — Test structurel hors ligne du lexique médical (branche audit)
- **Commits :** `f1c599bc0ceb2895c806e5a97738caa6012ecf92` (nouveau `scripts/test-medical-dictionary.ts`), `0a8902209ba34aeb9350372d941c6722f7984ed0` (`package.json`). Branche `audit-stabilisation-2026-11-10` uniquement ; `main` inchangée.
- **Objectif :** prévenir les doublons dans un même domaine et la disparition de termes critiques du lexique de dictée, sans substituer automatiquement les mots ni modifier les données cliniques.
- **Contrôle 1 :** relecture des fichiers distants après commits et vérification de l'intégration du script dans `test:all-offline`.
- **Contrôle 2 :** reproduction des assertions structurelles dans l'environnement JavaScript du connecteur sur le lexique distant : **239 entrées, aucun doublon dans un même domaine, 4/4 termes essentiels présents**. Ce contrôle n'exécute PAS `tsx` ou la suite npm.
- **EN ATTENTE — intervention utilisateur / environnement d'exécution :** lancer dans Codespaces sur cette branche `npm run build && npm run test:all-offline`, puis transmettre les sorties. Résultat attendu : compilation et tests réussis sans erreur ; corriger tout échec avant fusion. Les essais de microphone sur Android restent également non effectués.
- **Limites :** aucune validation médicale, aucun test navigateur, aucun test IA live ; les entrées communes à plusieurs domaines sont permises intentionnellement. Prochaine étape : compilation complète, tests et régressions ciblées.

### 2026-11-10 — Contrôles supplémentaires du lexique (session 09 h)
- **Objectif :** rejeter les termes avec espaces parasites et les domaines vides ou mal formés dans le test hors ligne existant.
- **Fichier :** `scripts/test-medical-dictionary.ts` ; **commit :** `3f5aee225ac3386a7eccd3d64279f9c5b6f3ab1e`.
- **Contrôle 1 :** lecture du diff et du fichier distant : deux assertions supplémentaires présentes. Aucun changement du lexique, de l'interface ou des données patient.
- **Contrôle 2 :** analyse indépendante via JavaScript du lexique distant : 239 entrées analysées, 0 domaine vide/mal formé et 0 terme avec espaces parasites. **Ce n'est pas une exécution du script TypeScript**.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** l'environnement local ne résout pas github.com (échec `git ls-remote` : `Could not resolve host: github.com`), et le connecteur GitHub n'exécute pas npm. Une alternative a permis la lecture et les assertions JavaScript, sans compilation du projet.
- **EN ATTENTE — intervention utilisateur :** dans Codespaces, sélectionner `audit-stabilisation-2026-11-10`, puis lancer `npm install && npm run build && npm run test:all-offline` ; fournir les erreurs exactes s'il y en a. Résultat attendu : zéro erreur de compilation et tests hors ligne réussis. Essais microphone Chrome Android toujours non effectués.
- **Statut :** assertions ajoutées et inspection statique conforme ; validation de build et non-régression complète non réalisée. Prochaine étape : exécuter les tests réels, puis traiter les anomalies observées.

### 2026-11-10 — Réduction des fuites d'erreurs du moteur clinique (session 10 h)
- **Objectif :** ne plus transmettre au navigateur le détail brut des exceptions fournisseur IA, ni journaliser l'objet d'erreur complet dans cette route.
- **Fichiers :** `server/index.ts`, `server/ai/test-clinical-regression.ts`.
- **Commits :** `1caae130ef16d1eeeefae433898d6ea130bf6885` (réponse générique), `9d2c43ed95ee003fb06a0717e4ce97871055aa67` (garde de non-régression statique).
- **Contrôle 1 :** modifications ciblées, maintien du traitement explicite 429 et ajout de deux assertions dans la suite hors ligne existante.
- **Contrôle 2 :** relecture indépendante des deux fichiers depuis la branche distante ; 5/5 invariants statiques conformes (message générique, absence interpolation du détail, absence journalisation brute, 429 conservé, assertions présentes).
- **Limites :** `npm run build` et `npm run test:all-offline` **non exécutés** ; aucune simulation HTTP, aucun test navigateur ou validation médicale. Le message générique ne démontre pas la sécurité globale des journaux ou autres routes.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** compilation et tests npm nécessitent un environnement de travail pouvant exécuter le dépôt. Dans Codespaces sur `audit-stabilisation-2026-11-10`, exécuter `npm install && npm run build && npm run test:all-offline` ; attendu : exit code 0 pour chaque commande. Si échec, conserver la sortie exacte et corriger avant toute fusion.
- **Statut :** code versionné, contrôle statique conforme, validation intégrée en attente. **Suite :** audit des autres réponses d'erreur et vérification de non-régression HTTP fictive.

### 2026-11-10 — Justification de priorité clinique non vide (session 11 h)
- **Objectif :** refuser une réponse structurée du modèle avec `priorityReason` vide ou constitué d'espaces, sans changer les prescriptions.
- **Commits :** `918fff632f218c42a460e724fb841fb2604fce2` (`server/index.ts`), `aa0dd55f84387198cc2504567b4dbe10c4711f3e` (`server/ai/test-clinical-regression.ts`). Branche audit exclusivement.
- **Contrôle 1 :** relecture du code et du test distant ; assertion statique de non-régression ajoutée.
- **Contrôle 2 :** nouvelle inspection indépendante des deux fichiers distants et cinq invariants JavaScript ciblés : 5/5 conformes. **Aucun test npm, HTTP, navigateur ou clinique exécuté.**
- **EN ATTENTE — BLOCAGE TECHNIQUE :** environnement local incapable de résoudre `github.com`, connecteur GitHub sans exécution npm. Dans Codespaces sur `audit-stabilisation-2026-11-10`, exécuter `npm install && npm run build && npm run test:all-offline` ; résultat attendu : exit code 0. Corriger tout échec avant fusion.
- **Statut :** correctif versionné, contrôles statiques conformes ; validation intégrée non réalisée. Suite : tester réponses cliniques fictives invalides/valides via HTTP hors ligne.

### 2026-11-10 — Garde de régression des contrats cliniques (session 12 h)
- **Objectif :** renforcer les contrôles hors ligne existants concernant limite du contexte, priorité autorisée, options structurées, quota 429 et message d'erreur générique.
- **Fichier :** `server/ai/test-clinical-regression.ts` ; **commit code :** `ffea5dd7c85ee73e1630ba95303b43404fbb71f3`.
- **Contrôle 1 :** lecture du code serveur et ajout de cinq assertions statiques correspondant à des gardes réellement présentes. Aucune modification du comportement clinique ni des données.
- **Contrôle 2 :** nouvelle lecture distante indépendante des deux fichiers après commit ; correspondance exacte des cinq gardes dans le serveur et dans les assertions (5/5). Ce contrôle n'exécute pas le script TypeScript.
- **Non exécutés :** `npm run build`, `npm run test:all-offline`, tests HTTP, tests Android et validation médicale. **EN ATTENTE — BLOCAGE TECHNIQUE** : le connecteur GitHub permet de lire/écrire, pas d'exécuter npm sur le dépôt ; le clonage local réseau n'est pas disponible dans cet environnement.
- **Prochaine étape :** dans Codespaces, sur `audit-stabilisation-2026-11-10`, lancer `npm install && npm run build && npm run test:all-offline` ; résultat attendu : codes de sortie 0. En cas d'échec, transmettre la sortie et corriger avant fusion. Aucun test IA payant requis.
- **Statut :** garde statique versionnée ; validation intégrée non réalisée.

### 2026-11-10 — Nettoyage d'une variable inutilisée dans la route clinique (session 13 h)
- **Objectif :** supprimer `detail` devenu inutilisé dans le `catch` de `/api/clinical/analyze` après la suppression antérieure de l'exposition des erreurs fournisseur ; prévenir une erreur TypeScript TS6133 potentielle.
- **Commit code :** `836f1fcb6e600745477f9c38fded2665114f2e39` ; fichier : `server/index.ts` ; branche `audit-stabilisation-2026-11-10` uniquement.
- **Contrôle 1 :** remplacement exact d'une occurrence dans le gestionnaire clinique, vérification de l'absence de modification de la route vocale et de la conservation du statut HTTP.
- **Contrôle 2 :** relecture distante indépendante : variable inutilisée absente de la route clinique, journal de statut conservé, traitement 429 et réponse générique conservés. Vérification statique uniquement.
- **Limites :** `npm run build`, `npm run test:all-offline`, tests HTTP et Android non exécutés ; aucune validation médicale. **EN ATTENTE — BLOCAGE TECHNIQUE** pour l'exécution npm dans cet environnement. **EN ATTENTE — intervention utilisateur** pour les essais microphone sur Android.
- **Suite :** dans Codespaces sur cette branche, lancer `npm install && npm run build && npm run test:all-offline` ; si échec, conserver la sortie exacte. Auditer ensuite les autres variables inutilisées et les réponses d'erreur sans toucher aux données patient.

### 2026-11-10 — Robustesse Unicode du test de lexique (session 14 h)
- **Objectif :** refuser dans le test structurel les caractères de contrôle et les termes non normalisés NFC, susceptibles de perturber la dictée et les correspondances.
- **Fichier :** `scripts/test-medical-dictionary.ts` ; **commit code :** `d61f9f931a597919f690ae78c111278c3fe1b0d8` ; branche `audit-stabilisation-2026-11-10` uniquement.
- **Contrôle 1 :** relecture du fichier distant après modification, présence des deux assertions confirmée.
- **Contrôle 2 :** vérification JavaScript indépendante des 239 termes extraits du lexique distant : 0 terme non NFC, 0 caractère de contrôle. **Ce n'est pas l'exécution du script TypeScript.**
- **Limites :** `npm run build` et `npm run test:all-offline` non exécutés ; test navigateur et validation médicale non effectués. Aucun dossier patient, secret ou prescription modifié.
- **EN ATTENTE — intervention utilisateur :** ouvrir Codespaces sur cette branche, lancer `npm run build && npm run test:all-offline`, transmettre toute erreur ; résultat attendu : compilation et tests réussis. Continuer en parallèle les vérifications indépendantes.

### 2026-11-10 — Tests complets sans appels IA live implicites (session 15 h)
- **Objectif :** éviter qu'une commande de vérification générale lance involontairement un test clinique live consommant un quota IA.
- **Fichier :** `package.json` ; **commit code :** `f94806a4ae5b95b13a261d491a4caefc2d6dd49c`.
- **Contrôle 1 :** modification d'une seule commande, JSON parsé, conservation du build et des scripts existants.
- **Contrôle 2 :** nouvelle lecture du fichier distant : 4/4 invariants de configuration vérifiés (build préservé, chaîne hors ligne, test live explicite, commande complète hors ligne).
- **Limites :** aucun `npm run build`, `npm run test:complete`, test navigateur ni validation clinique exécuté ici. La commande `test:clinical-live` reste disponible séparément et ne doit être lancée qu'avec autorisation explicite.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** dans Codespaces sur `audit-stabilisation-2026-11-10`, exécuter `npm install && npm run test:complete` ; résultat attendu : code de sortie 0. Rapporter toute erreur. Aucun dossier réel ou secret touché.
- **Statut :** configuration corrigée et contrôlée statiquement ; intégration npm non validée. **Suite :** corriger toute erreur de compilation ou de test révélée.


### 2026-11-10 — Retour test Android : dictée ORL
- **Observation réelle (capture utilisateur) :** « audenophagie » au lieu d'« odynophagie », « annexeda » au lieu d'« exsudat » ; suggestion erronée « amygdalien » → « amygdalite ».
- **Correctif :** `be63c039ba7e63bcbe302db4c8058331265390c` dans `src/components/OrbAssistant.tsx` : ajout de deux variantes observées à la liste de suggestions soumises à confirmation ; exclusion de « amygdalien/amygdalienne » du rapprochement phonétique automatique vers un diagnostic.
- **Sécurité :** aucune correction automatique appliquée sans confirmation du médecin ; les mots cliniques non reconnus restent à relire.
- **EN ATTENTE — intervention utilisateur :** dans Codespaces, sur `audit-stabilisation-2026-11-10`, arrêter le serveur si nécessaire, exécuter `git pull origin audit-stabilisation-2026-11-10` puis `npm run test:complete` ; relancer `npm run dev:full` et répéter la phrase fictive sur Android. Vérifier la suggestion « annexeda » → « exsudat », « audenophagie » → « odynophagie » et l'absence de suggestion « amygdalien » → « amygdalite ».
- **Limites :** aucune compilation, test automatisé ou retest Android de ce nouveau commit n'a été effectué au moment de l'écriture. Ne pas fusionner avant validation.


### 2026-11-10 — Android : éviter les fausses corrections des termes déjà corrects
- **Capture réelle :** suggestion « odynophagie » → « dysphagie » (sens clinique différent) et « adénopathies » → « adénopathie » (perte du pluriel). La fin « Annick soudain amical » au lieu de « exsudat amygdalien » reste non résolue.
- **Commit :** `876833862930cbeda2b61632be80d676b4c99a95` ; `src/components/OrbAssistant.tsx` ignore désormais dans la recherche de rapprochement les termes exacts du dictionnaire ainsi que leurs pluriels réguliers.
- **Sécurité :** ne pas accepter les anciennes suggestions affichées ; ne pas inférer automatiquement « exsudat » depuis des mots ordinaires sans correspondance fiable.
- **EN ATTENTE — intervention utilisateur :** sur branche audit, `git pull origin audit-stabilisation-2026-11-10`, puis `npm run test:complete`, redémarrer l'application et dicter la phrase fictive. Vérifier absence des deux fausses suggestions. Réexaminer séparément la reconnaissance de « exsudat amygdalien ».
- **Limites :** commit non compilé/testé sur Android à cette étape. Ne pas fusionner avant validation.


### 2026-11-10 — Correction des majuscules après confirmation vocale
- **Observation Android :** « Disney » corrigé en « Dyspnée » au milieu d'une phrase ; « des adénopathie cervicale » conserve un accord incorrect issu de la reconnaissance.
- **Correctif :** `db95ef93888a076278f37662e0edf670abdb0dd2` (`src/components/OrbAssistant.tsx`) : majuscule conservée uniquement si le mot corrigé se trouve au début de la phrase, et non sur toute entrée reconnue avec majuscule.
- **Choix de sécurité :** aucune correction automatique des accords grammaticaux cliniques ; relire et éditer manuellement « des adénopathie cervicale » si nécessaire.
- **EN ATTENTE — intervention utilisateur :** sur la branche audit, récupérer les commits, exécuter `npm run test:complete`, redémarrer le serveur et vérifier sur Android que « Disney » devient « dyspnée » au milieu de la phrase.
- **Limites :** tests npm et Android de ce commit non exécutés ici. Ne pas fusionner sans vérification.


### 2026-11-10 — Alerte sécurité dictée Android : saturation 97 % devenue 87 %
- **Retour test fictif utilisateur :** phrase source SpO₂ **97 %** ; dictée affichée **87 %**. Autres erreurs : « annexida amygdalite » pour « exsudat amygdalien », pluriels non reconnus.
- **Risque :** altération d'une valeur clinique significative par la reconnaissance vocale du navigateur. Aucune méthode logicielle de post-correction ne peut garantir la valeur prononcée à partir de la seule transcription erronée.
- **Correction limitée :** `6cbdd453db868cfa6e26d11a45dcc369a071978e` ajoute la variante observée « annexida » comme suggestion « exsudat », toujours avec confirmation explicite. Ne pas transformer automatiquement « amygdalite » en « amygdalien ».
- **EN ATTENTE — sécurité clinique :** concevoir une étape de relecture/confirmation explicite des constantes et valeurs chiffrées dictées avant enregistrement, avec signalement des valeurs ambiguës ; ne pas prétendre que la reconnaissance du 97 % est réparée.
- **EN ATTENTE — intervention utilisateur :** récupérer la branche audit, compiler et retester une phrase fictive incluant 97 %, 87 %, 98 %, 78 %, sans patients réels ; vérifier la confirmation « annexida » → « exsudat » et le comportement de la relecture numérique. Pas de fusion tant que la régression clinique critique n'est pas traitée.


### 2026-11-10 — Garde de sécurité des chiffres dictés (SpO₂ 97/87 %)
- **Observation utilisateur :** sur une phrase fictive, la dictée a transformé SpO₂ 97 % en 87 %, et « exsudat amygdalien » en une expression incorrecte. Les chiffres ne doivent jamais être rectifiés par supposition.
- **Commits :** `945a72c6cf13073b94a02525532c7c9d433dcb42` et correctif de syntaxe regex `7e463233345af0a48eb491c1939abefc844859d4`.
- **Modification :** si la dictée contient une valeur clinique numérique, affichage d'un avertissement de relecture et blocage de l'envoi du chat jusqu'à confirmation explicite « J’ai vérifié les chiffres ». En mode commandes vocales, une phrase avec valeur clinique numérique suspend l'exécution automatique et l'écoute, avec message explicite.
- **Limite importante :** détecteur heuristique non exhaustif ; la confirmation n'établit pas la véracité de la valeur ; le texte reste à vérifier par le médecin. Aucune correction automatique 87→97. Le moteur de reconnaissance Chrome reste inchangé.
- **EN ATTENTE — intervention utilisateur :** sur `audit-stabilisation-2026-11-10`, `git pull origin audit-stabilisation-2026-11-10`, puis `npm run test:complete`, `npm run dev:full` et test Android avec une phrase fictive contenant SpO₂ 97 %. Vérifier blocage avant confirmation, correction manuelle possible, puis envoi. Vérifier qu'une commande vocale contenant un chiffre clinique n'est pas exécutée automatiquement.
- **Tests non effectués ici :** build TypeScript, tests npm et test navigateur Android. Ne pas fusionner avant validation.


### 2026-11-10 — Rectification utilisateur : valeur SpO₂ dictée et validation Android
- **Rectification explicite :** l'utilisateur confirme avoir réellement prononcé « 87 % » pendant le test précédemment décrit comme une confusion « 97/87 % ». La transcription « 87 % » était donc **correcte** pour cet essai ; ne pas compter ce cas comme une erreur de reconnaissance des chiffres. Les mentions antérieures de confusion 97→87 sont une hypothèse infirmée par cette précision.
- **Retour utilisateur :** compilation et contrôles fonctionnels demandés déclarés réussis, notamment l'affichage de la confirmation des chiffres. Validation rapportée par l'utilisateur, sans sortie de test ni inspection indépendante dans cette session.
- **Décision :** conserver le garde-fou de confirmation des valeurs numériques comme mesure préventive, sans prétendre qu'une erreur chiffrée a été démontrée. Les erreurs lexicales « exsudat amygdalien » restent ouvertes.


### 2026-11-10 — Réduction des fausses suggestions ORL (amical/amygdalite)
- **Observation Android :** le moteur de reconnaissance Chrome déforme parfois « exsudat amygdalien » en « annexida amygdalite » ou « Annick soudain amical ». Le dictionnaire ne peut pas reconstruire avec certitude un diagnostic ou un signe clinique depuis ces mots.
- **Commit :** `15b25b2e31aac0c064b4c2e55bcfb6b59e6c05dd` ; `src/components/OrbAssistant.tsx` empêche le rapprochement phonétique des mots ordinaires « amical » (et flexions) et des adjectifs « amygdalien » (et flexions) vers un terme médical différent. Aucune modification de prescription ni correction automatique.
- **EN ATTENTE — intervention utilisateur :** `git pull origin audit-stabilisation-2026-11-10`, `npm run test:complete`, redémarrage et dictée de « présence d'un exsudat amygdalien » et « un échange amical » ; contrôler l'absence de suggestion « amical » → « amygdalite », et relire manuellement tout segment non reconnu.
- **Limites :** compilation et test Android de ce commit non réalisés ici. Une reconnaissance plus fiable nécessitera une évaluation de plusieurs alternatives du moteur vocal, sans correction clinique automatique.

### 2026-11-10 — SpO₂ Unicode : garde des valeurs dictées
- **Objectif :** reconnaître « SpO₂ 87 » même sans symbole %, afin de suspendre une commande vocale contenant une valeur chiffrée avant confirmation médicale.
- **Commits :** `2c8da0fef94c5d988f6d5cdcfd8a6e9b69231706` (première tentative), `d9de0a0780477156e422e067f4680f459c859c91` (correction de frontière Unicode) ; fichier `src/components/OrbAssistant.tsx` ; branche audit uniquement.
- **Contrôle 1 :** test Node.js isolé du motif : première tentative **échouée** pour `SpO₂ 87` à cause de `\\b` après le chiffre Unicode en indice ; correction par frontière explicite espace/deux-points, puis **6/6 scénarios fictifs réussis** (`SpO₂ 87`, `SpO2 87`, `SpO₂: 87`, absence de nombre, glycémie, texte ordinaire).
- **Contrôle 2 :** nouvelle lecture du fichier distant après correction : présence du nouveau motif, maintien du blocage de commande chiffrée et de la confirmation ; inspection statique seulement. Aucun changement de prescription ni de donnée patient.
- **Limites :** `npm run build`, `npm run test:all-offline` et Android Chrome non exécutés ; validation intégrée **EN ATTENTE — intervention utilisateur**. Dans Codespaces sur la branche audit : `npm run test:complete`, puis essai fictif « SpO₂ 87 » sans %, vérifier la suspension de commande et la confirmation. Ne pas fusionner avant ces vérifications.


### 2026-11-10 — Dictée ORL : correction confirmée de « ex soudain »
- **Capture utilisateur :** « présence d'un ex soudain amygdalien un échange amical » pour « présence d'un exsudat amygdalien » suivi de « un échange amical ».
- **Commits :** `66f29ca7886619f441085ae20d6a6823459de604`, `91f26711168f585b114ed6c6b7a11fda1795882e`.
- **Modification :** prise en charge d'une suggestion de correction portant sur plusieurs mots (« ex soudain » → « exsudat »), proposée uniquement si un contexte anatomique ORL voisin est présent. Le remplacement complet de la séquence exige un clic explicite du médecin ; les mots « amygdalien » et « amical » restent inchangés.
- **EN ATTENTE — intervention utilisateur :** `git pull origin audit-stabilisation-2026-11-10`, `npm run test:complete`, redémarrage, dictée de « présence d'un exsudat amygdalien » et contrôle du bouton « ex soudain → exsudat ». Vérifier que le clic remplace les deux mots et que « un échange amical » ne déclenche aucune correction indue.
- **Tests :** pas de compilation ou test Android exécuté ici ; ne pas fusionner avant validation.


### 2026-11-10 — Variante dictée « exida »
- **Capture et confirmation utilisateur :** la dictée était terminée, mais le texte affichait « présence d'un exida amygdalien » sans suggestion de correction visible.
- **Commit :** `35a2c6f1802186361adccee37fb2e17d43d1c23a` ajoute l'erreur réellement observée `exida` → `exsudat` au dictionnaire de suggestions confirmées, sans remplacement automatique.
- **EN ATTENTE — intervention utilisateur :** récupérer la branche audit, `npm run test:complete`, redémarrer et dicter « présence d'un exsudat amygdalien » ; si le moteur renvoie « exida », vérifier la présence du bouton « exida → exsudat » et le remplacement après clic.
- **Tests :** compilation et test Android non effectués dans cette session.


### 2026-11-10 — Sélection prudente des alternatives Chrome en dictée ORL
- **Observation utilisateur :** trois dictées successives dans le même champ : « exsudat amygdalite », « excédent amygdalien », « exsudat amygdalien » ; une phrase entièrement exacte sur trois, mais échantillon insuffisant pour une estimation fiable.
- **Commit :** `b6f4eae2e5767dd1ccf2385e278139b16cb4436a` ; la sélection d'alternatives favorise la séquence complète exacte « exsudat amygdalien » **uniquement si Chrome la fournit parmi ses alternatives**. Aucune reconstruction automatique d'un signe clinique absent des hypothèses du moteur vocal.
- **Limites :** bonus lexical heuristique ; peut encore choisir une alternative inexacte. L'utilisateur doit relire avant tout usage clinique. Les corrections manuelles existantes restent actives.
- **EN ATTENTE — intervention utilisateur :** `git pull origin audit-stabilisation-2026-11-10`, `npm run test:complete`, redémarrage, trois essais distincts avec effacement du champ entre essais, captures avant correction. Aucun test npm ni Android exécuté ici.


### 2026-11-10 — Dictée ORL : suggestion contextuelle « excédent amygdalien »
- **Trois essais utilisateur :** deux fois « présence d'un excédent amygdalien », une fois « présence d'un excédent amygdalite », pour « présence d'un exsudat amygdalien ». Aucun essai entièrement exact.
- **Commit :** `8aa358dee924bf3648e731f9416e77d53ce7b56f`.
- **Modification :** si la séquence complète « excédent amygdalien » est présente, HELIOS propose « exsudat amygdalien » ; le clic du médecin remplace les deux mots ensemble. Aucun remplacement automatique de « excédent » isolé ni de « amygdalite », qui peut être un diagnostic réel.
- **EN ATTENTE — intervention utilisateur :** `git pull origin audit-stabilisation-2026-11-10`, `npm run test:complete`, redémarrer, tester « présence d'un exsudat amygdalien » et vérifier la suggestion si Chrome transcrit « excédent amygdalien ». Tester également « un excédent budgétaire » et « amygdalite » pour vérifier l'absence de substitution indue.
- **Tests :** pas de compilation ni de test Android exécutés ici ; conserver la branche de stabilisation isolée de `main`.


### 2026-11-10 — Variante vocale « display » → « dyspnée »
- **Capture utilisateur :** dictée de « patient de 35 ans présentant une odynophagie, une dyspnée, des adénopathies cervicales bilatérales et un exsudat amygdalien » ; Chrome affiche notamment « audinophagie », « display », « adénopathie », « bilatérale », « excédent amygdalien ». Les suggestions odynophagie et exsudat amygdalien apparaissent déjà.
- **Commit :** `a773d3575734f88c5119ff62bbc1587624123a1b` ajoute `display` → `dyspnée` aux suggestions explicitement confirmées par le médecin. Ne corrige pas automatiquement le terme.
- **Risque restant :** « display » est aussi un mot anglais valide ; vérifier le contexte avant de confirmer. Les accords/pluriels restent à relire manuellement.
- **EN ATTENTE — intervention utilisateur :** `git pull origin audit-stabilisation-2026-11-10`, `npm run test:complete`, redémarrage et nouveau test Android avec la phrase clinique fictive. Vérifier la présence et l'application de la suggestion, et qu'aucune correction non confirmée n'est appliquée.
- **Tests :** compilation et test Android de ce commit non réalisés ici.


### 2026-11-10 — Garde-fou ORL « amygdania »
- **Observation utilisateur :** la dictée « patient de 35 ans ... exsudat amygdalien » a donné « annexida amygdania » ; HELIOS semblait proposer « amygdania » → « amygdalite », ce qui confond adjectif anatomique et diagnostic.
- **Commit :** `722e4c5c6b2f2390f3f8d1900cf1c50ce411a2a9` ; les variantes ambiguës « amygdania » et « amygdalia » sont exclues des suggestions phonétiques automatiques. Le texte original reste visible pour correction manuelle.
- **Accords grammaticaux :** « des adénopathie cervicales bilatérale » demeure à relire manuellement. Ne pas corriger automatiquement le nombre d'un terme clinique sans validation.
- **EN ATTENTE — intervention utilisateur :** récupérer la branche audit, `npm run test:complete`, redémarrer, vérifier qu'« amygdania » ne suggère plus « amygdalite » ; vérifier que les suggestions déjà validées restent disponibles.
- **Tests :** non exécutés ici. Ne pas fusionner sur `main` avant validation.


### 2026-11-10 — Accord grammatical des adénopathies : suggestion confirmée
- **Observation Android :** « des adénopathie cervicales bilatérale » au lieu de « des adénopathies cervicales bilatérales ».
- **Commits :** `de0af2a0e301b86b16c8238eace317afe3d582de`, puis réparation du remplacement de séquences `a850c369a5515f57e20643a26cc951520789f5ef`.
- **Modification :** suggestion de remplacement de l'expression complète observée, uniquement après clic « Corriger ». La fonction de remplacement multi-mots utilise la séquence exacte choisie, au lieu d'être limitée à « ex soudain » et « excédent amygdalien ».
- **Sécurité :** ne pas déduire automatiquement le nombre de ganglions d'un texte dicté. Le médecin confirme l'accord et la donnée clinique. Les autres formulations ne sont pas modifiées.
- **EN ATTENTE — intervention utilisateur :** `git pull origin audit-stabilisation-2026-11-10`, `npm run test:complete`, redémarrage, test Android de la suggestion d'accord, puis vérification des corrections « ex soudain » et « excédent amygdalien » qui partagent le même remplacement multi-mots.
- **Tests :** aucune compilation ou exécution Android réalisée ici ; ne pas fusionner avant validation.


### 2026-11-10 — Expression ORL complète « excédent amygdalia »
- **Capture utilisateur :** dictée fictive « ... odynophagie ... dyspnée ... adénopathies cervicales bilatérales ... » correctement reconnue sur ces termes ; « exsudat amygdalien » a été transcrit « excédent amygdalia » sans suggestion.
- **Commit :** `f2b41952b322a890e372b70d7b1c39e1a4ddab21` ; suggestion de remplacement de la séquence complète « excédent amygdalia » par « exsudat amygdalien », uniquement après confirmation explicite du médecin.
- **Sécurité :** pas de remplacement automatique de « excédent », « amygdalia », « amygdalite » ou de tout diagnostic isolé. Les autres mots et données cliniques sont conservés.
- **EN ATTENTE — intervention utilisateur :** récupérer la branche audit, `npm run test:complete`, redémarrer et dicter la phrase de test ; si la variante réapparaît, contrôler la suggestion et le remplacement complet après clic. Vérifier qu'« amygdalite » n'est pas altéré.
- **Tests :** non exécutés ici ; ne pas fusionner sur `main` avant validation.


### 2026-11-10 — Arrêt des correctifs isolés ; consolidation contextuelle et contrôle de non-régression
- **Demande utilisateur :** éviter un cycle sans fin de variantes et effectuer un double contrôle avant de nouveaux tests manuels.
- **Commit :** `8e25c365be26323044ede9331e3411245a8544ff` : les règles d'expressions ORL et d'accord sont regroupées dans `contextualPhrases` au lieu de blocs dupliqués. Ajout de « alexuda amygdalien », « excédent amygdalia », et de l'accord « des adénopathies cervicales bilatérale » comme suggestions confirmées, sans remplacement automatique.
- **Double contrôle statique effectué :** les quatre expressions cibles correspondent aux motifs ; « amygdalite », « un excédent budgétaire » et « des adénopathies cervicales bilatérales » ne déclenchent pas ces motifs. Ce contrôle ne remplace pas l'exécution de l'application.
- **Limite structurelle :** Chrome Web Speech API demeure une reconnaissance générale non spécialisée. Les règles heuristiques ne garantissent pas une transcription médicale fiable ; nécessité d'un corpus de dictées annotées, d'une suite de tests automatisés des suggestions, et à terme d'un moteur ASR médical plus adapté si les performances demeurent insuffisantes.
- **EN ATTENTE :** `npm run test:complete`, validation Android et tests de clic des suggestions. Ne pas fusionner sur `main` avant validation. Aucun test de compilation effectué ici.


### 2026-11-10 — Tests exécutant les fonctions réelles de dictée
- **Commit :** `c6ef5565cc246c0bd8381369a81cb960e0fbb114` : remplacement des tests purement textuels par un banc de tests qui transpile et exécute les fonctions réelles `findMedicalSpeechCorrections`, `applyMedicalSpeechCorrection`, `chooseMedicalSpeechAlternative`, `hasDictatedClinicalNumber` extraites de `OrbAssistant.tsx`, avec le véritable dictionnaire médical.
- **Cas :** expressions ORL fragmentées, corrections des adénopathies, termes non modifiables, nombres SpO₂ et température, négation, alternatives vocales ; vérification du remplacement après confirmation simulée.
- **Limites :** les tests ne simulent ni le navigateur ni l'interface de clic React ; l'extraction par délimiteurs source est un compromis provisoire. À terme, isoler le moteur dans un module TypeScript autonome importable par l'UI et les tests.
- **EN ATTENTE :** exécution `npm run test:complete` sur la branche audit ; corriger toute erreur révélée avant de déclarer les tests réussis. Aucun test npm exécuté dans cette session.


### 2026-11-10 — HELIOS : bonus ORL rétabli pour le classement des hypothèses vocales
- **Objectif :** corriger un motif RegExp littéral qui utilisait `\\b` et `\\s` (antislashs doubles), rendant inopérant le bonus réservé à l'expression « exsudat amygdalien ».
- **Commits :** `25c9b819d4bad349f403d584a6a4a3d906d0cbb0` (code), `8a550b82a2ba6e0daee80631324942aedf743cdd` (régression). **Fichiers :** `src/services/medicalSpeech.ts`, `scripts/test-medical-speech-regression.ts`.
- **Contrôle 1 :** comparaison ciblée du motif avant/après et ajout de deux assertions au test hors ligne existant : priorité à l'expression complète si Chrome la fournit, absence de bonus pour un suffixe de mot.
- **Contrôle 2 :** relecture indépendante des fichiers distants après les deux commits ; quatre cas JavaScript isolés du motif corrigé (expression masculine, féminine, suffixe interdit, terme seul) : **4/4 conformes**. Cela ne constitue pas l'exécution du module TypeScript ni de l'interface.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** le conteneur ne résout pas `github.com` (`git ls-remote` : `Could not resolve host`) ; impossible d'installer/exécuter la suite npm complète dans cet environnement. Aucun test navigateur ni validation médicale effectué.
- **EN ATTENTE — intervention utilisateur :** dans Codespaces sur `audit-stabilisation-2026-11-10`, lancer `npm run test:complete` et communiquer toute erreur ; puis contrôler sur Chrome Android deux alternatives ORL, sans correction automatique. **Prochaine étape :** traiter les échecs réels éventuels avant fusion, puis audit des accès serveur.


### 2026-11-10 — Relais : audit statique des accès API (session 17 h)
- **Branche :** `audit-stabilisation-2026-11-10` ; **point de départ :** `df30a760873bbcf764864706c99bbf4755c46365`. Module : sécurité serveur.
- **Inspection réelle :** `server/index.ts` (lecture GitHub). Routes observées : `GET /api/health`, `POST /api/clinical/analyze`, `POST /api/commands/interpret`, `POST /api/chat`. Les routes POST acceptent des données fournies par le client ; aucun middleware d'authentification ou d'autorisation n'a été identifié dans la déclaration des routes. **Risque critique avant tout déploiement accessible au public :** aucune isolation des utilisateurs n'est démontrée, et les données de consultation peuvent être envoyées au moteur IA. Ce constat est statique, pas un test de pénétration ; vérifier aussi les autres fichiers et l'infrastructure avant conclusion définitive.
- **Contrôle 1 :** inventaire des appels `app.use/get/post` et lecture des signatures ; aucun changement de code exécuté. **Contrôle 2 :** confrontation avec les exigences de rôles et séparation Patient/HELIOS/Guardian : ces garanties côté serveur ne sont pas établies par les routes inspectées. Aucune validation de sécurité globale.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** `npm run test:complete` et tests HTTP hors ligne non exécutés dans ce contexte ; le connecteur GitHub ne lance pas npm. Ne pas considérer la compilation, l'authentification ou la confidentialité comme validées.
- **Prochaine tâche prioritaire indépendante :** définir une politique explicite de non-exposition des endpoints et ajouter des tests HTTP fictifs de refus d'accès ; avant toute implémentation d'authentification modifiant les accès, définir le modèle d'identité et faire valider les changements sensibles. En parallèle, exécuter les tests hors ligne dans Codespaces. **EN ATTENTE — intervention utilisateur :** sélectionner la branche audit, exécuter `npm run test:complete` et transmettre les erreurs ; test microphone Android séparé. Aucun patient réel, secret, paiement ou déploiement manipulé.
- **État :** audit partiel documenté, **non validé** ; aucun correctif de sécurité appliqué, aucun commit de code. Relais : reprendre par les contrôles d'accès et les tests hors ligne.

### 2026-11-10 19 h — Contrat des hypothèses différentielles (relais)
- **Module :** sécurité clinique ; **branche :** `audit-stabilisation-2026-11-10`.
- **Commits :** code `3bbaaf8cd4d1e9c8719fb831176b2fdfdc80cb84`, test `267f8e687e2c73d23b4b564067a94f950ddc25e3`.
- **Fichiers :** `server/index.ts`, `server/ai/test-clinical-regression.ts`.
- **Modification :** exclure les hypothèses IA dont le diagnostic ou l'argument est absent, vide ou de type incorrect ; aucune prescription ni donnée patient modifiée.
- **Contrôle 1 :** relecture ciblée du prédicat et assertion statique ajoutée à la suite existante ; **npm non exécuté**.
- **Contrôle 2 :** essai JavaScript isolé sur cinq entrées fictives (valide, libellé vide, justification vide, justification numérique, null) : une hypothèse valide conservée. Ce n'est ni un test de la route HTTP ni un test médical.
- **EN ATTENTE — BLOCAGE TECHNIQUE :** exécuter `npm run test:complete` et vérifier la CI sur la branche ; aucun succès de build/CI attesté ici.
- **Prochaine tâche indépendante :** examiner les accès aux routes API et les refus d'accès sans activer d'authentification risquant de casser l'application ; préserver la validation médecin et ne jamais déployer.

### 2026-11-10 20 h — Contrat fictif : assignations de patients malformées
- **Module :** tests de sécurité / contrat documentaire ; **branche :** `audit-stabilisation-2026-11-10`.
- **Commit code :** `074ffe015ed02fac457715963e44812e3fd61722` ; fichier `scripts/test-access-decision-contract.mjs`.
- **Changement :** refuser par défaut une liste d'assignations absente ou non-tableau et un identifiant patient vide ; trois scénarios fictifs supplémentaires (15 cas au total). Aucune authentification Express ajoutée : ce contrat reste une simulation, pas une protection effective.
- **Contrôle 1 :** inspection du diff logique, comptage statique des 15 scénarios ; pas d'exécution locale Node.
- **Contrôle 2 :** relecture indépendante du fichier distant après commit : garde `Array.isArray` présent, branche inchangée, CI du nouveau commit initialement en attente (`42881792524`). Ne pas considérer la CI réussie tant que le résultat final n'est pas constaté.
- **Statut :** code versionné, **validation CI en attente** ; aucune validation médicale, aucun test de navigateur ni données réelles.
- **Suite :** contrôler le résultat de la CI du commit, puis auditer l'authentification réellement appliquée aux routes cliniques sans activer de middleware de production.

### 2026-11-10 21 h — Sonde HTTP locale de frontière d'authentification
- **Module :** sécurité API ; **branche :** `audit-stabilisation-2026-11-10` ; **code :** `a3b1e8131a3051031ed22961f191af2e6f467eb4` ; **CI :** `57c19aa0d218c1c703ae750b28705996bb214cb5`.
- **Fichiers :** `scripts/test-local-http-auth-boundary.mjs`, `.github/workflows/medifollow-audit.yml`.
- **Objectif :** lancer Express uniquement en boucle locale avec clés IA désactivées, envoyer trois requêtes fictives et constater si les routes cliniques et vocales répondent avant toute authentification. Attendu actuel : /api/health=200, contexte clinique invalide=400, commande vide=400. Ces codes 400 sans identité sont une **preuve de frontière d'accès absente**, pas un succès de sécurité.
- **Contrôle 1 :** revue du script et du workflow ; aucune requête clinique valide, aucun appel IA voulu, aucun dossier réel, processus enfant arrêté en finally.
- **Contrôle 2 :** relecture de l'intégration CI et contrôle de la portée : uniquement test, aucune modification des routes, pas de fusion/déploiement. **Exécution Node locale non effectuée** ; CI sur le commit final à vérifier avant validation.
- **Statut :** EN ATTENTE — vérification GitHub Actions du commit final ; ne pas déployer sur un réseau accessible à des tiers. Les contrôles 401/403 sont toujours simulés, sans middleware serveur.
- **Prochaine étape :** consulter le job `access-decision-contract` du commit final ; corriger la sonde si échec technique, puis proposer une authentification côté serveur avec stratégie de migration et validation explicite avant activation.

### 2026-11-10 22 h — Sonde HTTP : prévention des faux positifs si port occupé
- **Module :** tests sécurité API ; **branche :** `audit-stabilisation-2026-11-10` ; **commit code :** `ff34a3c42f3ce24cca162ce73ac29da32686203e`.
- **Fichier :** `scripts/test-local-http-auth-boundary.mjs`. Vérification préalable TCP sur 127.0.0.1:3001 : refuser le test si un autre processus occupe le port, au lieu de risquer de tester ce processus par erreur.
- **Contrôle 1 :** relecture distante du script après commit : garde présente, assertions HTTP originales et arrêt du processus conservés. **Contrôle 2 :** deux essais Node isolés de la logique TCP (port libre : false ; port occupé par serveur fictif : true), tous deux conformes ; aucun test Express complet effectué.
- **Limites :** `npm run test:complete`, workflow Actions sur ce commit, tests HTTP complets et Chrome Android non exécutés/confirmés dans cette session. Aucune authentification serveur réelle ajoutée, aucun patient réel, aucun secret ni déploiement. **EN ATTENTE — BLOCAGE TECHNIQUE :** confirmer le job `access-decision-contract` du dernier commit ; si échec, consulter les logs et corriger. **EN ATTENTE — intervention utilisateur :** essais microphone sur Android ultérieurement.
- **Prochaine tâche indépendante :** contrôler le résultat CI de la sonde, puis poursuivre les tests d'accès 401/403 avec données fictives ; aucune activation de middleware sensible sans validation.

### 2026-11-10 23 h — Sonde HTTP : test automatisé du port local
- **Module :** sécurité API / fiabilité CI ; **branche :** `audit-stabilisation-2026-11-10` ; **commits :** `1e085637` (garde extraite), `da5813f` (sonde raccordée), `a2fe020` (test), `b592b68` (CI).
- **Fichiers :** `scripts/port-availability.mjs`, `scripts/test-local-http-auth-boundary.mjs`, `scripts/test-port-availability.mjs`, `.github/workflows/medifollow-audit.yml`.
- **Résultat :** la sonde utilise un garde partagé qui refuse un port occupé ; nouveau test réseau local sur port éphémère, avec occupation puis libération, ajouté au job de CI avant la sonde Express.
- **Contrôle 1 :** exécution Node.js 22 du test isolé dans l'environnement de travail, avec le même contenu de fichiers : PASS (port occupé puis libéré). **Contrôle 2 :** relecture indépendante des quatre fichiers GitHub après écriture ; import, assertion et étape CI présents. Aucun test Express complet ni compilation TypeScript exécuté ici.
- **Limites :** résultat GitHub Actions sur le dernier commit non confirmé ; test local isolé ne prouve pas la sécurité des routes cliniques, l'authentification serveur reste à traiter avant déploiement. Aucun dossier réel, secret, paiement ou appel IA.
- **Reprise :** vérifier le workflow GitHub Actions du commit `b592b68` (job `access-decision-contract`) et, en cas d'échec, consulter les logs ; ensuite poursuivre les tests d'accès réels sur données fictives. **EN ATTENTE — intervention utilisateur :** tests microphone Chrome Android.

### 2026-11-10 23 h 56 — Sonde TCP locale : délai de sécurité
- **Objectif :** éviter un blocage indéfini du contrôle préalable au test HTTP quand un port ne répond ni par connexion ni par refus.
- **Branche :** `audit-stabilisation-2026-11-10` ; **commit code :** `a312e4cc6ca8f62f68b1cc1d1819e2bd55abd083` ; **fichier :** `scripts/port-availability.mjs`.
- **Correction :** délai 1500 ms et résolution unique, avec fermeture du socket ; timeout => port considéré indisponible, sans tenter de tester un service inconnu.
- **Vérification 1 :** copie locale isolée exécutée avec Node : `node --check` réussi, serveur TCP fictif occupé puis libéré : 2/2 assertions réussies.
- **Vérification 2 :** lecture indépendante du contenu GitHub après écriture ; présence du délai, fermeture et protection contre résolution multiple. **Limite :** aucune simulation fiable d'un vrai timeout réseau ; tests intégrés Express et `npm run build` non exécutés.
- **CI :** recherche de statuts sur le SHA précédent : aucun statut ni run PR remonté ; ne pas conclure que GitHub Actions est vert ou rouge.
- **Statut :** correctif versionné, vérification isolée favorable, intégration complète EN ATTENTE — BLOCAGE TECHNIQUE (accès aux résultats CI et environnement npm du dépôt).
- **Suite :** contrôler le workflow `access-decision-contract` sur le dernier commit, puis les tests HTTP de refus d'accès ; aucune activation de protection production ni validation clinique.

### 2026-11-11 00 h 57 — Régression TCP concurrente (données fictives)
- **Branche :** `audit-stabilisation-2026-11-10` ; **commit code :** `cbcc5d76707c6172447a7db82f4864bb716986c0` ; **module :** tests CI / sonde TCP.
- **Fichier modifié :** `scripts/test-port-availability.mjs`. Cinq sondes parallèles doivent refuser un port occupé, trois sondes parallèles doivent accepter le port libéré ; le serveur fictif doit rester ouvert durant les sondes.
- **Contrôle 1 :** `node --check` puis `node test-port-availability.mjs` dans une copie locale isolée des deux fichiers : PASS (8 assertions de sondes et vérification du listener).
- **Contrôle 2 :** second lancement indépendant du test dans la même copie : PASS ; lecture GitHub du fichier commité conforme. **Limite :** ce n'est pas une exécution npm du dépôt complet.
- **CI précédente :** run `42926489358`, SHA `bccc2ecb0486ea5a1c9410050122a35e18d3aae3` (HEAD avant modification), dix jobs terminés en succès, vérifiés par API GitHub ; **ce succès ne couvre pas le nouveau commit**. Vérifier la CI de `cbcc5d7` ou du HEAD documentaire final à la prochaine session.
- **Blocages :** authentification clinique réelle et test Android non validés ; ne pas déployer. **Prochaine étape :** vérifier la CI du HEAD, puis poursuivre les tests d'accès clinique sans toucher à la production.

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

### 2026-11-11 — HELIOS : correction de dictée ORL limitée au contexte
- **Problème :** le mot français « excellent » pouvait être proposé comme « exsudat » sur la base d'indices ORL présents dans une autre phrase. L'approbation d'une proposition risquait ensuite de remplacer plusieurs occurrences dans le compte rendu.
- **Correctif :** `src/services/medicalSpeech.ts` vérifie maintenant la phrase contenant chaque occurrence et une localisation anatomique immédiatement après « excellent ». Même lorsqu'une suggestion est approuvée, les autres occurrences non cliniques restent inchangées. Aucune correction vocale n'est appliquée sans validation du médecin.
- **Régression :** `scripts/test-medical-speech-regression.ts` couvre les phrases multiples, les adjectifs ordinaires, les localisations ORL et la substitution ciblée. Essais uniquement sur texte fictif.
- **Validation :** compilation et tests automatiques GitHub Actions à confirmer pour le nouveau SHA ; aucun test clinique réel, Android ou microphone revendiqué.
- **Coordination :** après publication et résultat CI réel, alerter l'utilisateur. Attendre son message « OK » avant un nouveau lot interactif, sans fusion sur main ni déploiement.


### 2026-11-11 — HELIOS : préserver la position et la cible des négations
- **Branche :** `audit-stabilisation-2026-11-10` uniquement ; `main` inchangée.
- **Objectif :** empêcher le classement des alternatives du navigateur de déplacer « pas de », « absence de » ou de remplacer une cible clinique connue sous négation (ex. toux ↔ dyspnée).
- **Code :** `src/services/medicalSpeech.ts` ; tests : `scripts/test-medical-speech-regression.ts` avec quatre cas fictifs supplémentaires.
- **Sécurité :** une alternative qui améliore la graphie d'un mot inconnu à position de négation inchangée reste autorisée ; aucune auto-correction médicale ajoutée.
- **Validation :** CI GitHub Actions à contrôler après commit ; le navigateur Android et la précision clinique réelle demeurent non validés.

### 2026-11-11 — HELIOS : conserver les termes médicaux déjà reconnus
- **Branche :** `audit-stabilisation-2026-11-10` ; `main` intacte.
- **Problème :** une alternative Chrome plus riche en vocabulaire pouvait évincer un symptôme ou une expression clinique déjà correctement reconnu(e), sans changer les constantes ou négations protégées.
- **Correctif :** `src/services/medicalSpeech.ts` protège les termes simples et expressions médicales exactes présents dans la première hypothèse. Il ne transforme pas de texte brut et ne supprime pas la validation du médecin.
- **Tests :** `scripts/test-medical-speech-regression.ts` ajoute cinq régressions négatives (disparition/substitution de termes médicaux) et deux cas positifs de meilleure dictée, sur données fictives uniquement.
- **Validation :** à confirmer par GitHub Actions après le commit. Les tests de microphone Chrome Android et la validation médicale en situation clinique restent à faire.

### 2026-11-11 — HELIOS : cible connue de négation non remplaçable par mot inconnu
- **Branche :** `audit-stabilisation-2026-11-10`, sans fusion sur `main` ni déploiement.
- **Défaut :** une hypothèse vocale plus riche pouvait remplacer la cible reconnue après « pas de », « absence de » ou « aucune » par un terme inconnu, tout en réintroduisant le symptôme connu ailleurs dans la phrase. Cela pouvait inverser le sens clinique malgré les protections antérieures.
- **Correctif :** dans `src/services/medicalSpeech.ts`, une cible médicale connue après négation doit rester identique au même rang de négation dans l'hypothèse proposée, même si cette dernière cible est inconnue. Une première cible inconnue garde la possibilité d'être corrigée par un meilleur résultat navigateur.
- **Régression :** trois exemples de refus et un exemple d'amélioration sûre dans `scripts/test-medical-speech-regression.ts`. Textes fictifs uniquement ; aucune correction automatique des mots dictés, aucune modification de prescriptions ou de données patients.
- **Validation :** commit atomique code/tests/journal sur la branche audit ; résultat réel GitHub Actions à vérifier sur ce SHA. Tests microphone Chrome Android et évaluation clinique en consultation non réalisés.

### 2026-11-11 — HELIOS : préserver les expressions composées après négation
- **Branche :** `audit-stabilisation-2026-11-10`. Périmètre : sélection des hypothèses de dictée, tests fictifs et journal.
- **Défaut ciblé :** la protection des cibles niées reconnaissait seulement un mot. Les expressions composées `insuffisance cardiaque` / `insuffisance respiratoire`, `infection bactérienne` / `infection virale` et `syndrome coronarien aigu` / `syndrome cérébelleux` pouvaient être interverties malgré leur présence ailleurs dans la transcription.
- **Correctif :** identifier la plus longue expression médicale du dictionnaire juste après chaque négation ; refuser de remplacer une expression reconnue par une autre à cette position. Une amélioration de « disney » vers « dyspnée » reste autorisée si la cible niée ne change pas.
- **Tests :** trois contre-exemples de négation inversée et un exemple positif, sur données fictives. Aucune substitution médicale automatique, aucune ordonnance ni donnée patient réelle modifiée.
- **Vérification :** lancer GitHub Actions sur le SHA de ce commit, contrôler chaque job et la publication du relais `MEDIFOLLOW_CI_RESULT_V1`. Les essais microphone sur Android et la validation clinique réelle restent à effectuer.

### 2026-11-11 — HELIOS : préserver la valeur associée à chaque mesure dictée
- **Branche :** `audit-stabilisation-2026-11-10` ; ni fusion ni déploiement.
- **Défaut ciblé :** la liste des chiffres et unités pouvait rester identique alors que le navigateur proposait une alternative attribuant une valeur à une autre mesure (ex. glycémie 1,2 vs 2,5 g/L ; SpO₂ 97 vs 88 %). Une meilleure note lexicale risquait de favoriser cette permutation.
- **Correctif :** `src/services/medicalSpeech.ts` conserve les associations (libellé clinique reconnu, valeur numérique) pour SpO₂, saturation, glycémie, température, pression systolique/diastolique, fréquence cardiaque et pouls. Une alternative divergente conserve la transcription initiale ; aucune valeur n'est recalculée.
- **Tests :** `scripts/test-medical-speech-regression.ts` ajoute trois régressions de permutation de mesures et un contrôle positif de meilleure dictée, sur cas fictifs uniquement.
- **Validation :** compilation et tests GitHub Actions à vérifier sur le nouveau SHA, et publication du commentaire de relais seulement après confirmation réelle des jobs. Aucun essai de microphone Chrome Android ni validation clinique en conditions réelles.

### 2026-11-11 — HELIOS : préserver les associations médicament–dose–unité en dictée
- **Branche :** `audit-stabilisation-2026-11-10` ; `main` inchangée, aucune fusion ni déploiement.
- **Risque :** les valeurs numériques, unités et noms de médicaments peuvent être conservés tout en échangeant les doses entre molécules dans une alternative vocale mieux notée (paracétamol/amoxicilline, amoxicilline/ibuprofène, paracétamol/acide clavulanique).
- **Correctif :** `src/services/medicalSpeech.ts` préserve la séquence des triplets (nom, quantité, unité) quand une des quatre molécules explicitement listées est suivie d'une dose. L'identification se limite à ces molécules reconnues par le dictionnaire ; aucune règle universelle de prescription n'est revendiquée.
- **Tests :** trois inversions de doses refusées et une amélioration lexicale sûre acceptée dans `scripts/test-medical-speech-regression.ts` avec données fictives. Aucun traitement ni donnée patient modifiés ; les propositions restent sous contrôle médical.
- **Validation attendue :** vérifier le workflow GitHub Actions pour le commit atomique et sa couleur calculée ; absence de tests microphone Android, de validation clinique en conditions réelles et de déploiement.

### 2026-11-11 — HELIOS : préserver le nombre de mentions médicales dictées
- **Branche :** `audit-stabilisation-2026-11-10`, sans toucher à `main`, sans fusion ni déploiement.
- **Défaut :** le classement des hypothèses vocales vérifiait seulement la présence d'un terme clinique. Deux occurrences de « toux », « insuffisance cardiaque » ou « douleur thoracique » pouvaient devenir une seule occurrence, même quand une alternative semblait lexicalement plus riche.
- **Correctif :** `src/services/medicalSpeech.ts` compare le nombre d'occurrences de chaque terme médical déjà reconnu, y compris les expressions du dictionnaire. Une alternative reste admissible si elle conserve toutes les occurrences ; aucune donnée clinique n'est générée automatiquement.
- **Tests :** trois régressions négatives et deux positives sur données fictives dans `scripts/test-medical-speech-regression.ts`.
- **Validation :** vérifier la compilation, les tests et la couleur réelle de la CI du commit. La dictée vocale sur Android et la validation clinique en conditions réelles ne sont pas couvertes.

### 2026-11-11 — HELIOS : sécuriser la dictée des constantes « à / de » et TA/PA en paires
- **Branche :** `audit-stabilisation-2026-11-10`, sans modifier `main`, fusionner la PR ni déployer.
- **Défaut :** des mesures telles que « glycémie à 1,2 g/L », « saturation à 98 % » et « TA 120/80 » n'étaient pas toutes liées explicitement à leur libellé ; une hypothèse alternative pouvait conserver tous les chiffres tout en réattribuant les valeurs à d'autres paramètres.
- **Correction :** reconnaissance du lien libellé–valeur avec « à », « de », « est à/de » ; protection des couples pression artérielle/tension artérielle/TA/PA avec la paire systolique–diastolique séparée par « / » ou « sur ». Toute divergence conserve l'hypothèse initiale. Pas de saisie de mesure automatique.
- **Tests :** quatre inversions bloquées et deux corrections lexicales acceptées sur données fictives dans `scripts/test-medical-speech-regression.ts`.
- **Limites :** protections limitées aux formes reconnues, sans microphone Android ni validation clinique réelle. Contrôle CI sur le SHA final requis.

### 2026-11-11 — HELIOS : préserver la voie attachée à chaque médicament reconnu
- **Branche :** `audit-stabilisation-2026-11-10`, sans modification de `main`, fusion de PR ou déploiement.
- **Défaut ciblé :** les voies orale/IV/rectale/sublinguale pouvaient rester présentes dans le même ordre, malgré leur rattachement à d'autres médicaments (paracétamol, amoxicilline, ibuprofène, acide clavulanique), particulièrement lorsque la dose n'était pas dictée.
- **Correctif :** `src/services/medicalSpeech.ts` conserve les associations (médicament reconnu, voie) pour les expressions immédiatement voisines « voie »/« par voie » et les formes avec dose immédiate. Les autres formulations non reconnues restent hors périmètre ; aucune recommandation thérapeutique n'est ajoutée.
- **Tests :** trois cas inversant l'association médicament–voie sont refusés ; trois corrections lexicales conservant les voies sont acceptées (`scripts/test-medical-speech-regression.ts`). Exemples fictifs, pas de données patient.
- **Validation :** compilation et 11 jobs GitHub Actions à vérifier pour le SHA final. Tests microphone Android et validation clinique réelle non réalisés.

### 2026-11-11 — HELIOS : associer le moment de prise au bon médicament dicté
- **Branche :** `audit-stabilisation-2026-11-10`. `main` inchangée ; pas de fusion ni de déploiement.
- **Risque ciblé :** la comparaison globale des mots « matin », « midi », « soir », « nuit » préservait l'ordre des moments sans garantir leur rattachement aux molécules. Une hypothèse pouvait échanger paracétamol/amoxicilline ou ibuprofène/paracétamol à moments identiques.
- **Correctif :** `src/services/medicalSpeech.ts` préserve les couples (molécule connue, moment de prise dicté) pour les expressions immédiatement voisines `le/chaque matin|midi|soir|nuit`, avec ou sans dose adjacente. Toute divergence conserve la première hypothèse vocale. Pas de prescription automatisée.
- **Tests :** trois inversions refusées et trois améliorations lexicales sûres acceptées sur données fictives (`scripts/test-medical-speech-regression.ts`).
- **Limites :** seuls les quatre noms de médicaments et les formats explicitement reconnus sont couverts ; aucune validation clinique réelle ni essai microphone Android. Vérifier les onze jobs et le relais GitHub sur le SHA final.

### 2026-11-11 — HELIOS : préserver la fréquence associée au médicament dicté
- **Branche :** `audit-stabilisation-2026-11-10` ; `main` inchangée, sans fusion ni déploiement.
- **Défaut ciblé :** le moteur conservait la liste des nombres et des mentions « fois par jour » sans empêcher une alternative d'échanger les fréquences entre deux médicaments, par exemple paracétamol 2 fois/jour et amoxicilline 3 fois/jour.
- **Correctif :** `src/services/medicalSpeech.ts` protège le triplet (molécule reconnue, fréquence, période jour/semaine) dans les formules directement adjacentes « N fois/prises par jour/semaine », avec dose facultative. Les autres formulations restent hors périmètre et la transcription originale prévaut en cas de divergence.
- **Tests :** trois scénarios de permutation refusée et trois scénarios d'amélioration lexicale acceptée, données fictives, dans `scripts/test-medical-speech-regression.ts`. Aucune ordonnance ou donnée patient réelle modifiée.
- **Validation :** vérifier compilation, tests et 11 jobs GitHub Actions du SHA final ; les essais microphone Android et l'évaluation clinique réelle restent nécessaires.

### 2026-11-11 — Déclencheurs cliniques : corriger la normalisation des accents français
- **Branche :** `audit-stabilisation-2026-11-10`, sans fusionner la PR #2, modifier `main` ni déployer.
- **Défaut :** `src/clinical/clinicalTriggers.ts` remplaçait chaque accent Unicode décomposé par un espace après normalisation NFD ; « précordiale » devenait « pre cordiale », « prénatal » devenait « pre natal » et « obstétrique » devenait « obste trique ». Le système d'alertes locales pouvait donc manquer certains motifs explicitement renseignés.
- **Correction :** supprimer les signes diacritiques plutôt que les remplacer par des espaces ; préserver les mots entiers et leurs frontières lors de la comparaison des motifs. Aucun diagnostic n'est posé automatiquement.
- **Tests :** `server/ai/test-clinical-regression.ts` appelle maintenant `detectClinicalSuggestions` directement : douleur précordiale accentuée et décomposée, douleur thoracique témoin, suivi prénatal, consultation obstétrique, deux motifs sans fausse alerte. Sept assertions fonctionnelles nouvelles, données fictives uniquement.
- **Validation :** vérifier le job clinique, la compilation et les 11 jobs GitHub Actions sur le SHA final, ainsi que le commentaire de relais. La pertinence clinique de toutes les alertes et les usages réels doivent encore être évalués.

### 2026-11-11 — Alertes cliniques : intégrer les réponses à l’interrogatoire ciblé
- **Branche :** `audit-stabilisation-2026-11-10`; `main` intacte, aucune fusion ni mise en production.
- **Défaut :** le détecteur local d'alertes analysait les symptômes et les antécédents, mais pas le champ « Interrogatoire ciblé · réponses au copilote ». Il pouvait donc redemander le début, l'irradiation, les symptômes associés et les facteurs de la douleur thoracique déjà documentés par le médecin.
- **Correctif :** ajout facultatif de `targetedInterview` à `detectClinicalSuggestions`, raccordé à `src/pages/Consultations.tsx`. Les éléments de douleur thoracique sont recherchés dans les symptômes et les réponses ciblées ; les antécédents ne sont pas pris pour une histoire de douleur. Le libellé « irradiation » est désormais reconnu. L'alerte prioritaire de douleur thoracique reste active si le motif est présent, même quand tous les détails sont renseignés.
- **Tests :** huit assertions fonctionnelles dans `server/ai/test-clinical-regression.ts`, incluant interrogatoire complet, partiel, douleur signalée uniquement au copilote et absence totale de réponses. Tous les scénarios utilisent des données fictives.
- **Validation :** compilation et onze jobs GitHub Actions, relais de couleur et SHA à contrôler. Les tests automatisés ne constituent pas une validation clinique en conditions réelles.

### 2026-11-11 — Alertes cliniques : distinguer douleur thoracique déclarée et négation explicite
- **Branche :** `audit-stabilisation-2026-11-10`, PR #2 conservée en brouillon, sans toucher à `main` ni déployer.
- **Défaut :** les alertes locales déclenchaient systématiquement `chest-pain` et l'interrogatoire complémentaire dès que les mots « douleur thoracique » figuraient dans le texte, y compris « pas de douleur thoracique », « absence de douleur précordiale » ou « sans oppression thoracique ».
- **Correction :** `src/clinical/clinicalTriggers.ts` évalue chaque occurrence dans sa proposition. Une négation explicite immédiatement avant le terme ne déclenche pas à elle seule une alerte de douleur présente. Toute occurrence positive distincte, tout motif affirmatif ou toute formulation ambiguë maintient l'alerte prioritaire et les vérifications pertinentes. Le reste des alertes reste inchangé ; aucune décision médicale automatique.
- **Tests :** 12 nouveaux scénarios fonctionnels sur `detectClinicalSuggestions` dans `server/ai/test-clinical-regression.ts` : 6 négations explicites et 6 mentions positives, mixtes ou incertaines, sans données patient.
- **Limites :** la détection linguistique est volontairement prudente et n'interprète pas toutes les formes de négation ni l'ensemble du contexte clinique. Valider les 11 jobs GitHub Actions et le relais exact du SHA ; tests réels et revue médicale toujours nécessaires.

### 2026-11-11 — Fiabilité HELIOS : rejeter les réponses IA périmées après changement de dossier
- **Branche :** `audit-stabilisation-2026-11-10` ; aucune modification de `main`, fusion ni mise en production.
- **Défaut ciblé :** une réponse asynchrone obtenue après un changement de patient pouvait encore être traitée si le transport réseau ne respectait pas immédiatement `AbortController`. Risque de réaffichage d'une analyse obsolète dans la consultation affichée.
- **Correctif :** nouvelle garde pure `isCurrentClinicalRequest` dans `src/services/clinicalRequestGuard.ts`. Après la réception du texte de la réponse, `useClinicalReasoning` rejette les résultats d'une requête annulée ou remplacée ; les erreurs d'une requête périmée sont également ignorées. L'analyse en cours est annulée lors du démontage du composant.
- **Tests :** huit assertions hors ligne intégrées à `server/ai/test-clinical-regression.ts`, contrôlant la requête active, remplacée, annulée et absente ainsi que l'intégration effective de la garde dans le hook React. Aucune donnée clinique réelle n'est utilisée.
- **Limites :** contrôles de logique et de contrat logiciel ; des essais d'interface avec changement rapide de patient, navigateur et latence réseau sont requis avant usage réel. Résultat GitHub Actions du commit exact à vérifier.

### 2026-11-11 — HELIOS : ignorer les réponses périmées après modification de la consultation
- **Branche :** `audit-stabilisation-2026-11-10`, `main` intacte ; aucune fusion ou mise en production.
- **Défaut :** la protection de requête vérifiait surtout l'annulation et le changement de patient ; une analyse lente pouvait encore afficher le contexte précédent si les symptômes, le motif ou les constantes changeaient pendant l'attente, ou après désactivation du copilote.
- **Correctif :** `src/services/clinicalRequestGuard.ts` exige désormais la concordance entre instantané clinique initial et instantané courant, ainsi que le maintien de l'activation. `src/hooks/useClinicalReasoning.ts` invalide, annule et vide les réponses en cours sur modification du contexte ; les contrôles sont répétés juste après lecture de la réponse et dans le bloc d'erreur.
- **Tests :** `server/ai/test-clinical-regression.ts` passe à 13 assertions de garde, d'annulation et d'intégration du hook, incluant une modification de l'histoire fictive pendant la requête et une désactivation du copilote.
- **Limites :** tests hors ligne et CI à confirmer sur le commit exact ; aucun test réseau Android, validation clinique, donnée patient réelle ou déploiement.

### 2026-11-11 — Inventaire : refuser intégralement une délivrance avec une ligne invalide
- **Branche :** `audit-stabilisation-2026-11-10` ; aucune fusion, modification de `main`, donnée réelle ni déploiement.
- **Problème :** `dispenseInventoryItems` filtrait les lignes invalides sans bloquer les autres, permettant une déduction partielle de stock avec un succès apparent.
- **Correction :** la délivrance est rejetée entièrement si une seule ligne manque d'identifiant ou comporte une quantité non numérique, nulle, négative ou non finie. Une validation réussie conserve l'allocation par lots FEFO et la détection des doubles délivrances. Aucun mouvement n'est enregistré en cas d'erreur de validation.
- **Régression :** `scripts/test-inventory-dispense-regression.ts` exécute 47 assertions sur le service réel, avec stockage navigateur simulé : onze lignes invalides, demandes vide/insuffisante, allocation entre lots, traçabilité et idempotence.
- **CI :** commande `npm run test:inventory-dispense` intégrée aux tests hors ligne et au job existant « Tests / clinique », sans création de job supplémentaire.
- **Limites :** tests fictifs hors ligne, essais Android, revue des flux de stock et contrôle clinique réel encore nécessaires.

### 2026-11-11 — Inventaire : intégrité des retours et annulations de délivrance
- **Branche :** `audit-stabilisation-2026-11-10` ; `main` inchangée, sans fusion, déploiement ni données patients réelles.
- **Défaut :** le calcul de reliquat avec `Math.max(0, délivré - retourné)` acceptait des mouvements de quantités non finies, négatives ou des retours cumulés supérieurs à la quantité délivrée, pouvant masquer un historique incohérent. L'annulation n'écartait pas non plus les équipements durables enregistrés par erreur comme délivrés.
- **Correction :** `returnDispensedStock` et `cancelDispensedPrescriptionStock` vérifient les quantités de chaque délivrance et de ses retours, ainsi que le cumul, avant toute réintégration. Sur anomalie, refus sans écriture ; l'annulation rejette également les équipements durables.
- **Tests :** dans `scripts/test-inventory-dispense-regression.ts`, sept historiques corrompus testés sur retour et annulation, blocage équipement et multi-lots, plus flux positif retour partiel / annulation / idempotence, pour 56 assertions nouvelles (103 au total). Tests du vrai service avec stockage navigateur fictif.
- **CI :** les tests demeurent intégrés au job « Tests / clinique » ; les onze jobs et le relais PR #2 doivent être vérifiés pour le SHA publié.
- **Limites :** la validation des journaux n'est pas une réparation automatique des stocks historiques. Revue et contrôles en conditions réelles requis avant usage médical.

### 2026-11-11 — Inventaire : bloquer les quantités de lot corrompues avant tout mouvement
- **Branche :** `audit-stabilisation-2026-11-10`, PR #2 en brouillon ; aucun changement de `main` ni déploiement.
- **Défaut :** une sauvegarde importée pouvait contenir une quantité négative, absente, textuelle ou non finie ; la délivrance ignorait certains lots défectueux et les retours pouvaient concaténer un nombre à une chaîne ou dépasser les limites numériques.
- **Correctif :** `src/services/storage.ts` refuse la délivrance si un lot du produit demandé présente un solde invalide. Retours et annulations contrôlent le solde du lot, la somme de plusieurs retours vers un même lot et les dépassements avant toute écriture.
- **Régression :** `scripts/test-inventory-dispense-regression.ts` ajoute 60 assertions fictives et vérifie l'absence d'écriture pour six types de soldes corrompus ainsi que le dépassement numérique (163 assertions attendues au total).
- **Limites :** le service ne répare pas automatiquement les données corrompues. Compilation et onze jobs GitHub Actions à confirmer sur le commit exact ; essais Android et validation réelle nécessaires.

### 2026-11-11 — Inventaire : verrouiller la provenance des retours et l'identité des délivrances
- **Branche :** `audit-stabilisation-2026-11-10` ; `main` et la PR #2 non fusionnée inchangées, aucun déploiement.
- **Défaut ciblé :** un journal importé pouvait lier un retour à une délivrance tout en lui attribuant un autre lot, patient ou identifiant d'ordonnance ; les identifiants de mouvements dupliqués rendaient les réintégrations ambiguës. L'idempotence pouvait masquer une réutilisation d'ordonnance par un autre patient, voire une ligne de délivrance invalide.
- **Correctif :** vérification des identifiants non vides, de l'unicité des mouvements liés, des liens lot/patient/ordonnance entre délivrances et retours ; refus sans modification lors des incohérences. Une délivrance déjà enregistrée n'est reconnue comme telle que pour le même patient et un journal cohérent.
- **Tests :** `scripts/test-inventory-dispense-regression.ts` ajoute 78 assertions sur données fictives : identifiants invalides, conflit de patient, duplications de mouvements et mauvaises références, plus cas nominal. Total attendu : 241 assertions.
- **Validation :** compilation et 11 jobs GitHub Actions à vérifier sur le commit exact ; aucune validation clinique réelle ni sur tablette Android. Aucune réparation automatique d'un historique importé incohérent.

### 2026-11-11 — Inventaire : idempotence stricte des délivrances et contrôle des lots dupliqués
- **Branche :** `audit-stabilisation-2026-11-10`, PR #2 en brouillon ; aucune fusion, changement sur `main`, donnée patient réelle ou déploiement.
- **Défaut :** un second appel pour une ordonnance déjà délivrée retournait `alreadyDispensed: true` dès que l'identifiant correspondait, même lorsque les produits ou quantités avaient changé. Des identifiants de lots dupliqués et des sommes numériques non finies pouvaient également rendre l'allocation ambiguë.
- **Correctif :** `src/services/storage.ts` reconstitue par produit/catégorie et quantité les mouvements de délivrance historiques et ne retourne `alreadyDispensed` que si le patient, la traçabilité et les totaux concordent. Vérification des lots historiques et sélectionnés et des totaux de plusieurs lignes avant toute écriture.
- **Tests :** `scripts/test-inventory-dispense-regression.ts` ajoute 36 assertions de non-régression fictives pour replays identiques, produits/quantités contradictoires, références modifiées, lots dupliqués et sommes débordées (total attendu 277).
- **Limites :** la concordance se fait par nom de produit et catégorie, pas par vérification pharmacologique de dosage ou formulation ; aucun patient réel, test navigateur Android ou validation clinique en situation. Compilation et onze jobs GitHub Actions à vérifier au SHA final.

### 2026-11-11 — HELIOS : supprimer le rappel « histoire manquante » lorsque l'interrogatoire ciblé est rempli
- **Branche :** `audit-stabilisation-2026-11-10`. Aucun changement de `main`, aucune fusion de PR #2 ni déploiement.
- **Défaut :** une consultation fictive avec `symptoms` vide mais des réponses documentées dans `targetedInterview` recevait encore une invitation à renseigner l'histoire de la maladie, créant une saisie redondante.
- **Correction :** `src/clinical/clinicalTriggers.ts` prend en compte le champ `targetedInterview` avant de signaler ce manque. Les réponses vides ou composées d'espaces ne masquent pas l'alerte. Les autres alertes, notamment les douleurs thoraciques prioritaires, ne sont pas modifiées.
- **Tests :** six cas fonctionnels fictifs ajoutés à `server/ai/test-clinical-regression.ts` : réponses ciblées présentes, vides/blanches et symptômes déjà présents.
- **Validation :** compiler et vérifier les 11 jobs GitHub Actions sur le SHA exact ; essais d'interface Android et revue clinique nécessaires.

### 2026-11-11 — Constantes cliniques : reconnaître la pression artérielle avec unité mmHg
- **Branche :** `audit-stabilisation-2026-11-10`, `main` inchangée, PR #2 non fusionnée, aucun déploiement.
- **Défaut :** `Number('140 mmHg')` renvoie `NaN` : le déclencheur existant « pression artérielle à recontrôler » n'était pas proposé lorsque l'unité était saisie.
- **Correction :** `src/clinical/clinicalTriggers.ts` accepte les chiffres avec virgule ou point, suivis facultativement de `mmHg` ou `mm Hg` ; les textes non entièrement numériques et les valeurs combinées comme « 140/90 » dans un seul champ ne sont pas interprétés.
- **Tests :** huit cas fictifs ajoutés à `server/ai/test-clinical-regression.ts` : seuils avec unités, décimales, valeurs sous seuil, formats invalides et champs vides.
- **Limites :** alerte indicative sur un seuil déjà existant, pas de diagnostic automatisé. Tests de compilation et 11 jobs CI à confirmer sur ce SHA, puis essais cliniques réels nécessaires.

### 2026-11-11 — Coordination : tableau de productivité et lots sans doublons
- **Branche :** `audit-stabilisation-2026-11-10`, PR #2 conservée en brouillon ; aucun changement de `main` ni déploiement.
- **Livrable :** `docs/QUICK_WINS_ROADMAP.md`, liste des deux corrections distinctes déjà confirmées par onze jobs CI chacune, des petits lots à privilégier, des prérequis Android et des travaux de sécurité complexes différés.
- **Objectif :** ne pas répéter un lot déjà validé, choisir d'abord un lot simple vérifiable, conserver le SHA exact et visualiser la productivité.
- **Limites :** planification documentaire uniquement ; aucune exécution automatique en arrière-plan et aucune autorisation de données réelles.

### 2026-11-11 — QW-003 : proposition vocale « ex soudain » limitée à son contexte ORL
- **Branche :** `audit-stabilisation-2026-11-10` ; PR #2 en brouillon, aucune fusion sur `main`, aucun déploiement ou donnée réelle.
- **Défaut nouveau :** la proximité d'un site anatomique dans la phrase suivante pouvait suggérer « exsudat » pour un « ex soudain » non médical. Après confirmation, la substitution pouvait également modifier une occurrence identique dans une autre phrase.
- **Correctif :** `src/services/medicalSpeech.ts` limite la suggestion à un site ORL situé juste après l'occurrence, dans la même proposition, et vérifie ce critère pour chaque remplacement approuvé.
- **Tests fictifs :** `scripts/test-medical-speech-regression.ts` ajoute 2 contrôles négatifs de contexte, un contrôle positif « sur les amygdales » et 2 assertions sur une note mixte (5 nouveaux contrôles).
- **Limites :** suggestion uniquement, sans correction automatique ; aucun test de microphone Android ni évaluation clinique réelle. Le SHA final et les 11 jobs GitHub Actions doivent être vérifiés.

### 2026-11-11 — QW-004 : vider les réponses ciblées après sauvegarde de consultation
- **Branche :** `audit-stabilisation-2026-11-10` ; PR #2 brouillon conservée, `main` intacte, aucune donnée patient réelle ni mise en production.
- **Risque distinct :** `src/pages/Consultations.tsx` vidait le patient, le motif, les symptômes et les antécédents après enregistrement, mais conservait `targetedInterview`, exposant à la réutilisation involontaire des réponses de la consultation précédente.
- **Correction :** effacer `targetedInterview` uniquement après `saveConsultation` réussi, avec les autres champs ; conserver le brouillon en cas d'échec de sauvegarde.
- **Tests :** quatre contrôles structurels ajoutés aux tests cliniques hors ligne (position de l'effacement, succès obligatoire, absence d'effacement avant succès). À compléter par essai manuel de deux patients fictifs dans le navigateur et sur Android.
- **Validation :** vérifier compilation et les onze jobs Actions pour le SHA final ; la réussite CI ne prouve pas la confidentialité en conditions réelles.

### 2026-11-11 — QW-005 : lecture vocale ponctuelle et confidentialité de l'Orb
- **Branche :** `audit-stabilisation-2026-11-10` ; aucune fusion, aucune modification de `main`, pas de données réelles, dépense ou déploiement.
- **État antérieur :** lecture automatique après opt-in et bouton « Stop parole » déjà présents. Ne pas les redévelopper.
- **Ajout ciblé :** bouton accessible « Lire cette réponse » sur les messages de MediFollow, indépendamment de la lecture automatique, avec confirmation de confidentialité pour chaque lecture et désactivation si synthèse vocale absente.
- **Sécurité :** la lecture manuelle arrête la reconnaissance microphone et son redémarrage automatique ; fermer le panneau par la croix, le bouton Orb ou ouvrir le copilote complet arrête désormais parole et écoute.
- **Régression :** 6 vérifications de contrat React/TSX hors ligne ajoutées à la suite `test:medical-speech`, plus styles de focus clavier. Aucun test d'interaction navigateur ou Android exécuté dans le lot ; vérification humaine de l'audio et du focus nécessaire.
- **Validation :** compilation et 11 jobs GitHub Actions sur le SHA exact à confirmer.

### 2026-11-11 — QW-006A : refuser toute commande vocale résiduelle après erreur du navigateur
- **Branche :** `audit-stabilisation-2026-11-10`, PR #2 conservée en brouillon ; pas de fusion sur `main`, aucun déploiement, aucun patient réel ni dépense.
- **Défaut distinct :** `recognition.onerror` désarmait uniquement certains codes d'erreur et dépendait de `onend` pour libérer l'écoute. Dans un navigateur émettant une erreur inconnue après une transcription, `onend` pouvait encore tenter d'exécuter l'ancien texte.
- **Correction :** toute erreur devient terminale immédiatement : session invalidée, commandes et micro désarmés, transcription de commande abandonnée, écoute visuelle arrêtée et `recognition.abort()` protégé. L'éventuel `onend` tardif est ignoré. Le texte saisi dans le chat n'est pas effacé.
- **Régression :** six vérifications structurelles du gestionnaire React réel dans `scripts/test-medical-speech-regression.ts`, incluses à la CI existante « Tests / dictee-helios ».
- **Limites :** pas de test sur le système de permissions ou le matériel Android ; QW-006B reste en attente d'un essai manuel avec données fictives.
- **Validation :** vérifier les 11 jobs GitHub Actions sur le SHA exact après publication.

### 2026-11-11 — QW-006C : empêcher la lecture vocale tardive après fermeture
- **Branche :** `audit-stabilisation-2026-11-10` ; aucune fusion sur `main`, pas de données réelles, déploiement ou dépense.
- **Défaut distinct de QW-005 :** fermer l'Orb arrêtait une lecture en cours, mais une réponse HTTP asynchrone reçue *après la fermeture* pouvait relancer la synthèse vocale, éventuellement après réouverture du panneau.
- **Correctif :** `OrbAssistant.tsx` suit l'ouverture/fermeture via un ref synchronisé immédiatement, capture la génération vocale au départ des requêtes et refuse toute lecture tardive si le panneau est fermé ou si la génération a été invalidée par un arrêt/une fermeture. Les lectures ponctuelles explicites restent disponibles.
- **Tests :** six vérifications de contrat du composant réel dans `scripts/test-medical-speech-regression.ts` ; pas de simulateur Chrome ou Android, ni de données patients réelles.
- **Validation :** CI GitHub Actions à vérifier (11 jobs, commit exact) ; test fonctionnel sur Android à réaliser dans QW-006B.

- **Réparation du test QW-006C avant validation :** le premier run de `12fc188` a signalé une assertion de contrat obsolète (la condition de lecture manuelle est restée identique mais l'instruction `if` est désormais précédée du contrôle de panneau). L'assertion recherche la condition fonctionnelle sans dépendre de sa position. Le code produit n'est pas modifié ; réexécuter les 11 jobs sur ce nouveau SHA, ignorer le run rouge antérieur.

### 2026-11-11 — QW-009 : ne pas manquer les douleurs thoraciques au pluriel
- **Branche :** `audit-stabilisation-2026-11-10`. PR #2 en brouillon, aucun changement sur `main`, aucune donnée réelle ni déploiement.
- **Défaut distinct :** l'alerte prioritaire locale reconnaissait les formes thoraciques singulières mais pas toutes les formes plurielles (« douleurs thoraciques », « douleurs précordiales », « oppressions thoraciques », « thoracalgies »).
- **Correction :** élargissement ciblé de l'expression de recherche des symptômes, avec prise en compte de « aucuns » / « aucunes » dans les négations explicites. Les négations restent non déclenchantes et une mention positive indépendante reste prioritaire.
- **Tests :** 11 scénarios fictifs dans `server/ai/test-clinical-regression.ts` (5 mentions positives, 5 négations, 1 mention indépendante) ; les tests historiques doivent rester réussis.
- **Limite :** détection textuelle indicative seulement, sans certification de sécurité clinique, test Android ou usage sur patient réel ; vérifier les 11 jobs Actions sur SHA final.

### 2026-11-11 — QW-010 : précision du rappel d'antécédents structurés
- **Branche :** `audit-stabilisation-2026-11-10`; PR #2 en brouillon, aucune fusion de `main`, aucun déploiement ni donnée patient réelle.
- **Défaut distinct :** une liste d'antécédents contenant une ligne vide ou un traitement sans nom suffisait à masquer le rappel « antécédents à vérifier » ; inversement une rubrique gynéco-obstétricale renseignée n'était pas prise en compte.
- **Correction :** seules les étiquettes/détails non vides des éléments structurés, les noms non vides des traitements, les textes libres et les rubriques gynéco-obstétricales effectivement renseignées comptent comme informations présentes. Pas de changement de stockage.
- **Tests :** 9 cas fictifs dans `server/ai/test-clinical-regression.ts` (dossier vide, lignes blanches, contexte gynéco documenté, traitements nommés ou non, champ consultation).
- **Limite :** correction de cohérence d'interface, non-validation clinique réelle ; compilation et 11 jobs GitHub Actions à vérifier sur le SHA final.
