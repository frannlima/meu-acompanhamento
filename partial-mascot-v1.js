/* Assistente visual de parciais — somente tela Início do Meu Acompanhamento. */
(function(){
"use strict";
const STREET=new Set(["084","113","146"]);
let node=null, min=false, pendingKey="", simUntil=0, timer=null;
function el(id){return document.getElementById(id)}
function nowFortaleza(now=new Date()){
 const pieces=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",
  hour12:false,hourCycle:"h23"}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:pieces.year+"-"+pieces.month+"-"+pieces.day,
  minutes:(Number(pieces.hour)%24)*60+Number(pieces.minute),
  weekday:new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"America/Fortaleza"}).format(now)};
}
function status(now=new Date()){
 if(!(typeof state!=="undefined"&&state.logged)||!state.storeCode||state.section!=="inicio")return null;
 const n=nowFortaleza(now);
 const code=String(state.storeCode).padStart(3,"0");
 const street=STREET.has(code);
 const opening=street?480:600,closing=street?1080:1320;
 if(n.date!==localDate()||n.minutes<opening||n.minutes>=closing||(street&&n.weekday==="Sun"))return null;
 const openingStamp=Date.parse(n.date+"T00:00:00-03:00")+opening*60000;
 const original=String(state.day?.captured_at||"");
 const stamp=Date.parse(original);
 const valid=Number.isFinite(stamp)&&stamp>=openingStamp&&stamp<=now.getTime();
 const last=valid?stamp:openingStamp;
 const minutes=Math.floor((now.getTime()-last)/60000);
 return {due:minutes>=60,minutes,code,original:valid?original:"abertura",last:valid?stamp:null};
}
function ensure(){
 if(node)return node;
 const root=el("appShell");if(!root)return null;
 node=document.createElement("aside");
 node.id="maPartialMascot";node.className="ma-partial-mascot";node.hidden=true;
 node.setAttribute("role","region");
 node.setAttribute("aria-label","Lembrete de atualização da parcial");
 node.innerHTML='<button type="button" id="maMascotToggle" class="ma-mascot-portrait" aria-label="Recolher lembrete de parcial" aria-expanded="true">'+
   '<img src="./assets/parcial-mascote-ria.svg" alt="Avatar com bandeira verde e o logo oficial RIA" draggable="false"></button>'+
   '<div class="ma-mascot-message" id="maMascotMessage" role="status" aria-live="polite">'+
     '<span class="ma-mascot-tag">PARCIAL PENDENTE</span>'+
     '<strong>Hora de atualizar<br><em>parcial, time!</em></strong>'+
     '<small id="maMascotInfo"></small>'+
     '<button class="ma-mascot-action" type="button" id="maMascotInput">Atualizar parcial <span aria-hidden="true">→</span></button>'+
   '</div><button id="maMascotMin" type="button" class="ma-mascot-min" title="Recolher lembrete (a bandeira continua visível)" aria-label="Recolher lembrete">−</button>';
 root.appendChild(node);
 el("maMascotToggle").addEventListener("click",()=>{
   min=!min;render();
 });
 el("maMascotMin").addEventListener("click",()=>{min=true;render()});
 el("maMascotInput").addEventListener("click",()=>{
   if(typeof setSection==="function")setSection("inicio");
   if(typeof showPaste==="function")showPaste();
   // O lembrete só some depois que o snapshot foi salvo; abrir o input não encerra o alerta.
 });
 return node;
}
function render(){
 const box=ensure();if(!box)return;
 const data=status();
 const isTest=Date.now()<simUntil&&(typeof state!=="undefined"&&state.logged)&&state.section==="inicio";
 const due=Boolean(data?.due||isTest);
 if(!due){
   box.hidden=true;document.body.classList.remove("ma-mascot-due");pendingKey="";min=false;return;
 }
 const signature=(data?.code||"teste")+"|"+(data?.original||"teste");
 if(signature!==pendingKey){pendingKey=signature;min=false}
 box.hidden=false;
 box.classList.toggle("ma-mascot-collapsed",min);
 document.body.classList.add("ma-mascot-due");
 const age=isTest&&!data?.due? "Prévia sem lançamento de dados":
    data?.last?"Última parcial há "+data.minutes+" min • Loja "+data.code:
    "Sem parcial desde a abertura • Loja "+(data?.code||"—");
 el("maMascotInfo").textContent=age;
 el("maMascotToggle").setAttribute("aria-expanded",String(!min));
 el("maMascotToggle").setAttribute("aria-label",min?"Expandir lembrete de parcial":"Recolher lembrete de parcial");
}
function start(){
 ensure();
 if(timer)return;
 timer=setInterval(render,15000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});
 window.addEventListener("focus",render);
 window.addEventListener("pageshow",render);
 document.addEventListener("click",e=>{if(e.target.closest("[data-section],#confirmPaste,#logoutBtn"))requestAnimationFrame(render)});
 // Atualiza imediatamente após a confirmação e posterior sincronização de loadAll.
 const original=window.loadAll;
 if(typeof original==="function")window.loadAll=async function(...args){
   const result=await original.apply(this,args);render();return result;
 };
 render();
}
window.testarAvatarParcial=()=>{simUntil=Date.now()+12000;min=false;pendingKey="";render();setTimeout(render,12100)};
window.atualizarEstadoAvatarParcial=render;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();