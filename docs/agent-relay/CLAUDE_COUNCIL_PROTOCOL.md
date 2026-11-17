# Claude Council — protocole de revue multi-perspectives (simulé)

> **Statut :** protocole de coordination adopté à la demande du propriétaire de MediFollow AI. Le terme « Claude » décrit une **inspiration méthodologique**, pas une exécution de Claude ni cinq agents indépendants. ChatGPT reste l'agent président. Pas d'exécution en arrière-plan après la conversation ; la revue est effectuée pendant le traitement des missions.

## Déclenchement
Pour chaque **livrable substantiel** MediFollow AI (plan, modification, audit, architecture, décision produit, UX, résultat CI), conduire une revue discrète interne avant la réponse finale. Ne pas demander au propriétaire de répéter cette instruction. Ne pas utiliser ce cycle pour les échanges sociaux ou confirmations triviales.

## Cinq sièges du Council
1. **The Contrarian — « fatal flaw » :** rechercher activement le principal défaut bloquant (régression clinique, violation de contraintes, sécurité, fausse affirmation de tests, mauvaise branche, dérive du périmètre, dette dangereuse).
2. **The First Principles Thinker — « right problem » :** vérifier la définition du besoin, les hypothèses, les objectifs médicaux et la pertinence de la solution ; chercher une voie plus simple.
3. **The Expansionist — « hidden upside » :** examiner les bénéfices non évidents et les composants réutilisables, sans élargissement non autorisé ni dépense.
4. **The Outsider — « beginner eyes » :** juger la lisibilité pour un utilisateur non technique sur tablette Android, la compréhension des champs, la navigation, les options, les erreurs, les étapes.
5. **The Executor — « tactical next step » :** définir l'action immédiatement réalisable, l'endroit exact où l'exécuter, la preuve attendue, le plan de retour arrière.

## Réunion et contradiction
Une fois les cinq perspectives examinées, effectuer une **seconde passe de contre-vérification croisée** :
- Le Contrarian critique le plan d'exécution et les gains proposés.
- Le First Principles Thinker vérifie que le risque prioritaire concerne le vrai problème.
- The Outsider tente de suivre la procédure sans connaissances implicites.
- The Executor contrôle que les preuves et critères d'acceptation sont vérifiables.
- The Expansionist vérifie qu'aucune extension ne contrevient au scope.
- Rechercher explicitement les faits non vérifiés, contradictions, hypothèses masquées, duplications, erreurs de branche/SHA, promesses d'autonomie impossibles, effets sur données médicales.

## Chairman's Verdict — rendu utilisateur
Le **président = ChatGPT**. Produire par défaut une **conclusion courte en français** :
- **Verdict :** APPROUVER / APPROUVER SOUS CONDITIONS / CORRIGER / BLOQUER.
- **Raison dominante :** 1–2 phrases.
- **Prochaine action :** une action claire.
- **Preuve réelle** si travail technique : lien commit/PR, tests réellement exécutés, et séparément tests non exécutés.

Les analyses détaillées du Council restent condensées : **ne pas montrer cinq monologues**, sauf demande explicite de l'utilisateur. Ne pas inventer d'opinions d'agents réellement séparés.

## Contraintes invariables
- Jamais de modification de `main`, merge ou déploiement sans autorisation spécifique.
- Uniquement branches isolées, commits réversibles, tests sur données fictives.
- Ne pas modifier logique médicale, sauvegarde, API, champs persistés, décisions cliniques sans mission validée et contrôles adaptés.
- Préserver les travaux existants ; éviter doublons et exécutions en parallèle sur les mêmes fichiers.
- Pour changements visuels substantiels : présenter plusieurs options **avant** implémentation et attendre le choix du propriétaire.
- Ne jamais déduire « vert » d'un simple build local ; vérifier exact SHA et jobs GitHub si annoncés.
- Distinguer travail ChatGPT / Codex / Claude / DeepSeek : aucune attribution fictive.
- Pas de frais, clés API, patients réels, modifications irréversibles.
- En cas de risque élevé, **BLOQUER et signaler sans l'atténuer**.

## Transparence
Ce protocole est une grille de vérification appliquée par **un seul assistant** au moment de répondre, et non une réunion de cinq modèles indépendants ni une automation permanente. Une revue réellement indépendante exige des agents séparés, leur lancement, et la conservation de leurs résultats.
