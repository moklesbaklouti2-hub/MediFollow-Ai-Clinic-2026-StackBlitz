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
