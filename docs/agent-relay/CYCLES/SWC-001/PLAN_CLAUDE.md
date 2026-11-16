# SWC-001 — Plan attribué à Claude (transcription)

**Origine :** compte rendu de Claude fourni dans la conversation par l'utilisateur, ensuite résumé ici par ChatGPT. **Ne pas attribuer ce commit à Claude.**

## Besoin / risque
- Assurer la continuité de l'affichage React si `localStorage` est interdit, absent ou déclenche une exception.
- Préserver les choix de thème `dark/light/auto`, la migration historique et la distinction « préférence enregistrée » / « uniquement en session ».
- Ne pas introduire de changement fonctionnel dans les dossiers patients.
- Le plan plus large de Claude recommandait aussi : corriger le faux positif `inactif` du Dashboard, améliorer la lisibilité et la navigation tablette ; **ces sujets ne sont pas autorisés dans SWC-001**.

## Vérifications exigées
- Compilation TypeScript/Vite, scripts de tests existants, nouveaux tests ciblés.
- Scénarios navigateur : stockage normal, lecture/refus, écriture/refus, getter refusé.
- Contrôle du bandeau d'erreur et de la détection des échecs de sauvegarde.
- Audit externe sur le **diff du commit exact** et sur l'impact du service `storage.ts`.

## Décision de périmètre ChatGPT
**SWC-001 = thème + protection des erreurs de sauvegarde directement induites par la modification du service, tests et revue.** Le KPI du Dashboard est différé à une décision métier distincte. Branches `main` et Premium protégées ; PR en brouillon seulement.

## Sources de référence
- Protocole GitHub : https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/issues/3
- Ticket SWC-001 : https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/issues/5
- PR en cours : https://github.com/moklesbaklouti2-hub/MediFollow-Ai-Clinic-2026-StackBlitz/pull/6
