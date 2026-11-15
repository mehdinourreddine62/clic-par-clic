/* Commun à toutes les pages : utilitaires et thème */
/* ---------- utilitaires ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const ls=x=>x?x.split(" "):[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const colIdx=s=>s.split("").reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;
const colName=i=>{let s="";i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
const pRef=r=>{const m=r.replace(/\$/g,"").match(/^([A-Z]+)(\d+)$/);return{c:colIdx(m[1]),r:+m[2]-1};};
function pRange(s){s=s.replace(/[\$#]/g,"");const[a,b]=s.split(":");const p=pRef(a),q=b?pRef(b):p;return{c1:Math.min(p.c,q.c),r1:Math.min(p.r,q.r),c2:Math.max(p.c,q.c),r2:Math.max(p.r,q.r)};}
const REF=/(?<![A-Za-z0-9_.$])\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?#?(?![A-Za-z0-9_(])/g;
function colorize(f){
  const refs=[],idx={};let html="";
  for(const p of f.split(/("[^"]*"?)/)){
    if(!p)continue;
    if(p[0]==='"'){html+=`<span class="tk-str">${esc(p)}</span>`;continue;}
    let last=0;
    p.replace(REF,(m,off)=>{html+=esc(p.slice(last,off));const k=m.replace(/\$/g,"");if(!(k in idx)){idx[k]=refs.length;refs.push(k);}html+=`<span class="tk-ref r${idx[k]%6}">${esc(m)}</span>`;last=off+m.length;return m;});
    html+=esc(p.slice(last));
  }
  return{html,refs};
}
function kind(v){
  if(v.startsWith("'"))return["",v.slice(1)];
  if(v[0]==="#")return["err",v];
  if(/^-?[\d  ]+(,\d+)?( ?[€%])?$/.test(v)||/^\d{2}\/\d{2}\/\d{4}( \d{2}:\d{2})?$/.test(v)||/^\d{1,2}:\d{2}$/.test(v))return["num",v];
  return["",v];
}
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const bars=n=>`<span class="lvl" title="${LV[n]}" aria-label="${LV[n]}">${[1,2,3].map(k=>`<i class="${k<=n?"on":""}"></i>`).join("")}</span>`;
let seen=[];try{seen=JSON.parse(localStorage.getItem("cpc-seen")||"[]");}catch(e){}
function markSeen(id){if(seen.includes(id))return;seen.push(id);try{localStorage.setItem("cpc-seen",JSON.stringify(seen));}catch(e){}}

/* ---------- thème ---------- */
const root=document.documentElement,mqDark=matchMedia("(prefers-color-scheme: dark)");
const isDark=()=>root.dataset.theme?root.dataset.theme==="dark":mqDark.matches;
function themeBtn(){const d=isDark(),b=$("#theme");
  b.innerHTML=d?'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3.2"/><path d="M8 0h0a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0V.8A.8.8 0 0 1 8 0zm0 13h0a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0v-1.4A.8.8 0 0 1 8 13zM0 8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 0 1.6H.8A.8.8 0 0 1 0 8zm13 0a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 0 1.6h-1.4A.8.8 0 0 1 13 8zM2.3 2.3a.8.8 0 0 1 1.2 0l1 1a.8.8 0 0 1-1.2 1.2l-1-1a.8.8 0 0 1 0-1.2zm9.2 9.2a.8.8 0 0 1 1.2 0l1 1a.8.8 0 0 1-1.2 1.2l-1-1a.8.8 0 0 1 0-1.2zm2.2-9.2a.8.8 0 0 1 0 1.2l-1 1a.8.8 0 0 1-1.2-1.2l1-1a.8.8 0 0 1 1.2 0zm-9.2 9.2a.8.8 0 0 1 0 1.2l-1 1a.8.8 0 0 1-1.2-1.2l1-1a.8.8 0 0 1 1.2 0z"/></svg>Mode clair':'<svg viewBox="0 0 16 16"><path d="M6.2 1.2a7 7 0 1 0 8.6 8.6 5.6 5.6 0 0 1-8.6-8.6z"/></svg>Mode sombre';
  b.setAttribute("aria-label",d?"Passer en mode clair":"Passer en mode sombre");}
try{const t=localStorage.getItem("cpc-theme");if(t==="dark"||t==="light")root.dataset.theme=t;}catch(e){}
$("#theme").onclick=()=>{const t=isDark()?"light":"dark";root.dataset.theme=t;try{localStorage.setItem("cpc-theme",t);}catch(e){}themeBtn();};
mqDark.addEventListener&&mqDark.addEventListener("change",themeBtn);
new MutationObserver(themeBtn).observe(root,{attributes:true,attributeFilter:["data-theme"]});
themeBtn();
