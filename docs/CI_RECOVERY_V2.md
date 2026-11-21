# Relais CI indépendant — restauration MediFollow AI (11 novembre 2026)

## Pourquoi une V2 indépendante

Des exécutions GitHub Actions de la branche d'audit demeurent bloquées malgré `cancel` et `force-cancel` :
- `43084358671` : ancien commit `234ddcb`, un test en échec ; bilan final jamais terminé.
- `43086300425` : commit corrigé `896845e`, aucun job créé.
- `43097931397` : groupe de concurrence renommé, mais non démarré lors du dernier contrôle.

Un nouveau fichier autonome `.github/workflows/medifollow-audit-v2.yml` reprend les **mêmes jobs** et scripts de vérification que la V1, sur `push` vers `audit-stabilisation-2026-11-10`, sans le verrou de concurrence partagé. Le bilan utilise `!cancelled()` : signaler les échecs sans tenter de publier un résultat à partir d'une exécution annulée.

**IMPORTANT :** une exécution V2 `queued` ou `pending` n'est pas une validation. Déclarer VERT seulement si le SHA du commit correspond au HEAD courant de la PR #2 et si les **11/11 jobs** ont `completed/success`. Aucun statut CI historique n'est transférable vers un nouveau SHA.

## Inventaire transféré (scripts inchangés)

1. Compilation TypeScript/Vite, y compris le mode connexion médecin de test ;
2. Résilience IA ;
3. Tests cliniques, patients/ordonnances, stock, HELIOS Follow-up ;
4. Dictionnaire médical ;
5. Dictée HELIOS ;
6. Coordination des modules ;
7. Inventaire de l'exposition API ;
8. Régressions de sécurité API ;
9. Contrat des permissions ;
10. Tests HTTP d'accès simulés et de sessions ;
11. Relais récapitulatif vers PR #2.

La V2 a obtenu 11/11 sur le SHA `737c4f3`, puis 11/11 sur le SHA `bfca4c5` lors du contrôle de consolidation. V1 a été passée en déclenchement manuel seulement sur la branche d'audit, donc aucun second ensemble de jobs n'est lancé automatiquement.

Si la V2 reste aussi bloquée sans job, il faut considérer une indisponibilité d'ordonnancement GitHub Actions ou un état anormal du dépôt : lancer les tests en local sous Codespaces avec données fictives et ouvrir un ticket GitHub Support muni des identifiants de run. Les tests locaux doivent être signalés comme tels et ne remplacent pas la CI GitHub.

Aucune fusion, aucun déploiement, aucun secret dans la CI, aucun patient réel.
