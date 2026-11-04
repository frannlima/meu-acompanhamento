/* Filial 552: mesmo assistente operacional da 108; somente personagem muda. */
(function(){
"use strict";
const SRC="./assets/avatar-gerente-552.svg?v=7";
let expanded=false;
function update(){
 const root=document.getElementById("maPartialMascot");
 if(!root||typeof state==="undefined")return;
 const is552=!!state.logged&&String(state.storeCode||"").replace(/\D/g,"").padStart(3,"0")==="552";
 root.classList.toggle("ma-filial-552",is552);
 root.classList.toggle("ma-552-expanded",is552&&expanded&&!root.classList.contains("ma-mascot-docked"));
 if(!is552)expanded=false;
 const portrait=root.querySelector(".ma-mascot-portrait");
 if(!portrait)return;
 let photo=portrait.querySelector(".ma-552-portrait");
 if(!photo){
  photo=document.createElement("img");
  photo.className="ma-552-portrait";
  photo.alt="Gerente da filial 552";
  photo.draggable=false;
  photo.src=SRC;
  portrait.appendChild(photo);
 }
 photo.hidden=!is552;
 // As mensagens, as métricas e os cinco estados continuam sob controle
 // do motor original de parciais. Nenhum resultado é inventado aqui.
}
function start(){
 document.addEventListener("click",function(e){
  const btn=e.target.closest("#maPartialMascot .ma-mascot-portrait");
  if(!btn||!document.getElementById("maPartialMascot")?.classList.contains("ma-filial-552")||window.innerWidth>900)return;
  e.preventDefault();e.stopImmediatePropagation();
  expanded=!expanded;update();
 },true);
 document.addEventListener("click",function(e){
  if(e.target.closest("#maMascotInput")){expanded=false;}
 },true);
 update();
 const target=document.getElementById("appShell");
 if(target){
  const observer=new MutationObserver(()=>update());
  observer.observe(target,{childList:true,subtree:false});
 }
 setInterval(update,1400);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();