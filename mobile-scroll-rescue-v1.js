/* Meu Acompanhamento — recuperar rolagem ao sair de overlays mobile.
   Mantém o bloqueio intencional enquanto o menu Mais ou a visão ampliada estão abertos. */
(function(){
  "use strict";
  let scheduled=false;
  function checkScrollLocks(){
    scheduled=false;
    const body=document.body;
    if(!body)return;
    const sheet=document.getElementById("mobileMoreSheet");
    const sheetOpen=Boolean(sheet && sheet.isConnected &&
      !sheet.classList.contains("hidden") && sheet.getAttribute("aria-hidden")!=="true");
    if(body.classList.contains("mobile-sheet-open") && !sheetOpen){
      body.classList.remove("mobile-sheet-open");
    }

    const expanded=document.querySelector("#ma3LiveGroup .gl-landscape-panel.gl-landscape-expanded");
    const homeVisible=Boolean(document.getElementById("section-inicio")?.classList.contains("active"));
    if(!expanded || !homeVisible){
      if(expanded){
        expanded.classList.remove("gl-landscape-expanded");
        const button=expanded.querySelector(".gl-landscape-toggle");
        if(button){
          button.setAttribute("aria-expanded","false");
          button.textContent="⛶ Ampliar";
        }
      }
      body.classList.remove("gl-landscape-open");
    }
  }
  function scheduleCheck(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(checkScrollLocks);
  }
  function init(){
    scheduleCheck();
    document.addEventListener("click",scheduleCheck);
    document.addEventListener("ma:section-change",scheduleCheck);
    document.addEventListener("ma:dashboard-ready",scheduleCheck);
    window.addEventListener("pageshow",scheduleCheck);
    window.addEventListener("focus",scheduleCheck);
    window.addEventListener("resize",scheduleCheck,{passive:true});
    document.addEventListener("visibilitychange",function(){
      if(!document.hidden)scheduleCheck();
    });
    /* Uma re-renderização do painel pode remover o expandido sem remover
       a classe do body. Observar apenas o próprio painel. */
    const panel=document.getElementById("ma3LiveGroup");
    if(panel){
      const observer=new MutationObserver(scheduleCheck);
      observer.observe(panel,{childList:true,subtree:false});
    }
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init();
  }
})();
