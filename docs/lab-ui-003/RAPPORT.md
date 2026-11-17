# Rapport LAB-UI-003 — reconstruction de la disposition du Dashboard

## Livraison pour revue

Le Dashboard est reconstruit en composants React et grilles réelles : accueil compact, cinq KPI pastel, rangée Agenda / Consultations récentes / HELIOS, graphique d’activité et échéances, informations cliniques/inventaire conservés, ruban de six raccourcis. Les contrôles techniques sont réussis. **L’arbitrage Council et la validation visuelle du propriétaire restent attendus.** Aucun verdict indépendant ni validation Android physique n’est revendiqué.

- Ticket : [#16](https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/issues/16).
- Branche de départ récupérée : `lab-ui-003/dashboard-layout-brief`, HEAD exactement `c898a89e16945d6bd7c2e7ab51fc928c2238c01a`.
- Branche d’implémentation créée depuis ce commit : `codex/lab-ui-003-dashboard-layout`.
- Commit de code testé : `cf721c82680f8fcdae6e76d3547a86daa2eca9d9`.
- Le commit suivant ajoute uniquement cette documentation et les preuves. La cible de la PR en brouillon est exclusivement `lab-ui-003/dashboard-layout-brief`.
- Le brief décrit cinq perspectives **simulées** par son auteur ; aucune exécution de cinq modèles Claude ni audit indépendant de cette implémentation n’est attribué à ce travail.

## Conformité à la disposition demandée

| Zone | Résultat |
|---|---|
| Sidebar | Sidebar existante conservée, uniquement destinations opérationnelles. Contraste des métadonnées corrigé sur Dashboard. Un menu mobile natif donne accès aux huit pages, dont Paramètres. |
| Accueil | Illustration vectorielle locale décorative, bienvenue, date dynamique et accès réels à Nouvelle consultation / Patients. L’en-tête conserve les mentions prototype et stockage local. |
| KPI | Quatre indicateurs d’origine inchangés : patients, consultations du mois, ordonnances, statut de suivi patient. Cinquième tuile : contrôles en retard, issue du compteur Follow-up déjà calculé, avec lien vers les échéances. |
| Rangée principale | Agenda, consultations récentes et HELIOS côte à côte à 1280 et 1648 px. À 800 px, deux colonnes puis HELIOS sur toute la largeur ; à 360 px, empilement. |
| Agenda | État explicite « Calendrier non activé ». Aucun rendez-vous, chiffre de RDV ou faux bouton d’activation. |
| Consultations récentes | Quatre consultations issues de la sélection existante, ou état vide réel. Lignes en lecture seule ; retrait de la flèche qui suggérait une ouverture non disponible. |
| HELIOS | Panneau corail clair, version sombre issue des variables existantes. Bouton ouvrant réellement le Copilote. Aucun appel IA automatique ajouté. |
| Suivi | Graphique agrégé des consultations existant, intitulé comme activité du cabinet. HELIOS Follow-up conserve retards, échéances, dates invalides/absentes, horizons et précautions. |
| Autres sections | Alertes d’identité, statistiques descriptives/exclusions, inventaire complet et dernières constantes restent accessibles. Aucun bloc clinique masqué ou supprimé. |
| Raccourcis | Nouvelle consultation, Patients, HELIOS, Ordonnances, Protocoles et Inventaire : six destinations réellement existantes. |

L’alerte de documents sans dossier confirmé est placée juste après les KPI, avant la grille principale. Les avertissements de sauvegarde/thème de l’application restent dans leur rendu d’origine. Le compteur de retards exprime une échéance temporelle et ne crée pas de qualification d’urgence médicale.

### Écarts assumés par rapport à l’image conceptuelle

Le brief et le SVG versionnés sont les références inspectables utilisées. L’image originale approuvée n’est pas fournie comme fichier dans ce ticket/dépôt ; aucune fidélité pixel par pixel à une image non disponible n’est annoncée.

L’illustration est un dessin médical local simplifié, sans photographie ou portrait de patient. Recherche, notifications, pages Agenda/Formation/Statistiques et parcours spécialisés non opérationnels ne sont pas inventés. L’adhésion thérapeutique n’a pas de source démontrée : elle est remplacée par les échéances Follow-up réellement disponibles. Aucun graphique individuel ni sélecteur patient nouveau n’est simulé ; le graphique reste agrégé et les constantes gardent leur sélection d’origine.

Les sections existantes supplémentaires prennent de la place sous les premières rangées. Le ruban de raccourcis reste en bas, tandis que les actions de première intention sont aussi accessibles dans l’accueil et la sidebar.

## Conservation du comportement clinique

Les fonctions `readArray`, `loadDashboardData` et tout le corps de calcul/rafraîchissement du composant avant son rendu sont identiques à la référence. Le nouveau contrat vérifie leurs empreintes SHA-256. Cela couvre les calculs de mois, dates, stock, valeur partielle, échéances, sélection des constantes et les événements de rafraîchissement.

`App.tsx` est identique après retrait des deux props de navigation Dashboard ajoutées et de l’import CSS dédié. Les callbacks existants de Sidebar, HELIOS, voix et stockage restent inchangés. Aucun service, modèle médical, API, traitement, schéma ou flux de sauvegarde n’est modifié. Les définitions des KPI existants sont conservées ; ce lot ne corrige pas leurs règles métier préexistantes, notamment la sélection par texte de statut du KPI de suivi patient.

Les panneaux sont extraits dans `DashboardPanels.tsx`, avec une feuille de disposition dédiée `dashboard-warm-layout.css` chargée après la palette chaude. Les nouveaux noms `wd-*` évitent de réutiliser la grille historique `mf-*`. Les ajustements d’en-tête/sidebar sont conditionnés à la présence du Dashboard ; les autres pages gardent leurs styles. `App.css`, `clinical-premium.css`, `warm-clinical.css`, les services et les schémas sont inchangés. Aucune dépendance ni ressource réseau nouvelle.

Deux anciens tests statiques cherchaient le texte JSX uniquement dans le conteneur Dashboard. Ils lisent désormais le conteneur et ses panneaux réellement importés, **sans retirer leurs assertions**. Le nouveau test de rendu serveur vérifie en plus la sortie des composants, les avertissements, échappements, états vides, raccourcis réels et l’absence d’action au rendu.

## Tests réellement exécutés

Environnement : Node `v24.22.1`, npm `11.9.0`, Chromium `156.0.8078.79` sur Debian Linux, Playwright Python déjà disponible. Données entièrement fictives, contextes neufs, requêtes externes et `/api/` bloquées. Aucun test de fournisseur IA en direct.

| Commande | Dernier résultat | Journal |
|---|---|---|
| `npm run build` | Réussi, code 0 | [Voir](logs/build.log) |
| `npm run test:complete` | Réussi, code 0 | [Voir](logs/complete.log) |
| `npm run test:warm-design` | Réussi, code 0 | [Voir](logs/warm.log) |
| `test:dashboard-layout`, inclus dans `test:complete` | Réussi : invariants de source et rendu serveur réel | [Voir](logs/complete.log) |
| `python interactions.py` | Réussi, code 0 : six configurations et 66 transitions | [Voir](logs/browser.log) |
| `python refresh.py` | Réussi, code 0 : mise à jour réelle sans rechargement | [Voir](logs/refresh.log) |

Les erreurs de stockage et indisponibilités de fournisseurs imprimées par la suite hors ligne correspondent à des simulations attendues. L’avertissement Vite de bundle supérieur à 500 ko subsiste ; tailles exactes dans le journal. Aucun travail d’optimisation de chargement n’est revendiqué.

### Corrections issues des contrôles

La première exécution complète a échoué sur les contrats de localisation du JSX après extraction ; leur lecture a été adaptée aux deux fichiers en conservant les contrôles. Les vérifications navigateur ont détecté que des règles génériques écrasaient le fond du CTA et le focus sombre : les corrections sont locales, puis les tests de géométrie, contraste et focus ont été relancés. Un premier contrôle automatique lisait le fond pendant la transition de thème ; le test attend désormais le style stabilisé, et toute la suite navigateur a été relancée avec succès. Les journaux fournis sont les dernières exécutions réussies.

### Preuves navigateur

- 64 captures avant/après : stockage vide et dossiers fictifs, clair/sombre, 1280×800, 800×1280, 360×740 ; 1648×928 ajouté pour comparaison avec le schéma de référence. Vue initiale et page complète pour chaque configuration.
- Six vues de focus et deux vues de reflow supplémentaires : **72 PNG originaux** au total.
- 16 comparaisons avant/après identiques pour les quatre KPI d’origine, consultations récentes, valeurs mensuelles du graphique, suivis, alertes d’identité, inventaire, statistiques descriptives, constantes et quatre clés de données stockées.
- Aucun débordement horizontal, identifiant HTML dupliqué ou `pageerror` dans les configurations après refonte.
- 66 transitions : six raccourcis à chaque taille/thème, bouton HELIOS, accès aux consultations depuis Follow-up, accueil et huit destinations du menu mobile. Retour par la navigation existante ; données stockées inchangées.
- Contrôles visibles d’au moins 44×44 px, focus clavier de 3 px ; contraste minimal mesuré du CTA principal **5,09:1**. Contrôle ciblé, pas audit WCAG complet.
- Reflow à 640×400, équivalent à un agrandissement de 200 % depuis 1280×800, testé dans les deux thèmes. **Le zoom natif de Chrome n’a pas été testé.**
- Préférence automatique conservée lors du passage système clair → sombre ; les couleurs des panneaux changent réellement.
- Événement `medifollow:data-updated` testé avec modification temporaire de fixtures : KPI, consultations récentes et stock se rafraîchissent, puis les données fictives initiales sont intégralement restaurées. La nouvelle tuile de retard correspond au compteur du panneau Follow-up.

[Comparer les preuves](compare.py) · [Mesures de navigation](interactions.json) · [Auto/reflow](extras.json) · [Rafraîchissement](refresh.json) · [Empreintes de référence](source-hashes.json)

Les scripts de reproduction sont fournis dans ce dossier. Leur configuration locale utilisée est Vite sur `http://127.0.0.1:5193`, binaire `/usr/bin/chromium`, sorties `/workspace/work/lab-ui-003`. Adapter ces chemins sur un autre environnement. Le vérificateur des preuves enregistrées fonctionne directement :

```bash
python3 docs/lab-ui-003/compare.py
```

## Fichiers et limites de livraison

Huit fichiers de code/test :

- `src/pages/Dashboard.tsx` : composition des grilles et données existantes.
- `src/components/dashboard/DashboardPanels.tsx` : composants de présentation.
- `src/dashboard-warm-layout.css` : géométrie, reflow et styles isolés.
- `src/App.tsx` : import et navigation des destinations réelles.
- `scripts/test-dashboard-warm-layout.tsx` : invariants et rendu serveur.
- `scripts/test-patient-linkage.ts`, `scripts/test-follow-up.ts` : contrats existants adaptés à l’extraction.
- `package.json` : commande ciblée intégrée à la suite complète.

Preuves et rapport dans `docs/lab-ui-003/`. Ni `main`, ni Premium, ni SWC-001/PR #6, ni PR #15 ne sont modifiés. Aucune fusion, aucun déploiement, appel IA payant, paiement ou donnée patient réelle.

La tablette Android physique, son clavier et les interactions vocales matérielles restent à examiner. Les captures et tests ont été effectués dans Chromium Linux avec profil tactile simulé. La validation visuelle finale et l’audit indépendant du Council restent attendus ; aucun autre lot n’est commencé.
