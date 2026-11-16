# MediFollow AI — refonte Clinical Premium (16 novembre 2026)

## Objectif
Refonte visuelle et ergonomique globale, conservant les fonctionnalités médicales existantes. Aucun changement de schéma patient, d'API, de fournisseur IA, de stockage ou de prescription.

## Périmètre
- Design system indépendant dans `src/clinical-premium.css`, chargé après les styles hérités.
- Thèmes clair et sombre harmonisés (bleu nuit / bleu électrique / turquoise).
- Sidebar : navigation lisible, état actif, accès direct HELIOS.
- Header : hiérarchie de la page, descriptions adaptées et accès direct HELIOS.
- Dashboard : cartes, indicateurs, panneaux, tâches rapides et illustration.
- Patients : cartes, champs, chronologie, graphiques et tableaux.
- Consultations : formulaires, constantes, sections de l'examen et boutons.
- Copilote IA / Orb : conversation, panneaux et contraste de lecture.
- Protocoles, ordonnances, inventaire et paramètres : composants partagés uniformisés.
- Responsive tablette/mobile, navigation horizontale sur smartphone, focus clavier, préférences de réduction des animations, impression.
- Alertes de sauvegarde : contraste compatible avec les deux thèmes.

## Limites et critères de validation
1. Le CSS seul ne prouve ni l'ergonomie réelle ni la lisibilité sur Android. Contrôler sur navigateur PC et Chrome Android avec données fictives.
2. Vérifier, sur toutes les pages, le défilement, les débordements, les boutons et la lisibilité des états d'erreur.
3. Vérifier dark/light/auto, zoom navigateur 200 %, navigation clavier, écrans étroits et mode paysage.
4. Les tests `npm run test:clinical-premium`, `npm run test:complete` et la CI 11/11 sont requis sur le SHA final.
5. Les données patients réelles, la mise en production et les modifications de `main` restent interdites sans autorisation et validation de sécurité.
6. Le libellé « Mode prototype » évite de présenter le système comme prêt pour la pratique réelle.
7. Certains anciens styles sont très spécifiques : noter toute régression visuelle dans un nouveau lot ciblé plutôt que réécrire les 183 Ko de CSS hérité.

## Reprise depuis le Codespace existant
Ne pas effacer le fichier local `package-lock.json` non suivi. Pour ouvrir un aperçu sur la branche de design, conserver les modifications locales éventuelles, puis utiliser :

```bash
git status --short
git fetch origin
git switch design/premium-clinical-ui-2026-11-16
git pull --ff-only
npm run test:complete
npm run dev:full
```

Afficher le port 5173 en mode privé dans Codespaces pour visualiser les changements avec des données fictives. Ne pas publier le port 3001.

## Rollback
La branche `prep-chronologie-2026-11-11-qw052-055` et `main` demeurent inchangées. Il suffit de sélectionner l'ancienne branche pour retrouver l'interface antérieure après sauvegarde de tout travail local. Ne pas fusionner automatiquement.

**Statut : version design à tester sur appareils — aucune validation visuelle humaine revendiquée.**
