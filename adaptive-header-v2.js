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

  let identityCache={name:"",role:"",store:""};

  function activeSection(){
    const active=document.querySelector(".section.active");
    return active?.id?.replace("section-","")||"inicio";
  }

  function captureIdentity(){
    const legacy=document.querySelector("#executionIdentityHero,.execution-identity-hero");
    const legacyName=legacy?.querySelector(".identity-copy h2")?.textContent?.replace(/!+$/,"").trim()||"";
    const legacyRole=legacy?.querySelector(".identity-copy p")?.textContent?.trim()||"";

    const sideName=document.getElementById("identityName")?.textContent?.trim()||"";
    const sideRole=document.getElementById("identityRole")?.textContent?.trim()||"";
    const sideStore=document.getElementById("identityStore")?.textContent?.trim()||"";

    if(legacyName && legacyName!=="—") identityCache.name=legacyName;
    else if(sideName && sideName!=="—") identityCache.name=sideName;

    if(legacyRole && legacyRole!=="—") identityCache.role=legacyRole;
    else if(sideRole && sideRole!=="—") identityCache.role=sideRole;

    if(sideStore && sideStore!=="—") identityCache.store=sideStore;
  }

  function removeLegacyIdentity(){
    document.querySelectorAll("#executionIdentityHero,.execution-identity-hero").forEach(el=>el.remove());
  }

  function getActiveHead(){
    return document.querySelector(".section.active > .section-head, .section.active > .premium-more-hero");
  }

  function isAdmin(){
    try{
      return String(state.role||"").toLowerCase()==="administrador";
    }catch(_){
      return false;
    }
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
    if(!wrap||!head) return;

    const show=isAdmin();
    wrap.classList.toggle("hidden",!show);
    if(!show) return;

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

  function greetingForNow(){
    try{
      const h=Number(new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",hour12:false}).format(new Date()));
      return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
    }catch(_){
      const h=new Date().getHours();
      return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
    }
  }

  function renderCompactHomeIdentity(){
    const home=document.querySelector("#section-inicio > .section-head");
    if(!home) return;

    let chip=document.getElementById("adaptiveHomeIdentity");
    if(!chip){
      chip=document.createElement("div");
      chip.id="adaptiveHomeIdentity";
      chip.className="adaptive-home-identity";
      home.prepend(chip);
    }

    const name=(identityCache.name||document.getElementById("identityName")?.textContent||"").trim();
    const role=(identityCache.role||document.getElementById("identityRole")?.textContent||"").trim();
    const store=(identityCache.store||document.getElementById("identityStore")?.textContent||"").trim();

    const safeName=name && name!=="—" ? name : "Usuário conectado";
    const safeRole=role && role!=="—" ? role : "Perfil em carregamento";
    const storeLabel=store && store!=="—" ? store : "";

    chip.innerHTML=
      '<span class="adaptive-home-avatar"><img src="./assets/ria-logo-approved.svg" alt="RIA"></span>'+
      '<span class="adaptive-home-person">'+
        '<small>'+greetingForNow()+',</small>'+
        '<strong>'+safeName+'</strong>'+
        '<em>'+safeRole+(storeLabel?' • '+storeLabel:'')+'</em>'+
      '</span>';
  }

  function syncMobileTitle(){
    const key=activeSection();
    const mobileName=document.getElementById("mobileGreetingName");
    const mobileMeta=document.getElementById("mobileGreetingMeta");
    if(mobileName) mobileName.textContent=sectionTitles[key]||"Meu Acompanhamento";

    if(mobileMeta){
      const store=(identityCache.store||document.getElementById("identityStore")?.textContent||"").trim();
      mobileMeta.textContent=store && store!=="—" ? store : "Meu Acompanhamento";
    }
  }

  function syncContext(){
    captureIdentity();
    removeLegacyIdentity();

    const key=activeSection();
    document.body.dataset.activeSection=key;

    syncMobileTitle();
    renderCompactHomeIdentity();
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