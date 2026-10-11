/* Lembrete operacional de parciais: aplicativo Meu Acompanhamento. */
(function(){
"use strict";
const STREET=new Set(["084","113","146"]);
const $alert=id=>document.getElementById(id);
const TITLE=document.title;
let timer=0,flash=0,notifyAt=0,seen="",busy=false,simulate=false;
const key=type=>"ma_atraso_"+type+"_"+state.storeCode+"_"+localDate();
const saved=k=>{try{return localStorage.getItem(key(k))}catch(_){return null}};
const store=(k,v)=>{try{localStorage.setItem(key(k),String(v))}catch(_){}};
function nowLocal(now=new Date()){
  const obj=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",
    year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false,hourCycle:"h23"})
    .formatToParts(now).map(p=>[p.type,p.value]));
  return {date:obj.year+"-"+obj.month+"-"+obj.day,clock:(+obj.hour%24)*60+(+obj.minute)};
}
function evaluate(now=new Date()){
  if(!state.logged||!state.storeCode)return null;
  const t=nowLocal(now),isStreet=STREET.has(String(state.storeCode));
  const dayOfWeek=new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"America/Fortaleza"}).format(now);
  const open=isStreet?480:600,close=isStreet?1080:1320;
  if(t.date!==localDate()||t.clock<open||t.clock>=close||(isStreet&&dayOfWeek==="Sun"))return null;
  const opened=Date.parse(t.date+"T00:00:00-03:00")+open*60000;
  const last=Date.parse(state.day?.captured_at||"");
  const valid=Number.isFinite(last)&&last>=opened&&last<=now.getTime();
  const minutes=Math.floor((now.getTime()-(valid?last:opened))/60000);
  const stale=minutes>=70;
  const notShared=valid&&minutes>=15&&saved("shared")!==String(state.day.captured_at);
  return {stale,notShared,minutes,last:valid?last:null,active:stale||notShared,
    stamp:String(state.day?.captured_at||""),store:String(state.storeCode)};
}
function ensure(){
  let box=$alert("maLateAlert");
  if(box)return box;
  const root=$alert("appShell");if(!root)return null;
  box=document.createElement("aside");box.id="maLateAlert";box.className="ma-late-alert";box.hidden=true;
  box.setAttribute("role","status");box.setAttribute("aria-live","polite");
  box.innerHTML='<div class="ma-late-line"><b class="ma-late-icon">!</b><div><strong id="maLateTitle"></strong><p id="maLateMessage"></p></div>'+
    '<button id="maLateSnooze" type="button" title="Lembrar em 10 minutos">×</button></div>'+
    '<div class="ma-late-actions"><button id="maLateInput" type="button">＋ Atualizar venda</button>'+
    '<button id="maLateDone" type="button">✓ Já compartilhei</button>'+
    '<button id="maLateNotif" type="button">🔔 Ativar notificações</button></div>'+
    '<small>Atualização: 60 min + 10 min de tolerância • Compartilhamento: 15 min após o input</small>';
  root.appendChild(box);
  $alert("maLateSnooze").onclick=()=>{store("snooze",Date.now()+600000);render()};
  $alert("maLateInput").onclick=()=>{setSection("inicio");if(typeof showPaste==="function")showPaste()};
  $alert("maLateDone").onclick=()=>window.confirmarCompartilhamentoParcial();
  $alert("maLateNotif").onclick=async()=>{
    if(!("Notification" in window))return;
    if(Notification.permission==="default")try{await Notification.requestPermission()}catch(_){}
    toast(Notification.permission==="granted"?"Notificações ativadas.":"O navegador não autorizou notificações.",Notification.permission!=="granted");
    render();
  };
  return box;
}
function tabAlert(active){
  document.body.classList.toggle("ma-late-active",active);
  if(!active){
    if(flash){clearInterval(flash);flash=0}
    document.title=TITLE;$alert("maLateFavicon")?.remove();
    return;
  }
  if(flash)return;
  const favicon=document.createElement("link");favicon.id="maLateFavicon";favicon.rel="icon";
  favicon.href="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect rx="13" width="64" height="64" fill="#C92E3A"/><text x="32" y="47" text-anchor="middle" font-size="49" font-family="Arial" font-weight="bold" fill="#fff">!</text></svg>');
  document.head.appendChild(favicon);
  let on=false;
  const redIcon=favicon.href;
  const normalIcon="./assets/riachuelo-logo-vertical.svg";
  const swap=()=>{on=!on;document.title=on?"🔴 PARCIAL ATRASADA • "+state.storeCode:TITLE;favicon.href=on?redIcon:normalIcon};
  swap();flash=setInterval(swap,1400);
}
async function systemNotify(s){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const body=(s.stale?"Sem venda atualizada há "+s.minutes+" minutos. ":"")+
    (s.notShared?"Compartilhamento não confirmado neste navegador.":"");
  try{
    const options={body,tag:"ma-delay-"+s.store,icon:"./assets/riachuelo-logo-vertical.svg"};
    const reg=await navigator.serviceWorker?.getRegistration?.();
    if(reg?.showNotification)await reg.showNotification("Alerta de parcial • Loja "+s.store,options);
    else new Notification("Alerta de parcial • Loja "+s.store,options);
  }catch(_){}
}
function render(){
  const box=ensure();if(!box)return;
  const s=evaluate(),visible=(simulate||s?.active)&&Date.now()>=Number(saved("snooze")||0);
  box.hidden=!visible;tabAlert(!!visible);
  if(!visible){seen="";return}
  const label=simulate?"Simulação de alerta":("Parcial pendente • Loja "+s.store);
  const message=simulate?"Teste visual: as metas e os registros não foram alterados.":
    (s.stale?(s.last?"Última atualização há ":"Sem primeiro lançamento há ")+s.minutes+" minutos. ":"")+
    (s.notShared?"Compartilhamento não confirmado neste dispositivo.":"");
  $alert("maLateTitle").textContent=label;
  $alert("maLateMessage").textContent=message;
  $alert("maLateInput").hidden=!simulate&&!s.stale;
  $alert("maLateDone").hidden=!simulate&&!s.notShared;
  $alert("maLateNotif").hidden=!("Notification" in window)||Notification.permission!=="default";
  const next=simulate?"test":s.store+"|"+s.stamp+"|"+s.stale+"|"+s.notShared;
  if(seen===next)return;
  seen=next;box.classList.remove("ma-late-shake");void box.offsetWidth;box.classList.add("ma-late-shake");
  if(navigator.vibrate&&document.visibilityState==="visible")try{navigator.vibrate([180,120,180])}catch(_){}
  if(!simulate&&Date.now()-notifyAt>1200000){notifyAt=Date.now();systemNotify(s)}
}
window.confirmarCompartilhamentoParcial=()=>{
  if(!state.day?.captured_at){toast("Atualize a venda antes de confirmar o compartilhamento.",true);return}
  store("shared",state.day.captured_at);store("snooze",0);
  toast("Compartilhamento confirmado neste dispositivo.");render();
};
window.registrarCompartilhamentoParcial=()=>window.confirmarCompartilhamentoParcial();
window.testarAlertaAtraso=()=>{
  simulate=true;store("snooze",0);render();
  setTimeout(()=>{simulate=false;render()},8000);
};
async function poll(){
  if(!state.logged||busy)return;
  busy=true;const target=String(state.storeCode),date=localDate();
  try{
    const day=await api("dashboard",{matricula:state.matricula,business_date:date,store_code:target});
    if(target===String(state.storeCode)&&date===localDate()){
      const a=Date.parse(day?.captured_at||""),b=Date.parse(state.day?.captured_at||"");
      if(Number.isFinite(a)&&(!Number.isFinite(b)||a>b))await loadAll();
    }
  }catch(_){}
  finally{busy=false;render()}
}
function init(){
  ensure();if(timer)return;timer=setInterval(render,30000);
  setInterval(poll,120000);
  document.addEventListener("visibilitychange",()=>{render();if(!document.hidden)poll()});
  window.addEventListener("storage",e=>{if(e.key?.startsWith("ma_atraso_"))render()});
  render();
}
const before=window.loadAll;
if(typeof before==="function")window.loadAll=async function(...args){
  const value=await before(...args);if(value===true)render();return value;
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
