# MediFollow AI — validation de l'assistant vocal

## Fonction ajoutée

La bulle Orb propose **Activer la voix** (désactivé par défaut). La synthèse vocale utilise l'API Web Speech `speechSynthesis` et cherche une voix française installée sur l'appareil. Les réponses de discussion sont lues uniquement après activation explicite. En mode commandes, un accusé de réception bref est prononcé, plutôt que de réciter les informations cliniques.

Les états « écoute », « réfléchit » et « parle » sont visibles. Le bouton « Stop parole » interrompt la lecture. La reconnaissance vocale ne redémarre qu'après la fin de la synthèse, afin de limiter les boucles acoustiques.

## Vérification manuelle indispensable (Chrome Android)

1. Lancer `npm run build && npm run test:all-offline` dans Codespaces.
2. Ouvrir l'Orb et vérifier que la voix est désactivée au chargement.
3. Activer la voix, envoyer « Bonjour », vérifier la lecture en français et le bouton d'arrêt.
4. Passer en commandes vocales, demander « Ouvre le tableau de bord », vérifier la navigation et la réponse courte.
5. Vérifier que le microphone n'écoute pas la propre voix de l'Orb.
6. Désactiver la voix, confirmer qu'aucune nouvelle réponse n'est prononcée.
7. Vérifier les permissions micro, le refus de permission et le navigateur sans `speechSynthesis`.
8. Tester le comportement après fermeture de l'Orb, navigation et perte de réseau.

## Limites et précautions

La qualité, la disponibilité et la latence des voix dépendent du navigateur et du système. La reconnaissance vocale du navigateur peut recourir à un service externe ; ne pas dicter de données nominatives sans avoir vérifié la politique de confidentialité et obtenu les autorisations nécessaires. L'activation de la voix peut rendre audibles des réponses médicales : utiliser seulement dans un contexte confidentiel. La voix n'est pas une validation clinique.

Aucun test sur un véritable appareil Android n'a été exécuté par la modification GitHub seule. Le code doit encore être compilé et testé en conditions réelles.

## Prochaines étapes

- Vérifier les transitions entre écoute, réflexion et parole sur Android.
- Ajouter un bouton explicite de lecture ponctuelle des réponses, avec confirmation pour les données sensibles.
- Tester l'accessibilité et le comportement des voix absentes.
- Ajouter des tests automatisés des transitions d'état et de l'annulation.

## QW-005 — Lecture ponctuelle des réponses (à tester sur Chrome Android)

- Chaque réponse de MediFollow affiche **« Lire cette réponse »**. La lecture ponctuelle ne modifie pas le réglage général **Activer la voix**.
- Une confirmation de confidentialité précède **chaque** lecture : refuser ne doit déclencher aucune parole.
- À l'acceptation, le microphone et le redémarrage automatique des commandes sont arrêtés pour empêcher que l'Orb retranscrive sa propre voix.
- La lecture utilise le moteur vocal du navigateur, une voix française si disponible et la limite existante de **800 caractères**.
- Tester **Stop parole**, fermeture par la croix, fermeture en cliquant l'Orb et passage au copilote complet : aucun son ne doit continuer.
- Sans moteur vocal, le contrôle ponctuel doit être désactivé ; le texte reste visible.
- Tester navigation au clavier et focus visuel. **Aucun test sur appareil Android réel n'a été exécuté par le présent lot.**
