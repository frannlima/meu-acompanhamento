
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
            interval_sales_financial:0
          });
        }
        const g=map.get(code);
        g.target_financial+=Number(r.target_financial||0);
        g.sales_financial+=Number(r.sales_financial||0);
        g.target_physical+=Number(r.target_physical||0);
        g.sales_physical+=Number(r.sales_physical||0);
        g.ly_financial+=Number(r.ly_financial||0);
        g.interval_sales_financial+=Number(r.interval_sales_financial||0);
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
      '<section class="clarity-journey card">'+
        '<div class="clarity-card-head"><div><span class="eyebrow">ROTINA DO DIA</span><h2>Acompanhe em 3 passos</h2><p>Uma sequência simples para manter a operação atualizada.</p></div></div>'+
        '<div class="clarity-journey-steps">'+
          '<button type="button" id="clarityPasteShortcut"><b>1</b><span><strong>Atualizar parcial</strong><small>Cole a venda da Web quando houver uma nova leitura.</small></span><i>›</i></button>'+
          '<button type="button" data-clarity-section="grupos"><b>2</b><span><strong>Analisar resultado</strong><small>Veja grupos, DCOs, evolução e desvios.</small></span><i>›</i></button>'+
          '<button type="button" id="clarityShareShortcut"><b>3</b><span><strong>Compartilhar Hora a Hora</strong><small>Envie o card consolidado da loja para o time.</small></span><i>›</i></button>'+
        '</div>'+
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
    const groups=groupRows();
    const rows=groups.map(g=>{
      const meta=Number(g.target_financial||0),venda=Number(g.sales_financial||0);
      const ating=meta?venda/meta*100:0,aa=Number(g.ly_financial||0);
      const ev=aa&&d.has_input?((venda/aa)-1)*100:null,dev=venda-meta;
      return '<tr>'+
        '<td><b>'+esc(GROUP_LABELS[g.group_code]||g.group_code)+'</b></td>'+
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
    const W=920,H=270,p={l:54,r:18,t:20,b:40};
    const innerW=W-p.l-p.r,innerH=H-p.t-p.b;
    const allLabels=expected.map(x=>x.label);
    const x=i=>p.l+(allLabels.length<=1?0:i/(allLabels.length-1))*innerW;
    const y=v=>p.t+innerH-(maxVal?Math.max(0,v)/maxVal:0)*innerH;
    const expPts=expected.map((d,i)=>x(i)+","+y(d.value)).join(" ");
    const actualMapped=[];
    for(const a of actual){
      let idx=expected.findIndex(e=>e.h===a.h);
      if(idx<0) idx=Math.max(0,Math.min(expected.length-1,a.h-expected[0].h));
      actualMapped.push({idx,value:a.value});
    }
    const actPts=actualMapped.map(d=>x(d.idx)+","+y(d.value)).join(" ");
    const grids=[0,.25,.5,.75,1].map(f=>{
      const yy=p.t+innerH-innerH*f;
      return '<line x1="'+p.l+'" x2="'+(W-p.r)+'" y1="'+yy+'" y2="'+yy+'" stroke="#E7E4DB" stroke-width="1"/>'+
        '<text x="'+(p.l-8)+'" y="'+(yy+4)+'" text-anchor="end" font-size="10" fill="#7A8580">'+Math.round(maxVal*f/1000)+'k</text>';
    }).join("");
    const ticks=expected.map((d,i)=>'<text x="'+x(i)+'" y="'+(H-13)+'" text-anchor="middle" font-size="10" fill="#6F7C77">'+d.label+'</text>').join("");
    const circles=actualMapped.map(d=>'<circle cx="'+x(d.idx)+'" cy="'+y(d.value)+'" r="4.5" fill="#173F35"/>').join("");
    return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Curva de vendas">'+
      grids+
      '<polyline fill="none" stroke="#9BA7A3" stroke-width="3" stroke-dasharray="7 7" points="'+expPts+'"/>'+
      (actPts?'<polyline fill="none" stroke="#173F35" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="'+actPts+'"/>'+circles:"")+
      ticks+
      '</svg>'+
      '<div class="clarity-curve-legend"><span><i class="real"></i>Venda acumulada</span><span><i class="expected"></i>Meta acumulada pela curva</span></div>';
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
      ["Ating. esperado",target?pct(finPct*100):"—",""],
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

  async function createDailyCardBlob(){
    const d=state.day||{},groups=groupRows();
    const curve=curveForStore();
    const tp=timeParts(d.captured_at||null);
    const expectedPct=expectedPctAt(curve,tp.h,tp.m,"fin");
    const width=2048,rowH=78,headerH=290,footerH=95;
    const height=headerH+(groups.length+1)*rowH+footerH;
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d");
    const C={green:"#173F35",soft:"#466964",cream:"#F7F4ED",white:"#FFFFFF",line:"#DAD9D6",red:"#B6454B",good:"#2E6B58",orange:"#DE7C00",muted:"#6F7C77",pink:"#E68699"};

    ctx.fillStyle=C.cream;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=C.green;ctx.fillRect(0,0,width,212);

    try{
      const logo=await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src="./assets/riachuelo-logo.svg";
      });
      ctx.fillStyle=C.white;ctx.roundRect(56,40,310,88,18);ctx.fill();
      ctx.drawImage(logo,82,64,258,40);
    }catch(_){
      ctx.fillStyle=C.white;ctx.font="800 42px Arial";ctx.fillText("RIACHUELO",58,82);
    }

    ctx.fillStyle=C.white;ctx.textAlign="center";ctx.font="800 42px Arial";
    ctx.fillText("HORA A HORA | RESULTADO DO DIA",width/2,82);
    ctx.font="600 18px Arial";ctx.fillStyle="#D6D2C4";
    ctx.fillText("Loja "+state.storeCode+" • "+new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR")+" • "+(d.captured_at?"Atualizado "+localTime(d.captured_at):"Sem input"),width/2,122);
    ctx.textAlign="right";ctx.font="700 15px Arial";ctx.fillStyle=C.white;
    ctx.fillText("Moda que inspira o Brasil",width-58,82);

    const cols=[
      {x:44,w:250,label:"GRUPO",align:"left"},
      {x:294,w:205,label:"META"},
      {x:499,w:205,label:"VENDA"},
      {x:704,w:150,label:"ATING."},
      {x:854,w:210,label:"VENDA A.A."},
      {x:1064,w:160,label:"EVOLUÇÃO"},
      {x:1224,w:210,label:"DESVIO"},
      {x:1434,w:225,label:"PROJEÇÃO"},
      {x:1659,w:345,label:"VENDA FÍSICA"}
    ];

    ctx.fillStyle=C.white;ctx.fillRect(44,232,width-88,54);
    ctx.fillStyle=C.muted;ctx.font="800 14px Arial";
    cols.forEach(col=>{
      ctx.textAlign=col.align==="left"?"left":"center";
      ctx.fillText(col.label,col.align==="left"?col.x+12:col.x+col.w/2,265);
    });

    const drawRow=(y,name,meta,venda,ating,aa,ev,dev,proj,physical,total=false)=>{
      ctx.fillStyle=total?"#E7EFEA":C.white;ctx.fillRect(44,y,width-88,rowH-4);
      ctx.strokeStyle=C.line;ctx.beginPath();ctx.moveTo(44,y+rowH-4);ctx.lineTo(width-44,y+rowH-4);ctx.stroke();

      const vals=[
        name,money(meta,2),money(venda,2),pct(ating),aa?money(aa,2):"—",
        ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev),
        signedMoney(dev,2),
        proj?money(proj,2):"—",
        num(physical)+" peças"
      ];

      vals.forEach((v,i)=>{
        const col=cols[i];
        ctx.textAlign=col.align==="left"?"left":"center";
        let color=C.green;
        if(i===3) color=ating>=100?C.good:ating>=90?C.orange:C.red;
        if(i===5) color=ev===null?C.muted:ev>=0?C.good:C.red;
        if(i===6) color=dev>=0?C.good:C.red;
        if(i===7) color=!proj?C.muted:proj>=meta?C.good:C.red;
        ctx.fillStyle=color;
        ctx.font=(total?"800 ":"700 ")+(i===0?17:15)+"px Arial";
        ctx.fillText(v,col.align==="left"?col.x+12:col.x+col.w/2,y+46);
      });
    };

    let y=292;
    for(const g of groups){
      const meta=Number(g.target_financial||0),venda=Number(g.sales_financial||0),aa=Number(g.ly_financial||0);
      const ating=meta?venda/meta*100:0;
      const ev=aa&&d.has_input?((venda/aa)-1)*100:null;
      const dev=venda-meta;
      const proj=expectedPct>0&&d.has_input?venda/expectedPct:0;
      const physical=Number(g.sales_physical||0);
      drawRow(y,GROUP_LABELS[g.group_code]||g.group_code,meta,venda,ating,aa,ev,dev,proj,physical,false);
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

    ctx.textAlign="left";ctx.fillStyle=C.soft;ctx.font="700 15px Arial";
    ctx.fillText("MEU ACOMPANHAMENTO",48,height-36);
    ctx.textAlign="right";ctx.fillText("Riachuelo • Moda que inspira o Brasil",width-48,height-36);

    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Falha ao gerar card.")),"image/png",1));
  }

  function buildDailyShareSummary(){
    const d=state.day||{},groups=groupRows();
    const curve=curveForStore(),tp=timeParts(d.captured_at||null),expectedPct=expectedPctAt(curve,tp.h,tp.m,"fin");
    const meta=Number(d.target_financial||0),venda=Number(d.sales_financial||0),aa=Number(d.ly_financial||0);
    const physical=Number(d.sales_physical||0),att=meta?venda/meta*100:0,dev=venda-meta;
    const ev=aa&&d.has_input?((venda/aa)-1)*100:null,proj=expectedPct>0&&d.has_input?venda/expectedPct:0;
    const ranked=[...groups].map(g=>({name:GROUP_LABELS[g.group_code]||g.group_code,dev:Number(g.sales_financial||0)-Number(g.target_financial||0),att:Number(g.target_financial||0)?Number(g.sales_financial||0)/Number(g.target_financial||0)*100:0})).sort((a,b)=>b.att-a.att);
    const best=ranked.slice(0,3).map(x=>x.name+" "+pct(x.att)).join(" • ");
    const gaps=[...ranked].sort((a,b)=>a.dev-b.dev).slice(0,3).map(x=>x.name+" "+signedMoney(x.dev,0)).join(" • ");
    return '📊 *HORA A HORA | LOJA '+state.storeCode+'*\n'+
      'Atualizado '+(d.captured_at?localTime(d.captured_at):"—")+'\n\n'+
      '🎯 *Meta:* '+money(meta,2)+'\n'+
      '💰 *Venda:* '+money(venda,2)+' • '+pct(att)+'\n'+
      '↕️ *Desvio:* '+signedMoney(dev,2)+'\n'+
      '📅 *Venda Ano Anterior:* '+(aa?money(aa,2):"—")+'\n'+
      '📈 *Evolução:* '+(ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev))+'\n'+
      '🔭 *Projeção:* '+(proj?money(proj,2):"—")+'\n'+
      '🛍️ *Venda física:* '+num(physical)+' peças\n\n'+
      '🏆 *Maiores atingimentos:* '+(best||"—")+'\n'+
      '⚠️ *Maiores desvios:* '+(gaps||"—")+'\n\n'+
      '_Moda que inspira o Brasil_';
  }

  async function shareDailyCard(){
    const btn=$("clarityShareDaily"),old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent="Gerando...";}
    try{
      const blob=await createDailyCardBlob();
      const file=new File([blob],"Hora_a_Hora_Loja_"+state.storeCode+"_"+localDate()+".png",{type:"image/png"});
      const textMsg=buildDailyShareSummary();
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({title:"Hora a Hora • Resultado do Dia",text:textMsg,files:[file]});
      }else{
        const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        if(navigator.clipboard) await navigator.clipboard.writeText(textMsg).catch(()=>{});
        toast("Card gerado e resumo copiado.");
      }
    }catch(e){if(e?.name!=="AbortError") toast(e.message||"Não foi possível compartilhar.",true);}
    finally{if(btn){btn.disabled=false;btn.textContent=old||"Compartilhar card";}}
  }

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

  function renderClarity(){
    ensureHome();
    renderMenuDayMeta();
    renderOperationalTools();
    if(!$("clarityHome")) return;
    renderExecutive();
    renderGroupsPanel();
    renderCurve();
  }


  function renderWorldHeaderClarity(){
    const all=detailRows();
    const rows=all.filter(r=>state.world==="todos" || r.world_code===state.world || (state.world==="beleza_relogios" && ["beleza","relogios"].includes(r.group_code)));
    const total=rows.reduce((a,r)=>{
      a.meta+=Number(r.target_financial||0);
      a.venda+=Number(r.sales_financial||0);
      a.aa+=Number(r.ly_financial||0);
      return a;
    },{meta:0,venda:0,aa:0});
    const ating=total.meta?total.venda/total.meta*100:0;
    const ev=total.aa&&rows.length?((total.venda/total.aa)-1)*100:null;
    const dev=total.venda-total.meta;
    const box=$("worldKpis");
    if(box){
      const items=[
        ["Meta",rows.length?money(total.meta,2):"—",""],
        ["Venda",rows.length?money(total.venda,2):"—",ating>=100?"positive":ating>=90?"warning":"negative"],
        ["Atingimento",rows.length?pct(ating):"—",ating>=100?"positive":ating>=90?"warning":"negative"],
        ["Venda A.A.",total.aa?money(total.aa,2):"—",""],
        ["Evolução",ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev),ev===null?"":tone(ev)],
        ["Desvio",rows.length?signedMoney(dev,2):"—",rows.length?tone(dev):""]
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
