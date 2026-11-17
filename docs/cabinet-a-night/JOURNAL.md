# Journal des finitions de Cabinet chaleureux A

## 17 novembre 2026 — préparation et première correction

- Demande : reprendre, puis travailler automatiquement jusqu’au lendemain matin, dans le périmètre existant.
- PR #18 vérifiée : ouverte, brouillon, aucun commentaire, aucune revue ni annotation au moment du contrôle. PR #17 inchangée. Départ : `37f65c0e1c491f36ec1aad681eb3a31689c729f4`.
- Correction avérée : `index.html` annonçait `lang="en"` et le titre « Vite + React + TS ». Langue désormais `fr`, titre « MediFollow AI — Espace clinique ».
- Commit applicatif : `51078393c7889724c0c84c65c7e4eaad21db445a`. Aucun fichier sous `src/`, `server/` ou `scripts/` modifié par cette correction.
- Première passe : diff relu ; `npm run test:complete` **réussi, code 0**, build inclus ; `npm run test:warm-design` **réussi, code 0**. Journaux dans [logs](logs/).
- Seconde passe dans Chromium : 24 contextes neufs, titre et langue réellement lus dans le DOM, snapshots cliniques identiques, aucune erreur de page ou débordement horizontal détecté. Données fictives, appels externes/API bloqués. [Mesures](../cabinet-a-navigation-choices/metrics.json), [journal navigateur](logs/navigation-preview.log).
- Finitions préparées : 6 captures du menu actuel et 18 captures des propositions A1/A2/A3 (trois formats, deux thèmes). Ces variantes sont injectées dans le navigateur pour comparaison et **non appliquées à l’interface**. [Choix illustrés](../cabinet-a-navigation-choices/README.md).
- Observation : Paramètres nécessite un défilement du menu actuel à 1280×800 ; A1 le fixe, A2/A3 rendent les huit destinations visibles dans les formats essayés. Cela reste un choix graphique du propriétaire.
- Limites : aucune tablette Android physique, microphone ou imprimante physique testés. Aucun audit indépendant du Council reçu. Aucune fusion, aucun déploiement, coût ou donnée réelle.
- Automatisation créée et activée, confirmation de l’outil le 17 novembre à 23 h 30 (Africa/Tunis). Reprises horaires programmées du 18 novembre à 0 h jusqu’à environ 8 h, avec horaires flexibles et date de fin explicite. Prochaine occurrence annoncée : 0 h. Héritage de l’environnement du fil configuré ; les détails d’attachement ne sont pas fournis par le service. Aucun passage futur n’est annoncé comme déjà exécuté. Aucun identifiant privé d’automatisation publié.
- Reprise prioritaire : audit clavier/labels/titres des huit pages, puis frontières responsive et documents longs selon [RUNBOOK.md](RUNBOOK.md). Ne pas appliquer A1/A2/A3 avant le choix du propriétaire.

## 18 novembre 2026 — session nocturne 01 achevée

- Départ distant/local : `4beca9265513217b90687846cfe280e38ce2b6a5`, arbre initial propre, PR #18 en brouillon. Aucun retour publié au contrôle initial.
- Commit applicatif testé : **`2ccebfb5cabc46f90259618719f48036ad0078c6`**. Quatre fichiers : `src/cabinet-a.css`, `src/index.css`, `src/pages/Prescriptions.tsx`, `scripts/test-cabinet-a.tsx`.
- Corrections : retour à la ligne des textes longs dans les cartes ; région persistante d’annonce des messages d’ordonnance ; contraste des retours de sauvegarde (4,03 → 10,18 en clair et 10,74 en sombre) ; pagination des lignes de médicament avec flux pour colonnes extrêmes ; retrait de l’import Google Fonts inutilisé.
- Première passe : diff relu, `npm run test:complete` **réussi, code 0**, build inclus ; `npm run test:warm-design` **réussi, code 0** ; contrat sans police distante étendu à la feuille CSS d’entrée. Aucun handler, stockage, donnée clinique, valeur ou commande vocale changé.
- Seconde passe finale Chromium, de 00 h 24 à 00 h 27 (Africa/Tunis) : 16 états clavier/sémantique sur les huit pages, 48 états responsive avec textes longs, six PDF et deux parcours de sauvegarde/refus, **tous réussis**. Empreintes de toutes les sources suivies inchangées pendant ces contrôles.
- Mesure renforcée : le premier contrôle de largeur globale ne voyait pas les valeurs coupées. Les rectangles de contenu reproduisent 35 cas sur 48 sur l’ancien code, puis zéro sur 48 après correction. Ce contrôle remplace la conclusion trop limitée de la première exploration.
- Témoins négatifs : tests PDF et messages rejoués sur un checkout détaché du départ ; les deux échouent avec le code 1 attendu. Les six PDF après correction conservent textes, ordre et limites de page. Le cas de 36 lignes utilise 14 pages contre 13 pour garder les lignes groupées ; l’extrême peut se répartir sur huit pages sans reporter sa première ligne.
- Sauvegardes fictives : les autres données médicales et le stock restent inchangés ; le refus simulé n’écrit rien et conserve l’alerte globale. Aucune erreur de page ou requête échouée après retrait de la police dans ces parcours ; erreur de stockage volontaire et avertissements GPU de capture consignés.
- Preuves : [rapport et comparaisons](2026-11-18-session-01/README.md), 16 captures Chromium et 16 images de pages PDF, 10 PDF dont six cas finaux, [journaux](2026-11-18-session-01/logs/), [manifest](2026-11-18-session-01/final-run.json). Les anciennes preuves sont intactes.
- Limites : propriétés AX vérifiées, pas de lecteur d’écran physique ou audit WCAG complet ; pas de tablette Android, microphone, imprimante physique ou benchmark Android. Le seuil de 2 000 caractères pour le flux PDF reste une heuristique de présentation. Composant 3D et règles cliniques conservés.
- État : tâches techniques ciblées de la file réalisées et vérifiées. **A1/A2/A3, appareil physique et audit du Council restent en attente**. Aucune nouvelle direction graphique appliquée, aucune fusion, aucun déploiement ou dépense.
- Prochaine reprise : vérifier les nouveaux retours autorisés sur la PR #18 et le HEAD distant. Sans nouveauté, ne pas refaire les tests ni créer un commit documentaire répétitif. Au passage final du matin, produire le bilan cumulatif avec le HEAD réel, ses liens, la CI réelle et les attentes restantes.
