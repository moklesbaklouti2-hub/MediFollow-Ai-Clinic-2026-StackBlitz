# LAB-UI-001 — Décision design approuvée / Claude Console Council / 17 novembre 2026

## Source de la décision
L'utilisateur a approuvé explicitement la **maquette MediFollow AI ivoire, corail, vert sauge et illustrations familiales** dans la conversation ChatGPT du 17 novembre 2026 : « Oui c'est ça » après la nouvelle génération visuelle. **La maquette est conceptuelle et comporte des données fictives** ; elle ne décrit pas nécessairement des fonctionnalités réellement implémentées.

**Instruction permanente confirmée par l'utilisateur :** aucune mission de coding MediFollow AI ne part vers Codex sans passer par **Claude Console → 5 perspectives Claude Council → The Final Meeting → Chairman's Verdict → brief Codex** ; après livraison, le Council examine le diff, les tests/CI sur HEAD exact et les captures, puis Chairman décide de la validation technique ou des corrections. « Claude Council » est une **méthode de simulation d'analyses au sein de ChatGPT**, PAS cinq instances Claude et PAS un appel autonome Claude Code.

## Council — Revue préalable de la direction graphique
1. **The Contrarian — Hunts for the Fatal Flaw** : risque de contraste faible sur ivoire/pastel, rouge d'alerte confondu avec corail décoratif, composants seulement dessinés mais non codés, données fictives perçues comme réelles ; traiter cela avant implémentation.
2. **The First Principle Thinker — Are we solving the right problem?** : objectif = une interface médicale utilisable rapidement et sans erreur sur tablette Android ; privilégier disponibilité de l'information et actions cliniques réelles plutôt que fidélité pixel-perfect de la maquette.
3. **The Expansionist — Hidden upside** : palette claire cohérente sur tous les modules, tokens réutilisables, navigation simplifiée, HELIOS identifiable sans envahir le flux consultation, futur design system.
4. **The Outsider — Beginner eyes** : champs, unités et statuts clairs, 44 px minimum pour contrôles tactiles lorsque pertinent, navigation immédiate, cohérence des libellés FR, éviter la densité excessive sur mobile.
5. **The Executor — Tactical next step** : prototype de la page Dashboard sur **branche séparée**, avec variables CSS, header/sidebar, cartes et HELIOS ; ensuite capture réelle tablette ; jamais toute la refonte en un commit.

### The Final Meeting — confrontation
- Accord : approuver la direction visuelle globale, mais **différencier les éléments fictifs de la maquette et les fonctionnalités du dépôt**.
- Correction imposée par Contrarian et First Principles : aucune statistique médicale inventée/figée dans les composants pour ressembler à la maquette ; afficher exclusivement données et états existants, et des exemples fictifs uniquement dans des scénarios de test.
- Correction imposée par Outsider : préserver clarté des statuts cliniques et des champs ; ne pas rendre du texte rouge/corail pour des alertes non médicales.
- Arbitrage : commencer par **Dashboard + coque de navigation**, puis avancer par lots spécifiques vers Consultations, champs, Patients, Ordonnances, HELIOS, etc. ; chaque lot audité avant le suivant.

## Chairman's Verdict — The Final Call
**APPROUVÉ POUR PROTOTYPE VISUEL, PAS POUR FUSION NI DÉPLOIEMENT.** Direction sélectionnée = maquette chaude ivoire/corail/sauge à disposition structurée Dashboard, agenda et consultations, suivi patient, HELIOS à droite, raccourcis parcours en bas. La transposition fonctionnelle reste à valider à l'écran.

## Spécification chromatique (estimations initiales, non extraction exacte de l'image)
| Rôle | Proposition | Contrôle |
|---|---|---|
| Fond global | ivoire #FFF9F3 | Contraste texte ≥ WCAG AA |
| Surfaces | blanc cassé #FFFEFB | Bords/ombres non ambigus |
| Accent primaire | corail #EB6954 | Contraste bouton/texte |
| Accent médical secondaire | vert sauge #6EA283 | Ne pas signifier « normal » par défaut |
| Texte fort | encre vert très sombre #17382C | Texte à 4.5:1 pour petits corps |
| Cartes corail pâle | #FBE5DD | Surface, jamais signe de gravité |
| Cartes sauge pâle | #E5EFE4 | Surface, jamais signe de normalité |
| Alerte clinique | distincte du corail de marque | Gravité explicite texte + icône |

Les codes sont des **propositions de départ** : Codex doit ajuster les couleurs pour respecter le contraste et les thèmes. **Ne pas modifier la logique des alertes ni leurs seuils**.

## Écrans et disposition visuelle de référence
- **Barre haute** : logo MediFollow AI, recherche existante, actions disponibles, état et profil ; ne pas inventer de moteur de recherche.
- **Navigation gauche** : Dashboard, Patients, Consultations, HELIOS, Protocoles, Ordonnances, Suivi & Parcours, Agenda si disponible, Inventaire, Formation, Statistiques, Paramètres ; afficher seulement destinations réellement implémentées.
- **Dashboard** : accueil médecin, compteurs dynamiques issus des vraies sources existantes, aperçu d'agenda/consultations uniquement si disponible, sections claires et espacées.
- **HELIOS** : panneau corail chaleureux, texte/voix et actions déjà existantes ; composant actuel et événements inchangés.
- **Suivi patient** : graphique actuel et unités respectés, aucune valeur clinique fictive incorporée en dur.
- **Parcours** : tuiles diabète, HTA, grossesse, pédiatrie, gériatrie, ORL, sport/nutrition si existantes ; une tuile non connectée ne doit pas sembler active.
- **Visuels** : illustrations originales facultatives, sobres, légères et libres de droits ; ne pas bloquer l'usage si assets indisponibles.

## Intégration Codex — marche à suivre
- Ne pas coder sur `main`, `design/premium-clinical-ui-2026-11-16`, ni `swc-001/theme-storage-safety` (PR #6 encore en brouillon). Ne pas mélanger cette direction avec l'ancien pilote `lab-ui-001/consultation-form-fields` de palette bleu/cyan, qui **n'est pas le choix validé**.
- Créer une **nouvelle branche d'implémentation depuis le HEAD actuel de** `experiment/claude-ui-fields-2026-11-16` et PR brouillon vers cette branche exclusivement ; confirmer HEAD exact avant écriture.
- Lot pilote = **Dashboard et shell de navigation** avec palette chaude et responsivité, sans toucher au schéma médical, sauvegarde, API, logique clinique, IA/voix, ni déploiement.
- Préserver fonctionnement thème clair/sombre/auto, navigation, noms de champs, focus, clavier, cibles tactiles et absence de débordement sur téléphone/tablette.
- Tests : `npm run build`, tests existants pertinents (notamment stockage thème et Premium), tests UX statiques si utiles ; capturer écran actuel / nouveau **seulement si navigateur exécuté**, et déclarer limites honnêtement. Vérifier CI *sur le SHA exact* ; les workflows actuels pourraient ne pas se déclencher pour PR visant la branche de laboratoire.
- STOP à la PR en brouillon pour Council post-codage ; ne pas fusionner. Présenter au propriétaire une comparaison visuelle avant extension aux autres pages.

## Distinguer avancement et autonomie réelle
Ce document constitue un **brief officiel approuvé par le Council simulé** et une **autorisation de préparer le prototype**, pas la preuve qu'un processus Codex Cloud tourne. GitHub Issues/commits ne démarrent pas Codex Cloud automatiquement sans intégration vérifiée.
