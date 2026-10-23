/* Meu Acompanhamento | gestão interativa dos grupos por GG • 2026 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const own=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>Number.isFinite(n)?n.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%":"—";
const signed=n=>(n<0?"− ":"+ ")+money(Math.abs(n));
const safe=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const zone="America/Fortaleza";
const clock=iso=>{
 const v=new Date(iso||Date.now());
 const p=new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(v);
 return (Number(p.find(x=>x.type==="hour")?.value||0)%24)*60+Number(p.find(x=>x.type==="minute")?.value||0);
};
const date=iso=>!iso||!Number.isFinite(Date.parse(iso))?"":new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
const hhmm=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
function curveParts(){
 const raw=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
 const rows=(Array.isArray(raw)?raw:[]).map(x=>({h:Number(x.h),w:Number(x.fin)})).filter(x=>Number.isInteger(x.h)&&x.w>0&&Number.isFinite(x.w));
 const total=rows.reduce((sum,x)=>sum+x.w,0);
 return total>0?rows.map(x=>({h:x.h,w:x.w/total})):[];
}
function portion(rows,minute){
 return Math.max(0,Math.min(1,rows.reduce((sum,r)=>sum+r.w*Math.max(0,Math.min(1,(minute-r.h*60)/60)),0)));
}
function groups(){
 const raw=typeof window.getOfficialGgSummaries==="function"?window.getOfficialGgSummaries():[];
 const d=state.day||{},valid=!!d.has_input&&date(d.captured_at)===(typeof localDate==="function"?localDate():date(new Date().toISOString()));
 const rows=curveParts(),now=valid?clock(d.captured_at):null,elapsed=now===null?null:portion(rows,now);
 const minutes=Number(d.interval_minutes||0);
 const prev=now===null?null:Math.max(0,now-minutes);
 const intervalFraction=prev!==null&&minutes>0&&rows.length?portion(rows,now)-portion(rows,prev):null;
 const details=Array.isArray(state.detail?.rows)?state.detail.rows:[];
 const hasInterval=valid&&intervalFraction!==null&&intervalFraction>0&&details.some(r=>r.interval_sales_financial!==undefined&&r.interval_sales_financial!==null);
 const gg=raw.map((r,i)=>{
   const name=r.gg_label||r.group_code||"Grupo";
   const meta=Math.max(0,Number(r.target_financial)||0),sale=Number(r.sales_financial)||0,ly=Number(r.ly_financial)||0;
   const abs=valid&&meta>0?sale-meta:null;
   const curveGap=valid&&elapsed!==null&&meta>0?sale-meta*elapsed:null;
   const actualInterval=hasInterval?Number(r.interval_sales_financial||0):null;
   const expectedInterval=hasInterval&&meta>0?meta*intervalFraction:null;
   return {key:own(name),name,meta,sale,ly,att:valid&&meta>0?sale/meta*100:null,
     evo:valid&&ly>0?(sale/ly-1)*100:null,
     abs,curveGap,hourGap:actualInterval!==null&&expectedInterval!==null?actualInterval-expectedInterval:null,
     actualInterval,expectedInterval,index:i};
 });
 const dayPriority=gg.filter(r=>r.abs!==null&&r.abs<0).sort((a,b)=>a.abs-b.abs).slice(0,2);
 const hourPriority=gg.filter(r=>r.hourGap!==null&&r.hourGap<0).sort((a,b)=>a.hourGap-b.hourGap).slice(0,2);
 return {gg,byKey:new Map(gg.map(g=>[g.key,g])),day:new Set(dayPriority.map(r=>r.key)),hour:new Set(hourPriority.map(r=>r.key)),
  valid,intervalFraction,intervalMinutes:hasInterval?minutes:null,now,elapsed};
}
function dcoPressure(group,analytics){
 const officialTarget=Array.isArray(state.ggTargets)?state.ggTargets:[];
 const actual=Array.isArray(state.detail?.rows)?state.detail.rows:[];
 const map=new Map();
 function name(r){return typeof window.getOfficialGgForDco==="function"?window.getOfficialGgForDco(r.dco_code):null;}
 for(const r of officialTarget){
   if(own(name(r))!==group.key)continue;
   const code=Number(r.dco_code);if(!code)continue;
   map.set(code,{...r});
 }
 for(const r of actual){
   if(own(name(r))!==group.key)continue;
   const code=Number(r.dco_code);if(!code)continue;
   map.set(code,{...(map.get(code)||{}),...r});
 }
 return [...map.values()].map(r=>{
   const code=Number(r.dco_code),meta=Number(r.target_financial)||0,sale=Number(r.sales_financial)||0,ly=Number(r.ly_financial)||0;
   const gap=analytics.valid&&meta>0&&analytics.elapsed!==null?sale-meta*analytics.elapsed:null;
   return {code,label:String(r.department||r.dco_name||"DCO "+code).replace(/^\d+\s*[-–]?\s*/,""),meta,sale,ly,
     evo:analytics.valid&&ly>0?(sale/ly-1)*100:null,gap,
     abs:analytics.valid&&meta>0?sale-meta:null};
 }).filter(r=>r.meta>0).sort((a,b)=>(a.gap===null?Infinity:a.gap)-(b.gap===null?Infinity:b.gap));
}
function positionAlert(group,analytics){
 const day=analytics.day.has(group.key),hour=analytics.hour.has(group.key);
 return {day,hour,className:(day?" gi-alert-day":"")+(hour?" gi-alert-hour":""),
  badges:(day?'<span class="gi-mini-alert gi-mini-day">DESVIO DIA</span>':"")+
         (hour?'<span class="gi-mini-alert gi-mini-hour">IMPACTO HORA</span>':"")};
}
function quickBox(){
 let shell=$("giQuickOverlay");
 if(shell)return shell;
 shell=document.createElement("div");
 shell.id="giQuickOverlay";shell.className="gi-quick-overlay";shell.hidden=true;
 shell.innerHTML='<div class="gi-quick-shade" data-gi-close="1"></div>'+
  '<section class="gi-quick-sheet" role="dialog" aria-modal="true" aria-labelledby="giQuickTitle" tabindex="-1">'+
  '<header><div><span>RAIO-X DO GRUPO</span><h2 id="giQuickTitle">Grupo</h2></div>'+
  '<button type="button" id="giQuickClose" data-gi-close="1" aria-label="Voltar ao painel de grupos">✕</button></header>'+
  '<div id="giQuickBody" class="gi-quick-body"></div>'+
  '<footer><button type="button" data-gi-close="1">← Voltar ao painel de grupos</button></footer></section>';
 document.body.appendChild(shell);
 shell.addEventListener("click",e=>{if(e.target.closest("[data-gi-close]"))close();});
 return shell;
}
let restoreFocus=null,restoreScroll=null,activeKey=null;
function open(key,origin){
 const analytics=groups(),g=analytics.byKey.get(key);
 if(!g)return;
 const box=quickBox(),pressure=dcoPressure(g,analytics).filter(r=>r.gap!==null&&r.gap<-.005).slice(0,3);
 const ranking=positionAlert(g,analytics);
 activeKey=key;restoreFocus=origin||null;restoreScroll=window.scrollY;
 box.querySelector("#giQuickTitle").textContent=g.name;
 const tile=(label,value,positive,sub)=>'<article><small>'+label+'</small>'+
  '<strong class="'+(positive===null?"":positive?"positive":"negative")+'">'+value+'</strong>'+
  (sub?'<span>'+sub+'</span>':"")+'</article>';
 const t=analytics.now===null?"—":hhmm(analytics.now);
 const cards=
 tile("Meta financeira",money(g.meta),null,"Meta oficial do GG")+
 tile("Venda real",analytics.valid?money(g.sale):"—",null,"Última parcial registrada")+
 tile("Atingimento",g.att===null?"—":pct(g.att),g.att===null?null:g.att>=100,"Venda ÷ meta")+
 tile("Evolução vs A.A.",g.evo===null?"—":(g.evo>=0?"▲ ":"▼ ")+pct(g.evo),g.evo===null?null:g.evo>=0,"Comparação com LY do grupo")+
 tile("Desvio do dia",g.abs===null?"—":signed(g.abs),g.abs===null?null:g.abs>=0,"Venda − meta total")+
 tile("Desvio até a parcial",g.curveGap===null?"—":signed(g.curveGap),g.curveGap===null?null:g.curveGap>=0,"Venda − meta proporcional")+
 tile("Último intervalo",g.actualInterval===null?"—":money(g.actualInterval),null,analytics.intervalMinutes===null?"Sem intervalo comparável":"Período de "+analytics.intervalMinutes+" min")+
 tile("Impacto vs curva/hora",g.hourGap===null?"—":signed(g.hourGap),g.hourGap===null?null:g.hourGap>=0,"Diferença no intervalo entre inputs");
 const detailRows=pressure.length?pressure.map((r,i)=>
  '<div class="gi-dco-row"><div><b>'+String(i+1).padStart(2,"0")+' · DCO '+r.code+'</b><span>'+safe(r.label)+'</span>'+
  '<small>Meta '+money(r.meta)+' · Venda '+money(r.sale)+' · Ev. '+(r.evo===null?"—":pct(r.evo))+'</small></div>'+
  '<strong>'+signed(r.gap)+'</strong></div>').join(""):
  '<p class="gi-no-dco">'+(analytics.valid?"Nenhum DCO com desvio negativo proporcional disponível nesta parcial.":"Aguardando parcial ou meta por DCO para identificar os maiores impactos.")+'</p>';
 box.querySelector("#giQuickBody").innerHTML=
  (ranking.day||ranking.hour?'<div class="gi-quick-alert">'+ranking.badges+'</div>':"")+
  '<p class="gi-context">Loja '+safe(state.storeCode)+' · Referência '+t+' · Dados do último input, sem valores presumidos.</p>'+
  '<div class="gi-quick-metrics">'+cards+'</div>'+
  '<section class="gi-dco-block"><div class="gi-dco-head"><h3>Onde está o maior impacto?</h3><p>Até 3 DCOs abaixo da meta proporcional à hora da última parcial</p></div>'+detailRows+'</section>'+
  '<p class="gi-quick-footnote">Os desvios do dia usam a meta total. Os desvios horários usam a curva histórica e somente intervalos comparáveis; não representam previsão garantida.</p>';
 box.hidden=false;document.body.classList.add("gi-quick-open");
 box.querySelector("#giQuickClose").focus();
}
function close(){
 const b=$("giQuickOverlay");if(!b||b.hidden)return;
 b.hidden=true;document.body.classList.remove("gi-quick-open");
 if(Number.isFinite(restoreScroll))window.scrollTo({top:restoreScroll,behavior:"instant"});
 if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});
 activeKey=null;restoreFocus=null;
}
function cardMarkup(g,analytics){
 const a=positionAlert(g,analytics);
 return '<article class="gi-mobile-group'+a.className+'">'+
  '<button type="button" class="gi-mobile-trigger" data-gi-group="'+safe(g.key)+'" aria-label="Abrir detalhes do grupo '+safe(g.name)+'">'+
  '<div class="gi-mobile-top"><strong>'+safe(g.name)+'</strong><span>Consultar <b>›</b></span></div>'+
  (a.badges?'<div class="gi-mobile-badges">'+a.badges+'</div>':"")+
  '<div class="gi-mobile-stats"><span><small>VENDA</small><b>'+(analytics.valid?money(g.sale):"—")+'</b></span>'+
   '<span><small>ATINGIMENTO</small><b class="'+(g.att!==null&&g.att<100?"gi-red":"")+'">'+(g.att===null?"—":pct(g.att))+'</b></span>'+
   '<span><small>DESVIO DIA</small><b class="'+(g.abs!==null&&g.abs<0?"gi-red":"")+'">'+(g.abs===null?"—":signed(g.abs))+'</b></span>'+
   '<span><small>EVOLUÇÃO</small><b class="'+(g.evo!==null&&g.evo<0?"gi-red":"")+'">'+(g.evo===null?"—":pct(g.evo))+'</b></span></div>'+
  '</button></article>';
}
function enhance(target,analytics){
 const host=$(target),table=host?.querySelector("table");if(!host||!table||table.dataset.giEnhanced)return;
 const isFull=table.classList.contains("group-share-table");
 if(!isFull&&!table.classList.contains("clarity-table"))return;
 table.dataset.giEnhanced="1";
 const tbody=table.tBodies[0];if(!tbody)return;
 const byKey=analytics.byKey;
 for(const row of [...tbody.rows]){
   if(row.classList.contains("group-total-row")||row.classList.contains("clarity-total"))continue;
   const label=row.cells[0];if(!label)continue;
   const key=own(label.textContent),g=byKey.get(key);if(!g)continue;
   const flag=positionAlert(g,analytics);
   row.classList.add("gi-interactive-row");
   if(flag.day)row.classList.add("gi-alert-day");
   if(flag.hour)row.classList.add("gi-alert-hour");
   row.dataset.giGroup=key;
   // O botão ocupa apenas a célula do nome. O quadro e todas as colunas permanecem.
   const btn=document.createElement("button");btn.type="button";btn.className="gi-open-group";
   btn.dataset.giGroup=key;btn.setAttribute("aria-label","Ver indicadores e maiores desvios do grupo "+g.name);
   btn.innerHTML='<span class="gi-group-text">'+safe(g.name)+'</span><span class="gi-open-chevron" aria-hidden="true">›</span>';
   label.replaceChildren(btn);
   if(flag.badges){
     const badges=document.createElement("span");badges.className="gi-row-flags";badges.innerHTML=flag.badges;label.appendChild(badges);
   }
 }
 let list=host.querySelector(".gi-mobile-list");
 if(!list){list=document.createElement("div");list.className="gi-mobile-list";list.setAttribute("aria-label","Visão completa dos grupos no celular");
  const wrapper=isFull?table.closest(".group-share-table-wrap"):table;wrapper.insertAdjacentElement("afterend",list);
 }
 const ordered=[...tbody.rows].filter(r=>r.dataset.giGroup).map(r=>byKey.get(r.dataset.giGroup)).filter(Boolean);
 list.innerHTML=ordered.map(r=>cardMarkup(r,analytics)).join("");
}
let pending=false;
function run(){
 if(!state.logged)return;
 const analytics=groups();
 for(const id of ["homeGroupSharePanel","groupSharePanel","groupPanelModalContent","clarityGroupsTable"])enhance(id,analytics);
}
function queue(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;run();});}
function boot(){
 document.addEventListener("ma:dashboard-ready",()=>setTimeout(queue,110));
 document.addEventListener("click",e=>{
   const button=e.target.closest(".gi-open-group,.gi-mobile-trigger");
   if(button){e.preventDefault();open(button.dataset.giGroup,button);return;}
   if(e.target.closest('[data-section="inicio"],#openGroupPanel,#openGroupPanelHome'))setTimeout(queue,80);
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("giQuickOverlay")?.hidden)close();});
 const roots=["homeGroupSharePanel","groupSharePanel","groupPanelModalContent","clarityGroupsTable"];
 roots.forEach(id=>{
   const el=$(id);
   if(el)new MutationObserver(muts=>{
     // As fontes redesenham o HTML: reprocessar só quando a tabela for substituída.
     if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&
       (n.matches?.("table,.group-share-table-wrap")||n.querySelector?.("table")))))queue();
   }).observe(el,{childList:true,subtree:true});
 });
 queue();setTimeout(queue,400);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.maGroupImpact={getAnalysis:groups,open,close,refresh:queue};
})();