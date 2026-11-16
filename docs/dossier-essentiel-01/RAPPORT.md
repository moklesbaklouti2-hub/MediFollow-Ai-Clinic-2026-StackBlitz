# Dossier essentiel — fondation visuelle 01

## Choix produit et périmètre

L’utilisateur a choisi **C — Dossier essentiel** parmi quatre propositions en images, puis confirmé le lancement du premier lot. Le lot applique la palette ivoire/sauge, les titres à empattements et le confort de saisie. La navigation supérieure et les restructurations d’écrans feront l’objet de choix visuels distincts avant programmation.

Branche indépendante : `experiment/dossier-essentiel-foundation-01`.
Base propre vérifiée sur la branche distante du pilote : `64e5b9f61cadb651c4d558f8e702b0b9d8710742`.
Commit de code : `fb01e6766675d4ca4fe0c61bf90bb80a1e9b875e`.

## Changements

Deux fichiers de code seulement :

- `src/dossier-essentiel.css` : nouvelle couche additive, palettes light/dark, alias des tokens existants, surfaces papier, titres Georgia système, saisie à 16 px, champs de 52 px, textareas d’au moins 112 px, surfaces et actions sage, focus visible. Les couleurs danger/urgence/avertissement ne sont pas redéfinies par les tokens de ce lot.
- `src/App.tsx` : import de la feuille et attribut `data-appearance="dossier-essentiel"`. Les classes Premium restent identiques, tout comme les états, fonctions, sauvegardes et commandes.

Les couches précédentes sont conservées. Le retour arrière consiste à annuler le commit de code ou retirer son import ; l’attribut seul ne désactive pas les tokens globaux. Quelques surcharges `!important` ciblées neutralisent les couleurs et dimensions imposées par la cascade legacy, sans réécriture de cette dernière.

## Écrans contrôlés

Dashboard, Patients, Consultations, examen physique, Copilote HELIOS, Ordonnances, Protocoles, Inventaire et Paramètres. Le lot change la base visuelle, pas la structure des pages ni leur logique clinique. Les illustrations et l’orbe existants sont conservés ; une éventuelle évolution de leur apparence sera soumise au choix de l’utilisateur.

## Résultats réels

- `npm run test:lab-ui` : code 0 ; les 89 attributs de liaisons métier du pilote sont inchangés.
- `npm run build` : code 0.
- `npm run test:complete` : code 0 sur le code final, incluant les suites thème/stockage, clinique hors ligne, dictée, inventaire, liens patients, suivi et HELIOS.
- `git diff --check` : réussi.
- Chromium : 8 pages × 3 viewports (1280×800, 800×1280, 360×740) × 2 thèmes = **48 configurations après**, comparées à 48 configurations avant.
- Aucun pageerror, débordement horizontal ou ID dupliqué détecté. Aucun champ visible des catégories mesurées ne descend sous 44 px. Les métriques détaillées figurent dans `avant/metrics.json` et `apres/metrics.json`.
- Palette de fond vérifiée sur chaque page : `rgb(246,243,235)` en clair, `rgb(33,31,27)` en sombre ; titre principal Georgia. Les fonds body/app/main du sombre sont également vérifiés sans ancien dégradé bleu ; textarea contrôlé à 112 px minimum.
- Deux parcours réels avec dossier fictif, à 800×1280 et 360×740 : Tab/focus, quatre statuts d’examen, saisie, sauvegarde puis réouverture avec conservation des valeurs. Bouton Enregistrer cliquable sans interception par l’orbe.
- Requêtes externes et `/api/` bloquées pendant les contrôles navigateur ; aucune donnée réelle ni appel IA.

## Captures

**68 PNG originaux** : 34 avant / 34 après. Dashboard, Consultation, examen et HELIOS sont illustrés aux trois tailles et deux thèmes. Les autres pages sont illustrées à 800×1280 dans les deux thèmes. L’ensemble des pages est contrôlé aux trois tailles.

[Galerie comparative](README.md). `Comparaison.html` permet de choisir page, format et thème après téléchargement avec les dossiers d’images. Les captures ne sont pas retouchées.

## Limites pour la revue utilisateur

- Simulation tactile Chromium Linux, pas de tablette Android physique ; aucune certification WCAG ou vérification exhaustive de lecteur d’écran/microphone.
- L’accès Paramètres est déjà masqué dans la navigation mobile du pilote parent. Pour vérifier uniquement son rendu à 360 px, le test déclenche son action DOM existante ; ce n’est pas une validation de son accessibilité. Ce point reste à traiter avec la future décision de navigation.
- L’orbe conserve sa position. Le bouton Enregistrer a été vérifié ; chaque recouvrement possible selon le défilement n’a pas été audité.
- L’avertissement Vite concernant le bundle > 500 kB reste présent et hors périmètre.
- Aucune CI 11/11 n’est revendiquée pour cette branche expérimentale non couverte par le déclencheur Premium. Les résultats ci-dessus sont locaux.

PR en brouillon vers `experiment/claude-ui-fields-2026-11-16` : le diff cumule aussi le pilote non fusionné #9. La contribution de ce lot est isolée dans le commit de code indiqué et le dossier de preuves. Aucun changement de main, SWC-001/PR #6 ou Premium, aucun merge ni déploiement.

**STOP pour revue de l’utilisateur et de ChatGPT.** La prochaine grande décision graphique nécessite de nouvelles variantes et un choix explicite.
