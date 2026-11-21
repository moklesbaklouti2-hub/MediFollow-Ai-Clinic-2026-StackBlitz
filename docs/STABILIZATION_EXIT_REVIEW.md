# Revue de sortie — boucle d'audit et de stabilisation (10 novembre 2026)

**Statut : audit technique en cours ; non autorisé pour un déploiement public ou des données de patients réels.**

## Contrôles attestés

- GitHub Actions **#72 et #73 : verts**, selon le retour de l'utilisateur (sans capture). Il s'agit de la suite configurée sur la branche d'audit, pas d'une certification de sécurité.
- Les suites CI comprennent la compilation Vite/TypeScript, les tests hors ligne (résilience IA, clinique, dictionnaire, dictée), l'inventaire API, la matrice de permissions simulée et la régression des erreurs de commande vocale.
- Les correctifs récents empêchent une référence à `detail` non définie lors d'un repli 429 clinique et suppriment le détail brut des exceptions du fournisseur dans la réponse HTTP des commandes vocales.

## Risques non résolus — bloquants pour la mise en production

1. **Authentification et autorisation non appliquées aux routes cliniques.** Les scripts 401/403 sont des simulations ; `server/index.ts` déclare des routes `/api/clinical/analyze`, `/api/commands/interpret` et `/api/chat` sans contrôle d'identité démontré. Il faut définir l'identité, les rôles et le contrôle objet par objet, puis tester les refus sur les véritables routes.
2. **Exposition réseau.** Le serveur Express écoute sur `0.0.0.0:3001`. Ne pas rendre ce port accessible publiquement sans authentification, filtrage réseau et configuration d'hébergement adaptés.
3. **Confidentialité.** Les contextes cliniques sont transmis aux fournisseurs IA configurés. Vérifier la base légale, les accords, la minimisation des données et les règles de conservation avant tout usage réel.
4. **Validation clinique.** Les tests automatisés ne prouvent ni la justesse des diagnostics ni la sûreté des suggestions ; une validation médicale humaine et des scénarios de danger restent nécessaires.
5. **Essais appareil.** Dictée, commandes vocales, permissions microphone et interactions sur Android restent à vérifier manuellement.
6. **Fusion.** Aucun passage de la branche d'audit à `main` sans revue du diff, accord explicite et validation des régressions.

## Conditions de clôture de la boucle de stabilisation

- [x] Compilation et tests hors ligne signalés verts dans GitHub Actions #72 (retour utilisateur)
- [x] Erreur 429 et fuite des détails d'exception des commandes vocales corrigées, régressions ajoutées
- [x] Risques majeurs explicitement documentés sans les présenter comme corrigés
- [x] CI du commit de revue `562bfb7` : GitHub Actions #73 vert, selon le retour utilisateur
- [ ] Exécuter les essais fonctionnels Android avec données fictives
- [ ] Valider une stratégie d'authentification avant toute exposition publique
- [ ] Revoir les changements et décider explicitement de la suite pour `main`

**Portée de la clôture :** terminer cette boucle d'audit ne signifie pas terminer MediFollow AI ni autoriser son utilisation clinique en production.

## Mise à jour après CI #73

- L'utilisateur a confirmé le statut **vert** de l'exécution #73 ; ce résultat valide le dernier commit documentaire de revue, pas une authentification réelle.
- **Décision de sécurité conservatrice :** aucune activation de middleware d'accès ni exposition Internet avant clarification du modèle d'identité et des comptes. Cette décision n'empêche pas les tests fictifs hors ligne.
- **Prochaine action à forte valeur :** obtenir le choix d'architecture d'accès (cabinet mono-médecin local ou multi-utilisateur / distant), puis développer et tester un véritable contrôle 401/403 sur les routes, dans la branche d'audit seulement.
