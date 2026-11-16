# LAB-UI-001 — Brief exécutable Codex : refonte visuelle pilote des champs médicaux

**Plan produit et exigences préparés par ChatGPT pendant l'indisponibilité de Claude (quota).** Ceci n'est pas un plan ni un audit signé par Claude. Le ticket directeur est [#7](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/issues/7).

## Référentiel immuable et séparation des tâches
- Branche **de référence de laboratoire** : `experiment/claude-ui-fields-2026-11-16`, créée depuis `686fee0664419779f4aa08446cfe0fa878203d46` (version SWC-001 en cours de validation humaine).
- Au démarrage de Codex, **relire l'actuel HEAD** de cette branche avec `git fetch origin` / `git rev-parse` : ce document a ajouté un commit de coordination au-dessus de `686fee0`. Ne pas forcer le SHA initial après publication de ce brief.
- Créer branche implémentation **nouvelle** `lab-ui-001/consultation-form-fields` depuis le HEAD exact du laboratoire et ouvrir une **PR en brouillon vers `experiment/claude-ui-fields-2026-11-16`**, jamais vers `main`, `swc-001/theme-storage-safety`, ni Premium.
- **NE PAS** fusionner, déployer, modifier données réelles, ajouter dépendance payante, modifier secrets, travailler en parallèle sur SWC-001. Le travail ici est visuel et expérimental ; SWC-001 reste distinct et non fusionné.

## Audit du code actuel (constats sur la branche de laboratoire avant ce brief)
- `src/pages/Consultations.tsx` (~1723 lignes) : bloc `<style>` intégré à partir de ~779 ; `.consultation-field`, `.consultation-grid`, `.vitals-grid`, `.vital-card` et nombreux `style={{...}}`; identification à ~1200–1260, symptômes à ~1371–1385, constantes à ~1388–1408, examen à ~1410–1445, suivi à ~1459–1495.
- Champs de l'identification : **Patient, Spécialité, Motif** avec labels visuels ne possédant pas encore de `htmlFor` dédié.
- Champs Histoire : **Symptômes et histoire clinique**, **Antécédents et traitements**, **Interrogatoire ciblé**. Constantes via tableau `vitalFields` et liaison `vitals[field.key]` : préserver toutes les unités, clés et valeurs.
- `src/components/PhysicalExaminationEditor.tsx` (~214 lignes) : sections `<details>` par appareil ; `.pex-row` avec libellé, `<select>` d'état et `<textarea>` observations. **Préserver impérativement `not_recorded`, normal, anormal, non examiné et leurs libellés/valeurs exacts** ; ne jamais convertir un champ vide en normal. `updateFinding` et toutes les clés sont intouchables.
- CSS en cascade : `src/App.css` (~6732 lignes) possède déjà `.consultation-page .consultation-field ...` vers 4149–4205 ; `src/clinical-premium.css` (~654 lignes) contient les tokens clair/sombre et les styles généraux, parfois `!important`. Risque de cascade. **Ne pas empiler un grand nombre de `!important`** et ne pas remettre les styles à zéro.
- `src/pages/Patients.tsx` / `src/pages/Prescriptions.tsx` ont d'autres champs : ils seront traités dans des lots séparés, **pas dans ce pilote**.

## Objectif concret du micro-lot — PILOTE A
Améliorer exclusivement la **présentation visuelle et l'accessibilité** du formulaire de Consultation et de l'éditeur d'examen physique.
1. **Hiérarchie :** rubriques 01–06 lisibles avec titres bien délimités, flux de saisie clair sur tablette et mobile ; conserver leur ordre clinique, et conserver intégralement les contrôles et actions.
2. **Libellés :** association explicite `label htmlFor` / `input id` (ou `aria-labelledby` approprié) pour Patient, Spécialité, Motif, Histoire, Antécédents, Interrogatoire, Hypothèses, Plan ; IDs stables sans conflit. Pour constantes, associer label et input avec ID stable construit depuis les clés existantes ; préserver `aria-label`.
3. **Champs :** contrastes adaptés aux deux thèmes à partir des tokens, taille du texte lisible, états `:focus-visible` clairs, surfaces non ambiguës ; sélection, date, texte et textarea adaptés au tactile (viser au moins 44px de hauteur interactive où c'est raisonnable).
4. **Constantes :** cartes compactes mais lisibles, valeurs et unités sans chevauchement, focus visible, grille sans débordement horizontal à 360px. **Aucun seuil, couleur d'interprétation clinique, valeur par défaut ou validation numérique nouvelle**.
5. **Examen structuré :** rubriques `details/summary` accessibles, état/constat bien distingués, grille alignée sans découpage des libellés ; une zone est « non renseigné » tant qu'elle n'est pas saisie. Sans changer les `value`/`onChange`, le type `ExamFinding`, ni la concaténation existante des commentaires dans ce lot.
6. **Actions :** boutons Enregistrer / Annuler visibles, sans recouvrement par l'orbe ; messages HELIOS préservés, pas de faux bouton ni action désactivée cachée.
7. **Responsive & thèmes :** vérification réelle (si navigateur disponible) **1280×800, 800×1280, 360×740** en `dark` et `light`, saisie et lecture ; vérifier le bas de l'écran et l'orbe.
8. **Petite taille / accessibilité :** cible clavier, textes longs en français, unités, `aria-expanded`, navigation `Tab`, absence de perte de focus et d'étiquettes coupées.

## Contraintes d'implémentation
- Ne pas modifier la structure des données cliniques, tests de logique, `useMedicalData`, APIs, diagnostics différentiels, constantes, nom de champ persisté, flux voix/IA, valeurs par défaut ni commandes vocales.
- Réutiliser `consultation-field`, `vital-card`, `pex-row` autant que possible. Autoriser des classes CSS purement visuelles et IDs / `htmlFor`.
- Limiter les fichiers aux `Consultations.tsx`, `PhysicalExaminationEditor.tsx` et une petite feuille CSS dédiée **importée de manière vérifiable** (ou ajustements minimaux à CSS existant). Ne pas toucher à `Dashboard` ou `Patients` pour ce pilote.
- Ne pas globalement modifier `input` ou `label` sur toute l'application et ne pas ajouter d'énormes blocs `style` inline.
- Prévoir un test statique ciblé qui atteste les libellés explicites et garde-fous structuraux, **sans prétendre couvrir l'ergonomie réelle**. Si les tests existants échouent déjà avant modification, le signaler.
- Conserver les règles de sécurité du prototype / essais fictifs ; ne pas changer les messages de stockage issus de SWC-001.

## Vérifications livrables de Codex
1. Avant le code : relever branche, HEAD, `git status --short`, fichiers réels, CSS existant et tests ; si décalage de base, STOP.
2. Commit(s) réversibles sur `lab-ui-001/consultation-form-fields` uniquement.
3. `npm run build`, `npm run test:complete`, `npm run test:clinical-premium` + test ciblé visuel/statique si ajouté ; ne pas exposer de clés ni faire d'appel fournisseur IA.
4. Si navigateur disponible : captures anonymes / fictives **AVANT/APRÈS** (3 tailles, 2 thèmes), champs visibles, pas d'information médicale réelle ; signaler explicitement si non testable.
5. Créer PR **en brouillon**, base `experiment/claude-ui-fields-2026-11-16`, description des changements et des limites. Comparaison diff isolée, nouveau SHA exact. **Ne pas annoncer 11/11 à moins qu'une CI se soit réellement exécutée sur ce SHA** ; CI sur cette branche cible peut ne pas avoir de déclencheur.
6. STOP à la livraison. ChatGPT arbitre visuel/technique ; Claude interviendra quand son quota sera rétabli.

## Roadmap après ce pilote — NE PAS EXÉCUTER SANS ARBITRAGE
- PILOTE B : patients, formulaires d'édition et chronologie.
- PILOTE C : ordonnances, champs analyses / imagerie / consignes.
- PILOTE D : HELIOS, fenêtres flottantes, dictée, navigation tablette et champs de protocole.
- PILOTE E : design system unifié et réduction progressive de la dette CSS, uniquement une fois les pilotes validés.
