/* Accueil : rubriques en tuiles, leçons au clic, recherche, progression, anciens liens */
(function(){
  const home=$("#home"),cards=[...document.querySelectorAll(".card")],tiles=[...document.querySelectorAll(".tile")];
  /* anciens liens du type #recherchex : redirection vers la page de la leçon */
  const h0=decodeURIComponent(location.hash.slice(1));
  const old=h0&&cards.find(c=>c.dataset.id===h0);
  if(old){location.replace(old.getAttribute("href"));return;}
  let lvlF=0,query="";
  const theme=()=>{const h=decodeURIComponent(location.hash.slice(1));return h.startsWith("theme-")&&tiles.some(t=>t.dataset.c===h.slice(6))?h.slice(6):"";};
  function apply(){
    const q=norm(query.trim()),th=theme(),mode=q?"search":th?"theme":"home";
    home.dataset.mode=mode;
    let total=0;
    cards.forEach(c=>{c.hidden=!((mode!=="theme"||c.dataset.c===th)&&(!lvlF||+c.dataset.l===lvlF)&&(!q||c.dataset.s.includes(q)));});
    document.querySelectorAll(".sec").forEach(s=>{
      const n=s.querySelectorAll(".card:not([hidden])").length;total+=n;
      s.hidden=mode==="theme"?s.id!=="theme-"+th:!n;
      s.querySelector(".st small").textContent=n+" leçon"+(n>1?"s":"");
    });
    $("#none").hidden=mode==="home"||total>0;
  }
  /* progression : leçons déjà vues */
  cards.forEach(c=>{if(seen.includes(c.dataset.id)){const s=c.querySelector(".cf span:last-child");s.className="seen";s.textContent="✓ Vu";}});
  tiles.forEach(t=>{
    const ids=cards.filter(c=>c.dataset.c===t.dataset.c).map(c=>c.dataset.id),n=ids.filter(i=>seen.includes(i)).length;
    if(n){t.querySelector(".tp i").style.width=n/ids.length*100+"%";t.classList.add("started");
      t.querySelector("small").textContent=n===ids.length?"✓ Terminé":n+" sur "+ids.length+" vue"+(n>1?"s":"");}
  });
  const next=cards.find(c=>!seen.includes(c.dataset.id)),rs=$("#resume");
  if(!next)rs.remove();
  else if(seen.length){rs.href=next.getAttribute("href");rs.querySelector("small").textContent="Continuer";rs.querySelector("b").textContent=next.querySelector(".cn").textContent;}
  document.querySelectorAll(".route").forEach(r=>{
    const ids=r.dataset.ids.split(" "),n=ids.filter(i=>seen.includes(i)).length;
    if(n){r.classList.add("started");r.querySelector(".tp i").style.width=n/ids.length*100+"%";r.querySelector(".rn").textContent=n===ids.length?"✓ Terminé":n+" sur "+ids.length+" vue"+(n>1?"s":"");}
  });
  /* filtres */
  const lv=$("#levels");
  lv.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{lvlF=+b.dataset.v;lv.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===b));apply();});
  $("#q").addEventListener("input",e=>{query=e.target.value;apply();});
  $("#backHome").onclick=e=>{e.preventDefault();history.pushState(null,"",location.pathname+location.search);apply();scrollTo(0,0);};
  addEventListener("hashchange",()=>{apply();scrollTo(0,0);});
  addEventListener("popstate",apply);
  apply();
})();
