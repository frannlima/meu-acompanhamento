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

  function removeLegacyIdentity(){
    document.querySelectorAll("#executionIdentityHero,.execution-identity-hero").forEach(el=>el.remove());
  }

  function getActiveHead(){
    return document.querySelector(".section.active > .section-head, .section.active > .premium-more-hero");
  }

  function ensureAdaptiveStoreContext(){
    const select=document.getElementById("adminStoreSelect");
    if(!select) return null;
    let wrap=document.getElementById("adaptiveStoreContext");
    if(!wrap){
      wrap=document.createElement("div");
      wrap.id="adaptiveStoreContext";
      wrap.className="adaptive-store-context";
      wrap.innerHTML='<span class="adaptive-store-label">FILIAL EM ANÁLISE</span>';
      wrap.appendChild(select);
    }
    return wrap;
  }

  function placeStoreContext(){
    const wrap=ensureAdaptiveStoreContext();
    const head=getActiveHead();
    const adminBar=document.getElementById("adminStoreBar");
    if(!wrap||!head||!adminBar) return;

    const shouldShow=!adminBar.classList.contains("hidden");
    wrap.classList.toggle("hidden",!shouldShow);
    if(!shouldShow) return;

    if(head.classList.contains("premium-more-hero")){
      if(wrap.parentElement!==head) head.appendChild(wrap);
      return;
    }

    let actions=head.querySelector(":scope > .section-actions");
    if(!actions){
      actions=document.createElement("div");
      actions.className="section-actions adaptive-actions";
      head.appendChild(actions);
    }
    if(wrap.parentElement!==actions) actions.prepend(wrap);
  }

  function syncContext(){
    removeLegacyIdentity();

    const key=activeSection();
    document.body.dataset.activeSection=key;

    const mobileName=document.getElementById("mobileGreetingName");
    const mobileMeta=document.getElementById("mobileGreetingMeta");
    if(mobileName) mobileName.textContent=sectionTitles[key]||"Meu Acompanhamento";
    if(mobileMeta){
      const store=(window.state&&state.storeCode)?String(state.storeCode):"";
      mobileMeta.textContent=store?("Loja "+store+" • Meu Acompanhamento"):"Meu Acompanhamento";
    }

    placeStoreContext();
  }

  function syncCondensed(){
    const y=window.scrollY||document.documentElement.scrollTop||0;
    document.documentElement.classList.toggle("header-condensed",y>96);
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
    const observer=new MutationObserver(()=>schedule());
    observer.observe(app,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:["class"]
    });
  });

  window.addEventListener("scroll",syncCondensed,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(schedule,120),{passive:true});
})();