# Matrice d'accès proposée — MediFollow AI

**État : proposition à valider, non implémentée.** Aucune route n'est protégée par ce document. Ne pas utiliser de données réelles avant validation de l'architecture de confidentialité.

## Principes
- Refus par défaut ; accès limité aux fonctions nécessaires au rôle ; aucune clé fournisseur IA exposée au navigateur.
- Le médecin est responsable des décisions cliniques ; l'IA n'agit pas de manière autonome sur les prescriptions.
- Les accès patients sont séparés des accès professionnels ; un patient ne consulte que ses propres informations autorisées.
- Les actions sensibles nécessitent un audit horodaté sans texte clinique ni secret dans les journaux techniques.

## Matrice proposée
| Fonction | Médecin authentifié | Personnel autorisé | Patient authentifié | Visiteur |
| --- | --- | --- | --- | --- |
| Santé technique du serveur (réponse minimale) | Oui | Oui | Oui | Oui, sans configuration IA |
| Dossier clinique complet | Oui, patients suivis | Limité à ses tâches explicites | Non | Non |
| Analyse clinique IA | Oui | Non par défaut | Non | Non |
| Commandes vocales modifiant un dossier | Oui, confirmation pour action sensible | Selon permission explicite, sans prescription | Non | Non |
| Chat clinique | Oui | Non par défaut | Non | Non |
| Ordonnance : création/validation | Médecin seulement | Non | Non | Non |
| Ordonnance : consultation | Oui | Selon permission | Uniquement documents explicitement publiés | Non |
| Inventaire cabinet | Oui | Selon permission | Non | Non |
| Contenus éducatifs publics validés | Oui | Oui | Oui | Oui |
| Téléversement et lecture des pièces jointes | Patients suivis, avec contrôle d'accès | Selon permission | Seulement fichiers explicitement partagés | Non |

## Questions à trancher avant développement de l'authentification
1. Cabinet mono-médecin au lancement ou comptes multiples dès le départ ?
2. Le personnel a-t-il un accès aux données cliniques, ou seulement à l'accueil/agenda ?
3. L'espace patient nécessite-t-il un compte ou seulement des fiches éducatives publiques ?
4. Hébergement local privé, accès distant sécurisé ou déploiement Internet ?

## Critères de tests futurs
- Sans session : 401 pour les routes protégées ; session sans rôle requis : 403.
- Un identifiant patient différent ne permet jamais de lire un dossier tiers (contrôle objet par objet).
- Une ordonnance ne peut pas être validée par un compte non médecin.
- Les appels API ne renvoient ni clé IA ni donnée patient dans les erreurs.
- Les tests utilisent exclusivement des données fictives ; exécution en environnement isolé.

**Aucune décision de sécurité n'est réputée approuvée par l'ajout de ce fichier.**
