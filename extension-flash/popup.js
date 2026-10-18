'use strict';
let packet=null;
const status=document.getElementById('status');
function captureVisibleTable(allowed){
  if(location.origin!=='https://flash.riachuelo.com.br'||!location.pathname.startsWith('/vendas/lojas/total'))throw Error('Abra Total Lojas no Flash.');
  const start=document.querySelector('#dataDe')?.selectedOptions?.[0]?.textContent?.trim();
  const end=document.querySelector('#dataAte')?.selectedOptions?.[0]?.textContent?.trim();
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(start)||start!==end)throw Error('Selecione um único dia.');
  const table=document.querySelector('#totalLojas');if(!table)throw Error('Tabela não carregada');
  const heads=Array.from(table.querySelectorAll('thead th')).map(x=>x.textContent.trim().replace(/\s+/g,' ').toLowerCase());
  const indexes=['loja','total','real online','orçado','cupom','hora'].map(h=>heads.indexOf(h));
  if(indexes.some(i=>i<0))throw Error('Cabeçalhos mudaram; coleta interrompida.');
  const rows=[];
  for(const tr of table.querySelectorAll('tbody tr')){
    const c=Array.from(tr.querySelectorAll('td')).map(x=>x.textContent.trim());
    const match=c[indexes[0]]?.match(/^L(\d{3})\b/);if(!match||!allowed.includes(match[1]))continue;
    rows.push({store:match[1],total:c[indexes[1]],omni:c[indexes[2]],target:c[indexes[3]],coupons:c[indexes[4]],source_time:c[indexes[5]]});
  }
  return {date:start.split('/').reverse().join('-'),rows};
}
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
    if(tabs.length!==1)throw Error('Mantenha exatamente uma aba do Meu Acompanhamento aberta e entre como administrador.');
    const [result]=await chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:p=>{
      if(location.origin!=='https://frannlima.github.io'||!location.pathname.startsWith('/meu-acompanhamento/'))return false;
      window.postMessage({type:'MA_FLASH_PILOT_V1',payload:p},location.origin);return true;
    },args:[packet]});
    if(!result.result)throw Error('Destino inválido');status.textContent='Transferência enviada. Confira o recebimento na área Flash piloto do app. Nenhum dado foi gravado na base oficial.';
  }catch(e){status.textContent=e.message;}
};
