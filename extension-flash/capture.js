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

// Aguarda dados reais da tabela; placeholders nunca viram zero.
async function captureFlashDetail(options){
 if(location.origin!=='https://flash.riachuelo.com.br')throw Error('Sessão Flash não disponível.');
 const allowed=['073','084','108','113','138','142','146','175','177','222','238','258','262','314','318','344','350','552'];
 const excluded=[320,530,531,532,552];
 const norm=s=>s.trim().replace(/\s+/g,' ').toLowerCase();
 const text=e=>e.textContent.trim();
 const cells=r=>Array.from(r.querySelectorAll('td')).map(text);
 const wait=async fn=>{const end=Date.now()+22000;do{const r=fn();if(r)return r;await new Promise(resolve=>setTimeout(resolve,400));}while(Date.now()<end);throw Error('Dados ainda não carregados no Flash; a coleta anterior foi preservada.');};
 const path=location.pathname;let m,date,table,scope;
 if(options.kind==='flash-departments'){
  m=path.match(/^\/vendas\/deptos\/total\/(\d{8})\/\1\/(\d{3})\/?$/);
  if(!m||m[2]!==options.store||!allowed.includes(m[2]))throw Error('Abra um único dia e uma loja regional em Total Departamentos.');
  date=m[1];table='#table_id';
 }else if(options.kind==='flash-products'){
  m=path.match(/^\/vendas\/item\/(\d{3})\/(\d{3})\/(\d{8})\/?$/);
  if(!m||m[2]!==options.store||Number(m[1])!==options.dco)throw Error('Abra as vendas do DCO e da loja selecionados.');
  date=m[3];table='#itemDeptoLoja';
 }else if(options.kind==='flash-photos'){
  m=path.match(/^\/raio-x\/item\/(\d{8,14})\/(\d{8})\/?$/);
  if(!m||m[1]!==options.sku)throw Error('Produto diferente do solicitado.');date=m[2];
  const image=await wait(()=>Array.from(document.querySelectorAll('img')).find(i=>{try{const u=new URL(i.src);return u.hostname==='static.riachuelo.com.br'&&u.pathname.startsWith('/RCHLO/'+options.sku+'/')}catch{return false}}));
  return {date:date.replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3'),rows:[{sku:options.sku,image_url:image.src}]};
 }else if(options.kind==='flash-exchanges'){
  m=path.match(/^\/devolucao\/(loja|depto)\/(\d{8})\/?$/);if(!m)throw Error('Abra Trocas por Loja ou Departamento.');
  const selected=document.querySelector('#data')?.value?.replaceAll('-','');if(selected&&selected!==m[2])throw Error('Data das trocas ainda está mudando.');date=m[2];scope=m[1]==='loja'?'stores':'company';table=scope==='stores'?'#devolucaoLoja':'#devolucaoDepto';
 }else throw Error('Relatório não suportado.');
 const loaded=await wait(()=>{const t=document.querySelector(table);if(!t)return null;const rows=Array.from(t.querySelectorAll('tbody tr')).map(cells).filter(c=>c.length>2);return rows.length?{t,rows}:null;});
 const heads=Array.from(loaded.t.querySelectorAll('thead th')).map(h=>norm(text(h)));
 const index=names=>names.map(n=>{const i=heads.indexOf(n);if(i<0)throw Error('Cabeçalhos do Flash mudaram: '+n);return i;});let rows;
 if(options.kind==='flash-departments'){
  const [dep,name,total,omni,target,coupons]=index(['dep','departamento','total','real online','orçado','cupons']);
  rows=loaded.rows.filter(c=>/^\d{3}$/.test(c[dep])&&!excluded.includes(Number(c[dep]))).map(c=>({dco:Number(c[dep]),name:c[name],total:c[total],omni:c[omni],target:c[target],coupons:c[coupons]}));
 }else if(options.kind==='flash-products'){
  const [sku,desc,stock,cd,qty,sales]=index(['cód sap','descrição','qtd est.','est cd','qtd vda','vda real']);
  rows=loaded.rows.filter(c=>/^\d{8,14}$/.test(c[sku])).slice(0,100).map(c=>({sku:c[sku],description:c[desc],stock:c[stock],stock_cd:c[cd],quantity:c[qty],sales:c[sales]}));
 }else{
  const [code,name,rv,rq,ev,eq]=index([scope==='stores'?'loja':'depto','nome','devolução r$','devolução qtde','troca r$','troca qtde']);
  rows=loaded.rows.filter(c=>scope==='stores'?allowed.includes(c[code]?.replace(/^L/,'')): /^\d{3}$/.test(c[code])&&!excluded.includes(Number(c[code]))).map(c=>({...scope==='stores'?{store:c[code].replace(/^L/,'')}:{dco:Number(c[code])},name:c[name],return_value:c[rv],return_quantity:c[rq],exchange_value:c[ev],exchange_quantity:c[eq]}));
 }
 if(!rows.length)throw Error('Nenhuma linha válida carregada.');
 return {date:date.replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3'),...(scope?{scope}:{}),rows};
}
