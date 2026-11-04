/* Avatar do gerente da filial 552: mantém a lógica operacional existente. */
(function(){
"use strict";
function update(){
 const root=document.getElementById("maPartialMascot");
 if(!root||typeof state==="undefined")return;
 const is552=String(state.storeCode||"").replace(/\D/g,"").padStart(3,"0")==="552";
 const portrait=root.querySelector(".ma-mascot-portrait");
 if(!portrait)return;
 let photo=portrait.querySelector(".ma-552-portrait");
 if(!photo){photo=document.createElement("img");photo.className="ma-552-portrait";photo.alt="Gerente da filial 552";photo.draggable=false;photo.src="./assets/avatar-gerente-552.svg?v=1";photo.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;z-index:2;pointer-events:none";portrait.appendChild(photo);}
 photo.hidden=!is552;
 photo.style.display=is552?"block":"none";
}
function start(){update();setInterval(update,1500);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
