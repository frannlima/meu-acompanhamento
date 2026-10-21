/* Cockpit de Vendas | Meu Acompanhamento | leitura operacional em uma tela */
(function(){
  "use strict";
  const ESTORE_API="https://fndkjgveeojlywkdrtxe.supabase.co/functions/v1/estore-api";
  const $=id=>document.getElementById(id);
  const cash=v=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
  const percent=(v,dec=1)=>Number.isFinite(v)?v.toLocaleString("pt-BR",{minimumFractionDigits:dec,maximumFractionDigits:dec})+"%":"—";
  const count=v=>Number(v).toLocaleString("pt-BR",{maximumFractionDigits:0});
  const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const signedMoney=v=>(v>=0?"+ ":"− ")+cash(Math.abs(v));
  const signedPct=v=>(v>0?"+":"")+percent(v);
  const store=()=>String(state.storeCode||"").replace(/\D/g,"").padStart(3,"0");
  const context=()=>store()+"|"+localDate();
  const isVisible=()=>state.logged&&state.section==="cockpit"&&!document.hidden;
  const hour=iso=>{
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(iso));
    return {h:Number(parts.find(x=>x.type==="hour")?.value||0)%24,m:Number(parts.find(x=>x.type==="minute")?.value||0)};
  };
  const todayStamp=iso=>{
    if(!iso||!Number.isFinite(Date.parse(iso)))return false;
    return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso))===localDate();
  };
  const time=iso=>iso&&Number.isFinite(Date.parse(iso))?
    new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Fortaleza"}):"—";
  const dayLabel=()=>localDate().split("-").reverse().join("/");
  const bound=v=>Math.max(0,Math.min(100,Number(v)||0));
  let estoreKey="",estoreRow=null,estoreStatus="Aguardando consulta oficial",estoreBusy=false,lastFetch=0,estoreSeq=0,estoreController=null,model=null;
  function curve(){
    const raw=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
    const arr=(Array.isArray(raw)?raw:[]).map(r=>({h:Number(r.h),w:Number(r.fin)}))
      .filter(r=>Number.isInteger(r.h)&&r.h>=0&&r.h<24&&Number.isFinite(r.w)&&r.w>0)
      .sort((a,b)=>a.h-b.h);
    const sum=arr.reduce((s,r)=>s+r.w,0);
    return sum>0?arr.map(r=>({h:r.h,w:r.w/sum})):[];
  }
  function elapsedFraction(rows,clock){
    return Math.max(0,Math.min(1,rows.reduce((s,r)=>s+r.w*(clock.h>r.h?1:clock.h===r.h?clock.m/60:0),0)));
  }
  function groupPerformance(has,fraction){
    const source=Array.isArray(state.detail?.rows)?state.detail.rows:[];
    const targets=new Map();
    (Array.isArray(state.ggTargets)?state.ggTargets:[]).forEach(r=>{
      const id=Number(r.dco_code);
      if(Number(r.target_financial)>0)targets.set(id,Number(r.target_financial));
    });
    const byGG=new Map(),byWorld=new Map();
    const mapping=window.ggOfficialMapping;
    if(!mapping||typeof mapping.ggOf!=="function"||typeof mapping.worldOf!=="function")return {best:null,pressures:[]};
    for(const r of source){
      const id=Number(r.dco_code);
      if(!Number.isFinite(id)||id===320||[530,531,532,552].includes(id))continue;
      const target=targets.get(id)||Math.max(0,Number(r.target_financial)||0);
      if(!(target>0))continue;
      const sale=Number(r.sales_financial)||0;
      const gg=mapping.ggOf(r),world=mapping.worldOf(r);
      if(gg){
        const x=byGG.get(gg)||{name:gg,target:0,sale:0};
        x.target+=target;x.sale+=sale;byGG.set(gg,x);
      }
      if(world){
        const x=byWorld.get(world)||{name:(typeof WORLD_LABELS==="object"?WORLD_LABELS[world]:world)||world,target:0,sale:0};
        x.target+=target;x.sale+=sale;byWorld.set(world,x);
      }
    }
    const best=has?[...byGG.values()].filter(r=>r.target>0)
      .sort((a,b)=>b.sale/b.target-a.sale/a.target)[0]||null:null;
    const pressures=has&&fraction!==null?[...byWorld.values()].map(r=>({...r,gap:r.sale-r.target*fraction}))
      .filter(r=>r.gap<0).sort((a,b)=>a.gap-b.gap).slice(0,3):[];
    return {best,pressures};
  }
  function data(){
    const d=state.day||{},target=Math.max(0,Number(d.target_financial)||0);
    const has=!!d.has_input&&todayStamp(d.captured_at);
    const sale=has?Math.max(0,Number(d.sales_financial)||0):null;
    const rows=curve(),clock=has?hour(d.captured_at):null;
    const fraction=clock&&rows.length?elapsedFraction(rows,clock):null;
    const projection=has&&target>0&&fraction!==null&&fraction>=.08?sale/fraction:null;
    const attainment=has&&target>0?sale/target*100:null;
    const projectedAtt=projection!==null&&target>0?projection/target*100:null;
    const dev=has&&target>0?sale-target:null;
    // EV. da Venda Real: evolução financeira frente à venda do ano anterior.
    const ly=Number(d.ly_financial||0);
    const evolution=has&&ly>0?(sale/ly-1)*100:null;
    const growth=has&&d.interval_growth_pct!=null&&Number.isFinite(Number(d.interval_growth_pct))?Number(d.interval_growth_pct):null;
    const delta=has&&growth!==null&&Number.isFinite(Number(d.interval_delta_financial))?Number(d.interval_delta_financial):null;
    const peaks=rows.slice().sort((a,b)=>b.w-a.w||a.h-b.h).slice(0,3).sort((a,b)=>a.h-b.h);
    const group=groupPerformance(has,fraction);
    const e=estoreKey===context()?estoreRow:null;
    const eHas=!!e?.updated_at&&todayStamp(e.updated_at);
    const cap=eHas?Math.max(0,Number(e.captured)||0):null;
    const eTarget=e?Math.max(0,Number(e.metaValue)||0):0;
    const orders=eHas?Math.max(0,Math.trunc(Number(e.orders)||0)):null;
    const orderTarget=e?Math.max(0,Math.trunc(Number(e.orderTarget)||0)):0;
    const eAtt=cap!==null&&eTarget>0?cap/eTarget*100:null;
    const oAtt=orders!==null&&orderTarget>0?orders/orderTarget*100:null;
    const share=cap!==null&&sale!==null&&sale>0?cap/sale*100:null;
    return {target,has,sale,attainment,dev,evolution,growth,delta,projection,projectedAtt,peaks,rows,fraction,
      best:group.best,pressures:group.pressures,e,cap,eTarget,orders,orderTarget,eAtt,oAtt,share,updated:d.captured_at};
  }
  // Somente diferenças entre inputs efetivamente registrados na MESMA faixa.
  // Uma única parcial ou uma diferença que atravessa duas faixas não constitui
  // venda apurada daquela hora: nesse caso, não estimar valores como venda real.
  function peakComparison(peak,day){
    if(!day.has||!(day.target>0))return null;
    const begin=peak.h*60,end=(peak.h+1)*60;
    const raw=Array.isArray(state.history)?state.history:[];
    const samples=raw.filter(r=>todayStamp(r.captured_at)&&Number.isFinite(Number(r.sales_financial)))
      .map(r=>{const t=hour(r.captured_at);return {at:r.captured_at,minute:t.h*60+t.m,value:Number(r.sales_financial)};});
    if(todayStamp(day.updated)&&Number.isFinite(Number(day.sale))&&!samples.some(s=>s.at===day.updated)){
      const t=hour(day.updated);
      samples.push({at:day.updated,minute:t.h*60+t.m,value:day.sale});
    }
    const points=samples
      .filter(s=>s.minute>=begin&&s.minute<=end)
      .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    if(points.length<2)return null;
    // Um input na fronteira exata da hora pertence ao fechamento da hora anterior.
    // Duplicatas ou timestamps sem avanço temporal não são comparáveis.
    const first=points[0],last=points[points.length-1],minutes=(Date.parse(last.at)-Date.parse(first.at))/60000;
    if(!(minutes>0&&minutes<=60))return null;
    const real=last.value-first.value;
    const expected=day.target*peak.w*minutes/60;
    if(!Number.isFinite(real)||!Number.isFinite(expected))return null;
    const gap=real-expected;
    const closeEnough=Math.abs(gap)<0.005;
    const tone=closeEnough?"neutral":gap<0?"below":"above";
    return {real,expected,gap,tone,minutes,first:time(first.at),last:time(last.at),full:minutes>=59.5};
  }
  function peakCard(peak,x){
    const comparison=peakComparison(peak,x),start=String(peak.h).padStart(2,"0")+"h";
    const finish=String(peak.h+1).padStart(2,"0")+"h";
    const estimated=x.target*peak.w;
    let result='<div class="cp-peak-result cp-peak-unavailable"><span>Venda na faixa</span>'+
      '<em>Aguardando 2 parciais dentro deste horário</em></div>';
    if(comparison){
      const status=comparison.tone==="below"?"Abaixo do esperado":comparison.tone==="above"?"Acima do esperado":"Dentro do esperado";
      const arrow=comparison.tone==="below"?"▼":comparison.tone==="above"?"▲":"◆";
      result='<div class="cp-peak-result cp-peak-'+comparison.tone+'">'+
        '<span>Vendido entre parciais</span><b>'+cash(comparison.real)+'</b>'+
        '<div class="cp-peak-trend"><span aria-hidden="true">'+arrow+'</span> '+status+'</div>'+
        '<small class="cp-peak-gap">'+signedMoney(comparison.gap)+' vs esperado na janela</small>'+
        '<small class="cp-peak-window">'+comparison.first+'–'+comparison.last+' • Esperado: '+cash(comparison.expected)+'</small>'+
        '</div>';
    }
    return '<div class="cp-peak"><b>'+start+' - '+finish+'</b>'+
      '<span>Meta estimada da faixa</span><strong>'+cash(estimated)+'</strong>'+result+'</div>';
  }
  function meter(value,tone="green"){
    return '<div class="cp-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+bound(value).toFixed(1)+'"><i class="'+tone+'" style="width:'+bound(value).toFixed(1)+'%"></i></div>';
  }
  function mainTile(icon,label,value,subtitle,progress,color){
    return '<article class="cp-tile"><div class="cp-tile-label"><span class="cp-tile-icon">'+icon+'</span><b>'+label+'</b></div>'+
      '<strong class="cp-tile-value">'+value+'</strong><span class="cp-tile-sub">'+subtitle+'</span>'+
      (progress!==null?meter(progress,color):'<div class="cp-meter-void"></div>')+'</article>';
  }
  // Símbolo de sacola com assinatura vertical Ria / Chu / Elo.
  function riaShoppingBag(){
    // A arte reutiliza o logotipo vertical vetorizado da referência enviada.
    // Imagem local e cacheada pelo PWA; não depende de uma fonte externa.
    return '<img class="cp-ria-bag" src="./assets/cockpit-sacola-reciclavel-grafite.svg" width="54" height="70" alt="Sacola de papel reciclável grafite com logotipo vertical RIA CHU ELO" loading="eager" decoding="async">';
  }
  function saleRealTile(x){
    const value=x.has?cash(x.sale):"—";
    const attainment=x.attainment!==null?percent(x.attainment):"—";
    const ratio=bound(x.attainment);
    const ev=x.evolution,trend=ev===null?"cp-ev-unavailable":ev>0?"cp-ev-up":ev<0?"cp-ev-down":"cp-ev-neutral";
    const evDisplay=ev===null?"—":(ev>0?"+ ":"")+percent(ev);
    const arrow=ev===null?"":ev>0?"▲":ev<0?"▼":"◆";
    return '<article class="cp-tile cp-sale-tile">'+
      '<div class="cp-sale-details">'+
        '<div class="cp-tile-label"><span class="cp-bag-mark">'+riaShoppingBag()+'</span><b>VENDA REAL</b></div>'+
        '<strong class="cp-tile-value">'+value+'</strong>'+
        '<span class="cp-tile-sub">'+(x.has?"Venda Web acumulada":"Aguardando venda Web")+'</span>'+
      '</div>'+
      '<div class="cp-sale-analytics">'+
        '<div class="cp-pie" role="img" aria-label="Atingimento de '+attainment+' da meta" style="--cp-progress:'+ratio.toFixed(1)+'%">'+
          '<div class="cp-pie-inner"><strong>'+attainment+'</strong><span>DA META</span></div>'+
        '</div>'+
        '<div class="cp-evolution '+trend+'"><span class="cp-evolution-title">EV. <small>vs A.A.</small></span>'+
          '<strong><span aria-hidden="true">'+arrow+'</span> '+evDisplay+'</strong></div>'+
      '</div>'+
    '</article>';
  }
  function render(){
    const root=$("cockpitContent");
    if(!root||!state.logged)return;
    const x=data();model=x;
    $("cockpitStore").textContent="LOJA "+store();
    $("cockpitTimestamp").textContent=dayLabel()+" • "+(x.has?"Atualizado às "+time(x.updated):"Aguardando a primeira parcial");
    $("cockpitEstoreUpdated").textContent=x.e?.updated_at&&todayStamp(x.e.updated_at)?"eStore atualizado às "+time(x.e.updated_at):estoreStatus;
    const peaks=x.target>0&&x.peaks.length?'<div class="cp-peaks">'+x.peaks.map(r=>peakCard(r,x)).join("")+'</div>':
      '<p class="cp-empty">Cadastre a meta e a curva horária para visualizar os picos de venda.</p>';
    const eDeviation=x.cap!==null&&x.eTarget>0?x.cap-x.eTarget:null;
    const oDeviation=x.orders!==null&&x.orderTarget>0?x.orders-x.orderTarget:null;
    root.innerHTML=
      '<div class="cp-main-tiles">'+
        saleRealTile(x)+
        mainTile("◎","META DO DIA",x.target>0?cash(x.target):"—",x.target>0?"Meta financeira oficial":"Meta ainda não cadastrada",null)+
        mainTile("▥","PROJEÇÃO",x.projection!==null?cash(x.projection):"—",x.projectedAtt!==null?percent(x.projectedAtt)+" da meta":"Aguardando curva e ritmo",x.projectedAtt,"green")+
      '</div>'+
      '<div class="cp-signals">'+
        '<article class="cp-signal '+(x.dev===null?"cp-neutral":x.dev>=0?"cp-good":"cp-bad")+'"><div>◆ <b>DESVIO DA META</b></div><strong>'+(x.dev===null?"—":signedMoney(x.dev))+'</strong></article>'+
        '<article class="cp-signal '+(x.growth===null?"cp-neutral":x.growth>=0?"cp-good":"cp-bad")+'"><div>▲ <b>RITMO VS HORA ANTERIOR</b></div><strong>'+(x.growth===null?"—":signedPct(x.growth))+'</strong>'+
          (x.delta!==null?'<span>('+signedMoney(x.delta)+' /h)</span>':'<span>Aguardando comparação válida</span>')+'</article>'+
      '</div>'+
      '<section class="cp-peakbox"><h2>⚡ HORÁRIOS DE PICO <small>(CURVA HISTÓRICA)</small></h2>'+peaks+'</section>'+
      '<section class="cp-estore"><div class="cp-estore-head"><h2>🛍️ eStore <small>(acumulado do dia)</small></h2>'+
        '<div class="cp-estore-share"><span>SHARE eSTORE</span><b>'+(x.share===null?"—":percent(x.share,2))+'</b></div></div>'+
        '<div class="cp-estore-body"><div class="cp-estore-goal"><strong>'+(x.eAtt===null?"Aguardando parcial eStore":percent(x.eAtt)+" da meta financeira")+'</strong>'+meter(x.eAtt)+
        '<span>Meta: '+(x.eTarget>0?cash(x.eTarget):"não cadastrada")+'</span></div>'+
        '<div class="cp-estore-metrics">'+
          '<div><span>VENDA</span><strong>'+(x.cap===null?"—":cash(x.cap))+'</strong></div>'+
          '<div><span>PEDIDOS</span><strong>'+(x.orders===null?"—":count(x.orders))+'</strong><small>'+(x.oAtt===null?"Meta: "+(x.orderTarget||"—"):percent(x.oAtt)+" da meta • "+x.orderTarget+" pedidos")+'</small>'+meter(x.oAtt)+'</div>'+
          '<div><span>DESVIO</span><strong class="'+(eDeviation!==null&&eDeviation<0?"cp-text-bad":"cp-text-good")+'">'+(eDeviation===null?"—":signedMoney(eDeviation))+'</strong><small>'+(oDeviation===null?"Pedidos: —":(oDeviation>0?"+":"")+count(oDeviation)+" pedidos")+'</small></div>'+
        '</div><p class="cp-source">Share calculado sobre a venda real da filial (Web), não sobre a venda operacional Flash.</p></div></section>'+
      '<div class="cp-bottom">'+
        '<section class="cp-bottom-tile cp-highlight"><h2>🏆 DESTAQUE</h2><strong>'+(x.best?safe(x.best.name):"Aguardando resultado")+'</strong>'+
        '<b>'+(x.best?percent(x.best.sale/x.best.target*100):"—")+'</b><small>Maior atingimento por grupo</small></section>'+
        '<section class="cp-bottom-tile cp-pressure"><h2>⚠ MAIORES PRESSÕES</h2>'+
        (x.pressures.length?'<ol>'+x.pressures.map(r=>'<li>'+safe(r.name)+' <small>'+signedMoney(r.gap)+'</small></li>').join("")+'</ol>':
          '<p>'+(x.has?"Sem pressões negativas identificadas na curva atual.":"Aguardando parcial e curva histórica.")+'</p>')+
        '<small>Desvio frente à meta proporcional ao horário</small></section>'+
      '</div>'+
      '<p class="cp-fineprint">Fonte: venda real do Meu Acompanhamento + eStore CE+PI. A projeção é estimativa pela curva, não previsão garantida. Dados sujeitos ao horário de atualização de cada fonte.</p>';
  }
  async function fetchEstore(force=false){
    if(!isVisible())return;
    const key=context(),date=localDate();
    if(estoreKey!==key){estoreController?.abort();estoreKey=key;estoreRow=null;lastFetch=0;estoreStatus="Consultando eStore";render();}
    if(!force&&estoreBusy&&estoreKey===key)return;
    if(!force&&Date.now()-lastFetch<60000)return;
    estoreController?.abort();
    const ctl=new AbortController(),id=++estoreSeq;
    estoreController=ctl;estoreBusy=true;lastFetch=Date.now();
    const timeout=setTimeout(()=>ctl.abort(),14000);
    try{
      const r=await fetch(ESTORE_API,{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
        body:JSON.stringify({action:"hourly_get",matricula:String(state.matricula),result_date:date}),signal:ctl.signal});
      const payload=await r.json().catch(()=>({}));
      if(!r.ok||payload.ok!==true||!Array.isArray(payload.stores))throw Error(payload.error||"Parcial oficial indisponível");
      if(payload.result_date&&payload.result_date!==date)throw Error("Data eStore diferente da data do cockpit");
      if(id!==estoreSeq||context()!==key)return;
      const row=payload.stores.find(x=>String(x.st||"").replace(/\D/g,"").padStart(3,"0")===store());
      if(!row)throw Error("Filial não retornada pelo eStore");
      estoreRow=row;estoreStatus=row.updated_at?"Parcial oficial recebida":"Sem lançamento eStore hoje";
    }catch(e){
      if(id!==estoreSeq||context()!==key)return;
      estoreStatus=e.name==="AbortError"?"Consulta eStore excedeu o tempo":"eStore indisponível • atualizar";
      if(!estoreRow)estoreRow=null;
    }finally{
      clearTimeout(timeout);
      if(id===estoreSeq){estoreBusy=false;estoreController=null;render();}
    }
  }
  async function refreshAll(){
    const btn=$("cockpitRefresh");if(!btn||btn.disabled)return;
    btn.disabled=true;btn.textContent="Atualizando…";
    try{await Promise.all([loadAll(),fetchEstore(true)]);}catch(e){toast("Não foi possível atualizar o cockpit.",true)}
    finally{btn.disabled=false;btn.textContent="↻ Atualizar";render();}
  }
  async function share(){
    if(!model)return;
    const x=model;
    const text="📊 COCKPIT DE VENDAS | LOJA "+store()+"\n"+dayLabel()+" • "+(x.has?time(x.updated):"Sem parcial")+
      "\n\n🎯 Meta: "+(x.target?cash(x.target):"—")+
      "\n🛒 Venda real: "+(x.has?cash(x.sale):"—")+
      "\n📈 Atingimento: "+percent(x.attainment)+
      "\n▲▼ EV. vs A.A.: "+(x.evolution===null?"—":signedPct(x.evolution))+
      "\n🎯 Projeção: "+(x.projection!==null?cash(x.projection):"—")+
      "\n↕️ Desvio: "+(x.dev!==null?signedMoney(x.dev):"—")+
      "\n⏱️ Ritmo: "+signedPct(x.growth)+
      "\n🛍️ eStore: "+(x.cap!==null?cash(x.cap):"—")+" • "+(x.orders!==null?x.orders+" pedidos":"sem parcial")+
      "\n📊 Share eStore: "+percent(x.share,2)+
      "\n🏆 Destaque: "+(x.best?x.best.name+" "+percent(x.best.sale/x.best.target*100):"—");
    try{
      if(navigator.share)await navigator.share({title:"Cockpit de Vendas • Loja "+store(),text});
      else if(navigator.clipboard){await navigator.clipboard.writeText(text);toast("Resumo do cockpit copiado.");}
      else toast("Compartilhamento não disponível neste dispositivo.",true);
    }catch(e){if(e.name!=="AbortError")toast("Não foi possível compartilhar o resumo.",true);}
  }
  function open(){
    if(!isVisible())return;
    render();
    void fetchEstore();
  }
  function init(){
    if(!$("section-cockpit"))return;
    $("cockpitRefresh")?.addEventListener("click",refreshAll);
    $("cockpitShare")?.addEventListener("click",share);
    document.addEventListener("ma:dashboard-ready",()=>{render();setTimeout(render,1700);if(isVisible())void fetchEstore();});
    document.addEventListener("ma:estore-hourly-loaded",e=>{
      const d=e.detail||{},c=d.context||{},key=String(c.store||"").padStart(3,"0")+"|"+c.date;
      if(key!==context()||!Array.isArray(d.stores))return;
      const row=d.stores.find(r=>String(r.st||"").replace(/\D/g,"").padStart(3,"0")===store());
      if(!row)return;
      estoreKey=key;estoreRow=row;estoreStatus="Parcial oficial recebida";lastFetch=Date.now();render();
    });
    document.addEventListener("click",e=>{
      if(e.target.closest('[data-section="cockpit"]'))setTimeout(open,100);
    });
    window.addEventListener("storage",e=>{
      if(e.key==="estore_hourly_changed_v3"&&isVisible())void fetchEstore(true);
    });
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)open();});
    setInterval(()=>{if(isVisible()){render();void fetchEstore();}},60000);
    render();
    setTimeout(open,500);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  window.maCockpit={render,refresh:refreshAll};
})();