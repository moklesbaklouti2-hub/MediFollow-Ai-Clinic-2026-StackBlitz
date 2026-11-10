# Sessions medecin par cookie — porte d'integration (10 novembre 2026)

Etat : **integration des VRAIS gestionnaires cliniques possible uniquement en mode de test synthetique** sur `audit-stabilisation-2026-11-10`. Aucun deploiement, pas de modification de `main`. En mode distant normal, les trois routes sensibles restent bloquees par 503.

## Modules prepares
- `server/security/doctorCookieAuth.ts` : POST `/api/auth/login` (204, cookie `__Host-medifollow_session`, HttpOnly, Secure, SameSite=Strict, Path=/), GET `/api/auth/csrf` (jeton HMAC lie a la session, JSON sans cache), POST `/api/auth/logout` (revocation/expiration du cookie), et gardes POST pour les trois API cliniques.
- Les actions POST refusent les origines absentes ou differentes de `PUBLIC_ORIGIN`, les connexions non considerees HTTPS et les jetons CSRF manquants/incorrects. Un cookie absent/expire/revoque provoque 401.
- `src/services/doctorAuthClient.ts` : connexion 204 et deconnexion accompagnee du jeton CSRF recupere a la demande, sans persistance dans `localStorage`/`sessionStorage`.
- `scripts/test-doctor-cookie-auth.mts` : test HTTP fictif derriere un reverse proxy **simule** (loopback uniquement) ; sans donnees de patients. Le test ne prouve ni HTTPS reel ni securite d'un reverse proxy public.
- `src/services/doctorClinicalTransport.ts` : transport React preparatoire `postDoctorClinical(path, body, { signal })`, qui obtient le jeton CSRF avant chaque appel POST; si l'etape CSRF echoue, aucun appel clinique n'est envoye. L'annulation via `AbortSignal` est transmise a la requete CSRF et a la requete clinique.
- `scripts/test-doctor-clinical-transport.mts` : tests simules des trois routes, des sessions expirees (401), jetons CSRF invalides, refus 403 et annulation sans repli en clair.

### Points d'integration React identifies
- `src/hooks/useClinicalReasoning.ts` : POST `/api/clinical/analyze`
- `src/components/OrbAssistant.tsx` : POST `/api/commands/interpret` et POST `/api/chat`

**Les trois composants utilisent maintenant `sendClinicalRequest`, avec un branchement conditionnel :**
- sans variable `VITE_DOCTOR_AUTH_MODE`, les appels locaux continuent **exactement sans session** ; ce mode de developpement ne doit jamais etre expose avec des donnees patients reelles ;
- avec `VITE_DOCTOR_AUTH_MODE=integration-test`, `src/main.tsx` affiche `DoctorAppGate` et non `App` tant que la session medecin n'a pas ete verifiee par `GET /api/auth/csrf`. Le navigateur doit etre sur HTTPS ;
- avec toute autre valeur non vide, la porte se ferme et l'application clinique ne s'affiche pas. Le client ne retourne jamais en mode sans authentification lorsque le mode securise a ete demande.
- le gate affiche `DoctorLogin`, gere la connexion, la deconnexion (fermeture immediate de l'interface), l'expiration (401/403), l'arriere-plan et une verification toutes les 30 secondes ; aucun jeton de session n'est conserve en stockage navigateur.

`scripts/test-doctor-react-gate.mjs` controle statiquement le raccordement et le refus des contournements ; `scripts/test-doctor-react-local-transport.mts` confirme les trois requetes du mode local. Le workflow compile le mode normal et le mode d'essai. Le transport CSRF effectue une requete de preparation avant chaque POST : cache memoire non active.

**Limite essentielle :** le mode d'essai ne constitue PAS un vrai acces distant : le serveur `integration-test` est lie uniquement a la boucle locale et HTTPS n'est que simule dans les tests. Aucune validation en vrai navigateur Android ou deploiement multi-appareils n'a encore ete obtenue.


## Verification de la vraie API Express en environnement de test

Le module `server/index.ts` importe le garde de session cookie, mais ne l'active qu'avec **toutes** les conditions explicites suivantes : `NODE_ENV=production`, `REMOTE_ACCESS_MODE=enabled`, `PUBLIC_ORIGIN` HTTPS valide, `REMOTE_TRUST_PROXY=verified`, `REMOTE_COOKIE_AUTH_MODE=integration-test`, `COOKIE_AUTH_TEST_ONLY_ACK=synthetic-fixture-only`, et des identifiants fictifs provisionnes par environnement (`DOCTOR_USERNAME`, `DOCTOR_PASSWORD_HASH`). Sans ces conditions, le serveur refuse de demarrer dans ce mode d'integration. Le serveur est alors lie uniquement a `127.0.0.1:3001` et peut accepter des en-tetes de proxy HTTPS uniquement depuis le loopback dans le cadre du test.

`scripts/test-real-cookie-clinical-integration.mts` demarre ce vrai serveur Express sans fournisseur IA et sans donnees patients. Il verifie :
- sans session, les 3 routes POST repondent 401 ;
- avec cookie valide mais CSRF absent/invalide, 403 ;
- avec cookie, CSRF et Origin corrects, les **vrais gestionnaires** traitent des donnees volontairement invalides et repondent 400 (validation métier) ;
- apres deconnexion, les 3 routes retournent 401 ;
- le mode distant normal conserve le verrou 503 (`test-real-remote-http-gate.mjs`).

**Ce mode de test local est interdit pour un deploiement public.** Les en-tetes HTTPS sont simules ; il reste a valider une infrastructure TLS, les appels React en navigateur reel et a mener un audit de securite. Le code React est raccorde sous indicateur d'essai mais l'interoperabilite HTTPS en environnement reel est encore a demontrer.

## Avant tout branchement dans le serveur clinique
1. Provisionner un identifiant et un hash scrypt forts **cote serveur**, hors Git ; ne jamais exposer les secrets au frontend.
2. Configurer et verifier HTTPS de bout en bout, `PUBLIC_ORIGIN`, un reverse proxy dont la confiance est restreinte a des adresses/IP precises. Ne jamais faire `app.set('trust proxy', true)` pour l'ensemble d'Internet.
3. Monter les gardes **avant** les handlers des trois routes reelles ; retirer l'ancien acces direct non authentifie. Verifier que toutes les autres routes/fichiers exposes restent proteges.
4. Adapter les appels cliniques React pour obtenir/envoyer `x-medifollow-csrf`, gerer 401, 403, 429, expiration et deconnexion ; monter l'interface `DoctorLogin` seulement apres.
5. Tester avec un vrai navigateur (notamment Android) et un vrai proxy HTTPS ; verifier cookies, CSRF, cache, entetes Origin et erreurs sans fuite de jetons.
6. Definir la strategie de stockage, de sauvegarde, la politique de confidentialite et le cadre tunisien des donnees medicales. Le `sessionStore` actuel est en memoire : redemarrage = sessions perdues, plusieurs serveurs non pris en charge. Le verrouillage des tentatives est lui aussi propre a un seul processus.
7. Mettre en place une revue de securite avant utilisation avec des patients reels. **Ne pas considerer les workflows verts comme une autorisation de mise en production.**

Mode distant normal actuel : les trois routes cliniques de `server/index.ts` restent bloquees par un statut 503. Le routeur cookie n'est monte qu'en mode d'integration synthetique lie a la boucle locale.
