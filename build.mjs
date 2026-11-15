// Génère le site : node build.mjs
// Entrées : content/ (leçons), src/ (style et scripts), site.json. Sorties : index.html, excel/, assets/, sitemap.xml, 404.html
import fs from "node:fs";
import path from "node:path";

const SITE=JSON.parse(fs.readFileSync("site.json","utf8"));
const LV={1:"Débutant",2:"Intermédiaire",3:"Avancé"};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const strip=s=>s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");
const readJson=f=>JSON.parse(fs.readFileSync(f,"utf8"));
const write=(f,s)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);};
const bars=n=>`<span class="lvl" title="${LV[n]}" aria-label="${LV[n]}">${[1,2,3].map(k=>`<i class="${k<=n?"on":""}"></i>`).join("")}</span>`;
const kbd=x=>x.split(" + ").map(k=>`<kbd>${esc(k)}</kbd>`).join(" + ");
const ico=c=>`<svg viewBox="0 0 24 24">${c.icone}</svg>`;

/* ---------- lecture du contenu ---------- */
const LOGICIEL="excel";
const cats=readJson(`content/${LOGICIEL}/categories.json`);
const dirs=fs.readdirSync(`content/${LOGICIEL}`).filter(d=>/^\d+-/.test(d)).sort();
const lessons=[];
for(const d of dirs){
  const cat=cats.find(c=>d.endsWith("-"+c.id));
  if(!cat)throw new Error(`Dossier ${d} : aucune catégorie correspondante dans categories.json`);
  for(const f of fs.readdirSync(`content/${LOGICIEL}/${d}`).filter(f=>f.endsWith(".json")).sort()){
    const l=readJson(`content/${LOGICIEL}/${d}/${f}`);
    for(const k of ["id","titre","niveau","resume","syntaxe","arguments","grille","etapes"])if(l[k]===undefined)throw new Error(`${d}/${f} : champ « ${k} » manquant`);
    if(!/^[a-z0-9-]+$/.test(l.id))throw new Error(`${d}/${f} : id invalide « ${l.id} »`);
    if(lessons.some(x=>x.id===l.id))throw new Error(`${d}/${f} : id « ${l.id} » déjà utilisé`);
    l.cat=cat;lessons.push(l);
  }
}
lessons.sort((a,b)=>cats.indexOf(a.cat)-cats.indexOf(b.cat));

/* ---------- gabarits ---------- */
const FONTS=`<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">`;
const THEME=`<script>try{var t=localStorage.getItem("cpc-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>`;
function head({title,desc,url,root,ld,extra=""}){
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="${esc(SITE.nom)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
${extra}<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,"\\u003c")}</script>
${THEME}
${FONTS}
<link rel="stylesheet" href="${root}assets/app.css">
</head>
<body>
<div class="wrap">
  <div class="topbar"><a class="brand" href="${root||"./"}"><span class="logo" aria-hidden="true"><i></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i></i></span>${esc(SITE.nom)}</a><button class="theme" id="theme" type="button"></button></div>
`;}

/* ---------- accueil ---------- */
function home(){
  const title=`Apprendre Excel gratuitement, en animation | ${SITE.nom}`;
  const desc=`Cours Excel gratuit pour débutants et étudiants : des leçons animées pas à pas. Découverte de l'écran et du ruban, raccourcis clavier, graphiques, SOMME, SI, RECHERCHEV, RECHERCHEX, dates et pourcentages.`;
  const ld={"@context":"https://schema.org","@type":"Course",name:`${SITE.nom} : apprendre Excel en animation`,description:desc,inLanguage:"fr",isAccessibleForFree:true,url:SITE.url,provider:{"@type":"Organization",name:SITE.nom,url:SITE.url}};
  const sections=cats.map(c=>{
    const g=lessons.filter(l=>l.cat===c);if(!g.length)return"";
    const cards=g.map(l=>`<a class="card" href="${LOGICIEL}/${l.id}/" data-id="${l.id}" data-c="${c.id}" data-l="${l.niveau}" data-s="${esc(norm(`${l.titre} ${l.resume} ${l.motsCles||""} ${c.nom}`))}"><span class="cn">${esc(l.titre)}</span><span class="cd">${esc(l.resume)}</span><span class="cf">${bars(l.niveau)}<span>${l.etapes.length} étapes</span></span></a>`).join("\n");
    return `<section class="sec" id="theme-${c.id}" style="--k:var(--${c.couleur})"><h2><span class="ico" aria-hidden="true">${ico(c)}</span><span class="st">${esc(c.nom)}<small>${g.length} leçon${g.length>1?"s":""}</small></span></h2><div class="cards">\n${cards}\n</div></section>`;
  }).join("\n");
  const verif=SITE.verificationGoogle?`<meta name="google-site-verification" content="${SITE.verificationGoogle}">\n`:"";
  return head({title,desc,url:SITE.url,root:"",ld,extra:verif})+`  <div id="home">
    <header class="hero">
      <h1>Excel, <em>étape par étape.</em></h1>
      <p>Des leçons animées pour découvrir Excel, puis maîtriser les formules et les graphiques, directement dans une feuille de calcul.</p>
    </header>
    <div class="tools">
      <input id="q" type="search" placeholder="Rechercher : somme, date, pourcentage…" aria-label="Rechercher une leçon">
      <div class="chips" id="cats" role="group" aria-label="Filtrer par thème"><button class="chip" data-v="" aria-pressed="true">Tout</button>${cats.map(c=>`<button class="chip" data-v="${c.id}" aria-pressed="false"><i style="--k:var(--${c.couleur})"></i>${esc(c.nom)}</button>`).join("")}</div>
      <div class="chips" id="levels" role="group" aria-label="Filtrer par niveau"><button class="chip" data-v="0" aria-pressed="true">Tous niveaux</button>${[1,2,3].map(n=>`<button class="chip" data-v="${n}" aria-pressed="false">${LV[n]}</button>`).join("")}</div>
    </div>
    <div id="list">
${sections}
    <p class="empty" id="none" hidden>Aucune leçon ne correspond à votre recherche.</p>
    </div>
  </div>
</div>
<script src="assets/app.js"></script>
<script src="assets/home.js"></script>
</body>
</html>
`;}

/* ---------- page d'une leçon ---------- */
function lessonPage(l,i){
  const c=l.cat,prev=lessons[i-1],next=lessons[i+1],url=`${SITE.url}${LOGICIEL}/${l.id}/`;
  const title=`${l.titre} – Excel en animation | ${SITE.nom}`;
  const desc=`${l.resume} Leçon Excel animée en ${l.etapes.length} étapes, niveau ${LV[l.niveau].toLowerCase()}, gratuite.`;
  const ld={"@context":"https://schema.org","@type":"LearningResource",name:`${l.titre} dans Excel`,description:l.resume,inLanguage:"fr",isAccessibleForFree:true,educationalLevel:LV[l.niveau],learningResourceType:"Leçon animée",url,isPartOf:{"@type":"Course",name:`${SITE.nom} : apprendre Excel en animation`,url:SITE.url}};
  const data={id:l.id,g:l.grille,s:l.etapes};
  if(l.ruban)data.rib=1;if(l.sansEnTete)data.nh=1;if(l.largeurs)data.w=l.largeurs;if(l.graphique)data.chart=l.graphique;
  return head({title,desc,url,root:"../../",ld})+`  <main id="lesson">
    <a class="back" href="../../">← Toutes les leçons</a>
    <div class="lhead">
      <div class="meta"><span class="tag" style="--k:var(--${c.couleur})">${ico(c)}${esc(c.nom)}</span><span>${bars(l.niveau)} ${LV[l.niveau]}</span></div>
      <h1>${esc(l.titre)}</h1>
      <p>${esc(l.resume)}</p>
    </div>
    <div class="win${l.etapes.some(e=>e.pivot)?" haspv":""}">
      <div id="ribwrap"><div class="ribbon" id="ribbon"></div><div class="ribpanel" id="ribpanel" hidden></div></div>
      <div class="fbar"><div class="namebox" id="namebox"></div><div class="fx">fx</div><div class="formula" id="formula"></div></div>
      <div class="stage"><div class="sheetwrap" id="sheetwrap"><div class="sheetinner"><table class="sheet" id="sheet"></table><div class="ov" id="ov"></div></div></div><aside class="pivot" id="pivot" hidden></aside><div class="keys" id="keys" hidden></div><div class="msg" id="msg" hidden></div></div>
      <div class="tabs" id="tabs"></div>
      <p class="cap" id="text" aria-live="polite">${l.etapes[0].t}</p>
      <div class="bar">
        <button class="ic" id="prev" aria-label="Étape précédente"><svg viewBox="0 0 16 16"><path d="M10.5 2 4 8l6.5 6 1.2-1.3L6.6 8l5.1-4.7z"/></svg></button>
        <button class="ic play" id="play" aria-label="Lecture"></button>
        <button class="ic" id="next" aria-label="Étape suivante"><svg viewBox="0 0 16 16"><path d="M5.5 2 12 8l-6.5 6-1.2-1.3L9.4 8 4.3 3.3z"/></svg></button>
        <div class="progress" id="progress"></div>
        <span class="count" id="count"></span>
      </div>
    </div>
    <p class="hint">Clavier : <kbd>←</kbd> <kbd>→</kbd> pour changer d'étape, <kbd>Espace</kbd> pour lancer ou mettre en pause.</p>
    <details class="sx"><summary>Syntaxe <code>${esc(l.syntaxe)}</code></summary><dl>${l.arguments.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl></details>
    <details class="sx"><summary>Résumé écrit des étapes</summary><ol class="steps">${l.etapes.map(s=>`<li>${s.t}</li>`).join("")}</ol></details>
    <nav class="lnav" aria-label="Leçons voisines">${prev?`<a href="../${prev.id}/"><small>← Précédente</small>${esc(prev.titre)}</a>`:""}${next?`<a class="nx" id="nextLesson" href="../${next.id}/"><small>Suivante →</small>${esc(next.titre)}</a>`:""}</nav>
  </main>
</div>
<script type="application/json" id="lesson-data">${JSON.stringify(data).replace(/</g,"\\u003c")}</script>
<script src="../../assets/app.js"></script>
<script src="../../assets/player.js"></script>
</body>
</html>
`;}

/* ---------- écriture ---------- */
fs.rmSync(LOGICIEL,{recursive:true,force:true});
fs.rmSync("assets",{recursive:true,force:true});
write("index.html",home());
lessons.forEach((l,i)=>write(`${LOGICIEL}/${l.id}/index.html`,lessonPage(l,i)));
write("assets/app.css",fs.readFileSync("src/style.css","utf8"));
for(const f of ["app.js","player.js","home.js"])write(`assets/${f}`,fs.readFileSync(`src/${f}`,"utf8"));
write("sitemap.xml",`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE.url}</loc></url>\n${lessons.map(l=>`  <url><loc>${SITE.url}${LOGICIEL}/${l.id}/</loc></url>`).join("\n")}\n</urlset>\n`);
write("404.html",`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page introuvable | ${esc(SITE.nom)}</title><style>body{font:16px system-ui,sans-serif;max-width:32em;margin:18vh auto;padding:0 16px;line-height:1.5}a{color:#147347}</style></head><body><h1>Page introuvable</h1><p>Cette page n'existe pas ou a été déplacée.</p><p><a href="${SITE.url}">Retour à toutes les leçons</a></p></body></html>\n`);
write(".nojekyll","");
console.log(`${lessons.length} leçons, ${cats.length} thèmes → site généré`);
