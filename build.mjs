// Génère le site : node build.mjs
// Entrées : content/logiciels.json, content/<logiciel>/ (leçons), src/ (style et scripts), site.json.
// Sorties : index.html, <logiciel>/, assets/, fichiers/, sitemap.xml, 404.html
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {lessonWorkbook,buildXlsx} from "./src/xlsx.mjs";

const SITE=JSON.parse(fs.readFileSync("site.json","utf8"));
const LV={1:"Débutant",2:"Intermédiaire",3:"Avancé"};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const strip=s=>s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");
const readJson=f=>JSON.parse(fs.readFileSync(f,"utf8"));
/* Numéro de version des fichiers CSS et JS : le navigateur recharge la nouvelle version après chaque publication */
const VER={};const ver=n=>VER[n]??=(()=>{const src=n==="app.css"?"src/style.css":`src/${n}`;return fs.existsSync(src)?crypto.createHash("sha1").update(fs.readFileSync(src)).digest("hex").slice(0,8):"0";})();
const write=(f,s)=>{fs.mkdirSync(path.dirname(f),{recursive:true});if(f.endsWith(".html")){s=s.replace(/assets\/([\w-]+\.(?:css|js))"/g,(m,n)=>`assets/${n}?v=${ver(n)}"`);
    if(f!=="404.html")s=s.replace("</body>",`<footer class="sfoot"><a href="${SITE.url}mentions-legales/">Mentions légales et confidentialité</a><span>Site indépendant, non affilié à Microsoft.</span></footer>\n</body>`);}fs.writeFileSync(f,s);};
const bars=n=>`<span class="lvl" title="${LV[n]}" aria-label="${LV[n]}">${[1,2,3].map(k=>`<i class="${k<=n?"on":""}"></i>`).join("")}</span>`;
const kbd=x=>x.split(" + ").map(k=>`<kbd>${esc(k)}</kbd>`).join(" + ");
const ico=c=>`<svg viewBox="0 0 24 24">${c.icone}</svg>`;

/* ---------- lecture du contenu ---------- */
const SOFTS=readJson("content/logiciels.json");
const RESERVED=new Set(["assets","fichiers","parcours","index"]);
function loadSoft(sw){
  const base=`content/${sw.id}`;
  const cats=readJson(`${base}/categories.json`);
  const lessons=[];
  for(const d of fs.readdirSync(base).filter(d=>/^\d+-/.test(d)).sort()){
    const cat=cats.find(c=>d.endsWith("-"+c.id));
    if(!cat)throw new Error(`${base}/${d} : aucune catégorie correspondante dans categories.json`);
    for(const f of fs.readdirSync(`${base}/${d}`).filter(f=>f.endsWith(".json")).sort()){
      const l=readJson(`${base}/${d}/${f}`);
      for(const k of ["id","titre","niveau","resume","syntaxe","arguments","etapes"])if(l[k]===undefined)throw new Error(`${d}/${f} : champ « ${k} » manquant`);
      if(!/^[a-z0-9-]+$/.test(l.id)||RESERVED.has(l.id))throw new Error(`${d}/${f} : id invalide « ${l.id} »`);
      if(ALL.some(x=>x.id===l.id)||lessons.some(x=>x.id===l.id))throw new Error(`${d}/${f} : id « ${l.id} » déjà utilisé`);
      l.cat=cat;l.sw=sw;lessons.push(l);
    }
  }
  lessons.sort((a,b)=>cats.indexOf(a.cat)-cats.indexOf(b.cat));
  const parcours=fs.existsSync(`${base}/parcours.json`)?readJson(`${base}/parcours.json`):[];
  parcours.forEach(p=>{
    if(!/^[a-z0-9-]+$/.test(p.id))throw new Error(`${base}/parcours.json : id invalide « ${p.id} »`);
    p.items=p.lecons.map(id=>{const l=lessons.find(x=>x.id===id);if(!l)throw new Error(`parcours « ${p.id} » : leçon « ${id} » introuvable`);return l;});
  });
  const NO_FILE=new Set(["erreurs","feuilles","dyn"]);
  lessons.forEach(l=>{l.hasFile=!!sw.fichiers&&!NO_FILE.has(l.cat.id)&&l.id!=="lambda"&&!l.etapes.some(s=>s.spill)&&l.etapes.some(s=>s.f&&s.f[0]==="=");});
  ALL.push(...lessons);
  return{sw,cats,lessons,parcours};
}
const ALL=[];
const CTX=SOFTS.filter(sw=>sw.disponible).map(loadSoft);
const PICO='<path d="M5 19c3 0 3-6 7-6s4-6 7-6"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="7" r="2"/>';

/* ---------- gabarits ---------- */
const FONTS="";
const THEME=`<script>document.documentElement.classList.add("js");try{var t=localStorage.getItem("cpc-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>`;
/* Titre de 60 caractères au plus : au-delà, Google le coupe. On raccourcit pas à pas, sans changer l'adresse. */
function fitTitle(full){const sfx=` | ${SITE.nom}`,ok=x=>x.length<=60;let b=full.endsWith(sfx)?full.slice(0,-sfx.length):full;
  const steps=[x=>x,x=>x.replace(/ – (\S+) en animation$/," dans $1"),x=>x.replace(/ en \d+ leçons animées$/,""),
    x=>x.replace(/( :|,)? (tutoriel animé( pour débutant)?|exemple animé pas à pas|expliqués en animation|en animation|cas pratique animé( pas à pas)?)$/,"")];
  for(const f of steps){b=f(b);if(ok(b+sfx))return b+sfx;}
  if(ok(b))return b;const i=b.lastIndexOf(" : ");if(i>=20)b=b.slice(0,i);return ok(b+sfx)?b+sfx:b;}
function ogImage(url){const m=SOFTS.find(x=>url.startsWith(SITE.url+x.id+"/"));return`${SITE.url}assets/${m&&fs.existsSync(`src/og/og-${m.id}.png`)?`og-${m.id}.png`:"og-site.png"}`;}
function head({title,desc,url,root,ld,extra="",noindex=false}){title=fitTitle(title);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${noindex?"noindex,nofollow":"index,follow"}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="${esc(SITE.nom)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage(url)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${extra}<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,"\\u003c")}</script>
${THEME}
${FONTS}
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${root}assets/favicon-48.png" sizes="48x48" type="image/png">
<link rel="icon" href="${root}assets/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">
<link rel="stylesheet" href="${root}assets/app.css">
${SITE.goatcounter?`<script data-goatcounter="https://${SITE.goatcounter}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>\n`:""}</head>
<body>
<div class="wrap">
  <div class="topbar"><a class="brand" href="${root||"./"}"><span class="logo" aria-hidden="true"><i></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i></i></span>${esc(SITE.nom)}</a><div class="tbtns"><button class="theme" id="share" type="button" data-share aria-label="Partager cette page"><svg viewBox="0 0 16 16"><path d="M12 10.5a2.4 2.4 0 0 0-1.9.9L6.3 9.3a2.4 2.4 0 0 0 0-1.6l3.8-2.1A2.4 2.4 0 1 0 9.6 4.2L5.8 6.3a2.4 2.4 0 1 0 0 3.4l3.8 2.1a2.4 2.4 0 1 0 2.4-1.3z"/></svg><span class="tl">Partager</span></button><button class="theme" id="theme" type="button"></button></div></div>
`;}

/* ---------- accueil ---------- */
function softHome({sw,cats,lessons,parcours:PARCOURS}){
  const url=`${SITE.url}${sw.id}/`;
  const title=`${sw.titreSeo} | ${SITE.nom}`;
  const desc=sw.descSeo;
  const ld={"@context":"https://schema.org","@type":"Course",name:`${SITE.nom} : apprendre ${sw.nom} en animation`,description:desc,inLanguage:"fr",isAccessibleForFree:true,url,provider:{"@type":"Organization",name:SITE.nom,url:SITE.url}};
  const crumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:SITE.nom,item:SITE.url},{"@type":"ListItem",position:2,name:sw.nom,item:url}]};
  const sections=cats.map(c=>{
    const g=lessons.filter(l=>l.cat===c);if(!g.length)return"";
    const cards=g.map(l=>`<a class="card" href="${l.id}/" data-id="${l.id}" data-c="${c.id}" data-l="${l.niveau}" data-s="${esc(norm(`${l.titre} ${l.resume} ${l.motsCles||""} ${c.nom}`))}"><span class="cn">${esc(l.titre)}</span><span class="cd">${esc(l.resume)}</span><span class="cf">${bars(l.niveau)}<span>${l.etapes.length} étapes</span></span></a>`).join("\n");
    return `<section class="sec" id="theme-${c.id}" style="--k:var(--${c.couleur})"><h2><span class="ico" aria-hidden="true">${ico(c)}</span><span class="st">${esc(c.nom)}<small>${g.length} leçon${g.length>1?"s":""}</small></span></h2><div class="cards">\n${cards}\n</div></section>`;
  }).join("\n");
  const fams=[...new Set(cats.map(c=>c.famille||"Rubriques"))];
  const tiles=fams.filter(f=>cats.some(c=>(c.famille||"Rubriques")===f&&lessons.some(l=>l.cat===c))).map(f=>`<section class="fam"><h2>${esc(f)}</h2><div class="tgrid">
${cats.filter(c=>(c.famille||"Rubriques")===f).map(c=>{const n=lessons.filter(l=>l.cat===c).length;return n?`<a class="tile" href="#theme-${c.id}" data-c="${c.id}" data-n="${n}" style="--k:var(--${c.couleur})"><span class="ico" aria-hidden="true">${ico(c)}</span><span class="tt"><b>${esc(c.nom)}</b><small>${n} leçon${n>1?"s":""}</small></span><span class="tp" aria-hidden="true"><i></i></span></a>`:"";}).join("\n")}
</div></section>`).join("\n");
  const first=lessons[0];
  return head({title,desc,url,root:"../",ld,extra:jsonld(crumbs),noindex:sw.disponible!==true})+`  <div id="home">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="../">Accueil</a><span aria-hidden="true">›</span><span>${esc(sw.nom)}</span></nav>
    <header class="hero">
      <h1>${sw.titreHero}</h1>
      <p>${esc(sw.intro)}</p>
    </header>
    <div class="tools">
      <input id="q" type="search" placeholder="Rechercher une leçon : ${esc(sw.exemplesRecherche||"")}" aria-label="Rechercher une leçon">
      <div class="chips" id="levels" role="group" aria-label="Filtrer par niveau"><button class="chip" data-v="0" aria-pressed="true">Tous niveaux</button>${[1,2,3].map(n=>`<button class="chip" data-v="${n}" aria-pressed="false">${LV[n]}</button>`).join("")}</div>
    </div>
    <a class="resume" id="resume" href="${first.id}/"><span><small>Par où commencer ?</small><b>${esc(first.titre)}</b></span><span aria-hidden="true">→</span></a>
    ${PARCOURS.length?`<section class="routes" id="routes"><h2>Parcours guidés</h2><div class="rgrid">
${PARCOURS.map(p=>`<a class="route" href="parcours/${p.id}/" data-ids="${p.lecons.join(" ")}" style="--k:var(--${p.couleur})"><span class="rh"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${PICO}</svg></span><span><b>${esc(p.titre)}</b><small>${esc(p.pour)}</small></span></span><span class="rd">${esc(p.resume)}</span><span class="rf"><span class="rn">${p.items.length} leçons</span><span class="tp"><i></i></span></span></a>`).join("\n")}
</div></section>`:""}
    <div id="tiles">
${tiles}
    </div>
    <div id="list">
    <a class="back" id="backHome" href="#">← Toutes les rubriques</a>
${sections}
    <p class="empty" id="none" hidden>Aucune leçon ne correspond à votre recherche.</p>
    </div>
  </div>
</div>
<script src="../assets/app.js"></script>
<script src="../assets/home.js"></script>
</body>
</html>
`;}

/* ---------- accueil général ---------- */
const jsonld=o=>`<script type="application/ld+json">${JSON.stringify(o).replace(/</g,"\\u003c")}</script>\n`;
function rootHome(racine=false){
  /* racine : copie de l'accueil publiée à l'adresse principale du compte, pour que Google y lise le nom et l'icône du site */
  const ROOT=new URL(SITE.url).origin+"/",home=racine?ROOT:SITE.url;
  const LIVE=CTX.filter(c=>c.sw.disponible===true);
  const dispo=LIVE.map(c=>c.sw.nom),liste=dispo.length>1?dispo.slice(0,-1).join(", ")+" et "+dispo.at(-1):dispo[0];
  const title=racine?`${SITE.nom} : leçons animées gratuites pour ${liste}`:`${SITE.nom} : ${liste} en leçons animées gratuites`;
  const desc=`Des leçons animées et gratuites pour apprendre ${liste} pas à pas : formules, mise en forme, raccourcis clavier, parcours guidés et fichiers d'exercice.`;
  const ld={"@context":"https://schema.org","@type":"WebSite",name:SITE.nom,alternateName:["Clic-par-clic","Clic par clic, leçons animées"],url:home,inLanguage:"fr",description:desc,publisher:{"@type":"Organization",name:SITE.nom,url:SITE.url,logo:`${SITE.url}assets/favicon-192.png`}};
  const verif=SITE.verificationGoogle?`<meta name="google-site-verification" content="${SITE.verificationGoogle}">\n`:"";
  const softs=SOFTS.map(sw=>{const c=LIVE.find(x=>x.sw===sw);
    const inner=`<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${sw.icone}</svg></span><span class="sb"><b>${esc(sw.nom)}</b><span class="sd">${esc(sw.accroche)}</span><small>${c?`${c.lessons.length} leçons${c.parcours.length?` · ${c.parcours.length} parcours guidés`:""}`:"Bientôt disponible"}</small></span>`;
    return c?`<a class="soft" href="${sw.id}/" data-sw="${sw.id}" data-ids="${c.lessons.map(l=>l.id).join(" ")}" style="--k:var(--${sw.couleur})">${inner}<span class="tp" aria-hidden="true"><i></i></span></a>`
            :`<div class="soft soon" aria-disabled="true" style="--k:var(--${sw.couleur})">${inner}</div>`;}).join("\n");
  const results=LIVE.map(({sw,lessons})=>lessons.map(l=>`<a class="card" hidden href="${sw.id}/${l.id}/" data-id="${l.id}" data-sw="${sw.id}" data-s="${esc(norm(`${sw.nom} ${l.titre} ${l.resume} ${l.motsCles||""} ${l.cat.nom}`))}"><span class="cn">${esc(l.titre)}</span><span class="cd">${esc(l.resume)}</span><span class="cf"><span class="swt" style="--k:var(--${sw.couleur})">${esc(sw.nom)} · ${esc(l.cat.nom)}</span><span>${l.etapes.length} étapes</span></span></a>`).join("\n")).join("\n");
  const A=fs.existsSync("content/accueil.json")?readJson("content/accueil.json"):{};
  const findL=id=>{const l=ALL.find(x=>x.id===id);if(!l)throw new Error(`accueil.json : leçon « ${id} » introuvable`);return l;};
  const featP=(A.parcours||[]).map(k=>{const[sid,pid]=k.split("/"),c=CTX.find(x=>x.sw.id===sid),p=c&&c.parcours.find(x=>x.id===pid);if(!p)throw new Error(`accueil.json : parcours « ${k} » introuvable`);return[c.sw,p];});
  const featL=(A.lecons||[]).map(findL),featC=(A.cas||[]).map(findL);
  const CICO='<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>';
  const routeCard=(sw,p)=>`<a class="route" href="${sw.id}/parcours/${p.id}/" data-ids="${p.lecons.join(" ")}" style="--k:var(--${p.couleur})"><span class="rh"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${PICO}</svg></span><span><b>${esc(p.titre)}</b><small>${esc(sw.nom)} · ${esc(p.pour)}</small></span></span><span class="rd">${esc(p.resume)}</span><span class="rf"><span class="rn">${p.items.length} leçons</span><span class="tp"><i></i></span></span></a>`;
  const lessonCard=l=>`<a class="card" href="${l.sw.id}/${l.id}/" data-id="${l.id}"><span class="cn">${esc(l.titre)}</span><span class="cd">${esc(l.resume)}</span><span class="cf"><span class="swt" style="--k:var(--${l.sw.couleur})">${esc(l.sw.nom)} · ${esc(l.cat.nom)}</span><span>${l.etapes.length} étapes</span></span></a>`;
  const caseCard=l=>`<a class="route case" href="${l.sw.id}/${l.id}/" data-ids="${l.id}" style="--k:var(--${l.cat.couleur})"><span class="rh"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${CICO}</svg></span><span><b>${esc((t=>t[0].toUpperCase()+t.slice(1))(l.titre.replace(/^Cas pratique : /,"")))}</b><small>${esc(l.sw.nom)} · cas pratique en ${l.etapes.length} étapes</small></span></span><span class="rd">${esc(l.resume)}</span><span class="rf"><span class="rn">${l.hasFile?"Avec fichier Excel à télécharger":"Cas pratique"}</span><span class="tp"><i></i></span></span></a>`;
  const feat=`${featP.length?`<section class="feat"><h2 class="lbl">Parcours guidés</h2><div class="rgrid">\n${featP.map(([sw,p])=>routeCard(sw,p)).join("\n")}\n</div></section>`:""}
    ${featL.length?`<section class="feat"><h2 class="lbl">Les leçons les plus consultées</h2><div class="cards">\n${featL.map(lessonCard).join("\n")}\n</div></section>`:""}
    ${featC.length?`<section class="feat"><h2 class="lbl">Cas pratiques</h2><div class="rgrid">\n${featC.map(caseCard).join("\n")}\n</div></section>`:""}`;
  const themes={};LIVE.forEach(({sw,cats})=>cats.forEach(c=>{if(!themes[c.id])themes[c.id]=sw.id;}));
  return head({title,desc,url:home,root:"",ld,extra:(racine?`<base href="${SITE.url}">\n`:"")+verif})+`  <div id="root">
    <header class="hero">
      <h1>Vos logiciels, <em>étape par étape.</em></h1>
      <p>Des leçons animées et gratuites : on voit le geste, puis on le refait. Choisissez un logiciel, ou cherchez directement ce qui vous bloque.</p>
    </header>
    <div class="tools"><input id="q" type="search" placeholder="Rechercher une leçon dans tous les logiciels…" aria-label="Rechercher une leçon"></div>
    <a class="resume" id="resume" href="${LIVE[0].sw.id}/" hidden><span><small>Continuer</small><b></b></span><span aria-hidden="true">→</span></a>
    <section id="softs"><h2 class="lbl">Choisir un logiciel</h2><div class="sgrid">
${softs}
    </div></section>
    <div id="feats">
    ${feat}
    </div>
    <section id="results" hidden><div class="cards">
${results}
    </div><p class="empty" id="none" hidden>Aucune leçon ne correspond à votre recherche.</p></section>
  </div>
</div>
<script type="application/json" id="themes">${JSON.stringify(themes)}</script>
<script src="assets/app.js"></script>
<script src="assets/root.js"></script>
</body>
</html>
`;}

/* ---------- page d'une leçon ---------- */
function cutDesc(t){if(t.length<=158)return t;const c=t.slice(0,158),i=Math.max(c.lastIndexOf(". "),c.lastIndexOf(" : "));return i>80?t.slice(0,i+1).replace(/ :$/,"."):c.slice(0,c.lastIndexOf(" "))+"…";}
function lessonPage(l,i,{sw,lessons,parcours:PARCOURS}){
  const c=l.cat,prev=lessons[i-1],next=lessons[i+1],url=`${SITE.url}${sw.id}/${l.id}/`,hub=`${SITE.url}${sw.id}/`;
  const title=l.titreSeo?`${l.titreSeo} | ${SITE.nom}`:`${l.titre} – ${sw.nom} en animation | ${SITE.nom}`;
  const gd=l.guide;
  const desc=gd?cutDesc(gd.intro):`${l.resume} Leçon ${sw.nom} animée en ${l.etapes.length} étapes, niveau ${LV[l.niveau].toLowerCase()}, gratuite.`;
  const crumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[
    {"@type":"ListItem",position:1,name:SITE.nom,item:SITE.url},
    {"@type":"ListItem",position:2,name:sw.nom,item:hub},
    {"@type":"ListItem",position:3,name:c.nom,item:`${hub}#theme-${c.id}`},
    {"@type":"ListItem",position:4,name:l.titre,item:url}]};
  const voir=(l.voirAussi||[]).map(id=>{const x=lessons.find(y=>y.id===id);if(!x)throw new Error(`${l.id} : voirAussi « ${id} » introuvable`);return x;});
  if(!voir.length)lessons.filter(x=>x.cat===c&&x!==l).slice(0,3).forEach(x=>voir.push(x));
  const guide=gd?`
    <section class="guide">
      <h2>${esc(gd.question||`À quoi sert ${l.titre} ?`)}</h2>
      <p>${esc(gd.intro)}</p>
      <h3>${esc(gd.exemple.titre||"Exemple")}</h3>
      <p><code class="gx">${esc(gd.exemple.formule)}</code></p>
      <p>${esc(gd.exemple.explication)}</p>
      <h3>Erreurs fréquentes</h3>
      <ul>${gd.erreurs.map(([a,b])=>`<li><b>${esc(a)}</b>${esc(b)}</li>`).join("")}</ul>
      <h3>Questions fréquentes</h3>
      ${gd.faq.map(([q,r])=>`<h4>${esc(q)}</h4><p>${esc(r)}</p>`).join("")}
    </section>`:"";
  const also=voir.length?`
    <section class="also"><h2>Voir aussi</h2><div class="also-l">${voir.map(x=>`<a href="../${x.id}/"><b>${esc(x.titre)}</b><small>${esc(x.resume)}</small></a>`).join("")}</div></section>`:"";
  const ld={"@context":"https://schema.org","@type":"LearningResource",name:`${l.titre} dans ${sw.nom}`,description:l.resume,inLanguage:"fr",isAccessibleForFree:true,educationalLevel:LV[l.niveau],learningResourceType:"Leçon animée",url,isPartOf:{"@type":"Course",name:`${SITE.nom} : apprendre ${sw.nom} en animation`,url:hub}};
  const isWord=sw.lecteur==="player-word.js";
  const data=isWord?{id:l.id,doc:l.document,s:l.etapes}:{id:l.id,g:l.grille,s:l.etapes};
  const inP=PARCOURS.filter(p=>p.lecons.includes(l.id)).map(p=>({id:p.id,t:p.titre,l:p.items.map(x=>[x.id,x.titre])}));
  if(inP.length)data.parcours=inP;
  if(l.ruban)data.rib=1;if(l.sansEnTete)data.nh=1;if(l.largeurs)data.w=l.largeurs;if(l.graphique)data.chart=l.graphique;
  return head({title,desc,url,root:"../../",ld,extra:`<script type="application/ld+json">${JSON.stringify(crumbs).replace(/</g,"\\u003c")}</script>\n`,noindex:sw.disponible!==true})+`  <main id="lesson">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="../../">Accueil</a><span aria-hidden="true">›</span><a href="../">${esc(sw.nom)}</a><span aria-hidden="true">›</span><a href="../#theme-${c.id}">${esc(c.nom)}</a><span aria-hidden="true">›</span><span>${esc(l.titre)}</span></nav>
    <div class="lhead">
      <div class="meta"><span class="tag" style="--k:var(--${c.couleur})">${ico(c)}${esc(c.nom)}</span><span>${bars(l.niveau)} ${LV[l.niveau]}</span></div>
      <h1>${esc(l.titre)}</h1>
      <p>${esc(l.resume)}</p>
    </div>
    ${isWord?`<div class="win wword">
      <div id="ribwrap"><div class="ribbon" id="ribbon"></div><div class="ribpanel" id="ribpanel" hidden></div></div>
      <div class="wstage"><aside class="wnav" id="wnav" hidden></aside><div class="wdoc" id="wdoc"></div><div class="keys" id="keys" hidden></div></div>
      <div class="wstatus" id="wstatus"></div><div class="cursor" id="wcursor"><svg viewBox="0 0 20 24"><path d="M2 1.5v17l4.6-4.2 3 7 2.9-1.2-3-6.9h6.3z"/></svg></div>`:`<div class="win${l.etapes.some(e=>e.pivot)?" haspv":""}">
      <div id="ribwrap"><div class="ribbon" id="ribbon"></div><div class="ribpanel" id="ribpanel" hidden></div></div>
      <div class="fbar"><div class="namebox" id="namebox"></div><div class="fx">fx</div><div class="formula" id="formula"></div></div>
      <div class="stage"><div class="sheetwrap" id="sheetwrap"><div class="sheetinner"><table class="sheet" id="sheet"></table><div class="ov" id="ov"></div></div></div><aside class="pivot" id="pivot" hidden></aside><div class="keys" id="keys" hidden></div><div class="msg" id="msg" hidden></div><div class="preview" id="preview" hidden></div></div>
      <div class="tabs" id="tabs"></div>`}
      <p class="cap" id="text" aria-live="polite">${l.etapes[0].t}</p>
      <div class="bar">
        <button class="ic" id="prev" aria-label="Étape précédente"><svg viewBox="0 0 16 16"><path d="M10.5 2 4 8l6.5 6 1.2-1.3L6.6 8l5.1-4.7z"/></svg></button>
        <button class="ic play" id="play" aria-label="Lecture"></button>
        <button class="ic" id="next" aria-label="Étape suivante"><svg viewBox="0 0 16 16"><path d="M5.5 2 12 8l-6.5 6-1.2-1.3L9.4 8 4.3 3.3z"/></svg></button>
        <div class="progress" id="progress"></div>
        <span class="count" id="count"></span>
      </div>
    </div>
    <div class="sharebox" id="sharebox"><span class="avis" id="avis"><span class="aq">Cette leçon vous a aidé ?</span><button type="button" data-avis="oui">Oui</button><button type="button" data-avis="non">Non</button></span><button class="share-btn" type="button" data-share>Partager la leçon</button></div>
    <p class="hint">Clavier : <kbd>←</kbd> <kbd>→</kbd> pour changer d'étape, <kbd>Espace</kbd> pour lancer ou mettre en pause.</p>
    ${l.hasFile?`<a class="dl" href="../../fichiers/${sw.id}/${l.id}.xlsx" download="${l.id}.xlsx"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span><b>Télécharger le fichier d'exercice</b><small>Excel · consignes, données de départ et solution</small></span></a>`:""}<div class="pband" id="pband" hidden></div>
    <details class="sx"><summary>Syntaxe <code>${esc(l.syntaxe)}</code></summary><dl>${l.arguments.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl></details>
    <details class="sx"><summary>Résumé écrit des étapes</summary><ol class="steps">${l.etapes.map(s=>`<li>${s.t}</li>`).join("")}</ol></details>${guide}${also}
    <nav class="lnav" aria-label="Leçons voisines">${prev?`<a href="../${prev.id}/"><small>← Précédente</small>${esc(prev.titre)}</a>`:""}${next?`<a class="nx" id="nextLesson" href="../${next.id}/"><small>Suivante →</small>${esc(next.titre)}</a>`:""}</nav>
  </main>
</div>
<script type="application/json" id="lesson-data">${JSON.stringify(data).replace(/</g,"\\u003c")}</script>
<script src="../../assets/app.js"></script>
<script src="../../assets/${sw.lecteur}"></script>
</body>
</html>
`;}

/* ---------- page d'un parcours ---------- */
function routePage(p,{sw}){
  const url=`${SITE.url}${sw.id}/parcours/${p.id}/`;
  const title=`${p.titre} : parcours ${sw.nom} en ${p.items.length} leçons animées | ${SITE.nom}`;
  const desc=`${p.resume} Parcours gratuit de ${p.items.length} leçons animées, à suivre dans l'ordre.`;
  const ld={"@context":"https://schema.org","@type":"Course",name:p.titre,description:p.resume,inLanguage:"fr",isAccessibleForFree:true,url,provider:{"@type":"Organization",name:SITE.nom,url:SITE.url},
    hasPart:p.items.map(l=>({"@type":"LearningResource",name:l.titre,url:`${SITE.url}${sw.id}/${l.id}/`}))};
  return head({title,desc,url,root:"../../../",ld,noindex:sw.disponible!==true})+`  <main id="route" style="--k:var(--${p.couleur})">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="../../../">Accueil</a><span aria-hidden="true">›</span><a href="../../">${esc(sw.nom)}</a><span aria-hidden="true">›</span><a href="../../#routes">Parcours guidés</a><span aria-hidden="true">›</span><span>${esc(p.titre)}</span></nav>
    <div class="lhead">
      <div class="meta"><span class="tag">${`<svg viewBox="0 0 24 24">${PICO}</svg>`}Parcours guidé</span><span>${p.items.length} leçons · ${esc(p.pour)}</span></div>
      <h1>${esc(p.titre)}</h1>
      <p>${esc(p.resume)}</p>
    </div>
    <div class="rprog"><div class="tp"><i id="rbar"></i></div><span id="rcount">0 sur ${p.items.length} vue</span></div>
    <a class="resume" id="rgo" href="../../${p.items[0].id}/?parcours=${p.id}"><span><small>Commencer le parcours</small><b>${esc(p.items[0].titre)}</b></span><span aria-hidden="true">→</span></a>
    <ol class="rlist">
${p.items.map((l,i)=>`<li data-id="${l.id}"><a href="../../${l.id}/?parcours=${p.id}"><span class="rnum">${i+1}</span><span class="rt"><b>${esc(l.titre)}</b><small>${esc(l.resume)}</small></span><span class="rs">${bars(l.niveau)}</span></a></li>`).join("\n")}
    </ol>
  </main>
</div>
<script src="../../../assets/app.js"></script>
<script>
(function(){
  const items=[...document.querySelectorAll(".rlist li")],n=items.length;let done=0,next=null;
  items.forEach(li=>{if(seen.includes(li.dataset.id)){li.classList.add("done");done++;}else if(!next)next=li;});
  $("#rbar").style.width=done/n*100+"%";
  $("#rcount").textContent=done===n?"✓ Parcours terminé":done+" sur "+n+" vue"+(done>1?"s":"");
  const go=$("#rgo");
  if(!next)go.remove();
  else if(done){go.href=next.querySelector("a").getAttribute("href");go.querySelector("small").textContent="Continuer le parcours";go.querySelector("b").textContent=next.querySelector("b").textContent;}
})();
</script>
</body>
</html>
`;}

/* ---------- écriture ---------- */
for(const sw of SOFTS)fs.rmSync(sw.id,{recursive:true,force:true});
fs.rmSync("assets",{recursive:true,force:true});
fs.rmSync("fichiers",{recursive:true,force:true});
write("index.html",rootHome());
write("racine/index.html",rootHome(true));
for(const f of ["favicon.svg","favicon-48.png","favicon-192.png","apple-touch-icon.png"])fs.copyFileSync(`src/${f}`,`racine/${f}`);
fs.copyFileSync("src/favicon-48.png","racine/favicon.ico");
write("racine/robots.txt",`User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}sitemap.xml\n`);
write("racine/.nojekyll","");
let nFiles=0;const urls=[SITE.url];
for(const ctx of CTX){const{sw,lessons,parcours}=ctx;
  const live=sw.disponible===true;
  write(`${sw.id}/index.html`,softHome(ctx));if(live)urls.push(`${SITE.url}${sw.id}/`);
  lessons.forEach((l,i)=>write(`${sw.id}/${l.id}/index.html`,lessonPage(l,i,ctx)));
  parcours.forEach(p=>{write(`${sw.id}/parcours/${p.id}/index.html`,routePage(p,ctx));if(live)urls.push(`${SITE.url}${sw.id}/parcours/${p.id}/`);});
  if(live)lessons.forEach(l=>urls.push(`${SITE.url}${sw.id}/${l.id}/`));
  lessons.filter(l=>l.hasFile).forEach(l=>{const wb=lessonWorkbook(l,`${SITE.url}${sw.id}/${l.id}/`);fs.mkdirSync(`fichiers/${sw.id}`,{recursive:true});fs.writeFileSync(`fichiers/${sw.id}/${l.id}.xlsx`,buildXlsx({sheets:wb.sheets}));nFiles++;});
}
write("assets/app.css",fs.readFileSync("src/style.css","utf8"));
for(const f of ["favicon.svg","favicon-48.png","favicon-192.png","apple-touch-icon.png"])fs.copyFileSync(`src/${f}`,`assets/${f}`);
for(const f of fs.readdirSync("src/og"))fs.copyFileSync(`src/og/${f}`,`assets/${f}`);
fs.mkdirSync("assets/fonts",{recursive:true});for(const f of fs.readdirSync("src/fonts"))fs.copyFileSync(`src/fonts/${f}`,`assets/fonts/${f}`);
fs.copyFileSync("src/favicon-48.png","favicon.ico");
for(const f of new Set(["app.js","home.js","root.js",...CTX.map(c=>c.sw.lecteur)]))write(`assets/${f}`,fs.readFileSync(`src/${f}`,"utf8"));
/* Date de dernière modification de chaque page : empreinte du HTML gardée dans dates.json (fichier généré) */
const DATES=fs.existsSync("dates.json")?readJson("dates.json"):{},today=new Date().toISOString().slice(0,10),NEWD={};
for(const u of urls){const f=u.slice(SITE.url.length)+"index.html",h=fs.existsSync(f)?crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0,16):"";
  NEWD[u]=DATES[u]&&DATES[u].h===h?DATES[u]:{h,d:today};}
write("dates.json",JSON.stringify(NEWD,null,0).replace(/},/g,"},\n")+"\n");
write("sitemap.xml",`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc><lastmod>${NEWD[u].d}</lastmod></url>`).join("\n")}\n</urlset>\n`);
/* ---------- mentions légales ---------- */
{const C="https://github.com/mehdinourreddine62/clic-par-clic/issues";
write("mentions-legales/index.html",head({title:`Mentions légales | ${SITE.nom}`,desc:`Mentions légales et politique de confidentialité du site ${SITE.nom} : éditeur, hébergeur, données personnelles, mesure d'audience sans cookie.`,url:`${SITE.url}mentions-legales/`,root:"../",ld:{"@context":"https://schema.org","@type":"WebPage",name:"Mentions légales",url:`${SITE.url}mentions-legales/`}})+`  <main class="legal">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="../">Accueil</a><span>›</span><span>Mentions légales</span></nav>
    <h1>Mentions légales et confidentialité</h1>
    <h2>Éditeur du site</h2>
    <p>${esc(SITE.nom)} est un site personnel et non professionnel, édité par un particulier qui a choisi de ne pas rendre public son nom, comme le permet l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique. Ses coordonnées ont été communiquées à l'hébergeur.</p>
    <p>Contact : en ouvrant un message sur la page <a href="${C}">${C.replace("https://","")}</a> (compte GitHub gratuit nécessaire).</p>
    <h2>Hébergement</h2>
    <p>GitHub Pages, service de GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis — <a href="https://github.com">github.com</a>.</p>
    <h2>Contenus et marques</h2>
    <p>Les leçons, animations et textes sont proposés gratuitement, à titre pédagogique. Vous pouvez partager librement les liens vers ce site ; toute reproduction des contenus doit citer ${esc(SITE.nom)} et rester non commerciale.</p>
    <p>Microsoft, Excel, Word et Microsoft 365 sont des marques de Microsoft Corporation. ${esc(SITE.nom)} est un site indépendant, ni affilié à Microsoft, ni approuvé par Microsoft. Les écrans présentés sont des reconstitutions simplifiées.</p>
    <p>Malgré le soin apporté aux leçons, une erreur reste possible : n'hésitez pas à la signaler par le contact ci-dessus.</p>
    <h2>Données personnelles</h2>
    <ul>
      <li>Le site ne demande aucune inscription, ne contient aucun formulaire et ne collecte ni nom, ni adresse e-mail.</li>
      <li>Aucun cookie publicitaire ni de suivi n'est utilisé.</li>
      <li>Mesure d'audience : le site utilise <a href="https://www.goatcounter.com">GoatCounter</a>, un outil sans cookie qui ne conserve que des statistiques anonymes et globales (pages vues, site de provenance, pays, type d'appareil et de navigateur). Il ne permet pas de suivre un visiteur d'une page à l'autre ni de l'identifier.</li>
      <li>Votre progression (leçons vues) et votre choix de mode sombre sont enregistrés uniquement dans votre navigateur, sur votre appareil. Ils ne sont jamais envoyés au site ; vous pouvez les effacer en supprimant les données de navigation.</li>
      <li>Comme pour tout site, l'hébergeur GitHub reçoit techniquement l'adresse IP des visiteurs pour afficher les pages.</li>
      <li>Les polices de caractères sont hébergées sur le site lui-même : aucun appel n'est fait à Google ni à un autre service.</li>
    </ul>
    <p>Pour toute question sur ces données, utilisez le contact ci-dessus. Vous pouvez aussi vous adresser à la <a href="https://www.cnil.fr">CNIL</a>.</p>
    <p class="maj">Dernière mise à jour : 18 novembre 2026.</p>
  </main>
</div>
<script src="../assets/app.js"></script>
</body>
</html>
`);}
write("404.html",`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page introuvable | ${esc(SITE.nom)}</title><style>body{font:16px system-ui,sans-serif;max-width:32em;margin:18vh auto;padding:0 16px;line-height:1.5}a{color:#147347}</style></head><body><h1>Page introuvable</h1><p>Cette page n'existe pas ou a été déplacée.</p><p><a href="${SITE.url}">Retour à toutes les leçons</a></p></body></html>\n`);
write(".nojekyll","");
console.log(CTX.map(c=>`${c.sw.nom}${c.sw.disponible===true?"":" (aperçu)"} : ${c.lessons.length} leçons, ${c.cats.length} rubriques, ${c.parcours.length} parcours`).join(" · ")+` · ${nFiles} fichiers Excel → site généré`);
