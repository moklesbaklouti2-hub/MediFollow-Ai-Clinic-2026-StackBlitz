# MediFollow AI — validation groupée QW-048 à QW-051

## Périmètre
- QW-048 : statut documentaire des ordonnances.
- QW-049 : filtre consultations / ordonnances.
- QW-050 : recherche dans les seuls événements du dossier confirmé, sans API.
- QW-051 : filtre par statut des ordonnances, avec statut inconnu explicite.

## Codespaces — une seule campagne de tests
Avant les commandes Git, vérifier et conserver toute modification locale. Ne pas forcer la branche ni supprimer de fichiers.
Branche : `audit-stabilisation-2026-11-10`.

```bash
git status --short
git fetch origin audit-stabilisation-2026-11-10
git switch audit-stabilisation-2026-11-10
git pull --ff-only
git rev-parse --short HEAD
npm run test:complete
echo "RESULTAT=$?"
```

Confirmer le SHA du groupe sur la branche, le code de sortie 0, la compilation et les tests hors ligne.
Cette campagne locale ne remplace pas les 11 contrôles GitHub V2 (permissions/API/CI).

## GitHub Actions
Lire `.github/workflows/medifollow-audit-v2.yml` sur le HEAD exact du groupe.
Exiger 11 jobs `completed/success` et l'exécution globale `completed/success`. Aucune annulation ou file d'attente ne constitue un résultat vert.

## Contrôles fonctionnels ultérieurs
F32 : statuts d'ordonnance ; F33 : filtres par type ; F34 : recherche sans accents ; F35 : statuts filtrés.
Tests finaux Android et Windows, données fictives exclusivement.

## Règles
Aucune fusion vers `main`, aucun déploiement, aucune nouvelle dépense et aucun patient réel.
Les résultats techniques ne sont pas une validation de sécurité médicale.
