# Rapport F1 — Dossier aligné

Choix F1 validé par l’utilisateur après présentation de trois maquettes. Cette étape applique les champs de 52 px, bordures fines, libellés au-dessus des contrôles et palette C aux sections médicales de Consultations et à l’examen physique. Les autres pages, la navigation N3 et le Dashboard D3 conservent leur état précédent.

- Branche : `experiment/dossier-essentiel-fields-f1`.
- Avant : `c5f8f0498081167aba02dac019d3b286a8d3b5d8` (D3, PR #12), récupéré de la branche distante et vérifié.
- Commit d’implémentation : `7f7f37d8018656281dbb8858261b2662689a99e4`.
- Cible expérimentale : `experiment/claude-ui-fields-2026-11-16`.
- [Maquette F1 choisie](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/blob/45ff12d2582bb01637216917ce21915411280399/docs/field-design-choices/f1.png).

## Changements visibles

Les sections du formulaire deviennent plus sobres, séparées par une ligne fine. Les titres numérotés et tous les textes cliniques sont conservés. L’identification utilise deux colonnes sur les vues larges, avec le motif sur toute la largeur ; sur téléphone les champs s’empilent.

Les neuf constantes quittent leurs cartes épaisses au profit de champs à bordure fine. Les unités restent visibles à droite dans la surface du champ, avec leurs associations accessibles d’origine. La grille comporte trois colonnes sur les vues larges et deux à 600 px et moins. Les libellés mobiles gardent une hauteur suffisante pour aligner les valeurs quand un titre occupe deux lignes.

L’examen structuré conserve ses rubriques ouvrables et ses quatre états distincts. Dans chaque constatation, le libellé précède le sélecteur, puis vient la zone de commentaire sur toute la largeur. Les champs simples font au moins 52 px de haut avec un texte de 16 px ; les zones multilignes conservent au moins 112 px et restent redimensionnables. L’anneau de focus n’est plus rogné par les cartes de constantes.

L’empilement des constatations augmente la hauteur d’une rubrique d’examen ouverte sur grand écran : c’est le compromis du choix F1 pour des libellés et commentaires plus lisibles. Aucun appareil ni constatation n’est supprimé.

## Préservation clinique

`Consultations.tsx` est identique au fichier de référence après retrait de l’unique import CSS F1 et du marqueur de présentation `data-field-design="f1"`. `PhysicalExaminationEditor.tsx` est inchangé octet pour octet. Le CSS est limité à ce formulaire et à son marqueur F1.

Aucune modification de valeur, unité, identifiant, gestionnaire, état clinique, schéma, stockage, API, sauvegarde ou commande vocale. Le garde-fou existant des 89 branchements cliniques reste réussi. « Non renseigné » ne devient jamais « Normal ». Les notes libres historiques, l’interrogatoire, le diagnostic, le plan et le suivi programmé sont conservés.

[Empreintes de comparaison du code](source-invariants.json)

## Tests exécutés

| Commande | Résultat | Journal |
|---|---|---|
| `npm run test:lab-ui` | Réussi, code 0 | [Voir](logs/lab.log) |
| `npm run build` | Réussi, code 0 | [Voir](logs/build.log) |
| `npm run test:complete` | Réussi, code 0 | [Voir](logs/complete.log) |
| `npm run test:fields-f1:browser` | Réussi, six configurations | [Voir](logs/browser.log) |

Les tests portent sur le contenu source du commit d’implémentation ci-dessus. Le commit de livraison suivant ajoute uniquement les captures, résultats et documents. Les erreurs de stockage et indisponibilités de fournisseurs imprimées par les tests hors ligne sont des simulations attendues. Aucun test IA en direct n’est exécuté.

L’avertissement Vite de bundle supérieur à 500 ko subsiste ; les tailles exactes sont consignées dans le journal de compilation. Cette étape n’introduit pas d’optimisation de chargement ni de dépendance applicative.

### Nouveau test navigateur

`scripts/test-fields-f1-browser.py` est un test complémentaire explicite. Il requiert Python 3, Playwright Python et Chromium ; il n’est pas ajouté au lancement par défaut de `test:complete`, pour ne pas imposer ces outils à l’environnement Node existant. Avec Vite lancé sur le port 5191 :

```bash
MEDIFOLLOW_TEST_OUTPUT=/tmp/medifollow-fields-f1-browser.json npm run test:fields-f1:browser
```

`MEDIFOLLOW_TEST_URL` et `MEDIFOLLOW_CHROMIUM` permettent de régler l’adresse locale et le binaire. Les requêtes externes et `/api/` sont bloquées avant le chargement. Les dossiers, valeurs et consultations sont entièrement fictifs, dans des contextes de navigateur neufs.

Pour chaque combinaison 1280×800, 800×1280, 360×740 et thème clair/sombre, le test vérifie réellement :

- hauteur et taille de texte des contrôles visibles, commentaires multilignes, position des libellés, chiffres et unités sans recouvrement ;
- focus clavier visible, absence de rognage par la carte de constante, absence de débordement horizontal et d’identifiant HTML dupliqué ;
- conservation des neuf constantes, dont une glycémie saisie avec virgule ;
- quatre états d’examen, constatations, notes historiques, histoire, interrogatoire, diagnostic, plan et suivi programmé ;
- création et lecture de la consultation sauvegardée, réouverture en édition, modification d’une seule constatation puis annulation d’un autre brouillon ;
- dossier du second patient inchangé, ainsi que les listes patients, ordonnances et inventaire ; aucune erreur JavaScript non interceptée.

[Résultats détaillés](browser-results.json)

### Captures et comparaison

48 captures originales Chromium Linux : 24 avant / 24 après, à 1280×800, 800×1280, 360×740, thèmes clair/sombre. Quatre vues par configuration : identification, histoire, constantes et examen physique. Leur taille en pixels est vérifiée, sans retouche des images.

Les six instantanés du formulaire avant/après sont identiques : valeurs et cases, options des sélecteurs, neuf unités, contexte patient, données stockées et contrôles d’intégrité. Aucun débordement horizontal, ID dupliqué ou `pageerror` dans ces captures. L’horloge est figée au 17 novembre 2026, fuseau Africa/Tunis, pour reproduire les mêmes scénarios.

[Galerie comparée](README.md) · [Script de capture](capture.py) · [Vérificateur des preuves](compare.py)

Vérification des preuves enregistrées :

```bash
python3 docs/fields-f1/compare.py
```

## Fichiers, livraison et limites

Quatre fichiers d’implémentation : `src/pages/Consultations.tsx`, `src/consultation-fields-f1.css`, `scripts/test-fields-f1-browser.py`, `package.json`. Les preuves sont dans `docs/fields-f1/`.

La PR reste en brouillon vers la branche expérimentale. Elle est cumulative et conserve les étapes précédentes non fusionnées ; pour isoler F1, comparer depuis `c5f8f0498081167aba02dac019d3b286a8d3b5d8`. Aucune modification des PR précédentes, de main, de Premium ou de SWC-001/PR #6. Aucun déploiement, fusion ou appel IA payant.

Les vues et interactions sont vérifiées dans Chromium Linux avec profil tactile simulé. La tablette Android physique, son clavier, le microphone réel et un audit complet d’accessibilité restent à vérifier. Arrêt pour revue visuelle utilisateur et revue ChatGPT ; aucune prochaine évolution graphique n’est implémentée.
