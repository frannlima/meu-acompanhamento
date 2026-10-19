'use strict';
function buildFlashPacket(raw,options={}){
 const p={version:1,kind:options.kind||'flash-stores',source:'flash.riachuelo.com.br',business_date:raw.date,collected_at:new Date().toISOString(),store:options.store,dco:options.dco,scope:raw.scope,rows:raw.rows.map(row=>{
 const r={...row};for(const k of ['total','omni','target','coupons','quantity','sales','stock','stock_cd','return_value','return_quantity','exchange_value','exchange_quantity'])if(k in r)r[k]=MAFlashCore.numberBR(r[k]);return r;
 })};
 return p.kind==='flash-stores'?MAFlashCore.validate(p):MAFlashDetailCore.validate(p);
}
async function sendFlashPacket(tabId,packet){
 const requestId=crypto.randomUUID();
 const [result]=await chrome.scripting.executeScript({target:{tabId},func:(p,id)=>new Promise((resolve,reject)=>{
  if(location.origin!=='https://frannlima.github.io'||!location.pathname.startsWith('/meu-acompanhamento/'))return reject(Error('Destino inválido.'));
  const timer=setTimeout(()=>{window.removeEventListener('message',listener);reject(Error('O app não confirmou o recebimento. Atualize o app e entre como administrador.'));},6000);
  const listener=e=>{if(e.origin!==location.origin||(e.source!==window&&e.source!==null)||e.data?.type!=='MA_FLASH_ACK_V1'||e.data.requestId!==id)return;clearTimeout(timer);window.removeEventListener('message',listener);e.data.ok?resolve(true):reject(Error(e.data.error||'Coleta recusada no app.'));};
  window.addEventListener('message',listener);window.postMessage({type:'MA_FLASH_PILOT_V1',payload:p,requestId:id},location.origin);
 }),args:[packet,requestId]});
 if(!result?.result)throw Error('Recebimento não confirmado.');
}
