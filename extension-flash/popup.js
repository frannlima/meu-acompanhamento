'use strict';
let packet=null;
const status=document.getElementById('status');
document.getElementById('capture').onclick=async()=>{
  packet=null;document.getElementById('send').disabled=true;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const [r]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:captureVisibleTable,args:[MAFlashCore.stores]});
    if(!r.result)throw Error('Não foi possível ler a tabela carregada.');
    packet=MAFlashCore.validate({version:1,kind:'flash-stores',source:'flash.riachuelo.com.br',business_date:r.result.date,collected_at:new Date().toISOString(),rows:r.result.rows.map(row=>({...row,total:MAFlashCore.numberBR(row.total),omni:MAFlashCore.numberBR(row.omni),target:MAFlashCore.numberBR(row.target),coupons:MAFlashCore.numberBR(row.coupons),source_time:row.source_time==='-'?null:row.source_time}))});
    status.textContent=packet.rows.length+' lojas coletadas em '+packet.business_date+'.\nLojas: '+packet.rows.map(r=>r.store).join(', ')+'.\nDados de referência; trocas não conciliadas.';
    document.getElementById('send').disabled=false;
  }catch(e){status.textContent=e.message;}
};
document.getElementById('send').onclick=async()=>{
  try{
    if(!packet)throw Error('Faça a coleta primeiro.');
    if(!await chrome.permissions.request({origins:['https://frannlima.github.io/*']}))throw Error('Permissão para enviar ao app não concedida.');
    const tabs=await chrome.tabs.query({url:'https://frannlima.github.io/meu-acompanhamento/*'});
    if(!tabs.length)throw Error('Nenhuma aba do app encontrada neste perfil do Edge. Abra https://frannlima.github.io/meu-acompanhamento/ neste mesmo navegador e entre como administrador.');
    tabs.sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0));
    status.textContent='Enviando para a aba do app usada mais recentemente…';
    const [result]=await chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:p=>{
      if(location.origin!=='https://frannlima.github.io'||!location.pathname.startsWith('/meu-acompanhamento/'))return false;
      window.postMessage({type:'MA_FLASH_PILOT_V1',payload:p},location.origin);return true;
    },args:[packet]});
    if(!result.result)throw Error('Destino inválido');status.textContent='Transferência enviada. Confira o recebimento na área Flash piloto do app. Nenhum dado foi gravado na base oficial.';
  }catch(e){status.textContent=e.message;}
};
async function autoStatus(){const config=await chrome.storage.local.get(['flashAutoEnabled','flashAutoStatus']);document.getElementById('autoStatus').textContent=(config.flashAutoEnabled?'Automático ativado. ':'Automático desligado. ')+(config.flashAutoStatus||'');}
document.getElementById('startAuto').onclick=async()=>{
 try{
 if(!await chrome.permissions.request({origins:['https://flash.riachuelo.com.br/*','https://frannlima.github.io/*']}))throw Error('Permissão não concedida.');
 await chrome.storage.local.set({flashAutoEnabled:true,flashAutoStatus:'A aba Total Lojas será recarregada a cada 5 minutos. Mantenha o Flash autenticado e o app aberto como administrador.'});
 await chrome.alarms.create('flashAuto',{periodInMinutes:5,delayInMinutes:1});await autoStatus();
 }catch(e){document.getElementById('autoStatus').textContent=e.message;}
};
document.getElementById('stopAuto').onclick=async()=>{await chrome.storage.local.set({flashAutoEnabled:false,flashAutoStatus:''});await chrome.alarms.clear('flashAuto');await autoStatus();};
autoStatus();
