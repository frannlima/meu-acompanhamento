(function(){
  "use strict";

  const sectionTitles={
    inicio:"Início",
    grupos:"Mundos",
    comerciais:"Comercial",
    descontos:"Descontos",
    estore:"eStore",
    regional:"Regional",
    admin:"Administração",
    mais:"Mais"
  };

  function activeSection(){
    const active=document.querySelector(".section.active");
    return active?.id?.replace("section-","")||"inicio";
  }

  function syncContext(){
    const key=activeSection();
    document.body.dataset.activeSection=key;

    const mobileName=document.getElementById("mobileGreetingName");
    const mobileMeta=document.getElementById("mobileGreetingMeta");
    if(mobileName){
      const current=sectionTitles[key]||"Meu Acompanhamento";
      mobileName.textContent=current;
    }
    if(mobileMeta){
      const store=(window.state&&state.storeCode)?String(state.storeCode):"";
      mobileMeta.textContent=store?("Loja "+store+" • Meu Acompanhamento"):"Meu Acompanhamento";
    }
  }

  function syncCondensed(){
    const y=window.scrollY||document.documentElement.scrollTop||0;
    document.documentElement.classList.toggle("header-condensed",y>110);
  }

  let raf=0;
  function schedule(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      syncContext();
      syncCondensed();
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{
    syncContext();
    syncCondensed();

    const app=document.getElementById("appShell")||document.body;
    const observer=new MutationObserver((mutations)=>{
      if(mutations.some(m=>m.type==="attributes" && m.attributeName==="class")) schedule();
    });
    observer.observe(app,{subtree:true,attributes:true,attributeFilter:["class"]});
  });

  window.addEventListener("scroll",syncCondensed,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(schedule,120),{passive:true});
})();