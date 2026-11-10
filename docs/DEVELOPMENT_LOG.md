# MediFollow AI — journal de développement

## 2026-11-10 — Correction ciblée de la dictée médicale

- **Objectif :** rendre opérantes les limites de mots du contexte ORL et la détection Unicode des mots dictés ; les expressions « excellent » restent des suggestions soumises à confirmation médicale.
- **Fichier modifié :** `src/components/OrbAssistant.tsx`.
- **Commits :** `e4c39719b7dac9dc9c63050a83da127855ad6606` (Unicode et début des expressions), `56e18648531e0a600e3686613bae836e8d1b1aa7` (fin des expressions).
- **Contrôle 1 :** relecture ciblée du code modifié et vérification des motifs réguliers ; corrections des antislashs doubles qui empêchaient les correspondances attendues.
- **Contrôle 2 :** lecture indépendante du fichier distant après commits et quatre scénarios JavaScript fictifs (contexte ORL positif/négatif) : 4/4 conformes. Vérification isolée de l'expression Unicode pour « dyspnée » : conforme.
- **Limites :** tests JavaScript ciblés uniquement ; compilation TypeScript, suite `npm run test:all-offline`, interface Chrome Android et scénarios vocaux réels **non exécutés**. Aucune validation médicale.
- **Statut :** correctif versionné, validation complète en attente.
- **Prochaine étape :** lancer `npm run build && npm run test:all-offline`, puis vérifier la dictée sur Android et les confirmations proposées.

## 2026-11-10 — HELIOS : arrêt des relances du microphone après erreur terminale

- **Objectif :** éviter une boucle de réactivation de la reconnaissance vocale après refus de permission, interdiction du service ou absence de microphone sur Chrome Android.
- **Fichier modifié :** `src/components/OrbAssistant.tsx` ; **commit :** `18e00c3da2f5017a24331f5923f8c4add53059c6`.
- **Contrôle 1 :** vérification du flux `onerror` → `onend` : désactivation de l'écoute automatique pour `not-allowed`, `service-not-allowed`, `audio-capture` ; les erreurs récupérables ne changent pas de comportement.
- **Contrôle 2 :** relecture indépendante du fichier distant après commit et simulation Node.js de six codes d'erreur : les trois erreurs terminales empêchent une relance, les trois autres conservent le comportement existant (6/6 conformes à la logique testée).
- **Limites :** simulation ciblée de la logique seulement ; compilation TypeScript, tests d'intégration et essai Chrome Android **non exécutés**. L'erreur réseau peut encore entraîner des relances ; elle sera à traiter avec temporisation/limite de tentatives.
- **Statut :** correctif versionné, validation intégrée en attente. **Suite :** `npm run build && npm run test:all-offline`, puis test des permissions sur Android.

### 2026-11-10 — HELIOS : échec réseau et démarrage du microphone
- Commit : `aeccbc22730c07abec4f6e714b6fa14c0d2d86f4`.
- Fichier : `src/components/OrbAssistant.tsx`.
- Correction : la perte du service réseau vocal coupe les relances automatiques ; un échec synchrone de `recognition.start()` désarme aussi l'écoute automatique. Le médecin peut relancer manuellement. Aucun changement des données cliniques.
- Contrôle 1 : inspection des branches `onerror` et `catch`, cohérence avec les refus d'autorisation déjà traités ; contrôle statique ciblé de la logique.
- Contrôle 2 : relecture du fichier distant après commit et vérification statique de cinq invariants (réseau, exception de démarrage, interruption, fallback texte, absence de parole) : 5/5 présents. Ces contrôles ne prouvent pas l'exécution navigateur.
- Non exécutés : compilation TypeScript, tests hors ligne du projet, essais Chrome Android. Validation intégrée toujours requise.
- Suite : tester sur appareil la reprise manuelle après perte réseau et les commandes composées ; exécuter `npm run build && npm run test:all-offline`.
