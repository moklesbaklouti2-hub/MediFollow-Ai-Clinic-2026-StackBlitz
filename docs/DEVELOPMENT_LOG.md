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
