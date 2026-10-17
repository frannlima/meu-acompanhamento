/* Guia de decisão operacional — leitura, diagnóstico e ação. 
   Somente frontend; preserva APIs, metas oficiais, painéis e histórico. */
(function(){
  "use strict";
  const WORLD_NAMES={
    feminino:"Feminino",masculino:"Masculino",infantil:"Infantil",
    casa:"Casa",beleza_relogios:"Beleza / Relógios"
  };
  const WORLD_COLORS={
    feminino:"#B63F52",masculino:"#2D6DA9",infantil:"#D6A321",
    casa:"#418A69",beleza_relogios:"#C979A5"
  };
  const EXCLUDED=new Set([320,530,531,532,552]);
  const MANAGER_ROLES=new Set(["supervisor","gerente","administrador"]);
  const el=id=>document.getElementById(id);
  const toNum=value=>Number.isFinite(Number(value))?Number(value):0;
  const fmt=value=>money(value,2);
  const signed=value=>(value>=0?"+ ":"− ")+fmt(Math.abs(value));
  const clean=value=>esc(String(value??""));
  const manager=()=>MANAGER_ROLES.has(state.role);

  function captureClock(){
    const iso=state.day?.captured_at;
    if(!state.day?.has_input||!iso||!Number.isFinite(Date.parse(iso)))return null;
    const entries=new Intl.DateTimeFormat("pt-BR",{
      timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).formatToParts(new Date(iso));
    return {
      hour:Number(entries.find(p=>p.type==="hour")?.value||0)%24,
      minute:Number(entries.find(p=>p.type==="minute")?.value||0),
      label:localTime(iso)
    };
  }

  function getCurve(clock){
    if(!clock||typeof window.getOperationalSalesCurve!=="function")return null;
    const raw=window.getOperationalSalesCurve();
    if(!Array.isArray(raw))return null;
    const rows=raw.map(r=>({h:toNum(r.h),v:toNum(r.fin)}))
      .filter(r=>Number.isInteger(r.h)&&r.h>=0&&r.h<24&&r.v>0)
      .sort((a,b)=>a.h-b.h);
    const total=rows.reduce((acc,r)=>acc+r.v,0);
    if(!rows.length||total<=0)return null;
    const fractionAt=(h,m)=>Math.max(0,Math.min(1,
      rows.reduce((acc,r)=>acc+(r.h<h?r.v:r.h===h?r.v*Math.max(0,Math.min(1,m/60)):0),0)/total));
    const percentage=fractionAt(clock.hour,clock.minute);
    const next=rows.find(r=>r.h>clock.hour);
    const edge=next?next.h:rows[rows.length-1].h+1;
    return {percentage,nextPercentage:fractionAt(edge,0),nextHour:edge,firstHour:rows[0].h};
  }

  function rowsByDco(){
    const unique=new Map();
    const targets=Array.isArray(state.ggTargets)?state.ggTargets:[];
    const inputs=Array.isArray(state.detail?.rows)?state.detail.rows:[];
    targets.forEach(r=>{
      const code=Number(r.dco_code);
      if(Number.isInteger(code)&&code>0&&!EXCLUDED.has(code))
        unique.set(code,{...r,sales_financial:0,sales_physical:0});
    });
    inputs.forEach(r=>{
      const code=Number(r.dco_code);
      if(!Number.isInteger(code)||code<=0||EXCLUDED.has(code))return;
      const previous=unique.get(code)||{};
      unique.set(code,{
        ...previous,...r,
        target_financial:toNum(previous.target_financial)>0?previous.target_financial:r.target_financial,
        target_physical:toNum(previous.target_physical)>0?previous.target_physical:r.target_physical,
        sales_financial:toNum(r.sales_financial),
        sales_physical:toNum(r.sales_physical)
      });
    });
    const classify=window.ggOfficialMapping?.worldOf;
    const ggOf=window.ggOfficialMapping?.ggOf;
    const officialGG=window.getOfficialGgForDco;
    if(typeof classify!=="function")return [];
    const knownWorld={
      Feminino:"feminino",Masculino:"masculino",Infantil:"infantil",
      "Carter's":"infantil","Casa Riachuelo":"casa",
      Beleza:"beleza_relogios",Relógios:"beleza_relogios"
    };
    return [...unique.values()].map(r=>{
      const official=typeof officialGG==="function"?officialGG(r.dco_code):null;
      const world=classify(r)||knownWorld[official]||null;
      const gg=official||(typeof ggOf==="function"?ggOf(r):null);
      return {...r,world,gg};
    }).filter(r=>WORLD_NAMES[r.world]);
  }

  function worldModel(curve){
    const worlds=Object.keys(WORLD_NAMES).map(code=>({
      code,name:WORLD_NAMES[code],color:WORLD_COLORS[code],target:0,sale:0,physical:0,dcos:[]
    }));
    const byCode=new Map(worlds.map(w=>[w.code,w]));
    rowsByDco().forEach(r=>{
      const w=byCode.get(r.world);if(!w)return;
      const target=Math.max(0,toNum(r.target_financial));
      const sale=toNum(r.sales_financial);
      w.target+=target;w.sale+=sale;w.physical+=toNum(r.sales_physical);
      w.dcos.push({
        code:Number(r.dco_code),label:String(r.department||r.gg||"DCO "+r.dco_code),
        gg:r.gg||"Sem GG",target,sale,
        gap:curve? sale-target*curve.percentage:null
      });
    });
    return worlds.filter(w=>w.dcos.length&&w.target>0).map(w=>({
      ...w,
      expected:curve?w.target*curve.percentage:null,
      gap:curve?w.sale-w.target*curve.percentage:null,
      nextExpected:curve?w.target*curve.nextPercentage:null
    }));
  }

  function ensureUI(){
    const clarity=el("clarityHome");
    if(clarity&&!el("decisionGuideHome")){
      const card=document.createElement("section");
      card.id="decisionGuideHome";
      card.className="dg-shell";
      card.setAttribute("aria-label","Direcionamento operacional");
      const after=clarity.querySelector(".clarity-summary");
      if(after)after.insertAdjacentElement("afterend",card);
      else clarity.prepend(card);
    }
    const worldBar=document.querySelector("#section-grupos .world-bar");
    if(worldBar&&!el("decisionGuideWorld")){
      const card=document.createElement("section");
      card.id="decisionGuideWorld";
      card.className="dg-world";
      card.setAttribute("aria-label","Leitura e direcionamento do mundo");
      worldBar.insertAdjacentElement("afterend",card);
    }
    // O ritmo hora a hora é uma ferramenta de primeira leitura, não um conteúdo complementar.
    // Não escondê-lo em <details>: isso inviabilizava a visualização da atualização.
    const advanced=el("dailyEvolutionPanel");
    const collapsed=el("decisionAdvanced");
    if(advanced&&collapsed&&collapsed.contains(advanced)){
      collapsed.parentElement.insertBefore(advanced,collapsed);
      collapsed.remove();
    }
  }

  function actionButtons(items){
    return '<div class="dg-actions">'+items.map(item=>
      '<button type="button" class="dg-btn '+(item.primary?"dg-btn-primary":"")+
      '" data-dg-nav="'+clean(item.nav)+'"'+(item.world?' data-dg-world="'+clean(item.world)+'"':'')+'>'+
      clean(item.label)+' <span aria-hidden="true">↗</span></button>'
    ).join("")+'</div>';
  }
  function emptyCard(){
    const hasMeta=toNum(state.day?.target_financial)>0;
    return '<div class="dg-label">GUIA DO DIA <span class="dg-role">'+(manager()?"SUPERVISÃO":"MEU MUNDO")+'</span></div>'+
      '<div class="dg-title-row"><div><h2>Seu próximo passo está aqui.</h2>'+
      '<p>'+(hasMeta?'A meta já está disponível. Falta registrar a venda para calcular o ritmo esperado por horário.':'Aguardando a meta da filial e a primeira parcial de vendas.')+'</p></div>'+
      '<span class="dg-pill dg-pill-neutral">Aguardando parcial</span></div>'+
      '<div class="dg-empty"><strong>1º Atualize a venda.</strong><span>Depois do input, o app mostrará os desvios frente à curva, as prioridades e as verificações indicadas.</span></div>'+
      actionButtons([{nav:"paste",label:"Atualizar parcial",primary:true},{nav:"worlds",label:"Ver mundos"}]);
  }

  function storeInfo(curve,clock){
    const d=state.day||{},target=toNum(d.target_financial),sale=toNum(d.sales_financial);
    const expected=target*curve.percentage,gap=sale-expected;
    const nextRequired=Math.max(0,target*curve.nextPercentage-sale);
    return {target,sale,expected,gap,nextRequired,clock};
  }
  function homeForManager(info,worlds,curve){
    const needs=worlds.filter(w=>w.gap!==null&&w.gap<0).sort((a,b)=>a.gap-b.gap).slice(0,3);
    const priority=needs[0];
    const tone=info.gap<0?"attention":"good";
    let items;
    if(!worlds.length){
      items='<p class="dg-caveat">Ainda não foi possível relacionar metas e vendas aos mundos. Confira o carregamento dos DCOs antes de indicar uma prioridade.</p>';
    }else if(!needs.length){
      items='<div class="dg-all-good"><b>Todos os mundos mapeados estão no ritmo esperado.</b><span>Mantenha a execução e acompanhe o próximo input.</span></div>';
    }else{
      items='<div class="dg-priority-list">'+needs.map((w,i)=>
        '<button type="button" class="dg-priority" data-dg-nav="worlds" data-dg-world="'+w.code+'">'+
          '<span class="dg-rank">'+(i+1)+'</span><i style="--dg-world:'+w.color+'"></i>'+
          '<span class="dg-priority-title"><b>'+clean(w.name)+'</b><small>Faltam '+fmt(Math.abs(w.gap))+' vs curva até '+info.clock.label+'</small></span>'+
          '<strong>'+signed(w.gap)+'</strong><span class="dg-chevron">›</span></button>'
      ).join("")+'</div>';
    }
    const advice=priority?
      'Alinhe o responsável por <b>'+clean(priority.name)+'</b>, verifique disponibilidade no salão, pendências de reposição e cobertura comercial. Reavalie a ação na próxima parcial.':
      'Mantenha a distribuição de responsabilidades, confirme as prioridades comerciais e acompanhe o ritmo na próxima atualização.';
    return '<div class="dg-label">RADAR DE DECISÃO <span class="dg-role">SUPERVISÃO</span></div>'+
      '<div class="dg-title-row"><div><h2>'+(info.gap<0?'Onde precisamos recuperar?':'Operação acompanhando a curva')+'</h2>'+
      '<p>Desvio comparado ao esperado até a parcial das '+info.clock.label+'. Não é o saldo da meta total.</p></div>'+
      '<span class="dg-pill dg-pill-'+tone+'">'+(info.gap<0?'Abaixo da curva':'No ritmo da curva')+'</span></div>'+
      '<div class="dg-metric-strip">'+
      '<div><span>Venda registrada</span><strong>'+fmt(info.sale)+'</strong></div>'+
      '<div><span>Esperado até '+info.clock.label+'</span><strong>'+fmt(info.expected)+'</strong></div>'+
      '<div><span>Desvio vs curva</span><strong class="dg-val-'+tone+'">'+signed(info.gap)+'</strong></div></div>'+
      '<div class="dg-columns"><div><div class="dg-section-label">MUNDOS PRIORITÁRIOS</div>'+items+'</div>'+
      '<div class="dg-advice"><span class="dg-advice-mark">→</span><b>Direcionamento para a equipe</b><p>'+advice+'</p>'+
      '<small>Até '+String(curve.nextHour).padStart(2,"0")+'h: '+fmt(info.nextRequired)+' necessários para acompanhar a curva da loja.</small></div></div>'+
      '<p class="dg-caveat">Referência horária estimada a partir da curva histórica da loja. Não indica, por si só, causa de perda ou falta de produto.</p>'+
      actionButtons([{nav:"worlds",world:priority?.code,label:"Analisar mundo",primary:true},
        {nav:"commercials",label:"Ver comerciais"},{nav:"paste",label:"Nova parcial"}]);
  }
  function homeForCollaborator(info,worlds,curve){
    const w=worlds.find(item=>item.code===state.world);
    const focus=w?.dcos.filter(d=>d.target>0&&d.gap<0).sort((a,b)=>a.gap-b.gap)[0];
    let content;
    if(!w){
      content='<div class="dg-empty"><b>Selecione seu mundo de atuação.</b><span>Para direcionar por DCO, precisamos da meta oficial do mundo escolhido.</span></div>';
    }else{
      content='<div class="dg-metric-strip">'+
        '<div><span>Venda do '+clean(w.name)+'</span><strong>'+fmt(w.sale)+'</strong></div>'+
        '<div><span>Esperado até '+info.clock.label+'</span><strong>'+fmt(w.expected)+'</strong></div>'+
        '<div><span>Desvio vs curva</span><strong class="dg-val-'+(w.gap<0?'attention':'good')+'">'+signed(w.gap)+'</strong></div></div>'+
        '<div class="dg-advice"><span class="dg-advice-mark">→</span><b>O que fazer na próxima hora?</b><p>'+
        (focus?'Comece pelo <b>'+clean(focus.gg)+'</b> (DCO '+focus.code+'). Confira produto disponível no salão, reposição e oportunidades de atendimento.':
          'Seu mundo está dentro da curva nos DCOs cadastrados. Sustente a abordagem e confira novamente após a próxima parcial.')+
        '</p><small>Referência, não diagnóstico automático da causa.</small></div>';
    }
    return '<div class="dg-label">LEITURA DO MEU MUNDO <span class="dg-role">COLABORADOR</span></div>'+
      '<div class="dg-title-row"><div><h2>'+(w?'Como está '+clean(w.name)+'?':'Acompanhe seu mundo')+'</h2>'+
      '<p>Compare a venda registrada com o esperado até '+info.clock.label+' e saiba onde conferir primeiro.</p></div>'+
      '<span class="dg-pill '+(w?.gap<0?'dg-pill-attention':'dg-pill-neutral')+'">'+(w?.gap<0?'Precisa de atenção':'Foco na execução')+'</span></div>'+
      content+
      actionButtons([{nav:"worlds",world:w?.code,label:"Ver meus DCOs",primary:true},
        {nav:"paste",label:"Atualizar parcial"}]);
  }
  function renderHome(curve,clock,worlds){
    const home=el("decisionGuideHome");if(!home)return;
    if(!state.day?.has_input){home.innerHTML=emptyCard();return;}
    if(!curve){
      home.innerHTML='<div class="dg-label">GUIA DO DIA</div><h2>Curva horária ainda indisponível</h2>'+
        '<p>Há uma parcial registrada, mas não é possível calcular um desvio confiável frente à curva. Os números oficiais permanecem disponíveis nos demais painéis.</p>'+
        actionButtons([{nav:"worlds",label:"Consultar mundos",primary:true},{nav:"paste",label:"Atualizar parcial"}]);
      return;
    }
    const info=storeInfo(curve,clock);
    if(info.target<=0){
      home.innerHTML='<div class="dg-label">GUIA DO DIA</div><h2>Sem meta financeira válida</h2>'+
        '<p>Confira o cadastro da meta do dia antes de interpretar desvios e recomendações. A venda registrada continua visível no painel principal.</p>';
      return;
    }
    home.innerHTML=manager()?homeForManager(info,worlds,curve):homeForCollaborator(info,worlds,curve);
  }

  function renderWorld(curve,clock,worlds){
    const host=el("decisionGuideWorld");if(!host)return;
    const w=worlds.find(item=>item.code===state.world);
    if(!state.day?.has_input){
      host.innerHTML='<div><span class="dg-section-label">LEITURA DO MUNDO</span><b>Meta disponível, aguardando a primeira parcial.</b><small>Depois do input você verá o que merece atenção.</small></div>';
      return;
    }
    if(!curve||!w){
      host.innerHTML='<div><span class="dg-section-label">LEITURA DO MUNDO</span><b>Direcionamento indisponível para este mundo.</b><small>Confira a curva e as metas por DCO antes de agir.</small></div>';return;
    }
    const atRisk=w.dcos.filter(d=>d.target>0&&d.gap<0).sort((a,b)=>a.gap-b.gap).slice(0,2);
    const summary=atRisk.length?
      'Verifique primeiro '+atRisk.map(d=>'<b>'+clean(d.gg)+' • DCO '+d.code+'</b>').join(' e ')+
      '. Confirme abastecimento e oportunidades no salão.':
      'Os DCOs com metas carregadas acompanham a curva. Continue monitorando a próxima parcial.';
    host.innerHTML='<div><span class="dg-section-label">FOCO DO MUNDO • '+clean(w.name)+'</span>'+
      '<b>'+signed(w.gap)+' frente ao esperado até '+clock.label+'</b>'+
      '<small>Referência acumulada: '+fmt(w.expected)+' • realizado: '+fmt(w.sale)+'</small>'+
      '<p>'+summary+'</p></div>'+
      actionButtons([{nav:"paste",label:"Atualizar parcial"},{nav:"commercials",label:"Ver equipe"}]);
  }

  function render(){
    if(!state.logged)return;
    ensureUI();
    const clock=captureClock(),curve=getCurve(clock),worlds=worldModel(curve);
    renderHome(curve,clock,worlds);
    renderWorld(curve,clock,worlds);
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-dg-nav]");
    if(!button)return;
    const action=button.dataset.dgNav;
    if(action==="paste"){showPaste();return;}
    if(action==="worlds"){
      if(WORLD_NAMES[button.dataset.dgWorld])state.world=button.dataset.dgWorld;
      if(typeof window.renderGroups==="function")window.renderGroups();
      setSection("grupos");render();return;
    }
    if(action==="commercials"){setSection("comerciais");return;}
  });
  document.addEventListener("click",event=>{
    if(event.target.closest("[data-gg-world]"))queueMicrotask(render);
  });
  const dashboard=window.renderDashboard;
  if(typeof dashboard==="function")window.renderDashboard=function(){
    const result=dashboard.apply(this,arguments);render();return result;
  };
  const groups=window.renderGroups;
  if(typeof groups==="function")window.renderGroups=function(){
    const result=groups.apply(this,arguments);render();return result;
  };
  document.addEventListener("ma:dashboard-ready",render);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);
  else render();
  window.renderDecisionGuide=render;
})();