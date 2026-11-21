# JARVIS J1 dans MediFollow AI

Base de travail `f5fc0b50f8c4d3fcdbb2ae1d3b1e2129ba881592`, branche `codex/jarvis-j1-interface`.

## Lancement local

Utilisez Node.js 22 ou une version ultérieure et des données fictives.

```bash
npm install
npm run dev:full
```

Ouvrez `http://127.0.0.1:5173/` et choisissez **JARVIS** depuis l’en-tête, le tableau de bord ou la navigation. Les outils locaux exigent une adresse de bouclage, le serveur de développement et une réponse d’autorisation de `/api/chat`. Ils sont désactivés en mode d’accès clinique distant.

Pour une configuration IA autorisée, créez un fichier `.env` côté serveur à partir de `.env.example`, renseignez un fournisseur existant et redémarrez le serveur. Le routeur conserve l’ordre de secours Groq, Cloudflare Workers AI, puis OpenRouter. Sans fournisseur configuré, JARVIS affiche l’état d’indisponibilité. Les imports PDF/TXT et les outils locaux restent utilisables. Chromium peut utiliser un service distant pour la reconnaissance vocale. La lecture à voix haute dépend des capacités et voix du navigateur.

## Comportement

- La conversation démarre sans contexte. Le médecin choisit un patient par identifiant et, au besoin, une consultation rattachée. Le panneau affiche les données préparées pour l’envoi, avec le message, les derniers échanges et les documents explicitement joints. Le nom, le téléphone et les identifiants du patient sont exclus des champs structurés transmis.
- La session vit en mémoire. Changer de dossier, de consultation ou de version pertinente du contexte annule les demandes, retire les documents temporaires et efface la conversation. Changer les documents joints efface l’historique de transmission. Le bouton d’effacement remet la conversation et les confirmations à zéro.
- Le lecteur traite les TXT UTF-8 et les PDF texte, jusqu’à trois fichiers de 5 Mio, 5 000 caractères chacun et 30 pages par PDF. Les lignes ou pages restent visibles. Une page sans texte est signalée. Le moteur de résumé et de comparaison s’appuie sur les références fournies. Un extrait peut être proposé comme note d’histoire dans une nouvelle consultation après choix du patient et aperçu.
- Les outils permettent de rechercher le patient ou un protocole, de consulter le contexte, les ordonnances ou le stock, et d’ouvrir une page autorisée. Le modèle peut proposer une action lors d’un tour textuel avec accord explicite. Les tours contenant des documents, les tours vocaux et leurs réponses sont exclus des propositions d’action.
- Les préparations consultation, objectif de suivi et ligne d’ordonnance ouvrent les formulaires existants. Le médecin vérifie et complète les champs dans ces formulaires. Par exemple, la date d’un suivi et l’ajout de la ligne dans le brouillon d’ordonnance restent des étapes explicites. La réception de stock affiche le lot et les quantités dans JARVIS, puis exige la confirmation de la réception physique dans Inventaire. Le serveur revérifie l’autorisation et le navigateur compare le lot courant sous verrou Web Locks avant l’écriture. Le résultat affiché provient du stockage vérifié.
- Par défaut, la voix attend la relecture de chaque transcription. L’envoi automatique peut être activé explicitement pour enchaîner écoute, traitement, lecture et reprise de l’écoute. La pause, l’arrêt et la mise en arrière-plan coupent le microphone et les reprises programmées. La lecture à voix haute peut être interrompue ou désactivée. Dans **Conversation vocale**, choisissez la **Voix de JARVIS**, puis **Écouter la voix de JARVIS** pour entendre un exemple sans microphone ni fournisseur IA. Le profil applique un débit posé et une tonalité légèrement grave. Les voix disponibles dépendent du navigateur et de l’appareil.

## Vérification

```bash
npm run build
npm run test:complete
npm run test:warm-design
```

La suite `test:complete` inclut les scénarios fictifs de JARVIS. Pour les exécuter seuls, utilisez `npm run test:jarvis`.

Le scénario Chromium requiert Python avec Playwright et Chromium. Lancez les deux versions sur des ports locaux différents.

```bash
python scripts/test-jarvis-browser.py \
  --app http://127.0.0.1:5175/ \
  --baseline http://127.0.0.1:5176/ \
  --output /tmp/medifollow-jarvis-captures
```

Ajoutez `--no-provider` quand le backend local fonctionne avec tous les fournisseurs désactivés. Les réponses IA sont interceptées dans les autres scénarios et les accès réseau externes sont bloqués. Les tests existants gardent leurs assertions sur les liaisons métier, champs et paramètres hors des modifications ciblées. Le nouveau scénario teste aussi les changements de contexte, l’annulation, les réponses tardives, les répétitions, l’échec réseau, la préparation de champs, l’absence d’exécution à partir du texte d’un document, le refus d’accès et l’échec d’écriture.

### Captures avant et après

Chaque comparaison montre la référence à gauche et JARVIS à droite. Les dimensions correspondent à la fenêtre Chromium testée. Les captures présentent l’ensemble de la page.

| Fenêtre | Clair | Sombre |
|---|---|---|
| 1280 × 800 | [Clair](captures/1280x800-light.webp) | [Sombre](captures/1280x800-dark.webp) |
| 800 × 1280 | [Clair](captures/800x1280-light.webp) | [Sombre](captures/800x1280-dark.webp) |
| 360 × 740 | [Clair](captures/360x740-light.webp) | [Sombre](captures/360x740-dark.webp) |

[État du serveur local sans fournisseur](captures/sans-fournisseur.webp)

## Périmètre vérifié

| État | Périmètre |
|---|---|
| Implémenté et testé avec simulation | Conversation, réponse tardive et annulation, cycle vocal et permission refusée, propositions, confirmation, refus d’autorisation, échec d’écriture et dédoublonnage. |
| Vérifié avec un service ou matériel réel | Chromium avec le backend Express local sans fournisseur, extraction dans le lecteur PDF/TXT, formulaires et stockage du navigateur avec données fictives. |
| Implémenté et à vérifier en conditions réelles | Qualité des réponses et citations d’un fournisseur configuré, conversation avec microphone et synthèse vocales physiques. |
| Bloqué ou hors périmètre livré | OCR PNG/JPEG, DOCX, outils distants sur des dossiers serveur, validation/signature/délivrance automatique et Android physique. |

Les résultats IA restent des suggestions soumises au médecin. Le modèle ne dispose ni d’accès à la persistance ni de commandes système. Aucun déploiement, appel IA facturable, test sur données réelles ou fusion n’a été effectué.
