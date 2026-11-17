# MediFollow AI — Charte A : Cabinet chaleureux

17 novembre 2026 — charte validée pour implémentation expérimentale.

**État :** pack A validé par l’utilisateur dans la conversation : choix « A », puis confirmation « oui » le 17 novembre 2026. Palette, dimensions Confort, navigation adaptative et périmètre global deviennent la référence de cette implémentation expérimentale.

## Identité

Une interface de cabinet chaleureuse, structurée et lisible : fond ivoire, surfaces claires, sauge douce, texte forêt et actions principales corail. Sidebar forêt plus profonde pour assurer la lisibilité des libellés. Illustration médicale locale discrète, sans photographie de patient. Les pages partagent une seule famille de composants.

[Planche de la charte](charte-a-apercu.png). Il s’agit d’une maquette conceptuelle, pas d’une capture de l’application. La date de démonstration et les états de champ de cette planche restent illustratifs.

## Palette validée

| Usage | Clair | Sombre |
|---|---|---|
| Fond | `#FFF8F0` | `#14211C` |
| Surface | `#FFFCF8` | `#1D3027` |
| Surface sauge | `#E5EDE2` | `#253C31` |
| Texte principal | `#243A30` | `#F0F5EE` |
| Texte secondaire | `#56655B` | `#B9C7BA` |
| Action principale | `#B94A3B` | `#F39A87` |
| Texte de l’action principale | `#FFFFFF` | `#2A1C17` |
| Sidebar | `#29483B` | `#172820` |
| Texte sidebar | `#F5F8F2` | `#F0F5EE` |
| Séparateur décoratif | `#CFDACE` | `#4F6858` |
| Bordure de champ | `#7C9080` | `#6F8977` |

Le corail est une couleur d’action ; il ne définit pas une urgence clinique. Les avertissements conservent leur sens, leurs icônes et leurs libellés. Le nombre de contrôles en retard indique une échéance, sans nouvelle interprétation médicale.

Contrastes calculés sur les couleurs proposées : bouton 5,12:1 en clair et 7,66:1 en sombre ; texte de sidebar 9,40:1 et 13,96:1 ; bordure de champ contre sa surface 3,33:1 et 3,67:1. Ces calculs de palette ne constituent pas un audit du rendu ni une certification WCAG ; le navigateur sera testé après implémentation.

## Typographie et géométrie — réglage Confort validé

- Police sans empattement système, sans téléchargement de police supplémentaire.
- Texte de saisie et texte principal : 16 px ; labels : 14 px ; aide : 14 px ; métadonnées secondaires : 12 px minimum.
- Titres de page : 28 px sur écran large, 24 px sur tablette, 22 px sur téléphone ; titres de section : 18–20 px.
- Champs et boutons tactiles : au moins 48 px de hauteur et cibles d’au moins 48×48 px. Les zones multiligne grandissent avec le contenu.
- Coins : cartes 16 px, champs 10 px, boutons 12 px.
- Échelle d’espacement : 4, 8, 12, 16, 24, 32 px ; marge intérieure des grandes sections généralement 16–24 px.
- Bordure de champ 1 px ; focus visible 3 px avec espace de 2 px. Les contrôles désactivés et en lecture seule restent distinguables.
- Pictogrammes cohérents, accompagnés de labels pour les actions essentielles. Décoration non focalisable et sans contenu clinique.

## Navigation et tablette — configuration adaptative validée

- Écran large et tablette paysage : sidebar avec icônes et noms complets des huit destinations existantes.
- Tablette portrait et téléphone : menu replié donnant accès à ces huit destinations ; accès HELIOS et action principale faciles à retrouver.
- Toutes les pages, y compris Paramètres, restent accessibles. Menu utilisable au clavier, fermeture par Échap et retour du focus au déclencheur.
- Les constantes et champs se réorganisent selon la place disponible, sans supprimer leurs unités ou leurs labels. Les groupes passent à une colonne lorsque nécessaire.
- Les actions et le contenu clinique ne doivent pas être recouverts par le menu, l’orbe, un bandeau ou le clavier.
- Avertissements d’identité, de stockage et de sauvegarde complets, jamais tronqués pour réduire la hauteur d’un écran.

## Application de la charte à toutes les pages

| Zone | Présentation retenue dans le pack proposé |
|---|---|
| Dashboard | Accueil compact, cinq KPI existants, grilles alignées, HELIOS visible tôt sur tablette, calendrier non activé explicite, consultations et échéances, inventaire et statistiques conservés. |
| Patients | Liste ou tableau lisible, dossiers clairement identifiés, actions cohérentes, détails structurés et adaptation en cartes sur petite largeur. |
| Consultations | Sections clairement nommées, champs de narration confortables, actions existantes regroupées, lecture cohérente sur écran large et portrait. |
| Champs médicaux | Labels permanents au-dessus, unités visibles, aides et erreurs sous les champs ; états normal, focus, erreur, désactivé et lecture seule cohérents. |
| Constantes | Groupes alignés, valeurs et unités conservées ; quatre colonnes seulement si l’espace le permet, puis réorganisation sans débordement. Tous les champs non représentés sur la planche sont aussi conservés. |
| Examen physique | Sections et sous-sections lisibles, tous les contrôles et états existants préservés ; aucune modification de valeur, sélection ou règle médicale par le style. |
| HELIOS | Même langage graphique, accès identifiable, présentation adaptée à la largeur, contenu et avertissements conservés ; callbacks actuels et fonctions réelles réutilisés. |
| Ordonnances | Documents et lignes bien alignés, informations et unités lisibles, mêmes actions de rédaction, sauvegarde et impression lorsqu’elles existent. |
| Protocoles | Bibliothèque et contenu hiérarchisés ; recherches, commandes et destinations existantes conservées. |
| Inventaire | Stocks et mouvements lisibles ; alertes de péremption, stocks bas et valorisation partielle toujours explicites. |
| Paramètres | Groupes de réglages cohérents : profil, apparence, données et sauvegardes selon les fonctions existantes ; clair/sombre/auto conservés. |

Les cinq KPI du Dashboard gardent leurs définitions : Patients inscrits, Consultations ce mois, Ordonnances émises, Suivi des patients, Contrôles en retard. Aucun nouveau calcul n’est déduit d’un pictogramme ou d’une illustration.

## États et cohérence

- Un bouton principal clairement identifiable par groupe d’actions ; actions secondaires délimitées ; suppression distincte, avec les confirmations existantes.
- Les erreurs associent message et repère visuel. La couleur ne porte pas seule une information importante.
- Les vrais états vides restent honnêtes. Aucun rendez-vous, succès d’enregistrement, résultat IA ou statut réseau inventé pour compléter une maquette.
- Aucun contrôle de notification ou d’activation d’agenda ajouté sans fonction opérationnelle et demande distincte.
- Aucun déplacement de fonction ou changement de données causé par une règle CSS.
- Préférence automatique et comportement de persistance existants conservés.

## Mise en œuvre du pack validé

Implémentation sur une branche expérimentale indépendante, sans modification de main, sans fusion ni déploiement. Référence applicative disponible : PR #17, HEAD `1cbd541c4cbe801f80c26eb4cfccf64e50a9be40` ; point de départ à vérifier avant travail.

La charte devient la référence pour toutes les pages et les états, afin de terminer la refonte comme un ensemble cohérent. Les décisions déjà comprises dans le pack validé pourront être appliquées sans redemander chaque détail ; toute évolution graphique importante hors de ce pack sera soumise à l’utilisateur.

Vérifications prévues : build, suite complète et contrats adaptés au périmètre réel ; captures avant/après réelles en clair et sombre, 1648×928, 1280×800, 800×1280 et 360×740 ; navigation, focus, cibles tactiles, débordements, contenu et données conservés. Tester le thème automatique et les avertissements de stockage. Rapporter séparément les limites de l’émulation et les tests Android physiques effectivement réalisés.

Livraison pour examen avec SHA exact, diff, résultats et limites. Aucun appel IA payant, aucune donnée patient réelle, aucune fusion automatique.
