/* Lecteur animé d'une leçon Word : une page de traitement de texte, le ruban, le volet de navigation */
const W_TABS=["Fichier","Accueil","Insertion","Conception","Mise en page","Références","Révision","Affichage"];
const W_RIB={
 "Fichier":[["Fichier",["Enregistrer sous","Exporter","Imprimer"]]],
 "Accueil":[["Presse-papiers",["Coller","Couper","Copier"]],["Police",["G","I","S","Taille","Couleur"]],["Paragraphe",["Puces","Numérotation","Liste à plusieurs niveaux","Aligner","Afficher tout"]],["Styles",["Normal","Titre","Titre 1","Titre 2","Titre 3"]]],
 "Insertion":[["Pages",["Page de garde","Saut de page"]],["Tableaux",["Tableau"]],["Illustrations",["Images"]],["En-tête et pied de page",["En-tête","Pied de page","Numéro de page"]]],
 "Conception":[["Mise en forme du document",["Thèmes","Couleurs","Polices"]]],
 "Mise en page":[["Mise en page",["Marges","Orientation","Taille","Sauts de page"]]],
 "Références":[["Table des matières",["Table des matières","Mettre à jour la table"]],["Notes de bas de page",["Insérer une note de bas de page"]],["Citations et bibliographie",["Insérer une citation","Bibliographie"]],["Légendes",["Insérer une légende","Table des illustrations"]]],
 "Révision":[["Suivi",["Suivi des modifications"]],["Commentaires",["Nouveau commentaire"]]],
 "Affichage":[["Affichage",["Page","Lecture"]],["Afficher",["Volet de navigation","Règle"]],["Zoom",["Zoom","Plusieurs pages"]]],
 "En-tête et pied de page":[["En-tête et pied de page",["En-tête","Pied de page","Numéro de page"]],["Insérer",["Date et heure","Images"]],["Navigation",["Atteindre l'en-tête","Atteindre le pied de page","Lier au précédent"]],["Options",["Première page différente","Pages paires et impaires différentes"]],["Fermer",["Fermer l'en-tête et le pied de page"]]]
};
const HEAD={titre1:1,titre2:2,titre3:3};
/* apparence par défaut des styles (taille en points, comme dans Word) */
const DEFS={titre1:{taille:20,couleur:"#0f4761"},titre2:{taille:16,couleur:"#0f4761"},titre3:{taille:14,couleur:"#0f4761"}};
let cur=null,idx=0,playing=false,running=false,token=0,curDefs=clone0(DEFS);
function clone0(o){return JSON.parse(JSON.stringify(o));}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clone=clone0;

/* ---------- numérotation à plusieurs niveaux : « I. », « 1) », « a) »… ---------- */
const roman=n=>{let r="";[[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]].forEach(([v,l])=>{while(n>=v){r+=l;n-=v;}});return r;};
function numFmt(tpl,n){return tpl.replace(/^(I|i|1|a|A)/,m=>m==="I"?roman(n):m==="i"?roman(n).toLowerCase():m==="1"?n:m==="a"?String.fromCharCode(96+n):String.fromCharCode(64+n));}

/* ---------- état du document après l'étape i ---------- */
function headings(st){const o=[],c=[0,0,0,0];st.pages.forEach((pg,pi)=>pg.forEach(b=>{if(!b.hide&&HEAD[b.s]){const l=HEAD[b.s];c[l]++;for(let k=l+1;k<4;k++)c[k]=0;
  const n=st.num&&st.num[l]?numFmt(st.num[l],c[l]):"";o.push({id:b.id,lvl:l,txt:b.txt,num:n,page:pageNo(st,pi+1)});}}));return o;}
function findBlock(st,id){for(let pi=0;pi<st.pages.length;pi++){const i=st.pages[pi].findIndex(b=>b.id===id);if(i>=0)return{pi,i,b:st.pages[pi][i]};}return null;}
/* ---------- sections : numéros de page, « Lier au précédent », « À partir de » ---------- */
function secOf(st,p){let k=0;st.secs.forEach((x,j)=>{if(x.page<=p)k=j;});return k;}
function secNum(st,k){while(k>0&&st.secs[k].lien!==false)k--;return k===0?!!(st.footer&&st.footer.num):!!st.secs[k].num;}
function pageNo(st,p){const k=secOf(st,p),x=st.secs[k];if(k>0&&x.debut)return x.debut+p-x.page;return p<=1?1:pageNo(st,p-1)+1;}
function showNum(st,p){const k=secOf(st,p);return secNum(st,k)&&!(k===0&&p===1&&st.footer&&st.footer.first);}
function stateAt(i){
  const d=cur.doc,st={pages:clone(d.pages),nav:!!d.nav,footer:d.footer?clone(d.footer):null,header:d.entete?clone(d.entete):null,edit:false,marques:!!d.marques,
    marges:{haut:2.5,bas:2.5,gauche:2.5,droite:2.5,...(d.marges||{})},secs:[{page:1},...clone(d.sections||[])],defs:clone(DEFS),num:d.numerotation?clone(d.numerotation):null,toc:null};
  for(const[k,v]of Object.entries(d.styles||{}))st.defs[k]={...st.defs[k],...v};
  if(d.tocAuto)st.toc=headings(st);
  for(let n=0;n<=i;n++){const s=cur.s[n];
    for(const[id,sty]of Object.entries(s.style||{})){const f=findBlock(st,id);if(f)f.b.s=sty;}
    for(const[id,t]of Object.entries(s.texte||{})){const f=findBlock(st,id);if(f)f.b.txt=t;}
    (s.add||[]).forEach(a=>{const f=findBlock(st,a.after);if(f)st.pages[f.pi].splice(f.i+1,0,clone(a.block));});
    ls(s.remove).forEach(id=>{const f=findBlock(st,id);if(f)st.pages[f.pi].splice(f.i,1);});
    [].concat(s.insererPage||[]).forEach(n=>st.pages.splice(+n-1,0,[]));
    (s.move||[]).forEach(m=>{const f=findBlock(st,m.id);if(!f)return;const[b]=st.pages[f.pi].splice(f.i,1);
      if(m.before){const t=findBlock(st,m.before);if(t)st.pages[t.pi].splice(t.i,0,b);}
      else{while(st.pages.length<m.page)st.pages.push([]);st.pages[m.page-1].push(b);}});
    for(const[id,o]of Object.entries(s.orient||{})){const f=findBlock(st,id);if(f)f.b.orient=o;}
    ls(s.show).forEach(id=>{const f=findBlock(st,id);if(f)f.b.hide=false;});
    for(const[id,v]of Object.entries(s.forme||{})){const f=findBlock(st,id);if(f)f.b.forme={...(f.b.forme||{}),...v};}
    ls(s.effacerForme).forEach(id=>{const f=findBlock(st,id);if(f)delete f.b.forme;});
    if(s.couleur1)st.defs.titre1={...st.defs.titre1,couleur:s.couleur1};
    for(const[k,v]of Object.entries(s.modifStyle||{}))st.defs[k]={...(st.defs[k]||{}),...v};
    if(s.numerotation!==undefined)st.num=s.numerotation?clone(s.numerotation):null;
    if(s.nav!==undefined)st.nav=!!s.nav;
    if(s.marques!==undefined)st.marques=!!s.marques;
    if(s.marges)st.marges={...st.marges,...s.marges};
    if(s.footer!==undefined)st.footer=s.footer?{...(st.footer||{}),...s.footer}:null;
    if(s.entete!==undefined)st.header=s.entete?{...(st.header||{}),...s.entete}:null;
    if(s.section){const v=s.section;let k=st.secs.findIndex(x=>x.page===v.page);
      if(k<0){st.secs.push({page:v.page});st.secs.sort((a,b)=>a.page-b.page);k=st.secs.findIndex(x=>x.page===v.page);}
      const x=st.secs[k];if(v.lien===false&&x.lien!==false&&v.num===undefined)x.num=secNum(st,k);Object.assign(x,v);}
    if(s.edit!==undefined)st.edit=!!s.edit;
    st.pages=st.pages.filter(pg=>pg.length);
    if(ls(s.show).includes("toc")||s.tocUpdate)st.toc=headings(st);
  }
  return st;
}

/* ---------- rendu ---------- */
function foot(st,p){const f=st.footer||{},first=f.first&&p===1;return`<span class="wf-l">${first?"":esc(f.txt||"")}</span><span class="wf-n">${showNum(st,p)?pageNo(st,p):""}</span><span class="wf-r"></span>`;}
function head(st,p){const h=st.header||{},first=st.footer&&st.footer.first&&p===1;return first?"":`<span class="wf-l">${esc(h.txt||"")}</span><span class="wf-r">${esc(h.droite||"")}</span>`;}
const PX=.95; /* points de Word → pixels de la page affichée */
function look(st,b){const f={...(st.defs[b.s]||{}),...(b.forme||{})};let r="";
  if(f.taille)r+=`font-size:${(f.taille*PX).toFixed(1)}px;`;if(f.couleur)r+=`color:${f.couleur};`;if(f.gras)r+="font-weight:700;";if(f.majuscules)r+="text-transform:uppercase;";return r;}
function numMap(st){const m=new Map();headings(st).forEach(h=>{if(h.num)m.set(h.id,h.num);});return m;}
function renderDoc(st,s,prev){
  const sel=new Set(ls(s.sel)),changed=new Set(),nm=numMap(st);
  if(prev){const pm=numMap(prev);st.pages.forEach(pg=>pg.forEach(b=>{const o=findBlock(prev,b.id);
    if(!o||o.b.s!==b.s||!!o.b.hide!==!!b.hide||o.b.txt!==b.txt||look(prev,o.b)!==look(st,b)||pm.get(b.id)!==nm.get(b.id))changed.add(b.id);}));}
  const tocChanged=prev&&JSON.stringify(prev.toc)!==JSON.stringify(st.toc);
  const pages=st.pages.map((pg,pi)=>{
    const body=pg.filter(b=>!b.hide).map(b=>{
      const cls=["wb","w-"+(b.s||"normal")];if(sel.has(b.id))cls.push("wsel");if(changed.has(b.id))cls.push("pop");
      if(b.s==="toc"){
        const t=st.toc||[];
        return`<div class="${cls.join(" ")}${tocChanged?" pop":""}" data-b="${b.id}"><div class="toc-h" style="color:${st.defs.titre1.couleur}">Table des matières</div>${t.map(h=>`<div class="toc-l toc-${h.lvl}"><span>${h.num?`<span class="wnum">${h.num}</span> `:""}${esc(h.txt)}</span><i></i><span>${h.page}</span></div>`).join("")}</div>`;
      }
      if(b.s==="saut")return st.marques?`<div class="${cls.join(" ")}" data-b="${b.id}"><span>${esc(b.txt||"Saut de page")}</span></div>`:"";
      if(b.s==="vide")return`<p class="${cls.join(" ")}" data-b="${b.id}">${st.marques?'<span class="wpil">¶</span>':"&nbsp;"}</p>`;
      if(b.s==="tableau")return`<div class="${cls.join(" ")}" data-b="${b.id}"><table class="wtab">${(b.lignes||[]).map((r,k)=>`<tr>${r.map(c=>k?`<td>${esc(c)}</td>`:`<th>${esc(c)}</th>`).join("")}</tr>`).join("")}</table></div>`;
      const n=nm.get(b.id);
      return`<p class="${cls.join(" ")}" data-b="${b.id}" style="${look(st,b)}">${n?`<span class="wnum">${n}</span>`:""}${esc(b.txt||"")}${st.marques?'<span class="wpil">¶</span>':""}</p>`;
    }).join("");
    const p=pi+1,land=pg.some(b=>b.orient==="paysage");
    const fh=foot(st,p),pfh=prev&&prev.pages.length>=p?foot(prev,p):fh,hh=head(st,p),phh=prev&&prev.pages.length>=p?head(prev,p):hh;
    const m=st.marges,ins=`${(m.haut*20).toFixed(0)}px ${(m.droite*19.2).toFixed(0)}px ${(m.bas*21.6).toFixed(0)}px ${(m.gauche*19.2).toFixed(0)}px`;
    const mpop=prev&&JSON.stringify(prev.marges)!==JSON.stringify(m)?" pop":"";
    const k=secOf(st,p),many=st.secs.length>1,sn=many?` -Section ${k+1}-`:"",same=k>0&&st.secs[k].lien!==false&&st.secs[k].page===p?'<em>Identique au précédent</em>':"";
    return`<div class="wpage${st.edit?" wedit":""}${land?" wland":""}" data-p="${p}"><div class="whead${hh!==phh?" pop":""}" data-h="${p}">${st.edit?`<small class="wtag">En-tête${sn}</small>`:""}${hh}</div><div class="wbody${mpop}" style="inset:${ins}">${body}</div><div class="wfoot${fh!==pfh?" pop":""}" data-f="${p}">${st.edit?`<small class="wtag">Pied de page${sn}</small>${same}`:""}${fh}</div></div>`;
  }).join("");
  const doc=$("#wdoc");doc.innerHTML=`<div class="wpages">${pages}</div>`;
  curDefs=st.defs;
  const nav=$("#wnav");
  if(st.nav){nav.hidden=false;const hs=headings(st),cs=ls(s.sel);
    nav.innerHTML=`<b>Navigation</b><div class="wn-t"><span class="on">Titres</span><span>Pages</span></div>${hs.length?hs.map(h=>`<span class="wn wn-${h.lvl}${cs.includes(h.id)?" on":""}">${h.num?h.num+" ":""}${esc(h.txt)}</span>`).join(""):`<small>Aucun titre : appliquez des styles de titre pour voir le plan.</small>`}`;}
  else nav.hidden=true;
  const cp=(()=>{if(s.at==="footer"||s.at==="header")return s.page||2;for(const id of[s.at,...ls(s.sel),s.voir]){const f=id&&findBlock(st,id);if(f)return f.pi+1;}return 1;})();
  const words=st.pages.flat().filter(b=>!b.hide&&b.s!=="toc").reduce((a,b)=>a+(b.txt||"").split(/\s+/).filter(Boolean).length,0);
  $("#wstatus").innerHTML=`<span>Page ${cp} sur ${st.pages.length}</span><span>${words} mots</span><span>Français (France)</span>`;
}
/* ---------- menu contextuel et fenêtre de dialogue ---------- */
function layer(id,cls,parent){let e=document.getElementById(id);if(!e){e=document.createElement("div");e.id=id;e.className=cls;e.hidden=true;$(parent).appendChild(e);}return e;}
function showCtx(s,anchor){const m=layer("wctx","wctx",".wword"),c=s.ctx,win=$(".wword");
  m.innerHTML=c.items.map((t,k)=>`<span data-k="${k}">${esc(t)}</span>`).join("");m.hidden=false;
  const r=(anchor||win).getBoundingClientRect(),o=win.getBoundingClientRect();
  m.style.left=Math.max(4,Math.min(r.left-o.left,o.width-m.offsetWidth-4))+"px";m.style.top=(r.bottom-o.top+2)+"px";return m;}
function hideCtx(){const m=document.getElementById("wctx");if(m)m.hidden=true;}
function showDlg(d,base,folded){const g=layer("wdlg","wdlg",".wstage"),n=d.lignes.length,pl=d.plus||0;
  const rows=d.lignes.map(([l,v],k)=>{const ob=base&&base.lignes,b=ob&&ob.find(x=>x[0]===l),old=d.lignes[k][2];const val=base&&(d.hot||[]).includes(k)&&!folded?(b?b[1]:old!==undefined?old:v):v;
    return`<div class="dl-r${folded&&k>=n-pl?" dl-more":""}" data-r="${k}"${folded&&k>=n-pl?" hidden":""}><span>${esc(l)}</span><b>${esc(val)}</b></div>`;}).join("");
  const ap=d.apercu?`<div class="dl-ap">${(base&&base.apercu?base.apercu:d.apercu).map(([l,t])=>`<div class="dl-a${l}">${esc(t)}</div>`).join("")}</div>`:"";
  g.innerHTML=`<div class="dl-box"><div class="dl-t">${esc(d.titre)}</div><div class="dl-c">${rows}${ap}</div><div class="dl-b">${pl?`<span class="dl-plus">${folded?"Plus &gt;&gt;":"&lt;&lt; Moins"}</span><i></i>`:""}<span class="dl-ok">OK</span><span>Annuler</span></div></div>`;g.hidden=false;return g;}
function setRow(d,k){const r=$(`#wdlg .dl-r[data-r="${k}"] b`);if(r){r.textContent=d.lignes[k][1];r.classList.remove("pop");void r.offsetWidth;r.classList.add("pop");}}
function setApercu(d){const a=$("#wdlg .dl-ap");if(a&&d.apercu)a.innerHTML=d.apercu.map(([l,t])=>`<div class="dl-a${l}">${esc(t)}</div>`).join("");}
function hideDlg(){const g=document.getElementById("wdlg");if(g)g.hidden=true;}
function ribbon(s,press){
  const rb=$("#ribbon"),pn=$("#ribpanel"),tab=s.tab||"Accueil";
  if(s.menu)rb.innerHTML=`<span class="tab cur">${esc(tab)}</span><span class="path">${s.menu}${s.rule?` &nbsp;<code>${esc(s.rule)}</code>`:""}</span>`;
  else{const tabs=W_TABS.includes(tab)?W_TABS:[...W_TABS,tab];rb.innerHTML=tabs.map(t=>`<span class="tab${t===tab?" cur":""}">${t}</span>`).join("");const ct=rb.querySelector(".tab.cur");if(ct)reveal(ct);}
  pn.hidden=false;
  if(pn.dataset.tab!==tab){pn.dataset.tab=tab;pn.scrollLeft=0;
    pn.innerHTML=(W_RIB[tab]||[]).map(([g,bs])=>`<div class="rg"><div class="rbs">${bs.map(b=>`<span class="rb${g==="Styles"?" wsty wsty-"+b.replace(/ /g,""):""}" data-b="${esc(b)}">${esc(b)}</span>`).join("")}</div><small>${esc(g)}</small></div>`).join("");}
  pn.querySelectorAll(".wsty").forEach(b=>{const k=b.dataset.b.replace(/ /g,"").toLowerCase(),d=curDefs[k];if(d&&d.couleur)b.style.color=d.couleur;});
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
const targetEl=s=>{const id=s.at||ls(s.sel)[0];if(id==="footer")return $(`.wfoot[data-f="${s.page||2}"]`);if(id==="header")return $(`.whead[data-h="${s.page||2}"]`);return id?$(`[data-b="${id}"]`):null;};
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
  hideCtx();if(s.dialog&&!s.dialog.ok){showDlg(s.dialog);(s.dialog.hot||[]).forEach(k=>{const r=$(`#wdlg .dl-r[data-r="${k}"]`);if(r)r.classList.add("hot");});}else hideDlg();
  voirFx(s);const el=targetEl(s);if(el)reveal(el);
}
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
  if(s.btn&&!keep){const b=btnEl(s.btn);if(b){cursorTo(b,"center");await wait(520);if(!ok())return;clickFx();}ribbon(s,true);await wait(450);if(!ok())return;}
  if(s.keys){keysFx(s);await wait(500);if(!ok())return;}
  /* menu contextuel : le curseur choisit une commande */
  if(s.ctx){const m=showCtx(s,btnEl(s.btn)||targetEl(s));await wait(350);if(!ok())return;
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
  /* 3. le document change, le changement est surligné */
  renderDoc(fin,s,prev);ribbon(s,false);keysFx(s);
  if(s.dialog&&!s.dialog.ok){(s.dialog.hot||[]).forEach(k=>{const r=$(`#wdlg .dl-r[data-r="${k}"]`);if(r)r.classList.add("hot");});}
  const el2=targetEl(s);if(el2&&!s.btn&&!s.dialog){cursorTo(el2);}else if(el2)reveal(el2);
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
