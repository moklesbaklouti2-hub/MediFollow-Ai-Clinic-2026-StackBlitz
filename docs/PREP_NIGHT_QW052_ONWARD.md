# MediFollow AI — lots de préparation pour tests ultérieurs

## Ce qui est préparé (pas encore testé)
- QW-052 : filtre chronologique par dates civiles UTC inclusives.
- QW-053 : filtre des consultations par spécialité documentaire du patient confirmé.
- QW-054 : limite d'affichage 10/25/50/tous sans supprimer les événements.
- QW-055 : remise à zéro des filtres au changement de patient et sur bouton.
- QW-056 : comptage purement documentaire des dates, spécialités et statuts manquants.

Ces lots ont été ajoutés par commits incrémentaux sur la branche de préparation
`prep-chronologie-2026-11-11-qw052-055`, créée depuis le commit d'audit `d126ac8`.
Les scénarios humains F36–F40 sont ajoutés au plan de validation finale.

## Statut de sécurité
- Branche d'audit et `main` inchangées pendant la préparation.
- Aucun serveur public, déploiement, nouveau fournisseur, coût ni patient réel.
- Les nouveaux filtres sont des transformations de vue en mémoire uniquement.
- L'absence d'information n'autorise aucune déduction clinique.
- **Préparé ne signifie ni compilé, ni testé, ni VERT.**

## Premier contrôle local en Codespaces (avec données fictives)
Contrôler d'abord les modifications locales existantes ; ne pas les effacer.

```bash
git status --short
git fetch origin prep-chronologie-2026-11-11-qw052-055
git switch prep-chronologie-2026-11-11-qw052-055
git pull --ff-only
git rev-parse --short HEAD
npm run test:complete
echo "RESULTAT=$?"
```

Avant d'exécuter ces commandes : si `git status --short` montre des modifications, conserver ces fichiers et décider explicitement comment les sauvegarder.
Vérifier le SHA obtenu et le code 0. Si une étape échoue, ne pas considérer le test comme validé, même si `echo` retourne 0 après une commande intermédiaire ; au besoin exécuter `npm run test:complete; echo "RESULTAT=$?"` dans la même ligne.

## Intégration après validation locale
1. Vérifier que l'audit PR #2 est toujours au commit de base attendu, sans travaux concurrents.
2. Intégrer les nouveaux commits par un fast-forward explicite vers la branche d'audit uniquement si le head actuel est un ancêtre confirmé.
3. Vérifier le vrai run V2 créé sur le **HEAD exact**, avec 11 jobs `completed/success` et run global `completed/success`.
4. Conserver `main` intact et la PR en brouillon ; tests humains F36–F40 reportés à la phase finale.

## Si des préparations continuent pendant la nuit
Le HEAD de cette branche peut changer ; toujours vérifier le SHA le jour du test. Les préparations successives doivent rester réversibles et ne pas écraser des modifications concurrentes.
