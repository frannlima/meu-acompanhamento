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
 const ly=Number(d.ly_financial||0);
 const evolution=has&&ly>0?(sale/ly-1)*100:null;
 return {has,meta,sale,ly,evolution,att:has&&meta>0?sale/meta*100:null,projected,projectedPct,
  projectedGap:projected===null?null:projected-meta,flash,d,ratio};
}
function stat(label,value,detail,type="",extra=""){
 return '<article class="ma3-kpi '+type+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small>'+extra+'</article>';
}
function homeMarkup(data){
 const m=data.meta>0?fmt(data.meta):"—",v=data.has?fmt(data.sale):"—";
 const a=data.att!==null?pct(data.att):"—",proj=data.projectedPct!==null?pct(data.projectedPct):"—";
 const evolution=data.evolution;
 const aaTrend=evolution===null
   ?'<span class="ma5-trend neutral">Vs A.A.: indisponível</span>'
   :evolution>0
    ?'<span class="ma5-trend positive" aria-label="Evolução positiva versus ano anterior">▲ +'+pct(evolution)+' vs A.A.</span>'
    :evolution<0
      ?'<span class="ma5-trend negative" aria-label="Retração versus ano anterior">▼ '+pct(evolution)+' vs A.A.</span>'
      :'<span class="ma5-trend neutral">● 0,0% vs A.A.</span>';
 const gap=data.projectedGap!==null?(data.projectedGap<0?"− ": "+ ")+fmt(Math.abs(data.projectedGap)):"—";
 const flash=data.flash?.total!=null?fmt(data.flash.total):"—";
 const sourceFlash=data.flash?.captured_at?"Coleta "+stamp(data.flash.captured_at):"Sem coleta disponível";
 const who=manager()?"Loja "+esc(state.storeCode):"Meu mundo";
 const originalSelect=$("homeAdminStoreSelect")||$("adminStoreSelect");
 const savedCodes=Array.isArray(window.STORE_CODES)?window.STORE_CODES:["073","084","108","113","138","142","146","175","177","222","238","258","262","314","318","344","350","552"];
 const codes=originalSelect?.options?.length?Array.from(originalSelect.options).map(o=>String(o.value||"").padStart(3,"0")).filter(v=>/^\d{3}$/.test(v)) : savedCodes;
 const storeSelector=state.role==="administrador"?'<label class="ma3-switch"><span>Filial</span><select id="ma3SwitchStore" aria-label="Selecionar filial">'+
 [...new Set(codes)].map(code=>'<option value="'+esc(code)+'"'+(String(state.storeCode).padStart(3,"0")===code?' selected':'')+'>Loja '+esc(code)+'</option>').join("")+
 '</select></label>':"";
 const header='<div class="ma3-context"><div class="ma3-context-text"><span class="ma3-context-icon">▤</span><div>'+
   '<strong>'+who+'</strong><small>Resultado do dia · '+date(data.d.captured_at)+' · Atualizado '+stamp(data.d.captured_at)+'</small></div></div>'+
   '<div class="ma3-sources"><span title="Indicadores Flash dependem de coleta válida">▥ Flash: venda operacional <b>'+flash+'</b></span>'+
   '<span title="Base de metas, grupos e projeção">▣ Venda Automação Web</span>'+storeSelector+'</div></div>';
 if(!manager()){
  const worlds=typeof window.getOfficialGgSummaries==="function"?window.getOfficialGgSummaries():[];
  const worldCode=String(state.world||"");
  const belongs=g=>{
    const group=String(g.group_code||"").toLowerCase();
    if(group===worldCode||group.startsWith(worldCode+"_"))return true;
    if(worldCode==="beleza_relogios")return /beleza|relogios|relógios/.test(group);
    if(worldCode==="infantil")return /infantil|carter/.test(group);
    return false;
  };
  const matches=worlds.filter(belongs);
  const gm=matches.reduce((n,g)=>n+Number(g.target_financial||0),0);
  const gv=matches.reduce((n,g)=>n+Number(g.sales_financial||0),0);
  const worldLabel={feminino:"Feminino",masculino:"Masculino",infantil:"Infantil",casa:"Casa",beleza_relogios:"Beleza"}[worldCode]||"meu mundo";
  return header+'<div class="ma3-kpis ma3-staff">'+stat("Meu mundo",esc(worldLabel),"Venda Automação Web")+
    stat("Venda do mundo",data.has?fmt(gv):"—","Meta "+(gm>0?fmt(gm):"—"))+
    stat("Atingimento",data.has&&gm>0?pct(gv/gm*100):"—","Meu desempenho")+'</div>'+
    '<div class="ma3-inline"><button type="button" data-ma3="mundos">Ver meu mundo e DCOs →</button></div>';
 }
 return header+'<div class="ma3-kpis">'+
   stat("Venda Automação Web",v,"Meta do dia: "+m,"",aaTrend)+
   stat("Atingimento atual",a,"Venda Web ÷ meta")+
   stat("Atingimento projetado",proj,"Tendência de fechamento","ma3-projected")+
   stat("Desvio projetado",gap,"Previsão − meta",data.projectedGap<0?"ma3-negative":"")+
  '</div>';
}
function displayFirstName(){
 const raw=String(state.employeeName||state.user?.name||"").trim();
 if(!raw)return "equipe";
 const first=raw.split(/\s+/)[0];
 return first.substring(0,1).toLocaleUpperCase("pt-BR")+first.substring(1).toLocaleLowerCase("pt-BR");
}
function greetingForStore(){
 const time=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Fortaleza",hour:"2-digit",hourCycle:"h23"}).format(new Date());
 const hour=Number(time);
 return hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
}
function greetingAboveCarousel(){
 const slot=$("homeCampaignSlot");
 if(!slot||!state.logged)return;
 let card=$("ma5Greeting");
 if(!card){
  card=document.createElement("div");
  card.id="ma5Greeting";card.className="ma5-greeting";
  card.setAttribute("aria-label","Saudação personalizada");
  card.innerHTML='<span class="ma5-ria-symbol"><img src="./assets/ria-logo-approved.svg" alt="Símbolo RIA"></span>'+
    '<div class="ma5-greeting-text"><strong id="ma5GreetingText"></strong><small>O simples é incrível.</small></div>';
  slot.prepend(card);
 }
 const line=$("ma5GreetingText");
 if(line)line.textContent=greetingForStore()+", "+displayFirstName()+"!";
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
 // Nunca exibir por alguns instantes a venda de outra filial após troca de loja.
 el.hidden=true;status.hidden=false;status.textContent="Atualizando card oficial…";
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
 greetingAboveCarousel();
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
  if(event.target.closest("#ma3CardImage")){lightbox();return}
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

});
document.addEventListener("ma:dashboard-ready",enqueue);
document.addEventListener("ma:flash-update",enqueue);
document.addEventListener("ma:flash-clear",enqueue);
document.addEventListener("ma:section-change",enqueue);
document.addEventListener("change",e=>{
 if(e.target?.id==="ma3SwitchStore"&&state.role==="administrador"){
  const existing=$("homeAdminStoreSelect")||$("adminStoreSelect");
  if(existing){existing.value=e.target.value;existing.dispatchEvent(new Event("change",{bubbles:true}));}
  else if(typeof window.changeAdminStore==="function")window.changeAdminStore(e.target.value);
  enqueue();
 }
 if(e.target?.id==="homeAdminStoreSelect"||e.target?.id==="adminStoreSelect")enqueue();
});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(enqueue,50));
else setTimeout(enqueue,50);
window.renderMA3=enqueue;
})();