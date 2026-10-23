/* Avatar operacional RIA v3 — atraso e reação ao desempenho real da última parcial. */
(function(){
"use strict";
const STREET=new Set(["084","113","146"]);
const $m=id=>document.getElementById(id);
let node=null,timer=0,simulate=null,simulateEnds=0;
const observed=new Map();
const KEY="ma_avatar_reacao_v3_";
function fortaleza(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",
  hour12:false,hourCycle:"h23"}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:parts.year+"-"+parts.month+"-"+parts.day,
  minute:(Number(parts.hour)%24)*60+Number(parts.minute),
  weekday:new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"America/Fortaleza"}).format(now)};
}
function clock(iso){
 const v=Date.parse(iso||"");if(!Number.isFinite(v))return null;
 const t=fortaleza(new Date(v));return {date:t.date,minute:t.minute,time:v};
}
function context(now=new Date()){
 if(typeof state==="undefined"||!state.logged||!state.storeCode||!state.day)return null;
 const n=fortaleza(now),code=String(state.storeCode).padStart(3,"0"),street=STREET.has(code);
 const open=street?480:600,close=street?1080:1320;
 if(n.date!==localDate()||n.minute<open||n.minute>=close||(street&&n.weekday==="Sun"))return null;
 const opened=Date.parse(n.date+"T00:00:00-03:00")+open*60000;
 const snap=state.day||{},stamp=Date.parse(snap.captured_at||"");
 const valid=!!snap.has_input&&Number.isFinite(stamp)&&stamp>=opened&&stamp<=now.getTime();
 const last=valid?stamp:opened,minutes=Math.max(0,Math.floor((now.getTime()-last)/60000));
 return {code,date:n.date,now:now.getTime(),minutes,opened,stamp:valid?String(snap.captured_at):"",
  current:valid?stamp:null,hasInput:valid,due:minutes>=60};
}
const formatElapsed=minutes=>Math.floor(minutes/60)+":"+String(minutes%60).padStart(2,"0")+" min";
function frac(rows,t){
 const parts=clock(t);if(!parts)return null;
 return Math.min(1,Math.max(0,rows.reduce((s,r)=>s+r.w*(parts.minute>=r.h*60+60?1:
  parts.minute>=r.h*60?(parts.minute-r.h*60)/60:0),0)));
}
function modelCurve(){
 const raw=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
 const rows=(Array.isArray(raw)?raw:[]).map(r=>({h:Number(r.h),w:Number(r.fin)}))
  .filter(r=>Number.isInteger(r.h)&&r.h>=0&&r.h<24&&Number.isFinite(r.w)&&r.w>0).sort((a,b)=>a.h-b.h);
 const total=rows.reduce((s,r)=>s+r.w,0);
 return total>0?rows.map(r=>({h:r.h,w:r.w/total})):[];
}
function samples(ctx){
 const src=Array.isArray(state.history)?state.history:[];
 const all=src.filter(x=>x&&x.captured_at&&Number.isFinite(Date.parse(x.captured_at))&&
   clock(x.captured_at)?.date===ctx.date&&Number.isFinite(Number(x.sales_financial)))
  .map(x=>({t:Date.parse(x.captured_at),sale:Number(x.sales_financial)}));
 if(ctx.current!==null&&Number.isFinite(Number(state.day?.sales_financial)))
  all.push({t:ctx.current,sale:Number(state.day.sales_financial)});
 all.sort((a,b)=>a.t-b.t);
 return all.filter((x,i)=>i===all.length-1||x.t!==all[i+1].t).filter(x=>x.t<=ctx.now);
}
const percentage=v=>Number.isFinite(v)?new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0}).format(v)+"%":"—";
function evaluate(ctx){
 const target=Number(state.day?.target_financial||0),sale=Number(state.day?.sales_financial);
 const rows=modelCurve(),arr=samples(ctx),last=arr[arr.length-1],prev=arr[arr.length-2],older=arr[arr.length-3];
 if(!(target>0)||!ctx.hasInput||!Number.isFinite(sale)||!rows.length||!last)
  return {kind:"neutral",heading:"Parcial atualizada!",detail:"Dados insuficientes para analisar a curva.",tag:"ANÁLISE EM ANDAMENTO"};
 const f=frac(rows,last.t),projected=(f!==null&&f>=.08)?sale/(target*f)*100:null;
 const earlier=prev?prev.t:ctx.opened,pSale=prev?prev.sale:0,pFrac=frac(rows,earlier);
 const denom=f!==null&&pFrac!==null?target*(f-pFrac):0,delivered=sale-pSale;
 const intervalRatio=denom>0&&last.t>earlier?delivered/denom*100:null;
 let pace=null;
 if(prev&&older&&last.t>prev.t&&prev.t>older.t){
   const currentRate=(sale-prev.sale)/(last.t-prev.t);
   const oldRate=(prev.sale-older.sale)/(prev.t-older.t);
   if(oldRate>0)pace=(currentRate/oldRate-1)*100;
 }else if(prev&&state.day?.interval_growth_pct!==null&&
    Number.isFinite(Number(state.day?.interval_growth_pct))){
   pace=Number(state.day.interval_growth_pct);
 }
 const metrics=[
   projected!==null?"Projeção "+percentage(projected):"Projeção indisponível",
   intervalRatio!==null?"Hora "+percentage(intervalRatio)+" da curva":"Hora sem base",
   pace!==null?"Ritmo "+(pace>=0?"+":"")+percentage(pace):"Ritmo sem comparação"
 ];
 // Bom: no mínimo a meta projetada, entrega da hora na curva e crescimento
 // estável ou positivo em relação ao intervalo anterior.
 const good=projected!==null&&projected>=100&&intervalRatio!==null&&intervalRatio>=100&&pace!==null&&pace>=0;
 // Atenção somente para desvios concretos, nunca por ausência de uma referência.
 const bad=(projected!==null&&projected<95)||
           (intervalRatio!==null&&intervalRatio<90)||
           (pace!==null&&pace<-5);
 const kind=good?"good":bad?"bad":"neutral";
 const heading=kind==="good"?"Mandou bem, time!":
   kind==="bad"?"Precisamos reagir!":"Parcial registrada!";
 const detail=kind==="good"?"Boa entrega! Seguimos no ritmo da meta.":
   kind==="bad"?"Entrega abaixo da referência. Vamos acelerar!":
   "Acompanhe a próxima hora para consolidar o ritmo.";
 return {kind,heading,detail,metrics:metrics.join(" • "),tag:kind==="good"?"PARCIAL NA CURVA":
   kind==="bad"?"ATENÇÃO AO RESULTADO":"PARCIAL ATUALIZADA"};
}
function storageKey(ctx){return KEY+ctx.code+"_"+ctx.date}
function reactionFor(ctx){
 try{
  const r=JSON.parse(sessionStorage.getItem(storageKey(ctx))||"null");
  if(r&&r.stamp===ctx.stamp&&r.expires>ctx.now&&["good","bad","neutral"].includes(r.kind))return r;
 }catch(_){}
 return null;
}
function noticeChange(ctx){
 if(!ctx)return;
 const k=ctx.code+"_"+ctx.date,prior=observed.get(k);
 if(prior===undefined){observed.set(k,ctx.stamp);return;}
 if(prior===ctx.stamp)return;
 observed.set(k,ctx.stamp);
 if(!ctx.hasInput)return;
 const r=evaluate(ctx);
 const value={...r,stamp:ctx.stamp,expires:ctx.now+90000};
 try{sessionStorage.setItem(storageKey(ctx),JSON.stringify(value))}catch(_){}
}
const CONTOUR="M 337 20 C 395 24 451 52 511 70 C 580 82 659 77 731 78 C 785 80 813 97 817 130 C 823 200 791 296 781 388 L 770 454 Q 756 479 721 457 C 683 433 636 411 590 401 C 537 391 482 373 439 358 C 394 344 346 354 272 359 C 277 290 288 236 304 163 C 314 100 324 47 337 20 Z";
const ART='<svg class="ma-mascot-art" viewBox="0 0 1122 1402" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar RIA sorrindo e agitando bandeira oficial">'+
 '<defs><clipPath id="maBannerCloth"><path d="'+CONTOUR+'"/></clipPath>'+
 '<mask id="maPortraitNoCloth" maskUnits="userSpaceOnUse" x="0" y="0" width="1122" height="1402">'+
 '<rect width="1122" height="1402" fill="white"/><path d="'+CONTOUR+'" fill="black"/></mask></defs>'+
 '<image href="./assets/avatar-parcial-ria.avif?v=1" width="1122" height="1402" mask="url(#maPortraitNoCloth)"/>'+
 '<g class="ma-ria-flag-wave"><image href="./assets/avatar-parcial-ria.avif?v=1" width="1122" height="1402" clip-path="url(#maBannerCloth)"/></g></svg>';
function ensure(){
 if(node)return node;
 const root=$m("appShell");if(!root)return null;
 node=document.createElement("aside");node.id="maPartialMascot";node.className="ma-partial-mascot";node.hidden=true;
 node.setAttribute("role","region");node.setAttribute("aria-label","Assistente da parcial da loja");
 node.innerHTML='<button id="maMascotToggle" type="button" class="ma-mascot-portrait" aria-label="Abrir atualização da parcial">'+
  '<span class="ma-mascot-happy">'+ART+'</span>'+
  '<img class="ma-mascot-sad" src="./assets/avatar-parcial-triste.avif?v=1" alt="Avatar com expressão triste ao identificar vendas abaixo da curva" draggable="false">'+
  '<span class="ma-mascot-effects" aria-hidden="true"></span></button>'+
  '<div id="maMascotMessage" class="ma-mascot-message" role="status" aria-live="polite">'+
    '<span id="maMascotTag" class="ma-mascot-tag">PARCIAL PENDENTE</span>'+
    '<strong id="maMascotTitle">Hora de atualizar<br><em>parcial, time!</em></strong>'+
    '<small id="maMascotInfo"></small>'+
    '<b id="maMascotElapsed" class="ma-mascot-elapsed" aria-label="Tempo sem atualização"></b>'+
    '<small id="maMascotMetrics" class="ma-mascot-metrics" hidden></small>'+
    '<button class="ma-mascot-action" type="button" id="maMascotInput">Atualizar parcial <span aria-hidden="true">→</span></button>'+
  '</div>';
 root.appendChild(node);
 const action=()=>{if(node.dataset.mood==="pending"&&typeof showPaste==="function")showPaste();
   else if(typeof setSection==="function")setSection("cockpit")};
 $m("maMascotToggle").addEventListener("click",action);
 $m("maMascotInput").addEventListener("click",action);
 return node;
}
function render(){
 const box=ensure();if(!box)return;
 const ctx=context();
 if(ctx)noticeChange(ctx);
 const testing=simulate&&Date.now()<simulateEnds&&
    typeof state!=="undefined"&&state.logged&&state.section==="inicio";
 const pending=testing&&simulate.kind==="pending" ||
   (!testing&&ctx?.due);
 const feedback=testing&&simulate.kind!=="pending"?simulate:
   !pending&&ctx?reactionFor(ctx):null;
 const mode=pending?"pending":feedback?.kind||"";
 const visible=Boolean((pending||feedback)&&typeof state!=="undefined"&&
   state.logged&&state.section==="inicio");
 box.hidden=!visible;document.body.classList.toggle("ma-mascot-active",visible);
 if(!visible)return;
 box.dataset.mood=mode;
 box.className="ma-partial-mascot ma-mascot--"+mode;
 const tag=$m("maMascotTag"),title=$m("maMascotTitle"),info=$m("maMascotInfo"),
  elapsed=$m("maMascotElapsed"),metrics=$m("maMascotMetrics"),input=$m("maMascotInput");
 if(mode==="pending"){
  tag.textContent="PARCIAL PENDENTE";title.innerHTML="Hora de atualizar<br><em>parcial, time!</em>";
  info.textContent="Loja "+(ctx?.code||state.storeCode)+" • Sem nova parcial";
  const mins=testing?140:ctx.minutes;
  elapsed.textContent=formatElapsed(mins);
  elapsed.setAttribute("aria-label",Math.floor(mins/60)+" horas e "+(mins%60)+" minutos sem parcial");
  elapsed.hidden=false;metrics.hidden=true;
  input.innerHTML="Atualizar parcial <span aria-hidden='true'>→</span>";
 }else{
  tag.textContent=feedback.tag;
  title.textContent=feedback.heading;
  info.textContent=feedback.detail;
  elapsed.hidden=true;metrics.hidden=false;
  metrics.textContent=feedback.metrics||"Acompanhamento da parcial disponível no Cockpit.";
  input.innerHTML="Ver resultado <span aria-hidden='true'>→</span>";
 }
}
function init(){
 ensure();if(timer)return;
 timer=setInterval(render,15000);
 document.addEventListener("ma:dashboard-ready",render);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});
 window.addEventListener("focus",render);
 window.addEventListener("pageshow",render);
 document.addEventListener("click",e=>{if(e.target.closest("[data-section],#confirmPaste,#logoutBtn"))requestAnimationFrame(render)});
 render();
}
window.testarAvatarParcial=()=>{simulate={kind:"pending"};simulateEnds=Date.now()+15000;render();setTimeout(render,15100)};
window.testarReacaoAvatarParcial=kind=>{
 const allowed=["good","bad","neutral"];if(!allowed.includes(kind))kind="good";
 simulate=kind==="good"?{kind,tag:"PARCIAL NA CURVA",heading:"Mandou bem, time!",
  detail:"Boa entrega! Seguimos no ritmo da meta.",metrics:"Projeção 103% • Hora 108% da curva • Ritmo +12%"}:
 kind==="bad"?{kind,tag:"ATENÇÃO AO RESULTADO",heading:"Precisamos reagir!",
  detail:"Entrega abaixo da referência. Vamos acelerar!",metrics:"Projeção 73% • Hora 81% da curva • Ritmo −9%"}:
 {kind,tag:"PARCIAL ATUALIZADA",heading:"Parcial registrada!",
  detail:"Aguardando histórico para avaliar ritmo.",metrics:"Projeção indisponível"};
 simulateEnds=Date.now()+15000;render();setTimeout(render,15100);
};
window.atualizarEstadoAvatarParcial=render;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();