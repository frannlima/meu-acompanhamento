/* Avatar da filial 552: acesso permanente na Visão Geral após selecionar a loja. */
(function(){
"use strict";
const SRC="./assets/avatar-gerente-552.svg?v=1";
function update(){
 const home=document.getElementById("section-inicio");
 if(!home||typeof state==="undefined")return;
 const is552=!!state.logged&&String(state.storeCode||"").replace(/\D/g,"").padStart(3,"0")==="552";
 let card=document.getElementById("maAvatar552Preview");
 if(!card){
  card=document.createElement("div");card.id="maAvatar552Preview";
  card.style.cssText="display:none;align-items:center;gap:14px;padding:14px 18px;margin:12px 0 18px;border:1px solid #d5ded9;border-radius:14px;background:#fff;flex-wrap:wrap";
  card.innerHTML='<img src="'+SRC+'" alt="Retrato do gerente da filial 552" style="width:70px;height:80px;object-fit:cover;border-radius:12px"><div style="flex:1;min-width:180px"><strong style="display:block">Avatar do gerente · Filial 552</strong><small>Toque para visualizar a imagem cadastrada nesta filial.</small></div><button id="maAvatar552Open" type="button" class="btn">Visualizar avatar</button>';
  const head=home.querySelector(".section-head");if(head)head.insertAdjacentElement("afterend",card);else home.prepend(card);
  card.querySelector("#maAvatar552Open").addEventListener("click",()=>{
   let dialog=document.getElementById("maAvatar552Dialog");
   if(!dialog){
    dialog=document.createElement("dialog");dialog.id="maAvatar552Dialog";
    dialog.style.cssText="border:0;border-radius:18px;padding:20px;max-width:min(92vw,430px);box-shadow:0 20px 80px #0005";
    dialog.innerHTML='<h3 style="margin:0 0 12px">Gerente · Filial 552</h3><img src="'+SRC+'" alt="Avatar do gerente da filial 552" style="width:100%;max-height:65vh;object-fit:contain;border-radius:12px"><div style="text-align:right;margin-top:14px"><button type="button" class="btn">Fechar</button></div>';
    dialog.querySelector("button").addEventListener("click",()=>dialog.close());
    document.body.appendChild(dialog);
   }
   dialog.showModal();
  });
 }
 card.style.display=is552?"flex":"none";
 const root=document.getElementById("maPartialMascot");
 const portrait=root?.querySelector(".ma-mascot-portrait");
 if(!portrait)return;
 let photo=portrait.querySelector(".ma-552-portrait");
 if(!photo){
  photo=document.createElement("img");photo.className="ma-552-portrait";photo.alt="Gerente da filial 552";photo.draggable=false;photo.src=SRC;
  photo.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 18%;border-radius:inherit;z-index:2;pointer-events:none;mask-image:linear-gradient(#000 0%,#000 78%,transparent 100%);-webkit-mask-image:linear-gradient(#000 0%,#000 78%,transparent 100%)";
  portrait.appendChild(photo);
 }
 photo.hidden=!is552;photo.style.display=is552?"block":"none";
 if(is552&&state.section==="inicio"&&root.hidden){
  root.hidden=false;
  document.body.classList.add("ma-mascot-active");
  root.dataset.mood="waiting";
  root.className="ma-partial-mascot ma-mascot--waiting";
  const tag=root.querySelector("#maMascotTag"),title=root.querySelector("#maMascotTitle"),info=root.querySelector("#maMascotInfo"),elapsed=root.querySelector("#maMascotElapsed"),metrics=root.querySelector("#maMascotMetrics"),action=root.querySelector("#maMascotInput");
  if(tag)tag.textContent="ACOMPANHAMENTO · 552";
  if(title)title.textContent="Vamos acompanhar o resultado!";
  if(info)info.textContent="Filial 552 • Aguardando parcial ou horário operacional.";
  if(elapsed)elapsed.hidden=true;
  if(metrics)metrics.hidden=true;
  if(action)action.textContent="Registrar parcial →";
 }
 if(!is552&&root.querySelector("#maMascotTag")?.textContent==="ACOMPANHAMENTO · 552"&&typeof window.atualizarEstadoAvatarParcial==="function")window.atualizarEstadoAvatarParcial();
}
function start(){update();setInterval(update,1200);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();