/* Meu Acompanhamento | Painel Hora a Hora vivo • substitui prévia estática visível por dados tocáveis */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const abbreviated=n=>{
 const v=Math.abs(Number(n||0));
 if(v>=1000)return (n<0?"−":"")+'R$ '+(v/1000).toLocaleString("pt-BR",{maximumFractionDigits:1,minimumFractionDigits:1})+' mil';
 return (n<0?"−":"")+money(v);
};
const pct=v=>Number.isFinite(v)?v.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%":"—";
const signed=n=>(n<0?"− ":"+ ")+money(Math.abs(n));
const time=iso=>iso&&Number.isFinite(Date.parse(iso))?new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Fortaleza"}):"sem parcial";
let lastKey="",pending=false;
function report(){
 const x=window.maGroupImpact?.getAnalysis?.();
 if(!x||!Array.isArray(x.gg))return null;
 const d=state.day||{},groups=[...x.gg].filter(g=>g.meta>0).sort((a,b)=>{
   const aa=a.att===null?-1:a.att,bb=b.att===null?-1:b.att;
   return bb-aa||b.sale-a.sale;
 });
 const mapping=typeof window.getOfficialGgSummaries==="function"?window.getOfficialGgSummaries():[];
 const byKey=new Map(mapping.map(g=>[key(g.gg_label||g.group_code),g]));
 const rawCurve=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
 const weights=(Array.isArray(rawCurve)?rawCurve:[]).filter(r=>Number.isFinite(Number(r.fin))&&Number(r.fin)>0);
 const weightTotal=weights.reduce((v,r)=>v+Number(r.fin),0);
 const ratio=weightTotal>0&&x.now!==null?
   Math.max(0,Math.min(1,weights.reduce((v,r)=>
     v+Number(r.fin)*(Math.floor(x.now/60)>Number(r.h)?1:Math.floor(x.now/60)===Number(r.h)?(x.now%60)/60:0),0)/weightTotal)):0;
 const rows=groups.map(g=>{
   const original=byKey.get(g.key)||{};
   const physical=Number(original.sales_physical)||0;
   const projection=x.valid&&ratio>=.08?g.sale/ratio:null;
   return {...g,physical,projection,isDay:x.day.has(g.key),isHour:x.hour.has(g.key)};
 });
 const totalMeta=Number(d.target_financial)>0?Number(d.target_financial):rows.reduce((s,r)=>s+r.meta,0);
 const totalSale=x.valid?Number(d.sales_financial):null;
 const effectiveSale=totalSale!==null&&Number.isFinite(totalSale)?totalSale: x.valid?rows.reduce((s,r)=>s+r.sale,0):null;
 const projection=x.valid&&ratio>=.08&&effectiveSale!==null?effectiveSale/ratio:null;
 const attainment=x.valid&&totalMeta>0&&effectiveSale!==null?effectiveSale/totalMeta*100:null;
 return {rows,totalMeta,effectiveSale,projection,attainment,valid:x.valid,updated:d.captured_at,store:String(state.storeCode||""),day:typeof localDate==="function"?localDate():"",ratio};
}
function indicator(row){
 return (row.isDay?'<span class="gl-alert gl-alert-day" title="Maior desvio financeiro acumulado do dia">D</span>':"")+
   (row.isHour?'<span class="gl-alert gl-alert-hour" title="Maior impacto na última parcial comparável">H</span>':"");
}
function cell(label,exact,short,classes=""){
 return '<span class="gl-cell '+classes+'"><small>'+esc(label)+'</small>'+
   '<b class="gl-full-number">'+esc(exact)+'</b><b class="gl-short-number" title="'+esc(exact)+'">'+esc(short||exact)+'</b></span>';
}
function tr(row){
 const badges=indicator(row),att=row.att===null?"—":pct(row.att);
 const sale=row.att===null?"—":money(row.sale);
 const meta=money(row.meta),gap=row.abs===null?"—":signed(row.abs);
 const evo=row.evo===null?"—":(row.evo>=0?"▲ ":"▼ ")+pct(row.evo);
 const ly=Number(row.ly)>0?money(row.ly):"—";
 const projection=row.projection===null?"—":money(row.projection);
 const id=esc(row.key),name=esc(row.name);
 const sel='<button type="button" class="gi-mobile-trigger gl-select" data-gi-group="'+id+'" aria-label="Abrir Raio-X e DCOs do grupo '+name+'">'+
   '<span class="gl-label">'+name+'</span><span class="gl-alerts">'+badges+'</span><span class="gl-chevron" aria-hidden="true">›</span></button>';
 const mobileCard='<button type="button" class="gi-mobile-trigger gl-mobile-card" data-gi-group="'+id+'" aria-label="Abrir Raio-X do grupo '+name+'">'+
  '<span class="gl-card-head"><span class="gl-card-name">'+name+
   (badges?'<span class="gl-card-alerts">'+badges+'</span>':'')+'</span>'+
   '<span class="gl-card-score '+(row.att===null?'neutral':row.att>=100?'good':row.att>=90?'warn':'bad')+'">'+esc(att)+'</span>'+
   '<span class="gl-card-chevron" aria-hidden="true">›</span></span>'+
  '<span class="gl-card-stats">'+
   '<span class="gl-card-stat"><small>Meta do grupo</small><strong title="'+esc(meta)+'">'+esc(abbreviated(row.meta))+'</strong></span>'+
   '<span class="gl-card-stat"><small>Venda real</small><strong title="'+esc(sale)+'">'+(row.att===null?'—':esc(abbreviated(row.sale)))+'</strong></span>'+
   '<span class="gl-card-stat"><small>Desvio do dia</small><strong class="'+(row.abs!==null&&row.abs<0?'gl-negative':'gl-positive')+'" title="'+esc(gap)+'">'+(row.abs===null?'—':esc(abbreviated(row.abs)))+'</strong></span>'+
   '<span class="gl-card-stat"><small>Ev. vs A.A.</small><strong class="'+(row.evo!==null&&row.evo<0?'gl-negative':'gl-positive')+'">'+esc(evo)+'</strong></span>'+
  '</span><span class="gl-card-foot">Toque para ver projeção, evolução e maiores impactos <b aria-hidden="true">↗</b></span>'+
 '</button>';
 const mobileAmount='<div class="gl-mobile-pair"><small>Meta <b>'+esc(abbreviated(row.meta))+'</b></small><strong title="'+esc(sale)+'">'+(row.att===null?"—":esc(abbreviated(row.sale)))+'</strong></div>';
 return '<div class="gl-row'+(row.isDay?" gl-day":"")+(row.isHour?" gl-hour":"")+'" role="row">'+
   '<div class="gl-mobile-only">'+mobileCard+'</div>'+ 
   '<div class="gl-name" role="cell">'+sel+'</div>'+
   '<div class="gl-data gl-target" role="cell">'+cell("Meta",meta,abbreviated(row.meta))+'</div>'+
   '<div class="gl-data gl-sale" role="cell">'+cell("Venda",sale,row.att===null?"—":abbreviated(row.sale))+'</div>'+
   '<div class="gl-data gl-combined" role="cell">'+mobileAmount+'</div>'+
   '<div class="gl-data gl-att" role="cell"><span class="gl-percentage '+(row.att!==null&&row.att>=100?"good":row.att!==null&&row.att>=90?"warn":"bad")+'">'+esc(att)+'</span></div>'+
   '<div class="gl-data gl-ly" role="cell">'+cell("A.A.",ly,abbreviated(row.ly))+'</div>'+
   '<div class="gl-data gl-evo" role="cell"><b class="'+(row.evo!==null&&row.evo<0?"gl-negative":"gl-positive")+'">'+esc(evo)+'</b></div>'+
   '<div class="gl-data gl-dev" role="cell"><b class="'+(row.abs!==null&&row.abs<0?"gl-negative":"gl-positive")+'" title="'+esc(gap)+'">'+(row.abs===null?"—":esc(abbreviated(row.abs)))+'</b></div>'+
   '<div class="gl-data gl-projection" role="cell">'+cell("Projeção",projection,row.projection===null?"—":abbreviated(row.projection))+'</div>'+
   '<div class="gl-data gl-physical" role="cell"><b>'+Number(row.physical).toLocaleString("pt-BR")+'</b></div>'+
 '</div>';
}
function totalRow(m){
 const totalGap=m.effectiveSale===null?'—':abbreviated(m.effectiveSale-m.totalMeta);
 const totalAtt=m.attainment===null?'—':pct(m.attainment);
 const mobileTotal='<div class="gl-mobile-total"><div class="gl-mobile-total-top"><strong>TOTAL LOJA</strong><span class="gl-card-score '+(m.attainment!==null&&m.attainment>=100?'good':'bad')+'">'+totalAtt+'</span></div>'+
 '<div class="gl-card-stats">'+
 '<span class="gl-card-stat"><small>Meta do dia</small><strong title="'+money(m.totalMeta)+'">'+abbreviated(m.totalMeta)+'</strong></span>'+
 '<span class="gl-card-stat"><small>Venda parcial</small><strong>'+(m.effectiveSale===null?'—':abbreviated(m.effectiveSale))+'</strong></span>'+
 '<span class="gl-card-stat"><small>Desvio total</small><strong class="'+(m.effectiveSale!==null&&m.effectiveSale-m.totalMeta<0?'gl-negative':'gl-positive')+'">'+totalGap+'</strong></span>'+
 '<span class="gl-card-stat"><small>Projeção</small><strong>'+(m.projection===null?'—':abbreviated(m.projection))+'</strong></span></div></div>';
 return '<div class="gl-row gl-total" role="row">'+
  '<div class="gl-mobile-only">'+mobileTotal+'</div>'+ 
  '<div class="gl-name" role="cell"><strong>TOTAL LOJA</strong></div>'+
  '<div class="gl-data gl-target" role="cell">'+cell("Meta",money(m.totalMeta),abbreviated(m.totalMeta))+'</div>'+
  '<div class="gl-data gl-sale" role="cell">'+cell("Venda",m.effectiveSale===null?"—":money(m.effectiveSale),m.effectiveSale===null?"—":abbreviated(m.effectiveSale))+'</div>'+
  '<div class="gl-data gl-combined" role="cell"><div class="gl-mobile-pair"><small>Meta <b>'+esc(abbreviated(m.totalMeta))+'</b></small><strong>'+(m.effectiveSale===null?"—":esc(abbreviated(m.effectiveSale)))+'</strong></div></div>'+
  '<div class="gl-data gl-att" role="cell"><span class="gl-percentage '+(m.attainment!==null&&m.attainment>=100?"good":"bad")+'">'+(m.attainment===null?"—":pct(m.attainment))+'</span></div>'+
  '<div class="gl-data gl-ly" role="cell">—</div><div class="gl-data gl-evo" role="cell">—</div>'+
  '<div class="gl-data gl-dev" role="cell"><b class="'+(m.effectiveSale!==null&&m.effectiveSale-m.totalMeta<0?"gl-negative":"gl-positive")+'">'+(m.effectiveSale===null?"—":esc(abbreviated(m.effectiveSale-m.totalMeta)))+'</b></div>'+
  '<div class="gl-data gl-projection" role="cell">'+(m.projection===null?"—":esc(abbreviated(m.projection)))+'</div>'+
  '<div class="gl-data gl-physical" role="cell">—</div></div>';
}
function markup(m){
 const prettyDate=m.day.split("-").reverse().join("/");
 const top='<div class="gl-brand"><div class="gl-logo"><img src="./assets/riachuelo-logo.svg" alt="Riachuelo"></div>'+
   '<div class="gl-brand-title"><h3>PARCIAL HORA HORA</h3>'+
   '<span>Loja '+esc(m.store)+' • '+esc(prettyDate)+' • '+esc(time(m.updated))+'</span></div></div>';
 const headings=['GRUPO','META','VENDA','ATING.','VENDA A.A.','EVOLUÇÃO','DESVIO','PROJEÇÃO','FÍSICA'];
 const desktopHead=headings.map((v,i)=>'<span class="gl-heading gl-head-'+i+'" role="columnheader">'+v+'</span>').join("");
 const mobileTip='<p class="gl-mobile-tip">Toque em um grupo para abrir os detalhes. <span>▲ Acima da meta · ▼ Abaixo da meta</span></p>';
 const mobileHead='<div class="gl-mobile-head" aria-hidden="true"><span>GRUPO</span><span>META / VENDA</span><span>ATING.</span><span>DESVIO</span></div>';
 const list='<div class="gl-live-table" role="table" aria-label="Resultado interativo por grupo de venda">'+
   '<div class="gl-table-head" role="row">'+desktopHead+'</div>'+mobileTip+mobileHead+
   '<div class="gl-live-body" role="rowgroup">'+(m.rows.length?m.rows.map(tr).join(""):'<p class="gl-empty">Aguardando metas oficiais dos grupos.</p>')+totalRow(m)+'</div></div>';
 const summary='<div class="gl-summary"><h4>Resumo rápido</h4><div><small>META DO DIA</small><b>'+money(m.totalMeta)+'</b></div>'+
   '<div><small>VENDA PARCIAL</small><b>'+(m.effectiveSale===null?"—":money(m.effectiveSale))+'</b></div>'+
   '<div><small>PROJEÇÃO</small><b>'+(m.projection===null?"—":money(m.projection))+'</b></div></div>';
 const footer='<div class="gl-footer"><span>MEU ACOMPANHAMENTO</span><span><b class="gl-d-key">D</b> Desvio dia&nbsp; <b class="gl-h-key">H</b> Impacto hora</span></div>'+
 '<p class="gl-help">Toque no nome de qualquer grupo para consultar evolução, atingimento, desvio e os DCOs de maior impacto.</p>';
 return '<section class="gl-panel" aria-label="Parcial Hora Hora interativa">'+top+list+summary+footer+'</section>';
}
function container(){
 const card=$("ma3Card");if(!card)return null;
 let place=$("ma3LiveGroup");
 if(!place){
   const img=card.querySelector(".ma3-image-wrap");
   place=document.createElement("div");place.id="ma3LiveGroup";place.className="ma3-live-group";
   if(img)img.insertAdjacentElement("afterend",place);
   else card.appendChild(place);
 }
 return place;
}
function render(force=false){
 if(!state?.logged)return;
 const root=container();if(!root)return;
 const result=report();if(!result)return;
 const stamp=[result.store,result.day,result.updated,result.effectiveSale,result.totalMeta,
   result.rows.map(r=>[r.key,r.sale,r.meta,r.abs,r.evo,r.actualInterval,r.hourGap,r.isDay,r.isHour].join("|")).join(";")].join(":");
 if(!force&&root.dataset.glStamp===stamp&&root.querySelector(".gl-panel"))return;
 root.innerHTML=markup(result);root.dataset.glStamp=stamp;
 root.hidden=false;root.closest("#ma3Card")?.classList.add("gl-live-active");
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render();});}
function boot(){
 document.addEventListener("ma:dashboard-ready",()=>setTimeout(schedule,100));
 document.addEventListener("ma:section-change",schedule);
 document.addEventListener("click",e=>{
   if(e.target.closest('[data-section="inicio"],[data-ma2="hoje"]'))setTimeout(schedule,150);
 });
 schedule();setTimeout(schedule,150);setTimeout(schedule,650);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.maGroupLivePanel={render,report};
})();