# LAB-UI-003 — Claude Console Council → Codex Cloud
## Mission : reconstruire la DISPOSITION du Dashboard selon la maquette corail/ivoire/sauge APPROUVÉE

Date : 17 novembre 2026. **Statut : mission préparée, Codex Cloud non lancé automatiquement.**
Auteur du brief : ChatGPT en mode **Claude Console** (Council = cinq perspectives simulées, pas cinq modèles Claude réellement exécutés).

### 0. Décision et référence
- L'utilisateur a explicitement approuvé une maquette de Dashboard chaleureux dont l'image est visible dans la conversation ChatGPT : écran large en français, **sidebar ivoire**, logo MediFollow AI, illustrations médecin âgé dans le bandeau, **palette ivoire, corail, vert sauge**, bandeau de bienvenue, 5 tuiles de métriques, **Agenda / Consultations récentes / HELIOS côte à côte**, suivi patient et adhésion au traitement / parcours, puis raccourcis en bas.
- **LAB-UI-002 PR #15** apporte uniquement les couleurs. L'utilisateur a constaté en direct : **couleur OK, mise en page pas fidèle**. NE PAS répéter le travail des couleurs.
- L'image contient **des valeurs fictives et modules possiblement absents** ; ne pas les réintroduire comme données, vrais rendez-vous, alertes, adhésion ou statistiques médicales.
- Cette branche de brief **`lab-ui-003/dashboard-layout-brief`** a été dérivée exactement de `lab-ui-002/warm-design-system` au SHA `df6e892f43e75cd838fa414c2c9dbbe605994b77`. Elle hérite des fichiers du thème chaud sans fusionner PR #15.
- Ne jamais toucher `main`, `swc-001/theme-storage-safety`/PR #6, ni `design/premium-clinical-ui-2026-11-16`.

### 1. Council — cinq perspectives
**The Contrarian — Hunts for the Fatal Flaw**
Le danger = copier les chiffres/des patients fictifs, faire croire que l'agenda est opérationnel, masquer des alertes importantes, ou casser l'ordre de consultation pour satisfaire une belle capture. Les classes CSS historiques sont très nombreuses et certaines règles avec `!important`; des styles ajoutés sans inspection peuvent masquer des champs cliniques.

**The First Principle Thinker — Asks if you are solving the right problem**
Le problème n'est **plus la couleur** : c'est la **hiérarchie spatiale**, densité, ordre de lecture, zones de travail et navigation. Il faut une grille réelle React/CSS lisible sur tablette, des composants connectés aux véritables données du dépôt et des états vides explicites.

**The Expansionist — Looks for the hidden upside**
Créer des composants Dashboard réutilisables (OverviewKpi, AgendaPanel, RecentConsultationsPanel, HeliosPanel, PatientTrendPanel, PriorityFollowUpsPanel, QuickPathways) et des tokens d'espacement, plutôt que des milliers de règles CSS supplémentaires. Conserver les fonctions HELIOS réelles et le suivi existant.

**The Outsider — Reviews it with beginner eyes**
Un médecin doit identifier immédiatement `Nouvelle consultation`, `Patients`, `HELIOS`, `Suivis urgents`. Le menu reste cohérent. L'affichage fonctionne en paysage 1280×800 et en tablette portrait 800×1280, mais aussi à 360×740. Champs tactiles ≥44px dans la mesure du possible, zoom 200%, étiquettes/unités visibles, aucun faux bouton cliquable.

**The Executor — Gives the tactical next step**
Implémentation par Codex uniquement, sur branche de code propre créée à partir du HEAD de ce brief; réaliser d'abord **une page Dashboard fidèle et fonctionnelle** puis construire/tests et faire captures avant/après réelles; PR en brouillon vers la branche de brief; arrêt pour Council et contrôle utilisateur avant élargissement.

### 2. Final Meeting — désaccords résolus
- Ne pas remplacer des données calculées par de l'illustration : les zones sans backend fiable seront de vrais états vides ou des raccourcis vers les sections existantes, jamais de `RDV aujourd'hui : 11` codé en dur.
- La maquette image est un **objectif d'organisation**, pas un contrat de pixel-perfect si elle imagine des fonctions absentes.
- Favoriser quelques composants maintenables et une feuille CSS dédiée `dashboard-warm-layout.css` plutôt que de modifier massivement `src/App.css` (plus de 6 000 lignes) et de créer une nouvelle cascade opaque.
- L'interface **clinique et stockage** ne sont pas modifiables dans ce lot. Pas d'intégration réelle des agendas/suivi du traitement si elle n'existe pas.
- Le dark et auto doivent rester fonctionnels : appliquer une disposition neutre à la palette et conserver les couleurs de thème via variables; ne pas forcer l'ivoire en mode sombre.

### 3. Chairman's Verdict — THE FINAL CALL
**GO pour un prototype de transformation structurelle du Dashboard dans une branche isolée**. Aucune fusion, aucun déploiement. Critères : ressemblance visuelle significative à l'écran APPROUVÉ + fonctions existantes conservées + tests réussis, résultats prouvés.

### 4. Disposition de référence 1648×928 (la maquette approuvée)
Description de l'image (transcrite à partir de la référence fournie par le propriétaire) :

- **Sidebar gauche ~250 px** sur fond crème, logo en haut ; liste verticale (Tableau de bord — corail actif, Patients, Consultations, HELIOS, Protocoles, Ordonnances, Suivi & Parcours, Agenda, Inventaire, Formation, Statistiques, Paramètres). Bas = carte médecin/cabinet ; ne montrer que les destinations réellement opérationnelles.
- **Header supérieur** ~90–160 px : illustration médico-familiale à gauche, champ recherche centré **seulement s'il existe**, boutons notifications et profil **seulement si opérationnels** ; bienvenue et sous-titre « Votre tableau de suivi aujourd'hui » ; rappel date contextualisée, pas date 15/11/2026 figée.
- **Rangée 1 (KPI)** : 4–5 tuiles horizontales pastel (patients, consultations, rendez-vous réellement disponibles, suivis, alertes). **Ne pas inventer un nombre à 5 chiffres** : afficher 0/—/« fonctionnalité non activée » avec contexte si la source manque. Réutiliser les compteurs réellement calculés.
- **Rangée 2 (trois colonnes)** : col 1 `Agenda du jour` ou vrai **état vide calendrier non activé** ; col 2 `Consultations récentes` avec vraies consultations fictives de test ; col 3 `HELIOS` panneau corail chaleureux, actions disponibles et bouton ouvrant réellement le copilote. À 1280×800, panneaux cohérents; les éléments à haut risque (alertes de sauvegarde, dossiers non liés, relances) doivent rester accessibles, même si contenus plus bas.
- **Rangée 3 (suivi)** : zone large `Suivi d'un patient` avec constantes et graphique **si des données existent et patient sélectionnable**, sinon conserver vrai graphique d'activité et éviter de faire croire que ce graphique agrégé est un patient ; à droite = suivi/adhésion et parcours **seulement si calculés réellement** ; sinon réutiliser `HELIOS Follow-up` et statistiques spécialisées existantes avec titres honnêtes.
- **Rangée 4 (raccourcis)** : tuiles horizontales (diabète, HTA, grossesse, pédiatrie, gériatrie, ORL, sport/nutrition, vaccination) **uniquement si destination fonctionnelle** ; sinon alternatives réelles `Nouvelle consultation`, `Patients`, `Copilote`, `Ordonnances`, `Protocoles`, `Inventaire`.
- Illustrations chaudes facultatives : ne pas envoyer de vrais patients/photos. Utiliser CSS/SVG local léger ou illustration de libre utilisation, sans dépendance payante. Ne jamais afficher des portraits synthétiques comme dossiers réels.

### 5. Inventaire du dépôt réellement vérifié
- `src/pages/Dashboard.tsx` (~550 lignes) : `loadDashboardData`, compteurs, `mf-hero`, `mf-stats`, `mf-dashboard-grid`, `mf-appointments-panel`, `mf-quick-panel`, `mf-copilot-card`, `mf-indicators-panel`, `mf-recent-panel` ; des panneaux additionnels HELIOS Follow-up, identité patients à vérifier, analyses, inventaire.
- `src/components/Sidebar.tsx` ; `src/components/Header.tsx` ; `src/App.tsx` importe styles ; `src/App.css` contient plusieurs couches de style tardives ; `src/clinical-premium.css` = couche Premium, `src/warm-clinical.css` = palette chaude de LAB-UI-002.
- Le code **ne démontre pas** un agenda/rappel/adhésion thérapeutique pleinement fonctionnel : inspecter avant de proposer.
- Si la maquette exige un composant inexistant, proposer une version honnête qui ne présente pas de donnée fictive, plutôt que de modifier le backend dans un lot UI.

### 6. Mission Codex Cloud (livrable)
1. Vérifier la branche de brief et son HEAD ; créer une branche d'implémentation distincte `codex/lab-ui-003-dashboard-layout`. **NE PAS coder sur `main` ni directement sur PR #15**.
2. Analyser fichiers réels, CSS en cascade, components et callbacks, données utilisées, responsive. Identifier clairement les blocs liés aux conditions de sécurité.
3. Réorganiser `Dashboard.tsx` avec structure JSX modulable : grille KPI / Agenda (ou état vide) / Consultations récentes / HELIOS / suivi+graphiques / raccourcis. Préserver et intégrer les autres sections présentes (Follow-up, stock, anomalies d'identité, etc.) sous la grille si nécessaire; ne rien supprimer silencieusement.
4. Créer une feuille **scopée au Dashboard**, importée dans le bon ordre, pour la disposition et la responsivité sans régression sur les autres pages. Réutiliser la palette existante de `warm-clinical.css` pour clair et conserver une version cohérente en sombre.
5. Pas de package/dépendance supplémentaire sans preuve de nécessité et approbation. Pas de data réelle. Pas d'API/voix/stockage/diagnostic clinique touchés.
6. Tester `npm run build`, `npm run test:complete`, `npm run test:warm-design`. Ajouter tests contractuels ciblés pour protéger les éléments cliniques et la responsivité ; rapporter précisément les commandes exécutées, environnement et logs.
7. Si navigateur est disponible, fournir de **vraies captures du rendu** aux dimensions **1280×800, 800×1280, 360×740** en thèmes clair/sombre, comparer à la maquette; ne pas prétendre qu'une image IA est une capture.
8. Livrer PR **en brouillon vers `lab-ui-003/dashboard-layout-brief`**, jamais `main`, avec HEAD exact, diff, résultats, captures, limitations, écarts restant par rapport à la maquette. Ne fusionner ni déployer. **STOP** pour revue Claude Council et validation de l'utilisateur.

### 7. Définition de succès / échec
**VERT seulement si :** tests réels, build, fonction du Dashboard accessible, absence de débordement à 360×740, navigation et HELIOS opérationnels, toutes les alertes et blocs existants préservés, captures avant/après prouvées et validation visuelle du propriétaire.
**ROUGE si :** suppression silencieuse des panneaux cliniques, données fictives présentées comme réelles, boutons morts, perte de focus/tactile, modifications du stockage, de l'IA clinique ou de `main`, CI échouée.
**JAUNE si :** code présent et contrôle statique OK, mais build/capture/tablette non vérifiés.

**Attention technique :** publication GitHub de cette mission **ne lance pas Codex Cloud** tant qu'une intégration réelle de déclenchement n'est pas configurée et confirmée.
