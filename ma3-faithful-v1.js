/* Meu Acompanhamento 3.0 — implementação fiel ao layout aprovado.
   Não substitui fluxos de negócio; utiliza exclusivamente resultados e card oficial existentes. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>Number.isFinite(n)?n.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%":"—";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp=iso=>iso?new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Fortaleza"}):"sem parcial";
const date=iso=>iso?new Date(iso).toLocaleDateString("pt-BR",{timeZone:"America/Fortaleza"}):new Date().toLocaleDateString("pt-BR",{timeZone:"America/Fortaleza"});
const manager=()=>["administrador","gerente","supervisor"].includes(state.role);
let previewKey="",previewURL="",renderQueued=false,pendingKey="";
function snap(){
 const d=state.day||{};
 const meta=Number(d.target_financial||0),sale=Number(d.sales_financial||0);
 const has=!!d.has_input&&!!d.captured_at;
 const curve=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
 const t=has?new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"America/Fortaleza"}).formatToParts(new Date(d.captured_at)):null;
 const hour=t?Number(t.find(x=>x.type==="hour")?.value||0):0;
 const minute=t?Number(t.find(x=>x.type==="minute")?.value||0):0;
 const rows=Array.isArray(curve)?curve.filter(x=>Number.isFinite(Number(x.fin))&&Number(x.fin)>=0&&Number.isFinite(Number(x.h))):[];
 const total=rows.reduce((v,r)=>v+Number(r.fin),0);
 const ratio=total>0?Math.max(0,Math.min(1,rows.reduce((v,r)=>v+Number(r.fin)*(hour>r.h?1:hour===r.h?minute/60:0),0)/total)):0;
 const projected=has&&meta>0&&ratio>=.08?sale/ratio:null;
 const projectedPct=projected===null?null:projected/meta*100;
 const flash=typeof window.getMA2FlashSnapshot==="function"?window.getMA2FlashSnapshot():null;
 return {has,meta,sale,att:has&&meta>0?sale/meta*100:null,projected,projectedPct,
  projectedGap:projected===null?null:projected-meta,flash,d,ratio};
}
function stat(label,value,detail,type=""){
 return '<article class="ma3-kpi '+type+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></article>';
}
function homeMarkup(data){
 const m=data.meta>0?fmt(data.meta):"—",v=data.has?fmt(data.sale):"—";
 const a=data.att!==null?pct(data.att):"—",proj=data.projectedPct!==null?pct(data.projectedPct):"—";
 const gap=data.projectedGap!==null?(data.projectedGap<0?"− ": "+ ")+fmt(Math.abs(data.projectedGap)):"—";
 const flash=data.flash?.total!=null?fmt(data.flash.total):"—";
 const sourceFlash=data.flash?.captured_at?"Coleta "+stamp(data.flash.captured_at):"Sem coleta disponível";
 const who=manager()?"Loja "+esc(state.storeCode):"Meu mundo";
 const storeSelector=state.role==="administrador"?'<button type="button" class="ma3-storejump" data-ma3="store">Alterar filial ▾</button>':"";
 const header='<div class="ma3-context"><div class="ma3-context-text"><span class="ma3-context-icon">▤</span><div>'+
   '<strong>'+who+'</strong><small>Resultado do dia · '+date(data.d.captured_at)+' · Atualizado '+stamp(data.d.captured_at)+'</small></div></div>'+
   '<div class="ma3-sources"><span title="Indicadores Flash dependem de coleta válida">▥ Flash: venda operacional <b>'+flash+'</b></span>'+
   '<span title="Base de metas, grupos e projeção">▣ Web: venda pura</span>'+storeSelector+'</div></div>';
 if(!manager()){
  const worlds=typeof window.getOfficialGgSummaries==="function"?window.getOfficialGgSummaries():[];
  const group=worlds.find(w=>w.group_code===state.world)||null;
  const gm=Number(group?.target_financial||0),gv=Number(group?.sales_financial||0);
  return header+'<div class="ma3-kpis ma3-staff">'+stat("Meu mundo",esc(group?.gg_label||"Resultado do mundo"),"Venda pura Web")+
    stat("Venda do mundo",data.has?fmt(gv):"—","Meta "+(gm>0?fmt(gm):"—"))+
    stat("Atingimento",data.has&&gm>0?pct(gv/gm*100):"—","Meu desempenho")+'</div>'+
    '<div class="ma3-inline"><button type="button" data-ma3="mundos">Ver meu mundo e DCOs →</button></div>';
 }
 return header+'<div class="ma3-kpis">'+
   stat("Venda pura Web",v,"Meta do dia: "+m)+
   stat("Atingimento atual",a,"Venda Web ÷ meta")+
   stat("Atingimento projetado",proj,"Tendência de fechamento","ma3-projected")+
   stat("Desvio projetado",gap,"Previsão − meta",data.projectedGap<0?"ma3-negative":"")+
  '</div>';
}
function prepareLayout(){
 const home=$("section-inicio"),shell=$("ma2Essential"),stage=$("ma2Stage");
 if(!home||!shell||!stage)return null;
 const radar=home.classList.contains("ma2-radar");
 home.classList.toggle("ma3-clean",!radar&&!!state.logged);
 if(radar)return null;
 if(stage.parentElement!==shell)shell.prepend(stage);
 // Carrossel atual é o original, montado pelo home-campaign-v1 no cabeçalho.
 const chart=$("clarityCurveChart")?.closest(".clarity-curve");
 if(chart&&chart.parentElement!==shell)shell.appendChild(chart);
 const legacy=home.querySelector(".home-group-panel");
 if(legacy&&legacy.parentElement!==shell)shell.appendChild(legacy);
 let preview=$("ma3Card");
 if(!preview){
  preview=document.createElement("section");preview.id="ma3Card";preview.className="ma3-cardbox";
  preview.innerHTML='<div class="ma3-cardtop"><div><span>PADRÃO INSTITUCIONAL</span><h2>Hora a Hora | Resultado dos Grupos</h2>'+
   '<p>Card oficial com ranking, evolução, desvio, projeção e venda física</p></div>'+
   '<button type="button" data-ma3="preview" class="ma3-outline">Ampliar ↗</button></div>'+
   '<div class="ma3-image-wrap"><div id="ma3PreviewStatus" role="status">Preparando card dos grupos…</div>'+
   '<img id="ma3CardImage" alt="Card institucional Hora a Hora | Resultado do Dia com tabela de grupos, 9 colunas e resumo rápido" hidden /></div>';
 }
 if(legacy&&preview.nextElementSibling!==legacy)legacy.insertAdjacentElement("beforebegin",preview);
 else if(!preview.parentElement)shell.appendChild(preview);
 let actions=$("ma3Actions");
 if(!actions){
  actions=document.createElement("div");actions.id="ma3Actions";actions.className="ma3-actions";
  actions.innerHTML='<button type="button" class="primary" data-ma3="paste">↻ Atualizar parcial</button>'+
   '<button type="button" data-ma3="radar">◎ Ver Radar</button>'+
   '<button type="button" data-ma3="share">↗ Compartilhar card</button>'+
   '<button type="button" data-ma3="download">⇩ Baixar imagem</button>';
 }
 if(preview&&preview.nextElementSibling!==actions)preview.insertAdjacentElement("afterend",actions);
 return {home,shell,stage,chart,legacy,preview};
}
function decorateChart(data,chart){
 if(!chart)return;
 const title=chart.querySelector(".clarity-card-head h2");
 if(title)title.textContent="Evolução da venda pura Web";
 const note=chart.querySelector("#clarityCurveContext");
 if(note)note.textContent="Venda real x meta proporcional à curva por horário";
 let side=$("ma3ChartForecast");
 if(!side){
  side=document.createElement("div");side.id="ma3ChartForecast";
  const area=chart.querySelector(".clarity-card-head");
  if(area)area.appendChild(side);
 }
 side.innerHTML='<span>Projeção de fechamento</span><strong>'+
   (data.projected!==null?fmt(data.projected):"—")+'</strong>';
 const legend=chart.querySelector(".ma2-legend");
 if(legend)legend.setAttribute("aria-label","Venda Web acumulada, curva e estimativa de fechamento");
}
function previewImage(){
 const el=$("ma3CardImage"),status=$("ma3PreviewStatus");
 if(!el||!status||!state.logged||!manager())return;
 const d=state.day||{};
 const key=String(state.matricula)+":"+state.storeCode+":"+(d.captured_at||"none")+":"+Number(d.sales_financial||0);
 if(key===previewKey)return;
 if(key===pendingKey)return;
 if(!d.has_input){
  el.hidden=true;status.hidden=false;status.textContent="Aguarde a primeira venda pura Web para gerar o card oficial.";
  return;
 }
 if(typeof window.maGetDailyCardBlob!=="function"){
  el.hidden=true;status.hidden=false;status.textContent="O gerador do card está carregando…";
  return;
 }
 pendingKey=key;status.hidden=false;status.textContent="Atualizando card oficial…";
 Promise.resolve().then(()=>window.maGetDailyCardBlob()).then(blob=>{
  if(pendingKey!==key||!blob)return;
  const url=URL.createObjectURL(blob);
  if(previewURL)URL.revokeObjectURL(previewURL);
  previewURL=url;previewKey=key;
  const current=$("ma3CardImage");
  if(current){current.src=url;current.hidden=false;const st=$("ma3PreviewStatus");if(st)st.hidden=true;}
 }).catch(err=>{
  if(pendingKey!==key)return;
  const status=$("ma3PreviewStatus"),el=$("ma3CardImage");
  if(status){status.hidden=false;status.textContent="Não foi possível gerar a prévia: "+(err.message||"tente após atualizar a parcial");}
  if(el)el.hidden=true;
 }).finally(()=>{if(pendingKey===key)pendingKey=""});
}
function lightbox(){
 let dialog=$("ma3PreviewModal");
 if(!dialog){
  dialog=document.createElement("dialog");dialog.id="ma3PreviewModal";dialog.className="ma3-dialog";
  dialog.innerHTML='<div class="ma3-modalhead"><strong>Card oficial · Hora a Hora</strong><button type="button" data-ma3="close">Fechar ×</button></div>'+
   '<div class="ma3-zoomwrap"><img id="ma3ZoomedCard" alt="Visualização ampliada do card Hora a Hora" /></div>';
  document.body.appendChild(dialog);
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
 }
 const img=$("ma3CardImage");
 if(!img||img.hidden||!img.src){window.maShareDailyGroupCard?.();return}
 $("ma3ZoomedCard").src=img.src;
 if(!dialog.open)dialog.showModal();
}
function render(){
 if(!state.logged||!$("ma2Stage"))return;
 const obj=prepareLayout();
 if(!obj)return;
 const data=snap();
 obj.stage.innerHTML=homeMarkup(data);
 const show=manager();
 if(obj.chart)obj.chart.hidden=!show;
 if(obj.preview)obj.preview.hidden=!show;
 const actions=$("ma3Actions");if(actions)actions.hidden=!show;
 if(show){decorateChart(data,obj.chart);previewImage();}
}
function enqueue(){
 if(renderQueued)return;
 renderQueued=true;
 requestAnimationFrame(()=>{renderQueued=false;render();});
}
document.addEventListener("click",event=>{
 const action=event.target.closest("[data-ma3]")?.dataset.ma3;
 if(!action){
  if(event.target.closest("[data-ma2],[data-section],[data-more-section],[data-world]"))enqueue();
  return;
 }
 if(action==="paste"){window.showPaste?.();return}
 if(action==="radar"){document.querySelector('.mobile-dock [data-ma2="radar"]')?.click();return}
 if(action==="mundos"){window.setSection?.("grupos");return}
 if(action==="preview"){lightbox();return}
 if(action==="close"){$("ma3PreviewModal")?.close();return}
 if(action==="share"){window.maShareDailyGroupCard?.();return}
 if(action==="download"){window.maDownloadGroupCard?.();return}
 if(action==="store"){
  const existing=$("homeAdminStoreSelect")||$("adminStoreSelect");
  if(existing){existing.focus();existing.click();}
 }
});
document.addEventListener("ma:dashboard-ready",enqueue);
document.addEventListener("ma:flash-update",enqueue);
document.addEventListener("ma:flash-clear",enqueue);
document.addEventListener("ma:section-change",enqueue);
document.addEventListener("change",e=>{
 if(e.target?.id==="homeAdminStoreSelect"||e.target?.id==="adminStoreSelect")enqueue();
});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(enqueue,50));
else setTimeout(enqueue,50);
window.renderMA3=enqueue;
})();