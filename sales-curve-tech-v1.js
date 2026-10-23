/* Meu Acompanhamento • Curva Inteligente Touch | dados oficiais, sem dependências externas */
(function(){
"use strict";
const DATE_ZONE="America/Fortaleza";
const get=id=>document.getElementById(id);
const currency=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const compact=n=>Math.abs(n)>=1000?Math.round(n/1000).toLocaleString("pt-BR")+" mil":Math.round(n).toLocaleString("pt-BR");
const percent=n=>Number.isFinite(n)?n.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%":"—";
const signed=n=>(n>=0?"+":"−")+currency(Math.abs(n));
const fmtHour=h=>String(h).padStart(2,"0")+"h";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dateKey=iso=>{if(!iso||!Number.isFinite(Date.parse(iso)))return "";return new Intl.DateTimeFormat("en-CA",{timeZone:DATE_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));};
const minutes=iso=>{const d=new Date(iso),p=new Intl.DateTimeFormat("en-GB",{timeZone:DATE_ZONE,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d);return Number(p.find(x=>x.type==="hour")?.value||0)%24*60+Number(p.find(x=>x.type==="minute")?.value||0);};
const atTime=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(Math.floor(n%60)).padStart(2,"0");
const path=pts=>pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
let activeMode="acumulado",selected=null,currentData=null,observer=null,observed=null,queued=false,painting=false;

function build(){
 const d=state.day||{},today=typeof localDate==="function"?localDate():dateKey(new Date().toISOString());
 const raw=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
 const rows=(Array.isArray(raw)?raw:[]).map(r=>({h:Number(r.h),w:Number(r.fin)}))
   .filter(r=>Number.isInteger(r.h)&&r.h>=0&&r.h<24&&Number.isFinite(r.w)&&r.w>0).sort((a,b)=>a.h-b.h);
 const sum=rows.reduce((s,r)=>s+r.w,0);
 if(sum>0)rows.forEach(r=>r.w/=sum);
 const target=Number(d.target_financial)>0?Number(d.target_financial):null;
 const closing=["084","113","146"].includes(String(state.storeCode).padStart(3,"0"))?18:22;
 const opening=rows.length?rows[0].h:10,now=minutes(new Date().toISOString());
 const progress=t=>clamp(rows.reduce((s,r)=>s+r.w*clamp((t-r.h*60)/60,0,1),0),0,1);
 const snapshots=(Array.isArray(state.history)?state.history:[])
   .filter(r=>dateKey(r.captured_at)===today&&Number.isFinite(Number(r.sales_financial))&&Number(r.sales_financial)>=0)
   .map(r=>({t:minutes(r.captured_at),v:Number(r.sales_financial),iso:r.captured_at}));
 if(d.has_input&&dateKey(d.captured_at)===today&&Number.isFinite(Number(d.sales_financial))&&Number(d.sales_financial)>=0)
   snapshots.push({t:minutes(d.captured_at),v:Number(d.sales_financial),iso:d.captured_at});
 snapshots.sort((a,b)=>Date.parse(a.iso)-Date.parse(b.iso));
 const dedup=[];
 for(const point of snapshots){
   if(point.t<opening*60||point.t>closing*60)continue;
   const last=dedup[dedup.length-1];
   if(last&&last.t===point.t){dedup[dedup.length-1]=point;}else dedup.push(point);
 }
 const last=dedup.at(-1)||null;
 const expected=last&&target!==null?target*progress(last.t):null;
 const gap=last&&expected!==null?last.v-expected:null;
 const fraction=last?progress(last.t):0;
 const projection=last&&target!==null&&fraction>=.08?last.v/fraction:null;
 const slots=rows.filter(r=>r.h>=opening&&r.h<closing).map(r=>{
   const observations=dedup.filter(p=>Math.floor(p.t/60)===r.h);
   const point=observations.at(-1)||null;
   const goal=target!==null?target*r.w:null;
   const baseExpected=point&&target!==null?target*progress(point.t):null;
   return {h:r.h,w:r.w,goal,point,expected:baseExpected,delta:point&&baseExpected!==null?point.v-baseExpected:null};
 });
 const future=slots.filter(r=>r.h>Math.floor(now/60));
 const remainingWeight=future.reduce((s,r)=>s+r.w,0);
 const deficit=gap!==null&&gap<0?-gap:0;
 const recoverable=remainingWeight>0?deficit:0;
 slots.forEach(r=>{r.extra=r.h>Math.floor(now/60)&&remainingWeight>0?recoverable*r.w/remainingWeight:0;r.adjusted=(r.goal||0)+r.extra;});
 const intervals=[];
 for(let i=1;i<dedup.length;i++){
   const a=dedup[i-1],b=dedup[i],deltaTime=b.t-a.t;
   if(deltaTime<=0)continue;
   const real=b.v-a.v,goal=target===null?null:target*(progress(b.t)-progress(a.t));
   intervals.push({from:a.t,to:b.t,real,goal,gap:goal===null?null:real-goal,minutes:deltaTime});
 }
 const futurePeak=future.length?future.reduce((best,r)=>r.w>best.w?r:best):null;
 return {rows,slots,intervals,target,opening,closing,now,points:dedup,last,progress,expected,gap,projection,deficit,recoverable,remainingWeight,futurePeak};
}
function chartGeometry(m){
 const small=window.matchMedia?.("(max-width:620px)")?.matches||false;
 return {W:small?460:900,H:small?300:335,L:small?57:83,R:small?15:25,T:small?25:24,B:small?49:53};
}
function svgGraph(m,mode,selectKey){
 const {W,H,L,R,T,B}=chartGeometry(m);
 const drawW=W-L-R,drawH=H-T-B,from=m.opening,to=m.closing;
 const minmax=[m.target||0,m.projection||0,...m.points.map(p=>p.v)];
 const modeIntervals=mode==="intervalos",modeRecovery=mode==="recuperacao";
 const intList=m.intervals.slice(-8),recList=m.slots.filter(s=>s.h>=Math.floor(m.now/60)&&s.h<m.closing);
 if(modeIntervals)minmax.push(...intList.map(p=>p.real),...intList.map(p=>p.goal||0));
 if(modeRecovery)minmax.push(...recList.map(s=>s.adjusted),...recList.map(s=>s.goal||0));
 const ymax=Math.max(1,...minmax.filter(Number.isFinite))*1.12;
 const fmt=(n)=>Number(n).toFixed(1);
 const yy=v=>T+drawH*(1-clamp(v/ymax,0,1));
 const xx=t=>L+(t-from*60)/Math.max(1,(to-from)*60)*drawW;
 const barMode=modeIntervals||modeRecovery;
 let grid="";
 for(let i=0;i<=4;i++){
   const v=ymax*i/4,y=yy(v);
   grid+='<line x1="'+L+'" y1="'+fmt(y)+'" x2="'+(W-R)+'" y2="'+fmt(y)+'" stroke="#41645A" opacity=".35" stroke-dasharray="3 7"/>'+
    '<text x="'+(L-9)+'" y="'+fmt(y+4)+'" text-anchor="end" fill="#A7BEB4" font-size="'+(W<500?11:12)+'">'+esc(compact(v))+'</text>';
 }
 if(barMode){
   const list=modeIntervals?intList:recList;
   if(!list.length)return '<div class="mt-graph-empty">'+(modeIntervals?"É necessário ter pelo menos duas parciais válidas para comparar intervalos.":"Não há faixas futuras para recuperação nesta etapa do dia.")+'</div>';
   const count=list.length,col=drawW/count,width=Math.min(29,col*.28);
   let bars="";
   list.forEach((r,i)=>{
     const value=modeIntervals?r.real:r.adjusted,base=modeIntervals?r.goal:r.goal;
     const sx=L+col*(i+.5),selectedKey=modeIntervals?"i"+(m.intervals.length-intList.length+i):"h"+r.h;
     const selected=selectKey===selectedKey;
     const firstY=yy(Math.max(0,base||0)),secondY=yy(Math.max(0,value||0));
     bars+='<rect x="'+fmt(sx-width-3)+'" y="'+fmt(firstY)+'" width="'+fmt(width)+'" height="'+fmt(Math.max(0,T+drawH-firstY))+'" rx="5" fill="#9BAFA7" opacity="'+(selected?".94":".55")+'"/>'+
       '<rect x="'+fmt(sx+3)+'" y="'+fmt(secondY)+'" width="'+fmt(width)+'" height="'+fmt(Math.max(0,T+drawH-secondY))+'" rx="5" fill="'+(modeRecovery?"#F3A650":value>=(base||0)?"#4DE0A6":"#FB7781")+'" opacity="'+(selected?1:".85")+'"/>'+
       '<text x="'+fmt(sx)+'" y="'+(H-18)+'" fill="#BBD5C9" font-size="'+(W<500?12:13)+'" text-anchor="middle">'+(modeIntervals?atTime(r.to):fmtHour(r.h))+'</text>';
     if(selected)bars+='<line x1="'+fmt(sx)+'" x2="'+fmt(sx)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#91FFE0" opacity=".58" stroke-dasharray="3 4"/>';
   });
   return '<svg class="mt-svg" role="img" aria-label="'+(modeIntervals?"Venda real e esperada por intervalo entre parciais":"Meta base e meta ajustada por recuperação nas próximas horas")+'" viewBox="0 0 '+W+' '+H+'">'+grid+bars+'</svg>';
 }
 const expectedPts=[{t:from*60,v:0}];
 m.rows.filter(r=>r.h<to).forEach(r=>expectedPts.push({t:(r.h+1)*60,v:(m.target||0)*m.progress((r.h+1)*60)}));
 const exPath=path(expectedPts.map(p=>[xx(p.t),yy(p.v)]));
 const realPts=m.points.map(p=>[xx(p.t),yy(p.v)]);
 const realPath=path(realPts);
 const projected=[];
 if(m.last&&m.projection!==null&&m.last.t<to*60){
   const endFrac=m.progress(to*60),currentFrac=m.progress(m.last.t),denom=Math.max(.0001,endFrac-currentFrac);
   projected.push({t:m.last.t,v:m.last.v});
   m.rows.filter(r=>r.h>=Math.floor(m.last.t/60)&&r.h<to).forEach(r=>{
     const t=(r.h+1)*60;if(t<=m.last.t)return;
     projected.push({t,v:m.last.v+(m.projection-m.last.v)*clamp((m.progress(t)-currentFrac)/denom,0,1)});
   });
 }
 const projPath=path(projected.map(p=>[xx(p.t),yy(p.v)]));
 let ticks="";
 const step=W<500?3:2;
 for(let h=from;h<=to;h+=step)ticks+='<text x="'+fmt(xx(h*60))+'" y="'+(H-17)+'" text-anchor="middle" fill="#AEC9BF" font-size="'+(W<500?12:13)+'">'+fmtHour(h)+'</text>';
 if((to-from)%step!==0)ticks+='<text x="'+fmt(xx(to*60))+'" y="'+(H-17)+'" text-anchor="middle" fill="#AEC9BF" font-size="12">'+fmtHour(to)+'</text>';
 const selectedSlot=m.slots.find(r=>"h"+r.h===selectKey);
 const focusT=selectedSlot?(selectedSlot.point?selectedSlot.point.t:(selectedSlot.h+.5)*60):m.last?.t;
 const marker=focusT!==undefined&&focusT!==null?
   '<line x1="'+fmt(xx(focusT))+'" y1="'+T+'" x2="'+fmt(xx(focusT))+'" y2="'+(H-B)+'" stroke="#B2FFDD" stroke-dasharray="3 6" opacity=".83"/>':"";
 const halo=m.points.map(p=>'<circle cx="'+fmt(xx(p.t))+'" cy="'+fmt(yy(p.v))+'" r="5" fill="#4DE0A6" stroke="#062B24" stroke-width="2"><title>Parcial '+atTime(p.t)+': '+currency(p.v)+'</title></circle>').join("");
 const grad='<defs><linearGradient id="mtAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#51DEAD" stop-opacity=".29"/><stop offset="1" stop-color="#51DEAD" stop-opacity="0"/></linearGradient>'+
  '<linearGradient id="mtRiskGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F28A69" stop-opacity=".13"/><stop offset="1" stop-color="#F28A69" stop-opacity=".03"/></linearGradient></defs>';
 const area=realPts.length>=2?'<path d="'+realPath+' L'+fmt(realPts.at(-1)[0])+' '+fmt(H-B)+' L'+fmt(realPts[0][0])+' '+fmt(H-B)+' Z" fill="url(#mtAreaGrad)"/>':"";
 const showProjection=mode==="projecao"||mode==="acumulado";
 const recovered=showProjection&&projPath?'<path d="'+projPath+'" fill="none" stroke="#FFB253" stroke-width="'+(mode==="projecao"?4:2.8)+'" stroke-dasharray="8 6" stroke-linecap="round"/>':"";
 const goal=mode==="projecao"?"#B3BEB9":"#92A79D";
 const real=m.points.length>=2?'<path d="'+realPath+'" fill="none" stroke="#4DE0A6" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>':"";
 const endDot=m.last?'<circle cx="'+fmt(xx(m.last.t))+'" cy="'+fmt(yy(m.last.v))+'" r="7.5" fill="#66F0BB" stroke="#113C31" stroke-width="3"/>':"";
 return '<svg class="mt-svg" role="img" aria-label="Curva interativa de venda Web acumulada; toque na faixa horária para analisar" viewBox="0 0 '+W+' '+H+'">'+grad+grid+ticks+
  '<path d="'+exPath+'" fill="none" stroke="'+goal+'" stroke-width="2.8" stroke-dasharray="8 7"/>'+area+
  real+recovered+marker+halo+endDot+'</svg>';
}
function selectionItems(m,mode){
 return mode==="intervalos"?m.intervals.slice(-8).map((r,i)=>({key:"i"+(m.intervals.length-Math.min(8,m.intervals.length)+i),item:r})):
 mode==="recuperacao"?m.slots.filter(r=>r.h>=Math.floor(m.now/60)&&r.h<m.closing).map(r=>({key:"h"+r.h,item:r})):
 m.slots.map(r=>({key:"h"+r.h,item:r}));
}
function selectedItem(m){
 const items=selectionItems(m,activeMode);
 if(!items.length)return null;
 const item=items.find(x=>x.key===selected);
 if(item)return item;
 if(activeMode==="intervalos")return items.at(-1);
 if(activeMode==="recuperacao")return items[0];
 const current=m.last?Math.floor(m.last.t/60):Math.floor(m.now/60);
 return items.find(x=>x.item.h===current)||items.find(x=>x.item.h>current)||items.at(-1);
}
function detail(m,mode,picked){
 if(!picked)return '<p class="mt-empty-detail">Sem dados suficientes para detalhar esta visualização.</p>';
 const r=picked.item;
 if(mode==="intervalos"){
   const goal=r.goal,delta=r.gap;
   return '<div class="mt-detail-title"><span>INTERVALO REGISTRADO</span><b>'+atTime(r.from)+' → '+atTime(r.to)+'</b></div>'+
    '<div class="mt-detail-grid"><div><small>Venda entre parciais</small><strong>'+currency(r.real)+'</strong></div>'+
    '<div><small>Esperado no período</small><strong>'+(goal===null?"—":currency(goal))+'</strong></div>'+
    '<div><small>Desvio observado</small><strong class="'+(delta===null?"":delta<0?"negative":"positive")+'">'+(delta===null?"—":signed(delta))+'</strong></div></div>'+
    '<p class="mt-detail-note">Comparação entre dois inputs ('+r.minutes+' min); não representa necessariamente uma hora cheia.</p>';
 }
 const h=r.h,base=r.goal;
 if(mode==="recuperacao"){
   return '<div class="mt-detail-title"><span>DESAFIO DE RECUPERAÇÃO</span><b>'+fmtHour(h)+'–'+fmtHour(h+1)+'</b></div>'+
    '<div class="mt-detail-grid"><div><small>Meta-base</small><strong>'+(base===null?"—":currency(base))+'</strong></div>'+
    '<div><small>Acréscimo proporcional</small><strong>'+currency(r.extra)+'</strong></div>'+
    '<div><small>Meta ajustada</small><strong>'+currency(r.adjusted)+'</strong></div></div>'+
    '<p class="mt-detail-note">Redistribuição conforme peso da curva, sem contar a hora em andamento.</p>';
 }
 const has=!!r.point,delta=r.delta;
 return '<div class="mt-detail-title"><span>LEITURA DA FAIXA</span><b>'+fmtHour(h)+'–'+fmtHour(h+1)+'</b></div>'+
  '<div class="mt-detail-grid"><div><small>Real acumulado</small><strong>'+(has?currency(r.point.v):"—")+'</strong></div>'+
  '<div><small>Esperado até o input</small><strong>'+(has?currency(r.expected):"—")+'</strong></div>'+
  '<div><small>Desvio da curva</small><strong class="'+(delta===null?"":delta<0?"negative":"positive")+'">'+(delta===null?"—":signed(delta))+'</strong></div></div>'+
  '<p class="mt-detail-note">'+(has?"Parcial real registrada às "+atTime(r.point.t)+". A referência acompanha o minuto da leitura.":"Não há parcial registrada nesta faixa. O gráfico não atribui venda fictícia ao horário.")+'</p>';
}
function insights(m){
 if(m.target===null||!m.rows.length)return ['Cadastre a meta e a curva oficial da filial para gerar análises.'];
 if(!m.last)return ['Aguardando a primeira parcial Web para calcular desvio e projeção.','Toque em qualquer horário para consultar o peso da curva estimada.'];
 const lines=[];
 if(m.gap!==null)lines.push((m.gap<0?"Abaixo da curva: ":"Acima da curva: ")+signed(m.gap)+" até "+atTime(m.last.t)+".");
 if(m.futurePeak)lines.push("Maior peso futuro: "+fmtHour(m.futurePeak.h)+"–"+fmtHour(m.futurePeak.h+1)+" ("+percent(m.futurePeak.w*100)+" da meta).");
 if(m.recoverable>0&&m.remainingWeight>0)lines.push("Para recuperar "+currency(m.recoverable)+", as horas futuras precisam entregar +"+percent(m.recoverable/(m.target*m.remainingWeight)*100)+" sobre sua meta-base.");
 else if(m.gap!==null&&m.gap>=0)lines.push("Sem déficit acumulado: manter o acompanhamento das próximas parciais.");
 else lines.push("Sem faixas futuras suficientes para redistribuir o déficit.");
 return lines;
}
function mountMarkup(m){
 const root=get("clarityCurveChart");if(!root||!root.isConnected)return false;
 const gapClass=m.gap===null?"":m.gap<0?"mt-danger":"mt-good";
 const title=m.gap===null?"Aguardando parcial":m.gap<0?"Abaixo da curva":"Dentro ou acima da curva";
 root.innerHTML='<section class="mt-widget" aria-label="Curva de venda interativa">'+
   '<div class="mt-hero"><div><span class="mt-eyebrow">CURVA INTELIGENTE • LOJA '+esc(state.storeCode)+'</span>'+
     '<h3>Venda pura Web</h3><p>Vendas reais, projeção e recuperação em uma única visão</p></div>'+
     '<span class="mt-live '+gapClass+'"><i></i>'+title+'</span></div>'+
   '<div class="mt-kpi-row"><div class="mt-kpi-projection"><small>PROJEÇÃO DE FECHAMENTO <span>◉ ESTIMATIVA</span></small>'+
     '<strong>'+(m.projection===null?"—":currency(m.projection))+'</strong>'+
     '<span>'+(m.last?"Parcial "+atTime(m.last.t)+" • "+(m.target>0&&m.projection!==null?percent(m.projection/m.target*100)+" da meta":"indicativo"):"Aguardando parcial")+'</span></div>'+
     '<div class="mt-kpi-gap"><small>DESVIO VS CURVA</small><strong class="'+gapClass+'">'+(m.gap===null?"—":signed(m.gap))+'</strong>'+
      '<span>'+(m.last?"Até "+atTime(m.last.t):"Aguardando input")+'</span></div></div>'+
   '<div class="mt-chart-card"><div class="mt-headline"><div><strong>Radar de performance</strong><small>Toque, deslize na horizontal ou use ← →</small></div>'+
     '<span class="mt-chart-icon" aria-hidden="true">✧</span></div>'+
     '<div class="mt-modes" role="group" aria-label="Alternar visualização">'+
     [['acumulado','Acumulado'],['intervalos','Intervalos'],['projecao','Projeção'],['recuperacao','Recuperação']].map(([id,label])=>
       '<button type="button" data-mt-mode="'+id+'" class="'+(activeMode===id?"active":"")+'" aria-pressed="'+(activeMode===id)+'">'+label+'</button>').join("")+'</div>'+
     '<div id="mtTechPlot" class="mt-plot" tabindex="0" role="group" aria-label="Gráfico. Toque ou use as teclas esquerda e direita para selecionar horários."></div>'+
     '<div class="mt-graph-legend"><span><i class="mt-line-real"></i>Venda real</span><span><i class="mt-line-goal"></i>Meta pela curva</span><span><i class="mt-line-projection"></i>Projeção estimada</span></div></div>'+
   '<div class="mt-selected" id="mtTechDetail" aria-live="polite"></div>'+
   '<div class="mt-insights"><div class="mt-insights-title"><span>✦</span><strong>Insights da operação</strong><small>Base: última parcial Web</small></div>'+
     '<div class="mt-insights-list">'+insights(m).map((msg,i)=>'<div><span class="mt-insight-num">'+String(i+1).padStart(2,"0")+'</span><p>'+esc(msg)+'</p></div>').join("")+'</div></div>'+
   '<p class="mt-disclaimer">A venda real provém dos inputs registrados. Metas por horário, previsão e recuperação são estimativas calculadas pela curva histórica, não vendas realizadas. Sem parcial, não há desvio apurado.</p>'+
   '</section>';
 root.querySelectorAll("[data-mt-mode]").forEach(button=>button.addEventListener("click",()=>{
   activeMode=button.dataset.mtMode;selected=null;renderVisual();
 }));
 const plot=get("mtTechPlot");
 if(plot){
   plot.addEventListener("pointerdown",onTouch);
   plot.addEventListener("pointermove",e=>{if(e.pointerType==="mouse"&&e.buttons===0)return;if(e.buttons||e.pointerType==="touch")onTouch(e);});
   plot.addEventListener("keydown",e=>{
     if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
     const items=selectionItems(currentData,activeMode);if(!items.length)return;
     e.preventDefault();let ix=items.findIndex(it=>it.key===selected);
     ix=clamp((ix<0?0:ix)+(e.key==="ArrowRight"?1:-1),0,items.length-1);
     selected=items[ix].key;renderVisual();
   });
 }
 return true;
}
function onTouch(e){
 if(!currentData)return;
 const container=get("mtTechPlot"),svg=container?.querySelector("svg");
 if(!svg)return;
 const box=svg.getBoundingClientRect(),items=selectionItems(currentData,activeMode);
 if(!box.width||!items.length)return;
 const {W,L,R}=chartGeometry(currentData);
 const relative=clamp((e.clientX-box.left)/box.width*W,L,W-R);
 const idx=clamp(Math.floor((relative-L)/(W-L-R)*items.length),0,items.length-1);
 const key=items[idx].key;
 if(key!==selected){selected=key;renderVisual();}
}
function renderVisual(){
 const m=currentData,plot=get("mtTechPlot"),detailBox=get("mtTechDetail");
 if(!m||!plot||!detailBox)return;
 const active=selectedItem(m);
 selected=active?.key||null;
 plot.innerHTML=m.target===null||!m.rows.length?
   '<div class="mt-graph-empty">Aguardando meta e curva histórica válidas.</div>':
   svgGraph(m,activeMode,selected);
 detailBox.innerHTML=detail(m,activeMode,active);
 get("clarityCurveChart")?.querySelectorAll("[data-mt-mode]").forEach(btn=>{
   btn.classList.toggle("active",btn.dataset.mtMode===activeMode);
   btn.setAttribute("aria-pressed",String(btn.dataset.mtMode===activeMode));
 });
}
function draw(force=false){
 if(typeof state==="undefined"||!state.logged)return;
 const root=get("clarityCurveChart");
 if(!root||!root.isConnected)return;
 if(!force&&root.querySelector(".mt-widget"))return;
 if(painting)return;
 painting=true;
 try{currentData=build();if(mountMarkup(currentData))renderVisual();}
 catch(e){console.error("Curva inteligente",e);}
 finally{painting=false;}
}
function schedule(force=false){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;draw(force);}));
}
function watch(){
 const root=get("clarityCurveChart");
 if(root===observed)return;
 observer?.disconnect();observed=root;
 if(root){
   observer=new MutationObserver(()=>{if(!root.querySelector(".mt-widget"))schedule();});
   observer.observe(root,{childList:true});
 }
}
function boot(){
 watch();schedule();
 const section=get("section-inicio");
 if(section)new MutationObserver(()=>{if(get("clarityCurveChart")!==observed){watch();schedule();}}).observe(section,{childList:true,subtree:true});
 document.addEventListener("ma:dashboard-ready",()=>{watch();schedule(true);});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule(true);});
 window.addEventListener("resize",()=>{if(get("clarityCurveChart")?.querySelector(".mt-widget"))renderVisual();});
 setInterval(()=>{if(!document.hidden&&state.logged&&get("clarityCurveChart")?.querySelector(".mt-widget"))schedule(true);},60000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.maTechSalesCurve={render:()=>schedule(true),model:build};
})();