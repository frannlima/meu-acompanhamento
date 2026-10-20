
(function(){
  "use strict";

  const STREET_STORES=new Set(["084","113","146"]);
  const SALES_CURVES={
    SHOPPING:[
      {h:10,label:"10h",fin:.040774719673802244,cup:.04531410916580845,pcs:.04294478527607362},
      {h:11,label:"11h",fin:.07543323139653416,cup:.07312049433573635,pcs:.07668711656441718},
      {h:12,label:"12h",fin:.0744138634046891,cup:.07621009268795058,pcs:.07464212678936605},
      {h:13,label:"13h",fin:.0744138634046891,cup:.07415036045314109,pcs:.07464212678936605},
      {h:14,label:"14h",fin:.08053007135575943,cup:.082389289392379,pcs:.08077709611451943},
      {h:15,label:"15h",fin:.09072375127421,cup:.08959835221421215,pcs:.09100204498977506},
      {h:16,label:"16h",fin:.09378185524974515,cup:.09268795056642637,pcs:.09611451942740287},
      {h:17,label:"17h",fin:.09174311926605505,cup:.09474768280123584,pcs:.09100204498977506},
      {h:18,label:"18h",fin:.09683995922528033,cup:.09886714727085479,pcs:.09713701431492842},
      {h:19,label:"19h",fin:.10601427115188584,cup:.10401647785787847,pcs:.10531697341513294},
      {h:20,label:"20h",fin:.10601427115188584,cup:.10298661174047374,pcs:.1032719836400818},
      {h:21,label:"21h",fin:.06116207951070337,cup:.05973223480947477,pcs:.05930470347648262},
      {h:22,label:"22h",fin:.00815494393476045,cup:.006179196704428424,pcs:.007157464212678937}
    ],
    RUA:[
      {h:8,label:"08h",fin:.024096385542168672,cup:.029233870967741934,pcs:.025075225677031094},
      {h:9,label:"09h",fin:.08835341365461848,cup:.0967741935483871,pcs:.0872617853560682},
      {h:10,label:"10h",fin:.13052208835341364,cup:.1350806451612903,pcs:.13239719157472415},
      {h:11,label:"11h",fin:.1475903614457831,cup:.14213709677419353,pcs:.1464393179538616},
      {h:12,label:"12h",fin:.13855421686746988,cup:.13911290322580647,pcs:.14042126379137412},
      {h:13,label:"13h",fin:.1255020080321285,cup:.11693548387096774,pcs:.119358074222668},
      {h:14,label:"14h",fin:.1004016064257028,cup:.10483870967741936,pcs:.10230692076228685},
      {h:15,label:"15h",fin:.10542168674698794,cup:.10181451612903225,pcs:.10832497492477433},
      {h:16,label:"16h",fin:.08734939759036144,cup:.08165322580645161,pcs:.08625877632898696},
      {h:17,label:"17h",fin:.048192771084337345,cup:.047379032258064516,pcs:.04714142427281846},
      {h:18,label:"18h",fin:.004016064257028112,cup:.005040322580645161,pcs:.0050150451354062184}
    ]
  };

  const curveForStore=()=>STREET_STORES.has(String(state.storeCode).padStart(3,"0"))?SALES_CURVES.RUA:SALES_CURVES.SHOPPING;
  // A mesma curva aprovada é utilizada pelo painel HH no menu inicial.
  window.getOperationalSalesCurve=()=>curveForStore().map(item=>({h:item.h,fin:item.fin}));
  const formatForStore=()=>STREET_STORES.has(String(state.storeCode).padStart(3,"0"))?"Loja de rua • 08h–18h":"Shopping • 10h–22h";

  function timeParts(iso){
    const date=iso?new Date(iso):new Date();
    const parts=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(date);
    return {
      h:Number(parts.find(p=>p.type==="hour")?.value||0),
      m:Number(parts.find(p=>p.type==="minute")?.value||0)
    };
  }

  function expectedPctAt(curve,h,m,key="fin"){
    let sum=0;
    for(const row of curve){
      if(h>row.h) sum+=Number(row[key]||0);
      else if(h===row.h) sum+=Number(row[key]||0)*Math.max(0,Math.min(1,m/60));
    }
    if(h>curve[curve.length-1].h) return 1;
    return Math.max(0,Math.min(1,sum));
  }

  function cumulativeCurve(curve,key="fin"){
    let acc=0;
    return curve.map(r=>({label:r.label,h:r.h,pct:(acc+=Number(r[key]||0))}));
  }

  function groupRows(){
    // Prioriza a base detalhada do dia, que é a mesma referência das metas por DCO.
    // Isso evita grupos com venda carregada e meta zerada no painel inicial.
    const detail=detailRows();
    if(detail.length){
      const map=new Map();
      for(const r of detail){
        const code=r.group_code||"outros";
        if(!map.has(code)){
          map.set(code,{
            group_code:code,
            target_financial:0,
            sales_financial:0,
            target_physical:0,
            sales_physical:0,
            ly_financial:0,
            interval_sales_financial:0,
            previous_interval_sales_financial:0,
            has_previous_interval:false
          });
        }
        const g=map.get(code);
        g.target_financial+=Number(r.target_financial||0);
        g.sales_financial+=Number(r.sales_financial||0);
        g.target_physical+=Number(r.target_physical||0);
        g.sales_physical+=Number(r.sales_physical||0);
        g.ly_financial+=Number(r.ly_financial||0);
        g.interval_sales_financial+=Number(r.interval_sales_financial||0);
        if(r.previous_interval_sales_financial!==null && r.previous_interval_sales_financial!==undefined){
          g.previous_interval_sales_financial+=Number(r.previous_interval_sales_financial||0);
          g.has_previous_interval=true;
        }
      }
      const arr=[...map.values()].map(g=>{
        const meta=Number(g.target_financial||0);
        const venda=Number(g.sales_financial||0);
        const ly=Number(g.ly_financial||0);
        return {
          ...g,
          attainment:meta?venda/meta*100:0,
          deviation:venda-meta,
          evolution_vs_ly:ly?((venda/ly)-1)*100:null
        };
      });
      const ordered=GROUP_ORDER.map(code=>arr.find(g=>g.group_code===code)).filter(Boolean);
      const extras=arr.filter(g=>!GROUP_ORDER.includes(g.group_code));
      return [...ordered,...extras];
    }

    const groups=Array.isArray(state.groupSummary?.groups)?state.groupSummary.groups:[];
    return GROUP_ORDER.map(code=>groups.find(g=>g.group_code===code)).filter(Boolean);
  }

  function tone(v,neutral=false){
    if(neutral) return "";
    return Number(v)>=0?"positive":"negative";
  }

  function ensureHome(){
    const home=$("section-inicio");
    if(!home||$("clarityHome")) return;
    const head=home.querySelector(".section-head");
    const shell=document.createElement("div");
    shell.id="clarityHome";
    shell.className="clarity-home";
    shell.innerHTML=
      '<section class="clarity-summary card">'+
        '<div class="clarity-card-head"><div><span class="eyebrow">RESULTADO DA LOJA • HOJE</span><h2>Seu acompanhamento do dia</h2><p>Veja onde estamos, o que exige atenção e qual deve ser o próximo passo.</p></div>'+
        '<span class="badge soft clarity-status-badge">Acompanhamento em tempo real</span></div>'+
        '<div id="clarityExecutive" class="clarity-executive"></div>'+
      '</section>'+
      '<section class="clarity-groups card">'+
        '<div class="clarity-card-head"><div><span class="eyebrow">HORA A HORA</span><h2>Resultado geral por grupo</h2><p>Leitura única para acompanhamento e compartilhamento da parcial.</p></div>'+
        '<button type="button" id="clarityShareDaily" class="btn primary">Compartilhar card</button></div>'+
        '<div id="clarityGroupsTable" class="clarity-table-wrap"></div>'+
      '</section>'+
      '<section class="clarity-curve card">'+
        '<div class="clarity-card-head"><div><span class="eyebrow">CURVA DE VENDA</span><h2>Expectativa x ritmo do dia</h2><p id="clarityCurveContext"></p></div>'+
        '<span id="clarityCurveStatus" class="badge soft">Curva histórica</span></div>'+
        '<div id="clarityCurveKpis" class="clarity-curve-kpis"></div>'+
        '<div id="clarityCurveChart" class="clarity-curve-chart"></div>'+
        '<div id="clarityCurveHourTable" class="clarity-hour-wrap"></div>'+
      '</section>'+
      '<section class="clarity-routine-grid">'+
        '<section class="clarity-journey card">'+
          '<div class="clarity-card-head"><div><span class="eyebrow">ROTINA DO DIA</span><h2>Acompanhe em 3 passos</h2><p>Uma sequência simples para manter a operação atualizada.</p></div></div>'+
          '<div class="clarity-journey-steps">'+
            '<button type="button" id="clarityPasteShortcut"><b>1</b><span><strong>Atualizar parcial</strong><small>Cole a venda da Web quando houver uma nova leitura.</small></span><i>›</i></button>'+
            '<button type="button" data-clarity-section="grupos"><b>2</b><span><strong>Analisar resultado</strong><small>Veja grupos, DCOs, evolução e desvios.</small></span><i>›</i></button>'+
            '<button type="button" id="clarityShareShortcut"><b>3</b><span><strong>Compartilhar Hora a Hora</strong><small>Envie o card consolidado da loja para o time.</small></span><i>›</i></button>'+
          '</div>'+
        '</section>'+
        '<section id="claritySupervisorChecklist" class="clarity-supervisor-checklist card hidden">'+
          '<div class="clarity-checklist-head">'+
            '<div><span class="eyebrow">MINHA ROTINA DE HOJE</span><h2>Operação pronta?</h2><p>Marque cada ponto já verificado. O percentual mostra o preparo da operação para o dia.</p></div>'+
            '<div class="clarity-checklist-score"><strong id="clarityChecklistPct">0%</strong><span id="clarityChecklistStatus">em preparo</span></div>'+
          '</div>'+
          '<div class="clarity-checklist-progress"><i id="clarityChecklistBar"></i></div>'+
          '<div id="clarityChecklistItems" class="clarity-checklist-items"></div>'+
          '<div class="clarity-checklist-footer"><span id="clarityChecklistDone">0 de 8 concluídos</span><small id="clarityChecklistDate"></small></div>'+
        '</section>'+
      '</section>'+
      '<section class="clarity-actions">'+
        '<button type="button" data-clarity-section="comerciais"><b>◎</b><span>Comerciais</span><small>Meta e performance da equipe</small></button>'+
        '<button type="button" data-clarity-section="estore"><b>▣</b><span>eStore</span><small>Acesso integrado</small></button>'+
      '</section>';
    if(head?.nextSibling) home.insertBefore(shell,head.nextSibling); else home.appendChild(shell);

    $("clarityPasteShortcut").onclick=showPaste;
    $("clarityShareShortcut").onclick=shareDailyCard;
    document.querySelectorAll("[data-clarity-section]").forEach(btn=>btn.onclick=()=>setSection(btn.dataset.claritySection));
    $("clarityShareDaily").onclick=shareDailyCard;
    renderSupervisorChecklist();
  }


  const clarityChecklistLabels=[
    ["hidratacao","Você já se hidratou?","Comece cuidando de você para conduzir o dia com mais presença."],
    ["prioridades","Prioridades alinhadas com a gerência?","Confirme os principais focos e resultados esperados para hoje."],
    ["meta","Meta e curva do dia validadas?","Revise meta financeira, física e curva esperada por horário."],
    ["hc","HC do dia e posicionamento do time definidos?","Garanta cobertura, distribuição e responsabilidades por área."],
    ["comerciais","Comerciais alinhados com meta e foco do dia?","Valide responsáveis, DCOs prioritários e direcionamentos comerciais."],
    ["estore","Meta eStore distribuída para o HC disponível?","Confirme a meta digital e o compromisso de captação do time."],
    ["ruptura","Ruptura, reposição e prioridades operacionais checadas?","Revise os principais desvios que podem impactar a venda do dia."],
    ["omni","Omni, Locker, Retira e SLAs revisados?","Cheque pendências, prazos e experiência dos pedidos digitais."],
    ["lpr","LPR, recebimento e pendências da abertura conferidos?","Valide recebimento, organização, sensores, cabides e pendências críticas."],
    ["mobiles","Mobiles e equipamentos prontos para a operação?","Confirme reinício, atualização e funcionamento dos equipamentos do time."],
    ["comunicacao","Time comunicado sobre prioridades e direcionamentos?","Garanta que todos saibam o foco, a meta e o que precisa acontecer hoje."]
  ];

  function clarityChecklistKey(){
    return "ma_checklist_supervisor_"+localDate()+"_"+String(state.matricula||"")+"_"+String(state.storeCode||"");
  }

  function readClarityChecklist(){
    try{
      const raw=JSON.parse(localStorage.getItem(clarityChecklistKey())||"{}");
      return raw&&typeof raw==="object"?raw:{};
    }catch(_){ return {}; }
  }

  function writeClarityChecklist(data){
    try{ localStorage.setItem(clarityChecklistKey(),JSON.stringify(data)); }catch(_){}
  }

  function renderSupervisorChecklist(){
    const card=$("claritySupervisorChecklist");
    if(!card) return;
    const allowed=["supervisor","gerente","administrador"].includes(String(state.role||"").toLowerCase());
    card.classList.toggle("hidden",!allowed);
    if(!allowed) return;

    const saved=readClarityChecklist();
    const total=clarityChecklistLabels.length;
    const done=clarityChecklistLabels.filter(([id])=>!!saved[id]).length;
    const pct=Math.round(done/total*100);
    const items=$("clarityChecklistItems");
    if(items){
      items.innerHTML=clarityChecklistLabels.map(([id,label,description])=>
        '<label class="clarity-check-item '+(saved[id]?"checked":"")+'">'+
          '<input type="checkbox" data-clarity-check="'+id+'" '+(saved[id]?"checked":"")+'>'+
          '<span class="clarity-check-box">✓</span>'+
          '<span class="clarity-check-copy">'+
            '<strong class="clarity-check-label">'+esc(label)+'</strong>'+
            '<small class="clarity-check-desc">'+esc(description||"")+'</small>'+
          '</span>'+
        '</label>'
      ).join("");
      items.querySelectorAll("[data-clarity-check]").forEach(input=>{
        input.onchange=()=>{
          const next=readClarityChecklist();
          next[input.dataset.clarityCheck]=input.checked;
          next.updated_at=new Date().toISOString();
          writeClarityChecklist(next);
          renderSupervisorChecklist();
        };
      });
    }
    if($("clarityChecklistPct")) $("clarityChecklistPct").textContent=pct+"%";
    if($("clarityChecklistStatus")) $("clarityChecklistStatus").textContent=pct===100?"operação pronta":pct>=75?"quase pronto":pct>0?"em andamento":"em preparo";
    if($("clarityChecklistBar")) $("clarityChecklistBar").style.width=pct+"%";
    if($("clarityChecklistDone")) $("clarityChecklistDone").textContent=done+" de "+total+" concluídos";
    if($("clarityChecklistDate")) $("clarityChecklistDate").textContent=new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");
    card.classList.toggle("is-complete",pct===100);
  }

  function renderExecutive(){
    const d=state.day||{};
    const meta=Number(d.target_financial||0);
    const venda=Number(d.sales_financial||0);
    const ating=meta?venda/meta*100:0;
    const aa=Number(d.ly_financial||0);
    const ev=aa&&d.has_input?((venda/aa)-1)*100:null;
    const desvio=venda-meta;
    const curve=curveForStore();
    const tp=timeParts(d.captured_at||null);
    const expectedPct=expectedPctAt(curve,tp.h,tp.m,"fin");
    const expectedNow=meta*expectedPct;
    const gapCurve=venda-expectedNow;
    const projection=expectedPct>0&&d.has_input?venda/expectedPct:0;
    const projectionAtt=meta&&projection?projection/meta*100:0;

    $("clarityExecutive").innerHTML=
      '<article class="clarity-result-main">'+
        '<div class="clarity-result-label">Venda do dia</div>'+
        '<strong class="clarity-result-value">'+(d.has_input?money(venda,2):"Aguardando input")+'</strong>'+
        '<div class="clarity-result-att '+(d.has_input?(ating>=100?"positive":ating>=90?"warning":"negative"):"")+'">'+(d.has_input?pct(ating)+" da meta":"Cole a primeira parcial")+'</div>'+
        '<div class="clarity-progress"><i style="width:'+Math.max(0,Math.min(100,ating)).toFixed(1)+'%"></i></div>'+
        '<div class="clarity-result-subgrid">'+
          '<div><span>Meta do dia</span><b>'+money(meta,2)+'</b></div>'+
          '<div><span>Desvio</span><b class="'+tone(desvio)+'">'+(d.has_input?signedMoney(desvio,2):"—")+'</b></div>'+
          '<div><span>Projeção</span><b>'+(projection?money(projection,2):"—")+'</b><small>'+(projection?pct(projectionAtt)+" da meta":"")+'</small></div>'+
        '</div>'+
      '</article>'+
      '<div class="clarity-signal-row">'+
        '<article class="clarity-signal '+(ev===null?"":tone(ev))+'"><span>Vs A.A.</span><strong>'+(ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev))+'</strong><small>Venda A.A. '+(aa?money(aa,2):"—")+'</small></article>'+
        '<article class="clarity-signal '+(d.has_input?tone(gapCurve):"")+'"><span>Ritmo atual</span><strong>'+(d.has_input?signedMoney(gapCurve,2):"—")+'</strong><small>vs esperado até agora</small></article>'+
        '<article class="clarity-signal '+(d.has_input?tone(desvio):"")+'"><span>Saldo para meta</span><strong>'+(d.has_input?signedMoney(desvio,2):"—")+'</strong><small>posição do dia</small></article>'+
      '</div>';
  }

  function renderGroupsPanel(){
    const d=state.day||{};
    const groups=(typeof window.getOfficialGgSummaries==="function"
      ? window.getOfficialGgSummaries() : groupRows()).slice().sort((a,b)=>{
        const ma=Number(a.target_financial||0),mb=Number(b.target_financial||0);
        const attA=ma>0?Number(a.sales_financial||0)/ma:-1;
        const attB=mb>0?Number(b.sales_financial||0)/mb:-1;
        return attB-attA || Number(b.sales_financial||0)-Number(a.sales_financial||0);
      });
    const rows=groups.map(g=>{
      const meta=Number(g.target_financial||0),venda=Number(g.sales_financial||0);
      const ating=meta?venda/meta*100:0,aa=Number(g.ly_financial||0);
      const ev=aa&&d.has_input?((venda/aa)-1)*100:null,dev=venda-meta;
      return '<tr>'+
        '<td class="ma-group-label-cell"><b>'+esc(GROUP_LABELS[g.group_code]||g.group_code)+'</b></td>'+
        '<td>'+money(meta,2)+'</td>'+
        '<td>'+money(venda,2)+'</td>'+
        '<td class="'+(ating>=100?"positive":ating>=90?"warning":"negative")+'">'+pct(ating)+'</td>'+
        '<td>'+money(aa,2)+'</td>'+
        '<td class="'+(ev===null?"":tone(ev))+'">'+(ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev))+'</td>'+
        '<td class="'+tone(dev)+'">'+signedMoney(dev,2)+'</td>'+
      '</tr>';
    }).join("");

    const meta=Number(d.target_financial||groups.reduce((a,g)=>a+Number(g.target_financial||0),0));
    const venda=Number(d.sales_financial||groups.reduce((a,g)=>a+Number(g.sales_financial||0),0));
    const aa=Number(d.ly_financial||groups.reduce((a,g)=>a+Number(g.ly_financial||0),0));
    const ating=meta?venda/meta*100:0, ev=aa&&d.has_input?((venda/aa)-1)*100:null,dev=venda-meta;

    $("clarityGroupsTable").innerHTML=
      '<table class="clarity-table"><thead><tr><th>Grupo</th><th>Meta</th><th>Venda</th><th>Ating.</th><th>Venda A.A.</th><th>Ev.</th><th>Desvio</th></tr></thead>'+
      '<tbody>'+rows+
      '<tr class="clarity-total"><td>Total Loja</td><td>'+money(meta,2)+'</td><td>'+money(venda,2)+'</td><td>'+pct(ating)+'</td><td>'+money(aa,2)+'</td><td>'+(ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev))+'</td><td>'+signedMoney(dev,2)+'</td></tr>'+
      '</tbody></table>';
  }

  function svgCurve(expected,actual,maxVal){
    // Série real: snapshots com o minuto original. Curva: meta da Web ponderada por horário.
    const d=state.day||{},rows=curveForStore(),target=Number(d.target_financial||0);
    if(!rows.length||!target)return '<p class="ma2-hint">Cadastre a meta e a curva horária para visualizar a evolução.</p>';
    const first=rows[0].h,last=rows[rows.length-1].h+1;
    const W=920,H=305,L=80,R=22,T=20,B=50;
    const innerW=W-L-R,innerH=H-T-B;
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    const clock=iso=>timeParts(iso);
    const timeNum=t=>clamp(t.h+t.m/60,first,last);
    const sameDay=iso=>{
      if(!iso||!Number.isFinite(Date.parse(iso)))return false;
      return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza"}).format(new Date(iso))===localDate();
    };
    const pts=(Array.isArray(state.history)?state.history:[])
      .filter(r=>sameDay(r.captured_at)&&Number.isFinite(Number(r.sales_financial)))
      .map(r=>({iso:r.captured_at,t:timeNum(clock(r.captured_at)),sale:Number(r.sales_financial)}))
      .filter(p=>p.t>=first&&p.t<=last);
    if(d.has_input&&sameDay(d.captured_at)){
      const t=timeNum(clock(d.captured_at));
      if(!pts.some(p=>p.iso===d.captured_at))pts.push({iso:d.captured_at,t,sale:Number(d.sales_financial||0)});
    }
    pts.sort((a,b)=>a.t-b.t);
    const ref=[{t:first,value:0}],values=[];
    rows.forEach(r=>{
      const value=target*expectedPctAt(rows,r.h+1,0,"fin");
      ref.push({t:Math.min(last,r.h+1),value});
      values.push(value);
    });
    const recent=pts.at(-1)||null;
    const expectedCurrent=recent?target*expectedPctAt(rows,clock(recent.iso).h,clock(recent.iso).m,"fin"):null;
    const currentShare=recent&&target>0?expectedPctAt(rows,clock(recent.iso).h,clock(recent.iso).m,"fin"):null;
    const projection=recent&&currentShare>=.08?recent.sale/currentShare:null;
    const max=Math.max(1,target,projection||0,...pts.map(p=>p.sale),...values)*1.13;
    const x=t=>L+(t-first)/Math.max(.001,last-first)*innerW;
    const y=v=>T+(1-clamp(v/max,0,1))*innerH;
    const path=series=>series.map((p,i)=>(i?"L":"M")+x(p.t).toFixed(1)+","+y(p.value??p.sale).toFixed(1)).join(" ");
    const lineRef=path(ref),lineReal=path(pts);
    const steps=[0,.25,.5,.75,1].map(fr=>{
      const yy=y(max*fr),value=(max*fr/1000);
      return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="#E6EDE7" stroke-width="1"/>'+
        '<text x="'+(L-11)+'" y="'+(yy+4)+'" text-anchor="end" font-size="12" fill="#63766B">'+
        value.toLocaleString("pt-BR",{maximumFractionDigits:0})+' mil</text>';
    }).join("");
    const tickHours=rows.map(r=>r.h).filter((h,i)=>i%2===0||h===rows.at(-1).h);
    const ticks=[...new Set(tickHours)].map(h=>'<text x="'+x(h)+'" y="'+(H-15)+'" text-anchor="middle" fill="#5B7166" font-size="13">'+String(h).padStart(2,"0")+'h</text>').join("");
    const mark=pts.map(p=>'<circle cx="'+x(p.t)+'" cy="'+y(p.sale)+'" r="4.3" fill="#176747" stroke="#fff" stroke-width="2">'+
      '<title>'+localTime(p.iso)+' • '+money(p.sale,2)+'</title></circle>').join("");
    const fill=pts.length>=2?'<path d="'+lineReal+' L'+x(pts.at(-1).t)+','+y(0)+' L'+x(pts[0].t)+','+y(0)+' Z" fill="url(#ma2Area)" opacity=".6"/>':"";
    const goalMarker=recent&&expectedCurrent!==null?
      '<line x1="'+x(recent.t)+'" x2="'+x(recent.t)+'" y1="'+y(recent.sale)+'" y2="'+y(expectedCurrent)+'" stroke="'+(recent.sale<expectedCurrent?"#B44E45":"#23845F")+'" stroke-width="2" stroke-dasharray="3 4"/>'+
      '<circle cx="'+x(recent.t)+'" cy="'+y(expectedCurrent)+'" r="4" fill="#fff" stroke="#9BA7A3" stroke-width="2"/>':"";
    const extrapolation=projection!==null&&recent&&recent.t<last?
      '<path d="M'+x(recent.t)+','+y(recent.sale)+' L'+x(last)+','+y(projection)+'" fill="none" stroke="#DE7C00" stroke-width="3" stroke-dasharray="7 6"/>':"";
    const lastBadge=recent?
      '<circle cx="'+x(recent.t)+'" cy="'+y(recent.sale)+'" r="6.5" fill="#176747" stroke="white" stroke-width="3">'+
        '<title>Última parcial: '+money(recent.sale,2)+' às '+localTime(recent.iso)+'</title></circle>':"";
    const actualLabel=recent?money(recent.sale,0):"—";
    const expectedLabel=recent&&expectedCurrent!==null?money(expectedCurrent,0):"—";
    const gapLabel=recent&&expectedCurrent!==null?signedMoney(recent.sale-expectedCurrent,0):"—";
    const forecastLabel=projection!==null&&target>0?pct(projection/target*100):"—";
    const stat=(label,value,cls="")=>'<div class="ma2-chart-stat '+cls+'"><span>'+label+'</span><strong>'+value+'</strong></div>';
    const highlights='<div class="ma2-chart-highlights">'+
      stat("Venda pura Web",actualLabel)+
      stat("Esperado neste horário",expectedLabel)+
      stat("Diferença vs curva",gapLabel,recent&&expectedCurrent!==null&&recent.sale<expectedCurrent?"warning":"")+
      stat("% projetado",forecastLabel)+'</div>';
    const graphic='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Venda pura Web acumulada por horário, comparada à meta proporcional; projeção estimada em laranja">'+
      '<defs><linearGradient id="ma2Area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A9DEBC" stop-opacity=".6"/><stop offset="100%" stop-color="#EAF6EB" stop-opacity=".08"/></linearGradient></defs>'+
      steps+'<path d="'+lineRef+'" fill="none" stroke="#9BA7A3" stroke-width="3" stroke-dasharray="7 6"/>'+
      fill+(pts.length>=2?'<path d="'+lineReal+'" fill="none" stroke="#176747" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>':"")+
      extrapolation+mark+goalMarker+lastBadge+ticks+'</svg>';
    return highlights+(recent?"":'<p class="ma2-hint">Aguardando primeira parcial para traçar a venda real.</p>')+
      graphic+'<div class="ma2-legend"><span><i></i>Venda pura Web</span><span><i class="goal"></i>Meta pela curva</span>'+
      '<span><i class="forecast"></i>Projeção de fechamento</span></div>'+
      '<p class="ma2-hint">Pontos reais correspondem aos horários dos inputs. Meta e projeção são referências estimadas, não vendas registradas.</p>';
  }

  function renderCurve(){
    const d=state.day||{};
    const curve=curveForStore();
    const target=Number(d.target_financial||0);
    const targetPcs=Number(d.target_physical||0);
    const sale=Number(d.sales_financial||0);
    const salePcs=Number(d.sales_physical||0);
    const tp=timeParts(d.captured_at||null);
    const finPct=expectedPctAt(curve,tp.h,tp.m,"fin");
    const pcsPct=expectedPctAt(curve,tp.h,tp.m,"pcs");
    const cupPct=expectedPctAt(curve,tp.h,tp.m,"cup");
    const expectedNow=target*finPct;
    const expectedPcs=targetPcs*pcsPct;
    const gap=sale-expectedNow;
    const curveProjection=finPct>0&&d.has_input?sale/finPct:0;
    const projDev=curveProjection-target;

    $("clarityCurveContext").textContent=formatForStore()+" • distribuição baseada na curva histórica fornecida";
    $("clarityCurveStatus").textContent=d.captured_at?"Leitura até "+localTime(d.captured_at):"Aguardando input";
    $("clarityCurveKpis").innerHTML=[
      ["Esperado até agora",target?money(expectedNow,2):"—",""],
      ["Realizado",d.has_input?money(sale,2):"—",d.has_input?tone(gap):""],
      ["Desvio vs curva",d.has_input?signedMoney(gap,2):"—",d.has_input?tone(gap):""],
      ["Ating. da curva",d.has_input&&expectedNow>0?pct(sale/expectedNow*100):"—",d.has_input&&expectedNow>0?tone(gap):""],
      ["Projeção pela curva",curveProjection?money(curveProjection,2):"—",curveProjection?tone(projDev):""],
      ["Peças esperado / real",targetPcs?(num(Math.round(expectedPcs))+" / "+num(salePcs)):"—",salePcs>=expectedPcs?"positive":"negative"]
    ].map(r=>'<article class="clarity-mini-kpi '+r[2]+'"><span>'+r[0]+'</span><strong>'+r[1]+'</strong></article>').join("");

    const cum=cumulativeCurve(curve,"fin").map(r=>({label:r.label,h:r.h,value:target*r.pct}));
    const hist=Array.isArray(state.history)?state.history:[];
    const actual=hist.map(r=>{
      const t=timeParts(r.captured_at);
      return {h:t.h,value:Number(r.sales_financial||0)};
    }).filter(r=>r.h>=curve[0].h&&r.h<=curve[curve.length-1].h);
    const maxVal=Math.max(target||0,...cum.map(x=>x.value),...actual.map(x=>x.value),1);
    $("clarityCurveChart").innerHTML=svgCurve(cum,actual,maxVal);

    let accFin=0,accPcs=0;
    $("clarityCurveHourTable").innerHTML=
      '<details><summary>Ver distribuição hora a hora <b>'+formatForStore()+'</b></summary>'+
      '<div class="clarity-table-wrap"><table class="clarity-table compact"><thead><tr><th>Hora</th><th>% Venda</th><th>Meta R$ hora</th><th>Acum. esperado</th><th>Peças hora</th><th>Acum. peças</th><th>Intensidade</th></tr></thead><tbody>'+
      curve.map(r=>{
        accFin+=r.fin;accPcs+=r.pcs;
        const intensity=r.fin>=.10?"Pico":r.fin>=.085?"Alta":r.fin>=.06?"Média":"Baixa";
        return '<tr><td><b>'+r.label+'</b></td><td>'+pct(r.fin*100)+'</td><td>'+money(target*r.fin,2)+'</td><td>'+money(target*accFin,2)+'</td><td>'+num(Math.round(targetPcs*r.pcs))+'</td><td>'+num(Math.round(targetPcs*accPcs))+'</td><td><span class="intensity i-'+intensity.toLowerCase().replace("é","e")+'">'+intensity+'</span></td></tr>';
      }).join("")+
      '</tbody></table></div></details>';
  }

  function officialDailyCardGroups(){
    // O card e o texto de compartilhamento usam a mesma classificação oficial
    // do Panorama por GGs: cada DCO aparece uma única vez; Fanlab integra Masculino.
    const groups=typeof window.getOfficialGgSummaries==="function"
      ? window.getOfficialGgSummaries() : [];
    if(!groups.length){
      throw new Error("GGs oficiais ainda não carregados. Aguarde as metas por DCO e tente compartilhar novamente.");
    }
    return groups.slice().sort((a,b)=>{
      const ma=Number(a.target_financial||0),mb=Number(b.target_financial||0);
      const aa=ma>0?Number(a.sales_financial||0)/ma:-1;
      const ab=mb>0?Number(b.sales_financial||0)/mb:-1;
      return ab-aa || Number(b.sales_financial||0)-Number(a.sales_financial||0);
    });
  }

  async function createDailyCardBlob(){
    const d=state.day||{},groups=officialDailyCardGroups();
    const curve=curveForStore();
    const tp=timeParts(d.captured_at||null);
    const expectedPct=expectedPctAt(curve,tp.h,tp.m,"fin");

    // Alta resolução para compartilhamento em WhatsApp e visualização ampliada.
    const width=2560,rowH=102,headerH=330,summaryH=210,footerH=78;
    const tableH=(groups.length+1)*rowH;
    const height=headerH+tableH+summaryH+footerH;
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";

    const C={
      green:"#173F35",green2:"#466964",cream:"#F7F4ED",white:"#FFFFFF",
      line:"#DAD9D6",red:"#E03C31",redBg:"#FCE8E6",good:"#2E6B58",
      goodBg:"#E4F1EB",orange:"#DE7C00",orangeBg:"#FFF0DD",muted:"#6F7C77",
      total:"#E2ECE7",shadow:"rgba(23,63,53,.08)"
    };
    const rr=(x,y,w,h,r,fill,stroke=null)=>{
      ctx.beginPath();ctx.roundRect(x,y,w,h,r);
      if(fill){ctx.fillStyle=fill;ctx.fill()}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}
    };
    const drawPill=(cx,cy,w,h,text,fg,bg,font="800 22px Larsseit, Arial")=>{
      rr(cx-w/2,cy-h/2,w,h,14,bg);
      ctx.fillStyle=fg;ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=font;
      ctx.fillText(text,cx,cy+1);
    };

    ctx.fillStyle=C.cream;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=C.green;ctx.fillRect(0,0,width,226);

    try{
      const logo=await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src="./assets/riachuelo-logo.svg";
      });
      rr(50,38,500,116,22,C.white);
      ctx.drawImage(logo,95,70,410,55);
    }catch(_){
      rr(50,38,500,116,22,C.white);
      ctx.fillStyle=C.green;ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.font="800 48px Larsseit, Arial";
      ctx.fillText("RIACHUELO",92,110);
    }

    ctx.textBaseline="alphabetic";
    ctx.fillStyle=C.white;ctx.textAlign="center";ctx.font="800 56px Larsseit, Arial";
    ctx.fillText(isDailyClosure()?"FECHAMENTO | RESULTADO DO DIA":"HORA A HORA | RESULTADO DO DIA",width/2,90);
    ctx.font="600 23px Larsseit, Arial";ctx.fillStyle="#D6D2C4";
    ctx.fillText(
      "Loja "+state.storeCode+" • "+new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR")+
      " • "+(d.captured_at?"Atualizado "+localTime(d.captured_at):"Sem input"),
      width/2,138
    );
    ctx.textAlign="right";ctx.font="700 18px Larsseit, Arial";ctx.fillStyle=C.white;
    ctx.fillText("Moda que inspira o Brasil",width-58,82);

    const cols=[
      {x:48,w:360,label:"GRUPO",align:"left"},
      {x:408,w:260,label:"META"},
      {x:668,w:260,label:"VENDA"},
      {x:928,w:190,label:"ATING."},
      {x:1118,w:270,label:"VENDA A.A."},
      {x:1388,w:210,label:"EVOLUÇÃO"},
      {x:1598,w:300,label:"DESVIO"},
      {x:1898,w:300,label:"PROJEÇÃO"},
      {x:2198,w:314,label:"VENDA FÍSICA"}
    ];

    // Cabeçalho dos indicadores em laranja Pantone Riachuelo.
    rr(42,246,width-84,66,18,C.orange);
    // Nomes dos indicadores ampliados; maxWidth impede qualquer sobreposição
    // mesmo em colunas estreitas na imagem compartilhável de 2560 px.
    ctx.fillStyle=C.white;ctx.font="900 27px Larsseit, Arial";ctx.textBaseline="middle";
    cols.forEach((col,i)=>{
      ctx.textAlign=col.align==="left"?"left":"center";
      ctx.fillText(col.label,col.align==="left"?col.x+18:col.x+col.w/2,279,col.w-30);
      if(i>0){
        ctx.strokeStyle="rgba(255,255,255,.34)";
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(col.x,257);
        ctx.lineTo(col.x,301);
        ctx.stroke();
      }
    });

    const rowValues=[];
    const drawRow=(y,name,meta,venda,ating,aa,ev,dev,proj,physical,total=false)=>{
      rr(42,y,width-84,rowH-10,total?20:16,total?C.total:C.white,C.line);
      // Verde institucional na coluna GRUPO, com texto branco em negrito.
      // Mantém a largura original e o espaço de leitura dos demais indicadores.
      rr(44,y+2,cols[0].x+cols[0].w-44,rowH-14,14,C.green);
      ctx.textBaseline="middle";
      ctx.textAlign="left";ctx.fillStyle=C.white;
      ctx.font=(total?"900 ":"800 ")+"28px Larsseit, Arial";
      ctx.fillText(name,cols[0].x+18,y+(rowH-10)/2,cols[0].w-36);

      const base=[
        money(meta,2),money(venda,2),null,aa?money(aa,2):"—",
        null,null,null,num(physical)+" peças"
      ];

      // Meta
      ctx.textAlign="center";ctx.fillStyle=C.green;ctx.font=(total?"800 ":"700 ")+"21px Larsseit, Arial";
      ctx.fillText(base[0],cols[1].x+cols[1].w/2,y+46);
      // Venda
      ctx.fillText(base[1],cols[2].x+cols[2].w/2,y+46);

      // Atingimento com semáforo visual
      const attFg=ating>=100?C.white:ating>=90?C.green:C.white;
      const attBg=ating>=100?C.good:ating>=90?C.orange:C.red;
      drawPill(cols[3].x+cols[3].w/2,y+46,148,54,pct(ating),attFg,attBg,total?"800 24px Larsseit, Arial":"800 22px Larsseit, Arial");

      // Ano anterior
      ctx.fillStyle=C.green;ctx.font=(total?"800 ":"700 ")+"21px Larsseit, Arial";
      ctx.fillText(base[3],cols[4].x+cols[4].w/2,y+46);

      // Evolução
      if(ev===null){
        ctx.fillStyle=C.muted;ctx.fillText("—",cols[5].x+cols[5].w/2,y+46);
      }else{
        const evFg=ev>=0?C.good:C.red,evBg=ev>=0?C.goodBg:C.redBg;
        drawPill(cols[5].x+cols[5].w/2,y+46,164,52,(ev>=0?"▲ ":"▼ ")+pct(ev),evFg,evBg,total?"800 23px Larsseit, Arial":"800 21px Larsseit, Arial");
      }

      // Desvio em destaque
      const devFg=C.white,devBg=dev>=0?C.good:C.red;
      drawPill(cols[6].x+cols[6].w/2,y+46,270,54,signedMoney(dev,2),devFg,devBg,total?"800 23px Larsseit, Arial":"800 21px Larsseit, Arial");

      // Projeção condicionada à meta
      if(proj){
        const projFg=proj>=meta?C.good:C.red,projBg=proj>=meta?C.goodBg:C.redBg;
        drawPill(cols[7].x+cols[7].w/2,y+46,252,52,money(proj,2),projFg,projBg,total?"800 22px Larsseit, Arial":"800 20px Larsseit, Arial");
      }else{
        ctx.fillStyle=C.muted;ctx.fillText("—",cols[7].x+cols[7].w/2,y+46);
      }

      ctx.fillStyle=C.green;ctx.font=(total?"800 ":"700 ")+"21px Larsseit, Arial";
      ctx.fillText(base[7],cols[8].x+cols[8].w/2,y+46);

      rowValues.push({name,meta,venda,ating,dev,proj});
    };

    let y=326;
    for(const g of groups){
      const meta=Number(g.target_financial||0),venda=Number(g.sales_financial||0),aa=Number(g.ly_financial||0);
      const ating=meta?venda/meta*100:0;
      const ev=aa&&d.has_input?((venda/aa)-1)*100:null;
      const dev=venda-meta;
      const proj=expectedPct>0&&d.has_input?venda/expectedPct:0;
      const physical=Number(g.sales_physical||0);
      drawRow(y,g.gg_label||GROUP_LABELS[g.group_code]||g.group_code,meta,venda,ating,aa,ev,dev,proj,physical,false);
      y+=rowH;
    }

    const meta=Number(d.target_financial||groups.reduce((s,g)=>s+Number(g.target_financial||0),0));
    const venda=Number(d.sales_financial||groups.reduce((s,g)=>s+Number(g.sales_financial||0),0));
    const aa=Number(d.ly_financial||groups.reduce((s,g)=>s+Number(g.ly_financial||0),0));
    const physical=Number(d.sales_physical||groups.reduce((s,g)=>s+Number(g.sales_physical||0),0));
    const ating=meta?venda/meta*100:0;
    const ev=aa&&d.has_input?((venda/aa)-1)*100:null;
    const dev=venda-meta;
    const proj=expectedPct>0&&d.has_input?venda/expectedPct:0;
    drawRow(y,"TOTAL LOJA",meta,venda,ating,aa,ev,dev,proj,physical,true);

    // Resumo rápido para leitura em tela pequena.
    const sy=y+rowH+24;
    rr(42,sy,width-84,summaryH-28,24,C.white,C.line);
    ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillStyle=C.green;ctx.font="800 34px Larsseit, Arial";
    ctx.fillText("Resumo rápido",86,sy+70);

    const blocks=[
      {x:560,title:"Meta do dia",value:money(meta,2),sub:"Referência da operação",fg:C.green,bg:C.orangeBg},
      {x:1030,title:"Venda parcial",value:money(venda,2),sub:pct(ating)+" de atingimento",fg:C.green,bg:C.goodBg},
      {x:1530,title:"Projeção",value:proj?money(proj,2):"—",sub:proj?(proj>=meta?"Acima da meta":"Abaixo da meta"):"Aguardando parcial",fg:proj>=meta?C.good:C.red,bg:proj>=meta?C.goodBg:C.redBg}
    ];
    blocks.forEach(b=>{
      rr(b.x,sy+28,390,118,20,b.bg);
      ctx.fillStyle=C.muted;ctx.font="700 16px Larsseit, Arial";ctx.fillText(b.title,b.x+24,sy+55);
      ctx.fillStyle=b.fg;ctx.font="800 27px Larsseit, Arial";ctx.fillText(b.value,b.x+24,sy+88);
      ctx.fillStyle=C.muted;ctx.font="600 15px Larsseit, Arial";ctx.fillText(b.sub,b.x+24,sy+116);
    });

    // Direcionamento visual por grupos: legenda fixa e consistente em todo o Hora a Hora.
    // Cores solicitadas: Feminino vermelho, Masculino azul, Infantil amarelo,
    // Casa verde, Beleza rosa e CBA branco.
    const impactGroups=[
      {label:"Feminino",color:"#D71920"},
      {label:"Masculino",color:"#246BCE"},
      {label:"Infantil",color:"#F4C542"},
      {label:"Casa",color:"#2E7D32"},
      {label:"Beleza",color:"#E75480"},
      {label:"CBA",color:"#FFFFFF",stroke:"#9AA39F"}
    ];
    rr(1970,sy+28,500,118,20,C.white,C.line);
    ctx.fillStyle=C.green;ctx.font="800 16px Larsseit, Arial";ctx.textAlign="left";
    ctx.fillText("Mude o jogo nos grupos de maior impacto na venda /hora",1994,sy+53);
    ctx.fillText("na venda/hora",1994,sy+74);
    impactGroups.forEach((g,i)=>{
      const col=i%3,row=Math.floor(i/3),gx=1994+col*154,gy=sy+96+row*22;
      ctx.beginPath();ctx.arc(gx,gy,6,0,Math.PI*2);
      ctx.fillStyle=g.color;ctx.fill();
      if(g.stroke){ctx.strokeStyle=g.stroke;ctx.lineWidth=1.5;ctx.stroke();}
      ctx.fillStyle=C.green2;ctx.font="700 13px Larsseit, Arial";ctx.fillText(g.label,gx+12,gy+4);
    });

    ctx.textBaseline="alphabetic";ctx.textAlign="left";ctx.fillStyle=C.green2;ctx.font="700 16px Larsseit, Arial";
    ctx.fillText("MEU ACOMPANHAMENTO",48,height-34);
    ctx.textAlign="right";ctx.fillText("Riachuelo • Moda que inspira o Brasil",width-48,height-34);

    return await new Promise((resolve,reject)=>window.RiachueloBrandCards.decorateCanvas(canvas).toBlob(
      b=>b?resolve(b):reject(new Error("Falha ao gerar card.")),
      "image/png",1
    ));
  }


  // Faixa visual compacta acrescida abaixo do card Riachuelo original (intocado).
  // Fonte de eStore: a mesma action hourly_get usada pela tela eStore CE+PI.
  const ESTORE_HOURLY_ENDPOINT="https://fndkjgveeojlywkdrtxe.supabase.co/functions/v1/estore-api";
  let estoreShareCache=null,estoreSharePending=null;

  function businessDateOf(iso){
    if(!iso||!Number.isFinite(Date.parse(iso)))return "";
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(iso));
    const value=k=>p.find(part=>part.type===k)?.value||"";
    return value("year")+"-"+value("month")+"-"+value("day");
  }
  function isDailyClosure(){
    const d=state.day||{},date=localDate(),t=timeParts(d.captured_at||null);
    // Fechamento só com parcial válida da data, não transforma leitura antiga em fechamento.
    return Boolean(d.has_input&&d.captured_at&&businessDateOf(d.captured_at)===date&&(t.h*60+t.m)>=21*60+50);
  }
  const sharePct=value=>value===null||!Number.isFinite(value)?"—":value.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%";
  const shareMoney=value=>value===null||!Number.isFinite(value)?"—":money(value,2);
  const shareSigned=(value,unit="money")=>value===null||!Number.isFinite(value)?"—":
    (value<0?"− ":value>0?"+ ":"")+(unit==="money"?money(Math.abs(value),2):Math.abs(value).toLocaleString("pt-BR"));
  function storeShareContext(){return {store:String(state.storeCode||"").padStart(3,"0"),date:localDate(),matricula:String(state.matricula||"")};}
  function sameShareContext(a,b){return Boolean(a&&b&&a.store===b.store&&a.date===b.date&&a.matricula===b.matricula);}
  async function getOfficialEstoreForShare(force=false){
    const c=storeShareContext();
    if(!state.logged||!c.matricula||!c.store)return null;
    if(!force&&estoreShareCache&&sameShareContext(estoreShareCache.context,c)&&Date.now()-estoreShareCache.checkedAt<90000)return estoreShareCache.value;
    if(estoreSharePending&&sameShareContext(estoreSharePending.context,c))return estoreSharePending.promise;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    const req=(async()=>{
      try{
        const response=await fetch(ESTORE_HOURLY_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({action:"hourly_get",matricula:c.matricula,result_date:c.date}),cache:"no-store",signal:controller.signal});
        const payload=await response.json();
        if(!response.ok||payload.ok!==true||!Array.isArray(payload.stores))throw Error("eStore indisponível");
        if(payload.result_date&&String(payload.result_date)!==c.date)throw Error("Data eStore diferente");
        const row=payload.stores.find(x=>String(x.st||"").padStart(3,"0")===c.store);
        if(!row||!row.updated_at||businessDateOf(row.updated_at)!==c.date)throw Error("Sem parcial eStore válida");
        const numberOrNull=v=>v===null||v===undefined||v===""||!Number.isFinite(Number(v))?null:Number(v);
        const data={
          captured:numberOrNull(row.captured),orders:numberOrNull(row.orders),
          target:numberOrNull(row.metaValue),orderTarget:numberOrNull(row.orderTarget),
          updated_at:row.updated_at
        };
        if(!sameShareContext(c,storeShareContext()))return null;
        estoreShareCache={context:c,checkedAt:Date.now(),value:data};
        return data;
      }catch(e){
        if(sameShareContext(c,storeShareContext()))estoreShareCache={context:c,checkedAt:Date.now()-70000,value:null};
        return null;
      }finally{
        clearTimeout(timer);
        if(estoreSharePending&&sameShareContext(estoreSharePending.context,c))estoreSharePending=null;
      }
    })();
    estoreSharePending={context:c,promise:req};
    return req;
  }
  // Atualização discreta na Home: o clique Compartilhar já encontra a última parcial oficial.
  function queueEstoreSharePrefetch(){
    if(!state.logged||!["administrador","supervisor","gerente"].includes(state.role))return;
    void getOfficialEstoreForShare();
  }
  document.addEventListener("ma:dashboard-ready",queueEstoreSharePrefetch);
  document.addEventListener("ma:estore-hourly-loaded",queueEstoreSharePrefetch);

  function comparableHourlyRates(){
    const day=localDate(),history=Array.isArray(state.history)?state.history:[];
    const pts=history.filter(x=>businessDateOf(x.captured_at)===day&&Number.isFinite(Number(x.sales_financial)))
      .map(x=>({at:x.captured_at,sale:Number(x.sales_financial)}))
      .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    const d=state.day||{};
    if(d.has_input&&businessDateOf(d.captured_at)===day&&!pts.some(p=>p.at===d.captured_at))
      pts.push({at:d.captured_at,sale:Number(d.sales_financial||0)});
    pts.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    const rates=[];
    for(let i=1;i<pts.length;i++){
      const mins=(Date.parse(pts[i].at)-Date.parse(pts[i-1].at))/60000;
      const diff=pts[i].sale-pts[i-1].sale;
      if(mins<40||mins>80||diff<0)continue; // Intervalos incomparáveis ou correção acumulada.
      const h=timeParts(pts[i].at).h;
      const rate=diff*60/mins;
      const prev=rates.at(-1);
      const comparable=prev&&Math.abs(Date.parse(pts[i-1].at)-Date.parse(prev.at))<120000&&
        Math.abs(mins-prev.duration)<=20;
      const delta=comparable?rate-prev.rate:null;
      const growth=comparable&&prev.rate>0?(rate/prev.rate-1)*100:null;
      rates.push({h,at:pts[i].at,duration:mins,rate,delta,growth});
    }
    return rates;
  }
  function shareModel(estore){
    const d=state.day||{},curve=curveForStore(),closed=isDailyClosure();
    const tp=timeParts(d.captured_at||null),weight=expectedPctAt(curve,tp.h,tp.m,"fin");
    const sale=d.has_input?Number(d.sales_financial||0):null;
    const target=Number(d.target_financial)>0?Number(d.target_financial):null;
    const actualPct=sale!==null&&target!==null?sale/target*100:null;
    const projected=sale!==null&&target!==null&&weight>=.08?sale/weight:null;
    const projectedPct=projected!==null&&target!==null?projected/target*100:null;
    const gap=projected!==null&&target!==null?projected-target:null;
    const rates=comparableHourlyRates(),recentRate=rates.at(-1)||null;
    const last=recentRate&&d.captured_at&&Math.abs(Date.parse(d.captured_at)-Date.parse(recentRate.at))<=600000?recentRate:null;
    const declines=rates.filter(r=>r.growth!==null&&r.growth<0)
      .sort((a,b)=>a.growth-b.growth).slice(0,3);
    const hours=curve.map(row=>({h:row.h,weight:Number(row.fin)||0})).filter(r=>r.weight>0);
    const high=[...hours].sort((a,b)=>b.weight-a.weight).slice(0,3).sort((a,b)=>a.h-b.h);
    const future=hours.filter(r=>r.h>=tp.h);
    const futureWeight=future.reduce((a,b)=>a+b.weight,0);
    const remaining=sale!==null&&target!==null?Math.max(0,target-sale):null;
    const peaks=high.map(row=>{
      const byHour=rates.filter(r=>r.h===row.h);
      const lastHour=byHour.at(-1);
      // Horário encerrado: mostra meta proporcional da curva, não inventa realizado.
      const upcoming=!closed&&row.h>=tp.h&&futureWeight>0&&remaining!==null;
      const required=upcoming?remaining*row.weight/futureWeight:(target!==null?target*row.weight:null);
      const label=closed?"Meta curva":upcoming?"Necessário":"Meta curva";
      return {h:row.h,label,required,realized:lastHour?lastHour.rate:null};
    });
    const pressures=officialDailyCardGroups().map(g=>({
      name:g.gg_label||g.group_code||"Grupo",gap:Number(g.sales_financial||0)-Number(g.target_financial||0),
      att:Number(g.target_financial)>0?Number(g.sales_financial||0)/Number(g.target_financial)*100:0
    }));
    const star=[...pressures].sort((a,b)=>b.att-a.att)[0]||null;
    const weak=[...pressures].sort((a,b)=>a.gap-b.gap).slice(0,3).map(g=>g.name);
    const share=estore?.captured!==null&&estore?.captured!==undefined&&sale>0?estore.captured/sale*100:null;
    const storeHours=STREET_STORES.has(String(state.storeCode).padStart(3,"0"))?10:12;
    return {closed,sale,target,actualPct,projected,projectedPct,gap,last,rates,declines,peaks,star,weak,
      avg:sale!==null?sale/storeHours:null,estore,share,
      estoreSaleAtt:estore?.captured!==null&&estore?.captured!==undefined&&estore.target>0?estore.captured/estore.target*100:null,
      estoreOrdersAtt:estore?.orders!==null&&estore?.orders!==undefined&&estore.orderTarget>0?estore.orders/estore.orderTarget*100:null,
      estoreSaleGap:estore?.captured!==null&&estore?.captured!==undefined&&estore.target>0?estore.captured-estore.target:null,
      estoreOrderGap:estore?.orders!==null&&estore?.orders!==undefined&&estore.orderTarget>0?estore.orders-estore.orderTarget:null
    };
  }
  function shareTitle(model){return (model.closed?"FECHAMENTO":"HORA A HORA")+" | LOJA "+state.storeCode;}
  function summaryShareText(model){
    const row=[
      "📊 *"+shareTitle(model)+"*",
      "Venda *"+shareMoney(model.sale)+"* · Ating. *"+sharePct(model.actualPct)+"*",
      "Projeção *"+shareMoney(model.projected)+"* ("+sharePct(model.projectedPct)+") · Desvio *"+shareSigned(model.gap)+"*"
    ];
    if(!model.closed&&model.last&&model.last.growth!==null)row.push("Ritmo "+(model.last.growth>=0?"▲ +":"▼ ")+sharePct(Math.abs(model.last.growth))+" ("+shareSigned(model.last.delta)+"/h)");
    if(model.estore)row.push("eStore: share "+sharePct(model.share)+" · "+shareMoney(model.estore.captured)+" · "+(model.estore.orders===null?"—":Math.trunc(model.estore.orders))+" pedidos");
    return row.join("\n");
  }
  async function shareCompositeImage(cardBlob,model){
    const picture=typeof createImageBitmap==="function"?await createImageBitmap(cardBlob):await new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(cardBlob),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("Falha na montagem do card"))};
      img.src=url;
    });
    const W=picture.width,close=model.closed,extra=close?530:460;
    const canvas=document.createElement("canvas");
    canvas.width=W;canvas.height=picture.height+extra;
    const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    ctx.drawImage(picture,0,0);
    if(typeof picture.close==="function")picture.close();
    const y0=canvas.height-extra,light="#F7F4ED",green="#173F35",muted="#60736B";
    const red="#B94039",positive="#126B4A",orange="#DE7C00";
    const color=n=>n===null||!Number.isFinite(n)?muted:n<0?red:positive;
    const rr=(x,y,w,h,rad,bg,border=null)=>{
      ctx.beginPath();ctx.roundRect(x,y,w,h,rad);ctx.fillStyle=bg;ctx.fill();
      if(border){ctx.strokeStyle=border;ctx.lineWidth=2;ctx.stroke()}
    };
    const txt=(t,x,y,size=27,bold=false,fill=green,max=Infinity)=>{
      ctx.font=(bold?"800 ":"600 ")+size+"px Larsseit, Arial";
      ctx.fillStyle=fill;ctx.textAlign="left";ctx.textBaseline="alphabetic";
      ctx.fillText(String(t),x,y,max);
    };
    const tiny=(t,x,y,w)=>{txt(t,x,y,22,false,muted,w)};
    const val=(t,x,y,w,shade=green)=>txt(t,x,y,34,true,shade,w);
    const fmtH=h=>String(h).padStart(2,"0")+"h";
    const centerText=(t,x,y,w,size=25,shade=green)=>{
      ctx.textAlign="center";ctx.fillStyle=shade;ctx.font="800 "+size+"px Larsseit, Arial";ctx.fillText(String(t),x+w/2,y,w-25);ctx.textAlign="left";
    };
    ctx.fillStyle=light;ctx.fillRect(0,y0,W,extra);
    rr(45,y0+10,W-90,extra-22,22,"#FFFFFF","#DFE7E0");
    rr(45,y0+10,14,extra-22,7,orange);
    txt(shareTitle(model),83,y0+58,38,true,green,1220);
    txt("REFERÊNCIA: AUTOMAÇÃO WEB  •  "+(close?"FECHAMENTO":"PARCIAL DO DIA"),1570,y0+55,22,true,muted,840);
    // Primeira linha: 3 KPIs em uma única faixa.
    const cols=[83,925,1700],cw=[785,725,760],headY=y0+100,valueY=y0+137;
    ["VENDA • ATINGIMENTO","PROJEÇÃO • % PROJETADO","DESVIO PROJETADO"].forEach((x,i)=>tiny(x,cols[i],headY,cw[i]));
    val(shareMoney(model.sale)+"  |  "+sharePct(model.actualPct),cols[0],valueY,cw[0]);
    val(shareMoney(model.projected)+"  |  "+sharePct(model.projectedPct),cols[1],valueY,cw[1]);
    val(shareSigned(model.gap),cols[2],valueY,cw[2],color(model.gap));
    ctx.strokeStyle="#E1E8E2";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(80,y0+158);ctx.lineTo(W-80,y0+158);ctx.stroke();
    // Segunda faixa, sem números fictícios: só períodos efetivamente comparáveis.
    if(close){
      tiny("MÉDIA DE VENDA POR HORA",83,y0+190,590);val(shareMoney(model.avg),83,y0+232,600);
      tiny("HORÁRIOS DE RETRAÇÃO",925,y0+190,1450);
      const decreases=model.declines.length?model.declines.map(p=>fmtH(p.h)+" ▼ "+sharePct(p.growth)).join("   ·   "):"Sem horários comparáveis";
      val(decreases,925,y0+232,1500,model.declines.length?red:muted);
    }else{
      tiny("RITMO VS HORA ANTERIOR",83,y0+190,650);
      const l=model.last,have=!!(l&&l.growth!==null);
      val(have?(l.growth>=0?"▲ +":"▼ ")+sharePct(Math.abs(l.growth))+" ("+shareSigned(l.delta)+"/h)":"Aguardando 2 horas comparáveis",
        83,y0+233,900,have?color(l.growth):muted);
      tiny("3 PRINCIPAIS PICOS • CURVA HISTÓRICA",1120,y0+190,1300);
      model.peaks.forEach((p,i)=>{
        const x=1120+i*445;
        txt(fmtH(p.h)+"  "+shareMoney(p.required),x,y0+230,25,true,green,426);
        txt(p.label,x,y0+253,19,false,muted,410);
      });
    }
    // Fechamento tem linha própria para apresentar os três picos sem alongar demais.
    if(close){
      tiny("3 PRINCIPAIS HORAS DE PICO • CURVA HISTÓRICA",83,y0+270,1200);
      model.peaks.forEach((p,i)=>{
        const x=83+i*800;
        txt(fmtH(p.h)+" • "+shareMoney(p.required)+" (meta da curva)",x,y0+310,28,true,green,750);
      });
    }
    const ey=y0+(close?342:284),e=model.estore;
    rr(78,ey,W-156,109,17,"#ECF5FA","#D7E5EE");
    txt("eSTORE  •  SHARE "+sharePct(model.share),99,ey+32,27,true,"#1D5679",800);
    txt("VENDA "+shareMoney(e?.captured)+"   "+sharePct(model.estoreSaleAtt)+" meta",99,ey+70,28,true,green,980);
    txt("PEDIDOS "+(e?.orders===null||e?.orders===undefined?"—":Math.trunc(e.orders))+"   "+sharePct(model.estoreOrdersAtt)+" meta",1080,ey+70,28,true,green,780);
    txt("DESVIO "+shareSigned(model.estoreSaleGap)+"  |  "+shareSigned(model.estoreOrderGap,"count")+" pedidos",
      1850,ey+70,25,true,color(model.estoreSaleGap),620);
    const iy=ey+140;
    const highlight=model.star?model.star.name+" "+sharePct(model.star.att):"—";
    txt("★ DESTAQUE: "+highlight,83,iy,26,true,green,960);
    txt("▼ MAIORES PRESSÕES: "+(model.weak.join(", ")||"—"),1090,iy,24,true,red,1330);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Não foi possível gerar a legenda.")),"image/png",.96));
  }
  async function shareDailyCard(){
    const btn=$("clarityShareDaily"),old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent="Gerando...";}
    try{
      const context=storeShareContext();
      if(!state.day?.has_input||businessDateOf(state.day.captured_at)!==context.date)throw Error("Atualize a venda Automação Web antes de compartilhar.");
      // Consulta oficial; a ausência de eStore nunca gera valor hipotético.
      const estore=await getOfficialEstoreForShare();
      if(!sameShareContext(context,storeShareContext()))throw Error("A filial mudou durante a preparação do card. Tente novamente.");
      const model=shareModel(estore);
      const image=await createDailyCardBlob();
      const blob=await shareCompositeImage(image,model);
      const prefix=model.closed?"Fechamento":"Hora_a_Hora";
      const file=new File([blob],prefix+"_Loja_"+state.storeCode+"_"+localDate()+".png",{type:"image/png"});
      const textMsg=summaryShareText(model);
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({title:shareTitle(model),text:textMsg,files:[file]});
        window.registrarCompartilhamentoParcial?.();
      }else{
        const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),30000);
        if(navigator.clipboard)await navigator.clipboard.writeText(textMsg).catch(()=>{});
        toast("Card e legenda compacta gerados; resumo copiado.");
      }
    }catch(e){if(e?.name!=="AbortError")toast(e.message||"Não foi possível compartilhar.",true);}
    finally{if(btn){btn.disabled=false;btn.textContent=old||"Compartilhar card";}}
  }

  // Fonte única: o card renderizado na Home e os arquivos compartilháveis usam o mesmo canvas.
  window.maGetDailyCardBlob=()=>createDailyCardBlob();
  window.maShareDailyGroupCard=()=>shareDailyCard();

  // Baixar o MESMO card institucional que o botão Compartilhar utiliza.
  window.maDownloadGroupCard=async function(){
    try{
      if(!state.logged)throw new Error("Entre no aplicativo para baixar o card.");
      const blob=await createDailyCardBlob();
      const filename="Hora_a_Hora_Grupos_Loja_"+state.storeCode+"_"+localDate()+".png";
      const link=document.createElement("a"),url=URL.createObjectURL(blob);
      link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      toast("Card de grupos gerado para download.");
    }catch(error){
      toast(error.message||"Não foi possível baixar o card de grupos.",true);
    }
  };

  function renderOperationalTools(){
    const home=$("section-inicio");
    if(home){
      const topPaste=$("pasteBtn");
      const topReset=$("resetDayBtn");
      if(topPaste) topPaste.classList.add("clarity-hide-home-action");
      if(topReset) topReset.classList.add("clarity-hide-home-action");
    }

    const more=$("section-mais");
    if(!more) return;
    const list=more.querySelector(".premium-more-list");
    if(!list) return;

    if(!$("moreUpdateSalesBtn")){
      const b=document.createElement("button");
      b.id="moreUpdateSalesBtn";
      b.innerHTML='<span class="more-icon">＋</span><div><strong>Atualizar venda do dia</strong><small>Colar nova parcial da Web</small></div><b>›</b>';
      b.onclick=showPaste;
      list.prepend(b);
    }

    if(!$("moreResetDayBtn") && ["administrador","gerente","supervisor"].includes(state.role)){
      const b=document.createElement("button");
      b.id="moreResetDayBtn";
      b.className="danger-tool";
      b.innerHTML='<span class="more-icon">↺</span><div><strong>Zerar acompanhamento</strong><small>Use somente para reiniciar o dia quando necessário</small></div><b>›</b>';
      b.onclick=()=>{ if($("resetDayBtn")) $("resetDayBtn").click(); };
      list.appendChild(b);
    }
  }

  function renderMenuDayMeta(){
    const d=state.day||{};
    const meta=Number(d.target_financial||0);
    const sale=Number(d.sales_financial||0);
    const att=meta?sale/meta*100:0;
    const dev=sale-meta;
    const dateLabel=new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");
    const sections=["inicio","grupos","comerciais","descontos","estore","regional","admin","mais"];

    sections.forEach(id=>{
      const section=$("section-"+id);
      if(!section) return;
      let bar=section.querySelector(".menu-day-meta");
      if(!bar){
        bar=document.createElement("div");
        bar.className="menu-day-meta";
        const head=section.querySelector(":scope > .section-head, :scope > .premium-more-hero");
        if(head) head.insertAdjacentElement("afterend",bar);
        else section.prepend(bar);
      }
      bar.innerHTML=
        '<div class="menu-day-meta-context"><span>'+dateLabel+' • Loja '+esc(state.storeCode)+'</span><b>Meta do dia</b></div>'+
        '<strong>'+ (meta?money(meta,2):"Sem meta") +'</strong>'+
        '<div class="menu-day-meta-mini">'+
          '<span>Venda <b>'+(d.has_input?money(sale,2):"—")+'</b></span>'+
          '<span>Ating. <b>'+(d.has_input?pct(att):"—")+'</b></span>'+
          '<span class="'+(d.has_input?tone(dev):"")+'">Desvio <b>'+(d.has_input?signedMoney(dev,2):"—")+'</b></span>'+
        '</div>';
    });
  }

  function positionSupervisorChecklist(){
    const card=$("claritySupervisorChecklist");
    const home=$("clarityHome");
    if(!card||!home) return;

    const summary=home.querySelector(".clarity-summary");
    const routine=home.querySelector(".clarity-routine-grid");
    const isPhone=window.matchMedia("(max-width: 900px)").matches;

    if(isPhone && summary){
      summary.insertAdjacentElement("afterend",card);
    }else if(routine && card.parentElement!==routine){
      routine.appendChild(card);
    }
  }

  function renderClarity(){
    ensureHome();
    renderMenuDayMeta();
    renderOperationalTools();
    if(!$("clarityHome")) return;
    renderExecutive();
    renderSupervisorChecklist();
    positionSupervisorChecklist();
    renderGroupsPanel();
    renderCurve();
    // Renderizar a camada de ritmo APÓS os módulos antigos, evitando sobrescrita.
    if(typeof window.maOperationalChartsV32?.render==="function")window.maOperationalChartsV32.render();
    if(typeof window.maOperationalShareV32?.refresh==="function")window.maOperationalShareV32.refresh();
  }


  function renderWorldHeaderClarity(){
    const all=detailRows();
    const rows=all.filter(r=>state.world==="todos" || r.world_code===state.world || (state.world==="beleza_relogios" && ["beleza","relogios"].includes(r.group_code)));

    // A meta do mundo existe antes do primeiro input.
    // Para evitar cartões vazios na abertura do dia, a referência de meta vem
    // do resumo oficial por grupos; venda continua vindo da parcial quando houver.
    const summaryGroups=Array.isArray(state.groupSummary?.groups)?state.groupSummary.groups:[];
    const worldGroupMap={
      feminino:["feminino_moda"],
      masculino:["masculino_moda"],
      infantil:["infantil_moda"],
      casa:["moda_casa"],
      beleza_relogios:["beleza","relogios"],
      cba:["cba"],
      lpg:["lpg"],
      basket:["basket"]
    };
    const summaryRows=state.world==="todos"
      ? summaryGroups
      : summaryGroups.filter(g=>(worldGroupMap[state.world]||[state.world]).includes(g.group_code));

    let total;
    if(state.world==="todos"){
      const d=state.day||{};
      total={
        meta:Number(d.target_financial||summaryRows.reduce((s,g)=>s+Number(g.target_financial||0),0)),
        venda:Number(d.sales_financial||0),
        aa:Number(d.ly_financial||summaryRows.reduce((s,g)=>s+Number(g.ly_financial||0),0))
      };
    }else{
      const source=summaryRows.length?summaryRows:rows;
      total=source.reduce((a,r)=>{
        a.meta+=Number(r.target_financial||0);
        a.venda+=Number(r.sales_financial||0);
        a.aa+=Number(r.ly_financial||0);
        return a;
      },{meta:0,venda:0,aa:0});

      // Quando ainda não houve input, o resumo por grupos traz venda zerada,
      // mas a meta e o A.A. já devem aparecer.
      if(rows.length){
        total.venda=rows.reduce((s,r)=>s+Number(r.sales_financial||0),0);
      }
    }

    const hasMeta=total.meta>0;
    const hasInput=!!state.day?.has_input;
    const ating=hasMeta?total.venda/total.meta*100:0;
    const ev=total.aa&&hasInput?((total.venda/total.aa)-1)*100:null;
    const dev=total.venda-total.meta;
    const box=$("worldKpis");
    if(box){
      const items=[
        ["Meta",hasMeta?money(total.meta,2):"—",""],
        ["Venda",hasInput?money(total.venda,2):"—",hasInput?(ating>=100?"positive":ating>=90?"warning":"negative"):""],
        ["Atingimento",hasInput?pct(ating):"—",hasInput?(ating>=100?"positive":ating>=90?"warning":"negative"):""],
        ["Venda A.A.",total.aa?money(total.aa,2):"—",""],
        ["Evolução",ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev),ev===null?"":tone(ev)],
        ["Desvio",hasInput?signedMoney(dev,2):"—",hasInput?tone(dev):""]
      ];
      box.innerHTML=items.map(x=>kpi(x[0],x[1],"",x[2])).join("");
    }
    const visual=$("worldVisualSummary"); if(visual) visual.style.display="none";
    document.querySelectorAll("#groupContent table thead th").forEach(th=>{
      const t=th.textContent.trim();
      if(t==="LY") th.textContent="Venda A.A.";
      if(t==="% Meta") th.textContent="Ating.";
      if(t==="Evol.") th.textContent="Ev.";
    });
  }


  function enhanceCommercialCards(){
    const rows=Array.isArray(state.commercial?.commercials)?state.commercial.commercials:[];
    const cards=[...document.querySelectorAll("#commercialGrid .commercial-card")];
    cards.forEach((card,idx)=>{
      const r=rows[idx];
      if(!r) return;
      const dcos=Array.isArray(r.dcos)?r.dcos:[];
      const direct=Number(r.target_financial||0);
      const target=direct>0?direct:dcos.reduce((s,d)=>s+Number(d.target_financial||d.meta_financial||d.target||0),0);
      const sale=Number(r.sales_financial||0);
      const att=target?sale/target*100:0;
      const dev=sale-target;
      let banner=card.querySelector(".commercial-mobile-summary");
      if(!banner){
        banner=document.createElement("div");
        banner.className="commercial-mobile-summary";
        const top=card.querySelector(".commercial-card-top");
        if(top) top.insertAdjacentElement("afterend",banner); else card.prepend(banner);
      }
      banner.innerHTML=
        '<div><span>Meta</span><strong>'+money(target,2)+'</strong></div>'+
        '<div><span>Venda</span><strong>'+money(sale,2)+'</strong></div>'+
        '<div><span>Ating.</span><strong class="'+(att>=100?"positive":att>=90?"warning":"negative")+'">'+pct(att)+'</strong></div>'+
        '<div><span>Desvio</span><strong class="'+tone(dev)+'">'+signedMoney(dev,2)+'</strong></div>';
    });
  }

  const baseRenderCommercialsClarity=window.renderCommercials;
  window.renderCommercials=function(){
    baseRenderCommercialsClarity();
    enhanceCommercialCards();
    renderMenuDayMeta();
  };

  const baseRenderGroupsClarity=window.renderGroups;
  window.renderGroups=function(){
    baseRenderGroupsClarity();
    renderWorldHeaderClarity();
  };

  const baseSetSectionClarity=window.setSection;
  window.setSection=function(section){
    baseSetSectionClarity(section);
    setTimeout(()=>{renderMenuDayMeta();renderOperationalTools();enhanceCommercialCards();},0);
  };

  const baseRenderDashboard=window.renderDashboard;
  window.renderDashboard=function(){
    baseRenderDashboard();
    renderClarity();
  };

  window.addEventListener("resize",positionSupervisorChecklist,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(positionSupervisorChecklist,120),{passive:true});

  document.addEventListener("DOMContentLoaded",()=>{
    ensureHome();
    const title=document.querySelector("#section-inicio .section-head h1");
    const copy=document.querySelector("#section-inicio .section-head p");
    if(title) title.textContent="Início";
    if(copy) copy.textContent="Resumo do dia, parcial por grupo e curva de venda em uma única tela.";
    renderClarity();
    setTimeout(renderMenuDayMeta,250);
  });

  window.renderClarityHome=renderClarity;
})();
