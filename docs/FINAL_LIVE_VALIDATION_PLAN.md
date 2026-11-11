# MediFollow AI — protocole final de validation en direct

**Statut : PRÉPARÉ, NON EXÉCUTÉ.** Toutes les cases ci-dessous restent à cocher après la fin du développement automatisable. Aucun test manuel sur un véritable téléphone ou ordinateur n'a été réalisé par ce document.

## Règles impératives

- **N'utiliser que des patients et ordonnances fictifs**, sans identifiant, photo ou document de vrai patient.
- **Ne pas déployer** sur Internet, fusionner `main` ou rendre les ports Codespaces publics pour réaliser ces essais. Les scénarios d'authentification HTTPS exigent une configuration de test isolée conforme au guide technique, et ne justifient pas un serveur public.
- À chaque échec, noter l'identifiant du scénario, l'appareil/navigateur, les étapes précises et l'erreur observée ; ne pas réessayer des actions de stock déjà exécutées sans vérifier l'état enregistré.
- Les résultats CI ne constituent **pas** des validations cliniques, légales, de confidentialité ou d'accessibilité réelles.
- **Ne demander la présence du médecin qu'à la phase de validation finale**, une fois les lots automatisables terminés et les blocages techniques explicitement recensés.

## Pré-requis automatiques (sans présence du médecin)

- [ ] HEAD audit = HEAD PR #2, PR en brouillon, `main` inchangée.
- [ ] Dernière CI GitHub Actions `completed/success` : **11/11 jobs réussis sur le SHA final**.
- [ ] Compilation frontend TypeScript/Vite sur le SHA final ; suite `test:all-offline` et tous les contrôles de sécurité isolés terminés.
- [ ] Tests de sécurité des accès 401/403/CSRF/exposition réseau en environnement *fictif*, sans comptes ni patients réels.
- [ ] Traçabilité inventaire, cas homonymes, documents orphelins, limites d'entrées IA, dictée et non-répétition passés dans la CI.
- [ ] Revue des risques ouverts QW-007 (authentification/autorisation réelle), QW-008 (confidentialité fournisseurs) et de tout problème critique découvert ; ne pas confondre « tests verts » et « prêt pour patients réels ».

## Phase 1 — Essais fonctionnels en direct (À LA FIN UNIQUEMENT)

Chaque scénario doit être marqué **OK**, **ÉCHEC** ou **NON TESTABLE** ; aucune case n'est pré-validée.

| ID | Dispositif | Manipulation avec données fictives | Résultat attendu | Résultat |
| --- | --- | --- | --- | --- |
| F01 | Windows / navigateur | Ouvrir Dashboard, Patients, Consultations, Copilote IA, Protocoles, Ordonnances, Inventaire et Paramètres | Toutes les pages s'ouvrent sans erreur ni perte de navigation | ☐ |
| F02 | Android Chrome | Ouvrir les mêmes pages, naviguer entre elles et revenir au Dashboard | Interface lisible, boutons atteignables et aucune saisie perdue | ☐ |
| F03 | Windows + Android | Créer deux patients fictifs homonymes avec identifiants distincts | Deux dossiers distincts ; aucune consultation ou ordonnance fusionnée par nom | ☐ |
| F04 | Windows | Ajouter, modifier et retrouver une consultation sur le bon patient ; enregistrer spécialité, motif, histoire et constantes | Données conservées, spécialité correcte, graphiques pertinents | ☐ |
| F05 | Windows | Tester examen structuré « non examiné », « anormal » et « normal » | Aucune donnée absente ne devient « normale » automatiquement | ☐ |
| F06 | Windows | Charger un ancien document fictif ambigu (homonymes), essayer de le sauvegarder sans sélectionner de dossier confirmé | Alerte Dashboard visible ; aucune attribution arbitraire et sauvegarde refusée tant que l’identité reste incertaine | ☐ |
| F07 | Windows | Ajouter une ordonnance fictive avec traitements, analyses, imagerie et autres | Les quatre catégories et les éléments prescrits sont conservés | ☐ |
| F08 | Windows | Ajouter deux lots fictifs d'un même produit, délivrer une quantité, tenter retour/annulation | Quantités exactes, traçabilité et refus des opérations dangereuses | ☐ |
| F09 | Windows | Essayer de supprimer un article fictif lié à un mouvement/une ordonnance, puis un article neuf | Article tracé protégé ; article neuf supprimable après confirmation | ☐ |
| F10 | Windows | Exporter un dossier **entièrement fictif** en JSON puis réimporter dans un contexte de test isolé | Patients, consultations, ordonnances et liens cohérents, sans doublons ni perte | ☐ |
| F11 | Windows | Essayer une saisie très longue, un historique invalide et un contexte invalide en environnement de test | Refus clair avant appel IA, pas de réponse prétendument fondée sur des données absentes | ☐ |
| F12 | Windows | Tester HELIOS sur scénarios synthétiques ORL, vertiges, douleur thoracique et pédiatrie | Alerte sur signes de gravité ; inconnues non inventées ; décision du médecin préservée | ☐ |
| F13 | Android Chrome | Refuser permission du micro, puis autoriser après action volontaire | Aucun enregistrement résiduel ni commande exécutée après refus | ☐ |
| F14 | Android Chrome | Dicter ~80 mots fictifs, incluant exsudat, dyspnée, odynophagie et adénopathie | Pas de boucle, pas de répétition excessive ; corriger les erreurs visibles | ☐ |
| F15 | Android Chrome | Dicter « ouvre Patients », « ouvre Consultations », sélectionner un patient fictif et remplir un champ | Navigation et modifications réellement appliquées, ou limitation clairement signalée | ☐ |
| F16 | Android Chrome | Activer/désactiver lecture vocale, arrêter en cours, fermer/réouvrir Orb, couper le réseau | Pas de parole ni commande ancienne après arrêt, erreur ou fermeture | ☐ |
| F17 | Windows | Tester interruption et reprise réseau, rafraîchissement navigateur, échec simulé de sauvegarde | Aucun faux message de succès ; données déjà sauvegardées retrouvées | ☐ |
| F18 | Android/Windows, HTTPS fictif isolé si disponible | Tester connexion médecin, refus 401/403, expiration, déconnexion et retour d'onglet | Interface verrouillée en absence de session ; aucune requête clinique non authentifiée | ☐ |
| F19 | Windows + Android | Vérifier lisibilité mode sombre, clavier, focus, tailles de texte et affichage des alertes | Contrastes lisibles, commandes accessibles et pas d'information coupée | ☐ |
| F20 | Windows + Android | Programmer un contrôle HELIOS fictif, le retrouver sur le tableau de bord et la liste, puis le marquer effectué après confirmation ; tester aussi l’annulation | Échéance cohérente, dossier confirmé, aucune clôture sans confirmation, contrôle effectué retiré des échéances | ☐ |
| F21 | Windows + Android | Renseigner allergies, traitements, antécédents médicaux/chirurgicaux/familiaux et diagnostics fictifs dans deux dossiers distincts ; ouvrir HELIOS Clinical Memory | Contenus séparés par patient et rubrique ; dates d'antécédents étiquetées « déclarées » ; provenance des diagnostics ; champs vides « Non renseigné » ; aucune modification automatique ni appel IA | ☐ |
| F22 | Windows + Android | Enregistrer trois consultations fictives datées avec poids, PAS et glycémie ; comparer HELIOS Trends, puis saisir une mesure textuelle invalide | Les deux dernières valeurs numériques par constante sont comparées dans l'ordre des dates ; l'écart et l'unité sont affichés sans interprétation ; les saisies non numériques sont exclues | ☐ |
| F23 | Windows + Android | Ouvrir deux dossiers fictifs avec dates de consultation distinctes ; examiner HELIOS Prevention, puis un dossier sans consultation | Repères de discussion présents mais aucune éligibilité, vaccination manquante, échéance ou acte réalisé déduit ; date limitée au dossier sélectionné ; aucune requête IA | ☐ |
| F24 | Windows + Android | Consigner deux consultations fictives datées pour un patient, et une consultation plus récente pour un autre ; ouvrir HELIOS Referral | Seule la dernière consultation du bon dossier apparaît, avec champs manquants explicites ; aucun courrier ni décision d'orientation ; aucune donnée transmise | ☐ |
| F25 | Windows + Android | Coller un court texte fictif et un texte trop long dans HELIOS Document Reader, puis changer de dossier et revenir | Texte affiché littéralement, longueur limitée, effacement effectif, aucun brouillon reporté sur l'autre patient ni persistance après fermeture | ☐ |
| F26 | Windows + Android | Ouvrir Protocoles puis HELIOS Medical Academy, consulter les quatre références institutionnelles en navigation externe | Liens sécurisés accessibles ou erreur clairement visible, aucune donnée patient envoyée, fiches de démonstration non présentées comme validées | ☐ |
| F27 | Windows + Android | Ouvrir HELIOS Consultation Express, sélectionner un dossier fictif unique et une spécialité ; coller une note balisée ; essayer de remplacer un champ rempli, changer de patient avant sauvegarde, puis confirmer/annuler la remise à zéro | Préremplissage correct, aucun écrasement ni sauvegarde automatique, aucune analyse IA pendant discordance patient, sauvegarde refusée ; annulation conserve les champs, confirmation efface seulement la consultation non enregistrée | ☐ |
| F28 | Windows + Android | Enregistrer trois consultations fictives de spécialités variées dans un dossier, et une autre consultation dans un deuxième dossier ; ouvrir HELIOS Parcours spécialisés | Spécialités, nombre de visites et dernières dates corrects par dossier ; spécialité absente signalée, aucune donnée interpatient ni diagnostic ou parcours inventé | ☐ |
| F29 | Windows + Android | Enregistrer des consultations fictives de spécialités et motifs variés, introduire un ancien document sans patient unique et observer les statistiques HELIOS Activité | Comptages par spécialité et motif exacts, documents à patient ambigu exclus et décomptés, aucun diagnostic ni taux médical déduit | ☐ |

La bonne exécution du scénario F18 requiert un banc HTTPS **de test**, et non l'activation d'un accès Internet public.

## Phase 2 — Revue humaine et juridique : bloquants patients réels

- [ ] Revue médicale par le médecin de scénarios de gravité et de diagnostics différentiels, **sans considérer les pourcentages IA comme probabilités validées**.
- [ ] Évaluation documentée de la législation et des autorisations applicables aux données de santé en Tunisie, y compris l'envoi à Groq, Cloudflare Workers AI et OpenRouter ; vérification des contrats, transferts, conservation et minimisation.
- [ ] Mise en place et audit d'un serveur HTTPS réel avec authentification et autorisation par dossier, stockage persistant sécurisé, sauvegardes/restauration et supervision.
- [ ] Contrôle de provenance et disponibilité en Tunisie des médicaments et recommandations médicales ; aucune « base certifiée » présumée.
- [ ] Revue des incidents et défauts connus, puis décision explicite du médecin avant toute fusion, publication ou données réelles.

## Décision de sortie

**Ne pas déclarer « application validée en direct » tant que F01–F29 n'ont pas été exécutés ou explicitement classés NON TESTABLE et que leurs blocages n'ont pas été résolus.** Même des essais fonctionnels réussis ne signifient pas automatiquement une autorisation d'usage clinique réel.

À l'issue de la session de validation, produire une synthèse unique : version/commit testé, plateforme, navigateur, résultats F01–F29, anomalies et décision GO/NO-GO motivée. Aucun résultat ne doit être inventé.
