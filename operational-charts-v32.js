/* Meu Acompanhamento | análise de vendas, gráfico HH e administração | v32 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pct=n=>Number.isFinite(n)?n.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%":"—";
const tone=n=>n>=0?"good":"bad";
const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clock=iso=>{
 if(!iso||!Number.isFinite(Date.parse(iso)))return null;
 const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(iso));
 return {h:Number(p.find(x=>x.type==="hour")?.value||0)%24,m:Number(p.find(x=>x.type==="minute")?.value||0)};
};
const time=iso=>{const t=clock(iso);return t?String(t.h).padStart(2,"0")+":"+String(t.m).padStart(2,"0"):"—";};
const parts=()=>typeof window.getOperationalSalesCurve==="function"?(window.getOperationalSalesCurve()||[]).map(x=>({h:Number(x.h),w:Number(x.fin)})).filter(x=>x.w>0).sort((a,b)=>a.h-b.h):[];
function sample(){
 const result=(Array.isArray(state.history)?state.history:[]).filter(r=>r.captured_at&&Number.isFinite(Date.parse(r.captured_at))&&Number.isFinite(Number(r.sales_financial))).map(r=>({at:r.captured_at,v:Number(r.sales_financial)}));
 const d=state.day||{};
 if(d.has_input&&d.captured_at&&!result.some(r=>r.at===d.captured_at))result.push({at:d.captured_at,v:Number(d.sales_financial||0)});
 return result.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
}
function expected(rows,at){
 const t=clock(at),sum=rows.reduce((s,r)=>s+r.w,0);
 if(!t||!sum)return 0;
 return Math.min(1,Math.max(0,rows.reduce((s,r)=>s+(r.h<t.h?r.w:r.h===t.h?r.w*t.m/60:0),0)/sum));
}
function model(){
 const points=sample(),curve=parts(),target=Number(state.day?.target_financial||0),intervals=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],min=(Date.parse(b.at)-Date.parse(a.at))/60000;
  if(min<=0)continue;
  const actual=b.v-a.v,goal=target*(expected(curve,b.at)-expected(curve,a.at));
  intervals.push({at:b.at,real:actual,goal,gap:actual-goal,rate:actual*60/min,min});
 }
 const last=points.at(-1)||null,cumExpected=last?target*expected(curve,last.at):null;
 const recent=intervals.at(-1)||null,prior=intervals.at(-2)||null;
 const change=recent&&prior&&prior.rate>0?(recent.rate/prior.rate-1)*100:null;
 const fraction=last?expected(curve,last.at):0;
 return {points,curve,target,intervals,last,recent,prior,change,cumExpected,projection:fraction>.03?last.v/fraction:null};
}
function chart(m){
 if(!m.curve.length||!m.target)return "";
 const W=980,H=330,L=80,R=25,T=20,B=54,x0=m.curve[0].h,x1=m.curve.at(-1).h+1;
 const xx=t=>L+(t-x0)*60/(Math.max(1,x1-x0)*60)*(W-L-R);
 const ymax=1.14*Math.max(1,m.target,m.projection||0,...m.points.map(p=>p.v));
 const yy=n=>T+(H-T-B)*(1-n/ymax);
 const path=pts=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
 const curvePts=[[xx(x0),yy(0)]],sum=m.curve.reduce((a,r)=>a+r.w,0);let cum=0;
 m.curve.forEach(r=>{cum+=r.w/sum;curvePts.push([xx(r.h+1),yy(m.target*cum)]);});
 const realPts=m.points.map(r=>{const t=clock(r.at);return [xx(t.h+t.m/60),yy(r.v),r];});
 const grid=[0,.25,.5,.75,1].map(fr=>'<line x1="'+L+'" y1="'+yy(fr*ymax)+'" x2="'+(W-R)+'" y2="'+yy(fr*ymax)+'" stroke="#E0E7E1"/><text x="'+(L-12)+'" y="'+(yy(fr*ymax)+5)+'" text-anchor="end" font-size="13" fill="#63776A">'+Math.round(fr*ymax/1000)+' mil</text>').join("");
 const ticks=m.curve.filter((r,i)=>i%2===0||i===m.curve.length-1).map(r=>'<text x="'+xx(r.h)+'" y="'+(H-16)+'" text-anchor="middle" font-size="13" fill="#63776A">'+r.h+'h</text>').join("");
 const nodes=realPts.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="#38865A" stroke="white" stroke-width="2"><title>'+time(p[2].at)+' • '+money(p[2].v)+'</title></circle>').join("");
 const forecast=m.last&&m.projection!==null?'<path d="'+path([[realPts.at(-1)[0],yy(m.last.v)],[xx(x1),yy(m.projection)]])+'" stroke="#DE7C00" stroke-width="3" stroke-dasharray="5 8" fill="none"/>':"";
 return '<svg role="img" aria-label="Gráfico de vendas reais acumuladas versus curva oficial, com projeção ilustrativa" viewBox="0 0 '+W+' '+H+'">'+grid+'<path d="'+path(curvePts)+'" fill="none" stroke="#919F97" stroke-width="3" stroke-dasharray="9 7"/>'+
 (realPts.length>1?'<path d="'+path(realPts)+'" fill="none" stroke="#38865A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>':'')+forecast+nodes+ticks+'</svg>';
}
const worlds=[
 {label:"Feminino",code:"feminino_moda",color:"#E03C31"},
 {label:"Masculino",code:"masculino_moda",color:"#2563EB"},
 {label:"Infantil",code:"infantil_moda",color:"#E6B800"},
 {label:"Casa",code:"moda_casa",color:"#38865A"},
 {label:"Beleza / Relógios",code:"beleza,relogios,basket",color:"#E68699"},
 {label:"CBA",code:"cba",color:"#FFFFFF"}
];
function worldCards(){
 const rows=Array.isArray(state.groupHourlyHistory)?state.groupHourlyHistory:[];
 const times=[...new Set(rows.map(x=>x.captured_at).filter(Boolean))].sort((a,b)=>Date.parse(a)-Date.parse(b));
 return worlds.map(w=>{
  const codes=w.code.split(",");
  const value=t=>rows.filter(r=>r.captured_at===t&&codes.includes(String(r.group_code))).reduce((s,r)=>s+Number(r.sales_financial||0),0);
  const last=times.at(-1),prev=times.at(-2),before=times.at(-3);
  const rate=last&&prev?value(last)-value(prev):null,previous=prev&&before?value(prev)-value(before):null;
  const change=rate!==null&&previous>0?(rate/previous-1)*100:null;
  return '<div class="ma-world-card" data-world="'+(w.code==="cba"?"cba":"other")+'" style="--world-color:'+w.color+'"><b>'+w.label+'</b>'+
   '<strong class="'+(change===null?'':tone(change))+'">'+(change===null?'—':(change>=0?'▲ +':'▼ ')+pct(change))+'</strong>'+
   '<small>'+(change===null?'Aguardando três inputs para comparar':(change>=0?'Ritmo acelerou':'Ritmo desacelerou'))+
   (rate!==null?' • Última venda: '+money(rate):'')+'</small></div>';
 }).join("");
}
function stat(name,value,help,kind){
 return '<article class="ma-upgrade-kpi '+(kind||'')+'"><small>'+name+'</small><strong>'+value+'</strong><span>'+help+'</span></article>';
}
function draw(){
 if(!state.logged)return;
 const root=$("dailyEvolutionPanel");if(!root)return;
 try{
  const x=model(),d=state.day||{},hasAA=d.has_input&&Number(d.ly_financial)>0;
  const ev=hasAA?(Number(d.sales_financial)/Number(d.ly_financial)-1)*100:null;
  const gap=x.last?x.last.v-x.cumExpected:null;
  let html='<div class="ma-upgrade-panel"><div class="ma-upgrade-head"><div><h3>Evolução real • Hora a hora</h3><p>Último input comparado ao ritmo esperado pela curva histórica oficial da loja.</p></div>'+
    '<span class="ma-upgrade-tag">Loja '+clean(state.storeCode)+' • '+(x.last?time(x.last.at):'Aguardando input')+'</span></div>';
  if(!x.curve.length||!x.target)html+='<div class="ma-error-state">Sem curva horária ou meta oficial cadastrada para esta filial. Nenhum resultado estimado foi gerado.</div>';
  else{
   html+='<div class="ma-upgrade-grid">'+
      stat("Venda real acumulada",x.last?money(x.last.v):"—","Até a última atualização")+
      stat("Esperado até agora",x.last?money(x.cumExpected):"—","Referência da curva")+
      stat("Desvio vs curva",gap===null?"—":(gap>=0?'▲ +':'▼ −')+money(Math.abs(gap)),"Real menos esperado",gap===null?'':tone(gap))+
      stat("Último intervalo",x.recent?money(x.recent.real):"—",x.recent?Math.round(x.recent.min)+" minutos entre inputs":"Exige dois inputs")+
      stat("Ritmo vs esperado",x.recent?(x.recent.gap>=0?'▲ +':'▼ −')+money(Math.abs(x.recent.gap)):"—","No mesmo intervalo",x.recent?tone(x.recent.gap):"")+
      stat("Evolução vs A.A.",ev===null?"—":(ev>=0?'▲ +':'▼ ')+pct(ev),"Base oficial A.A. do dia",ev===null?'':tone(ev))+'</div>';
   html+='<div class="ma-upgrade-legend"><span><i style="background:#38865A"></i>Real acumulado</span><span><i style="background:#919F97"></i>Meta pela curva</span><span><i style="background:#DE7C00"></i>Projeção, não realizada</span></div>';
   html+='<div class="ma-upgrade-graph">'+chart(x)+'</div>';
   html+='<div class="ma-pace-summary">'+
      (x.recent?'<span class="ma-pace-pill '+tone(x.recent.gap)+'">Vs curva '+(x.recent.gap>=0?'▲ +':'▼ −')+money(Math.abs(x.recent.gap))+'</span>':'<span class="ma-pace-pill">Mais um input é necessário para comparar intervalos.</span>')+
      (x.change===null?'<span class="ma-pace-pill">Tendência entre horas disponível após três inputs.</span>':'<span class="ma-pace-pill '+tone(x.change)+'">Ritmo anterior '+(x.change>=0?'▲ +':'▼ ')+pct(x.change)+'</span>')+'</div>';
   if(x.intervals.length){
     html+='<div class="ma-upgrade-bars"><h4>Intervalos registrados × curva esperada</h4>'+
       x.intervals.slice(-6).map(i=>{
        const value=i.goal>0?i.real/i.goal*100:null;
        return '<div class="ma-hour-row"><b>'+time(i.at)+'</b><div class="bar"><i class="'+tone(i.gap)+'" style="width:'+Math.max(0,Math.min(100,value||0))+'%"></i><em>'+(value===null?'—':pct(value)+' do ritmo')+'</em></div>'+
        '<span class="val" style="color:'+(i.gap>=0?'#38865A':'#E03C31')+'">'+(i.gap>=0?'▲ +':'▼ −')+money(Math.abs(i.gap))+'</span></div>';
       }).join("")+'</div>';
   }
  }
  html+='<h4 style="margin-top:18px;color:#173F35">Aceleração por mundo • comparação dos últimos intervalos</h4><div class="ma-world-hourly">'+worldCards()+'</div>'+
   '<p class="ma-upgrade-foot">As setas comparam intervalos reais dos inputs. Para velocidades, os intervalos são normalizados por duração em R$/hora. Sem três entradas válidas por grupo, não há comparativo confiável. O A.A. informado é diário, não uma venda histórica por hora.</p></div>';
  root.innerHTML=html;
  const other=$("clarityCurveChart");if(other&&x.curve.length&&x.target)other.innerHTML='<div class="ma-upgrade-graph">'+chart(x)+'</div><div class="ma-upgrade-legend">Real (verde) · Meta pela curva (cinza tracejado) · Projeção (laranja tracejado)</div>';
 }catch(e){console.error("Gráfico de acompanhamento",e);root.innerHTML='<div class="ma-error-state">Não foi possível montar o painel. '+clean(e.message||String(e))+'<button type="button" id="maRetry32">Tentar novamente</button></div>';$("maRetry32")?.addEventListener("click",draw);}
}
function admin(){
 const shell=$("appShell");if(!shell)return;
 const ok=state.logged&&state.role==="administrador";
 shell.classList.toggle("ma-admin-session",ok);
 for(const id of ["adminStoreBar","homeAdminStoreBar"]){
  const bar=$(id);if(!bar)continue;
  bar.classList.toggle("hidden",!ok);
  if(!ok)continue;
  const select=bar.querySelector("select");
  if(select&&!select.options.length&&typeof buildAdminStoreSelect==="function")buildAdminStoreSelect();
  let label=bar.querySelector(".ma-current-store-label");
  if(!label){label=document.createElement("span");label.className="ma-current-store-label";bar.appendChild(label);}
  label.textContent="Filial "+state.storeCode+" em análise";
  if(!bar.querySelector(".ma-region-access")){
   const btn=document.createElement("button");btn.className="ma-region-access";btn.type="button";btn.textContent="Visão Regional CE+PI";
   btn.addEventListener("click",()=>{if(state.role==="administrador")setSection("regional");});
   bar.appendChild(btn);
  }
 }
}
function meta(){
 const d=state.day||{},ev=d.has_input&&Number(d.ly_financial)>0?(Number(d.sales_financial)/Number(d.ly_financial)-1)*100:null;
 for(const id of ["kpiGrid","clarityExecutive"]){
  const root=$(id);if(!root)continue;
  let el=root.querySelector(".ma-day-evolution");
  if(!el){el=document.createElement("div");el.className="ma-day-evolution";root.appendChild(el);}
  el.innerHTML='<span>Evolução vs A.A.</span><b class="'+(ev===null?'':tone(ev))+'">'+(ev===null?'—':(ev>=0?'▲ +':'▼ ')+pct(ev))+'</b>';
 }
}
function render(){if(!state.logged)return;admin();meta();draw();}
let schedule=0;
function queue(){if(schedule)cancelAnimationFrame(schedule);schedule=requestAnimationFrame(()=>{schedule=0;render()});}
document.addEventListener("ma:dashboard-ready",queue);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{queue();setTimeout(queue,400);},{once:true});else queue();
window.maOperationalChartsV32={render,model};
})();