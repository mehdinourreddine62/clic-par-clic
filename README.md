# Clic par clic

Leçons animées pour apprendre Excel, publiées avec GitHub Pages :
https://mehdinourreddine62.github.io/clic-par-clic/

## Organisation

| Dossier ou fichier | Rôle |
|---|---|
| `content/excel/` | Les leçons : un dossier par thème, un fichier `.json` par leçon |
| `content/excel/categories.json` | Les thèmes : nom, couleur, icône, ordre d'affichage |
| `src/` | Le style (`style.css`) et les scripts (`app.js`, `player.js`, `home.js`) |
| `site.json` | Adresse du site, nom, balise de validation Google |
| `build.mjs` | Le script qui génère le site |
| `index.html`, `excel/`, `assets/`, `sitemap.xml`, `404.html` | **Pages générées : ne pas modifier à la main** |

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
| `spark` | Mini-graphiques dans des cellules : `{"F2": {"r": "B2:E2", "type": "line"}}` |
| `fmt` | En plus des lettres déjà listées : h en-tête de tableau, z ligne à bande |

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

## Ajouter un autre logiciel plus tard

Les leçons Excel sont publiées sous `/excel/…`. Un futur logiciel aura son propre dossier `content/word/` et ses pages sous `/word/…`. Le lecteur animé actuel (`src/player.js`) imite une feuille de calcul : un autre logiciel demandera son propre lecteur.
