# Cabinet chaleureux A — relais nocturne

Demande du propriétaire le 17 novembre 2026 : « COMMENCER LE TRAVAIL AUTOMATIQUE JUSQUA DEMAIN MATIN ».

## Périmètre autorisé

- Dépôt : `moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz`.
- Branche unique de travail : `codex/cabinet-chaleureux-a-global`, PR #18 **en brouillon**.
- Charte approuvée : [Cabinet chaleureux A](../cabinet-a-global/CHARTE-A.md), Confort 16/48 px, clair/sombre et navigation adaptative.
- Poursuivre les corrections techniques, d’accessibilité et de débordement dans cette charte. Préserver valeurs, sauvegardes, commandes vocales et règles cliniques.
- Les variantes [A1/A2/A3](../cabinet-a-navigation-choices/README.md) sont **des propositions non approuvées**. Leur CSS n’est pas importé par l’application. Ne pas en choisir une sans réponse explicite du propriétaire.
- Aucune nouvelle direction graphique, nouvelle fonction médicale, modification de main/Premium/SWC-001/PR #6/PR #17, fusion, déploiement, dépense, appel IA payant, secret ou dossier réel.
- Ne pas réactiver les anciennes automatisations ni commencer un autre lot. Pas de sous-agents. Les tests de voix restent hors ligne et n’activent pas le microphone.

## Reprise de chaque session

1. Lire ce fichier et [JOURNAL.md](JOURNAL.md). Consulter la PR #18 et ses retours réels ; un retour n’autorise pas un changement hors périmètre.
2. Vérifier le HEAD distant, la branche locale, le statut et les commits récents. Conserver les changements existants ; aucun reset destructif, force-push ou écrasement. Si le checkout manque, récupérer cette branche dans `/workspace`, jamais main.
3. Réutiliser le travail testé. Choisir la prochaine tâche restante utile ; ne pas refaire une tâche achevée pour remplir une session.
4. Si un autre travail est en cours sur les mêmes fichiers, éviter toute écriture concurrente. Revérifier le HEAD distant immédiatement avant de pousser ; un rejet de concurrence impose une nouvelle inspection.
5. Faire les corrections avérées et limitées, les vérifications pertinentes, puis une seconde passe sur les effets de bord. Un blocage d’outil ou un test physique non disponible ne devient jamais un succès.
6. Commits réversibles, sans fusion, sur la même branche ; journal avec preuves et liens. Conserver la PR #18 en brouillon et son descriptif à jour. Ne publier aucun message ou demande de revue à un tiers.

## File de travail finie

| Tâche | Travail utile | Critère de sortie |
|---|---|---|
| Métadonnées | Langue française et titre de l’application | Achevé dans `51078393c7889724c0c84c65c7e4eaad21db445a`, voir journal. Ne pas refaire. |
| Accessibilité | Vérifier navigation clavier, titres, labels, focus et annonces sur les huit pages réelles, avec fixtures fictives | Défauts avérés corrigés sans nouvelle direction graphique, ou limites documentées ; pas de revendication WCAG complète. |
| Responsive | Contrôler les frontières 700/701 px et les formats intermédiaires, portrait/paysage, textes fictifs longs et absence de recouvrement des champs par l’assistant | Pas de débordement horizontal ou de perte de champ ; cibles et lisibilité conformes à la charte, corrections testées. Le choix du nouveau menu reste en attente. |
| Documents | Vérifier une ordonnance fictive courte puis longue, clair/sombre, PDF A4, ordre et présence de toutes les lignes | Contenu non tronqué, pagination lisible ; sans délivrance ou modification de stock. Ne pas prétendre avoir testé une imprimante physique. |
| Stabilité | Vérifier les erreurs navigateur et les parcours pertinents après correction ; observer le composant 3D sans réécrire ses services ou le comportement vocal | Pas de régression constatée. Les problèmes nécessitant une décision majeure ou un appareil réel restent explicitement en attente. |
| Livraison | Relire le diff ; exécuter `npm run test:complete` et les vérifications ciblées après les changements qui le justifient ; conserver les preuves correspondant aux sources effectivement testées | SHA exact, résultats réels, captures si UI modifiée, journal et PR à jour. Aucun « CI vert » sans exécution réelle du HEAD. |

## Tests et preuves

- Réutiliser les scripts de `docs/cabinet-a-global/` comme références ; leurs anciennes captures et journaux sont des preuves **historiques**. Ne pas les écraser pour les faire correspondre à un autre code.
- Enregistrer les nouvelles preuves dans un dossier daté distinct sous `docs/cabinet-a-night/`. Pour un nouveau code, adapter explicitement la référence du nouveau harnais, sans contourner les contrats cliniques.
- Les fixtures de `docs/cabinet-a-global/fixtures.py` sont entièrement fictives et bloquent les requêtes externes et `/api/`. Utiliser des contextes neufs. Garder ce blocage pour les nouveaux contrôles navigateur.
- Les scripts existants attendent Chromium et, pour les PDF, `pdfinfo`/`pdftotext`. Si indisponibles, documenter le manque et poursuivre le travail indépendant ; ne pas inventer un test visuel.
- Une modification de code nécessite les tests pertinents. Les mêmes tests ne sont pas relancés en boucle si rien n’a changé et qu’aucune incertitude nouvelle ne le justifie.
- Les workflows actuels ne ciblent pas cette branche expérimentale. Lire les runs via `/actions/runs?head_sha=<SHA>` et les check-runs du SHA exact ; zéro exécution n’est pas un succès de CI. Ne pas déclencher de workflow ou modifier sa configuration pour fabriquer un résultat.

## Fin et compte rendu

Les reprises prévues couvrent la nuit du 17 au 18 novembre 2026, avec une clôture approximative vers **8 h, Africa/Tunis**, sous réserve des quotas et de la disponibilité de l’environnement. Il s’agit de sessions programmées, pas d’une exécution continue garantie.

Quand les tâches réalisables sont terminées, ne pas inventer du travail : consulter seulement d’éventuels nouveaux retours autorisés et préparer le bilan. Au passage final du matin, fournir les commits réels, tests et limites, liens PR/journal/captures, choix graphiques en attente et état réel de CI. Après cette fenêtre, aucune nouvelle modification ; pas de continuation automatique les jours suivants.

Les rapports restent dans l’historique de l’automatisation et le journal GitHub. Ne pas promettre une notification Android ni un message direct dans une autre conversation. L’audit indépendant du Council reste distinct des vérifications de l’agent.
