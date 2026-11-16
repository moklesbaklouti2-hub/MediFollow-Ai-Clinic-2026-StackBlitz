# MediFollow AI — GitHub Sandwich Relay

**Cadre partagé de coordination par fichiers.** Cette branche est indépendante de `main`, de la branche Premium et de la PR #6. Aucun déploiement ou agent automatisé n'est activé par ces documents.

## Architecture proposée
1. **Claude — PLAN** : produit une proposition argumentée pour UN lot. `CYCLES/<lot>/PLAN_CLAUDE.md`.
2. **ChatGPT — SCOPE/GATE** : contrôle le plan, le HEAD, le périmètre, les conflits et les risques ; autorise ou refuse le passage. Conserve la décision et les références de PR dans `STATUS.json` ou les commentaires du ticket GitHub.
3. **Codex — IMPLEMENT/TEST** : crée sa branche depuis le SHA de référence autorisé, produit une PR en brouillon et les tests ; publie `CYCLES/<lot>/RESULTAT_CODEX.md` ou un commentaire sur la PR.
4. **Claude — REVIEW** : lit le diff réel au SHA exact, produit `CYCLES/<lot>/AUDIT_CLAUDE.md` : ACCEPTER / CORRIGER / INCOMPLET + preuves, et **n'a pas la permission de fusionner**.
5. **ChatGPT — GATE** : vérifie les résultats externes réels (11 jobs au HEAD exact, tests, revue) et décide : CORRIGER sur la même PR ou passer au lot suivant.

## Limite fondamentale des comptes actuels
- Le **connecteur GitHub de Claude web sert à lire des fichiers**, non à publier automatiquement un fichier GitHub. Une réponse de Claude Free doit être transmise via utilisateur, ou via un outil/agent Claude autorisé à écrire sur GitHub.
- **Le simple changement d'un fichier GitHub ne déclenche pas automatiquement cette conversation ChatGPT**, ni une nouvelle tâche Codex Cloud. Un déclencheur externe/une automation compatible serait requis.
- L'action Claude Code pour GitHub nécessite une authentification compatible ou des crédits API ; ne pas prétendre qu'elle fonctionne gratuitement avec Claude Free.
- **Ce relais est un registre et une méthode coordonnée, pas une connexion ChatGPT↔Claude autonome déjà active**.
- Les documents marqués comme « texte de Claude » mais committés par ChatGPT sont des **transcriptions du contenu fourni par l'utilisateur**, et non une preuve d'identité/authorship Claude.

## Règles de sécurité et de concurrence
- Une seule branche Codex par lot ; jamais de modification, fusion ou push vers `main`.
- Changement de HEAD => audits/tests précédents OBSOLÈTES jusqu'à revalidation sur le nouveau SHA.
- Aucun code de traitement de patients réels ni donnée clinique réelle, secret API, identifiant personnel, token ou lien signé dans les fichiers.
- Aucun déploiement, aucune dépense, aucun service ou workflow supplémentaire sans autorisation.
- Résultats des tests : distinguer « vérifiés via GitHub » et « rapportés par Codex/Claude ».
- Si un des trois fichiers requis manque ou est obsolète, l'état du lot est **EN ATTENTE**, jamais VERT.
- La PR ne peut pas être fusionnée sur une simple affirmation ou en raison du seul succès des tests.

## États du lot
`PLAN_REQUIS` → `PLAN_RECU` → `DEVELOPPEMENT_AUTORISE` → `CODEX_TERMINE` → `AUDIT_CLAUDE_REQUIS` → `CORRECTIONS_REQUISES` (retour à Codex) ou `GATE_CHATGPT` → `VALIDATION_HUMAINE` → `TERMINE`.

## Lot en cours
- SWC-001 / PR #6 : le premier audit Claude a exigé une correction, puis Codex a poussé un autre HEAD. **Réaudit Claude requis sur le nouveau HEAD**, pas lancement d'un lot suivant.
- Protocole initial : https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/issues/3
- PR source : https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/pull/6

## Mode d'emploi sans paiement supplémentaire
Claude web reçoit le lien immuable vers le fichier et le SHA via une conversation ; sa réponse est retranscrite dans le dossier du lot par un acteur GitHub autorisé (ChatGPT/Codex) ; Codex lit ensuite ces fichiers dans son environnement cloud. Cette méthode réduit le copier-coller mais ne l'élimine pas totalement pour Claude Free.
