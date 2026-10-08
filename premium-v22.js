"use strict";

/* Premium Mobile v22 — interface Riachuelo */
(function(){
  const BRAND = {
    green:"#173F35",
    green2:"#466964",
    gray:"#DAD9D6",
    sand:"#D6D2C4",
    orange:"#DE7C00",
    red:"#E03C31",
    burgundy:"#76232F",
    rose:"#E68699"
  };

  if (typeof WORLD_LABELS!=="undefined") WORLD_LABELS.todos="Todos";
  if (typeof WORLD_ORDER!=="undefined" && !WORLD_ORDER.includes("todos")) WORLD_ORDER.unshift("todos");

  function compactPct(v){
    const n=Number(v||0);
    const abs=Math.abs(n);
    if(abs>=10000) return (n/1000).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+" mil%";
    if(abs>=1000) return (n/1000).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+" mil%";
    return pct(n);
  }

  function valueSizeClass(value){
    const len=String(value??"").length;
    return len>=19?"value-xs":len>=15?"value-sm":len>=11?"value-md":"";
  }

  window.kpi = function(label,value,foot,tone=""){
    const cls=valueSizeClass(value);
    return '<article class="kpi premium-kpi '+cls+'"><span>'+esc(label)+'</span><strong class="'+tone+'">'+esc(value)+'</strong><small>'+esc(foot)+'</small></article>';
  };

  window.visualDonut = function(label, ringValue, valueText, note, tone="primary"){
    const txt=String(valueText??"");
    const size=txt.length>10?"donut-value-xs":txt.length>7?"donut-value-sm":"";
    return '<article class="visual-card premium-visual-card">'+
      '<div class="visual-donut '+tone+' '+size+'" style="--p:'+clampPct(ringValue)+'"><div><strong>'+esc(valueText)+'</strong><span>'+esc(label)+'</span></div></div>'+
      '<div class="visual-copy"><b>'+esc(label)+'</b><span>'+esc(note)+'</span></div>'+
    '</article>';
  };

  window.renderHomeVisualSummary = function(metrics){
    const box=$("homeVisualSummary"); if(!box) return;
    const {has,attainment,projectionAttainment,evolution,intervalGrowth,pacePct,projection}=metrics;
    box.innerHTML=
      visualDonut("Atingimento",has?attainment:0,has?compactPct(attainment):"—",has?"Meta financeira do dia":"Aguardando input",has?(attainment>=100?"good":attainment>=90?"warn":"bad"):"neutral")+
      visualDonut("Projeção",projection?projectionAttainment:0,projection?compactPct(projectionAttainment):"—",projection?"Projeção de fechamento":"Disponível após formar ritmo",projection?(projectionAttainment>=100?"good":projectionAttainment>=90?"warn":"bad"):"neutral")+
      visualDonut("Vs LY",evolution===null?0:evolution,evolution===null?"—":compactPct(evolution),evolution===null?"Aguardando venda":(evolution>=0?"Evolução":"Involução"),evolution===null?"neutral":evolution>=0?"good":"bad")+
      visualDonut("Vs hora anterior",intervalGrowth===null?0:intervalGrowth,intervalGrowth===null?"—":compactPct(intervalGrowth),intervalGrowth===null?"Disponível após o 2º input":(intervalGrowth>=0?"Ritmo evoluindo":"Ritmo retraindo"),intervalGrowth===null?"neutral":intervalGrowth>=0?"good":"bad")+
      visualDonut("Ritmo necessário",pacePct||0,has?compactPct(pacePct||0):"—",has?"R$/h atual x necessário":"Aguardando acompanhamento",has?(pacePct>=100?"good":pacePct>=85?"warn":"bad"):"neutral");
  };

  function localClockMinutes(iso){
    const date=iso?new Date(iso):new Date();
    const parts=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(date);
    return Number(parts.find(p=>p.type==="hour")?.value||0)*60+Number(parts.find(p=>p.type==="minute")?.value||0);
  }

  function openingMinutes(opening){
    const m=String(opening||"10:00").match(/(\d{1,2}):(\d{2})/);
    return m?Number(m[1])*60+Number(m[2]):600;
  }

  function effectiveFirstInputMinutes(){
    const d=state.day||{};
    if(!d.has_input || state.history.length!==1) return Number(d.interval_minutes||0);
    const cap=localClockMinutes(d.captured_at);
    const open=openingMinutes(d.opening_time||"10:00");
    const elapsed=cap>=open?cap-open:(1440-open)+cap;
    return Math.max(1,elapsed);
  }

  const baseRenderDashboard=window.renderDashboard;
  window.renderDashboard=function(){
    const d=state.day||{};
    if(d.has_input && state.history.length===1){
      d.interval_minutes=effectiveFirstInputMinutes();
    }
    return baseRenderDashboard();
  };

  function premiumDcoName(r){
    if(Number(r?.dco_code)===500) return "Calçados Femininos";
    return String(r?.department||r?.dco_name||"").replace(/^\d+\s*-?\s*/,"").trim()||"DCO "+String(r?.dco_code||"");
  }

  function currentPaceContext(){
    const d=state.day||{};
    const minutes=(d.has_input&&state.history.length===1)?effectiveFirstInputMinutes():Number(d.interval_minutes||0);
    return {minutes,remaining:calcClock()};
  }

  window.renderWorldSwitcher=function(){
    if($("worldTitle")) $("worldTitle").textContent=WORLD_LABELS[state.world]||state.world;
    const box=$("worldSwitcher"); if(!box) return;
    box.innerHTML=WORLD_ORDER.map(w=>'<button data-world="'+w+'" class="'+(w===state.world?"active":"")+'">'+esc(WORLD_LABELS[w]||w)+'</button>').join("");
    box.querySelectorAll("button").forEach(b=>b.onclick=()=>{
      state.world=b.dataset.world;
      renderGroups();
    });
  };

  window.renderGroups=function(){
    if(!WORLD_ORDER.includes(state.world)) state.world="todos";
    renderWorldSwitcher();

    const all=detailRows();
    const rows=state.world==="todos"
      ? all
      : all.filter(r=>r.world_code===state.world || (state.world==="beleza_relogios" && ["beleza","relogios"].includes(r.group_code)));

    const total=rows.reduce((a,r)=>{
      a.sale+=Number(r.sales_financial||0);
      a.target+=Number(r.target_financial||0);
      a.physical+=Number(r.sales_physical||0);
      a.targetPhysical+=Number(r.target_physical||0);
      a.ly+=Number(r.ly_financial||0);
      a.delta+=Number(r.interval_sales_financial||0);
      return a;
    },{sale:0,target:0,physical:0,targetPhysical:0,ly:0,delta:0});

    const att=total.target?total.sale/total.target*100:0;
    const dev=total.sale-total.target;
    const physicalAttainment=total.targetPhysical?total.physical/total.targetPhysical*100:0;
    const evolution=total.ly?((total.sale/total.ly)-1)*100:null;
    const intervalPct=total.target?total.delta/total.target*100:0;

    renderWorldVisual({attainment:att,physicalAttainment,evolution,intervalPct,hasRows:rows.length>0});
    if($("worldKpis")) $("worldKpis").innerHTML=[
      kpi("Meta",rows.length?money(total.target,2):"—","Soma dos DCOs"),
      kpi("Venda",rows.length?money(total.sale,2):"—",rows.length?pct(att)+" da meta":"Aguardando input",rows.length?(att>=100?"positive":att>=90?"warning":"negative"):""),
      kpi("Desvio",rows.length?signedMoney(dev,2):"—","Meta x realizado",rows.length?(dev>=0?"positive":"negative"):""),
      kpi("Venda física",rows.length?num(total.physical)+" peças":"—","Meta física "+num(total.targetPhysical))
    ].join("");

    if(!rows.length){
      $("groupContent").innerHTML='<section class="card"><div class="empty-box">Ainda não há dados para este filtro.</div></section>';
      return;
    }

    const grouped={};
    rows.forEach(r=>{const g=r.group_code||"outros";(grouped[g]||(grouped[g]=[])).push(r)});
    const pace=currentPaceContext();
    const firstInput=!!state.day?.has_input && state.history.length===1;

    const ordered=GROUP_ORDER.filter(g=>grouped[g]).map(g=>[g,grouped[g]]);
    $("groupContent").innerHTML=ordered.map(([g,items])=>{
      const t=items.reduce((a,r)=>{
        a.sale+=Number(r.sales_financial||0);
        a.target+=Number(r.target_financial||0);
        a.physical+=Number(r.sales_physical||0);
        a.targetPhysical+=Number(r.target_physical||0);
        a.ly+=Number(r.ly_financial||0);
        a.delta+=Number(r.interval_sales_financial||0);
        return a;
      },{sale:0,target:0,physical:0,targetPhysical:0,ly:0,delta:0});
      const attainment=t.target?t.sale/t.target*100:0;
      const deviation=t.sale-t.target;
      const evolution=t.ly?((t.sale/t.ly)-1)*100:null;
      const rate=state.day?.has_input&&pace.minutes>0?t.delta/(pace.minutes/60):0;
      const projection=state.day?.has_input&&rate>0?t.sale+rate*pace.remaining:0;
      const projAtt=t.target&&projection?projection/t.target*100:0;
      const tone=attainment>=100?"good":attainment>=90?"warn":"bad";

      const dcos=items.map(r=>{
        const sale=Number(r.sales_financial||0),target=Number(r.target_financial||0);
        const a=target?sale/target*100:0,dev=sale-target,ly=Number(r.ly_financial||0);
        const ev=ly?((sale/ly)-1)*100:null,delta=Number(r.interval_sales_financial||0);
        return '<article class="premium-dco-card">'+
          '<div class="premium-dco-head"><div><span>DCO '+esc(r.dco_code)+'</span><strong>'+esc(premiumDcoName(r))+'</strong></div><b class="'+(a>=100?"positive":a>=90?"warning":"negative")+'">'+pct(a)+'</b></div>'+
          '<div class="premium-dco-metrics">'+
            '<div><span>Meta</span><strong>'+money(target,2)+'</strong></div>'+
            '<div><span>Venda</span><strong>'+money(sale,2)+'</strong></div>'+
            '<div><span>Desvio</span><strong class="'+(dev>=0?"positive":"negative")+'">'+signedMoney(dev,2)+'</strong></div>'+
            '<div><span>Física</span><strong>'+num(r.sales_physical)+' peças</strong></div>'+
            '<div><span>LY</span><strong>'+(ly?money(ly,2):"—")+'</strong></div>'+
            '<div><span>Evol. vs LY</span><strong class="'+(ev===null?"":ev>=0?"positive":"negative")+'">'+(ev===null?"—":pct(ev))+'</strong></div>'+
            '<div><span>Vs input</span><strong class="'+(delta>=0?"positive":"negative")+'">'+signedMoney(delta,2)+'</strong></div>'+
          '</div>'+
        '</article>';
      }).join("");

      const physicalAtt=t.targetPhysical?t.physical/t.targetPhysical*100:0;
      const attBar=Math.max(0,Math.min(100,attainment));
      const projBar=Math.max(0,Math.min(100,projAtt));
      return '<section class="premium-group-card tone-'+tone+'">'+
        '<div class="premium-group-head">'+
          '<div><span class="eyebrow">GRUPO</span><h2>'+esc(GROUP_LABELS[g]||g)+'</h2><small>Resumo do resultado</small></div>'+
          '<span class="premium-group-att '+(attainment>=100?"positive":attainment>=90?"warning":"negative")+'">'+pct(attainment)+' da meta</span>'+
        '</div>'+
        '<div class="group-primary-grid">'+
          '<div class="group-primary-item meta"><span>Meta</span><strong>'+money(t.target,2)+'</strong></div>'+
          '<div class="group-primary-item sale"><span>Venda</span><strong>'+money(t.sale,2)+'</strong></div>'+
          '<div class="group-primary-item deviation"><span>Desvio</span><strong class="'+(deviation>=0?"positive":"negative")+'">'+signedMoney(deviation,2)+'</strong></div>'+
          '<div class="group-primary-item projection"><span>Projeção</span><strong>'+(projection?money(projection,2):"—")+'</strong><small>'+(projection?pct(projAtt)+" da meta":firstInput?"Formando ritmo":"Aguardando ritmo")+'</small></div>'+
        '</div>'+
        '<div class="group-progress-stack">'+
          '<div class="group-progress-row"><div><span>Atingimento</span><b>'+pct(attainment)+'</b></div><div class="group-progress"><i style="width:'+attBar+'%"></i></div></div>'+
          '<div class="group-progress-row projection-progress"><div><span>Projeção do dia</span><b>'+(projection?pct(projAtt):"—")+'</b></div><div class="group-progress"><i style="width:'+projBar+'%"></i></div></div>'+
        '</div>'+
        '<div class="group-secondary-grid">'+
          '<div><span>LY</span><strong>'+(t.ly?money(t.ly,2):"—")+'</strong></div>'+
          '<div><span>Evol. vs LY</span><strong class="'+(evolution===null?"":evolution>=0?"positive":"negative")+'">'+(evolution===null?"—":pct(evolution))+'</strong></div>'+
          '<div><span>Meta física</span><strong>'+num(t.targetPhysical)+' peças</strong></div>'+
          '<div><span>Venda física</span><strong>'+num(t.physical)+' peças</strong></div>'+
          '<div><span>% meta física</span><strong>'+pct(physicalAtt)+'</strong></div>'+
        '</div>'+
        '<details class="premium-group-dcos">'+
          '<summary><span>Ver DCOs do grupo</span><b>'+items.length+' DCOs</b></summary>'+
          '<div class="premium-dco-list">'+dcos+'</div>'+
        '</details>'+
      '</section>';
    }).join("");
  };

  function storeIcon(){
    return '<span class="dock-icon dock-realistic-icon"><svg viewBox="0 0 64 54" aria-hidden="true">'+
      '<defs><linearGradient id="storeWall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF8E8"/><stop offset="1" stop-color="#D9C69E"/></linearGradient><linearGradient id="storeRoof" x1="0" x2="1"><stop stop-color="#F0E0B7"/><stop offset="1" stop-color="#C9A868"/></linearGradient><filter id="storeShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".28"/></filter></defs>'+
      '<g filter="url(#storeShadow)"><path d="M9 17h46v29H9z" fill="url(#storeWall)" stroke="#F8F0DC"/><path d="M7 15l5-8h40l5 8z" fill="url(#storeRoof)" stroke="#F7E7C5"/><path d="M9 17h46v8H9z" fill="#173F35"/><path d="M15 17h8v8h-8zm16 0h8v8h-8zm16 0h8v8h-8z" fill="#DE7C00"/><rect x="27" y="29" width="11" height="17" rx="1.5" fill="#F9F5EA" stroke="#8BA39A"/></g>'+
      '<rect x="16" y="9.5" width="32" height="5" rx="2.5" fill="#F7F4ED"/><text x="32" y="13.2" text-anchor="middle" font-size="4.4" font-weight="800" fill="#173F35">RIACHUELO</text>'+
      '</svg></span>';
  }
  function worldsIcon(){
    return '<span class="dock-icon dock-realistic-icon"><svg viewBox="0 0 64 54" aria-hidden="true">'+
      '<defs><linearGradient id="hangerG" x1="0" x2="1"><stop stop-color="#FFF"/><stop offset=".55" stop-color="#E7E3D8"/><stop offset="1" stop-color="#B9B9B4"/></linearGradient><filter id="hShadow"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-opacity=".25"/></filter></defs>'+
      '<g fill="none" stroke="url(#hangerG)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#hShadow)"><path d="M31 15c0-4 4-7 8-4 4 3 2 8-2 10l-4 2"/><path d="M8 39l24-16 24 16"/><path d="M8 39h48"/></g>'+
      '</svg></span>';
  }
  function commercialIcon(){
    return '<span class="dock-icon dock-realistic-icon"><svg viewBox="0 0 64 54" aria-hidden="true">'+
      '<defs><linearGradient id="bar1" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#C8D8D1"/><stop offset="1" stop-color="#FFF"/></linearGradient><linearGradient id="bar2" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#466964"/><stop offset="1" stop-color="#9DB7AE"/></linearGradient><linearGradient id="bar3" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#DE7C00"/><stop offset="1" stop-color="#F4B453"/></linearGradient><filter id="bShadow"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-opacity=".28"/></filter></defs>'+
      '<g filter="url(#bShadow)"><rect x="8" y="31" width="10" height="14" rx="2" fill="url(#bar1)"/><rect x="27" y="23" width="10" height="22" rx="2" fill="url(#bar2)"/><rect x="46" y="13" width="10" height="32" rx="2" fill="url(#bar3)"/><path d="M8 23c13-2 25-6 38-17" fill="none" stroke="#F7F4ED" stroke-width="3" stroke-linecap="round"/><path d="M43 6h8v8" fill="none" stroke="#F7F4ED" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>'+
      '</svg></span>';
  }
  function estoreIcon(){
    return '<span class="dock-icon dock-realistic-icon"><svg viewBox="0 0 64 54" aria-hidden="true">'+
      '<defs><linearGradient id="bagG" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFE3A3"/><stop offset=".55" stop-color="#DCA85C"/><stop offset="1" stop-color="#9F6E2F"/></linearGradient><filter id="bagShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".3"/></filter></defs>'+
      '<g filter="url(#bagShadow)"><path d="M13 19h38l-3 29H16z" fill="url(#bagG)" stroke="#FBE3B4"/><path d="M23 20c0-8 3-12 9-12s9 4 9 12" fill="none" stroke="#DE7C00" stroke-width="3"/></g>'+
      '<rect x="20" y="27" width="24" height="7" rx="3.5" fill="#F7F4ED"/><text x="32" y="31.8" text-anchor="middle" font-size="4.4" font-weight="800" fill="#173F35">RIACHUELO</text>'+
      '<circle cx="49" cy="42" r="8" fill="#173F35" stroke="#FFF" stroke-width="1.5"/><path d="M46 44l6-6m-4 0h4v4" fill="none" stroke="#FFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'+
      '</svg></span>';
  }
  function moreIcon(){
    return '<span class="dock-icon dock-realistic-icon"><svg viewBox="0 0 64 54" aria-hidden="true">'+
      '<defs><linearGradient id="sqG" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF"/><stop offset="1" stop-color="#D7D6D2"/></linearGradient><filter id="sqShadow"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity=".25"/></filter></defs>'+
      '<g filter="url(#sqShadow)"><rect x="11" y="8" width="16" height="16" rx="4" fill="url(#sqG)"/><rect x="37" y="8" width="16" height="16" rx="4" fill="url(#sqG)"/><rect x="11" y="30" width="16" height="16" rx="4" fill="url(#sqG)"/><rect x="37" y="30" width="16" height="16" rx="4" fill="#DE7C00"/></g>'+
      '</svg></span>';
  }


  function drawRounded(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,y,w,h,r);
    else {ctx.rect(x,y,w,h)}
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
  }

  async function loadShareImage(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.crossOrigin="anonymous";
      img.src=src;
    });
  }

  async function createCommercialShareImage(r){
    const dcos=Array.isArray(r.dcos)?r.dcos:[];
    const target=Number(r.target_financial||0), sale=Number(r.sales_financial||0);
    const attainment=target?sale/target*100:0;
    const deviation=Number(r.deviation||0);
    const evolution=r.evolution_vs_ly===null||r.evolution_vs_ly===undefined?null:Number(r.evolution_vs_ly);
    const interval=Number(r.interval_sales_financial||0);
    const cols=2, chipRows=Math.max(1,Math.ceil(dcos.length/cols));
    const width=1080, baseHeight=790, chipH=58, height=Math.max(1080,baseHeight+chipRows*chipH);
    const canvas=document.createElement("canvas"); canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext("2d");
    const C={green:"#173F35",green2:"#466964",cream:"#F7F4ED",white:"#FFFFFF",orange:"#DE7C00",red:"#AE535C",line:"#DAD9D6",muted:"#6F7C77",good:"#2E6B58"};
    ctx.fillStyle=C.cream;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=C.green;ctx.fillRect(0,0,width,220);

    try{
      const logo=await loadShareImage("./assets/riachuelo-logo.svg");
      drawRounded(ctx,60,52,230,76,18,C.white);
      ctx.drawImage(logo,82,73,186,34);
    }catch(_){}
    ctx.fillStyle=C.white;ctx.font="800 30px Arial";ctx.textAlign="right";
    ctx.fillText("PERFORMANCE COMERCIAL",1010,82);
    ctx.font="600 18px Arial";ctx.fillStyle="#D6D2C4";
    ctx.fillText("Loja "+state.storeCode+" • "+new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR"),1010,118);
    ctx.font="700 15px Arial";ctx.fillText("Moda que inspira o Brasil",1010,158);

    let avatarOk=false;
    if(r.photo_url){
      try{
        const img=await loadShareImage(r.photo_url);
        ctx.save();ctx.beginPath();ctx.arc(130,288,70,0,Math.PI*2);ctx.clip();
        const s=Math.min(img.width,img.height),sx=(img.width-s)/2,sy=(img.height-s)/2;
        ctx.drawImage(img,sx,sy,s,s,60,218,140,140);ctx.restore();avatarOk=true;
      }catch(_){}
    }
    if(!avatarOk){
      ctx.fillStyle=C.green2;ctx.beginPath();ctx.arc(130,288,70,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=C.white;ctx.font="800 34px Arial";ctx.textAlign="center";
      ctx.fillText(String(r.commercial_name||"?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(),130,300);
    }

    ctx.textAlign="left";ctx.fillStyle=C.green;ctx.font="800 37px Arial";
    ctx.fillText(String(r.commercial_name||"Comercial"),235,276);
    ctx.font="700 16px Arial";ctx.fillStyle=C.green2;
    ctx.fillText(dcos.length+" DCOs sob responsabilidade",235,310);
    ctx.font="600 15px Arial";ctx.fillStyle=C.muted;
    ctx.fillText("Parcial atual • acompanhamento individual",235,340);

    const kpis=[
      ["META",money(target,2),C.green],
      ["VENDA",money(sale,2),C.green],
      ["ATINGIMENTO",pct(attainment),attainment>=100?C.good:attainment>=90?C.orange:C.red],
      ["DESVIO",signedMoney(deviation,2),deviation>=0?C.good:C.red],
      ["VS LY",evolution===null?"—":pct(evolution),evolution===null?C.muted:evolution>=0?C.good:C.red],
      ["ÚLTIMO INPUT",signedMoney(interval,2),interval>=0?C.good:C.red]
    ];
    const gap=14, cardW=(width-120-gap*2)/3, cardH=126, top=400;
    kpis.forEach((k,i)=>{
      const row=Math.floor(i/3),col=i%3,x=60+col*(cardW+gap),y=top+row*(cardH+gap);
      drawRounded(ctx,x,y,cardW,cardH,18,C.white,C.line);
      ctx.fillStyle=C.muted;ctx.font="800 13px Arial";ctx.fillText(k[0],x+18,y+30);
      ctx.fillStyle=k[2];ctx.font="800 24px Arial";ctx.fillText(k[1],x+18,y+76);
    });

    let y=top+2*(cardH+gap)+28;
    ctx.fillStyle=C.green;ctx.font="800 22px Arial";ctx.fillText("DCOs DE RESPONSABILIDADE",60,y);
    y+=26;ctx.fillStyle=C.muted;ctx.font="600 14px Arial";ctx.fillText("Código • departamento",60,y);
    y+=26;
    const chipW=(width-120-gap)/2;
    dcos.forEach((d,i)=>{
      const row=Math.floor(i/2),col=i%2,x=60+col*(chipW+gap),cy=y+row*chipH;
      drawRounded(ctx,x,cy,chipW,46,12,C.white,C.line);
      ctx.fillStyle=C.orange;ctx.font="800 14px Arial";ctx.fillText(String(d.dco_code),x+14,cy+28);
      ctx.fillStyle=C.green;ctx.font="700 14px Arial";
      const name=String(d.dco_name||premiumDcoName(d));
      ctx.fillText(name.length>40?name.slice(0,38)+"…":name,x+64,cy+28);
    });

    ctx.fillStyle=C.green2;ctx.font="700 13px Arial";ctx.fillText("MEU ACOMPANHAMENTO",60,height-34);
    ctx.textAlign="right";ctx.fillText("Simples é incrível.",width-60,height-34);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Falha ao gerar card.")),"image/png",1));
  }

  async function shareCommercialCard(id){
    const r=(state.commercial?.commercials||[]).find(x=>String(x.commercial_id)===String(id));
    if(!r) return toast("Comercial não encontrado.",true);
    const btn=document.querySelector('[data-share-commercial="'+CSS.escape(String(id))+'"]');
    const old=btn?.innerHTML;
    if(btn){btn.disabled=true;btn.textContent="Gerando..."}
    try{
      const blob=await createCommercialShareImage(r);
      const clean=String(r.commercial_name||"comercial").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"_");
      const file=new File([blob],"Performance_"+clean+"_"+localDate()+".png",{type:"image/png"});
      const txt="Performance Comercial • "+r.commercial_name+" • Loja "+state.storeCode;
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({title:"Performance Comercial",text:txt,files:[file]});
      }else{
        const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        toast("Card do comercial gerado.");
      }
    }catch(e){if(e?.name!=="AbortError") toast(e.message||"Não foi possível compartilhar o card.",true)}
    finally{if(btn){btn.disabled=false;btn.innerHTML=old||"Compartilhar card"}}
  }

  window.shareCommercialCard=shareCommercialCard;

  function augmentCommercialCards(){
    const payload=state.commercial||{};
    const rows=Array.isArray(payload.commercials)?payload.commercials:[];
    const grid=$("commercialGrid");
    if(grid){
      const cards=grid.querySelectorAll(".commercial-card");
      cards.forEach((card,idx)=>{
        const r=rows[idx]; if(!r) return;
        card.dataset.commercialId=r.commercial_id||"";
        const dcos=Array.isArray(r.dcos)?r.dcos:[];
        card.querySelector(".commercial-card-actions")?.remove();
        card.querySelector(".commercial-dco-resizable")?.remove();

        const actions=document.createElement("div");
        actions.className="commercial-card-actions";
        actions.innerHTML='<button type="button" class="commercial-share-btn" data-share-commercial="'+esc(r.commercial_id||"")+'">↗ Compartilhar card</button>';
        const top=card.querySelector(".commercial-card-top");
        if(top) top.insertAdjacentElement("afterend",actions); else card.prepend(actions);

        const block=document.createElement("section");
        block.className="commercial-dco-resizable is-collapsed";
        block.innerHTML=
          '<button type="button" class="commercial-dco-resize-handle" aria-expanded="false" title="Expandir ou recolher DCOs"><span></span><span></span><span></span></button>'+
          '<div class="commercial-dco-title"><span>DCOs sob responsabilidade</span><b>'+dcos.length+' DCOs</b></div>'+
          '<div class="commercial-dco-chips">'+
          (dcos.length?dcos.map(d=>'<span><b>'+esc(d.dco_code)+'</b> '+esc(d.dco_name||premiumDcoName(d))+'</span>').join(""):'<em>Nenhum DCO atribuído.</em>')+
          '</div>';
        const detr=card.querySelector(".commercial-detractors");
        if(detr) card.insertBefore(block,detr); else card.appendChild(block);

        actions.querySelector(".commercial-share-btn").onclick=()=>shareCommercialCard(r.commercial_id);
        const handle=block.querySelector(".commercial-dco-resize-handle");
        handle.onclick=()=>{
          const expanded=block.classList.toggle("is-expanded");
          block.classList.toggle("is-collapsed",!expanded);
          handle.setAttribute("aria-expanded",String(expanded));
        };
      });
    }

    const assigned=new Set();
    rows.forEach(r=>(r.dcos||[]).forEach(d=>assigned.add(Number(d.dco_code))));
    const current=detailRows().filter(r=>Number(r.target_financial||0)>0);
    const unassigned=current.filter(r=>!assigned.has(Number(r.dco_code)));
    const totalMeta=current.reduce((a,r)=>a+Number(r.target_financial||0),0);
    const assignedMeta=current.filter(r=>assigned.has(Number(r.dco_code))).reduce((a,r)=>a+Number(r.target_financial||0),0);
    const missingMeta=unassigned.reduce((a,r)=>a+Number(r.target_financial||0),0);
    const coverage=totalMeta?assignedMeta/totalMeta*100:0;

    let panel=$("commercialCoveragePanel");
    if(!panel){
      panel=document.createElement("section");
      panel.id="commercialCoveragePanel";
      panel.className="commercial-coverage-panel";
      const kp=$("commercialKpis");
      if(kp?.parentNode) kp.parentNode.insertBefore(panel,kp.nextSibling);
    }
    if(panel){
      panel.innerHTML=
        '<div class="commercial-coverage-head">'+
          '<div><span class="eyebrow">COBERTURA DOS DCOs</span><h3>Distribuição da meta por responsável</h3></div>'+
          '<span class="coverage-pill '+(unassigned.length?"attention":"ok")+'">'+(unassigned.length?unassigned.length+" sem responsável":"100% atribuídos")+'</span>'+
        '</div>'+
        '<div class="commercial-coverage-kpis">'+
          '<div><span>Meta geral</span><strong>'+money(totalMeta,2)+'</strong></div>'+
          '<div><span>Meta atribuída</span><strong>'+money(assignedMeta,2)+'</strong><small>'+pct(coverage)+' da meta</small></div>'+
          '<div class="missing"><span>Meta sem responsável</span><strong>'+money(missingMeta,2)+'</strong><small>'+unassigned.length+' DCOs</small></div>'+
        '</div>'+
        '<div class="coverage-bar"><i style="width:'+Math.max(0,Math.min(100,coverage))+'%"></i></div>'+
        (unassigned.length?
          '<details class="unassigned-dcos"><summary><span>DCOs ainda sem responsável</span><b>'+unassigned.length+'</b></summary>'+
          '<div class="unassigned-dco-grid">'+unassigned
            .sort((a,b)=>Number(b.target_financial||0)-Number(a.target_financial||0))
            .map(r=>'<div><span><b>'+esc(r.dco_code)+'</b> '+esc(premiumDcoName(r))+'</span><strong>'+money(Number(r.target_financial||0),2)+'</strong></div>')
            .join("")+'</div></details>'
          :
          '<div class="all-assigned">✓ Todos os DCOs com meta estão atribuídos.</div>');
    }
  }


  const baseRenderCommercialsPremium=window.renderCommercials;
  window.renderCommercials=function(){
    baseRenderCommercialsPremium();
    augmentCommercialCards();
  };

  function buildPremiumDock(){
    const dock=document.querySelector(".mobile-dock");
    if(!dock) return;
    dock.innerHTML=
      '<button data-section="inicio" class="dock-item active">'+storeIcon()+'<span class="dock-label">Início</span></button>'+
      '<button data-section="grupos" class="dock-item">'+worldsIcon()+'<span class="dock-label">Mundos</span></button>'+
      '<button data-section="comerciais" class="dock-item">'+commercialIcon()+'<span class="dock-label">Comercial</span></button>'+
      '<button data-section="estore" class="dock-item">'+estoreIcon()+'<span class="dock-label">eStore</span></button>'+
      '<button id="mobileMoreBtn" data-section="mais" type="button" class="dock-item">'+moreIcon()+'<span class="dock-label">Mais</span></button>';
    dock.querySelectorAll("[data-section]").forEach(btn=>btn.onclick=()=>setSection(btn.dataset.section));
  }

  function ensureMoreSection(){
    const existing=$("section-mais");
    if(existing){
      existing.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",state.role!=="administrador"));
      return;
    }
    const main=document.querySelector(".main");
    if(!main) return;
    const section=document.createElement("section");
    section.id="section-mais";
    section.className="section";
    section.innerHTML=
      '<div class="premium-more-hero">'+
        '<img src="./assets/riachuelo-logo.svg" alt="Riachuelo">'+
        '<div><span class="eyebrow">MEU ACOMPANHAMENTO</span><h1>Mais</h1><p>Acesse outras áreas e funcionalidades do app.</p></div>'+
      '</div>'+
      '<div class="premium-more-list">'+
        '<button data-more-section="descontos"><span class="more-icon">%</span><div><strong>Painel de Descontos</strong><small>Incidência, participação e DCOs</small></div><b>›</b></button>'+
        '<button data-more-section="regional" class="admin-only hidden"><span class="more-icon">▦</span><div><strong>Consolidado Regional</strong><small>Visão CE+PI por filial</small></div><b>›</b></button>'+
        '<button data-more-section="admin" class="admin-only hidden"><span class="more-icon">⚙</span><div><strong>Administração</strong><small>Metas, comerciais, inputs e acessos</small></div><b>›</b></button>'+
        '<button id="premiumInstallApp"><span class="more-icon">⇩</span><div><strong>Instalar aplicativo</strong><small>Abrir em tela cheia como app</small></div><b>›</b></button>'+
        '<button id="premiumLogout"><span class="more-icon">↪</span><div><strong>Sair</strong><small>Encerrar esta sessão</small></div><b>›</b></button>'+
      '</div>'+
      '<div class="premium-culture-card">'+
        '<div class="culture-logo"><img src="./assets/riachuelo-logo-vertical.svg" alt="Riachuelo"></div>'+
        '<div><span>MODA QUE INSPIRA O BRASIL</span><h2>Simples é incrível.</h2><p>Ninguém faz nada sozinho • Talento é conquista • Vontade de crescer</p></div>'+
      '</div>';
    main.appendChild(section);
    section.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",state.role!=="administrador"));
    section.querySelectorAll("[data-more-section]").forEach(btn=>btn.onclick=()=>setSection(btn.dataset.moreSection));
    const install=$("premiumInstallApp"); if(install) install.onclick=requestInstallApp;
    const logoutBtn=$("premiumLogout"); if(logoutBtn) logoutBtn.onclick=()=>window.logout();
  }

  function updateBrandCopy(){
    const sectionHead=document.querySelector("#section-grupos .section-head");
    if(sectionHead){
      const h=sectionHead.querySelector("h1"); if(h) h.textContent="Mundos";
      const p=sectionHead.querySelector("p"); if(p) p.textContent="Compare todos os grupos e aprofunde apenas nos DCOs que precisam de ação.";
    }
    const worldLabel=document.querySelector("#section-grupos .world-bar .eyebrow");
    if(worldLabel) worldLabel.textContent="FILTRO DE MUNDOS";
    const navGroup=document.querySelector('.nav-item[data-section="grupos"]');
    if(navGroup) navGroup.lastChild.textContent=" Mundos / DCOs";
    const mobileMeta=$("mobileGreetingMeta");
    if(mobileMeta && !mobileMeta.dataset.premium){
      mobileMeta.dataset.premium="1";
    }
  }

  const previousUpdateIdentity=window.updateIdentity;
  window.updateIdentity=function(person=state.user){
    previousUpdateIdentity(person);
    const meta=$("mobileGreetingMeta");
    if(meta && !meta.textContent.includes("Moda que inspira o Brasil")){
      meta.textContent=meta.textContent+" • Moda que inspira o Brasil";
    }
  };

  const previousSetSection=window.setSection;
  window.setSection=function(section){
    ensureMoreSection();
    previousSetSection(section);
    document.querySelectorAll(".mobile-dock [data-section]").forEach(el=>el.classList.toggle("active",el.dataset.section===section));
  };

  function normalizeHomeGroupPanel(){
    const root=document.querySelector(".home-group-panel");
    const table=root?.querySelector(".group-share-table");
    if(!root||!table) return;
    root.classList.add("desktop-parity");
    table.removeAttribute("style");
  }

  const homePanelObserver=new MutationObserver(()=>normalizeHomeGroupPanel());
  document.addEventListener("DOMContentLoaded",()=>{
    const target=$("homeGroupSharePanel");
    if(target) homePanelObserver.observe(target,{subtree:true,childList:true});
    normalizeHomeGroupPanel();
  });

  document.addEventListener("DOMContentLoaded",()=>{
    buildPremiumDock();
    ensureMoreSection();
    updateBrandCopy();
    if(state.world==="feminino") state.world="todos";
    const sheet=$("mobileMoreSheet"); if(sheet) sheet.classList.add("hidden");
    const oldMore=$("mobileMoreBtn"); if(oldMore) oldMore.onclick=()=>setSection("mais");
  });
})();