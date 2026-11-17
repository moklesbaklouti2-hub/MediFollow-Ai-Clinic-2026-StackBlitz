# LAB-UI-003A — Corrections du Council, PR #17

17 novembre 2026. Livraison pour une nouvelle revue indépendante et validation visuelle du propriétaire ; aucun verdict de validation finale prononcé par Codex.

## Instruction et références exactes

[Commentaire du Council appliqué](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/pull/17#issuecomment-6958056162). Ce Council est une confrontation de cinq perspectives simulées dans ChatGPT, pas cinq audits externes Claude.

- Branche existante conservée : `codex/lab-ui-003-dashboard-layout`.
- HEAD audité et point de reprise distant vérifié : `d8290ad300d5ddd31ac6cc23290f43fe5fef76c0`.
- Commit de correction applicative : `3ee0ee2f6f0a9853773f9d87d400c6ced5fc2a64`.
- Base de PR inchangée : `lab-ui-003/dashboard-layout-brief@c898a89e16945d6bd7c2e7ab51fc928c2238c01a`.
- Le commit suivant contient uniquement ces preuves et ce rapport ; le HEAD final est enregistré dans la description de la PR #17.

## Réponse aux cinq corrections

| Demande | Correction livrée |
|---|---|
| HELIOS visible plus tôt de 701 à 900 px | Carte pleine largeur placée avant les deux cartes en lecture seule, avec bouton dans sa première rangée. Le callback `onOpenCopilot` reste identique ; aucune nouvelle fonction IA. |
| Agenda vide disproportionné | Carte alignée en haut, retrait du minimum vertical de l’état vide et de l’étirement sur la hauteur des consultations ; état compact et illustré. Les trois messages d’absence de calendrier sont conservés, sans RDV fictif ni activation inopérante. |
| Bandeaux trop hauts | Padding et illustration réduits, bienvenue raccourcie et sous-titre décoratif redondant retiré. Date réelle, titre de page et actions conservés. Les mentions prototype et stockage sont affichées ; le libellé de stockage auparavant masqué par les anciennes règles tablette/mobile est rétabli. |
| Harmoniser illustration/pictogrammes | Médecin stylisé redessiné en SVG local, pictogrammes de même trait pour les cinq KPI, l’Agenda et HELIOS. Palette existante conservée ; SVG décoratifs non focalisables et masqués aux lecteurs d’écran. Aucun asset externe ni dépendance. |
| Tests et captures comparables | Trois commandes locales relancées, suite navigateur existante et nouveau contrôle ciblé sur dix configurations tablette ; captures réelles aux quatre dimensions demandées, dans les deux thèmes. |

L’alerte d’identité complète reste **avant les outils**. Aucun masquage, troncature ou réduction de son contenu pour faire remonter HELIOS. Les avertissements de sauvegarde et de préférence de thème conservent leur rendu et leur comportement dans `App.tsx`.

À 1280 et 1648 px, la rangée Agenda/consultations/HELIOS garde ses trois colonnes. L’ordre mobile existant reste conservé à 360 px, avec accès aux huit pages par le menu natif et accès au copilote dans l’en-tête.

### Mesures à 800×1280, dossiers fictifs

| Mesure | Avant, clair | Avant, sombre | Après, deux thèmes |
|---|---:|---:|---:|
| Haut du panneau HELIOS | 1360,1 px | 1353,4 px | 742,2 px |
| Hauteur Agenda | 475,6 px | 475,6 px | 304,8 px |
| Haut du bouton HELIOS | Non relevé séparément | Non relevé séparément | 758,7 px ; hauteur 44 px |
| Hauteur cumulée en-tête + bienvenue | Non relevée séparément | Non relevée séparément | 243,5 px |

Les positions avant proviennent des [mesures versionnées du HEAD audité](../lab-ui-003/interactions.json) ; les nouvelles positions sont dans [council.json](council.json). Les captures « avant » de cette passe ont aussi été reprises sur le code audité avant toute modification.

## Préservation clinique et périmètre

Trois fichiers applicatifs modifiés :

- `src/components/dashboard/DashboardPanels.tsx` : décoration locale, bienvenue, Agenda et en-tête HELIOS.
- `src/dashboard-warm-layout.css` : densité et disposition responsive, styles conditionnés à la présence du Dashboard.
- `src/pages/Dashboard.tsx` : seulement les cinq props de pictogrammes dans le JSX.

`readArray`, `loadDashboardData`, le corps des calculs/rafraîchissements et le câblage App passent toujours les empreintes du contrat existant. `App.tsx`, services, règles cliniques, serveur, package/dépendances et tests npm sont identiques au HEAD audité. Les panneaux identité, Follow-up, activité, constantes et stock ne sont pas modifiés. Aucun changement de stockage, de voix, de sauvegarde ou de diagnostic clinique.

Les seize comparaisons avant/après vérifient les quatre KPI historiques, consultations récentes, graphique, échéances, identité, inventaire/valorisation partielle, statistiques, constantes et quatre clés de stockage clinique, avec égalité exacte. La nouvelle tuile de retards conserve sa source Follow-up et le contrôle de rafraîchissement.

## Tests réellement réussis

| Commande | Résultat | Journal |
|---|---|---|
| `npm run build` | Code 0 | [Build](logs/build.log) |
| `npm run test:complete` | Code 0, contrat Dashboard et rendu serveur inclus | [Suite complète](logs/complete.log) |
| `npm run test:warm-design` | Code 0 | [Thème chaud](logs/warm.log) |
| `python3 interactions.py` | Code 0, 66 actions de navigation existantes dans six configurations | [Navigateur](logs/browser.log) |
| `python3 council.py` | Code 0, 10 configurations et 10 ouvertures réelles de HELIOS | [Council](logs/council.log) |
| `python3 refresh.py` | Code 0, mise à jour réelle des KPI, consultations et stock ; fixtures restaurées | [Rafraîchissement](logs/refresh.log) |
| Captures avant / après | Code 0, 16 configurations par étape | [Avant](logs/captures-avant.log) · [Après](logs/captures-apres.log) |

Node `v24.22.1`, npm `11.9.0`, Chromium `156.0.8078.79`, Playwright Python sur Debian Linux. Contextes neufs et données exclusivement fictives ; requêtes externes et `/api/` bloquées. Aucun fournisseur IA en direct.

Le nouveau test `council.py` contrôle les largeurs 701, 750, 800, 850 et 900 px, clair/sombre : HELIOS avant Agenda/consultations, bouton dans le premier écran, avertissement d’identité complet avant les outils, deux bandeaux cumulés ≤300 px, absence de hauteur vide artificielle dans l’Agenda, libellés prototype/stockage visibles, absence d’action Agenda inopérante, pictogrammes décoratifs, données conservées après navigation. Un événement de refus de sauvegarde est réellement déclenché à 800 px dans les deux thèmes : message complet visible, stockage clinique inchangé et HELIOS encore accessible dans les deux premiers écrans.

La suite existante vérifie toujours le menu mobile et Escape/focus, six raccourcis réels, les actions HELIOS/Follow-up, cibles ≥44 px, focus 3 px, contraste du CTA principal ≥4,5:1, reflow équivalent à 200 %, préférence automatique clair→sombre et absence de `pageerror`. Les libellés de statut de l’en-tête sont désormais également vérifiés à 360 px.

Les simulations d’erreurs de stockage et de fournisseurs dans la suite hors ligne sont attendues. L’avertissement Vite de bundle >500 ko subsiste : JS **1464,06 ko**, gzip **408,16 ko** ; CSS **218,76 ko**, gzip **39,87 ko**. Aucun travail d’optimisation du chargement revendiqué.

## Captures et reproduction

[Galerie avant/après](README.md) : **73 PNG originaux**, sans retouche ni génération IA.

- 64 captures comparatives : vide/fictif × 1648×928, 1280×800, 800×1280, 360×740 × clair/sombre × avant/après × vue initiale/page complète.
- Six captures de focus, deux de reflow, une d’échec de sauvegarde.
- [Mesures cliniques avant](avant/metrics.json), [après](apres/metrics.json), [navigation](interactions.json), [tablette](council.json), [auto/reflow](extras.json), [refresh](refresh.json).

Vérification des preuves enregistrées, sans serveur ni navigateur :

```bash
python3 docs/lab-ui-003a/compare.py
```

Pour rejouer les interactions, lancer Vite depuis le checkout choisi sur `http://127.0.0.1:5193`, puis les scripts Python de ce dossier ; Playwright Python et `/usr/bin/chromium` doivent être disponibles. Les fichiers de preuve sont réécrits dans ce dossier. Le script de capture refuse une étape `avant` si les sources applicatives diffèrent du HEAD audité, et une étape `apres` si elles diffèrent du commit de correction. Le serveur doit servir ce même checkout. Pour un autre environnement, adapter URL/binaire dans les scripts.

## Limites et arrêt

Tests réalisés dans Chromium Linux avec tactile simulé : tablette Android physique, clavier et voix matérielle non testés. Reflow équivalent à 200 % testé, **zoom natif Chrome non testé**. Contrôles d’accessibilité ciblés, sans certification WCAG complète. La fidélité visuelle finale reste à examiner par le propriétaire et le Council ; l’image conceptuelle originale n’est toujours pas disponible comme fichier, le brief et le SVG versionnés restent les références inspectables.

Les workflows existants excluent cette branche/cible expérimentale : ne pas annoncer « CI verte » à partir des seuls tests locaux. Le statut du HEAD final est vérifié et consigné dans la PR après publication.

PR #17 conservée en brouillon, même branche et même cible. `main`, Premium et autres PR inchangés ; aucune fusion, aucun déploiement, dépense, appel IA payant ni donnée patient réelle. Arrêt pour la nouvelle revue du Council, sans autre lot.
