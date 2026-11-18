/* Exercices interactifs : l'étudiant tape une formule, le site la calcule et la corrige.
   Moteur de formules en français (séparateur ;, virgule décimale), limité aux fonctions des exercices. */
(function(){
const X=JSON.parse(document.getElementById("ex-data").textContent);
const ERR=e=>({err:e}),isErr=v=>v&&typeof v==="object"&&"err" in v;
const colNum=s=>s.split("").reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0),colName=n=>{let s="";while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};

/* ---------- valeurs de la grille ---------- */
function cellRaw(r,c){const row=X.grille[r-1];return row?row[c-1]:undefined;}
function parseCell(t){
  if(t===undefined||t===null||t==="")return null;
  const s=String(t).replace(/[\s  ]/g,"");
  const m=s.match(/^(-?\d+(?:,\d+)?)(€|%)?$/);
  if(m){const n=parseFloat(m[1].replace(",","."));return m[2]==="%"?n/100:n;}
  return String(t);
}
function cellVal(r,c,over){const k=colName(c)+r;if(over&&k in over)return over[k];return parseCell(cellRaw(r,c));}

/* ---------- découpage en jetons ---------- */
function tokens(src){
  const T=[];let i=0;
  while(i<src.length){const ch=src[i];
    if(/\s/.test(ch)){i++;continue;}
    let m;const rest=src.slice(i);
    if(m=rest.match(/^"((?:[^"]|"")*)"/)){T.push({t:"str",v:m[1].replace(/""/g,'"')});i+=m[0].length;continue;}
    if(m=rest.match(/^(\$?)([A-Za-z]{1,2})(\$?)(\d+)(?::(\$?)([A-Za-z]{1,2})(\$?)(\d+))?(?![\w.(])/)){
      const a={ac:!!m[1],c:colNum(m[2].toUpperCase()),ar:!!m[3],r:+m[4]};
      const b=m[6]?{ac:!!m[5],c:colNum(m[6].toUpperCase()),ar:!!m[7],r:+m[8]}:null;
      T.push({t:"ref",a,b,txt:m[0]});i+=m[0].length;continue;}
    if(m=rest.match(/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.]*(?=\s*\()/)){T.push({t:"fn",v:m[0].toUpperCase()});i+=m[0].length;continue;}
    if(m=rest.match(/^(VRAI|FAUX)(?![\w.(])/i)){T.push({t:"bool",v:m[0].toUpperCase()==="VRAI"});i+=m[0].length;continue;}
    if(m=rest.match(/^\d+(?:,\d+)?/)){T.push({t:"num",v:parseFloat(m[0].replace(",","."))});i+=m[0].length;continue;}
    if(m=rest.match(/^(<>|<=|>=|[-+*/^&=<>%();])/)){T.push({t:"op",v:m[0]});i+=m[0].length;continue;}
    if(ch===","){throw{code:"virgule"};}
    if(/[A-Za-zÀ-ÿ]/.test(ch)){const w=rest.match(/^[A-Za-zÀ-ÿ0-9.]+/)[0];throw{code:"nom",v:w};}
    throw{code:"syntaxe"};
  }
  return T;
}

/* ---------- analyse (priorités d'Excel) ---------- */
function parse(src){
  const T=tokens(src);let p=0;
  const peek=()=>T[p],eat=v=>{const t=T[p];if(!t||t.v!==v)throw{code:v===")"?"parenthese":"syntaxe"};p++;return t;};
  const isOp=(...v)=>T[p]&&T[p].t==="op"&&v.includes(T[p].v);
  function cmp(){let a=cat();while(isOp("=","<>","<",">","<=",">=")){const o=T[p++].v;a={k:"bin",o,a,b:cat()};}return a;}
  function cat(){let a=add();while(isOp("&")){p++;a={k:"bin",o:"&",a,b:add()};}return a;}
  function add(){let a=mul();while(isOp("+","-")){const o=T[p++].v;a={k:"bin",o,a,b:mul()};}return a;}
  function mul(){let a=pow();while(isOp("*","/")){const o=T[p++].v;a={k:"bin",o,a,b:pow()};}return a;}
  function pow(){let a=un();while(isOp("^")){p++;a={k:"bin",o:"^",a,b:un()};}return a;}
  function un(){if(isOp("-")){p++;return{k:"neg",a:un()};}if(isOp("+")){p++;return un();}return pct();}
  function pct(){let a=prim();while(isOp("%")){p++;a={k:"pct",a};}return a;}
  function prim(){const t=peek();if(!t)throw{code:"incomplet"};
    if(t.t==="num"){p++;return{k:"num",v:t.v};}
    if(t.t==="str"){p++;return{k:"str",v:t.v};}
    if(t.t==="bool"){p++;return{k:"bool",v:t.v};}
    if(t.t==="ref"){p++;return{k:"ref",a:t.a,b:t.b};}
    if(t.t==="fn"){p++;eat("(");const args=[];
      if(!isOp(")")){do{if(isOp(";",")")){args.push({k:"vide"});}else args.push(cmp());}while(isOp(";")&&++p);}
      eat(")");return{k:"fn",n:t.v,args};}
    if(isOp("(")){p++;const e=cmp();eat(")");return e;}
    throw{code:"syntaxe"};}
  const e=cmp();if(p<T.length)throw{code:T[p].v===")"?"parenthese":"syntaxe"};
  return{e,T};
}

/* ---------- calcul ---------- */
const FN=["SOMME","MOYENNE","MIN","MAX","NB","NBVAL","ABS","ARRONDI","SI","ET","OU","NB.SI","SOMME.SI","MOYENNE.SI","RECHERCHEV"];
function evaluate(src,dr,dc,over){
  const {e}=parse(src);
  const pos=(x)=>({r:x.ar?x.r:x.r+dr,c:x.ac?x.c:x.c+dc});
  const range=(n)=>{const a=pos(n.a),b=n.b?pos(n.b):a;if(a.r<1||a.c<1||b.r<1||b.c<1)return ERR("#REF!");
    const rows=[];for(let r=Math.min(a.r,b.r);r<=Math.max(a.r,b.r);r++){const row=[];for(let c=Math.min(a.c,b.c);c<=Math.max(a.c,b.c);c++)row.push(cellVal(r,c,over));rows.push(row);}return{range:rows};};
  const scal=v=>{if(v&&v.range)return v.range.length===1&&v.range[0].length===1?v.range[0][0]:ERR("#VALEUR!");return v;};
  const num=v=>{v=scal(v);if(isErr(v))return v;if(v===null)return 0;if(typeof v==="boolean")return v?1:0;if(typeof v==="number")return v;
    const n=parseCell(v);return typeof n==="number"?n:ERR("#VALEUR!");};
  const flat=v=>v&&v.range?v.range.flat():[v];
  const crit=c=>{c=scal(c);if(typeof c==="number")return x=>typeof x==="number"&&Math.abs(x-c)<1e-9;
    let s=String(c??""),op="=";const m=s.match(/^(<>|<=|>=|=|<|>)(.*)$/);if(m){op=m[1];s=m[2];}
    const n=parseCell(s);
    return x=>{if(typeof n==="number"){if(typeof x!=="number")return op==="<>";return op==="="?Math.abs(x-n)<1e-9:op==="<>"?Math.abs(x-n)>=1e-9:op==="<"?x<n:op===">"?x>n:op==="<="?x<=n:x>=n;}
      const xs=String(x??"").toLowerCase(),ss=s.toLowerCase();return op==="<>"?xs!==ss:op==="="?xs===ss:false;};};
  function ev(n){
    switch(n.k){
      case"num":case"str":case"bool":return n.v;
      case"vide":return null;
      case"ref":return range(n);
      case"neg":{const a=num(ev(n.a));return isErr(a)?a:-a;}
      case"pct":{const a=num(ev(n.a));return isErr(a)?a:a/100;}
      case"bin":{let a=scal(ev(n.a)),b=scal(ev(n.b));if(isErr(a))return a;if(isErr(b))return b;
        if(n.o==="&")return String(a??"")+String(b??"");
        if(["=","<>","<",">","<=",">="].includes(n.o)){
          const na=a===null?(typeof b==="string"?"":0):a,nb=b===null?(typeof a==="string"?"":0):b;a=na;b=nb;
          let r;if(typeof a==="string"&&typeof b==="string"){a=a.toLowerCase();b=b.toLowerCase();}
          if(typeof a!==typeof b){const rank=v=>typeof v==="number"?0:typeof v==="string"?1:2;r=rank(a)-rank(b);}else r=a<b?-1:a>b?1:0;
          return n.o==="="?r===0:n.o==="<>"?r!==0:n.o==="<"?r<0:n.o===">"?r>0:n.o==="<="?r<=0:r>=0;}
        a=num(a);b=num(b);if(isErr(a))return a;if(isErr(b))return b;
        if(n.o==="+")return a+b;if(n.o==="-")return a-b;if(n.o==="*")return a*b;if(n.o==="^")return Math.pow(a,b);
        return b===0?ERR("#DIV/0!"):a/b;}
      case"fn":return call(n.n,n.args);
    }
  }
  function call(name,args){
    if(!FN.includes(name))return ERR("#NOM?");
    if(name==="SI"){if(args.length<2)return ERR("#VALEUR!");const c=scal(ev(args[0]));if(isErr(c))return c;const t=typeof c==="number"?c!==0:typeof c==="string"?ERR("#VALEUR!"):!!c;if(isErr(t))return t;
      const r=t?ev(args[1]):(args.length>2?ev(args[2]):false);return r===null?0:scal(r);}
    const A=args.map(ev);for(const v of A)if(isErr(v))return v;
    const nums=()=>{const o=[];for(const v of A){if(v&&v.range)v.range.flat().forEach(x=>{if(typeof x==="number")o.push(x);});else{const n=num(v);if(isErr(n))return n;o.push(n);}}return o;};
    switch(name){
      case"SOMME":{const o=nums();return isErr(o)?o:o.reduce((s,x)=>s+x,0);}
      case"MOYENNE":{const o=nums();if(isErr(o))return o;return o.length?o.reduce((s,x)=>s+x,0)/o.length:ERR("#DIV/0!");}
      case"MIN":{const o=nums();return isErr(o)?o:o.length?Math.min(...o):0;}
      case"MAX":{const o=nums();return isErr(o)?o:o.length?Math.max(...o):0;}
      case"NB":return A.flatMap(flat).filter(x=>typeof x==="number").length;
      case"NBVAL":return A.flatMap(flat).filter(x=>x!==null&&x!=="").length;
      case"ABS":{const a=num(A[0]);return isErr(a)?a:Math.abs(a);}
      case"ARRONDI":{const a=num(A[0]),d=num(A[1]??0);if(isErr(a))return a;if(isErr(d))return d;const f=Math.pow(10,d);return Math.sign(a)*Math.round(Math.abs(a)*f+1e-9)/f;}
      case"ET":return A.flatMap(flat).every(x=>typeof x==="number"?x!==0:!!x);
      case"OU":return A.flatMap(flat).some(x=>typeof x==="number"?x!==0:!!x);
      case"NB.SI":{if(!A[0]||!A[0].range)return ERR("#VALEUR!");const f=crit(A[1]);return A[0].range.flat().filter(f).length;}
      case"SOMME.SI":case"MOYENNE.SI":{if(!A[0]||!A[0].range)return ERR("#VALEUR!");const f=crit(A[1]),R=A[0].range.flat(),S=(A[2]&&A[2].range?A[2].range:A[0].range).flat();
        const v=R.map((x,i)=>f(x)?S[i]:null).filter(x=>typeof x==="number");
        if(name==="SOMME.SI")return v.reduce((s,x)=>s+x,0);return v.length?v.reduce((s,x)=>s+x,0)/v.length:ERR("#DIV/0!");}
      case"RECHERCHEV":{const v=scal(A[0]),t=A[1],col=num(A[2]);if(!t||!t.range)return ERR("#VALEUR!");if(isErr(col))return col;
        if(col<1||col>t.range[0].length)return ERR("#REF!");
        const exact=A.length>3&&A[3]!==null?!(typeof A[3]==="number"?A[3]!==0:!!A[3]):false;
        const same=x=>typeof v==="number"?typeof x==="number"&&Math.abs(x-v)<1e-9:String(x??"").toLowerCase()===String(v??"").toLowerCase();
        let row=t.range.find(r=>same(r[0]));
        if(!row&&!exact){let best=null;for(const r of t.range){if(typeof v==="number"?(typeof r[0]==="number"&&r[0]<=v):String(r[0]).toLowerCase()<=String(v).toLowerCase())best=r;}row=best;}
        return row?row[col-1]:ERR("#N/A");}
    }
  }
  const r=ev(e);return scal(r);
}
function hasRef(src){try{return parse(src).T.some(t=>t.t==="ref");}catch(e){return false;}}

/* ---------- affichage ---------- */
const fmtNum=(n,d)=>{const s=Math.abs(n).toFixed(d).split(".");s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g," ");return(n<0?"-":"")+s.join(",");};
function show(v,f){
  if(isErr(v))return v.err;if(v===null)return"0";if(typeof v==="boolean")return v?"VRAI":"FAUX";if(typeof v==="string")return v;
  if(f==="€")return fmtNum(v,2)+" €";if(f==="%")return fmtNum(v*100,0)+" %";if(f==="0,00")return fmtNum(v,2);
  return fmtNum(v,Math.abs(v-Math.round(v))<1e-9?0:2).replace(/,?0+$/,m=>m.startsWith(",")?"":m);
}
const same=(a,b)=>typeof a==="number"&&typeof b==="number"?Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)):a===b;

/* ---------- correction ---------- */
const MSG={virgule:"En français, les arguments se séparent par un point-virgule ; (la virgule sert aux décimales).",
  parenthese:"Une parenthèse manque ou est en trop : chaque ( doit avoir sa ).",incomplet:"La formule est incomplète : il manque quelque chose à la fin.",
  syntaxe:"Excel ne comprendrait pas cette formule : vérifiez les signes et les ;."};
const ERRMSG={"#DIV/0!":"Votre formule renvoie #DIV/0! : elle divise par une cellule vide ou nulle.","#N/A":"Votre formule renvoie #N/A : la valeur cherchée est introuvable.",
  "#VALEUR!":"Votre formule renvoie #VALEUR! : elle calcule avec du texte ou une plage au mauvais endroit.","#REF!":"Votre formule renvoie #REF! : elle vise une cellule ou une colonne qui n'existe pas.","#NOM?":"Votre formule renvoie #NOM? : un nom de fonction est mal écrit."};
const target=k=>{const m=k.match(/^([A-Z]+)(\d+)$/);return{c:colNum(m[1]),r:+m[2]};};
const cellsAll=[X.cible,...(X.recopie||[])];
function expected(){const t0=target(X.cible);return cellsAll.map(k=>{const t=target(k);return evaluate(X.solution.slice(1),t.r-t0.r,t.c-t0.c);});}
function check(input){
  let s=input.trim();if(!s)return{ko:"Tapez votre formule dans la barre, puis validez."};
  const exp=expected();
  if(s[0]!=="="){const n=parseCell(s);
    if(n!==null&&same(n,exp[0]))return{ko:"Le résultat est juste, mais tapé à la main : une formule commence par = et utilise les cellules."};
    return{ko:"Une formule commence toujours par le signe =."};}
  s=s.slice(1);
  let got;
  try{const fns=parse(s).T.filter(t=>t.t==="fn").map(t=>t.v);const bad=fns.find(f=>!FN.includes(f));
    if(bad)return{ko:`Fonction inconnue : ${bad}. Vérifiez l'orthographe, par exemple ${X.fonction||"SOMME"}.`};}
  catch(e){if(e.code==="nom")return{ko:`« ${e.v} » n'est ni une cellule ni une fonction : vérifiez l'orthographe.`};return{ko:MSG[e.code]||MSG.syntaxe};}
  if(!hasRef(s))return{ko:"Utilisez les cellules plutôt que des nombres tapés : la formule se mettra à jour toute seule."};
  const t0=target(X.cible),res=cellsAll.map(k=>{const t=target(k);try{return evaluate(s,t.r-t0.r,t.c-t0.c);}catch(e){return ERR("#NOM?");}});
  if(!same(res[0],exp[0])){
    if(isErr(res[0]))return{ko:ERRMSG[res[0].err]||"Votre formule renvoie une erreur.",res};
    if(typeof res[0]==="number"&&typeof exp[0]==="number"&&Math.abs(res[0]-exp[0])<0.01)return{ko:"Presque : le calcul est juste, mais pas arrondi au centime.",res};
    if(typeof res[0]==="string"&&typeof exp[0]==="string"&&res[0].toLowerCase()===exp[0].toLowerCase())return{ko:`Presque : écrivez le texte exactement comme demandé, « ${exp[0]} ».`,res};
    return{ko:`Votre formule donne ${show(res[0],X.format)}, ce n'est pas le résultat attendu.`,res};}
  for(let i=1;i<res.length;i++)if(!same(res[i],exp[i]))return{ko:`Juste en ${X.cible}, mais recopiée en ${cellsAll[i]} la formule donne ${show(res[i],X.format)} au lieu de ${show(exp[i],X.format)}. `+(X.dollar&&!s.includes("$")?"Figez la cellule qui ne doit pas bouger avec des $ (touche F4).":"Vérifiez votre formule."),res,partial:true};
  if(X.exige&&!new RegExp(X.exige).test(s.replace(/\s/g,"").toUpperCase()))return{ko:"Le résultat est juste, mais "+X.exigeMsg,res:res.map(()=>undefined)};
  return{ok:true,res};
}

/* ---------- interface ---------- */
const $=s=>document.querySelector(s),inp=$("#xin"),msg=$("#xmsg");
const cell=k=>document.querySelector(`.xsheet td[data-k="${k}"]`);
let tries=0,done=false;
function setMsg(t,kind){msg.className="xmsg "+(kind||"");msg.innerHTML=t;}
function paint(res,okList){cellsAll.forEach((k,i)=>{const td=cell(k);if(!td)return;td.classList.remove("xok","xko");
  if(res&&res[i]!==undefined){td.textContent=show(res[i],X.format);td.classList.add(okList[i]?"xok":"xko");}});}
function validate(){
  if(done)return;const r=check(inp.value);tries++;
  if(r.ok){done=true;paint(r.res,r.res.map(()=>true));setMsg(`<b>Bravo !</b> ${X.bravo||"La formule est juste."}`,"good");$("#xnext").hidden=false;$("#xsol").hidden=true;
    try{const d=JSON.parse(localStorage.getItem("cpc-ex")||"[]");if(!d.includes(X.id)){d.push(X.id);localStorage.setItem("cpc-ex",JSON.stringify(d));}}catch(e){}
    try{if(window.goatcounter&&goatcounter.count)goatcounter.count({path:"exercice-reussi/"+X.id,title:"Exercice réussi : "+X.titre,event:true});}catch(e){}
    return;}
  if(r.res){const exp=expected();paint(r.res,r.res.map((v,i)=>same(v,exp[i])));}
  setMsg(r.ko,"bad");if(tries>=2)$("#xsol").hidden=false;
}
$("#xok").onclick=validate;
inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();validate();}});
inp.addEventListener("input",()=>{if(!done){msg.className="xmsg";msg.textContent="";}});
$("#xhint").onclick=()=>setMsg("<b>Indice :</b> "+X.indice,"hint");
$("#xsol").onclick=()=>{const d=$("#xcorr");d.open=true;d.scrollIntoView({behavior:"smooth",block:"center"});};
/* touches utiles sur téléphone, et clic sur les cellules pour les insérer */
function insert(t){const a=inp.selectionStart??inp.value.length,b=inp.selectionEnd??a;inp.value=inp.value.slice(0,a)+t+inp.value.slice(b);const p=a+t.length;inp.focus();inp.setSelectionRange(p,p);inp.dispatchEvent(new Event("input"));}
document.querySelectorAll(".xkeys button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.k==="⌫"){const a=inp.selectionStart||0;if(a>0){inp.value=inp.value.slice(0,a-1)+inp.value.slice(a);inp.focus();inp.setSelectionRange(a-1,a-1);}}else insert(b.dataset.k);}));
let start=null,endK=null;
const tdAt=(x,y)=>{const e=document.elementFromPoint(x,y);return e&&e.closest(".xsheet td[data-k]");};
function hl(a,b){document.querySelectorAll(".xsheet td.xpick").forEach(t=>t.classList.remove("xpick"));if(!a)return;const A=target(a),B=target(b||a);
  for(let r=Math.min(A.r,B.r);r<=Math.max(A.r,B.r);r++)for(let c=Math.min(A.c,B.c);c<=Math.max(A.c,B.c);c++){const t=cell(colName(c)+r);if(t)t.classList.add("xpick");}}
const sheet=$(".xsheet");
sheet.addEventListener("pointerdown",e=>{const td=e.target.closest("td[data-k]");if(!td||done)return;e.preventDefault();start=endK=td.dataset.k;hl(start);});
window.addEventListener("pointermove",e=>{if(!start)return;const td=tdAt(e.clientX,e.clientY);if(td&&td.dataset.k!==endK){endK=td.dataset.k;hl(start,endK);}});
window.addEventListener("pointerup",()=>{if(!start)return;const ref=start===endK?start:start+":"+endK;start=null;setTimeout(()=>hl(null),400);if(!inp.value)inp.value="=";insert(ref);});
})();
