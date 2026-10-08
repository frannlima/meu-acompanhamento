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

      return '<section class="premium-group-card tone-'+tone+'">'+
        '<div class="premium-group-head">'+
          '<div><span class="eyebrow">GRUPO</span><h2>'+esc(GROUP_LABELS[g]||g)+'</h2></div>'+
          '<span class="premium-group-att '+(attainment>=100?"positive":attainment>=90?"warning":"negative")+'">'+pct(attainment)+'</span>'+
        '</div>'+
        '<div class="premium-group-summary">'+
          '<div><span>Meta</span><strong>'+money(t.target,2)+'</strong></div>'+
          '<div><span>Venda</span><strong>'+money(t.sale,2)+'</strong></div>'+
          '<div><span>Desvio</span><strong class="'+(deviation>=0?"positive":"negative")+'">'+signedMoney(deviation,2)+'</strong></div>'+
          '<div><span>Venda física</span><strong>'+num(t.physical)+' peças</strong></div>'+
          '<div><span>Meta física</span><strong>'+num(t.targetPhysical)+' peças</strong></div>'+
          '<div><span>LY</span><strong>'+(t.ly?money(t.ly,2):"—")+'</strong></div>'+
          '<div><span>Evolução vs LY</span><strong class="'+(evolution===null?"":evolution>=0?"positive":"negative")+'">'+(evolution===null?"—":pct(evolution))+'</strong></div>'+
          '<div class="projection-summary"><span>Projeção do dia</span><strong>'+(projection?money(projection,2):"—")+'</strong><small>'+(projection?pct(projAtt)+" da meta":firstInput?"Formando ritmo":"Aguardando ritmo")+'</small></div>'+
        '</div>'+
        '<details class="premium-group-dcos">'+
          '<summary><span>Ver DCOs do grupo</span><b>'+items.length+' DCOs</b></summary>'+
          '<div class="premium-dco-list">'+dcos+'</div>'+
        '</details>'+
      '</section>';
    }).join("");
  };

  function storeIcon(){
    return '<span class="dock-icon dock-store-icon"><span class="store-awning"></span><span class="store-door"></span><img src="./assets/riachuelo-logo.svg" alt=""></span>';
  }
  function worldsIcon(){
    return '<span class="dock-icon"><svg viewBox="0 0 64 52" aria-hidden="true"><path d="M31 8c0-4 5-6 8-3 3 3 1 7-3 9l-3 2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M7 28l25-12 25 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 29h40l-7 16H19z" fill="currentColor" opacity=".18"/><path d="M12 29h40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span>';
  }
  function commercialIcon(){
    return '<span class="dock-icon"><svg viewBox="0 0 64 52" aria-hidden="true"><rect x="8" y="30" width="9" height="15" rx="2" fill="currentColor" opacity=".65"/><rect x="25" y="22" width="9" height="23" rx="2" fill="currentColor" opacity=".82"/><rect x="42" y="13" width="9" height="32" rx="2" fill="currentColor"/><path d="M8 22c12-1 21-5 31-14l7 1" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M42 5l8 4-6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  }
  function estoreIcon(){
    return '<span class="dock-icon dock-bag-icon"><span class="bag-handle"></span><span class="bag-body"><img src="./assets/riachuelo-logo.svg" alt=""></span><span class="bag-pointer">↗</span></span>';
  }
  function moreIcon(){
    return '<span class="dock-icon dock-more-icon"><i></i><i></i><i></i><i></i></span>';
  }

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
    if($("section-mais")) return;
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

  document.addEventListener("DOMContentLoaded",()=>{
    buildPremiumDock();
    ensureMoreSection();
    updateBrandCopy();
    if(state.world==="feminino") state.world="todos";
    const sheet=$("mobileMoreSheet"); if(sheet) sheet.classList.add("hidden");
    const oldMore=$("mobileMoreBtn"); if(oldMore) oldMore.onclick=()=>setSection("mais");
  });
})();