# MediFollow AI — travaux restant à conduire (11 novembre 2026)

**Statut : plan, pas annonce de réalisation.** L'application existe déjà ; ne jamais repartir de zéro ou refaire un lot GitHub déjà vert.

## Ordre retenu

| Étape | Nature | Travaux | Critère automatisé de sortie | Intervention médecin |
| --- | --- | --- | --- | --- |
| A | Automatisable | Sécurité et cohérence des dossiers, stock, consultations ; tests des flux de données et erreurs | CI 11/11 et SHA exact, tests fictifs | Non |
| B | Automatisable, complexe | HELIOS Follow-up, Clinical Memory, Trends, Prevention, Referral, Document Reader, Consultation Express, Medical Academy : intégrer progressivement les modules absents sans dégrader les pages existantes | Tests ciblés, régressions, documentation et CI pour chaque lot | Non avant phase finale |
| C | Automatisable, complexe | Agenda RDV, parcours spécialisés, portail patient, fiches pédagogiques, gestion matériel et commandes vocales étendues | Contrats et tests fictifs par module, contrôle d'accès | Non avant phase finale |
| D | Préproduction, bloquant | Authentification/autorisation réelle, hébergement HTTPS, persistance/sauvegardes, confidentialité fournisseurs, référentiel médicaments tunisiens et provenance des recommandations | Revues et tests sécurité ; aucun accès public activé automatiquement | Décisions finales d'hébergement/usage |
| E | **Validation finale uniquement** | Scénarios F01–F19 du protocole `FINAL_LIVE_VALIDATION_PLAN.md`, Android, Windows, voix, stock, clinique et continuité | Résultats réels documentés, pas inférés de la CI | **Oui, regroupés à la fin** |

## Règles de coordination

1. Exécuter les correctifs faciles et indépendants en premier ; limiter les changements à la branche `audit-stabilisation-2026-11-10`.
2. Après chaque commit, vérifier SHA, PR #2 et onze jobs ; ne pas appeler VERT un workflow incomplet.
3. Ne pas relancer un lot validé ni démarrer un lot concurrent qui invalide le workflow précédent.
4. Ne pas fusionner `main`, déployer, engager de dépense ni traiter un patient réel sans accord explicite.
5. Les grandes fonctionnalités HELIOS et la sécurité réelle ne peuvent pas être déclarées « terminées » sans code et validation. Les validations manuelles sont différées **mais restent obligatoires**.
6. Le workflow GitHub Actions et le relais PR publient les résultats ; ils n'exécutent pas d'agent de développement en arrière-plan.
