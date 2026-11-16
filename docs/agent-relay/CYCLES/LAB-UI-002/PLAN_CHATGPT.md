# LAB-UI-002 — Plan de conception ChatGPT (Claude en pause)

**État : PLAN PRÉPARÉ — CODING NON DÉCLENCHÉ.**  
**Responsable conception : ChatGPT, pas Claude.**  
**Issue exécutable Codex :** https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/issues/8  
**Issue parente (vision globale) :** https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/issues/7

## Orientation design
Interface médicale Premium lisible et sobre : hiérarchie forte, labels clairs, tailles tactiles >=44px, sections cliniques identifiables, focus contrasté, unités visibles, contrastes convenables en sombre/clair. L'interface doit rester facile à parcourir sur tablette Android, sans gêner l'examen clinique.

## Inspection technique réalisée (source immuable)
Branch `experiment/claude-ui-fields-2026-11-16`, issue du commit `686fee0664419779f4aa08446cfe0fa878203d46`.
- `src/pages/Consultations.tsx`: 1723 lignes, styles intégrés autour de 790–1009, labels sans associations explicites pour les champs Patient/Spécialité/Motif (1200–1256), histoire clinique (1371–1385), constantes mappées (1388–1407), examen (1410–1445), diagnostic/plan (1447–1457), Follow-up (1459–1480).
- `src/components/PhysicalExaminationEditor.tsx`: 214 lignes, sections structurées ; préserver les statuts médicaux dont Non renseigné ≠ Normal.
- `src/clinical-premium.css` : styles globaux existants sur inputs/selects/textarea, responsive et focus. Pas de couche concurrente généralisée.
- `src/App.tsx` importe `App.css`, `mobile-navigation.css` puis `clinical-premium.css`, donc tester la cascade CSS réelle.

## Ordre de travail
1. Codex vérifie la branche et le SHA exact, puis crée `lab-ui-002/consultation-fields` à partir de la branche experiment, sans toucher à `main`.
2. Petite modification des champs et labels accessibles de Consultation (pas d'état métier ni de sauvegarde).
3. Adaptation CSS sobre et locale, sans ajout massif de `!important`, pour 1280×800, 800×1280, 360×740, dark/light.
4. Tests locaux réels et captures si navigateur disponible ; PR draft vers branche experiment uniquement.
5. ChatGPT lit le diff, les tests et contrôle la branche, laisse un verdict.
6. Claude revient ultérieurement pour un audit indépendant du résultat, avant tout rapprochement vers Premium.

## Points strictement exclus
Refonte intégrale de toutes les pages dans un seul lot ; algorithmes médicaux, intégration IA, voix, validation/sauvegarde, schéma patient, stockage, PR #6, `main`, déploiement, données réelles et tout service payant.

## Critères de réussite
Aucun champ clinique supprimé ; même valeur et callbacks ; labels correctement liés aux contrôles ; focus clavier visible ; min 44px tactiles ; unités non coupées, aucune barre horizontale mobile imprévue ; build et test:complete; captures réelles si possible. PR draft et revue indépendante ultérieure.
