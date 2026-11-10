# Choix d'hébergement : accès distant sécurisé (étude préalable)

Décision : accès depuis tablette, ordinateur et Internet. Un médecin au départ, autres utilisateurs ultérieurement. Aucune exposition publique ni migration de patients autorisée à ce stade.

## Options à comparer

| Option | Atouts | Risques / conditions |
| --- | --- | --- |
| Serveur privé au cabinet en Tunisie | Contrôle physique et résidence locale | Coupures, maintenance, sauvegardes hors site, connexion et alimentation |
| Hébergement professionnel situé en Tunisie | Disponibilité et exploitation potentiellement meilleures | Vérifier localisation réelle des données, sous-traitants, sécurité, contrat, coût |
| Cloud étranger | Déploiement commode | Transfert de données à l'étranger soumis à vérification réglementaire et autorisation préalable applicable |

## Références publiques

- Loi organique tunisienne n° 2004-63, notamment articles 51, 52, 62 et 63 : https://legislation-securite.tn/latest-laws/loi-organique-n-2004-63-du-27-juillet-2004-portant-sur-la-protection-des-donnees-a-caractere-personnel/
- Cloudflare Tunnel, documentation technique : https://developers.cloudflare.com/tunnel/get-started/
- Cloudflare Access, contrôle d'accès à une application auto-hébergée : https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/

Attention : la proposition de loi n°25/2018 n'est pas une loi promulguée ; ne pas la citer comme droit en vigueur. La localisation en Tunisie n'est pas à elle seule une garantie de conformité. Vérifier les obligations auprès de l'INPDP et d'un conseil juridique local.

## Conditions préalables au déploiement

1. Exiger HTTPS, authentification côté serveur et refus par défaut sur les routes cliniques réelles.
2. Stocker les dossiers patients et sauvegardes de manière persistante, chiffrée et avec restauration testée ; pas uniquement dans le navigateur.
3. Prévoir protection CSRF, cookies HttpOnly/Secure, limitation des tentatives persistante et journalisation sans données sensibles.
4. Tester accès Android et ordinateur, expiration, déconnexion, coupures Internet et sauvegardes.
5. Examiner les transferts vers Groq, Cloudflare Workers AI et OpenRouter : ne pas envoyer de données de santé identifiables sans base juridique et garanties vérifiées.
6. Comparer offres locales réelles sur disponibilité, contrat, localisation, sauvegardes, coûts et exigences de conformité.
7. Ne pas exposer Codespaces, le port Express 3001 ou un tunnel public avant validation de sécurité et accord explicite.

**Statut : étude préparatoire uniquement ; aucun fournisseur choisi, aucun serveur déployé, aucune dépense engagée.**
