# Clic par clic

Leçons animées pour apprendre Excel, publiées avec GitHub Pages :
https://mehdinourreddine62.github.io/clic-par-clic/

## Plusieurs logiciels

Le site accueille plusieurs logiciels, déclarés dans `content/logiciels.json` :
- `id` : le dossier de contenu (`content/<id>/`) et l'adresse (`/<id>/`) ;
- `disponible` : `false` affiche le logiciel sur l'accueil général avec la mention « Bientôt disponible », sans page ;
  `"apercu"` génère ses pages pour les relire en ligne, sans lien depuis l'accueil, sans indexation (`noindex`) et hors du sitemap ;
- `lecteur` : le script d'animation utilisé par ses leçons, dans `src/` (`player.js` imite un tableur) ;
- `fichiers` : `true` pour générer des fichiers Excel à télécharger ;
- textes de son accueil : `accroche`, `titreHero`, `intro`, `titreSeo`, `descSeo`, `exemplesRecherche`.

Pages générées : l'accueil général (`/`, choix du logiciel et recherche dans toutes les leçons), l'accueil de chaque logiciel (`/<id>/`, rubriques et parcours), puis les leçons (`/<id>/<leçon>/`) et les parcours (`/<id>/parcours/<parcours>/`). Les identifiants de leçon doivent être uniques sur tout le site.

## Organisation

| Dossier ou fichier | Rôle |
|---|---|
| `content/accueil.json` | Ce qui est mis en avant sur l'accueil général : parcours (`logiciel/parcours`), leçons et cas pratiques (identifiants) |
| `content/logiciels.json` | La liste des logiciels et les textes de leur accueil |
| `content/excel/` | Les leçons Excel : un dossier par rubrique, un fichier `.json` par leçon |
| `content/excel/parcours.json` | Les parcours guidés : titre, public, couleur, résumé et liste ordonnée des leçons. Chaque parcours a sa page sous `/excel/parcours/…` |
| `content/excel/categories.json` | Les rubriques : nom, couleur, icône, famille (le groupe affiché sur l'accueil) et ordre d'affichage |
| `src/` | Le style (`style.css`) et les scripts : `app.js` (commun), `root.js` (accueil général), `home.js` (accueil d'un logiciel), `player.js` (lecteur tableur) |
| `site.json` | Adresse du site, nom, balise de validation Google |
| `build.mjs` | Le script qui génère le site |
| `src/xlsx.mjs` | Génère les fichiers Excel à télécharger : traduction des formules en anglais, consignes, exercice, solution |
| `index.html`, `excel/` (et un dossier par logiciel), `assets/`, `fichiers/`, `sitemap.xml`, `404.html` | **Pages générées : ne pas modifier à la main** |

## Générer le site

```bash
node build.mjs
```

Aucune dépendance à installer, Node 18 ou plus suffit. À chaque modification poussée sur `main` dans `content/`, `src/`, `build.mjs` ou `site.json`, GitHub régénère aussi les pages automatiquement.

## Ajouter une leçon

1. Copier un fichier existant dans le dossier du thème, par exemple `content/excel/04-calc/01-somme.json`.
2. Le renommer avec un numéro d'ordre et un identifiant : `12-ma-fonction.json`. Le numéro fixe la position dans le thème.
3. Modifier le contenu, puis lancer `node build.mjs`.

L'`id` devient l'adresse de la page (`/excel/ma-fonction/`) : minuscules, chiffres et tirets seulement, et unique sur tout le site.

### Champs d'une leçon

| Champ | Contenu |
|---|---|
| `id` | Identifiant et adresse de la page |
| `titre` | Nom affiché |
| `niveau` | 1 débutant, 2 intermédiaire, 3 avancé |
| `resume` | Une phrase : à quoi sert la leçon |
| `motsCles` | Mots pour la recherche de l'accueil |
| `syntaxe`, `arguments` | La fiche repliable sous l'animation |
| `grille` | Le contenu de départ de la feuille, ligne par ligne |
| `etapes` | Les étapes de l'animation |
| `ruban` | `true` pour afficher les boutons du ruban |
| `titreSeo` | Facultatif : le titre affiché par Google, calqué sur les recherches réelles |
| `guide` | Facultatif : texte visible sous l'animation (`question`, `intro`, `exemple`, `erreurs`, `faq`) |
| `voirAussi` | Facultatif : identifiants des leçons proposées en « Voir aussi ». Sinon, trois leçons de la même rubrique |
| `sansEnTete` | `true` pour ne pas mettre la ligne 1 en gras |

### Champs d'une étape

| Champ | Effet |
|---|---|
| `t` | La phrase affichée (une seule, courte) |
| `c` | La cellule active |
| `f` | Ce qui est tapé dans la cellule (formule ou valeur) |
| `v` | Le résultat affiché après validation |
| `fill` | Recopie vers le bas : `{"D3": "14,00 €", "D4": "11,80 €"}` |
| `set` | Autres cellules modifiées |
| `mark` | Cellules mises en évidence : `"B2 B4"` |
| `sel`, `drag` | Plage sélectionnée (`"A1:C4"`, `"col:B"`, `"row:3"`), avec glissement du curseur si `drag` vaut 1 |
| `keys`, `kb` | Touche affichée (`"Ctrl + C"`) ; `kb: 1` l'affiche avant l'action |
| `tab`, `btn` | Onglet du ruban ouvert et bouton cliqué |
| `menu`, `rule` | Chemin de menu affiché dans le ruban |
| `spot` | Zone illuminée : `ribbon`, `namebox`, `formula`, `tabs`, `cols`, `rows`, `cell` |
| `fmt` | Mise en forme : `{"A1:C1": "b"}` avec b gras, i italique, u souligné, f fond, c centré, d bordures |
| `hide` | Lignes masquées par un filtre : `[4, 5]` |
| `spill` | Zone propagée d'une formule dynamique |
| `bad` | Cellules colorées par une mise en forme conditionnelle |
| `w` | Largeur de colonnes : `{"A": 170}` |
| `sheets`, `copy`, `chart`, `bar` | Onglets de feuilles, pointillés de copie, graphique, contenu forcé de la barre de formule |

### Tableaux croisés, listes déroulantes, volets figés

| Champ d'étape | Effet |
|---|---|
| `pivot` | Liste des champs d'un tableau croisé : `{"fields": [...], "filt": [], "cols": [], "rows": [], "vals": [], "pick": "Région"}`. Le résultat se place dans la feuille avec `set` |
| `dd` | Liste déroulante : `{"at": "B2", "items": [...], "open": 1, "pick": 1}` |
| `msg` | Message d'alerte affiché au centre de la feuille |
| `freeze` | Volets figés : `{"r": 1, "c": 1}` trace un trait sous la ligne 1 et à droite de la colonne A |
| `hide`, `hidec` | Lignes et colonnes masquées, pour simuler un défilement : `[2, 3]`, `["B", "C"]` |
| `preview` | Aperçu avant impression : `{"pages": [[colonnes, lignes, titres], …], "land": 1}` |
| `note` | Commentaire sur une cellule : `{"at": "C3", "text": "…", "reply": "…", "closed": 1}` |
| `peer` | Cellule d'un collègue en coédition : `{"at": "C4", "name": "Léa"}` |
| `retry` | Avec `msg` : affiche les boutons Réessayer et Annuler au lieu de OK |
| `slicer` | Segment ou chronologie d'un tableau croisé : `{"at": "F7:G10", "title": "Région", "items": [...], "on": [0], "kind": "time"}` |
| `bars`, `scale`, `icons` | Mise en forme conditionnelle : barres de données (`"B2:B6"`), nuances de couleurs (`{"r": "B2:E5", "inv": 1}`), jeux d'icônes (`{"r": "B2:B6", "hi": 0.001, "lo": 0}`) |
| `unbad` | Retire la couleur posée par `bad` |
| `arrows` | Flèches d'audit entre cellules : `[["C2", "E2"], ["D2", "E2"]]` |
| `nb` | Texte affiché dans la zone Nom, pour nommer une plage |
| `spark` | Mini-graphiques dans des cellules : `{"F2": {"r": "B2:E2", "type": "line"}}` |
| `fmt` | En plus des lettres déjà listées : h en-tête de tableau, z ligne à bande, g surbrillance verte |

### Graphiques

Une leçon avec graphique déclare un champ `graphique` (réglages de départ), puis chaque étape peut le modifier avec `chart`.

| Réglage | Effet |
|---|---|
| `type` | `col` histogramme, `bar` barres horizontales, `line` courbe, `pie` secteurs, `stack` empilé, `combo` combiné (`line`, `axis2`), `scatter` nuage de points |
| `trend`, `names` | Courbe de tendance ; noms des séries (cellules ou textes) |
| `labels`, `series` | Plage des catégories et liste des plages de valeurs : `"A2:A5"`, `["B2:B5", "C2:C5"]` |
| `at` | Emplacement sur la feuille : `"D2:H8"`, ou `"all"` pour toute la feuille |
| `title`, `legend`, `axis`, `dlabels` | Titre, légende, axe, étiquettes de données |
| `min`, `max`, `step` | Échelle de l'axe |
| `hi` | Numéro de la catégorie mise en évidence (0 pour la première) |
| `color` | Couleur de la série : `r0` à `r5` |
| `selected` | Affiche les poignées de sélection |
| `panel`, `pick`, `spot` | Liste « Éléments de graphique », ligne cochée, zone illuminée (`title`, `legend`, `axis`, `plot`) ; valables pour une seule étape |

Dans une étape, `"chart": 1` affiche le graphique et `"chart": {"type": "line"}` change un réglage. Sur téléphone, le graphique se place automatiquement sous le tableau.

## Ajouter un logiciel

1. Ajoutez une entrée dans `content/logiciels.json`, avec `disponible: false` tant qu'il n'a pas de leçons.
2. Créez `content/<id>/categories.json` et les dossiers de leçons.
3. Écrivez son lecteur dans `src/` s'il ne ressemble pas à un tableur, et indiquez-le dans `lecteur`.
4. Passez `disponible` à `true` : l'accueil général, son accueil, le sitemap et la recherche le prennent en compte.

## Fichiers à télécharger

Chaque leçon qui contient au moins une formule reçoit un fichier `fichiers/excel/<id>.xlsx`, avec trois feuilles :
- **Consignes** : la cellule, la fonction à utiliser, le résultat attendu et un indice ;
- **Exercice** : les données de départ (`grille`) ;
- **Solution** : les mêmes données avec les formules, recopies comprises.

Sont exclues les rubriques Erreurs, Feuilles et noms et Formules dynamiques, ainsi que LAMBDA. Une fonction absente de la table de traduction de `src/xlsx.mjs` arrête la génération avec un message : il suffit de l'y ajouter.

## Leçons Word

Le lecteur `src/player-word.js` affiche des pages. Une leçon Word remplace `grille` par `document` : `{"pages": [[bloc, …], …], "nav": false, "tocAuto": false, "footer": null, "entete": null, "marques": false, "marges": {}, "sections": [], "numerotation": null, "styles": {}}`. Un bloc vaut `{"id": "h1", "s": "titre1", "txt": "Introduction"}` ; styles disponibles : `normal`, `titre`, `sous`, `manuel` (gras posé à la main), `titre1`, `titre2`, `titre3`, `toc` (sommaire, calculé à partir des titres), `vide` (ligne vide, ¶ si les marques sont affichées), `saut` (saut de page ou de section, visible seulement avec les marques ; libellé dans `txt`), `tableau` (lignes dans `lignes`, la première sert d'en-tête ; `tstyle` : `grille`, `accent`, `fonce` ; `ajuste` : ajusté au contenu), `image` (`img` : `stand`, `graphique` ou `plan`, dessins définis dans `IMG` du lecteur ; `largeur` en % ; `habillage` : `aligne` ou `carre`), `legende` (numérotée « Figure n : » automatiquement), `tof` (table des figures), `biblio` (bibliographie construite à partir des sources). Un paragraphe peut porter des notes et des citations dans `ins` : `{"t": "note", "id": "n1", "apres": "mot", "txt": "…"}` ou `{"t": "cit", "id": "c1", "src": "kotler", "apres": "mot"}`, placées après le mot `apres` ; les notes sont numérotées dans l'ordre du document. Une page dont un bloc porte `"orient": "paysage"` s'affiche en paysage ; une page vide disparaît. `numerotation` numérote les titres : `{"1": "I.", "2": "1)", "3": "a)"}` (le premier caractère donne le type : `I`, `i`, `1`, `a`, `A`). `styles` change l'apparence de départ d'un style : `{"titre1": {"taille": 24, "couleur": "#1c7a43", "gras": true, "majuscules": true}}` (taille en points).

| Champ d'étape | Effet |
|---|---|
| `at`, `sel` | Bloc visé par le curseur ; blocs sélectionnés (`"h2 h4"`). `at: "footer"` avec `page` vise un pied de page |
| `tab`, `btn`, `menu`, `rule`, `keys` | Comme pour Excel, avec le ruban de Word |
| `style` | Change le style de blocs : `{"h1": "titre1"}` |
| `add` | Insère des blocs : `[{"after": "p4", "block": {…}}]` |
| `show` | Affiche des blocs masqués (`"toc"` construit le sommaire) |
| `tocUpdate` | Met à jour le sommaire (sinon il reste figé, comme dans Word) |
| `nav` | Affiche ou masque le volet de navigation |
| `footer` | Numéros de page : `{"num": true, "first": true}` (pas de numéro sur la première page) |
| `edit` | Mode d'édition de l'en-tête et du pied de page |
| `entete` | Texte de l'en-tête : `{"txt": "à gauche", "droite": "à droite"}` (absent de la première page si `footer.first`) |
| `footer` (suite) | `{"txt": "…"}` ajoute un texte à gauche du numéro |
| `section` | Section qui commence à une page : `{"page": 3, "lien": false, "debut": 1}` (`lien` : « Lier au précédent » ; `debut` : « À partir de »). `footer.num` règle la première section |
| `marques` | Affiche ou masque les marques (¶, sauts) |
| `texte` | Change le texte d'un bloc : `{"sp": "Saut de section (page suivante)"}` |
| `remove`, `move`, `insererPage`, `orient` | Supprime des blocs ; déplace un bloc (`{"id": "h5", "before": "x"}` ou `{"id": "h5", "page": 4}`) ; insère des pages vides (`[4, 5]`) ; oriente la page d'un bloc (`{"tbl": "paysage"}`) |
| `marges` | Marges en centimètres : `{"gauche": 3}` |
| `props`, `lignes` | Change des propriétés d'un bloc (`{"img": {"largeur": 45}}`) ; remplace les lignes d'un tableau |
| `insAjout`, `insSuppr` | Ajoute une note ou une citation (`[{"bloc": "p4c", "t": "note", …}]`) ; en retire une par son `id` |
| `sources` | Ajoute des sources : `{"kotler": {"court": "(Kotler, 2019)", "long": "Kotler, P. (2019)…"}}` (aussi dans `document.sources`) |
| `tofUpdate` | Met à jour la table des figures (`show: "tof"` l'insère) |
| `grille` | Avec `btn: "Tableau"`, anime la grille d'insertion : `[colonnes, lignes]` |
| `poignee` | Anime le redimensionnement d'une image par sa poignée d'angle |
| `groupe` | Groupe du ruban du bouton `btn`, quand deux boutons portent le même nom |
| `spot` | Met en évidence une zone : `onglets`, `ruban`, `doc`, `statut`, `nav`, `groupe:Police`, `onglet:Fichier` |
| `mot` | Avec `at`, sélectionne un mot ou une expression dans le paragraphe |
| `insAjout` (suite) | Aussi `{"t": "fmt", "mot": "…", "gras": true}` (`italique`, `souligne`, `faute`), `{"t": "rempl", "mot": "ancien", "par": "nouveau"}` (suivi des modifications), `{"t": "com", "mot": "…", "auteur": "…", "txt": "…"}` (commentaire dans la marge) |
| `forme` (suite) | Aussi `police`, `align` (`justify`, `center`), `interligne` (1,5 → `1.5`), `italique` |
| `accepter`, `suivi` | Accepte toutes les modifications suivies ; état du bouton Suivi des modifications |
| `ensuite` | Bloc sur lequel la souris clique après le bouton (pinceau, par exemple) |
| `pdf`, `toast` | Affiche le document comme un PDF ouvert (`document.pdfNom`) ; petite notification |
| `dialog.okLabel` | Texte du bouton de validation (« Publier »…) |
| `voir` | Bloc à garder visible à l'écran en plus de la cible (page voisine) |
| `at: "header"` | Avec `page`, vise un en-tête |
| `couleur1` | Nouvelle couleur du style Titre 1 (raccourci de `modifStyle`) |
| `modifStyle` | Modifie un style, donc tous ses blocs : `{"titre2": {"couleur": "#1c7a43", "taille": 18}}` |
| `forme`, `effacerForme` | Mise en forme posée à la main sur un bloc (`{"h3": {"couleur": "…"}}`) ; l'effacer (`"h3"`) |
| `numerotation` | Applique (ou retire avec `null`) la numérotation des titres |
| `ctx` | Menu affiché sous le bouton `btn` : `{"items": ["…", "Modifier…"], "hot": 1}` ; le curseur clique sur l'élément `hot` |
| `dialog` | Fenêtre de dialogue : `{"titre": "…", "lignes": [["Taille", "24"]], "hot": [0], "apercu": [[1, "I. Titre 1"]], "ok": true}`. Le curseur clique sur chaque ligne `hot` (la valeur passe de celle de l'étape précédente, ou de la troisième valeur de la ligne, à la nouvelle) ; `plus` : nombre de dernières lignes cachées derrière le bouton « Plus », puis sur OK si `ok`. Sans `ok`, la fenêtre reste ouverte pour l'étape suivante |

## Liens entre logiciels

`content/liens-logiciels.json` liste des paires de leçons de logiciels différents (`["word/exporter-en-pdf", "powerpoint/exporter-en-pdf-powerpoint"]`). Chaque leçon de la paire affiche l'autre dans « Voir aussi », avec la mention « Dans Word », « Dans PowerPoint »… Une leçon d'un logiciel non publié n'est pas affichée ; un identifiant introuvable arrête la génération.

## Leçons PowerPoint

Le lecteur `src/player-ppt.js` reprend celui de Word (ruban, menus `ctx`, fenêtres `dialog`, `spot`, `keys`, `toast`) et affiche des diapositives 16:9 avec leurs miniatures. Une leçon PowerPoint a un `document` : `{"theme": "office", "slides": [diapositive, …], "pied": null, "logo": false, "notesVue": false}`. Thèmes : `office`, `facette`, `ion` (définis dans `src/style.css`, classes `th-…`). Une diapositive vaut `{"id": "s2", "layout": "titre-contenu", "notes": "…", "trans": "Fondu", "el": [élément, …]}` ; dispositions : `titre`, `titre-contenu`, `deux`, `titre-seul`, `section`, `vide`. Un élément vaut `{"id": "s2-t", "k": "titre", "txt": "…"}` ; types : `titre`, `sous`, `texte`, `puces` (`items`, un sous-niveau s'écrit `["texte"]`), `image` (`img` : dessin de `IMG`), `tableau` (`lignes`). Sans texte, l'élément affiche « Cliquez pour ajouter… ». `anim` : numéro d'animation (avec `par: true` sur des puces, une animation par ligne : `anim`, `anim`+1…). Mise en forme d'un élément : `gras`, `couleur` (code couleur), `taille` (multiplicateur, 1.2), `puce` (`rond`, `carre`, `coche`, `num`). Image : `cropMode` (poignées de rognage), `crop: "carre"`, `style: "ombre"`. Autres types : `graph` (`barres`: `[["Mars", 2150], …]`), `smart` (SmartArt processus, `items`, `multi: true` pour des couleurs vives).

Champs d'étape propres à PowerPoint : `at` (id d'un élément ou d'une diapositive, cliqué par le curseur ; devient la diapositive en cours ; `notes` vise le bouton Notes de la barre d'état), `cur` (diapositive affichée), `theme`, `textes` (`{"s2-t": "texte"}` ou une liste pour des puces), `props` (champs à fusionner dans un élément ou une diapositive), `ajout` (`[{"slide": {…}, "after": "s1"}]` ou `[{"copie": "s3", "id": "s4", "after": "s3"}]`), `suppr` (ids de diapositives), `move` (`[{"id": "s4", "before": "s2"}]`), `dispo` (`{"s2": "deux"}`), `elAjout` (`[{"slide": "s2", "el": {…}}]`), `elSuppr`, `vue` (`normal`, `masque` : masque et dispositions, ids `m`, `m-t`, `m-c` ; `diaporama` ; `noir` ; `presentateur` ; `pdf`), `build` (nombre d'animations déjà jouées en diaporama), `pied` (`{"txt": "…", "num": true, "saufTitre": true}`), `logo`, `police` (`georgia`, `trebuchet`, `arial`), `couleurs` (`vert`, `violet`), `chrono` (minuteur du mode Présentateur), `notesVue`, `poignee` (glisser une poignée de l'image). `spot` accepte aussi `miniatures` et, en mode Présentateur, `pv:cur`, `pv:minuteur`, `pv:suivante`, `pv:notes`. Les vues plein écran masquent le ruban.

## Compteur de visites

`site.json` peut contenir `"goatcounter": "<code>"`, le code du compte GoatCounter (gratuit, sans cookies, donc sans bandeau de consentement). Chaque page générée charge alors le compteur. Sans ce champ, aucun compteur. Les statistiques se consultent sur `https://<code>.goatcounter.com`.

## Exercices interactifs

`content/<logiciel>/exercices.json` liste les exercices, dans l'ordre. Chaque exercice génère `/<logiciel>/<id>/` (l'id commence par `exercice-`), et la page `/<logiciel>/exercices/` les regroupe. Champs : `id`, `titre`, `resume`, `lecon` (leçon liée, qui affiche « Entraînez-vous »), `consigne`, `grille`, `cible` (cellule où taper la formule), `recopie` (cellules où la formule est recopiée pour vérification), `solution` (formule de référence : les résultats attendus sont calculés à partir d'elle), `format` (`€`, `%`, `0,00` ou rien), `indice`, `bravo`, `explication` (corrigé visible), `fonction`, `dollar` (conseiller les $ si la recopie échoue), `exige` et `exigeMsg` (motif obligatoire dans la formule, par exemple `F\\$2`).

Le moteur `src/exercices.js` calcule les formules en français. Fonctions connues : SOMME, MOYENNE, MIN, MAX, NB, NBVAL, ABS, ARRONDI, SI, ET, OU, NB.SI, SOMME.SI, MOYENNE.SI, RECHERCHEV. Pour un exercice avec une autre fonction, ajoute-la dans `FN` et dans `call`. Chaque réussite est comptée dans GoatCounter (`exercice-reussi/<id>`) et mémorisée dans le navigateur (`cpc-ex`).

