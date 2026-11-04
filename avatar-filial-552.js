/* Filial 552: não renderizar avatar até existir imagem validada. */
(function(){
"use strict";
function update(){
 const root=document.getElementById("maPartialMascot");
 if(!root||typeof state==="undefined")return;
 const is552=!!state.logged&&String(state.storeCode||"").replace(/\D/g,"").padStart(3,"0")==="552";
 root.classList.toggle("ma-filial-552",is552);
 const previous=root.querySelector(".ma-552-portrait");
 if(previous)previous.remove();
}
function start(){
 update();
 const target=document.getElementById("appShell");
 if(target)new MutationObserver(update).observe(target,{childList:true,subtree:false});
 setInterval(update,1200);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
