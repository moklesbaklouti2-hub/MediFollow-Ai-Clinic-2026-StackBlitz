# Rapport D3 — Dashboard « Dossier & activité »

Choix D3 reçu après la direction C « Dossier essentiel » et la navigation N3. Étape limitée au Dashboard, sur `experiment/dossier-essentiel-dashboard-d3`. Revue visuelle utilisateur attendue avant toute nouvelle évolution majeure.

- Référence avant : `9d556337e02244eb4e6c53bf603b94745077489d` (N3, PR #11).
- Commit d’implémentation : `0d50116fd261cf6730083147f097d7ce74dccdeb`.
- Cible demandée : `experiment/claude-ui-fields-2026-11-16`, vérifiée à `7f71410f06769e3557ebd00ea3d282084f78e7cf`.
- Date des essais : 17 novembre 2026, fuseau Africa/Tunis. Horloge des scénarios figée à 10 h pour une comparaison déterministe.

## Résultat visible

Les consultations récentes existantes deviennent le premier panneau d’activité. Les quatre indicateurs d’origine restent visibles, sous forme de bandeau plus sobre. Le titre est raccourci autour de l’activité du cabinet et les grandes illustrations décoratives sont masquées.

En paysage large, les accès rapides, l’alerte de documents non reliés, les échéances HELIOS Follow-up et l’accès au Copilote occupent une colonne distincte. Les panneaux de détails restent dans la colonne principale : graphique, spécialités/motifs, inventaire complet, dernières constantes, calendrier inactif. À 1050 px et moins, l’ordre est activité, actions/suivis puis détails. À 600 px et moins, les indicateurs passent sur deux colonnes.

Les couleurs ivoire/sauge et le thème sombre chaud de C sont conservés. Le CSS D3 corrige notamment les anciennes règles de grille qui imposaient des colonnes aux panneaux déplacés et les anciens textes bleus trop pâles. Il améliore les libellés, retours à la ligne, unités et états vides du Dashboard. Les boutons testés mesurent au moins 52 px de haut et 44 px de large et disposent d’un focus clavier visible.

Le bouton précédemment nommé « Nouveau patient » est nommé « Dossiers patients » : sa destination existante reste la gestion des patients. Les cinq branchements d’action sont conservés.

## Préservation du comportement

La portion complète du composant Dashboard avant son rendu JSX est identique octet pour octet à N3 : calculs, chargement et rafraîchissement, dates, inventaire et échéances restent inchangés. Le test D3 verrouille son empreinte SHA-256 ainsi que les cinq branchements d’action et la présence des panneaux/indicateurs d’origine.

Le flux contient les quatre consultations récentes existantes ; il ne crée pas de journal clinique unifié. Les libellés et définitions des quatre indicateurs restent ceux de l’application. Le calcul préexistant de « Suivi des patients » utilise toujours `/suivi|actif|en cours/i` : il peut donc inclure « inactif ». Ce problème métier préexistant nécessite un lot distinct et n’est pas corrigé par cette réorganisation visuelle.

Les statistiques descriptives, alertes de rapprochement, valeurs de stock, lots, mouvements, constantes et explications de limites sont conservés. Le calendrier reste un emplacement inactif. Les services de stockage, schémas, API, composants cliniques, sauvegarde, commandes vocales et navigation N3 ne sont pas modifiés par D3.

## Contrôles réellement exécutés

| Commande | Résultat | Preuve |
|---|---|---|
| `npm run test:lab-ui` | Réussie, code 0 | [Journal](logs/lab.log) |
| `npm run build` | Réussie, code 0 | [Journal](logs/build.log) |
| `npm run test:complete` | Réussie, code 0 | [Journal](logs/complete.log) |

Les journaux correspondent au contenu source du commit d’implémentation ci-dessus ; le commit suivant ajoute uniquement cette documentation et les preuves. `test:lab-ui` comprend le garde-fou des 89 branchements cliniques du pilote, N3 et le nouveau contrôle D3. `test:complete` comprend compilation, stockage/thèmes, régression clinique et IA hors ligne, dictionnaire/dictée, inventaire, rapprochement, suivi, chronologie et HELIOS, puis N3 et D3. Les refus de stockage et indisponibilités de fournisseurs imprimés par ces tests sont des cas simulés attendus.

La compilation conserve l’avertissement de bundle supérieur à 500 ko : JavaScript minifié 1 466,17 ko, gzip 408,32 ko ; CSS 219,35 ko, gzip 39,38 ko. Aucune optimisation de chargement n’est introduite par ce choix graphique.

### Essais navigateur

Chromium Linux, profil tactile simulé, fuseau Africa/Tunis, thèmes clair/sombre, dimensions 1280×800, 800×1280 et 360×740. Deux scénarios : stockage vide et données synthétiques (deux dossiers fictifs, consultations, documents non reliés, échéances et stock fictifs). Les requêtes externes et `/api/` sont bloquées.

- 48 captures originales : 24 avant / 24 après, dont une vue initiale et une page complète par configuration.
- 12 comparaisons avant/après identiques sur huit catégories de contenu : quatre indicateurs, consultations récentes, mois/valeurs du graphique, suivis, documents non reliés, inventaire, constantes et calendrier. Les espaces sont normalisés pour la comparaison.
- Aucun débordement horizontal, identifiant HTML dupliqué ou `pageerror` sur les 24 configurations capturées. Le stockage reste identique entre les captures de chaque configuration.
- 30 transitions testées : les cinq boutons du Dashboard dans chacune des six combinaisons dimensions/thème. Destination et page active correctes ; retour par N3, menu mobile inclus. Données patients/consultations/ordonnances/inventaire inchangées. Focus clavier visible et cibles tactiles vérifiés.
- 582 échantillons de texte D3 contrôlés par styles calculés : contraste minimal 4,67:1. Échantillon ciblé sur activité, indicateurs, boutons, mois, constantes, états vides et titre d’alerte ; ce contrôle ne constitue pas un audit WCAG complet de l’application.

[Comparer les mesures](compare.py) · [Mesures des boutons](actions.json) · [Galerie avant/après](README.md)

Les scripts `capture.py` et `verify-actions.py` documentent les essais locaux : Playwright Python avec `/usr/bin/chromium`, Vite sur `http://127.0.0.1:5190`, sorties dans `/workspace/work/dashboard-d3`. Les fichiers `compare.py` et les JSON de ce dossier permettent de vérifier les preuves enregistrées sans navigateur : `python docs/dashboard-d3/compare.py`.

## Fichiers et revue

Quatre fichiers d’implémentation : `src/pages/Dashboard.tsx`, `src/dashboard-d3.css`, `scripts/test-dashboard-d3.mjs`, `package.json`. Les preuves et journaux sont dans `docs/dashboard-d3/`.

La PR expérimentale est cumulative : elle conserve les étapes précédentes non fusionnées des PR #9, #10 et #11. Pour isoler D3, comparer depuis `9d556337e02244eb4e6c53bf603b94745077489d`. Aucun changement apporté à ces PR, à SWC-001/PR #6, à main ou à la branche Premium. Aucun déploiement, fusion, donnée patient réelle ni appel IA payant.

La vérification sur tablette Android physique, au clavier Android et avec le microphone réel reste à réaliser par l’utilisateur. L’inspection visuelle humaine et l’audit indépendant restent attendus. Aucune étape suivante ne doit être implémentée avant la décision du propriétaire.
