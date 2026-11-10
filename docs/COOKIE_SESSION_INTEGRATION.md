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

## Renforcement de l'expiration et de la deconnexion (tests du 10 novembre 2026)

- `src/services/doctorGateTransitions.ts` : transitions deterministes `verifying/login/authenticated/locked/logout-pending`. La fermeture de l'interface clinique precede la demande de revocation de la session.
- En cas d'echec reseau a la deconnexion, le mode d'essai conserve un ecran **verrouille** avec un bouton de nouvelle tentative; il ne pretend pas qu'une session a ete revoquee. Un statut 401 (session deja invalide) peut finaliser la deconnexion.
- Passage du navigateur en arriere-plan : retrait de l'interface clinique; au retour, nouvelle verification de la session avant son affichage. Les requetes de verification tardives ne doivent pas rouvrir un ecran en cours de deconnexion.
- `scripts/test-doctor-gate-transitions.mts` : verification unitaire des transitions d'expiration, du retour de veille et de la deconnexion avec echec reseau.
- `server/index.ts` accepte `COOKIE_AUTH_TEST_TTL_MS` **uniquement en mode `integration-test` lie au loopback** (de 1000 ms a 24 heures), afin de tester une session de courte duree.
- `scripts/test-real-cookie-clinical-integration.mts` : apres un nouveau login fictif, attend l'expiration reelle du cookie et exige 401 sur `/api/auth/csrf` ainsi que sur les trois routes POST de la vraie API Express.

**Limitation importante :** le navigateur ne peut pas forcer la revocation distante d'une session si le serveur est injoignable. Un rafraichissement de page peut recuperer un cookie encore valide tant que le serveur ne l'a pas revoque; ce mode n'est pas utilisable pour des donnees de patients reels. La revocation garantie entre onglets/appareils, la fermeture des connexions en cours, le chiffrement du stockage et les tests Android/HTTPS reels restent a concevoir et a valider.

### Checklist manuelle Android (uniquement avec donnees fictives, apres un vrai HTTPS de test)

1. En configuration normale sans indicateur, verifier que l'application locale conserve ses fonctions usuelles.
2. En mode d'essai HTTPS, verifier que le tableau de bord n'est **pas** charge avant une connexion valide.
3. Essayer un mot de passe incorrect, puis valide, et s'assurer qu'aucun jeton n'apparait dans le stockage du navigateur.
4. Ouvrir une consultation fictive, envoyer une question HELIOS, puis passer la tablette en arriere-plan : l'ecran doit se verrouiller.
5. Revenir au premier plan : verifier la session avant de revoir le dossier fictif.
6. Cliquer sur deconnexion, constater le verrouillage immediat et verifier qu'un cookie revoque ne permet pas d'acceder aux routes cliniques.
7. Simuler une coupure reseau pendant la deconnexion : l'ecran doit rester verrouille et proposer de reessayer.
8. Sans connexion, tenter les trois API cliniques : 401 attendu. Avec mauvaise origine/CSRF : 403 attendu.

Cette checklist ne remplace PAS un audit securite medical ni des tests multiplateformes; le mode d'integration actuel n'offre **pas** de serveur HTTPS public utilisable depuis Android.

## Controle HTTPS reel sur boucle locale (test automatise)

`scripts/test-real-local-https-cookie-proxy.mjs` demarre le vrai serveur Express (`integration-test`, lie uniquement a `127.0.0.1:3001`) avec des identifiants **fictifs**. Un proxy HTTPS ephemere ecoute sur un port local aleatoire, cree un certificat autosigne temporaire (`openssl`), puis le client de test **verifie** ce certificat via l'autorite locale propre au test : il n'utilise pas `rejectUnauthorized: false` et ne desactive jamais la verification TLS globale.

Le proxy autorise uniquement `/api/`, transmet a une destination locale fixe, supprime les en-tetes `X-Forwarded-*` du client et les reconstruit. Le test exige :
- 403 pour une connexion HTTP directe sans proxy TLS ;
- 401 pour les appels cliniques anonymes sur le proxy HTTPS ;
- 403 pour une origine etrangere ou un CSRF manquant ;
- 204 et cookie `__Host-medifollow_session` `HttpOnly; Secure; SameSite=Strict` au login ;
- 400 (validation des vrais handlers) pour les trois appels cliniques **fictifs** apres authentification et CSRF valides ;
- 204 pour la deconnexion, puis 401 pour toute tentative de reutiliser le cookie revoque.

Le certificat et sa cle ne sont **jamais commits** : ils sont generes dans un dossier temporaire et effaces apres le test. Aucune cle API, aucun dossier patient, aucune connexion Internet ni hebergement distant. Le workflow GitHub Actions execute le test avec OpenSSL deja fourni par les runners Ubuntu.

**Ce test ne valide pas Chrome Android, les cookies sur mobile, une infrastructure publique, un certificat d'autorite reconnue ni l'hebergement de donnees medicales.** Le mode de test reste uniquement local et ne doit pas etre expose a Internet.

## Avant tout branchement dans le serveur clinique
1. Provisionner un identifiant et un hash scrypt forts **cote serveur**, hors Git ; ne jamais exposer les secrets au frontend.
2. Configurer et verifier HTTPS de bout en bout, `PUBLIC_ORIGIN`, un reverse proxy dont la confiance est restreinte a des adresses/IP precises. Ne jamais faire `app.set('trust proxy', true)` pour l'ensemble d'Internet.
3. Monter les gardes **avant** les handlers des trois routes reelles ; retirer l'ancien acces direct non authentifie. Verifier que toutes les autres routes/fichiers exposes restent proteges.
4. Adapter les appels cliniques React pour obtenir/envoyer `x-medifollow-csrf`, gerer 401, 403, 429, expiration et deconnexion ; monter l'interface `DoctorLogin` seulement apres.
5. Tester avec un vrai navigateur (notamment Android) et un vrai proxy HTTPS ; verifier cookies, CSRF, cache, entetes Origin et erreurs sans fuite de jetons.
6. Definir la strategie de stockage, de sauvegarde, la politique de confidentialite et le cadre tunisien des donnees medicales. Le `sessionStore` actuel est en memoire : redemarrage = sessions perdues, plusieurs serveurs non pris en charge. Le verrouillage des tentatives est lui aussi propre a un seul processus.
7. Mettre en place une revue de securite avant utilisation avec des patients reels. **Ne pas considerer les workflows verts comme une autorisation de mise en production.**

Mode distant normal actuel : les trois routes cliniques de `server/index.ts` restent bloquees par un statut 503. Le routeur cookie n'est monte qu'en mode d'integration synthetique lie a la boucle locale.
