/* Lecteur animé d'une leçon Word : une page de traitement de texte, le ruban, le volet de navigation */
const W_TABS=["Fichier","Accueil","Insertion","Conception","Mise en page","Références","Révision","Affichage"];
const W_RIB={
 "Fichier":[["Fichier",["Enregistrer sous","Exporter","Imprimer"]]],
 "Accueil":[["Presse-papiers",["Coller","Couper","Copier"]],["Police",["G","I","S","Taille"]],["Paragraphe",["Puces","Numérotation","Aligner"]],["Styles",["Normal","Titre","Titre 1","Titre 2"]]],
 "Insertion":[["Pages",["Page de garde","Saut de page"]],["Tableaux",["Tableau"]],["Illustrations",["Images"]],["En-tête et pied de page",["En-tête","Pied de page","Numéro de page"]]],
 "Conception":[["Mise en forme du document",["Thèmes","Couleurs","Polices"]]],
 "Mise en page":[["Mise en page",["Marges","Orientation","Taille","Sauts de page"]]],
 "Références":[["Table des matières",["Table des matières","Mettre à jour la table"]],["Notes de bas de page",["Insérer une note de bas de page"]],["Citations et bibliographie",["Insérer une citation","Bibliographie"]],["Légendes",["Insérer une légende","Table des illustrations"]]],
 "Révision":[["Suivi",["Suivi des modifications"]],["Commentaires",["Nouveau commentaire"]]],
 "Affichage":[["Affichage",["Page","Lecture"]],["Afficher",["Volet de navigation","Règle"]],["Zoom",["Zoom","Plusieurs pages"]]],
 "En-tête et pied de page":[["En-tête et pied de page",["En-tête","Pied de page","Numéro de page"]],["Options",["Première page différente","Pages paires et impaires différentes"]],["Fermer",["Fermer l'en-tête et le pied de page"]]]
};
const W_STYLE_BTN={normal:"Normal",titre:"Titre",titre1:"Titre 1",titre2:"Titre 2"};
const HEAD={titre1:1,titre2:2};
let cur=null,idx=0,playing=false,running=false,token=0;
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- état du document après l'étape i ---------- */
function headings(st){const o=[];st.pages.forEach((pg,pi)=>pg.forEach(b=>{if(!b.hide&&HEAD[b.s])o.push({id:b.id,lvl:HEAD[b.s],txt:b.txt,page:pi+1});}));return o;}
function findBlock(st,id){for(let pi=0;pi<st.pages.length;pi++){const i=st.pages[pi].findIndex(b=>b.id===id);if(i>=0)return{pi,i,b:st.pages[pi][i]};}return null;}
function stateAt(i){
  const st={pages:clone(cur.doc.pages),nav:!!cur.doc.nav,footer:cur.doc.footer?clone(cur.doc.footer):null,edit:false,color1:null,toc:null};
  if(cur.doc.tocAuto)st.toc=headings(st);
  for(let n=0;n<=i;n++){const s=cur.s[n];
    for(const[id,sty]of Object.entries(s.style||{})){const f=findBlock(st,id);if(f)f.b.s=sty;}
    (s.add||[]).forEach(a=>{const f=findBlock(st,a.after);if(f)st.pages[f.pi].splice(f.i+1,0,clone(a.block));});
    ls(s.show).forEach(id=>{const f=findBlock(st,id);if(f)f.b.hide=false;});
    if(s.nav!==undefined)st.nav=!!s.nav;
    if(s.footer!==undefined)st.footer=s.footer?{...(st.footer||{}),...s.footer}:null;
    if(s.edit!==undefined)st.edit=!!s.edit;
    if(s.couleur1)st.color1=s.couleur1;
    if(ls(s.show).includes("toc")||s.tocUpdate)st.toc=headings(st);
  }
  return st;
}

/* ---------- rendu ---------- */
function renderDoc(st,s,prev){
  const sel=new Set(ls(s.sel)),changed=new Set();
  if(prev)st.pages.forEach(pg=>pg.forEach(b=>{const o=findBlock(prev,b.id);if(!o||o.b.s!==b.s||!!o.b.hide!==!!b.hide||o.b.txt!==b.txt)changed.add(b.id);}));
  const tocChanged=prev&&JSON.stringify(prev.toc)!==JSON.stringify(st.toc);
  const pages=st.pages.map((pg,pi)=>{
    const body=pg.filter(b=>!b.hide).map(b=>{
      const cls=["wb","w-"+(b.s||"normal")];if(sel.has(b.id))cls.push("wsel");if(changed.has(b.id))cls.push("pop");
      if(b.s==="toc"){
        const t=st.toc||[];
        return`<div class="${cls.join(" ")}${tocChanged?" pop":""}" data-b="${b.id}"><div class="toc-h">Table des matières</div>${t.map(h=>`<div class="toc-l toc-${h.lvl}"><span>${esc(h.txt)}</span><i></i><span>${h.page}</span></div>`).join("")}</div>`;
      }
      return`<p class="${cls.join(" ")}" data-b="${b.id}">${esc(b.txt||"")}</p>`;
    }).join("");
    const f=st.footer;const num=f&&f.num&&!(f.first&&pi===0);
    return`<div class="wpage${st.edit?" wedit":""}" data-p="${pi+1}"><div class="wbody">${body}</div><div class="wfoot${num&&prev&&!(prev.footer&&prev.footer.num&&!(prev.footer.first&&pi===0))?" pop":""}" data-f="${pi+1}">${num?pi+1:""}</div></div>`;
  }).join("");
  const doc=$("#wdoc");doc.innerHTML=`<div class="wpages">${pages}</div>`;
  doc.style.setProperty("--t1",st.color1||"#2f5496");
  const nav=$("#wnav");
  if(st.nav){nav.hidden=false;const hs=headings(st),cs=ls(s.sel);
    nav.innerHTML=`<b>Navigation</b><div class="wn-t"><span class="on">Titres</span><span>Pages</span></div>${hs.length?hs.map(h=>`<span class="wn wn-${h.lvl}${cs.includes(h.id)?" on":""}">${esc(h.txt)}</span>`).join(""):`<small>Aucun titre : appliquez des styles de titre pour voir le plan.</small>`}`;}
  else nav.hidden=true;
  const cp=(()=>{const id=ls(s.sel)[0]||s.at;const f=id&&findBlock(st,id);return f?f.pi+1:1;})();
  const words=st.pages.flat().filter(b=>!b.hide&&b.s!=="toc").reduce((a,b)=>a+(b.txt||"").split(/\s+/).filter(Boolean).length,0);
  $("#wstatus").innerHTML=`<span>Page ${cp} sur ${st.pages.length}</span><span>${words} mots</span><span>Français (France)</span>`;
}
function ribbon(s,press){
  const rb=$("#ribbon"),pn=$("#ribpanel"),tab=s.tab||"Accueil";
  if(s.menu)rb.innerHTML=`<span class="tab cur">${esc(tab)}</span><span class="path">${s.menu}${s.rule?` &nbsp;<code>${esc(s.rule)}</code>`:""}</span>`;
  else{const tabs=W_TABS.includes(tab)?W_TABS:[...W_TABS,tab];rb.innerHTML=tabs.map(t=>`<span class="tab${t===tab?" cur":""}">${t}</span>`).join("");const ct=rb.querySelector(".tab.cur");if(ct)reveal(ct);}
  pn.hidden=false;
  if(pn.dataset.tab!==tab){pn.dataset.tab=tab;pn.scrollLeft=0;
    pn.innerHTML=(W_RIB[tab]||[]).map(([g,bs])=>`<div class="rg"><div class="rbs">${bs.map(b=>`<span class="rb${g==="Styles"?" wsty wsty-"+b.replace(/ /g,""):""}" data-b="${esc(b)}">${esc(b)}</span>`).join("")}</div><small>${esc(g)}</small></div>`).join("");}
  pn.querySelectorAll(".rb").forEach(b=>{const hot=!!s.btn&&b.dataset.b===s.btn;b.classList.toggle("hot",hot);b.classList.remove("press");
    if(hot){const br=b.getBoundingClientRect(),pr=pn.getBoundingClientRect();if(br.right>pr.right-8)pn.scrollLeft+=br.right-pr.right+24;else if(br.left<pr.left+8)pn.scrollLeft-=pr.left-br.left+24;if(press){void b.offsetWidth;b.classList.add("press");}}});
}
function keysFx(s){const k=$("#keys");if(s.keys){k.innerHTML=s.keys.split(" + ").map(x=>`<kbd>${esc(x)}</kbd>`).join(" + ");k.hidden=false;k.classList.remove("in");void k.offsetWidth;k.classList.add("in");}else k.hidden=true;}
/* ---------- curseur : position calculée après défilement, dans le repère de la fenêtre ---------- */
function reveal(el){
  const box=["#wdoc","#ribbon","#ribpanel"].map(q=>$(q)).find(b=>b&&b.contains(el));if(!box)return;
  const r=el.getBoundingClientRect(),d=box.getBoundingClientRect(),m=box.id==="wdoc"?16:8;
  if(r.left<d.left+m)box.scrollLeft-=d.left+m-r.left;
  else if(r.right>d.right-m)box.scrollLeft+=r.right-d.right+m;
  if(box.id==="wdoc"){
    if(r.top<d.top+40)box.scrollTop-=d.top+40-r.top;
    else if(r.bottom>d.bottom-40)box.scrollTop+=r.bottom-d.bottom+40;
  }
}
function cursorTo(el,where){
  const c=$("#wcursor"),win=$(".wword");if(!el||!c)return false;
  reveal(el);
  const r=el.getBoundingClientRect(),o=win.getBoundingClientRect();
  const x=where==="center"?r.left+r.width/2:r.left+Math.min(r.width*.3,60);
  c.style.left=Math.max(4,Math.min(x-o.left,o.width-24))+"px";c.style.top=Math.max(4,Math.min(r.top-o.top+r.height*.6,o.height-28))+"px";return true;
}
const tabEl=t=>[...document.querySelectorAll("#ribbon .tab")].find(x=>x.textContent===t);
const btnEl=b=>[...document.querySelectorAll("#ribpanel .rb")].find(x=>x.dataset.b===b);
const targetEl=s=>{const id=s.at||ls(s.sel)[0];if(id==="footer")return $(`.wfoot[data-f="${s.page||2}"]`);return id?$(`[data-b="${id}"]`):null;};
function clickFx(){const c=$("#wcursor");c.classList.remove("click");void c.offsetWidth;c.classList.add("click");}

/* ---------- interface ---------- */
function ui(s,i){
  const n=cur.s.length,tx=$("#text");
  tx.innerHTML=s.t;tx.classList.remove("in");void tx.offsetWidth;tx.classList.add("in");
  $("#count").textContent=`${i+1} / ${n}`;
  $("#prev").disabled=i===0;$("#next").disabled=i===n-1;
  $("#progress").innerHTML=cur.s.map((_,k)=>`<button class="seg ${k<i?"done":""} ${k===i?"cur":""}" data-i="${k}" aria-label="Aller à l'étape ${k+1}"></button>`).join("");
  $("#progress").querySelectorAll(".seg").forEach(b=>b.onclick=()=>{playing=false;go(+b.dataset.i,true);});
  const nl=$("#nextLesson");if(nl)nl.classList.toggle("hl",i===n-1);
  if(i===n-1)markSeen(cur.id);
  updatePlay();
}
function showStatic(i){
  token++;running=false;idx=i;const s=cur.s[i];
  renderDoc(stateAt(i),s,null);ribbon(s,false);keysFx(s);ui(s,i);$("#wcursor").classList.remove("on");
  const el=targetEl(s);if(el)reveal(el);
}
async function animate(i){
  if(reduce){showStatic(i);if(playing){const run=token;await wait(3200);if(run!==token)return;if(i<cur.s.length-1)animate(i+1);else{playing=false;updatePlay();}}return;}
  const run=++token,s=cur.s[i],ok=()=>run===token,prev=i>0?stateAt(i-1):null,fin=stateAt(i);
  const prevTab=i>0?(cur.s[i-1].tab||"Accueil"):"Accueil",tab=s.tab||"Accueil";
  running=true;idx=i;
  renderDoc(prev||fin,i>0?{sel:""}:s,null);ribbon({tab:prevTab},false);keysFx({});ui(s,i);
  const cu=$("#wcursor");cu.classList.add("on");
  await wait(80);if(!ok())return;
  /* 1. le curseur va sur le texte et le sélectionne */
  const el=targetEl(s);
  if(el){cursorTo(el);await wait(560);if(!ok())return;clickFx();
    ls(s.sel).forEach(id=>{const b=$(`[data-b="${id}"]`);if(b)b.classList.add("wsel");});await wait(500);if(!ok())return;}
  /* 2. il clique sur l'onglet, puis sur le bouton du ruban */
  if(tab!==prevTab&&!s.menu){const t=tabEl(tab);if(t){cursorTo(t,"center");await wait(520);if(!ok())return;clickFx();}}
  if(s.menu||tab!==prevTab){ribbon(s,false);await wait(380);if(!ok())return;}
  if(s.btn){const b=btnEl(s.btn);if(b){cursorTo(b,"center");await wait(520);if(!ok())return;clickFx();}ribbon(s,true);await wait(450);if(!ok())return;}
  if(s.keys){keysFx(s);await wait(500);if(!ok())return;}
  /* 3. le document change, le changement est surligné */
  renderDoc(fin,s,prev);ribbon(s,false);keysFx(s);
  const el2=targetEl(s);if(el2&&!s.btn){cursorTo(el2);}else if(el2)reveal(el2);
  await wait(900);if(!ok())return;
  cu.classList.remove("on");running=false;updatePlay();
  if(playing){
    const words=s.t.replace(/<[^>]+>/g,"").split(/\s+/).length;
    await wait(Math.max(1900,words*290));if(!ok())return;
    if(i<cur.s.length-1)animate(i+1);else{playing=false;updatePlay();}
  }
}
function go(i,anim){if(!cur||i<0||i>=cur.s.length)return;anim?animate(i):showStatic(i);}
const ICON_PLAY='<svg viewBox="0 0 16 16"><path d="M4.5 2.5v11l9-5.5z"/></svg>',ICON_PAUSE='<svg viewBox="0 0 16 16"><path d="M4 2.5h3v11H4zm5 0h3v11H9z"/></svg>',ICON_RE='<svg viewBox="0 0 16 16"><path d="M8 2a6 6 0 1 0 6 6h-1.6A4.4 4.4 0 1 1 8 3.6V6l3.5-3L8 0z"/></svg>';
function updatePlay(){
  if(!cur)return;const b=$("#play"),last=idx===cur.s.length-1;
  b.innerHTML=playing?ICON_PAUSE:last&&!running?ICON_RE:ICON_PLAY;
  b.setAttribute("aria-label",playing?"Pause":last&&!running?"Revoir depuis le début":"Lecture");
}
function togglePlay(){
  if(playing){playing=false;showStatic(idx);return;}
  playing=true;
  if(running){updatePlay();return;}
  animate(idx===cur.s.length-1?0:idx+1);
}
$("#play").onclick=togglePlay;
$("#prev").onclick=()=>{playing=false;go(idx-1,false);};
$("#next").onclick=()=>{playing=false;go(idx+1,true);};
document.addEventListener("keydown",e=>{
  if(!cur||e.target.closest("input,textarea")||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==="ArrowRight"){playing=false;go(idx+1,true);}
  else if(e.key==="ArrowLeft"){playing=false;go(idx-1,false);}
  else if(e.key===" "&&!e.target.closest("button,a,summary")){e.preventDefault();togglePlay();}
});

/* ---------- démarrage ---------- */
(function(){
  const el=document.getElementById("lesson-data");if(!el)return;
  cur=JSON.parse(el.textContent);
  animate(0);
  const pid=new URLSearchParams(location.search).get("parcours"),P=(cur.parcours||[]).find(x=>x.id===pid);
  if(P){const i=P.l.findIndex(x=>x[0]===cur.id),nx=P.l[i+1],b=$("#pband");
    b.innerHTML=`<a class="pb-t" href="../parcours/${P.id}/"><small>Parcours guidé · leçon ${i+1} sur ${P.l.length}</small><b>${esc(P.t)}</b></a>${nx?`<a class="pb-n" href="../${nx[0]}/?parcours=${P.id}"><small>Suivante dans le parcours →</small><b>${esc(nx[1])}</b></a>`:`<a class="pb-n" href="../parcours/${P.id}/"><small>Dernière leçon</small><b>Revenir au parcours</b></a>`}`;
    b.hidden=false;const nl=$("#nextLesson");if(nl)nl.removeAttribute("id");if(nx)b.querySelector(".pb-n").id="nextLesson";}
})();
