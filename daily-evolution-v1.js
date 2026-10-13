/* Ritmo de Vendas — Hoje x A.A. | Meu Acompanhamento (CE+PI). */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const currency=value=>money(value,2);
  const amount=value=>Number.isFinite(Number(value))?Number(value):0;
  const positive=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
  const clockHour=iso=>{
    const parts=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit",hourCycle:"h23",hour12:false}).formatToParts(new Date(iso));
    return {h:Number(parts.find(p=>p.type==="hour")?.value||0)%24,m:Number(parts.find(p=>p.type==="minute")?.value||0)};
  };
  const timeLabel=h=>String(h).padStart(2,"0")+"h";
  const signed=value=>!Number.isFinite(value)?"—":(value<0?"− ":"+ ")+currency(Math.abs(value));
  const percent=value=>!Number.isFinite(value)?"—":(value>0?"+ ":"")+value.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%";
  const short=value=>Math.abs(value)>=1000?"R$ "+(value/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})+" mil":"R$ "+Math.round(value).toLocaleString("pt-BR");

  function curve(){
    const raw=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
    if(!Array.isArray(raw))return [];
    const list=raw.map(r=>({h:Number(r.h),weight:Number(r.fin)}))
      .filter(r=>Number.isInteger(r.h)&&r.h>=0&&r.h<24&&Number.isFinite(r.weight)&&r.weight>0)
      .sort((a,b)=>a.h-b.h);
    const total=list.reduce((s,r)=>s+r.weight,0);
    return total>0?list.map(r=>({h:r.h,weight:r.weight/total})):[];
  }
  function progress(rows,h,m=0){
    return Math.max(0,Math.min(1,rows.reduce((s,r)=>
      s+(r.h<h?r.weight:r.h===h?r.weight*Math.max(0,Math.min(1,m/60)):0),0)));
  }
  function snapshots(){
    const history=Array.isArray(state.history)?state.history:[];
    const valid=history.filter(r=>r?.captured_at&&Number.isFinite(Date.parse(r.captured_at))&&Number.isFinite(Number(r.sales_financial)))
      .map(r=>({time:r.captured_at,sale:Number(r.sales_financial)}));
    const day=state.day||{};
    if(day.has_input&&day.captured_at&&Number.isFinite(Date.parse(day.captured_at))&&Number.isFinite(Number(day.sales_financial))
       &&!valid.some(r=>r.time===day.captured_at)){
      valid.push({time:day.captured_at,sale:Number(day.sales_financial)});
    }
    valid.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
    const byHour=new Map();
    valid.forEach(r=>{const t=clockHour(r.time);byHour.set(t.h,{sale:r.sale,time:r.time,minute:t.m});});
    return {last:valid.length?valid[valid.length-1]:null,byHour};
  }
  function analytics(){
    const rows=curve(),snap=snapshots(),last=snap.last,aa=positive(state.day?.ly_financial),
      target=positive(state.day?.target_financial),sale=last?last.sale:null;
    const clock=last?clockHour(last.time):null;
    const fraction=clock?progress(rows,clock.h,clock.m):0;
    const expected=aa!==null&&fraction>0?aa*fraction:null;
    const delta=sale!==null&&expected!==null?sale-expected:null;
    const variation=delta!==null&&expected>0?delta/expected*100:null;
    const projection=sale!==null&&fraction>=0.025?sale/fraction:null;
    const next=clock?rows.find(r=>r.h>clock.h):null;
    const nextAA=next&&aa!==null?aa*progress(rows,next.h):null;
    const required=nextAA!==null&&sale!==null?Math.max(0,nextAA-sale):null;
    return {rows,snap,last,aa,target,sale,clock,fraction,expected,delta,variation,projection,next,required};
  }
  function stat(label,value,sub,kind){
    return '<div class="dev-kpi '+(kind||"")+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>';
  }
  function status(model){
    const x=model;
    if(!x.rows.length)return {cls:"warn",badge:"Sem curva",title:"Curva horária indisponível",body:"Não foi possível recuperar a curva histórica da filial. Confira a configuração antes de analisar as referências."};
    if(x.aa===null)return {cls:"warn",badge:"Sem A.A.",title:"Venda A.A. não cadastrada para esta filial",body:"Não foi possível calcular a referência do ano anterior. A venda de hoje e a meta continuam disponíveis, sem estimativas fictícias do A.A."};
    if(x.sale===null)return {cls:"neutral",badge:"Aguardando input",title:"Faça a primeira atualização da venda",body:"Quando a parcial for registrada, o painel comparará o realizado com o A.A. distribuído pela curva histórica da loja."};
    if(x.delta===null)return {cls:"neutral",badge:"Antes da abertura",title:"Aguardando ritmo comparável",body:"A referência horária começa no período operacional da loja. Atualize a parcial durante o expediente."};
    return x.delta>=0?
      {cls:"good",badge:"Acima da referência",title:"Estamos "+signed(x.delta)+" acima do A.A. estimado",body:"O acumulado de hoje supera a referência proporcional do ano anterior até a última atualização."}:
      {cls:"bad",badge:"Abaixo da referência",title:"Precisamos recuperar "+currency(Math.abs(x.delta)),body:"O acumulado de hoje está abaixo da referência proporcional do ano anterior até a última atualização."};
  }
  function direction(x){
    if(x.sale===null)return "Registre a primeira parcial para receber o desafio da próxima hora.";
    if(x.aa===null)return "Sem Venda A.A. válida, não é possível calcular o desafio comparativo. Confirme a base do ano anterior.";
    if(!x.rows.length)return "A curva histórica ainda não foi carregada.";
    if(x.next&&x.required!==null){
      const gap=x.required>0?"Precisamos vender mais <strong>"+currency(x.required)+"</strong>":"Já alcançamos a referência de <strong>"+timeLabel(x.next.h)+"</strong>";
      return gap+" até "+timeLabel(x.next.h)+" para acompanhar o A.A. estimado. <small>Referência prevista ao início desse horário, conforme a curva.</small>";
    }
    return "Última faixa operacional alcançada. Compare o acumulado de hoje com o <strong>A.A. total</strong> para avaliar o fechamento.";
  }
  function chart(x){
    const rows=x.rows;
    if(!rows.length)return '<p class="dev-empty">Curva indisponível.</p>';
    const W=840,H=315,L=77,R=20,T=20,B=55;
    const hourlyCurrent=rows.map(r=>x.snap.byHour.get(r.h)?.sale??null);
    const aa=rows.map(r=>x.aa!==null?x.aa*progress(rows,r.h+1):null);
    const meta=rows.map(r=>x.target!==null?x.target*progress(rows,r.h+1):null);
    const all=[...hourlyCurrent,...aa,...meta].filter(v=>v!==null&&Number.isFinite(v));
    const maximum=Math.max(1,...all);
    const upper=Math.ceil(maximum/10000)*10000||10000;
    const sx=i=>L+i*(W-L-R)/Math.max(1,rows.length-1);
    const sy=v=>T+(upper-v)/upper*(H-T-B);
    let svg="";
    for(let i=0;i<=4;i++){
      const value=upper*i/4,y=sy(value);
      svg+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" stroke="#E5EDE5" stroke-dasharray="4 5"/>';
      svg+='<text x="'+(L-9)+'" y="'+(y+4)+'" text-anchor="end" font-size="12" fill="#6A7F74">'+esc(short(value))+'</text>';
    }
    rows.forEach((r,i)=>{svg+='<text x="'+sx(i)+'" y="'+(H-20)+'" text-anchor="middle" fill="#587268" font-size="12">'+timeLabel(r.h)+'</text>';});
    const lines=[{values:meta,color:"#DC840D",dash:' stroke-dasharray="6 5"'},{values:aa,color:"#376D94",dash:' stroke-dasharray="6 4"'},{values:hourlyCurrent,color:"#178866",dash:""}];
    lines.forEach(line=>{
      const pts=line.values.flatMap((v,i)=>v===null||!Number.isFinite(v)?[]:[{x:sx(i),y:sy(v),value:v,h:rows[i].h}]);
      if(pts.length>=2)svg+='<polyline points="'+pts.map(p=>p.x+","+p.y).join(" ")+'" fill="none" stroke="'+line.color+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"'+line.dash+'/>';
      pts.forEach(p=>{svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="'+line.color+'" stroke="white" stroke-width="1.8"><title>'+timeLabel(p.h)+": "+currency(p.value)+'</title></circle>';});
    });
    return '<div class="dev-chart-scroll"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Evolução acumulada: venda real registrada, A.A. estimado e meta pela curva histórica">'+svg+'</svg></div>';
  }
  function detail(x){
    if(!x.rows.length)return "";
    let body="";
    x.rows.forEach(r=>{
      const point=x.snap.byHour.get(r.h);
      const actual=point?point.sale:null;
      const fraction=point?progress(x.rows,r.h,point.minute):progress(x.rows,r.h+1);
      const expected=x.aa!==null?x.aa*fraction:null;
      const delta=actual!==null&&expected!==null?actual-expected:null;
      const varPct=delta!==null&&expected>0?delta/expected*100:null;
      const change=delta===null?"—":'<span class="'+(delta>=0?"dev-good":"dev-bad")+'">'+signed(delta)+'</span>';
      body+='<tr><th scope="row">'+timeLabel(r.h)+'</th><td>'+(actual===null?"—":currency(actual))+'</td><td>'+(expected===null?"—":currency(expected))+'</td><td>'+change+'</td><td>'+(varPct===null?"—":percent(varPct))+'</td></tr>';
    });
    return '<details class="dev-details"><summary>Ver comparativo detalhado por horário <span>▾</span></summary>'+
      '<div class="dev-table-scroll"><table><thead><tr><th>Faixa</th><th>Hoje acum.</th><th>A.A. est.*</th><th>Δ R$</th><th>Δ %</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
      '<p class="dev-table-note">Os traços indicam horários sem input. Para horários registrados, o A.A. é proporcional ao minuto da atualização; nos demais, é a referência ao fim da faixa.</p></details>';
  }
  function render(){
    const root=$("dailyEvolutionPanel");if(!root||!state.logged)return;
    try{
      const x=analytics(),s=status(x);
      const time=x.last?"Último input às "+localTime(x.last.time):"Aguardando primeira parcial";
      const compare=x.clock?"Referência às "+localTime(x.last.time):"Estimativa após o primeiro input";
      const projection=x.projection!==null?currency(x.projection):"—";
      root.innerHTML=
        '<div class="dev-head"><div class="dev-head-icon" aria-hidden="true">↗</div><div class="dev-heading">'+
        '<span class="eyebrow">INTELIGÊNCIA DE VENDAS • LOJA '+esc(state.storeCode)+'</span>'+
        '<h2>Ritmo de Vendas <em>Hoje × A.A.</em></h2><p>'+time+' • Curva histórica por filial</p></div>'+
        '<button type="button" id="devRefresh" class="dev-refresh" title="Atualizar venda e referências">↻ Atualizar</button></div>'+
        '<div class="dev-filters"><label>Filial<select id="devStore" '+(state.role==="administrador"?"":"disabled")+' aria-label="Filial em análise">'+
        STORE_CODES.map(code=>'<option value="'+code+'" '+(code===String(state.storeCode)?"selected":"")+'>Loja '+code+'</option>').join("")+
        '</select></label><div class="dev-context"><span>Comparativo: A.A. estimado</span><span>Venda real: Hora a Hora</span></div></div>'+
        '<div class="dev-kpis">'+
        stat("Venda hoje",x.sale===null?"—":currency(x.sale),x.sale===null?"Aguardando input":"Realizado acumulado","main")+
        stat("A.A. até o input*",x.expected===null?"—":currency(x.expected),compare,"")+
        stat("Evolução vs A.A.*",x.variation===null?"—":percent(x.variation),x.delta===null?"Sem comparação":signed(x.delta)+" em reais",x.delta===null?"":x.delta>=0?"good":"bad")+
        stat("Projeção de fechamento",projection,x.projection===null?"Aguardando ritmo":"Estimativa pela curva até o último input","")+
        '</div>'+
        '<div class="dev-status '+s.cls+'"><span class="dev-status-badge">'+s.badge+'</span><strong>'+s.title+'</strong><p>'+s.body+'</p></div>'+
        '<div class="dev-chart"><div class="dev-subheading"><h3>Evolução acumulada por hora</h3><p>Hoje: valor real dos inputs • A.A. e meta: referências proporcionais à curva</p></div>'+
        '<div class="dev-legend"><span><i class="dev-dot current"></i>Hoje real</span>'+
        (x.aa!==null?'<span><i class="dev-dot previous"></i>A.A. estimado*</span>':"")+
        (x.target!==null?'<span><i class="dev-dot reference"></i>Meta estimada</span>':"")+'</div>'+chart(x)+'</div>'+
        '<div class="dev-action"><div class="dev-action-icon">🎯</div><div><span>DESAFIO DA PRÓXIMA HORA</span><p>'+direction(x)+'</p></div></div>'+
        '<div class="dev-basis">'+
        '<span>A.A. total: <strong>'+(x.aa===null?"Indisponível":currency(x.aa))+'</strong></span>'+
        '<span>Meta do dia: <strong>'+(x.target===null?"Indisponível":currency(x.target))+'</strong></span></div>'+
        detail(x)+
        '<div class="dev-footer"><p><strong>*Referência estimada:</strong> o total oficial do A.A. é distribuído pela curva histórica de vendas da loja. Não representa vendas horárias reais do ano anterior. A projeção é indicativa, não é uma garantia de fechamento.</p>'+
        '<button type="button" id="devGoGroups" class="dev-groups">Ver Mundos e DCOs →</button></div>';
      $("devRefresh")?.addEventListener("click",()=>{void loadAll()});
      $("devGoGroups")?.addEventListener("click",()=>setSection("grupos"));
      $("devStore")?.addEventListener("change",e=>{
        const store=String(e.target.value);
        if(state.role==="administrador"&&STORE_CODES.includes(store)&&store!==String(state.storeCode))void changeAdminStore(store);
      });
    }catch(error){
      console.error("Erro no painel Hoje x A.A.:",error);
      root.innerHTML='<div class="dev-error"><strong>Não foi possível exibir o Ritmo de Vendas.</strong><p>'+esc(error.message||"Erro inesperado")+'</p><button type="button" id="devRetry">Tentar novamente</button></div>';
      $("devRetry")?.addEventListener("click",render);
    }
  }
  document.addEventListener("ma:dashboard-ready",render);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);
  else render();
})();
