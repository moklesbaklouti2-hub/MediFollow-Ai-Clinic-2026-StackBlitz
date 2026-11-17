# MediFollow AI — Cabinet chaleureux A, refonte globale

17 novembre 2026. Rapport de livraison pour revue indépendante et validation du rendu réel par le propriétaire.

## Autorisation et références

Le propriétaire a demandé une refonte visuelle complète avec choix préalable. Quatre directions ont été présentées ; il a choisi **A**, puis confirmé **« oui »** au pack complet : palette, Confort 16/48 px et navigation adaptative. La [charte acceptée](CHARTE-A.md) et sa [planche conceptuelle](charte-a-apercu.png) sont conservées séparément des captures du produit.

- Départ vérifié, travail initial propre : `1cbd541c4cbe801f80c26eb4cfccf64e50a9be40`.
- Branche d’implémentation indépendante : `codex/cabinet-chaleureux-a-global`.
- Commit initial de code et tests : `d010fbf1b048e9059274b7ca9cb0b9bb4f3f365e`.
- Dernier commit applicatif, incluant la correction CSS d’impression : `9a43f0b3af67b16468bf1efb69ca8ac0c86c334d`.
- PR en brouillon empilée vers `codex/lab-ui-003-dashboard-layout`, afin d’isoler les changements globaux depuis la PR #17. La branche et la PR #17 ne sont pas modifiées.
- Le commit de preuves suivant ne change pas les sources applicatives. Le HEAD final est enregistré dans la PR.
- `main`, Premium et SWC-001 ne sont pas modifiés ; aucune fusion ni aucun déploiement.

## Ce qui change dans le produit

Une couche commune `cabinet-a.css`, chargée après les styles existants, définit les couleurs, la typographie, les espacements, les surfaces, les contrôles et les adaptations. Les anciens styles restent présents ; les priorités de cette couche sont explicites pour neutraliser leur cascade, sans réécriture des services ou des règles métier.

| Zone | Résultat |
|---|---|
| Toutes les pages | Ivoire/sauge/corail/forêt en clair ; forêt profond et corail adouci en sombre. Police système, sans nouvelle dépendance ou requête de police. |
| Navigation | Sidebar forêt en paysage. Menu natif `dialog` sur téléphone, en portrait ou petite hauteur ; huit destinations réelles, Paramètres inclus. Fermeture par bouton, fond et Échap, état annoncé, rotation et retour au haut de page. |
| Dashboard | Disposition existante conservée, accueil plus compact, KPI harmonisés, HELIOS sauge avec action corail, avertissements complets. Aucune donnée de calendrier inventée. |
| Patients | Listes, dossiers et formulaires harmonisés. Labels permanents pour recherche, création, modification et champs d’antécédents/traitements. |
| Consultations | Champs 16 px et cibles 48 px, labels reliés, sections plus lisibles. Les neuf constantes conservent leurs unités ; unités sur une ligne dédiée pour ne pas écraser la saisie. |
| Examen physique | Chapitres natifs accessibles, statuts et commentaires mieux dimensionnés ; anciennes notes et tous les appareils restent disponibles. Aucune transformation d’un champ vide en résultat normal. |
| HELIOS | Conversation et outils existants conservés, présentation plus calme, question et message de l’assistant étiquetés. L’accès vocal est placé dans la navigation, à l’écart des champs cliniques. |
| Ordonnances | Saisie et documents harmonisés, contrôles associés à leurs labels, aperçu et média d’impression lisibles dans les deux thèmes. Aucune délivrance déclenchée par le style. |
| Protocoles | Bibliothèque, sources, recherche et commandes existantes avec les mêmes composants visuels. |
| Inventaire | Formulaire étiqueté, listes et mouvements lisibles, alertes et valorisation partielle préservées. |
| Paramètres | Profil, thèmes et sauvegardes harmonisés ; les deux options à cocher disposent d’un label cliquable complet. |

Le rendu réel utilise les composants et illustrations locales existants. La planche conceptuelle sert de référence graphique ; elle ne définit pas de nouvelles fonctions ni une reproduction pixel par pixel. Recherche/notifications/calendrier non connectés ne sont pas inventés.

### Accessibilité et densité

- Texte principal et saisies : 16 px. Labels/aides : 14 px. Métadonnées : au moins 12 px ; marque compacte adaptée au téléphone.
- Contrôles tactiles vérifiés à au moins 48×48 px ; pour une case, la zone effective inclut son label. Résumés d’accordéon également dimensionnés.
- Cartes 16 px, champs 10 px, boutons 12 px ; échelle d’espacement commune.
- 34 templates de labels permanents ajoutés aux pages/dossiers, 35 associations explicites de labels existants, plus le label du message flottant et les associations de quantité/cases. Aucun placeholder n’est utilisé pour remplacer une donnée.
- Un seul élément `main` sur la page HELIOS ; le conteneur interne a été rendu neutre sans changer son contenu ou ses handlers.
- L’assistant est réservé à la zone de navigation ; il ne couvre ni les champs ni le nom de l’application. Son panneau ouvert tient dans le viewport.
- Les couleurs sémantiques des alertes et mouvements ont des variables adaptées aux deux thèmes ; labels, signes et conditions restent identiques.

## Conservation du comportement

Le contrat `test:cabinet-a` enregistre les empreintes du départ :

1. 73 fichiers cliniques, hooks, types, serveur et stockage strictement identiques ; source de l’assistant vocal identique après retrait du seul label de présentation ajouté.
2. Neuf composants/pages : imports, code avant rendu, calculs, fonctions d’enregistrement, valeurs, handlers, contraintes, placeholders et IDs existants protégés. Le texte clinique original reste présent dans son ordre.
3. `App.tsx` identique après retrait des seuls ajouts visuels autorisés : import CSS, attributs de racine et remplacement de Sidebar par son wrapper adaptatif.
4. Panneaux Dashboard identiques après normalisation de cinq substitutions de couleurs avec leur repli d’origine. Aucun calcul ou callback modifié.

L’ancien contrat Dashboard conserve ses assertions ; sa normalisation autorise explicitement le nouveau shell graphique. Les assertions cliniques, Follow-up, identité et inventaire ne sont pas retirées. `test:cabinet-a` est ajouté à `test:complete` ; aucune dépendance ou modification de lockfile.

Les KPI gardent leurs définitions existantes, y compris la sélection textuelle du compteur de suivi patient. Cette refonte ne tranche pas les règles métier ni la validité clinique des dossiers.

## Vérifications exécutées

| Contrôle | Dernier résultat | Journal |
|---|---|---|
| `npm run build` | Réussi, code 0 | [Build](logs/build.log) |
| `npm run test:complete` | Réussi, code 0 | [Suite complète](logs/complete.log) |
| `npm run test:warm-design` | Réussi, code 0 | [Gardefou du thème hérité](logs/warm.log) |
| `test:cabinet-a`, inclus dans la suite | Réussi, code 0 | [Contrats et contrastes](logs/complete.log) |
| Navigateur réel | Réussi, code 0 | [Suite](logs/browser-suite.log), [captures](logs/capture.log), [écritures](logs/actions.log), [navigation](logs/navigation.log), [contrastes](logs/contrast.log) |

Environnement : Node 24.22.1, npm 11.9.0, Chromium 156.0.8078.79, Playwright Python sur Debian Linux. Tous les dossiers d’essai sont fictifs, contextes neufs, requêtes externes et `/api/` bloquées ; aucun fournisseur IA en direct.

### Preuves de non-régression

Le [résultat du vérificateur](verification.json) des preuves est **PASS** : 64 comparaisons de pages, huit comparaisons cliniques du Dashboard, 176 captures comparatives et 12 captures complémentaires, soit **188 PNG du navigateur réel**, ainsi que trois exports PDF A4 réels contrôlés sur une page. Les mesures portent sur 800 états de champs et 1 168 états de boutons. Les trois parcours d’écriture fictifs, quatre cas de navigation portrait, deux cas de reflow, deux modes de stockage refusé et 16 états de contraste sont réussis.

Les 64 états de pages sont comparés au départ : valeurs, options et états des contrôles identiques ; stockage clinique brut inchangé pendant la navigation. Les huit états Dashboard comparent aussi KPI, activité, consultations, échéances, identité, stock et dernières constantes. Les dossiers ouverts et le premier chapitre d’examen sont mesurés en complément.

Les trois parcours d’écriture créent uniquement des données fictives : patient, modification administrative, antécédent, consultation avec neuf constantes, examen général, notes historiques, suivi, modification sans doublon, ordonnance en brouillon sans déduction de stock, article et paramètres. Le rechargement conserve les valeurs. Les enregistrements initiaux normalisés restent identiques. La normalisation est celle de l’adaptateur existant, appelée uniquement pour préparer ces fixtures complètes ; le test de lecture seule conserve séparément les quatre clés brutes à l’identique.

Le menu est testé à 701, 800, 900 et 360 px : destinations, modalité native, tabulation sans accès au fond de l’application, Échap et restauration du focus, bouton, fond, rotation pendant l’ouverture et retour au haut de page. Chromium peut déplacer la tabulation vers son interface navigateur ; ce cas est distingué d’un accès au fond de l’application. Aucun piège de focus JavaScript supplémentaire n’est introduit.

La préférence automatique clair/sombre, l’alerte réelle `medifollow:storage-error`, un refus d’écriture du thème et un getter `localStorage` interdit sont exercés. La session et ses choix de thème restent utilisables avec l’avertissement approprié.

Contrastes : calculs des tokens et mesure ciblée de 16 états de pages, avec fonds composités. Ce contrôle ne remplace pas un audit WCAG complet. Focus 3 px vérifié dans le navigateur. Reflow équivalent à 200 % à 640×400, deux thèmes et huit pages ; zoom natif Chrome non testé.

### Corrections pendant les vérifications

Les contrôles ont révélé un conflit de géométrie de l’orbe et une saisie de fréquence respiratoire trop étroite près de son unité. L’orbe est maintenant limité à son emplacement de navigation et les unités sont disposées séparément ; les mesures contrôlent ces situations. Les vieux textes secondaires et couleurs de stock insuffisamment contrastés ont été harmonisés.

La revue manuelle des PNG d’impression a aussi révélé que le scroll de la page rendait la capture initiale vide. Le harnais remet le viewport en haut avant capture. Un export PDF réel a ensuite montré des pages blanches causées par le flux du formulaire masqué ; le CSS print isole désormais le document et retire les hauteurs minimales. Les trois formats vérifient la présence du patient et du médicament fictifs, ainsi qu’une seule page pour cette ordonnance courte. Les trois PDF bruts sont livrés.

Les scripts ont également été affinés pour les fixtures normalisées, le retour du média print, les éléments `dialog` fermés et les arrêts de tabulation dans l’interface de Chromium. Ces changements de harnais ne suppriment pas de vérification des données ou de fonction. Le serveur de test est lié à l’exécution de la suite pour ne pas dépendre d’un ancien processus de prévisualisation.

Les journaux livrés correspondent aux dernières exécutions réussies. Les erreurs de stockage/fournisseurs simulées par la suite hors ligne sont attendues. L’avertissement Vite de bundle >500 ko subsiste ; aucune optimisation de chargement ou de consommation Android n’est revendiquée.

## Captures et reproduction

[Galerie complète](README.md). Les PNG des dossiers `avant/` et `apres/` sont des captures brutes de Chromium, sans retouche ni génération d’image. La planche `charte-a-apercu.png` est la maquette conceptuelle approuvée et n’est pas comptée comme preuve navigateur.

Vérifier les données enregistrées sans navigateur ni serveur :

```bash
python3 docs/cabinet-a-global/verify.py
```

Rejouer la suite sur le code livré avec les dépendances installées et Playwright Python/Chromium et les commandes Poppler `pdftotext`/`pdfinfo` disponibles :

```bash
python3 docs/cabinet-a-global/run_browser.py
```

Le serveur reste local, sur 127.0.0.1:5195, et s’arrête en fin de suite. Les fixtures et la date sont fixées dans le harnais uniquement ; l’application garde son horloge réelle. Les scripts réécrivent les preuves dans leur dossier ; adapter le binaire ou les chemins sur un autre environnement. Pour reprendre des captures avant, servir le checkout de référence ; la garde de révision refuse des sources non conformes.

## Limites et passage de relais

Tablette Android physique, clavier réel, microphone et reconnaissance vocale matérielle non testés. Les fonctions et mappings vocaux sont protégés et testés hors ligne ; le panneau vocal est ouvert/fermé, sans activation du microphone ni envoi IA. Média print et export PDF réel testés, sans imprimante physique. Le composant 3D existant est conservé et restylé ; aucun benchmark Android n’est annoncé.

Les workflows GitHub actuels ne ciblent pas cette branche expérimentale. Le contrôle du HEAD exact et les résultats CI éventuellement disponibles sont consignés dans la PR après publication. Les tests locaux ne constituent pas une « CI verte ».

La PR reste en brouillon pour audit indépendant et validation du propriétaire. Aucun merge, déploiement, paiement, appel IA payant ou usage de patient réel. Aucun autre lot commencé.

## Fichiers de code et tests livrés

- Système visuel et shell : `src/cabinet-a.css`, `src/components/AppNavigation.tsx`, `src/App.tsx`.
- Labels et accessibilité : `src/components/PatientClinicalInfo.tsx`, `src/components/OrbAssistant.tsx`, `src/pages/Patients.tsx`, `src/pages/Consultations.tsx`, `src/pages/Copilot.tsx`, `src/pages/Prescriptions.tsx`, `src/pages/Protocols.tsx`, `src/pages/Inventory.tsx`, `src/pages/Settings.tsx`.
- Couleurs sémantiques : `src/components/dashboard/DashboardPanels.tsx`.
- Vérification : `scripts/test-cabinet-a.tsx`, `scripts/fixtures/cabinet-a-clinical-contract.json`, `scripts/test-dashboard-warm-layout.tsx`, `package.json`.

Dix-sept fichiers de code/test, puis documentation et preuves dans `docs/cabinet-a-global/`. Les services, les hooks métier, les types médicaux et le serveur n’ont pas été réécrits.
