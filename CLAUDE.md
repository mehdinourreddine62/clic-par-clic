# Clic par clic

Site gratuit de leçons Excel animées, pour des étudiants. Publié avec GitHub Pages :
https://mehdinourreddine62.github.io/clic-par-clic/

Le `README.md` décrit l'organisation des fichiers et tous les champs d'une leçon. Lis-le avant de modifier quoi que ce soit.

## Le propriétaire

- Il crée le site pour ses étudiants, avec l'ambition de le faire connaître plus largement.
- Il préfère des réponses directes, claires et factuelles, en français, sans fioritures.
- En cas de doute sur ce qu'il veut, pose-lui la question avant de te lancer.
- Avant une série de leçons, propose-lui d'abord la liste ; il répond oui ou non par élément.

## Le public

- Des étudiants, tous sur **Excel Microsoft 365 ou la dernière version**, en français, sur Windows. Les fonctions récentes (RECHERCHEX, SI.CONDITIONS, LET…) sont donc utilisables.
- Lire beaucoup de consignes les démotive : l'animation doit porter l'explication.

## Règles de rédaction des leçons

- **Une seule phrase courte par étape** (environ 125 caractères au plus), sans abréviation, au vouvoiement.
- Noms de fonctions et de menus **en français**, séparateur `;`, virgule décimale.
- Des données réalistes et cohérentes ; les résultats affichés doivent être exacts (calcule-les).
- Montrer le geste : `drag`, `btn`, `keys`, `fill`, `mark` plutôt que du texte.
- Pas de nombre de leçons écrit en dur dans les textes de l'accueil : il évolue.
- Les 20 leçons les plus recherchées ont un `titreSeo`, un `guide` (texte visible pour Google) et des `voirAussi`. Fais de même pour toute leçon qui vise une recherche fréquente.

## Organisation

- **Plusieurs logiciels** : `content/logiciels.json` les déclare (voir le README). L'accueil général (`/`) est neutre, sans nom de logiciel limitant : il propose le choix du logiciel et une recherche globale. Chaque logiciel a son accueil (`/excel/`, `/word/`…).
- **Ne change jamais les adresses existantes** : `/excel/<id>/` doit rester stable. Les anciens liens de l'accueil (`#theme-…`, `#routes`, `#<id>`) sont redirigés par `src/root.js` vers `/excel/`.

- Rubriques Excel : `content/excel/categories.json` (nom, couleur, icône, famille affichée sur l'accueil).
- Leçons : `content/excel/<NN-rubrique>/<NN-id>.json`. L'`id` devient l'adresse `/excel/<id>/` et ne doit jamais changer une fois publié (référencement, liens partagés).
- Parcours guidés : `content/excel/parcours.json`.
- Lecteur animé : `src/player.js` ; accueil : `src/home.js` ; commun : `src/app.js` ; style : `src/style.css`.
- Fichiers Excel à télécharger : générés par `src/xlsx.mjs` pour chaque leçon contenant une formule (hors rubriques Erreurs, Feuilles et noms, Formules dynamiques, et LAMBDA). Une fonction absente de la table de traduction FN arrête la génération : ajoute-la.
- **Ne modifie jamais à la main** `index.html`, `excel/`, `word/`, `assets/`, `fichiers/`, `sitemap.xml`, `404.html`, `favicon.ico`, `racine/`, `dates.json`, `mentions-legales/` : ils sont générés. `dates.json` garde l'empreinte de chaque page pour dater le sitemap (`lastmod`) : une page modifiée prend la date du jour. L'icône du site vient de `src/favicon.svg` et des PNG de `src/`.

## Générer, vérifier, publier

1. `node build.mjs` (Node 18 ou plus, aucune dépendance).
2. Vérifie avec Playwright (préinstallé) en ouvrant les pages en `file://…/excel/<id>/index.html` :
   - appelle `showStatic(i)` pour chaque étape, sans erreur JavaScript ;
   - regarde des captures de chaque nouvelle étape, sur ordinateur (1280 px) et téléphone (400 px), sans débordement horizontal ;
   - pour une page ouverte avec `?parcours=…`, utilise le chemin complet `…/index.html?parcours=…`.
3. Pour les fichiers Excel : LibreOffice est souvent installé. Convertis la feuille Solution en CSV et compare les résultats aux valeurs de la leçon. Écarts connus et normaux : AUJOURDHUI et MAINTENANT, RECHERCHEX et TEXTE.AVANT/APRES inconnus de LibreOffice 24.2, codes de format français (`jjjj`) lus en anglais.
4. Publie sur `main` : un workflow GitHub régénère le site puis GitHub Pages le déploie. Vérifie que les deux exécutions réussissent (`gh run list --repo mehdinourreddine62/clic-par-clic`).
5. Rends compte simplement : ce qui a été ajouté, ce qui a été vérifié et comment, ce qui n'a pas pu l'être.

## Référencement

- Titres : `fitTitle` (build.mjs) les ramène à 60 caractères au plus ; garde les `titreSeo` courts.
- Bouton « Partager » (en haut de chaque page, et sous chaque leçon, mis en évidence à la dernière étape) : menu de partage du téléphone, sinon lien copié ; chaque partage est compté dans GoatCounter comme événement `partage/…`.
- Les pages appellent `assets/*.css|js?v=<empreinte>` (fonction `write` de build.mjs) : le navigateur recharge les scripts après chaque publication.
- Images de partage : `src/og/og-<logiciel>.png` et `og-site.png` (1200 × 630), dessinées en HTML puis capturées avec Playwright. Pour un nouveau logiciel, ajoute son image.
- Search Console est configuré sur l'adresse ci-dessus (balise de validation dans `site.json`). Le sitemap est généré automatiquement.
- Le propriétaire ne veut **pas de nom de domaine payant**.
- Mentions légales : page générée par build.mjs (`/mentions-legales/`), liée dans le pied de chaque page. Éditeur anonyme (choix du propriétaire, site non professionnel), contact par les issues GitHub du dépôt, hébergeur GitHub, GoatCounter sans cookie, Google Fonts signalé. À mettre à jour si le site change (publicité, formulaire, nouveau service tiers) ; héberger les polices localement supprimerait l'appel à Google.
- Après un ajout important, rappelle-lui de renvoyer `sitemap.xml` dans Search Console et propose quelques adresses à soumettre via « Inspection de l'URL ».

- **Nom et icône dans Google** : Google lit le nom du site et l'icône sur `https://mehdinourreddine62.github.io/`. Cette page vient du dépôt séparé `mehdinourreddine62/mehdinourreddine62.github.io` (propriété Search Console validée le 17 novembre 2026). Son contenu est généré ici dans `racine/` : copie de l'accueil, avec `<base>` vers `/clic-par-clic/`, une adresse canonique propre et un `robots.txt` qui indique le sitemap. Ce dépôt-là a son propre workflow (`.github/workflows/accueil.yml`) qui recopie chaque jour vers 6 h (heure de Paris), sans clé, le dossier `racine/` de clic-par-clic, qui est public. On peut aussi le lancer à la main (onglet Actions). Attention : GitHub suspend les tâches programmées d'un dépôt resté 60 jours sans activité ; il envoie alors un courriel, et il suffit de réactiver le workflow.

## État et suite

Pause sur Excel depuis novembre 2026 pour mesurer l'audience. Le site accueille désormais plusieurs logiciels ; Word est le prochain. Excel compte 168 leçons, 23 rubriques, 5 parcours, 2 cas pratiques et 64 fichiers Excel ; Word, 19 leçons en 5 rubriques et 1 parcours.

Reste à faire, dans l'ordre envisagé :
1. Analyser Search Console (requêtes, pages indexées) et enrichir en priorité les leçons qui apparaissent.
2. Compteur de visites : fait le 17 novembre 2026, GoatCounter, compte `clicparclic` (`site.json`), statistiques sur https://clicparclic.goatcounter.com. Le consulter avec le propriétaire avant de décider de la suite (dons, contenus payants : il y pense à long terme, sans publicité de préférence).
3. Cas pratiques « Facture » (RECHERCHEV, remise, TVA, impression) et « Analyse de ventes » (nettoyage, tableau croisé, segments).
4. Ajouter les cas pratiques en fin des parcours concernés.
5. Prototype d'exercices interactifs : environ 10 exercices de formules de base où l'étudiant tape la formule et le site vérifie le résultat.
6. **Word (priorité du propriétaire, pour ses étudiants : rapport de stage, mémoire et CV ; lettres et comptes rendus secondaires)** : publié (`disponible: true`) depuis le 17 novembre 2026, chaque leçon avec `guide` et `voirAussi`. Rubrique Découvrir Word (lot 3, famille Débuter, en tête) : écran et ruban, mettre en forme le texte, raccourcis clavier. Rubrique Structurer : styles de titres, modifier un style, numéroter les titres I. 1) a), sommaire automatique. Rubrique Paginer (lot 1) : numéroter les pages, numéroter à partir de la page 3, sauts de page et de section, en-têtes et pieds de page, marges et orientation. Rubrique Contenu (lot 2) : insérer un tableau, insérer une image, légendes et table des figures, notes de bas de page, citations et bibliographie. Rubrique Relire et finaliser (lot 3) : suivi des modifications et commentaires, exporter en PDF. Deux d'entre elles sont mises en avant dans `content/accueil.json`. Lecteur : `src/player-word.js` (pages, ruban, styles et leur modification, Titre 3, numérotation des titres, volet de navigation, sommaire, pieds de page, menus contextuels, fenêtres de dialogue avec bouton « Plus », sections, en-têtes, marques ¶, sauts, tableaux simples, pages en paysage, marges, tableaux avec styles, images avec habillage, légendes, table des figures, notes, citations, bibliographie, zones mises en évidence, mise en forme d'un mot, suivi des modifications, commentaires, aperçu PDF). Parcours Word « Rédiger un rapport ou un mémoire » (`content/word/parcours.json`, id `rediger-un-rapport`, 18 leçons, mis en avant sur l'accueil) fait le 17 novembre 2026. La leçon CV a été abandonnée par le propriétaire (« pas très utile ») : la liste Word validée est terminée. Pour la suite de Word, lui proposer d'abord une liste. Le nom « Clic par clic » a été choisi pour convenir à tous les logiciels.
