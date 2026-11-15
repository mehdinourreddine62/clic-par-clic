/* Accueil : recherche, filtres, leçons déjà vues, anciens liens */
(function(){
  const cards=[...document.querySelectorAll(".card")];
  /* anciens liens du type #recherchex : redirection vers la page de la leçon */
  const h=decodeURIComponent(location.hash.slice(1));
  const old=h&&cards.find(c=>c.dataset.id===h);
  if(old){location.replace(old.getAttribute("href"));return;}
  let catF="",lvlF=0,query="";
  function apply(){
    const q=norm(query.trim());let total=0;
    cards.forEach(c=>{c.hidden=!((!catF||c.dataset.c===catF)&&(!lvlF||+c.dataset.l===lvlF)&&(!q||c.dataset.s.includes(q)));});
    document.querySelectorAll(".sec").forEach(s=>{
      const n=s.querySelectorAll(".card:not([hidden])").length;total+=n;s.hidden=!n;
      s.querySelector(".st small").textContent=n+" "+(s.dataset.unit||"leçon")+(n>1?"s":"");
    });
    $("#none").hidden=total>0;
  }
  function group(sel,set){
    const el=$(sel);el.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{set(b.dataset.v);el.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===b));apply();});
  }
  group("#cats",v=>catF=v);group("#levels",v=>lvlF=+v);
  $("#q").addEventListener("input",e=>{query=e.target.value;apply();});
  cards.forEach(c=>{if(seen.includes(c.dataset.id)){const s=c.querySelector(".cf span:last-child");s.className="seen";s.textContent="✓ Vu";}});
})();
