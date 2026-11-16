# LAB-UI-001 — livraison Codex

## Référence et attribution

Branche existante `lab-ui-001/consultation-form-fields`, HEAD initial propre et vérifié : `0e3aeea701aadabfa27ac3e163267a8ad753fb12`.

Les associations label/ID et le premier polish de ChatGPT sont conservés. Codex ajoute le commit d'interface `43f5fe1ce1e0f428ad047ee0987041c4770085be`. Les captures « avant » correspondent au HEAD fourni, pas à une ancienne version Premium.

## Changements Codex

- Feuille `src/consultation-form.css`, importée par Consultations, limitée à `.lab-consultation-form` : sections avec repère visuel, champs de 16 px, contrastes de surfaces clair/sombre, focus de 3 px, cartes de constantes et espacement des unités.
- `Consultations.tsx` : classe de portée et descriptions accessibles des unités ; aucune modification de gestionnaire ou de valeur.
- `PhysicalExaminationEditor.tsx` : libellé visible pour les observations, grille statut/observations sur grand écran et empilement mobile, cartes par constatation. Les quatre statuts et la logique de saisie restent identiques.
- Test statique étendu : import CSS, associations des unités et observations, empreintes AST des 89 attributs métier existants (valeurs, gestionnaires, états et contraintes). Il ne remplace pas une vérification visuelle.

## Vérifications réellement réalisées

- `npm run test:lab-ui` : code 0, avant et après ; le contrat étendu réussit.
- `npm run build` : code 0.
- `npm run test:complete` : code 0 ; compilation, thème/stockage, régression clinique hors ligne, dictée, inventaire, liens patients, Follow-up, chronologie, Memory/Prevention, Trends/Referral.
- `git diff --check` : réussi.
- Chromium avec simulation tactile, échelle 1 : captures à 1280×800, 800×1280, 360×740, thèmes light/dark ; trois zones pour chaque état, soit 36 PNG. Animations réduites et défilement instantané pour une comparaison stable.
- Aucun débordement horizontal, aucun ID dupliqué ni pageerror dans les six parcours après modification. Les métriques détaillées sont dans `avant/metrics.json` et `apres/metrics.json`.
- Contrôles mesurés : minimum avant 42 px desktop/tablette, 44 px mobile ; minimum après 45 px dans les six configurations. Le périmètre de mesure inclut champs texte/select d'identification et constantes, statuts d'examen ouverts et résumés natifs.
- Parcours fictifs 800×1280 et 360×740 : saisie, traversée Tab et focus visible, quatre statuts d'examen, sauvegarde puis réouverture ; valeurs et constatations préservées. Bouton Enregistrer cliquable sans interception de l'orbe.
- Requêtes externes et `/api/` bloquées pendant les essais navigateur ; copilote désactivé dans le parcours. Aucune donnée réelle ni appel IA.

## Consultation des preuves

[Galerie avant/après directement dans GitHub](README.md). `Comparaison.html` permet de choisir taille, thème et zone après téléchargement du dossier complet. Les captures sont les images originales du navigateur, sans retouche.

## Limites et risques

Chromium Linux avec simulation tactile ne constitue pas un essai sur tablette Android physique. Aucun test de microphone, de lecteur d'écran ou audit WCAG exhaustif n'est revendiqué. L'orbe conserve sa position et sa logique ; l'absence d'interception a été vérifiée pour le bouton de sauvegarde, sans garantie sur chaque position de défilement possible. Vite conserve son avertissement de bundle supérieur à 500 kB, hors périmètre du pilote.

Les règles legacy `!important` imposent quelques surcharges ciblées pour la typographie et les surfaces. Aucun remaniement global de cascade ni suppression de CSS existant. Aucun changement aux modèles cliniques, commandes, API, stockage SWC-001 ou autres pages.

PR en brouillon vers `experiment/claude-ui-fields-2026-11-16`. Aucun déploiement ni fusion. STOP pour revue ChatGPT.
