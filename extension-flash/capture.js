'use strict';
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
