/* Lecteur animé d'une leçon Excel */
const TABS=["Fichier","Accueil","Insertion","Mise en page","Formules","Données","Révision","Affichage"];
const RIB={
 "Fichier":[["Classeur",["Nouveau","Ouvrir","Enregistrer","Enregistrer sous","Imprimer"]]],
 "Accueil":[["Presse-papiers",["Coller","Couper","Copier"]],["Police",["G","I","S","Bordures","Remplissage"]],["Alignement",["Gauche","Centrer","Droite"]],["Nombre",["€","%","000"]],["Styles",["Mise en forme conditionnelle"]],["Édition",["Somme","Rechercher"]]],
 "Insertion":[["Tableaux",["Tableau croisé dynamique","Tableau"]],["Illustrations",["Images","Formes"]],["Graphiques",["Histogramme","Courbes","Secteurs"]]],
 "Mise en page":[["Mise en page",["Marges","Orientation","Taille","Zone d'impression"]]],
 "Formules":[["Bibliothèque de fonctions",["Insérer une fonction","Somme automatique","Logique","Texte","Date et heure","Recherche"]]],
 "Données":[["Trier et filtrer",["Trier","Filtrer"]],["Outils de données",["Supprimer les doublons","Convertir"]]],
 "Révision":[["Vérification",["Orthographe"]],["Commentaires",["Nouveau commentaire"]],["Protéger",["Protéger la feuille"]]],
 "Affichage":[["Affichages",["Normal","Mise en page"]],["Fenêtre",["Figer les volets"]],["Zoom",["Zoom","100 %"]]]};

/* ---------- moteur de la feuille ---------- */
let cur=null,idx=0,playing=false,running=false,token=0,boxes={};
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const cellEl=k=>$(`#sheet td[data-k="${k}"]`);

let curC=0,curR=0;
function dims(les){
  let C=0,R=les.g.length;les.g.forEach(r=>C=Math.max(C,r.length));
  const t=k=>{if(!/^\$?[A-Z]+\$?\d/.test(k))return;const g=pRange(k);C=Math.max(C,g.c2+1);R=Math.max(R,g.r2+1);};
  les.s.forEach(s=>[s.c,s.sel,s.sel2,s.copy,...ls(s.mark),...ls(s.spill),...Object.keys(s.set||{}),...Object.keys(s.fill||{}),...Object.keys(s.fmt||{})].filter(Boolean).forEach(t));
  if(les.chart)t(les.chart.at);
  return{C:innerWidth<640?C+1:Math.max(C+1,8),R:Math.max(R+1,7)};
}
function cellsOf(x){const g=pRange(x),o=[];for(let r=g.r1;r<=g.r2;r++)for(let c=g.c1;c<=g.c2;c++)o.push(colName(c)+(r+1));return o;}
function selR(x){
  if(!x)return null;
  if(x.startsWith("col:")){const c=colIdx(x.slice(4));return{c1:c,c2:c,r1:0,r2:curR-1};}
  if(x.startsWith("row:")){const r=+x.slice(4)-1;return{c1:0,c2:curC-1,r1:r,r2:r};}
  return pRange(x);
}
function stateAt(les,i){
  const v={},fm={};les.g.forEach((row,r)=>row.forEach((x,c)=>{if(x!=="")v[colName(c)+(r+1)]=x;}));
  let bad={},spill=[],hide=[],fmt={},w={...(les.w||{})},copy="",sheets={list:["Feuil1"],on:0},chart=false;
  const put=(k,val)=>{if(val==="")delete v[k];else v[k]=val;};
  for(let n=0;n<=i;n++){const s=les.s[n];
    if(s.f!==undefined){if(s.f[0]==="=")fm[s.c]=s.f;else delete fm[s.c];put(s.c,s.v!==undefined?s.v:s.f);}
    for(const[k,val]of Object.entries(s.set||{}))put(k,val);
    for(const[k,val]of Object.entries(s.fill||{}))put(k,val);
    for(const[rg,fl]of Object.entries(s.fmt||{}))cellsOf(rg).forEach(k=>fmt[k]=(fmt[k]||"")+fl);
    ls(s.bad).forEach(k=>bad[k]=1);
    if(s.spill)spill=ls(s.spill);
    if(s.hide)hide=s.hide;
    if(s.w)Object.assign(w,s.w);
    if(s.copy!==undefined)copy=s.copy;
    if(s.sheets)sheets=s.sheets;
    if(s.chart)chart=true;}
  return{v,fm,bad,spill,hide,fmt,w,copy,sheets,chart};
}
function build(les){
  const{C,R}=dims(les);curC=C;curR=R;
  let h="<thead><tr><th class='corner'></th>";
  for(let c=0;c<C;c++)h+=`<th data-c="${c}">${colName(c)}</th>`;
  h+="</tr></thead><tbody>";
  for(let r=0;r<R;r++){h+=`<tr data-r="${r+1}"><th data-r="${r}">${r+1}</th>`;
    for(let c=0;c<C;c++)h+=`<td data-k="${colName(c)+(r+1)}" data-x="${c}"${r===0&&!les.nh?' data-h="1"':""}></td>`;h+="</tr>";}
  $("#sheet").innerHTML=h+"</tbody>";
  $("#ov").innerHTML='<div class="cursor" id="cursor"><svg viewBox="0 0 20 24"><path d="M2 1.5v17l4.6-4.2 3 7 2.9-1.2-3-6.9h6.3z"/></svg></div>';
  boxes={};$("#sheetwrap").scrollLeft=0;$("#ribpanel").dataset.tab="";
}
function paint(td,raw,pop){
  const[kd,txt]=kind(raw);td.textContent=txt;
  td.classList.toggle("num",kd==="num");td.classList.toggle("err",kd==="err");td.classList.toggle("hdr",!!td.dataset.h);
  if(pop){td.classList.remove("pop");void td.offsetWidth;td.classList.add("pop");}
}
function applyState(st){
  document.querySelectorAll("#sheet td").forEach(td=>{const k=td.dataset.k;td.classList.remove("mark","pop");paint(td,st.v[k]||"");td.classList.toggle("bad",!!st.bad[k]);});
  document.querySelectorAll("#sheet tbody tr").forEach(tr=>tr.classList.toggle("hid",st.hide.includes(+tr.dataset.r)));
  persist(st);
}
let lastW="";
function persist(st){
  document.querySelectorAll("#sheet td").forEach(td=>{const f=st.fmt[td.dataset.k]||"";
    td.classList.toggle("fb",f.includes("b"));td.classList.toggle("ff",f.includes("f"));td.classList.toggle("fc",f.includes("c"));td.classList.toggle("fbd",f.includes("d"));td.classList.toggle("fi",f.includes("i"));td.classList.toggle("fu",f.includes("u"));});
  const wk=JSON.stringify(st.w);
  if(wk!==lastW){lastW=wk;
    for(let c=0;c<curC;c++){const w=st.w[colName(c)],px=w?w+"px":"";
      document.querySelectorAll(`#sheet td[data-x="${c}"],#sheet thead th[data-c="${c}"]`).forEach(e=>{e.style.minWidth=px;e.style.maxWidth=px;e.classList.toggle("wfix",!!w);});}
    setTimeout(placeAll,340);}
  setBox("copy",st.copy?pRange(st.copy):null,"ants");
  $("#tabs").innerHTML=st.sheets.list.map((n,j)=>`<span class="${j===st.sheets.on?"on":""}">${esc(n)}</span>`).join("")+"<span>+</span>";
  renderChart(st);
}
function placeChart(){const el=$("#chart");if(!el||!cur||!cur.chart)return;const r=rect(pRange(cur.chart.at));if(!r)return;Object.assign(el.style,{left:r.x+6+"px",top:r.y+4+"px",width:r.w-12+"px",height:r.h-8+"px"});}
function renderChart(st){
  let el=$("#chart");
  if(!cur||!cur.chart||!st.chart){if(el)el.remove();return;}
  const ch=cur.chart,labs=cellsOf(ch.labels),nums=cellsOf(ch.vals).map(k=>parseFloat((st.v[k]||"0").replace(/[\s ]/g,"").replace(",","."))||0),max=Math.max(...nums,1);
  const fresh=!el;
  if(fresh){el=document.createElement("div");el.id="chart";el.className="chart";
    el.innerHTML=`<b>${esc(ch.title)}</b><div class="bars">${labs.map(()=>"<i></i>").join("")}</div><div class="blab">${labs.map(k=>`<span>${esc(st.v[k]||"")}</span>`).join("")}</div>`;
    $("#ov").appendChild(el);placeChart();}
  const set=()=>el.querySelectorAll(".bars i").forEach((b,j)=>b.style.height=nums[j]/max*100+"%");
  if(fresh&&!reduce)requestAnimationFrame(()=>requestAnimationFrame(set));else set();
}
function rect(g){
  const tb=$("#sheet");let a,b;
  for(let r=g.r1;r<=g.r2&&!a;r++){const e=cellEl(colName(g.c1)+(r+1));if(e&&e.offsetHeight)a=e;}
  for(let r=g.r2;r>=g.r1&&!b;r--){const e=cellEl(colName(g.c2)+(r+1));if(e&&e.offsetHeight)b=e;}
  if(!a||!b)return null;
  return{x:a.offsetLeft+tb.offsetLeft,y:a.offsetTop+tb.offsetTop,w:b.offsetLeft+b.offsetWidth-a.offsetLeft,h:b.offsetTop+b.offsetHeight-a.offsetTop};
}
function place(b){const r=rect(b.g);if(!r){b.el.style.display="none";return;}b.el.style.display="";Object.assign(b.el.style,{left:r.x-1+"px",top:r.y-1+"px",width:r.w+1+"px",height:r.h+1+"px"});}
function setBox(key,g,cls,color){
  let b=boxes[key];
  if(!g){if(b){b.el.remove();delete boxes[key];}return;}
  if(!b){b=boxes[key]={el:document.createElement("div")};b.el.className="box "+cls;$("#ov").appendChild(b.el);}
  b.g=g;if(color)b.el.style.color=`var(--${color})`;place(b);
}
const clearBoxes=pre=>{for(const k in boxes)if(k.startsWith(pre))setBox(k,null);};
const placeAll=()=>{for(const k in boxes)place(boxes[k]);placeChart();};
function refBoxes(f,st){
  const refs=f&&f[0]==="="?colorize(f).refs:[];
  refs.forEach((k,j)=>{let g=pRange(k);if(k.endsWith("#")){const sp=st.spill.find(x=>x.split(":")[0]===k.slice(0,-1));if(sp)g=pRange(sp);}setBox("ref"+j,g,"ref","r"+(j%6));});
  for(const k in boxes)if(k.startsWith("ref")&&+k.slice(3)>=refs.length)setBox(k,null);
  return refs;
}
function spillBoxes(list){clearBoxes("sp");list.forEach((s,j)=>setBox("sp"+j,pRange(s),"spill"));}
function hdr(g){
  document.querySelectorAll("#sheet thead th[data-c]").forEach(th=>th.classList.toggle("on",+th.dataset.c>=g.c1&&+th.dataset.c<=g.c2));
  document.querySelectorAll("#sheet tbody th").forEach(th=>th.classList.toggle("on",+th.dataset.r>=g.r1&&+th.dataset.r<=g.r2));
}
function barSet(t){$("#formula").innerHTML=t&&t[0]==="="?colorize(t).html:esc(t||"");}
const barOf=(s,st)=>s.bar!==undefined?s.bar:st.fm[s.c]!==undefined?st.fm[s.c]:kind(st.v[s.c]||"")[1];
function ensureVisible(k){
  const w=$("#sheetwrap"),r=rect(pRange(k));if(!r)return;
  const beh=reduce?"auto":"smooth";
  if(r.x+r.w>w.scrollLeft+w.clientWidth-8)w.scrollTo({left:r.x+r.w-w.clientWidth+24,behavior:beh});
  else if(r.x<w.scrollLeft+44)w.scrollTo({left:Math.max(0,r.x-60),behavior:beh});
}
function moveCursor(k,corner){
  const r=rect(pRange(k)),c=$("#cursor");if(!r||!c)return;
  c.style.left=(corner?r.x+r.w-3:r.x+r.w*.5)+"px";c.style.top=(corner?r.y+r.h-3:r.y+r.h*.5)+"px";
}
function clickFx(){const c=$("#cursor");c.classList.remove("click");void c.offsetWidth;c.classList.add("click");}
function ghosts(refs,st,target){
  const t=rect(pRange(target));if(!t)return;
  refs.forEach((k,j)=>{let g=pRange(k);const r=rect(g);if(!r)return;
    const d=document.createElement("div");d.className="ghost";d.style.color=`var(--r${j%6})`;d.style.left=r.x+r.w/2+"px";d.style.top=r.y+r.h/2+"px";$("#ov").appendChild(d);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{d.style.left=t.x+t.w/2+"px";d.style.top=t.y+t.h/2+"px";d.style.opacity=".2";}));
    setTimeout(()=>d.remove(),420);});
}
function ribbon(s,editing,press){
  const rb=$("#ribbon"),pn=$("#ribpanel"),tab=s.tab||(editing?"Formules":"Accueil");
  if(s.menu)rb.innerHTML=`<span class="tab cur">Accueil</span><span class="path">${s.menu}${s.rule?` &nbsp;<code>${colorize(s.rule).html}</code>`:""}</span>`;
  else rb.innerHTML=TABS.map(t=>`<span class="tab${t===tab?" cur":""}">${t}</span>`).join("");
  if(!cur||!cur.rib){pn.hidden=true;return;}
  pn.hidden=false;
  if(pn.dataset.tab!==tab){pn.dataset.tab=tab;pn.scrollLeft=0;
    pn.innerHTML=RIB[tab].map(([g,bs])=>`<div class="rg"><div class="rbs">${bs.map(b=>`<span class="rb" data-b="${esc(b)}">${esc(b)}</span>`).join("")}</div><small>${esc(g)}</small></div>`).join("");}
  pn.querySelectorAll(".rb").forEach(b=>{const hot=!!s.btn&&b.dataset.b===s.btn;b.classList.toggle("hot",hot);b.classList.remove("press");
    if(hot){const br=b.getBoundingClientRect(),pr=pn.getBoundingClientRect();if(br.right>pr.right-8)pn.scrollLeft+=br.right-pr.right+24;else if(br.left<pr.left+8)pn.scrollLeft-=pr.left-br.left+24;if(press){void b.offsetWidth;b.classList.add("press");}}});
}
function transient(s){
  document.querySelectorAll(".spot").forEach(e=>e.classList.remove("spot"));
  const map={ribbon:"#ribwrap",namebox:"#namebox",formula:"#formula",tabs:"#tabs",cols:"#sheet thead th.on",rows:"#sheet tbody th.on"};
  ls(s.spot).forEach(z=>{if(z==="cell"){if(boxes.act)boxes.act.el.classList.add("spot");return;}document.querySelectorAll(map[z]).forEach(e=>e.classList.add("spot"));});
  setBox("sel2",s.sel2?pRange(s.sel2):null,"selb");
  const k=$("#keys");
  if(s.keys){k.innerHTML=s.keys.split(" + ").map(x=>`<kbd>${esc(x)}</kbd>`).join(" + ");k.hidden=false;k.classList.remove("in");void k.offsetWidth;k.classList.add("in");}else k.hidden=true;
}
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
function finalDeco(s,st){
  ls(s.mark).forEach(k=>cellEl(k).classList.add("mark"));
  spillBoxes(st.spill);
  const bar=barOf(s,st);barSet(bar);refBoxes(bar,st);
  const fk=Object.keys(s.fill||{});
  const g=s.sel?selR(s.sel):fk.length?pRange(s.c+":"+fk[fk.length-1]):null;
  setBox("sel",g,"selb");setBox("act",pRange(s.c),"act");hdr(g||pRange(s.c));
  $("#namebox").textContent=s.c;ribbon(s,false);transient(s);
}
function showStatic(i){
  token++;running=false;idx=i;
  const s=cur.s[i],st=stateAt(cur,i);
  applyState(st);ui(s,i);finalDeco(s,st);$("#cursor").classList.remove("on");ensureVisible(s.c);
}
async function animate(i){
  if(reduce){showStatic(i);if(playing){const run=token;await wait(3200);if(run!==token)return;if(i<cur.s.length-1)animate(i+1);else{playing=false;updatePlay();}}return;}
  const run=++token,les=cur,s=les.s[i],prev=stateAt(les,i-1),fin=stateAt(les,i),ok=()=>run===token;
  running=true;idx=i;
  applyState(prev);clearBoxes("ref");setBox("sel",null);spillBoxes(prev.spill);transient(s.kb?{keys:s.keys}:{});ui(s,i);ribbon({tab:s.tab},false);
  const cu=$("#cursor"),still=(s.kb&&s.f===undefined)||(i>0&&les.s[i-1].c===s.c&&s.f===undefined&&!s.fill&&!s.drag);
  ensureVisible(s.c);
  await wait(60);if(!ok())return;
  if(!still){cu.classList.add("on");moveCursor(s.c);await wait(480);if(!ok())return;clickFx();}
  setBox("act",pRange(s.c),"act");hdr(pRange(s.c));$("#namebox").textContent=s.c;
  barSet(prev.fm[s.c]!==undefined?prev.fm[s.c]:kind(prev.v[s.c]||"")[1]);
  await wait(320);if(!ok())return;
  if(s.drag&&s.sel){
    const g=selR(s.sel);setBox("sel",pRange(s.c),"selb");await wait(140);if(!ok())return;
    moveCursor(colName(g.c2)+(g.r2+1));setBox("sel",g,"selb");hdr(g);await wait(650);if(!ok())return;
  }
  if(s.menu){ribbon(s,false);await wait(700);if(!ok())return;}
  if(s.btn){ribbon(s,false,true);await wait(650);if(!ok())return;}
  let refs=[];
  if(s.f!==undefined){
    const f=s.f,td=cellEl(s.c),ed=document.createElement("div");ed.className="edit";td.textContent="";td.appendChild(ed);
    if(f[0]==="="&&!s.tab)ribbon(s,true);
    const ms=Math.max(18,Math.min(70,1500/f.length));
    for(let n=1;n<=f.length;n++){
      const part=f.slice(0,n),c=colorize(part);ed.innerHTML=c.html+'<span class="caret"></span>';$("#formula").innerHTML=c.html;
      if(f[0]==="=")refs=refBoxes(part,prev);
      await wait(ms);if(!ok())return;
    }
    await wait(750);if(!ok())return;
    if(refs.length){ghosts(refs,prev,s.c);await wait(380);if(!ok())return;}
  }
  /* validation : les valeurs apparaissent */
  const fillK=Object.keys(s.fill||{});
  new Set([...Object.keys(prev.v),...Object.keys(fin.v)]).forEach(k=>{
    if(fillK.includes(k))return;
    if((prev.v[k]||"")!==(fin.v[k]||"")||(k===s.c&&s.f!==undefined))paint(cellEl(k),fin.v[k]||"",true);
  });
  if(s.f!==undefined&&!fin.v[s.c])paint(cellEl(s.c),"");
  document.querySelectorAll("#sheet td").forEach(td=>{const b=!!fin.bad[td.dataset.k];if(b&&!td.classList.contains("bad")){td.classList.add("bad","pop");}});
  document.querySelectorAll("#sheet tbody tr").forEach(tr=>tr.classList.toggle("hid",fin.hide.includes(+tr.dataset.r)));
  persist(fin);placeAll();spillBoxes(fin.spill);
  const bar=barOf(s,fin);barSet(bar);refBoxes(bar,fin);ribbon(s,false);
  if(s.sel){setBox("sel",selR(s.sel),"selb");hdr(selR(s.sel));}
  if(fin.chart&&!prev.chart)ensureVisible("F2");
  if(fillK.length){
    await wait(500);if(!ok())return;
    cu.classList.add("on");moveCursor(s.c,true);await wait(480);if(!ok())return;clickFx();await wait(160);
    for(const k of fillK){
      if(!ok())return;
      const g=pRange(s.c+":"+k);setBox("sel",g,"selb");hdr(g);moveCursor(k,true);
      await wait(200);if(!ok())return;
      paint(cellEl(k),s.fill[k],true);await wait(160);
    }
  }
  ls(s.mark).forEach(k=>cellEl(k).classList.add("mark"));
  transient(s);
  await wait(250);if(!ok())return;
  cu.classList.remove("on");running=false;updatePlay();
  if(playing){
    const words=s.t.replace(/<[^>]+>/g,"").split(/\s+/).length;
    await wait(Math.max(1900,words*290));if(!ok())return;
    if(i<les.s.length-1)animate(i+1);else{playing=false;updatePlay();}
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
addEventListener("resize",placeAll);


/* ---------- démarrage ---------- */
(function(){
  const el=document.getElementById("lesson-data");if(!el)return;
  cur=JSON.parse(el.textContent);
  cur.s.forEach((s,i)=>{if(!s.c)s.c=i?cur.s[i-1].c:"A1";});
  lastW="";build(cur);animate(0);
  document.fonts&&document.fonts.ready.then(placeAll);
})();
