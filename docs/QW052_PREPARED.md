# QW-052 — remise à zéro du contexte visuel lors d'un changement de dossier

**Statut : PRÉPARÉ ; non validé en intégration.**
**Branche isolée :** `prep/qw-052-patient-context-reset-2026-11-12`, créée depuis le HEAD `d126ac8` de la branche d'audit le 12/11/2026.

## Défaut ciblé
Après un filtrage ou une recherche dans la chronologie d'un patient, l'ouverture d'un autre dossier
pouvait conserver ces réglages. De même, le formulaire administratif de modification non sauvegardé
pouvait rester ouvert lors d'un changement de patient. Cela risque de montrer un résultat vide trompeur,
ou des champs de modification antérieurs dans le nouveau dossier.

## Changement minimal
- Une fonction unique `openPatientRecord(patientId)` ouvre un dossier, en réinitialisant le filtre
  de chronologie, la recherche, le filtre de statut des ordonnances et le formulaire d'édition.
- Cette fonction est utilisée pour les dossiers existants et après la création d'un dossier.
- Aucune donnée patient, ordonnance, consultation ou inventaire n'est modifiée par ce correctif.
- Une assertion de non-régression est ajoutée à `test:patient-linkage`.

## Vérifications avant intégration
1. **Ne pas fusionner cette branche immédiatement** : valider d'abord QW-048 à QW-051 sur le SHA exact
   de `audit-stabilisation-2026-11-10` (11/11 jobs V2 et tests locaux).
2. Relire le diff de cette branche isolée. Transférer les changements par une opération Git contrôlée,
   sans forcer, uniquement si la branche d'audit n'a pas déjà introduit une solution équivalente.
3. Exécuter `npm run test:complete` sur la branche de destination.
4. Exiger ensuite la CI V2 terminée, 11/11 réussis sur le **nouveau** HEAD exact.

## Scénario manuel F36 — à reporter en toute fin de validation
Avec deux dossiers **fictifs** :
- Ouvrir A, filtrer « Ordonnances uniquement », choisir « Annulées », saisir une recherche.
- Ouvrir le formulaire de modification de A sans enregistrer.
- Ouvrir B : filtre « tous », recherche vide, statut « tous », formulaire d'édition fermé.
- Vérifier qu'aucune consultation ni ordonnance de A n'a été changée.
- Réouvrir A et vérifier que ses données enregistrées existent toujours.

Cette préparation ne démontre ni une compilation passée ni une sécurité médicale de production.
Pas de fusion vers `main`, de déploiement, d'utilisation de vrais patients ou de dépense.
