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
const REF=/(?<![A-Za-z0-9_.$!])\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?#?(?![A-Za-z0-9_(])/g;
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
  b.innerHTML=d?'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3.2"/><path d="M8 0h0a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0V.8A.8.8 0 0 1 8 0zm0 13h0a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0v-1.4A.8.8 0 0 1 8 13zM0 8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 0 1.6H.8A.8.8 0 0 1 0 8zm13 0a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 0 1.6h-1.4A.8.8 0 0 1 13 8zM2.3 2.3a.8.8 0 0 1 1.2 0l1 1a.8.8 0 0 1-1.2 1.2l-1-1a.8.8 0 0 1 0-1.2zm9.2 9.2a.8.8 0 0 1 1.2 0l1 1a.8.8 0 0 1-1.2 1.2l-1-1a.8.8 0 0 1 0-1.2zm2.2-9.2a.8.8 0 0 1 0 1.2l-1 1a.8.8 0 0 1-1.2-1.2l1-1a.8.8 0 0 1 1.2 0zm-9.2 9.2a.8.8 0 0 1 0 1.2l-1 1a.8.8 0 0 1-1.2-1.2l1-1a.8.8 0 0 1 1.2 0z"/></svg><span class="tl">Mode clair</span>':'<svg viewBox="0 0 16 16"><path d="M6.2 1.2a7 7 0 1 0 8.6 8.6 5.6 5.6 0 0 1-8.6-8.6z"/></svg><span class="tl">Mode sombre</span>';
  b.setAttribute("aria-label",d?"Passer en mode clair":"Passer en mode sombre");}
try{const t=localStorage.getItem("cpc-theme");if(t==="dark"||t==="light")root.dataset.theme=t;}catch(e){}
$("#theme").onclick=()=>{const t=isDark()?"light":"dark";root.dataset.theme=t;try{localStorage.setItem("cpc-theme",t);}catch(e){}themeBtn();};
mqDark.addEventListener&&mqDark.addEventListener("change",themeBtn);
new MutationObserver(themeBtn).observe(root,{attributes:true,attributeFilter:["data-theme"]});
themeBtn();

/* ---------- partager : menu du téléphone, ou lien copié sur ordinateur ---------- */
function shareToast(t){let e=document.getElementById("stoast");if(!e){e=document.createElement("div");e.id="stoast";e.className="stoast";e.setAttribute("role","status");document.body.appendChild(e);}
  e.textContent=t;e.classList.remove("in");void e.offsetWidth;e.classList.add("in");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("in"),2600);}
async function sharePage(ev){const btn=ev&&ev.currentTarget;
  const c=document.querySelector('link[rel="canonical"]'),url=c?c.href:location.href,title=document.title.replace(/ \| [^|]+$/,"");
  try{if(window.goatcounter&&goatcounter.count)goatcounter.count({path:"partage"+new URL(url).pathname,title:"Partage : "+title,event:true});}catch(e){}
  if(navigator.share&&matchMedia("(pointer: coarse)").matches){try{await navigator.share({title,url});}catch(e){}return;}
  const done=()=>{if(!btn)return;const l=btn.querySelector(".tl")||btn;if(!btn._t0)btn._t0=l.textContent;l.textContent="Lien copié ✓";btn.classList.add("copied");clearTimeout(btn._tt);btn._tt=setTimeout(()=>{l.textContent=btn._t0;btn.classList.remove("copied");},2200);};
  try{await navigator.clipboard.writeText(url);done();shareToast("Lien copié : collez-le où vous voulez");}
  catch(e){const t=document.createElement("textarea");t.value=url;document.body.appendChild(t);t.select();let ok=false;try{ok=document.execCommand("copy");}catch(_){}t.remove();if(ok)done();shareToast(ok?"Lien copié : collez-le où vous voulez":url);}
}
document.querySelectorAll("[data-share]").forEach(b=>b.addEventListener("click",sharePage));

/* ---------- avis sur la leçon : compté dans GoatCounter, sans cookie ---------- */
(function(){const a=document.getElementById("avis");if(!a)return;
  const c=document.querySelector('link[rel="canonical"]'),path=c?new URL(c.href).pathname:location.pathname;
  const msg={oui:"Merci ! Partagez-la avec vos camarades.",non:"Merci, elle sera améliorée."};
  let st={};try{st=JSON.parse(localStorage.getItem("cpc-avis")||"{}");}catch(e){}
  const done=v=>{a.innerHTML=`<span class="aq">${msg[v]}</span>`;a.classList.add("fait");};
  if(st[path])done(st[path]);
  a.querySelectorAll("[data-avis]").forEach(b=>b.addEventListener("click",()=>{const v=b.dataset.avis;
    try{if(window.goatcounter&&goatcounter.count)goatcounter.count({path:`avis-${v}${path}`,title:`Avis ${v} : ${document.title.replace(/ \| [^|]+$/,"")}`,event:true});}catch(e){}
    try{st[path]=v;localStorage.setItem("cpc-avis",JSON.stringify(st));}catch(e){}
    done(v);}));
})();
