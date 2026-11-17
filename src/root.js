/* Accueil général : choix du logiciel, recherche dans toutes les leçons, progression, anciens liens */
(function(){
  const cards=[...document.querySelectorAll("#results .card")],softs=[...document.querySelectorAll("a.soft")];
  const themes=JSON.parse($("#themes").textContent);
  /* anciens liens de l'accueil : #theme-…, #routes, #id-de-leçon */
  const h=decodeURIComponent(location.hash.slice(1));
  if(h){
    if(h.startsWith("theme-")&&themes[h.slice(6)]){location.replace(themes[h.slice(6)]+"/#"+h);return;}
    if(h==="routes"&&softs[0]){location.replace(softs[0].getAttribute("href")+"#routes");return;}
    const c=cards.find(x=>x.dataset.id===h);if(c){location.replace(c.getAttribute("href"));return;}
  }
  /* progression par logiciel */
  softs.forEach(s=>{const ids=s.dataset.ids.split(" "),n=ids.filter(i=>seen.includes(i)).length;
    if(n){s.classList.add("started");s.querySelector(".tp i").style.width=n/ids.length*100+"%";
      s.querySelector("small").textContent=(n===ids.length?"✓ Tout vu":n+" sur "+ids.length+" leçons vues");}});
  /* continuer : leçon suivante non vue, dans le logiciel de la dernière leçon vue */
  const last=[...seen].reverse().map(id=>cards.find(c=>c.dataset.id===id)).find(Boolean);
  if(last){const sw=last.dataset.sw,next=cards.find(c=>c.dataset.sw===sw&&!seen.includes(c.dataset.id));
    if(next){const r=$("#resume");r.href=next.getAttribute("href");r.querySelector("b").textContent=next.querySelector(".cn").textContent;r.hidden=false;}}
  /* recherche */
  $("#q").addEventListener("input",e=>{
    const q=norm(e.target.value.trim());let n=0;
    cards.forEach(c=>{c.hidden=!q||!c.dataset.s.includes(q);if(!c.hidden)n++;});
    $("#results").hidden=!q;$("#softs").hidden=!!q;$("#none").hidden=!q||n>0;
    $("#resume").classList.toggle("off",!!q);
  });
})();
