/* Interface orientada a decisões. Usa exclusivamente as bases já carregadas. */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const value=n=>Number.isFinite(Number(n))?Number(n):0;
  const format=n=>money(n,2);
  const worlds=['feminino','masculino','infantil','casa','beleza_relogios'];
  const colors={feminino:'#E03C31',masculino:'#2F6FB0',infantil:'#E0A900',casa:'#2E6B58',beleza_relogios:'#E68699'};
  const labels={...WORLD_LABELS,beleza_relogios:'Beleza'};
  let timer=0,estore=null,expandedCommercials=new Set(),ggMetricsOpen=false;
  const button=(text,action,cls='')=>'<button type="button" class="decision-button '+cls+'" data-decision="'+action+'">'+text+'</button>';
  function fraction(){
    const d=state.day||{};
    if(!d.has_input||!d.captured_at||!Number.isFinite(Date.parse(d.captured_at)))return null;
    const rows=window.getOperationalSalesCurve?.()||[];
    const total=rows.reduce((s,r)=>s+value(r.fin),0);
    if(!total)return null;
    const parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(d.captured_at));
    const h=value(parts.find(p=>p.type==='hour')?.value),m=value(parts.find(p=>p.type==='minute')?.value);
    return Math.min(1,Math.max(0,rows.reduce((s,r)=>s+value(r.fin)*(h>r.h?1:h===r.h?m/60:0),0)/total));
  }
  function worldTotals(){
    const map=new Map();
    (Array.isArray(state.ggTargets)?state.ggTargets:[]).forEach(r=>map.set(value(r.dco_code),{...r}));
    (typeof detailRows==='function'?detailRows():[]).forEach(r=>{
      const code=value(r.dco_code),old=map.get(code);
      map.set(code,old?{...old,...r,target_financial:old.target_financial??r.target_financial,target_physical:old.target_physical??r.target_physical}:r);
    });
    const progress=fraction(),totals=new Map();
    for(const r of map.values()){
      if(value(r.dco_code)===320)continue;
      const code=window.ggOfficialMapping?.worldOf(r);
      if(!worlds.includes(code))continue;
      if(!totals.has(code))totals.set(code,{code,target:0,sale:0,count:0});
      const t=totals.get(code);t.target+=value(r.target_financial);t.sale+=value(r.sales_financial);t.count++;
    }
    return [...totals.values()].map(t=>({...t,att:t.target>0?t.sale/t.target*100:null,gap:progress!==null&&t.target>0?t.sale-t.target*progress:null})).sort((a,b)=>(a.gap??Infinity)-(b.gap??Infinity));
  }
  function permitted(section){
    const controls=[...document.querySelectorAll('[data-section="'+section+'"],[data-more-section="'+section+'"]')];
    return !controls.length||controls.some(el=>!el.classList.contains('profile-hidden'));
  }
  function ensureSection(key,title,copy){
    let section=byId('section-'+key);
    if(!section){
      section=document.createElement('section');section.id='section-'+key;section.className='section';
      section.innerHTML='<div class="section-head decision-section-head"><div><h1>'+title+'</h1><p>'+copy+'</p></div></div>';
      document.querySelector('.main')?.appendChild(section);
    }
    return section;
  }
  function fold(node,id,label,parent){
    if(!node||!parent)return null;
    let wrapper=byId(id);
    if(!wrapper){wrapper=document.createElement('details');wrapper.id=id;wrapper.className='decision-fold';const summary=document.createElement('summary');summary.textContent=label;wrapper.appendChild(summary);parent.appendChild(wrapper);}
    if(node.parentElement!==wrapper)wrapper.appendChild(node);
    return wrapper;
  }
  function ensureLayout(){
    document.documentElement.classList.add('decision-ui');
    const home=byId('section-inicio');if(!home)return;
    if(!byId('decisionHome')){const host=document.createElement('div');host.id='decisionHome';home.appendChild(host);}
    const hour=ensureSection('hora','Hora a Hora','Atualize a parcial e acompanhe o ritmo frente à meta.');
    if(!byId('decisionHourActions')){
      const actions=document.createElement('div');actions.id='decisionHourActions';actions.className='decision-hour-actions';
      actions.innerHTML=button('＋ Atualizar parcial','paste')+button('Compartilhar parcial','share','secondary');
      hour.appendChild(actions);
    }
    const curve=document.querySelector('.clarity-curve');
    if(curve&&curve.parentElement!==hour)hour.appendChild(curve);

    fold(byId('dailyEvolutionPanel'),'decisionAA','Consultar referência estimada do A.A.',hour);
    fold(document.querySelector('.home-group-panel'),'decisionSharePanel','Visualizar painel compartilhável por grupo',hour);
    const routine=ensureSection('rotina','Minha rotina','Checklist de preparo da operação.');
    const checklist=byId('claritySupervisorChecklist');
    const checklistFold=fold(checklist,'decisionChecklist','Preparo da operação',byId('decisionHome'));
    // A rotina mantém as mesmas marcações salvas por matrícula, filial e dia.
    if(!byId('decisionRoutineLink')){const p=document.createElement('p');p.id='decisionRoutineLink';p.className='decision-note';p.innerHTML=button('Abrir checklist de hoje','checklist','secondary');routine.appendChild(p);}
    if(checklistFold){checklistFold.classList.toggle('hidden',!['supervisor','gerente','administrador'].includes(state.role));checklistFold.querySelector('summary').textContent='Preparo da operação · '+(byId('clarityChecklistDone')?.textContent||'');}
    const history=ensureSection('historico','Histórico do dia','Parciais registradas na filial selecionada.');
    if(!byId('decisionHistory')){const host=document.createElement('div');host.id='decisionHistory';host.className='decision-card';history.appendChild(host);}
    const estoreSection=byId('section-estore'),live=byId('estoreLivePanel'),entry=byId('estoreHourEntry');
    if(estoreSection&&live&&entry&&live.compareDocumentPosition(entry)&Node.DOCUMENT_POSITION_PRECEDING)estoreSection.insertBefore(live,entry);
    fold(document.querySelector('.estore-hub-grid'),'decisionEstoreTools','Outros recursos eStore',estoreSection);
    const list=document.querySelector('#section-mais .premium-more-list');
    if(list&&!byId('decisionMoreTools')){const tools=document.createElement('div');tools.id='decisionMoreTools';tools.innerHTML=button('Hora a Hora · atualizar e analisar','hora','secondary')+button('Histórico · parciais do dia','historico','secondary')+button('Minha rotina · checklist','checklist','secondary');list.prepend(tools);}
    const routineButton=byId('decisionMoreTools')?.querySelector('[data-decision="checklist"]');
    if(routineButton)routineButton.classList.toggle('hidden',!['supervisor','gerente','administrador'].includes(state.role));
    const sidebar=byId('nav');
    if(sidebar&&!byId('decisionNavHour')){const b=document.createElement('button');b.id='decisionNavHour';b.className='nav-item';b.dataset.section='hora';b.textContent='Hora a Hora';b.onclick=()=>setSection('hora');sidebar.insertBefore(b,sidebar.children[1]||null);}
  }
  function homeHtml(){
    const d=state.day||{},has=!!d.has_input,target=value(d.target_financial),sale=value(d.sales_financial),att=target>0?sale/target*100:null;
    const f=fraction(),expected=target>0&&f!==null?target*f:null,gap=has&&expected!==null?sale-expected:null;
    const all=worldTotals(),worst=all.find(t=>t.gap!==null&&t.gap<0);
    const digital=estore&&estore.store===String(state.storeCode).padStart(3,'0')&&estore.date===localDate()?estore:null;
    let priorities='';
    if(!has)priorities='<div class="decision-empty"><strong>Comece com a primeira parcial</strong><p>Os focos por mundo serão calculados com a venda registrada.</p></div>';
    else if(worst)priorities='<button type="button" class="decision-priority" data-focus-world="'+worst.code+'"><span class="decision-world-mark" style="background:'+colors[worst.code]+'"></span><span><strong>'+esc(labels[worst.code])+' · maior desvio em R$</strong><small>'+format(Math.abs(worst.gap))+' abaixo da curva às '+localTime(d.captured_at)+'</small><em>Ver GGs e DCOs para definir a ação</em></span><b aria-hidden="true">›</b></button>';
    else priorities='<div class="decision-empty"><strong>'+(all.some(t=>t.gap!==null)?'Mundos acompanhando a curva':'Metas dos mundos em carregamento')+'</strong><p>'+(all.some(t=>t.gap!==null)?'Acompanhe a próxima parcial e os DCOs.':'O foco será calculado quando as metas estiverem disponíveis.')+'</p></div>';
    const digitalCopy=digital?.has&&digital.share!==null?pct(digital.share)+' de share sobre a venda real':digital?.error?'Consulta eStore indisponível':digital?.has?'Falta a venda real da loja para calcular o share':'Aguardando parcial eStore';
    priorities+='<button type="button" class="decision-priority" data-decision="estore"><span class="decision-icon" aria-hidden="true">▣</span><span><strong>eStore · acompanhar captação</strong><small>'+esc(digitalCopy)+'</small><em>Abrir resultado e lançar parcial</em></span><b aria-hidden="true">›</b></button>';
    return '<div class="decision-title"><h2>O dia em foco</h2><span>'+(has?'Parcial '+localTime(d.captured_at):'Aguardando parcial')+'</span></div>'+
      '<section class="decision-card decision-result"><span class="decision-label">Vendido até agora</span><strong class="decision-value">'+(has?format(sale):'Aguardando input')+'</strong>'+
      '<div class="decision-progress" role="progressbar" aria-label="Atingimento da meta diária" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.max(0,Math.min(100,att||0)).toFixed(1)+'"><i style="width:'+Math.max(0,Math.min(100,att||0)).toFixed(1)+'%"></i></div>'+
      '<div class="decision-result-bottom"><b>'+(has&&att!==null?pct(att)+' da meta':'Meta do dia')+'</b><span>'+ (target>0?format(target):'Meta não cadastrada')+'</span></div>'+
      '<div class="decision-gap"><span>'+(expected!==null?'Esperado pela curva às '+localTime(d.captured_at)+': '+format(expected):'Ritmo disponível após o primeiro input')+'</span><strong class="'+(gap!==null&&gap<0?'negative':'positive')+'">'+(gap===null?'Atualize a venda para iniciar a leitura':format(Math.abs(gap))+(gap<0?' abaixo':' acima')+' do ritmo esperado')+'</strong></div>'+
      button('＋ Atualizar hora a hora','paste')+'<div class="decision-links">'+button('Analisar ritmo','hora','text')+button('Compartilhar parcial','share','text')+'</div>'+
      '<details class="decision-result-details"><summary>Outros indicadores da loja</summary><div class="decision-extra"><span>Venda física<b>'+(has?num(d.sales_physical)+' peças':'—')+'</b></span><span>Saldo para meta<b>'+(has&&target>0?format(Math.max(0,target-sale)):'—')+'</b></span></div></details></section>'+
      '<div class="decision-title decision-priority-title"><h3>Onde agir agora</h3></div><div class="decision-priorities">'+priorities+'</div>';
  }
  function renderHome(){
    const root=byId('decisionHome');if(!root)return;
    let content=byId('decisionHomeContent');
    if(!content){content=document.createElement('div');content.id='decisionHomeContent';root.prepend(content);}
    const html=homeHtml();if(content.innerHTML!==html)content.innerHTML=html;
  }
  function renderWorlds(){
    const section=byId('section-grupos');if(!section)return;
    let host=byId('decisionWorlds');
    if(!host){host=document.createElement('section');host.id='decisionWorlds';host.className='decision-card';const bar=section.querySelector('.world-bar');if(bar)bar.insertAdjacentElement('beforebegin',host);else section.appendChild(host);}
    const totals=worldTotals(),has=!!state.day?.has_input;
    host.innerHTML='<div class="decision-title"><h2>Prioridades por mundo</h2><span>Desvio frente à curva</span></div>'+worlds.map(code=>totals.find(t=>t.code===code)||{code,target:0,sale:0,att:null,gap:null}).sort((a,b)=>(a.gap??Infinity)-(b.gap??Infinity)).map(t=>
      '<button type="button" class="decision-world-row '+(state.world===t.code?'selected':'')+'" data-focus-world="'+t.code+'"><span class="decision-world-mark" style="background:'+colors[t.code]+'"></span><span class="decision-row-name"><strong>'+esc(labels[t.code])+'</strong><small>'+(has&&t.att!==null?pct(t.att)+' da meta do mundo':t.target>0?'Meta '+format(t.target):'Meta em carregamento')+'</small></span><span class="decision-row-number '+(t.gap!==null&&t.gap<0?'negative':'positive')+'">'+(t.gap===null?'—':signedMoney(t.gap,2))+'<small>vs curva</small></span><b aria-hidden="true">›</b></button>').join('');
  }
  function compactCommercials(){
    const rows=Array.isArray(state.commercial?.commercials)?state.commercial.commercials:[];
    const cards=[...document.querySelectorAll('#commercialGrid > .commercial-card')];
    cards.forEach((card,i)=>{
      const r=rows[i];if(!r)return;
      const key=String(state.storeCode)+'|'+String(r.id??r.commercial_id??r.commercial_name??i);
      const target=commercialTargetValue(r),sale=value(r.sales_financial),att=target>0?sale/target*100:null;
      let head=card.querySelector('.decision-commercial-head');
      if(!head){head=document.createElement('button');head.type='button';head.className='decision-commercial-head';card.prepend(head);}
      head.setAttribute('aria-expanded',String(expandedCommercials.has(key)));
      let detail=card.querySelector('.decision-commercial-detail');
      if(!detail){detail=document.createElement('div');detail.className='decision-commercial-detail';detail.id='decision-commercial-detail-'+i;card.appendChild(detail);}
      head.setAttribute('aria-controls',detail.id);
      [...card.children].filter(el=>el!==head&&el!==detail).forEach(el=>detail.appendChild(el));
      detail.hidden=!expandedCommercials.has(key);
      const photo=r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="">':'<span>'+esc(String(r.commercial_name||'?').split(/\s+/).slice(0,2).map(s=>s[0]).join(''))+'</span>';
      head.innerHTML='<b class="decision-rank">'+(i+1)+'º</b><span class="decision-avatar">'+photo+'</span><span class="decision-commercial-name"><strong>'+esc(r.commercial_name||'Comercial')+'</strong><small>'+(Array.isArray(r.dcos)?r.dcos.length:0)+' DCOs · tocar para detalhes</small></span><span class="decision-att">'+(state.day?.has_input&&att!==null?pct(att):'—')+'</span><b aria-hidden="true">'+(detail.hidden?'⌄':'⌃')+'</b>';
      head.onclick=()=>{if(expandedCommercials.has(key))expandedCommercials.delete(key);else expandedCommercials.add(key);detail.hidden=!expandedCommercials.has(key);head.setAttribute('aria-expanded',String(!detail.hidden));head.lastElementChild.textContent=detail.hidden?'⌄':'⌃';};
    });
  }
  function simplifyWorldDetail(){
    const panel=byId('groupContent');
    const detail=panel?.querySelector('.gg-detail');if(!detail)return;
    const metricsFold=fold(detail.querySelector('.gg-metrics'),'decisionGgMetrics','Outros indicadores deste GG',detail);
    if(metricsFold){metricsFold.open=ggMetricsOpen;metricsFold.ontoggle=()=>{ggMetricsOpen=metricsFold.open;};}
    const head=byId('worldKpis');
    if(head){const metrics=[...head.children];metrics.forEach((el,i)=>el.classList.toggle('decision-optional-kpi',i>1));}
  }
  function renderHour(){
    const parent=byId('section-hora');if(!parent)return;
    let host=byId('decisionHourMetrics');
    if(!host){host=document.createElement('div');host.id='decisionHourMetrics';host.className='decision-card decision-hour-metrics';byId('decisionHourActions')?.insertAdjacentElement('afterend',host);}
    const d=state.day||{},f=fraction(),sale=value(d.sales_financial),target=value(d.target_financial);
    const expected=d.has_input&&f!==null&&target>0?target*f:null,projection=d.has_input&&f>=0.025?sale/f:null;
    host.innerHTML='<div><span>Esperado até a parcial</span><strong>'+(expected===null?'—':format(expected))+'</strong><small>'+(d.captured_at?'Curva às '+localTime(d.captured_at):'Aguardando input')+'</small></div><div><span>Projeção de fechamento</span><strong>'+(projection===null?'—':format(projection))+'</strong><small>Estimativa pela curva da loja</small></div>';
  }
  function renderHistory(){
    const host=byId('decisionHistory');if(!host)return;
    const rows=(Array.isArray(state.history)?state.history:[]).filter(r=>r.captured_at&&Number.isFinite(Date.parse(r.captured_at))).slice().sort((a,b)=>Date.parse(b.captured_at)-Date.parse(a.captured_at));
    host.innerHTML=rows.length?rows.map(r=>'<div class="decision-history-row"><strong>'+localTime(r.captured_at)+'</strong><span>'+format(value(r.sales_financial))+'<small>'+num(r.sales_physical)+' peças · acumulado</small></span></div>').join(''):'<p class="decision-note">Nenhuma parcial registrada hoje.</p>';
  }
  function refresh(){
    if(!state.logged)return;
    ensureLayout();renderHome();renderWorlds();simplifyWorldDetail();compactCommercials();renderHour();renderHistory();
    document.querySelectorAll('[data-decision="estore"]').forEach(el=>el.classList.toggle('hidden',!permitted('estore')));
    document.querySelectorAll('[data-focus-world]').forEach(el=>el.classList.toggle('hidden',!permitted('grupos')));
    const dockSection=['hora','historico','rotina'].includes(state.section)?'mais':state.section;
    document.querySelectorAll('.mobile-dock [data-section]').forEach(el=>{el.classList.toggle('active',el.dataset.section===dockSection);if(el.dataset.section===dockSection)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,80);}
  for(const name of ['renderDashboard','renderGroups','renderCommercials','renderClarityHome','setSection']){
    const old=window[name];if(typeof old!=='function')continue;
    window[name]=function(...args){const result=old.apply(this,args);schedule();return result;};
  }
  document.addEventListener('click',e=>{
    const focus=e.target.closest('[data-focus-world]');
    if(focus){if(!permitted('grupos'))return;state.world=focus.dataset.focusWorld;renderGroups();setSection('grupos');schedule();setTimeout(()=>byId('groupContent')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}),120);return;}
    const action=e.target.closest('[data-decision]')?.dataset.decision;if(!action)return;
    if(action==='paste'){showPaste();return;}
    if(action==='share'){byId('shareGroupPanelHome')?.click();return;}
    if(action==='checklist'){setSection('inicio');const fold=byId('decisionChecklist');if(fold){fold.open=true;fold.scrollIntoView({behavior:'smooth',block:'start'});}return;}
    if(permitted(action))setSection(action);
  });
  document.addEventListener('change',e=>{if(e.target.matches('[data-clarity-check]'))schedule();});
  document.addEventListener('ma:estore-snapshot',e=>{estore=e.detail;schedule();});
  document.addEventListener('ma:dashboard-ready',schedule);
  document.addEventListener('DOMContentLoaded',()=>{ensureLayout();setTimeout(refresh,450);});
  window.refreshDecisionUi=refresh;
})();
