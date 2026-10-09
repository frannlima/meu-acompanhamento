
(function(){
  "use strict";

  function classifyDevice(){
    const root=document.documentElement;
    const ua=navigator.userAgent||"";
    const w=Math.min(window.innerWidth||screen.width||0,window.innerHeight||screen.height||0);
    const maxW=Math.max(window.innerWidth||screen.width||0,window.innerHeight||screen.height||0);
    const touch=(navigator.maxTouchPoints||0)>0;

    const isIOS=/iPad|iPhone|iPod/.test(ua) || (navigator.platform==="MacIntel" && (navigator.maxTouchPoints||0)>1);
    const isAndroid=/Android/i.test(ua);

    let device="desktop";
    if(touch && w<=767) device="phone";
    else if(touch && (w<=1199 || /iPad|Tablet/i.test(ua) || (isAndroid && !/Mobile/i.test(ua)))) device="tablet";
    else if(!touch && (window.innerWidth||0)<900) device="phone";

    root.classList.remove("device-phone","device-tablet","device-desktop","platform-ios","platform-android","platform-other","orientation-portrait","orientation-landscape");
    root.classList.add("device-"+device);
    root.classList.add(isIOS?"platform-ios":isAndroid?"platform-android":"platform-other");
    root.classList.add((window.innerWidth||0)>=(window.innerHeight||0)?"orientation-landscape":"orientation-portrait");

    root.dataset.device=device;
    root.style.setProperty("--app-screen-w",(window.innerWidth||0)+"px");
    root.style.setProperty("--app-screen-h",(window.innerHeight||0)+"px");
    root.style.setProperty("--app-short-side",w+"px");
    root.style.setProperty("--app-long-side",maxW+"px");

    const vv=window.visualViewport;
    root.style.setProperty("--app-vh",((vv?.height||window.innerHeight||0)*.01)+"px");
    root.style.setProperty("--app-vw",((vv?.width||window.innerWidth||0)*.01)+"px");
  }

  let raf=0;
  function schedule(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(classifyDevice);
  }

  classifyDevice();
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(classifyDevice,100),{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize",schedule,{passive:true});
  }
  document.addEventListener("DOMContentLoaded",classifyDevice);
})();
