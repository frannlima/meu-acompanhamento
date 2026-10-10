
(function(){
  "use strict";

  function groupData(){
    const detail=typeof detailRows==="function"?detailRows():[];
    if(!detail.length) return [];
    const map=new Map();
    detail.forEach(r=>{
      const code=r.group_code||"outros";
      if(!map.has(code)) map.set(code,{code,meta:0,venda:0,aa:0});
      const g=map.get(code);
      g.meta+=Number(r.target_financial||0);
      g.venda+=Number(r.sales_financial||0);
      g.aa+=Number(r.ly_financial||0);
    });
    return [...map.values()].map(g=>({
      ...g,
      ating:g.meta?g.venda/g.meta*100:0,
      desvio:g.venda-g.meta,
      ev:g.aa?((g.venda/g.aa)-1)*100:null
    }));
  }


  function groupPerformanceColors(code){
    const map={
      feminino:"#E03C31",
      masculino:"#2F6FB0",
      infantil:"#E0A900",
      casa:"#2E6B58",
      beleza:"#E68699",
      relogios:"#76232F",
      cba:"#A7ACA9",
      lpg:"#D37C32",
      basket:"#466964"
    };
    return map[code]||"#466964";
  }

  function renderGroupHourlyChart(){
    const card=$("groupHourlyPerformanceCard");
    if(!card) return;
    const rows=Array.isArray(state.groupHourlyHistory)?state.groupHourlyHistory:[];
    if(!rows.length){
      card.innerHTML=
        '<div class="group-hourly-head"><div><span class="eyebrow">DESEMPENHO POR GRUPO</span><h2>Venda por hora até o último input</h2><p>Atualize a venda para formar a leitura do ritmo dos grupos ao longo do dia.</p></div></div>'+
        '<div class="group-hourly-empty">Aguardando os primeiros inputs do dia.</div>';
      return;
    }

    const byTime=new Map(),totals=new Map();
    rows.forEach(r=>{
      const t=String(r.captured_at||"");
      if(!byTime.has(t)) byTime.set(t,new Map());
      const code=String(r.group_code||"outros");
      byTime.get(t).set(code,Number(r.sales_financial||0));
      totals.set(code,Math.max(Number(totals.get(code)||0),Number(r.sales_financial||0)));
    });

    const times=[...byTime.keys()].sort((a,b)=>new Date(a)-new Date(b));
    const series=[...totals.entries()]
      .sort((a,b)=>b[1]-a[1])
      .slice(0,6)
      .map(([code])=>({
        code,
        name:GROUP_LABELS[code]||code,
        color:groupPerformanceColors(code),
        values:times.map(t=>Number(byTime.get(t).get(code)||0))
      }));

    const W=920,H=280,p={l:58,r:18,t:24,b:48};
    const innerW=W-p.l-p.r,innerH=H-p.t-p.b;
    const maxVal=Math.max(1,...series.flatMap(s=>s.values));
    const x=i=>p.l+(times.length<=1?innerW/2:i/(times.length-1)*innerW);
    const y=v=>p.t+innerH-(v/maxVal)*innerH;
    const grid=[0,.25,.5,.75,1].map(fr=>{
      const yy=p.t+innerH-innerH*fr;
      return '<line x1="'+p.l+'" x2="'+(W-p.r)+'" y1="'+yy+'" y2="'+yy+'" stroke="#E7E4DB" stroke-width="1"/>'+
        '<text x="'+(p.l-8)+'" y="'+(yy+4)+'" text-anchor="end" font-size="10" fill="#7A8580">'+
        Math.round(maxVal*fr/1000)+'k</text>';
    }).join("");

    const showIdx=times.length<=6
      ? times.map((_,i)=>i)
      : [0,Math.round((times.length-1)*.25),Math.round((times.length-1)*.5),Math.round((times.length-1)*.75),times.length-1];
    const ticks=[...new Set(showIdx)].map(i=>
      '<text x="'+x(i)+'" y="'+(H-16)+'" text-anchor="middle" font-size="10" fill="#6F7C77">'+localTime(times[i])+'</text>'
    ).join("");

    const lines=series.map(s=>{
      const pts=s.values.map((v,i)=>x(i)+","+y(v)).join(" ");
      const dots=s.values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+(i===s.values.length-1?5:3.5)+'" fill="'+s.color+'"/>').join("");
      return '<polyline fill="none" stroke="'+s.color+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="'+pts+'"/>'+dots;
    }).join("");

    const lastRanking=series.map(s=>({name:s.name,value:s.values.at(-1)||0,color:s.color})).sort((a,b)=>b.value-a.value);
    const recovery=series.map(s=>{
      const n=s.values.length;
      const delta=n>=2?s.values[n-1]-s.values[n-2]:0;
      return {name:s.name,delta,color:s.color};
    }).sort((a,b)=>b.delta-a.delta)[0];

    card.innerHTML=
      '<div class="group-hourly-head"><div><span class="eyebrow">DESEMPENHO POR GRUPO</span><h2>Desempenho por grupo por hora</h2><p>Venda acumulada até o último input • leitura da evolução do dia.</p></div><span class="group-hourly-last">Até '+localTime(times.at(-1))+'</span></div>'+
      '<div class="group-hourly-chart"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfico de desempenho por grupo por hora">'+grid+lines+ticks+'</svg></div>'+
      '<div class="group-hourly-legend">'+series.map(s=>'<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>').join("")+'</div>'+
      '<div class="group-hourly-insights">'+
        '<div><span>🏆 Líder no último input</span><strong>'+esc(lastRanking[0]?.name||"—")+'</strong></div>'+
        '<div><span>↗ Maior recuperação</span><strong>'+esc(recovery?.name||"—")+(recovery&&recovery.delta?(" • +"+money(recovery.delta,0)):"")+'</strong></div>'+
      '</div>';
  }

  function commercialRows(){
    return Array.isArray(state.commercial?.commercials)?state.commercial.commercials:[];
  }

  function toneClass(v){ return Number(v)>=0?"good":"bad"; }

  function setHeader(section,title,copy){
    const root=document.querySelector("#section-"+section+" > .section-head");
    if(!root) return;
    const h=root.querySelector("h1");
    const p=root.querySelector("p");
    if(h) h.textContent=title;
    if(p) p.textContent=copy;
  }

  function ensureHomeExperience(){
    const home=$("clarityHome");
    if(!home) return;

    if(!$("mobilePriorityCard")){
      const card=document.createElement("section");
      card.id="mobilePriorityCard";
      card.className="app-action-card card";
      const curve=home.querySelector(".clarity-curve");
      if(curve) curve.insertAdjacentElement("beforebegin",card);
      else home.appendChild(card);
    }

    if(!$("groupHourlyPerformanceCard")){
      const chart=document.createElement("section");
      chart.id="groupHourlyPerformanceCard";
      chart.className="group-hourly-performance card";
      const priority=$("mobilePriorityCard");
      if(priority) priority.insertAdjacentElement("afterend",chart);
      else home.appendChild(chart);
    }

    if(!$("mobileSquadCard")){
      const card=document.createElement("section");
      card.id="mobileSquadCard";
      card.className="squad-card card";
      card.innerHTML=
        '<div class="squad-copy">'+
          '<span class="eyebrow">ESQUADRÃO DO CLIENTE</span>'+
          '<h2>Nosso compromisso diário com o cliente</h2>'+
          '<p>Resultado também é experiência. Use as cinco missões como referência para transformar cada contato em uma venda melhor.</p>'+
          '<div class="culture-phrase">★ Ninguém faz nada sozinho.</div>'+
        '</div>'+
        '<img src="./assets/esquadrao-cliente.svg" alt="Mandala das cinco missões do Esquadrão do Cliente">';
      const journey=home.querySelector(".clarity-journey");
      if(journey) journey.insertAdjacentElement("beforebegin",card);
      else home.appendChild(card);
    }

    if(!$("mobileUpdateFab")){
      const fab=document.createElement("button");
      fab.id="mobileUpdateFab";
      fab.type="button";
      fab.className="mobile-update-fab";
      fab.innerHTML='<b>＋</b><span>Atualizar<br>parcial</span>';
      fab.onclick=()=>showPaste();
      document.body.appendChild(fab);
    }

    if(!$("mobileHomeGroupSummary")){
      const summary=document.createElement("div");
      summary.id="mobileHomeGroupSummary";
      summary.className="mobile-home-groups";
      const shell=home.querySelector(".clarity-groups");
      if(shell){
        const table=shell.querySelector(".clarity-table-wrap");
        if(table) table.insertAdjacentElement("beforebegin",summary);
        const head=shell.querySelector(".clarity-card-head");
        if(head){
          const copy=head.querySelector("p"); if(copy) copy.textContent="Veja rapidamente quais mundos precisam de atenção e compartilhe a parcial completa.";
          const title=head.querySelector("h2"); if(title) title.textContent="Panorama dos mundos";
        }
      }
    }
  }

  function renderHomeExperience(){
    ensureHomeExperience();
    const d=state.day||{};
    const groups=groupData().sort((a,b)=>a.desvio-b.desvio);

    const priority=$("mobilePriorityCard");
    if(priority){
      const worst=groups.slice(0,3);
      priority.innerHTML=
        '<div class="app-action-head">'+
          '<div><span class="eyebrow">DIRECIONAMENTO PARA AGIR AGORA</span><h2>'+(worst.length?"Mude o jogo nos grupos de maior impacto na venda /hora":"Aguardando primeira leitura")+'</h2></div>'+
          '<span class="action-target">◎</span>'+
        '</div>'+
        '<div class="action-list">'+
          (worst.length?worst.map((g,i)=>{
            const name=GROUP_LABELS[g.code]||g.code;
            const message=i===0
              ?"Maior desvio financeiro do momento"
              : g.ating<80?"Abaixo de 80% de atingimento":"Oportunidade para recuperar ritmo";
            return '<button type="button" data-go-world="'+esc(g.code)+'">'+
              '<span class="action-rank">'+(i+1)+'</span>'+
              '<span class="action-copy"><b>'+esc(name)+'</b><small>'+message+' • '+signedMoney(g.desvio,2)+'</small></span>'+
              '<span class="action-arrow">›</span>'+
            '</button>';
          }).join(""):'<div class="action-empty">Atualize a parcial para receber direcionamentos automáticos.</div>')+
        '</div>';
      priority.querySelectorAll("[data-go-world]").forEach(btn=>btn.onclick=()=>{
        state.world=btn.dataset.goWorld;
        setSection("grupos");
        if(typeof renderGroups==="function") renderGroups();
      });
    }

    renderGroupHourlyChart();

    const summary=$("mobileHomeGroupSummary");
    if(summary){
      const best=[...groups].sort((a,b)=>b.ating-a.ating).slice(0,4);
      summary.innerHTML=best.map(g=>
        '<button type="button" data-world="'+esc(g.code)+'">'+
          '<span class="world-dot '+(g.ating>=100?"ok":g.ating>=80?"warn":"risk")+'"></span>'+
          '<span><b>'+esc(GROUP_LABELS[g.code]||g.code)+'</b><small>Venda '+money(g.venda,2)+'</small></span>'+
          '<strong class="'+(g.ating>=100?"positive":g.ating>=80?"warning":"negative")+'">'+pct(g.ating)+'</strong>'+
          '<i>›</i>'+
        '</button>'
      ).join("");
      summary.querySelectorAll("[data-world]").forEach(btn=>btn.onclick=()=>{
        state.world=btn.dataset.world;
        setSection("grupos");
        if(typeof renderGroups==="function") renderGroups();
      });
    }
  }

  function ensureMenuGuide(section,eyebrow,title,copy){
    const root=$("section-"+section);
    if(!root) return;
    let guide=root.querySelector(".app-menu-guide");
    if(!guide){
      guide=document.createElement("section");
      guide.className="app-menu-guide";
      const head=root.querySelector(":scope > .menu-day-meta");
      if(head) head.insertAdjacentElement("afterend",guide);
      else {
        const sh=root.querySelector(":scope > .section-head");
        if(sh) sh.insertAdjacentElement("afterend",guide);
        else root.prepend(guide);
      }
    }
    guide.innerHTML='<span class="eyebrow">'+eyebrow+'</span><h2>'+title+'</h2><p>'+copy+'</p>';
  }

  function renderWorldGuide(){
    ensureMenuGuide("grupos","ENTENDA • PRIORIZE • AJA","Onde está o resultado?","Acompanhe cada mundo, identifique desvios e entre nos DCOs que precisam de ação.");
    const root=$("section-grupos");
    if(!root) return;
    let box=root.querySelector(".menu-action-now");
    if(!box){
      box=document.createElement("section");
      box.className="menu-action-now";
      const kpis=$("worldKpis");
      if(kpis) kpis.insertAdjacentElement("afterend",box);
    }
    if(!box) return;
    const all=typeof detailRows==="function"?detailRows():[];
    const rows=all
      .filter(r=>state.world==="todos"||r.world_code===state.world||(state.world==="beleza_relogios"&&["beleza","relogios"].includes(r.group_code)))
      .map(r=>{
        const meta=Number(r.target_financial||r.meta_financial||r.target||0);
        const venda=Number(r.sales_financial||r.venda_financial||r.sales||0);
        const desvio=venda-meta;
        return {...r,__action_meta:meta,__action_venda:venda,__action_desvio:desvio};
      })
      .filter(r=>r.__action_meta>0);
    const worst=[...rows].sort((a,b)=>a.__action_desvio-b.__action_desvio).slice(0,3);
    box.innerHTML=
      '<div class="menu-action-title"><span>🎯</span><div><b>Onde agir agora</b><small>Prioridades com maior impacto no resultado</small></div></div>'+
      '<div class="menu-action-items">'+
      (worst.length?worst.map(r=>{
        const dept=String(r.department||"")
          .replace(/^\d+\s*-?\s*/,"")
          .replace(/Calçados Femininos/gi,"Calçados Feminino");
        return '<div><span><b>'+esc(r.dco_code)+'</b> '+esc(dept)+'</span><strong class="'+(r.__action_desvio>=0?"positive":"negative")+'">'+signedMoney(r.__action_desvio,2)+'</strong></div>';
      }).join(""):'<div class="empty">Atualize a venda para visualizar as prioridades.</div>')+
      '</div>';
  }

  function renderCommercialGuide(){
    ensureMenuGuide("comerciais","PESSOAS • RESPONSABILIDADE • RESULTADO","Quem precisa agir?","Veja a meta de cada responsável, o atingimento e os DCOs que mais pressionam o resultado.");
    const root=$("section-comerciais");
    if(!root) return;
    let box=root.querySelector(".menu-action-now");
    if(!box){
      box=document.createElement("section");
      box.className="menu-action-now commercial-action-now";
      const kpis=$("commercialKpis");
      if(kpis) kpis.insertAdjacentElement("afterend",box);
    }
    if(!box) return;
    const rows=commercialRows().map(r=>{
      const dcos=Array.isArray(r.dcos)?r.dcos:[];
      let meta=Number(r.target_financial||0);
      if(!meta) meta=dcos.reduce((s,d)=>s+Number(d.target_financial||d.meta_financial||d.target||0),0);
      if(!meta && typeof detailRows==="function"){
        const ids=new Set(dcos.map(d=>Number(d.dco_code??d.code)));
        meta=detailRows().filter(x=>ids.has(Number(x.dco_code))).reduce((s,x)=>s+Number(x.target_financial||0),0);
      }
      const venda=Number(r.sales_financial||0),ating=meta?venda/meta*100:0;
      return {...r,meta,venda,ating,dev:venda-meta};
    }).sort((a,b)=>a.ating-b.ating);
    const worst=rows[0];
    box.innerHTML=worst?
      '<div class="menu-action-title"><span>⚡</span><div><b>Direcionamento para ação</b><small>'+esc(worst.commercial_name)+' está em '+pct(worst.ating)+' da meta.</small></div></div>'+
      '<div class="commercial-action-copy">Priorize os DCOs com maior desvio e acompanhe a recuperação no próximo input.</div>'
      :
      '<div class="menu-action-title"><span>⚡</span><div><b>Direcionamento para ação</b><small>Cadastre os responsáveis para acompanhar o time.</small></div></div>';
  }

  function renderEstoreGuide(){
    ensureMenuGuide("estore","NOSSA LOJA DIGITAL","Acompanhe o digital","Veja o resultado eStore e acesse rapidamente os recursos oficiais do canal.");
  }

  function applyBrandCopy(){
    setHeader("inicio","Início","Visão do dia, prioridades e próximos passos para mudar o jogo.");
    setHeader("grupos","Mundos","Entenda onde sua venda está evoluindo ou retraindo e identifique onde agir.");
    setHeader("comerciais","Comerciais","Acompanhe cada responsável e descubra onde apoiar para potencializar resultados.");
    setHeader("estore","eStore","Acompanhe a venda digital da loja e veja o impacto no resultado total.");
  }

  function refresh(){
    applyBrandCopy();
    renderHomeExperience();
    renderWorldGuide();
    renderCommercialGuide();
    renderEstoreGuide();
  }

  const oldDashboard=window.renderDashboard;
  if(typeof oldDashboard==="function"){
    window.renderDashboard=function(){ oldDashboard(); setTimeout(refresh,0); };
  }

  const oldGroups=window.renderGroups;
  if(typeof oldGroups==="function"){
    window.renderGroups=function(){ oldGroups(); setTimeout(renderWorldGuide,0); };
  }

  const oldCommercials=window.renderCommercials;
  if(typeof oldCommercials==="function"){
    window.renderCommercials=function(){ oldCommercials(); setTimeout(renderCommercialGuide,0); };
  }

  const oldSetSection=window.setSection;
  if(typeof oldSetSection==="function"){
    window.setSection=function(section){
      oldSetSection(section);
      setTimeout(refresh,0);
    };
  }

  document.addEventListener("DOMContentLoaded",()=>{
    setTimeout(refresh,250);
  });
})();
