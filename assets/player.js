/* Lecteur animé d'une leçon Excel */
const TABS=["Fichier","Accueil","Insertion","Mise en page","Formules","Données","Révision","Affichage"];
const RIB={
 "Fichier":[["Classeur",["Nouveau","Ouvrir","Enregistrer","Enregistrer sous","Imprimer"]]],
 "Accueil":[["Presse-papiers",["Coller","Couper","Copier"]],["Police",["G","I","S","Bordures","Remplissage"]],["Alignement",["Gauche","Centrer","Droite"]],["Nombre",["€","%","000"]],["Styles",["Mise en forme conditionnelle"]],["Édition",["Somme","Rechercher"]]],
 "Insertion":[["Tableaux",["Tableau croisé dynamique","Tableau"]],["Illustrations",["Images","Formes"]],["Graphiques",["Histogramme","Barres","Courbes","Secteurs"]]],
 "Mise en page":[["Mise en page",["Marges","Orientation","Taille","Zone d'impression"]]],
 "Formules":[["Bibliothèque de fonctions",["Insérer une fonction","Somme automatique","Logique","Texte","Date et heure","Recherche"]]],
 "Données":[["Trier et filtrer",["Trier","Filtrer"]],["Outils de données",["Supprimer les doublons","Convertir"]]],
 "Révision":[["Vérification",["Orthographe"]],["Commentaires",["Nouveau commentaire"]],["Protéger",["Protéger la feuille"]]],
 "Création de graphique":[["Dispositions",["Ajouter un élément"]],["Styles",["Modifier les couleurs"]],["Données",["Intervertir lignes/colonnes","Sélectionner des données"]],["Type",["Modifier le type de graphique"]],["Emplacement",["Déplacer le graphique"]]],
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
  les._dr=R;
  if(les.chart){
    if(innerWidth<640){C=Math.max(C,4);R=Math.max(R,les._dr+8);}
    else[les.chart.at,...les.s.map(s=>s.chart&&s.chart.at)].filter(a=>a&&a!=="all").forEach(t);
  }
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
  let bad={},spill=[],hide=[],fmt={},w={...(les.w||{})},copy="",sheets={list:["Feuil1"],on:0},chart=null;
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
    if(chart&&(chart.spot||chart.panel||chart.pick)){chart={...chart};delete chart.spot;delete chart.panel;delete chart.pick;}
    if(s.chart!==undefined){
      if(!s.chart)chart=null;
      else{chart={...(chart||les.chart||{})};if(typeof s.chart==="object")Object.assign(chart,s.chart);}
    }}
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
/* ---------- graphiques ---------- */
const CH_COL=["r0","r4","r3","r2","r1","r5","k7","k8"];
let chPrev=null,chAnim=false,chRaf=0;
const num=x=>parseFloat(String(x||"0").replace(/[\s €%]/g,"").replace(",","."))||0;
const fr=n=>(Math.round(n*10)/10).toLocaleString("fr-FR");
const cutTxt=(s,n)=>s.length>n?s.slice(0,Math.max(1,n-1))+"…":s;
function nice(m){if(m<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(m))),x=m/p;return(x<=1?1:x<=2?2:x<=2.5?2.5:x<=4?4:x<=5?5:10)*p;}
function ticks(min,max,step){
  if(!step){const d=max-min,a=d/5,p=Math.pow(10,Math.floor(Math.log10(a||1))),x=Math.round(a/p*100)/100;step=[1,2,5,10].includes(x)?a:d/4;}
  const o=[];if(step<=0)return[min,max];for(let t=min;t<=max+1e-9&&o.length<12;t+=step)o.push(t);return o;
}
function chartRange(cfg){
  if(cfg.at==="all")return{c1:0,r1:0,c2:curC-1,r2:curR-1};
  if(innerWidth<640){const r=cur._dr+1;return{c1:0,r1:r,c2:3,r2:r+6};}
  return pRange(cfg.at);
}
function chartModel(st){
  const cfg=st.chart,rs=cfg.series||[cfg.vals];
  return{cfg,labs:cellsOf(cfg.labels).map(k=>kind(st.v[k]||"")[1]),ser:rs.map(r=>cellsOf(r).map(k=>num(st.v[k]))),
    names:rs.map((r,j)=>{const g=pRange(r);return(g.r1>0&&kind(st.v[colName(g.c1)+g.r1]||"")[1])||"Série "+(j+1);})};
}
function drawChart(el,M,ser,min,max,p,fresh){
  const cfg=M.cfg,type=cfg.type||"col",W=el.clientWidth||300,H=el.clientHeight||200,nS=ser.length,nC=M.labs.length,CW=6.1;
  const tok=j=>cfg.color&&nS===1?cfg.color:CH_COL[j%CH_COL.length],fill=j=>`fill="var(--${tok(j)})"`;
  const dim=i=>cfg.hi!=null&&cfg.hi!==i?' opacity=".25"':"";
  const axisOn=cfg.axis!==false,legOn=cfg.legend!=null?!!cfg.legend:nS>1,dl=!!cfg.dlabels;
  const clamp=v=>Math.min(Math.max(v,min),max),span=(max-min)||1;
  let L=12,R=W-12,T=10,B=H-10,grid="",body="",lab="",ttl="",leg="",spot=null;
  const pw=cfg.panel?Math.min(160,W*.44):0;if(pw)R-=pw+4;
  if(cfg.title){ttl=`<text class="ct${fresh.title?" cnew":""}" x="${(L+R)/2}" y="${T+12}" text-anchor="middle">${esc(cutTxt(cfg.title,Math.floor((R-L)/7)))}</text>`;if(cfg.spot==="title")spot=[L,T-5,R-L,24];T+=26;}
  if(legOn){
    const items=type==="pie"?M.labs.map((l,i)=>[l,CH_COL[i%CH_COL.length]]):M.names.map((n,j)=>[n,tok(j)]);
    const rows=[[]];let w=0;
    items.forEach(it=>{const iw=it[0].length*CW+26;if(w+iw>R-L&&rows[rows.length-1].length){rows.push([]);w=0;}rows[rows.length-1].push([it,iw]);w+=iw;});
    B-=rows.length*15;
    rows.forEach((row,ri)=>{let x=(L+R)/2-row.reduce((a,b)=>a+b[1],0)/2+6;const y=B+13+ri*15;
      row.forEach(([it,iw])=>{leg+=`<rect x="${x}" y="${y-8}" width="9" height="9" rx="2" fill="var(--${it[1]})"/><text x="${x+13}" y="${y}">${esc(it[0])}</text>`;x+=iw;});});
    if(cfg.spot==="legend")spot=[L,B+2,R-L,rows.length*15+5];
    leg=`<g class="${fresh.legend?"cnew":""}">${leg}</g>`;B-=5;
  }
  if(type==="pie"){
    const v0=ser[0],tot=v0.reduce((a,b)=>a+b,0)||1,cx=(L+R)/2,cy=(T+B)/2,r=Math.max(10,Math.min(R-L,B-T)/2-2);
    let a=-Math.PI/2;
    v0.forEach((v,i)=>{const sw=v/tot*2*Math.PI*p,a2=a+sw;
      if(sw>.002){
        if(sw>=2*Math.PI-.002)body+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--${CH_COL[i%CH_COL.length]})"${dim(i)}/>`;
        else body+=`<path d="M${cx} ${cy}L${cx+r*Math.cos(a)} ${cy+r*Math.sin(a)}A${r} ${r} 0 ${sw>Math.PI?1:0} 1 ${cx+r*Math.cos(a2)} ${cy+r*Math.sin(a2)}Z" fill="var(--${CH_COL[i%CH_COL.length]})" stroke="var(--surface)" stroke-width="1.5"${dim(i)}/>`;
        if(dl&&p===1&&v/tot>=.045){const m=(a+a2)/2;lab+=`<text class="cdl cin${fresh.dlabels?" cnew":""}" x="${cx+r*.64*Math.cos(m)}" y="${cy+r*.64*Math.sin(m)+4}" text-anchor="middle">${fr(v/tot*100)} %</text>`;}
      }a=a2;});
    if(cfg.spot==="plot")spot=[cx-r-4,cy-r-4,2*r+8,2*r+8];
  }else if(type==="bar"){
    const v0=ser[0],lw=Math.min(Math.max(...M.labs.map(s=>s.length),1)*CW+12,(R-L)*.45);L+=lw;if(dl)R-=32;
    const tk=ticks(min,max,cfg.step);if(axisOn)B-=16;
    const X=v=>L+(clamp(v)-min)/span*(R-L),slot=(B-T)/nC;
    if(axisOn){tk.forEach(t=>{const x=X(t);grid+=`<line class="cg" x1="${x}" x2="${x}" y1="${T}" y2="${B}"/><text x="${x}" y="${B+13}" text-anchor="middle">${fr(t)}</text>`;});if(cfg.spot==="axis")spot=[L-4,B+1,R-L+8,17];}
    grid+=`<line class="cax" x1="${L}" x2="${L}" y1="${T}" y2="${B}"/>`;
    v0.forEach((v,i)=>{const yc=B-slot*(i+.5),bh=slot*.62,w=Math.max(0,(X(v)-L)*p);
      body+=`<rect x="${L}" y="${yc-bh/2}" width="${w}" height="${bh}" rx="1.5" ${fill(0)}${dim(i)}/>`;
      lab+=`<text x="${L-6}" y="${yc+4}" text-anchor="end"${dim(i)}>${esc(cutTxt(M.labs[i],Math.floor(lw/CW)))}</text>`;
      if(dl&&p===1)lab+=`<text class="cdl${fresh.dlabels?" cnew":""}" x="${L+w+5}" y="${yc+4}">${fr(v)}</text>`;});
    if(cfg.spot==="plot")spot=[L-2,T-2,R-L+4,B-T+4];
  }else{
    if(dl)T+=14;
    const tk=ticks(min,max,cfg.step),tl=tk.map(fr);
    if(axisOn)L+=Math.max(...tl.map(s=>s.length))*CW+8;
    B-=16;
    const Y=v=>B-(clamp(v)-min)/span*(B-T),slot=(R-L)/nC;
    if(axisOn){tk.forEach((t,i)=>{const y=Y(t);grid+=`<line class="cg" x1="${L}" x2="${R}" y1="${y}" y2="${y}"/><text x="${L-5}" y="${y+4}" text-anchor="end">${tl[i]}</text>`;});if(cfg.spot==="axis")spot=[2,T-8,L+2,B-T+16];}
    grid+=`<line class="cax" x1="${L}" x2="${R}" y1="${B}" y2="${B}"/>`;
    M.labs.forEach((l,i)=>lab+=`<text x="${L+slot*(i+.5)}" y="${B+13}" text-anchor="middle"${dim(i)}>${esc(cutTxt(l,Math.max(2,Math.floor(slot/CW))))}</text>`);
    const dcls=`cdl${fresh.dlabels?" cnew":""}`;
    if(type==="line"){
      let g="";
      ser.forEach((s,j)=>{const pts=s.map((v,i)=>[L+slot*(i+.5),Y(v)]);
        g+=`<path d="M${pts.map(q=>q.join(" ")).join("L")}" fill="none" stroke="var(--${tok(j)})" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
        pts.forEach((q,i)=>{g+=`<circle cx="${q[0]}" cy="${q[1]}" r="${cfg.hi===i?6:3.2}" ${fill(j)} stroke="var(--surface)" stroke-width="1.5"/>`;
          if(dl&&p===1)lab+=`<text class="${dcls}" x="${q[0]}" y="${q[1]-8}" text-anchor="middle">${fr(s[i])}</text>`;});});
      body+=`<clipPath id="ccl"><rect x="0" y="0" width="${L+(R-L)*p+4}" height="${H}"/></clipPath><g clip-path="url(#ccl)">${g}</g>`;
    }else if(type==="stack"){
      const cum=new Array(nC).fill(0);
      ser.forEach((s,j)=>s.forEach((v,i)=>{const y0=B-(B-Y(min+cum[i]))*p;cum[i]+=v;const y1=B-(B-Y(min+cum[i]))*p,bw=slot*.58,x=L+slot*i+slot*.21;
        body+=`<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(0,y0-y1)}" ${fill(j)}${dim(i)}/>`;
        if(dl&&p===1&&y0-y1>13)lab+=`<text class="${dcls} cin" x="${x+bw/2}" y="${(y0+y1)/2+4}" text-anchor="middle">${fr(v)}</text>`;}));
    }else{
      ser.forEach((s,j)=>s.forEach((v,i)=>{const gw=slot*.68,bw=gw/nS,x=L+slot*i+slot*.16+bw*j,h=Math.max(0,(B-Y(v))*p);
        body+=`<rect x="${x}" y="${B-h}" width="${Math.max(1,bw-(nS>1?1.5:0))}" height="${h}" rx="1.5" ${fill(j)}${dim(i)}/>`;
        if(dl&&p===1)lab+=`<text class="${dcls}" x="${x+bw/2}" y="${B-h-4}" text-anchor="middle"${dim(i)}>${fr(v)}</text>`;}));
    }
    if(cfg.spot==="plot")spot=[L-2,T-2,R-L+4,B-T+4];
  }
  let html=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="100%" role="img" aria-label="${esc(cfg.title||"Graphique")}">${grid}${body}${lab}${ttl}${leg}${spot?`<rect class="cspot" x="${spot[0]}" y="${spot[1]}" width="${spot[2]}" height="${spot[3]}" rx="4"/>`:""}</svg>`;
  if(cfg.panel){const it=[["title","Titre du graphique",!!cfg.title],["axis","Axes",axisOn],["dlabels","Étiquettes de données",dl],["legend","Légende",legOn]];
    html+=`<div class="cpanel" style="width:${pw}px"><b>Éléments de graphique</b>${it.map(([k,n,on])=>`<span class="${cfg.pick===k?"hot"+(fresh.pick?" press":""):""}"><i class="${on?"on":""}"></i>${n}</span>`).join("")}</div>`;}
  if(cfg.selected)html+=[[0,0],[50,0],[100,0],[0,50],[100,50],[0,100],[50,100],[100,100]].map(([x,y])=>`<i class="hd" style="left:${x}%;top:${y}%"></i>`).join("");
  el.innerHTML=html;
}
function placeChartEl(el,cfg){const r=rect(chartRange(cfg));if(!r)return;Object.assign(el.style,{left:r.x+5+"px",top:r.y+4+"px",width:r.w-10+"px",height:r.h-8+"px"});}
function redrawChart(){const el=$("#chart");if(el&&chPrev)drawChart(el,chPrev.M,chPrev.M.ser,chPrev.min,chPrev.max,1,{});}
function placeChart(){const el=$("#chart");if(!el||!chPrev)return;placeChartEl(el,chPrev.M.cfg);redrawChart();}
function chartVisible(cfg){
  const w=$("#sheetwrap"),r=rect(chartRange(cfg));if(!r)return;
  if(r.x+r.w>w.scrollLeft+w.clientWidth)w.scrollTo({left:r.x+r.w-w.clientWidth+16,behavior:"smooth"});
  if(innerWidth<640){const el=$("#chart");el&&el.scrollIntoView({block:"nearest",behavior:"smooth"});}
}
function renderChart(st){
  cancelAnimationFrame(chRaf);
  let el=$("#chart");
  if(!cur||!st.chart){if(el)el.remove();chPrev=null;return;}
  const M=chartModel(st),cfg=M.cfg,type=cfg.type||"col";
  if(!el){el=document.createElement("div");el.id="chart";el.className="chart";$("#ov").appendChild(el);placeChartEl(el,cfg);void el.offsetWidth;}
  el.classList.toggle("sel",!!cfg.selected);
  const moved=chPrev&&chPrev.M.cfg.at!==cfg.at;placeChartEl(el,cfg);
  const flat=M.ser.flat(),dataMax=type==="stack"?Math.max(...M.labs.map((_,i)=>M.ser.reduce((a,s)=>a+(s[i]||0),0))):Math.max(...flat,0);
  const tmin=cfg.min!=null?cfg.min:0,tmax=cfg.max!=null?cfg.max:nice(dataMax);
  const key=type+"|"+M.ser.map(s=>s.length).join(","),pc=chPrev&&chPrev.M.cfg,same=!!chPrev&&chPrev.key===key;
  const from=same?chPrev:{v:flat,min:tmin,max:tmax};
  const changed=!same||from.v.some((x,i)=>x!==flat[i])||from.min!==tmin||from.max!==tmax;
  const go=chAnim&&!reduce;
  const fresh=go?{title:!!cfg.title&&(!pc||pc.title!==cfg.title),legend:!!pc&&!pc.legend&&!!cfg.legend,dlabels:!!cfg.dlabels&&(!pc||!pc.dlabels),pick:true}:{};
  const unflat=v=>{let k=0;return M.ser.map(s=>s.map(()=>v[k++]));};
  const fv=from.v.slice(),fmin=from.min,fmax=from.max;
  chPrev={key,v:flat,min:tmin,max:tmax,M};
  const final=()=>drawChart(el,M,M.ser,tmin,tmax,1,fresh);
  if(go&&changed){
    const t0=performance.now(),D=same?600:800;
    const tick=now=>{const t=Math.min(1,(now-t0)/D),e=1-Math.pow(1-t,3);
      if(t>=1){final();return;}
      drawChart(el,M,unflat(fv.map((a,i)=>a+(flat[i]-a)*e)),fmin+(tmin-fmin)*e,fmax+(tmax-fmax)*e,same?1:e,{});
      chRaf=requestAnimationFrame(tick);};
    drawChart(el,M,unflat(fv),fmin,fmax,same?1:0,{});chRaf=requestAnimationFrame(tick);
  }else final();
  if(moved)setTimeout(()=>{if($("#chart")===el)redrawChart();},480);
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
  else{const tabs=TABS.includes(tab)?TABS:[...TABS,tab];rb.innerHTML=tabs.map(t=>`<span class="tab${t===tab?" cur":""}">${t}</span>`).join("");rb.scrollLeft=TABS.includes(tab)?0:rb.scrollWidth;}
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
  chAnim=true;persist(fin);chAnim=false;placeAll();spillBoxes(fin.spill);
  const bar=barOf(s,fin);barSet(bar);refBoxes(bar,fin);ribbon(s,false);
  if(s.sel){setBox("sel",selR(s.sel),"selb");hdr(selR(s.sel));}
  if(fin.chart&&!prev.chart)chartVisible(fin.chart);
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
