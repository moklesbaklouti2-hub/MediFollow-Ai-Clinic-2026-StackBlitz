# Sessions medecin par cookie — porte d'integration (10 novembre 2026)

Etat : **implementation et test HTTP isoles uniquement** sur `audit-stabilisation-2026-11-10`. Pas de montage dans `server/index.ts`, pas de deploiement, pas de modification de `main`.

## Modules prepares
- `server/security/doctorCookieAuth.ts` : POST `/api/auth/login` (204, cookie `__Host-medifollow_session`, HttpOnly, Secure, SameSite=Strict, Path=/), GET `/api/auth/csrf` (jeton HMAC lie a la session, JSON sans cache), POST `/api/auth/logout` (revocation/expiration du cookie), et gardes POST pour les trois API cliniques.
- Les actions POST refusent les origines absentes ou differentes de `PUBLIC_ORIGIN`, les connexions non considerees HTTPS et les jetons CSRF manquants/incorrects. Un cookie absent/expire/revoque provoque 401.
- `src/services/doctorAuthClient.ts` : connexion 204 et deconnexion accompagnee du jeton CSRF recupere a la demande, sans persistance dans `localStorage`/`sessionStorage`.
- `scripts/test-doctor-cookie-auth.mts` : test HTTP fictif derriere un reverse proxy **simule** (loopback uniquement) ; sans donnees de patients. Le test ne prouve ni HTTPS reel ni securite d'un reverse proxy public.

## Avant tout branchement dans le serveur clinique
1. Provisionner un identifiant et un hash scrypt forts **cote serveur**, hors Git ; ne jamais exposer les secrets au frontend.
2. Configurer et verifier HTTPS de bout en bout, `PUBLIC_ORIGIN`, un reverse proxy dont la confiance est restreinte a des adresses/IP precises. Ne jamais faire `app.set('trust proxy', true)` pour l'ensemble d'Internet.
3. Monter les gardes **avant** les handlers des trois routes reelles ; retirer l'ancien acces direct non authentifie. Verifier que toutes les autres routes/fichiers exposes restent proteges.
4. Adapter les appels cliniques React pour obtenir/envoyer `x-medifollow-csrf`, gerer 401, 403, 429, expiration et deconnexion ; monter l'interface `DoctorLogin` seulement apres.
5. Tester avec un vrai navigateur (notamment Android) et un vrai proxy HTTPS ; verifier cookies, CSRF, cache, entetes Origin et erreurs sans fuite de jetons.
6. Definir la strategie de stockage, de sauvegarde, la politique de confidentialite et le cadre tunisien des donnees medicales. Le `sessionStore` actuel est en memoire : redemarrage = sessions perdues, plusieurs serveurs non pris en charge. Le verrouillage des tentatives est lui aussi propre a un seul processus.
7. Mettre en place une revue de securite avant utilisation avec des patients reels. **Ne pas considerer les workflows verts comme une autorisation de mise en production.**

Mode distant actuel : les trois routes cliniques de `server/index.ts` restent bloquees par un statut 503 lorsqu'il est active. Le nouveau routeur cookie n'est pas monte.
