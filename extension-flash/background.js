'use strict';
importScripts('flash-core-v1.js','capture.js');
let running=false;
const note=async text=>chrome.storage.local.set({flashAutoStatus:text});
async function cycle(){
 if(running)return;running=true;
 try{
 const config=await chrome.storage.local.get('flashAutoEnabled');if(!config.flashAutoEnabled)return;
 const tabs=await chrome.tabs.query({url:'https://flash.riachuelo.com.br/vendas/lojas/total*'});
 if(tabs.length!==1)throw Error('Automático pausado: mantenha uma aba Total Lojas do Flash aberta.');
 const apps=await chrome.tabs.query({url:'https://frannlima.github.io/meu-acompanhamento/*'});
 if(!apps.length)throw Error('Automático pausado: abra o Meu Acompanhamento no mesmo perfil do Edge.');
 apps.sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0));
 const tabId=tabs[0].id;
 // Refresh only the Total Lojas tab explicitly authorized when automation was enabled.
 await new Promise((resolve,reject)=>{
 let timer;const done=(err)=>{clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);err?reject(err):resolve();};
 const listener=(id,change)=>{if(id===tabId&&change.status==='complete')done();};
 chrome.tabs.onUpdated.addListener(listener);timer=setTimeout(()=>done(Error('Flash demorou para carregar; nova tentativa em 5 minutos.')),45000);
 chrome.tabs.reload(tabId).catch(done);
 });
 const [result]=await chrome.scripting.executeScript({target:{tabId},func:captureVisibleTable,args:[MAFlashCore.stores]});
 if(!result?.result)throw Error('Tabela Flash indisponível.');const raw=result.result;
 const packet=MAFlashCore.validate({version:1,kind:'flash-stores',source:'flash.riachuelo.com.br',business_date:raw.date,collected_at:new Date().toISOString(),rows:raw.rows.map(r=>({...r,total:MAFlashCore.numberBR(r.total),omni:MAFlashCore.numberBR(r.omni),target:MAFlashCore.numberBR(r.target),coupons:MAFlashCore.numberBR(r.coupons),source_time:r.source_time==='-'?null:r.source_time}))});
 await chrome.scripting.executeScript({target:{tabId:apps[0].id},func:p=>{if(location.origin==='https://frannlima.github.io'&&location.pathname.startsWith('/meu-acompanhamento/'))window.postMessage({type:'MA_FLASH_PILOT_V1',payload:p},location.origin);},args:[packet]});
 await note('Coleta encaminhada às '+new Date().toLocaleTimeString('pt-BR')+'. Confira recebimento e sincronização no app.');
 }catch(e){await note(e.message);}finally{running=false;}
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='flashAuto')cycle();});
chrome.runtime.onStartup.addListener(async()=>{const config=await chrome.storage.local.get('flashAutoEnabled');if(config.flashAutoEnabled)await chrome.alarms.create('flashAuto',{periodInMinutes:5,delayInMinutes:1});});
