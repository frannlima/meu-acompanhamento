'use strict';
importScripts('flash-core-v1.js','flash-detail-core-v1.js','capture.js','transfer.js');
let running=false;
const note=async text=>chrome.storage.local.set({flashAutoStatus:text});
function navigate(tabId,url){return new Promise((resolve,reject)=>{
 let settled=false;const done=error=>{if(settled)return;settled=true;clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);error?reject(error):resolve();};
 const listener=(id,change)=>{if(id===tabId&&change.status==='complete')done();};
 chrome.tabs.onUpdated.addListener(listener);const timer=setTimeout(()=>done(Error('Flash demorou para abrir o relatório.')),22000);
 (url?chrome.tabs.update(tabId,{url}):chrome.tabs.reload(tabId)).catch(done);
});}
async function readBase(tabId){
 await navigate(tabId);await chrome.scripting.executeScript({target:{tabId},files:['capture.js']});
 const [r]=await chrome.scripting.executeScript({target:{tabId},func:async allowed=>{
 const end=Date.now()+22000;do{try{const raw=captureVisibleTable(allowed);if(raw.rows.length===allowed.length)return raw;}catch(e){if(location.origin!=='https://flash.riachuelo.com.br')throw Error('Flash precisa de nova autenticação.');}await new Promise(resolve=>setTimeout(resolve,400));}while(Date.now()<end);throw Error('As 18 lojas ainda não carregaram. Nenhuma ausência foi transformada em zero.');
 },args:[MAFlashCore.stores]});return buildFlashPacket(r.result);
}
async function readDetail(tabId,url,options){await navigate(tabId,url);const [r]=await chrome.scripting.executeScript({target:{tabId},func:captureFlashDetail,args:[options]});if(!r?.result)throw Error('Relatório não carregado.');return buildFlashPacket(r.result,options);}
async function cycle(){
 if(running)return;running=true;let auxiliary=null;const started=Date.now(),errors=[];let sent=0;
 try{
 const config=await chrome.storage.local.get(['flashAutoEnabled','flashStore','flashDcos']);if(!config.flashAutoEnabled)return;
 const store=MAFlashCore.stores.includes(config.flashStore)?config.flashStore:'108';
 const flashes=await chrome.tabs.query({url:'https://flash.riachuelo.com.br/vendas/lojas/total*'}),apps=await chrome.tabs.query({url:'https://frannlima.github.io/meu-acompanhamento/*'});
 if(flashes.length!==1)throw Error('Mantenha uma aba Total Lojas do Flash aberta.');if(!apps.length)throw Error('Abra o Meu Acompanhamento no mesmo perfil do navegador.');
 apps.sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0));const app=apps[0].id;
 const base=await readBase(flashes[0].id);await sendFlashPacket(app,base);sent++;
 const [links]=await chrome.scripting.executeScript({target:{tabId:flashes[0].id},func:()=>Array.from(document.querySelectorAll('a[href]')).map(a=>a.href).filter(u=>/^https:\/\/flash\.riachuelo\.com\.br\/devolucao\/(loja|depto)\/\d{8}$/.test(u))});
 auxiliary=await chrome.tabs.create({active:false,url:'about:blank'});const date=base.business_date.replaceAll('-','');
 async function collect(url,options){
  if(Date.now()-started>230000)throw Error('Ciclo encerrado; demais relatórios serão tentados na próxima atualização.');
  if(!(await chrome.storage.local.get('flashAutoEnabled')).flashAutoEnabled)throw Error('Atualização interrompida pelo usuário.');
  const p=await readDetail(auxiliary.id,url,options);await sendFlashPacket(app,p);sent++;return p;
 }
 let departments;
 try{departments=await collect('https://flash.riachuelo.com.br/vendas/deptos/total/'+date+'/'+date+'/'+store,{kind:'flash-departments',store});}catch(e){errors.push('Grupos: '+e.message);}
 for(const url of [...new Set(links?.result||[])]){try{await collect(url,{kind:'flash-exchanges',store});}catch(e){errors.push('Trocas: '+e.message);}}
 let dcos=(config.flashDcos||'').split(',').map(s=>Number(s.trim())).filter(d=>MAFlashDetailCore.catalog[d]&&!MAFlashDetailCore.excluded.includes(d));
 if(!dcos.length&&departments){const chosen=new Map();for(const r of departments.rows.slice().sort((a,b)=>b.total-a.total)){const w=MAFlashDetailCore.catalog[r.dco]?.world_code;if(w&&!chosen.has(w)&&r.total>0)chosen.set(w,r.dco);}dcos=[...chosen.values()];}
 for(const dco of [...new Set(dcos)].slice(0,5)){
  try{const p=await collect('https://flash.riachuelo.com.br/vendas/item/'+dco+'/'+store+'/'+date,{kind:'flash-products',store,dco});
   const top=p.rows.slice().sort((a,b)=>b.quantity-a.quantity||b.sales-a.sales)[0];
   if(top)try{await collect('https://flash.riachuelo.com.br/raio-x/item/'+top.sku+'/'+date,{kind:'flash-photos',store,dco,sku:top.sku});}catch{errors.push('Foto indisponível no DCO '+dco);}
  }catch(e){errors.push('Produtos '+dco+': '+e.message);}
 }
 await note(sent+' coletas confirmadas no app às '+new Date().toLocaleTimeString('pt-BR')+'. '+(errors.length?errors.join(' • '):'Confira a data e o horário de cada relatório no app.'));
 }catch(e){await note('Atualização pausada: '+e.message);}finally{if(auxiliary)await chrome.tabs.remove(auxiliary.id).catch(()=>{});running=false;}
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='flashAuto')cycle();});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(message?.type==='flash-run'){cycle();reply({started:true});}return false;});
async function restoreAlarm(){const c=await chrome.storage.local.get('flashAutoEnabled');if(c.flashAutoEnabled&&!await chrome.alarms.get('flashAuto'))await chrome.alarms.create('flashAuto',{periodInMinutes:5,delayInMinutes:1});}
chrome.runtime.onStartup.addListener(restoreAlarm);chrome.runtime.onInstalled.addListener(restoreAlarm);restoreAlarm();
