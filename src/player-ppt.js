/* Lecteur animé d'une leçon PowerPoint : diapositives, miniatures, ruban, thèmes, diaporama.
   Les fonctions communes (ruban, menus, fenêtres, curseur, enchaînement) viennent du lecteur Word. */
const W_TABS=["Fichier","Accueil","Insertion","Création","Transitions","Animations","Diaporama","Révision","Affichage"];
const W_RIB={
 "Fichier":[["Fichier",["Nouveau","Enregistrer sous","Exporter","Imprimer"]]],
 "Accueil":[["Presse-papiers",["Coller","Couper","Copier"]],["Diapositives",["Nouvelle diapositive","Disposition","Réinitialiser"]],["Police",["G","I","S","Taille","Couleur"]],["Paragraphe",["Puces","Numérotation","Aligner","Convertir en SmartArt"]],["Dessin",["Formes","Organiser"]]],
 "Insertion":[["Diapositives",["Nouvelle diapositive"]],["Tableaux",["Tableau"]],["Images",["Images"]],["Illustrations",["Formes","SmartArt","Graphique"]],["Texte",["Zone de texte","En-tête/Pied","Numéro de diapositive"]]],
 "Création":[["Thèmes",["Office","Facette","Ion"]],["Variantes",["Couleurs","Polices"]],["Personnaliser",["Taille des diapositives","Format de l'arrière-plan","Concepteur"]]],
 "Transitions":[["Transition vers cette diapositive",["Aucune","Fondu","Poussée","Balayer"]],["Minutage",["Durée","Appliquer partout"]]],
 "Animations":[["Animation",["Aucune","Apparaître","Estomper","Entrée brusque"]],["Animation avancée",["Volet Animation"]],["Minutage",["Démarrer","Durée"]]],
 "Diaporama":[["Démarrage du diaporama",["À partir du début","À partir de la diapositive actuelle"]],["Moniteurs",["Mode Présentateur"]]],
 "Révision":[["Vérification",["Orthographe"]],["Commentaires",["Nouveau commentaire"]]],
 "Affichage":[["Affichages des présentations",["Normal","Trieuse de diapositives","Page de notes"]],["Affichages des masques",["Masque des diapositives"]],["Afficher",["Règle","Quadrillage"]]],
 "Masque des diapositives":[["Modifier le masque",["Insérer une disposition"]],["Modifier le thème",["Thèmes","Couleurs","Polices"]],["Arrière-plan",["Styles d'arrière-plan"]],["Fermer",["Fermer le mode Masque"]]]
};
let cur=null,idx=0,playing=false,running=false,token=0,curDefs={},curSuivi=false;
function clone0(o){return JSON.parse(JSON.stringify(o));}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clone=clone0;
const PH={titre:"Cliquez pour ajouter un titre",sous:"Cliquez pour ajouter un sous-titre",puces:"Cliquez pour ajouter du texte",texte:"Cliquez pour ajouter du texte"};

/* ---------- état de la présentation après l'étape i ---------- */
function findSlide(st,id){return st.slides.find(x=>x.id===id);}
function findEl(st,id){for(const sl of st.slides){const e=(sl.el||[]).find(x=>x.id===id);if(e)return{sl,e};}return null;}
function stateAt(i){
  const d=cur.doc,st={slides:clone(d.slides),theme:d.theme||"office",cur:d.cur||(d.slides[0]&&d.slides[0].id),vue:d.vue||"normal",pied:d.pied?clone(d.pied):null,logo:!!d.logo,notesVue:!!d.notesVue,build:0,toast:null};
  for(let n=0;n<=i;n++){const s=cur.s[n];
    if(s.theme)st.theme=s.theme;
    {const id=s.at||ls(s.sel)[0],f=id&&findEl(st,id);if(f)st.cur=f.sl.id;else if(id&&findSlide(st,id))st.cur=id;}
    (s.ajout||[]).forEach(a=>{let sl;if(a.copie){const src=findSlide(st,a.copie);sl=clone(src);sl.id=a.id;(sl.el||[]).forEach(e=>e.id=a.id+"-"+e.id.replace(/^[^-]*-/,""));}else sl=clone(a.slide);
      const k=a.after?st.slides.findIndex(x=>x.id===a.after):st.slides.length-1;st.slides.splice(k+1,0,sl);st.cur=sl.id;});
    ls(s.suppr).forEach(id=>{st.slides=st.slides.filter(x=>x.id!==id);});
    (s.move||[]).forEach(m=>{const k=st.slides.findIndex(x=>x.id===m.id);if(k<0)return;const[sl]=st.slides.splice(k,1);const t=m.before?st.slides.findIndex(x=>x.id===m.before):st.slides.length;st.slides.splice(t<0?st.slides.length:t,0,sl);});
    for(const[id,l]of Object.entries(s.dispo||{})){const sl=findSlide(st,id);if(sl)sl.layout=l;}
    for(const[id,v]of Object.entries(s.textes||{})){const f=findEl(st,id);if(f){if(Array.isArray(v))f.e.items=v;else f.e.txt=v;}}
    for(const[id,v]of Object.entries(s.props||{})){const f=findEl(st,id);if(f)Object.assign(f.e,clone(v));else{const sl=findSlide(st,id);if(sl)Object.assign(sl,clone(v));}}
    (s.elAjout||[]).forEach(a=>{const sl=findSlide(st,a.slide);if(sl)(sl.el=sl.el||[]).push(clone(a.el));});
    ls(s.elSuppr).forEach(id=>{const f=findEl(st,id);if(f)f.sl.el=f.sl.el.filter(x=>x.id!==id);});
    if(s.cur)st.cur=s.cur;
    if(s.vue)st.vue=s.vue;
    if(s.pied!==undefined)st.pied=s.pied?{...(st.pied||{}),...s.pied}:null;
    if(s.logo!==undefined)st.logo=!!s.logo;
    if(s.notesVue!==undefined)st.notesVue=!!s.notesVue;
    st.build=s.build||0;
  }
  if(!findSlide(st,st.cur)&&st.slides[0])st.cur=st.slides[0].id;
  return st;
}

/* ---------- rendu d'une diapositive ---------- */
const IMG={
 stand:'<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><rect width="320" height="200" fill="#dfe6ee"/><rect y="150" width="320" height="50" fill="#b9c3cc"/><rect x="40" y="40" width="240" height="115" fill="#fff" stroke="#9aa7b3"/><rect x="40" y="40" width="240" height="26" fill="#0f4761"/><text x="160" y="59" fill="#fff" font-size="15" font-family="Arial" text-anchor="middle" font-weight="700">LUMEN</text><g fill="#f2c14e"><path d="M78 96h24l-6 14h-12z"/><path d="M148 88h24l-6 14h-12z"/><path d="M218 96h24l-6 14h-12z"/></g><g stroke="#3a4650" stroke-width="2"><path d="M90 66v30M160 66v22M230 66v30"/></g><rect x="110" y="118" width="100" height="37" fill="#cfd8e0"/></svg>',
 logo:'<svg viewBox="0 0 60 20"><rect width="20" height="20" rx="4" fill="#0f4761"/><path d="M6 6h8l-2 6h-4z" fill="#f2c14e"/><text x="24" y="15" font-size="12" font-family="Arial" font-weight="700" fill="#0f4761">LUMEN</text></svg>'};
function elHtml(st,e,sel,mini){
  const C=`class="pe pe-${e.k}${sel&&sel.has(e.id)?" psel":""}%P%" data-e="${e.id}"`;
  const empty=(e.k==="puces"?!(e.items&&e.items.length):!e.txt)&&PH[e.k];
  const anim=!mini&&e.anim&&st.vue!=="diaporama"?`<span class="panim">${e.anim}</span>`:"";
  const hid=st.vue==="diaporama"&&e.anim&&e.anim>st.build?" phid":"";
  if(empty)return`<div ${C.replace("%P%"," pph"+hid)}><span>${mini?"":PH[e.k]}</span>${anim}</div>`;
  let h="";
  if(e.k==="puces")h=`<ul>${e.items.map(x=>Array.isArray(x)?`<li class="p2">${esc(x[0])}</li>`:`<li>${esc(x)}</li>`).join("")}</ul>`;
  else if(e.k==="image")h=IMG[e.img]||"";
  else if(e.k==="tableau")h=`<table>${(e.lignes||[]).map((r,k)=>`<tr>${r.map(c=>k?`<td>${esc(c)}</td>`:`<th>${esc(c)}</th>`).join("")}</tr>`).join("")}</table>`;
  else h=esc(e.txt||"");
  return`<div ${C.replace("%P%",hid)}>${h}${anim}</div>`;
}
function slideHtml(st,sl,o={}){
  const n=st.slides.indexOf(sl)+1,p=st.pied;
  const foot=p&&!(p.saufTitre&&sl.layout==="titre")?`<div class="pfoot"><span>${esc(p.txt||"")}</span><span class="pnum">${p.num?n:""}</span></div>`:"";
  return`<div class="pslide th-${st.theme} lay-${sl.layout||"titre-contenu"}${o.cls||""}" data-sl="${sl.id}"><div class="pdeco"></div>${st.logo?`<div class="plogo">${IMG.logo}</div>`:""}${(sl.el||[]).map(e=>elHtml(st,e,o.sel,o.mini)).join("")}${foot}</div>`;
}
function renderDoc(st,s,prev){
  const sel=new Set(ls(s.sel)),cs=findSlide(st,st.cur)||st.slides[0];
  const sig=(S,sl)=>sl?slideHtml(S,sl,{}):"";
  const nav=$("#wnav");nav.hidden=st.vue==="diaporama";
  nav.innerHTML=st.slides.map((sl,k)=>{const o=prev&&findSlide(prev,sl.id),pop=prev&&(!o||sig(prev,o)!==sig(st,sl));
    return`<div class="pthumb${sl.id===cs.id?" on":""}${sel.has(sl.id)?" psel":""}${pop?" pop":""}" data-b="${sl.id}"><span class="pn">${k+1}${sl.trans?'<i class="ptr" title="Transition">★</i>':""}</span><div class="pmini">${slideHtml(st,sl,{mini:true})}</div></div>`;}).join("");
  const o=prev&&findSlide(prev,cs.id),changed=new Set();
  if(prev){(cs.el||[]).forEach(e=>{const f=findEl(prev,e.id);if(!f||elHtml(prev,f.e,null)!==elHtml(st,e,null))changed.add(e.id);});}
  let main=slideHtml(st,cs,{sel});
  changed.forEach(id=>{main=main.replace(`data-e="${id}"`,`data-e="${id}" data-pop="1"`);});
  const themeChanged=prev&&prev.theme!==st.theme;
  const doc=$("#wdoc");
  doc.innerHTML=`<div class="pmain${themeChanged||(prev&&o&&o.layout!==cs.layout)?" pop":""}">${main}</div>${st.notesVue?`<div class="pnotes">${esc(cs.notes||"Cliquez pour ajouter des notes")}</div>`:""}`;
  doc.querySelectorAll('[data-pop="1"]').forEach(e=>e.classList.add("pop"));
  doc.classList.toggle("pshow",st.vue==="diaporama");
  $("#wstatus").innerHTML=`<span>Diapositive ${st.slides.indexOf(cs)+1} sur ${st.slides.length}</span><span>Français (France)</span><span class="pst" data-b="notes">Notes</span><span>Commentaires</span>`;
  const ts=$(".wstage");let to=document.getElementById("wtoast");if(s.toast){if(!to){to=document.createElement("div");to.id="wtoast";to.className="wtoast";ts.appendChild(to);}to.textContent=s.toast;to.hidden=false;to.classList.remove("in");void to.offsetWidth;to.classList.add("in");}else if(to)to.hidden=true;
}

/* ---------- menu contextuel et fenêtre de dialogue ---------- */
function layer(id,cls,parent){let e=document.getElementById(id);if(!e){e=document.createElement("div");e.id=id;e.className=cls;e.hidden=true;$(parent).appendChild(e);}return e;}
function showCtx(s,anchor){const m=layer("wctx","wctx",".wword"),c=s.ctx,win=$(".wword");m.classList.remove("wg");
  m.innerHTML=c.items.map((t,k)=>`<span data-k="${k}">${esc(t)}</span>`).join("");m.hidden=false;
  const r=(anchor||win).getBoundingClientRect(),o=win.getBoundingClientRect();
  m.style.left=Math.max(4,Math.min(r.left-o.left,o.width-m.offsetWidth-4))+"px";m.style.top=(r.bottom-o.top+2)+"px";return m;}
function showGrid(s,anchor){const m=layer("wctx","wctx",".wword"),win=$(".wword");
  let h="";for(let r=1;r<=6;r++)for(let c=1;c<=8;c++)h+=`<i data-c="${c}-${r}"></i>`;
  m.innerHTML=`<small>Insérer un tableau</small><div class="wgrid">${h}</div>`;m.hidden=false;m.classList.add("wg");
  const r=(anchor||win).getBoundingClientRect(),o=win.getBoundingClientRect();
  m.style.left=Math.max(4,Math.min(r.left-o.left,o.width-m.offsetWidth-4))+"px";m.style.top=(r.bottom-o.top+2)+"px";return m;}
function hideCtx(){const m=document.getElementById("wctx");if(m)m.hidden=true;}
function showDlg(d,base,folded){const g=layer("wdlg","wdlg",".wstage"),n=d.lignes.length,pl=d.plus||0;
  const rows=d.lignes.map(([l,v],k)=>{const ob=base&&base.lignes,b=ob&&ob.find(x=>x[0]===l),old=d.lignes[k][2];const val=base&&(d.hot||[]).includes(k)&&!folded?(b?b[1]:old!==undefined?old:v):v;
    return`<div class="dl-r${folded&&k>=n-pl?" dl-more":""}" data-r="${k}"${folded&&k>=n-pl?" hidden":""}><span>${esc(l)}</span><b>${esc(val)}</b></div>`;}).join("");
  const ap=d.apercu?`<div class="dl-ap">${(base&&base.apercu?base.apercu:d.apercu).map(([l,t])=>`<div class="dl-a${l}">${esc(t)}</div>`).join("")}</div>`:"";
  g.innerHTML=`<div class="dl-box"><div class="dl-t">${esc(d.titre)}</div><div class="dl-c">${rows}${ap}</div><div class="dl-b">${pl?`<span class="dl-plus">${folded?"Plus &gt;&gt;":"&lt;&lt; Moins"}</span><i></i>`:""}<span class="dl-ok">${esc(d.okLabel||"OK")}</span><span>Annuler</span></div></div>`;g.hidden=false;return g;}
function setRow(d,k){const r=$(`#wdlg .dl-r[data-r="${k}"] b`);if(r){r.textContent=d.lignes[k][1];r.classList.remove("pop");void r.offsetWidth;r.classList.add("pop");}}
function setApercu(d){const a=$("#wdlg .dl-ap");if(a&&d.apercu)a.innerHTML=d.apercu.map(([l,t])=>`<div class="dl-a${l}">${esc(t)}</div>`).join("");}
function hideDlg(){const g=document.getElementById("wdlg");if(g)g.hidden=true;}
function ribbon(s,press){
  const rb=$("#ribbon"),pn=$("#ribpanel"),tab=s.tab||"Accueil";
  if(s.menu)rb.innerHTML=`<span class="tab cur">${esc(tab)}</span><span class="path">${s.menu}${s.rule?` &nbsp;<code>${esc(s.rule)}</code>`:""}</span>`;
  else{const tabs=W_TABS.includes(tab)?W_TABS:[...W_TABS,tab];rb.innerHTML=tabs.map(t=>`<span class="tab${t===tab?" cur":""}">${t}</span>`).join("");const ct=rb.querySelector(".tab.cur");if(ct)reveal(ct);}
  pn.hidden=false;
  if(pn.dataset.tab!==tab){pn.dataset.tab=tab;pn.scrollLeft=0;
    pn.innerHTML=(W_RIB[tab]||[]).map(([g,bs])=>`<div class="rg" data-g="${esc(g)}"><div class="rbs">${bs.map(b=>`<span class="rb${g==="Styles"?" wsty wsty-"+b.replace(/ /g,""):""}" data-b="${esc(b)}">${esc(b)}</span>`).join("")}</div><small>${esc(g)}</small></div>`).join("");}
  pn.querySelectorAll(".wsty").forEach(b=>{const k=b.dataset.b.replace(/ /g,"").toLowerCase(),d=curDefs[k];if(d&&d.couleur)b.style.color=d.couleur;});
  pn.querySelectorAll('.rb[data-b="Suivi des modifications"]').forEach(b=>b.classList.toggle("on",curSuivi));
  pn.querySelectorAll(".rb").forEach(b=>{const hot=!!s.btn&&b===btnEl(s.btn,s.groupe);b.classList.toggle("hot",hot);b.classList.remove("press");
    if(hot){const br=b.getBoundingClientRect(),pr=pn.getBoundingClientRect();if(press){}else if(br.right>pr.right-4)pn.scrollLeft+=br.right-pr.right+8;else if(br.left<pr.left+4)pn.scrollLeft-=pr.left-br.left+8;if(press){void b.offsetWidth;b.classList.add("press");}}});
}
function keysFx(s){const k=$("#keys");if(s.keys){k.innerHTML=s.keys.split(" + ").map(x=>`<kbd>${esc(x)}</kbd>`).join(" + ");k.hidden=false;k.classList.remove("in");void k.offsetWidth;k.classList.add("in");}else k.hidden=true;}
/* ---------- curseur : position calculée après défilement, dans le repère de la fenêtre ---------- */
function reveal(el){
  const box=["#wnav","#wdoc","#ribbon","#ribpanel"].map(q=>$(q)).find(b=>b&&b.contains(el));if(!box)return;
  const r=el.getBoundingClientRect(),d=box.getBoundingClientRect(),m=box.id==="wdoc"?16:8;
  if(r.left<d.left+m)box.scrollLeft-=d.left+m-r.left;
  else if(r.right>d.right-m)box.scrollLeft+=r.right-d.right+m;
  if(box.id==="wdoc"||box.id==="wnav"){
    if(r.top<d.top+40)box.scrollTop-=d.top+40-r.top;
    else if(r.bottom>d.bottom-40)box.scrollTop+=r.bottom-d.bottom+40;
  }
}
function cursorTo(el,where){
  const c=$("#wcursor"),win=$(".wword");if(!el||!c)return false;
  reveal(el);
  const r=el.getBoundingClientRect(),o=win.getBoundingClientRect();
  const x=where==="coin"?r.right-3:where==="center"?r.left+r.width/2:r.left+Math.min(r.width*.3,60),y=where==="coin"?r.bottom-3:r.top+r.height*.6;
  c.style.left=Math.max(4,Math.min(x-o.left,o.width-24))+"px";c.style.top=Math.max(4,Math.min(y-o.top,o.height-28))+"px";return true;
}
const tabEl=t=>[...document.querySelectorAll("#ribbon .tab")].find(x=>x.textContent===t);
const btnEl=(b,g)=>{const all=[...document.querySelectorAll("#ribpanel .rb")].filter(x=>x.dataset.b===b);return all.find(x=>g&&x.closest(".rg").dataset.g===g)||all[0];};
const targetEl=s=>{const id=s.at||ls(s.sel)[0];if(!id)return null;if(id==="statut")return $("#wstatus");return $(`#wdoc [data-e="${id}"]`)||$(`#wnav [data-b="${id}"]`)||$(`[data-b="${id}"]`);};
function clickFx(){const c=$("#wcursor");c.classList.remove("click");void c.offsetWidth;c.classList.add("click");}

/* ---------- interface ---------- */
function ui(s,i){
  const n=cur.s.length,tx=$("#text");
  tx.innerHTML=s.t;tx.classList.remove("in");void tx.offsetWidth;tx.classList.add("in");
  $("#count").textContent=`${i+1} / ${n}`;
  $("#prev").disabled=i===0;$("#next").disabled=i===n-1;
  $("#progress").innerHTML=cur.s.map((_,k)=>`<button class="seg ${k<i?"done":""} ${k===i?"cur":""}" data-i="${k}" aria-label="Aller à l'étape ${k+1}"></button>`).join("");
  $("#progress").querySelectorAll(".seg").forEach(b=>b.onclick=()=>{playing=false;go(+b.dataset.i,true);});
  if(window.cpcSay)window.cpcSpeech=window.cpcSay(s.t);
  const nl=$("#nextLesson");if(nl)nl.classList.toggle("hl",i===n-1);const sb=$("#sharebox");if(sb)sb.classList.toggle("hl",i===n-1);
  if(i===n-1)markSeen(cur.id);
  updatePlay();
}
function showStatic(i){
  token++;running=false;idx=i;const s=cur.s[i];
  renderDoc(stateAt(i),s,null);ribbon(s,false);keysFx(s);ui(s,i);$("#wcursor").classList.remove("on");
  hideCtx();if(s.dialog&&!s.dialog.ok){showDlg(s.dialog);(s.dialog.hot||[]).forEach(k=>{const r=$(`#wdlg .dl-r[data-r="${k}"]`);if(r)r.classList.add("hot");});}else hideDlg();
  voirFx(s);const el=targetEl(s);if(el)reveal(el);spotFx(s);
}
function spotEl(k){if(!k)return null;if(k==="onglets")return $("#ribbon");if(k==="ruban")return $("#ribpanel");if(k==="doc")return $("#wdoc");if(k==="statut")return $("#wstatus");if(k==="nav"||k==="miniatures")return $("#wnav");if(k.startsWith("groupe:"))return $(`#ribpanel .rg[data-g="${k.slice(7)}"]`);if(k.startsWith("onglet:"))return tabEl(k.slice(7));return null;}
function spotFx(s){document.querySelectorAll(".wspot").forEach(e=>e.classList.remove("wspot"));const e=spotEl(s.spot);if(e){if(e.closest("#ribpanel")||e.closest("#ribbon"))reveal(e);e.classList.add("wspot");}return e;}
function voirFx(s){if(s.voir){const v=$(`[data-b="${s.voir}"]`);if(v)reveal(v);}}
async function animate(i){
  if(reduce){showStatic(i);if(playing){const run=token;await wait(3200);if(run!==token)return;if(i<cur.s.length-1)animate(i+1);else{playing=false;updatePlay();}}return;}
  const run=++token,s=cur.s[i],ok=()=>run===token,prev=i>0?stateAt(i-1):null,fin=stateAt(i);
  const prevTab=i>0?(cur.s[i-1].tab||"Accueil"):"Accueil",tab=s.tab||"Accueil";
  running=true;idx=i;
  const pd=i>0&&cur.s[i-1].dialog&&!cur.s[i-1].dialog.ok?cur.s[i-1].dialog:null,keep=pd&&s.dialog&&pd.titre===s.dialog.titre;
  renderDoc(prev||fin,keep?{sel:cur.s[i-1].sel}:i>0?{sel:""}:s,null);ribbon(keep?{...cur.s[i-1],btn:null}:{tab:prevTab},false);keysFx({});ui(s,i);hideCtx();
  if(keep)showDlg(s.dialog,pd);else hideDlg();
  voirFx(s);const cu=$("#wcursor");cu.classList.add("on");
  await wait(80);if(!ok())return;
  /* 1. le curseur va sur le texte et le sélectionne */
  const el=keep?null:targetEl(s);
  if(el){cursorTo(el);await wait(560);if(!ok())return;clickFx();
    ls(s.sel).forEach(id=>{const b=$(`[data-b="${id}"]`);if(b)b.classList.add("wsel");});await wait(500);if(!ok())return;}
  /* 2. il clique sur l'onglet, puis sur le bouton du ruban */
  if(tab!==prevTab&&!s.menu&&!keep){const t=tabEl(tab);if(t){cursorTo(t,"center");await wait(520);if(!ok())return;clickFx();}}
  if((s.menu||tab!==prevTab)&&!keep){ribbon(s,false);await wait(380);if(!ok())return;}
  if(s.btn&&!keep){const b=btnEl(s.btn,s.groupe);if(b){cursorTo(b,"center");await wait(520);if(!ok())return;clickFx();}ribbon(s,true);await wait(450);if(!ok())return;}
  if(s.keys){keysFx(s);await wait(500);if(!ok())return;}
  /* menu contextuel : le curseur choisit une commande */
  if(s.grille){const g=showGrid(s,btnEl(s.btn,s.groupe));await wait(350);if(!ok())return;const[c,r]=s.grille;
    const cell=g.querySelector(`[data-c="${c}-${r}"]`);if(cell){cursorTo(cell,"center");await wait(600);if(!ok())return;
      g.querySelectorAll("i").forEach(x=>{const[a,b]=x.dataset.c.split("-").map(Number);x.classList.toggle("on",a<=c&&b<=r);});g.querySelector("small").textContent=`Tableau ${c} x ${r}`;await wait(450);if(!ok())return;clickFx();await wait(300);if(!ok())return;}
    hideCtx();}
  if(s.poignee){const e=targetEl(s),im=e&&e.querySelector(".wimg");if(im){cursorTo(im,"coin");await wait(600);if(!ok())return;clickFx();
      const c=$("#wcursor");c.style.left=(parseFloat(c.style.left)-60)+"px";c.style.top=(parseFloat(c.style.top)-36)+"px";await wait(650);if(!ok())return;}}
  if(s.ctx){const m=showCtx(s,btnEl(s.btn,s.groupe)||targetEl(s));await wait(350);if(!ok())return;
    const it=m.querySelector(`[data-k="${s.ctx.hot||0}"]`);if(it){cursorTo(it,"center");await wait(560);if(!ok())return;it.classList.add("on");clickFx();await wait(350);if(!ok())return;}
    hideCtx();}
  /* fenêtre de dialogue : chaque réglage, puis OK */
  if(s.dialog){const d=s.dialog;if(!keep){showDlg(d,"avant",!!d.plus);await wait(500);if(!ok())return;}
    if(!keep&&d.plus){const b=$("#wdlg .dl-plus");if(b){cursorTo(b,"center");await wait(560);if(!ok())return;clickFx();b.innerHTML="&lt;&lt; Moins";
      document.querySelectorAll("#wdlg .dl-more").forEach(r=>{r.hidden=false;r.classList.add("hot");});await wait(500);if(!ok())return;}}
    for(const k of d.hot||[]){const r=$(`#wdlg .dl-r[data-r="${k}"]`);if(!r)continue;cursorTo(r.querySelector("b"),"center");await wait(560);if(!ok())return;clickFx();r.classList.add("hot");setRow(d,k);await wait(450);if(!ok())return;}
    if(keep)setApercu(d);
    if(d.ok){const b=$("#wdlg .dl-ok");if(b){await wait(250);cursorTo(b,"center");await wait(560);if(!ok())return;clickFx();b.classList.add("on");await wait(300);if(!ok())return;}hideDlg();}
  }
  if(s.ensuite){const e=$(`[data-b="${s.ensuite}"]`);if(e){cursorTo(e);await wait(600);if(!ok())return;clickFx();await wait(300);if(!ok())return;}}
  /* 3. le document change, le changement est surligné */
  renderDoc(fin,s,prev);ribbon(s,false);keysFx(s);
  if(s.dialog&&!s.dialog.ok){(s.dialog.hot||[]).forEach(k=>{const r=$(`#wdlg .dl-r[data-r="${k}"]`);if(r)r.classList.add("hot");});}
  {const sp=spotFx(s);if(sp&&!targetEl(s)&&!s.btn){cursorTo(sp,"center");}}
  const el2=targetEl(s);if(el2&&!s.btn&&!s.dialog){cursorTo(el2);}else if(el2)reveal(el2);
  await wait(900);if(!ok())return;
  cu.classList.remove("on");running=false;updatePlay();
  if(playing){
    const words=s.t.replace(/<[^>]+>/g,"").split(/\s+/).length;
    await Promise.all([wait(Math.max(1900,words*290)),window.cpcSpeech]);if(!ok())return;if(window.cpcVoiceOn&&window.cpcVoiceOn()){await wait(400);if(!ok())return;}
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
