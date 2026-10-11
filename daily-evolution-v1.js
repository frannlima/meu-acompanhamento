/* Painel de Vendas Diário — somente Meu Acompanhamento, sem dependências externas. */
(function(){
  "use strict";
  const el=id=>document.getElementById(id);
  const periods=[{offset:1,name:"Dia anterior (D−1)"},{offset:7,name:"Semana anterior (D−7)"}];
  let comparisonOffset=1, previousHistory=[],currentKey="",loadedKey="",previousError="",seq=0;
  const cache=new Map();
  const n=v=>Number(v||0);
  const brl=v=>money(v,2);
  const rounded=v=>Number(v||0).toLocaleString("pt-BR",{maximumFractionDigits:0});
  function backDate(value,days){
    const d=new Date(value+"T12:00:00Z");
    d.setUTCDate(d.getUTCDate()-days);
    return d.toISOString().slice(0,10);
  }
  function dateBr(value){if(!value)return "—";const a=value.split("-");return a[2]+"/"+a[1]+"/"+a[0];}
  function hourOf(iso){
    const parts=new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",hour12:false,hourCycle:"h23",timeZone:"America/Fortaleza"}).formatToParts(new Date(iso));
    return Number(parts.find(p=>p.type==="hour")?.value||0)%24;
  }
  function snapSeries(entries){
    const hourly=Array(24).fill(null),cumulative=Array(24).fill(null);
    const valid=(Array.isArray(entries)?entries:[]).filter(r=>r.captured_at&&Number.isFinite(Number(r.sales_financial)));
    valid.sort((a,b)=>new Date(a.captured_at)-new Date(b.captured_at));
    let before=0;
    for(const record of valid){
      const current=n(record.sales_financial), hour=hourOf(record.captured_at);
      const delta=current-before;before=current;
      hourly[hour]=(hourly[hour]===null?0:hourly[hour])+delta;
      cumulative[hour]=current;
    }
    let last=null;
    for(let hour=0;hour<24;hour++){
      if(cumulative[hour]!==null)last=cumulative[hour];
      else if(last!==null)cumulative[hour]=last;
    }
    return {hourly,cumulative,final:valid.length?before:null,first:valid[0]?.captured_at||null,last:valid.at(-1)?.captured_at||null,count:valid.length};
  }
  function reference(){
    const target=n(state.day?.target_financial);
    const rows=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
    const hourly=Array(24).fill(null);
    for(const r of rows){if(r.h>=0&&r.h<24)hourly[r.h]=target*n(r.fin);}
    return {hourly,target};
  }
  function hours(){
    const c=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
    const opening=c.length?Math.max(0,c[0].h-1):8;
    const closing=c.length?Math.min(23,c[c.length-1].h+1):23;
    return Array.from({length:closing-opening+1},(_,i)=>i+opening);
  }
  function timeLabel(h){return String(h).padStart(2,"0")+"h–"+String((h+1)%24).padStart(2,"0")+"h";}
  function moneyShort(v){const abs=Math.abs(v);return abs>=1000?"R$ "+(v/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})+" mil":"R$ "+rounded(v);}
  function plot(current,prior,goal,hourKeys){
    const W=1000,H=460,pad={l:93,r:22,t:24,b:91};
    const max=Math.max(1,...hourKeys.flatMap(h=>[current.hourly[h]||0,prior.hourly[h]||0,goal.hourly[h]||0]).map(Math.abs));
    const upper=Math.ceil(max/10000)*10000||10000;
    const sx=i=>pad.l+(i/Math.max(1,hourKeys.length-1))*(W-pad.l-pad.r);
    const sy=v=>H-pad.b-(v/upper)*(H-pad.b-pad.t);
    let svg="";
    for(let k=0;k<=5;k++){
      const value=upper*k/5,y=sy(value);
      svg+='<line x1="'+pad.l+'" x2="'+(W-pad.r)+'" y1="'+y+'" y2="'+y+'" stroke="#E8ECE8" stroke-dasharray="3 7"/>';
      svg+='<text x="'+(pad.l-14)+'" y="'+(y+5)+'" text-anchor="end" font-size="14" fill="#748179">'+esc(moneyShort(value))+'</text>';
    }
    hourKeys.forEach((h,i)=>{
      const x=sx(i);
      svg+='<text transform="translate('+x+','+(H-pad.b+26)+') rotate(-45)" font-size="12" text-anchor="end" fill="#64776C">'+esc(timeLabel(h))+'</text>';
    });
    const series=[
      {values:current.hourly,color:"#16866A"},
      {values:prior.hourly,color:"#285D86"},
      {values:goal.hourly,color:"#DE7C00"}
    ];
    for(const seriesLine of series){
      let segment=[];
      const addSegment=()=>{
        if(segment.length>1)svg+='<polyline points="'+segment.join(" ")+'" fill="none" stroke="'+seriesLine.color+'" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>';
        segment=[];
      };
      hourKeys.forEach((h,i)=>{
        const value=seriesLine.values[h];
        if(value===null || !Number.isFinite(value)){addSegment();return;}
        segment.push(sx(i).toFixed(1)+","+sy(value).toFixed(1));
        svg+='<circle cx="'+sx(i).toFixed(1)+'" cy="'+sy(value).toFixed(1)+'" r="4.2" fill="'+seriesLine.color+'" stroke="#FFFFFF" stroke-width="1.5"><title>'+esc(timeLabel(h)+": "+brl(value))+'</title></circle>';
      });
      addSegment();
    }
    svg+='<text x="'+(W/2)+'" y="'+(H-9)+'" text-anchor="middle" fill="#2B473D" font-size="14" font-weight="700">Hora do input</text>';
    return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Curva comparativa de vendas atual, dia de comparação e referência histórica">'+svg+'</svg>';
  }
  function signedCurrency(v){
    if(v===null)return "—";
    return (v<0?"− ":"+ ")+brl(Math.abs(v));
  }
  function deltaCell(value,isPercent){
    if(value===null || !Number.isFinite(value))return '<span class="dev-muted">—</span>';
    const cls=value>0?"up":value<0?"down":"flat";
    const str=isPercent?Math.abs(value).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%":brl(Math.abs(value));
    return '<span class="dev-delta '+cls+'">'+(value>0?"▲ ":value<0?"▼ ":"— ")+str+'</span>';
  }
  function totalLine(current,prior,goal){
    const equal=current.final!==null && prior.final!==null;
    const variance=equal?current.final-prior.final:null;
    const variation=equal&&prior.final!==0?variance/prior.final*100:null;
    return '<tr class="dev-total"><th>Total registrado</th><td>'+ (current.final===null?"—":brl(current.final))+'</td>'+
      '<td>'+(current.final===null?"—":brl(current.final))+'</td><td>'+(prior.final===null?"—":brl(prior.final))+'</td>'+
      '<td>'+(prior.final===null?"—":brl(prior.final))+'</td><td>'+deltaCell(variation,true)+'</td><td>'+deltaCell(variance,false)+'</td></tr>';
  }
  function table(current,prior,goal,hourKeys){
    let body="";
    for(const h of hourKeys){
      const av=current.hourly[h],pv=prior.hourly[h],curCum=current.cumulative[h],prevCum=prior.cumulative[h];
      const comp=av!==null&&pv!==null;
      const d=comp?av-pv:null;
      const percent=comp&&pv!==0?(d/pv*100):null;
      body+='<tr><th>'+timeLabel(h)+'</th><td class="dev-current">'+(av===null?"—":brl(av))+'</td>'+
      '<td>'+(curCum===null?"—":brl(curCum))+'</td><td class="dev-previous">'+(pv===null?"—":brl(pv))+'</td>'+
      '<td>'+(prevCum===null?"—":brl(prevCum))+'</td>'+
      '<td>'+deltaCell(percent,true)+'</td><td>'+deltaCell(d,false)+'</td></tr>';
    }
    return '<div class="dev-table-scroll"><table><thead><tr><th>Hora</th><th>Venda atual</th><th>Atual acum.</th><th>Venda anterior</th><th>Anterior acum.</th><th>Δ %</th><th>Δ R$</th></tr></thead><tbody>'+body+'</tbody><tfoot>'+
      totalLine(current,prior,goal)+'</tfoot></table></div>';
  }
  function statusCards(current,prior,goal){
    const av=current.final,pv=prior.final;
    const delta=av!==null&&pv!==null?av-pv:null;
    const att=av!==null&&goal.target?100*av/goal.target:null;
    return '<div class="dev-kpis">'+
      '<div class="dev-kpi"><span>Meta financeira do dia</span><strong>'+brl(goal.target)+'</strong><small>Referência da curva da loja</small></div>'+
      '<div class="dev-kpi"><span>Venda atual registrada</span><strong>'+(av===null?"—":brl(av))+'</strong><small>'+(att===null?"Aguardando input":pct(att)+" de atingimento")+'</small></div>'+
      '<div class="dev-kpi"><span>Venda no período anterior</span><strong>'+(pv===null?"—":brl(pv))+'</strong><small>'+dateBr(backDate(localDate(),comparisonOffset))+'</small></div>'+
      '<div class="dev-kpi"><span>Variação entre registros</span><strong class="'+(delta===null?"":delta>=0?"dev-good":"dev-bad")+'">'+signedCurrency(delta)+'</strong><small>'+(delta===null?"Sem base comparável":"Valores até o último input de cada dia")+'</small></div>'+
      '</div>';
  }
  function buildPanel(){
    const root=el("dailyEvolutionPanel");if(!root||!state.logged)return;
    const day=localDate(),compareDay=backDate(day,comparisonOffset);
    const current=snapSeries(state.history),prev=snapSeries(previousHistory),ref=reference(),useHours=hours();
    const waiting=(loadedKey!==String(state.storeCode)+"|"+compareDay);
    const error=previousError;
    const activePeriod=periods.find(p=>p.offset===comparisonOffset);
    root.innerHTML=
      '<div class="dev-head"><div class="dev-head-icon" aria-hidden="true">▥</div>'+
      '<div class="dev-heading"><span class="eyebrow">INTELIGÊNCIA DE VENDAS • LOJA '+esc(state.storeCode)+'</span><h2>Painel de Vendas Diário</h2>'+
      '<p>Evolução de vendas hora a hora • Comparação e referência histórica</p></div>'+
      '<button class="dev-refresh" type="button" id="devRefresh" title="Atualizar resultado da loja">↻ Atualizar</button></div>'+
      '<div class="dev-filters">'+
      '<label>Loja<select id="devStore" '+(state.role==="administrador"?"":"disabled")+' aria-label="Filial em análise">'+
      STORE_CODES.map(code=>'<option value="'+code+'" '+(code===String(state.storeCode)?"selected":"")+'>Loja '+code+'</option>').join("")+
      '</select></label>'+
      '<label>Comparar com<select id="devComparison" aria-label="Período de comparação">'+
      periods.map(p=>'<option value="'+p.offset+'" '+(p.offset===comparisonOffset?"selected":"")+'>'+p.name+'</option>').join("")+
      '</select></label>'+
      '<div class="dev-context"><span>CE+PI</span><span>Referência: curva histórica</span></div></div>'+
      statusCards(current,prev,ref)+
      '<div class="dev-content"><div class="dev-chart"><div class="dev-subheading"><h3>Evolução das vendas hora a hora (HH)</h3>'+
      '<p>'+(current.last?"Atualizado às "+localTime(current.last):"Aguardando o primeiro input")+' • Comparação: '+dateBr(compareDay)+'</p></div>'+
      '<div class="dev-legend"><span><i class="dev-dot current"></i>Venda atual</span><span><i class="dev-dot previous"></i>'+activePeriod.name+'</span>'+
      '<span><i class="dev-dot reference"></i>Meta / curva histórica</span></div>'+
      '<div class="dev-chart-scroll">'+plot(current,prev,ref,useHours)+'</div></div>'+
      '<div class="dev-table"><div class="dev-table-title"><strong>Comparativo por hora</strong><small>'+dateBr(day)+' × '+dateBr(compareDay)+'</small></div>'+
      table(current,prev,ref,useHours)+'</div></div>'+
      '<div class="dev-footer"><div class="dev-note">'+
      (waiting?"Carregando venda anterior… ":error?"Não foi possível consultar o período anterior. ":"")+
      'As vendas por hora representam os incrementos entre os inputs, atribuídos à hora do registro. '+
      'Um horário sem input aparece como “—”, não como venda zerada. Acumulados refletem a última parcial disponível.'+
      '</div><button id="devGoGroups" type="button" class="dev-groups">Ver Mundos e DCOs →</button></div>';
    el("devRefresh")?.addEventListener("click",()=>loadAll());
    el("devGoGroups")?.addEventListener("click",()=>setSection("grupos"));
    el("devStore")?.addEventListener("change",e=>{
      if(state.role==="administrador" && STORE_CODES.includes(e.target.value))changeAdminStore(e.target.value);
    });
    el("devComparison")?.addEventListener("change",e=>{
      comparisonOffset=Number(e.target.value)===7?7:1;
      previousHistory=[];loadedKey="";previousError="";
      fetchPrevious();
    });
  }
  async function fetchPrevious(){
    if(!state.logged)return;
    const store=String(state.storeCode),day=localDate(),date=backDate(day,comparisonOffset),key=store+"|"+date;
    currentKey=key;
    if(cache.has(key)){
      previousHistory=cache.get(key);
      loadedKey=key;previousError="";
      buildPanel();return;
    }
    const id=++seq;
    previousHistory=[];loadedKey="";previousError="";
    buildPanel();
    try{
      const records=await api("history",{matricula:state.matricula,business_date:date,store_code:store});
      if(id!==seq||currentKey!==key||String(state.storeCode)!==store)return;
      previousHistory=Array.isArray(records)?records:[];
      cache.set(key,previousHistory);
      loadedKey=key;
    }catch(e){
      if(id!==seq||currentKey!==key)return;
      previousError=e.message||"Falha na consulta";
      loadedKey=key;previousHistory=[];
    }
    buildPanel();
  }
  const baseLoadAll=window.loadAll;
  window.loadAll=async function(...args){
    const result=await baseLoadAll(...args);
    if(result===true && state.logged){
      buildPanel();
      const key=String(state.storeCode)+"|"+backDate(localDate(),comparisonOffset);
      if(key!==loadedKey)await fetchPrevious();
    }
    return result;
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{if(state.logged){buildPanel();fetchPrevious()}});
  else if(state.logged){buildPanel();fetchPrevious()}
})();
