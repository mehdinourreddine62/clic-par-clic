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
- **Ne modifie jamais à la main** `index.html`, `excel/`, `assets/`, `fichiers/`, `sitemap.xml`, `404.html` : ils sont générés.

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

- Search Console est configuré sur l'adresse ci-dessus (balise de validation dans `site.json`). Le sitemap est généré automatiquement.
- Le propriétaire ne veut **pas de nom de domaine payant**.
- Après un ajout important, rappelle-lui de renvoyer `sitemap.xml` dans Search Console et propose quelques adresses à soumettre via « Inspection de l'URL ».

## État et suite

Pause sur Excel depuis novembre 2026 pour mesurer l'audience. Le site accueille désormais plusieurs logiciels ; Word est le prochain. Le site compte 168 leçons, 23 rubriques, 5 parcours, 2 cas pratiques et 64 fichiers Excel.

Reste à faire, dans l'ordre envisagé :
1. Analyser Search Console (requêtes, pages indexées) et enrichir en priorité les leçons qui apparaissent.
2. Éventuellement un compteur de visites respectueux de la vie privée (GoatCounter par exemple ; le propriétaire doit créer le compte).
3. Cas pratiques « Facture » (RECHERCHEV, remise, TVA, impression) et « Analyse de ventes » (nettoyage, tableau croisé, segments).
4. Ajouter les cas pratiques en fin des parcours concernés.
5. Prototype d'exercices interactifs : environ 10 exercices de formules de base où l'étudiant tape la formule et le site vérifie le résultat.
6. **Word, en cours (priorité du propriétaire, pour ses étudiants : rapport de stage, mémoire et CV ; lettres et comptes rendus secondaires)** : `content/logiciels.json` le déclare avec `disponible: "apercu"` (pages générées mais non liées depuis l'accueil, `noindex`, absentes du sitemap). Lecteur : `src/player-word.js` (pages, ruban Word, styles, volet de navigation, sommaire, pieds de page). Prototype de 3 leçons fait (styles de titres, sommaire automatique, numéroter les pages), en attente de validation. Liste des 17 leçons validée par le propriétaire, plus une leçon CV : écran et ruban, mise en forme du texte, styles de titres, sommaire, numéros de page, numérotation à partir de la page 3, sauts de page et de section, en-têtes et pieds de page, marges et orientation, tableau, image, légendes et table des figures, notes de bas de page, bibliographie, suivi des modifications et commentaires, export PDF, raccourcis clavier, CV. Puis un parcours « Rédiger un rapport ou un mémoire ». Une fois validé, passer `disponible` à `true` et ajouter des leçons Word dans `content/accueil.json`. Le nom « Clic par clic » a été choisi pour convenir à tous les logiciels.
