# Dossier essentiel — choix N3

## Référence et décision

Choix explicite de l’utilisateur : **N3 — barre supérieure + contexte patient**, après présentation de trois variantes en images. Implémentation isolée sur `experiment/dossier-essentiel-navigation-n3`, issue de la base distante propre `b9352928c93994ec426f8142e44612b01319009f` (PR #10).

Commits de code : `fedfbfdfa0080773d66e01cbdb0f51780624da67`, puis `49d331f026d8870cdb67d347e484e2e9e0368b01` pour l’interception tactile par un panneau flottant. Les PR précédentes et les branches main, Premium et SWC-001 ne sont pas modifiées.

## Comportement livré

- Navigation supérieure vers les huit pages existantes, avec les mêmes valeurs transmises à `setActive` qu’avant. Page active annoncée par `aria-current`.
- À petite largeur (≤600 px), bouton Pages, menu repliable en deux colonnes, `aria-expanded`/`aria-controls`, fermeture après choix, fermeture par Échap depuis le bouton ou les liens, focus ramené au bouton visible. Paramètres devient accessible directement sur mobile.
- Bandeau local dans Patients et Consultations. Le patient provient de la sélection existante et doit posséder un identifiant unique ; aucune sélection implicite du premier dossier. Les noms sont échappés par React et les noms malformés affichent le libellé existant de vérification.
- Patients : raccourcis Dossier et Chronologie et documents, puis Fermer le dossier relié à l’action existante `changeSelectedPatient(null)`.
- Consultations : raccourcis Consultation, Examen et Historique, par ancres vers les rubriques existantes. Les valeurs et gestionnaires des champs restent identiques. Le changement de patient passe toujours par le sélecteur existant.
- HELIOS et les autres pages conservent leurs sélecteurs/contexte propres. Aucun dossier global partagé, nouvelle page Documents, transmission de données, routage ou stockage supplémentaire n’est introduit par ce lot.
- Le bandeau et la barre défilent avec le document. Une éventuelle fixation permanente sera une autre décision visuelle, à présenter à l’utilisateur.
- La navigation N3 est placée au-dessus des panneaux flottants non modaux existants pour rester touchable. Aucun contenu ni action du panneau de diagnostics n’est changé.

## Fichiers de code

`src/App.tsx`, `src/components/WorkspaceNavigation.tsx` (nouveau), `src/components/PatientContextBar.tsx` (nouveau), `src/navigation-n3.css` (nouveau), `src/pages/Patients.tsx`, `src/pages/Consultations.tsx`, `scripts/test-navigation-n3.tsx` (nouveau), `package.json`.

L’ancien composant Sidebar et les feuilles Premium restent disponibles dans le code. Aucun fichier de données, service de persistance, hook métier, schéma, API ou commande vocale n’est modifié.

## Tests réellement exécutés

- `npm run test:lab-ui` : réussi, code 0 ; les 89 attributs métier du pilote sont inchangés. Inclut le nouveau test N3.
- `npm run test:navigation-n3` : rendu React réel, huit pages, état actif unique, sémantique mobile, aucune lecture de stockage/action au rendu, sélection exacte, identifiant absent/orphelin/dupliqué, nom invalide et échappement HTML. Intégré aussi à `test:complete`.
- `npm run build` : réussi, code 0.
- `npm run test:complete` : réussi, code 0, suites existantes et test N3 final inclus.
- `git diff --check` : réussi.
- Chromium tactile à 1280×800, 800×1280 et 360×740, light/dark : les huit pages accessibles, absence de débordement horizontal, état actif correct ; navigation sans mutation du stockage clinique initialement fictif. En mobile : fermeture et retour du focus, Échap, accès Paramètres.
- Dans chacune des six configurations : sélection A puis B dans le bandeau, aucun contexte périmé après changement de page, fermeture de dossier, contexte retiré sur HELIOS, identifiant supprimé affiché à vérifier sans substitution ; ancres sans perte de saisie, y compris lorsque le panneau de diagnostics est ouvert.
- Parcours de sauvegarde/réouverture à 800×1280 et 360×740 : saisie fictive, quatre statuts d’examen, focus clavier et valeurs conservées.
- Deux contrôles complémentaires du menu mobile ouvert (light/dark) : huit pages visibles, Échap depuis le bouton Pages.

## Preuves et limites

[Galerie : 50 PNG originaux](README.md). 24 couples avant/après sur Dashboard, Consultations, Patients et HELIOS, aux trois tailles et deux thèmes ; deux images supplémentaires du menu mobile. Les métriques JSON correspondent aux 24 vues avant et 24 après, sans débordement ni identifiant dupliqué.

Requêtes externes et `/api/` bloquées pendant les essais. Patients A/B et dossiers des tests entièrement fictifs. Aucun appel IA ni déploiement.

Chromium Linux en simulation tactile, pas de tablette Android physique, microphone ou audit WCAG exhaustif. Aucun test de fournisseur IA. Les panneaux existants peuvent apparaître dans les captures avec leur état de chargement/erreur lié au blocage du réseau de test. L’ensemble des overlays n’a pas été audité.

Les ancres conservent la saisie. Le changement vers une autre page conserve le comportement de démontage antérieur ; aucun stockage de brouillon supplémentaire n’a été ajouté. La navigation arrière Android n’est pas migrée vers un routeur dans ce lot.

Vite conserve l’avertissement de bundle >500 kB. Aucune CI 11/11 revendiquée sur cette cible expérimentale, non couverte par le déclencheur Premium ; les résultats décrits sont locaux.

PR en brouillon vers `experiment/claude-ui-fields-2026-11-16`. Son diff est cumulatif des essais non fusionnés ; le diff propre à N3 part du SHA de base indiqué. STOP pour revue de l’utilisateur et ChatGPT avant la prochaine décision graphique.
