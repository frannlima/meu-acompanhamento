/* Mundo / GG oficial — outubro 2026. Somente Meu Acompanhamento. */
(function(){
  "use strict";
  const DATA={
    feminino:{label:"Feminino",color:"#B63F52",groups:["Feminino","Íntima","CBA","Praia"]},
    masculino:{label:"Masculino",color:"#2D6DA9",groups:["Masculino","Íntima","CBA","Praia"]},
    infantil:{label:"Infantil",color:"#D6A321",groups:["Infantil","CBA","Íntima","Praia","Carter's"]},
    casa:{label:"Casa",color:"#418A69",groups:["Casa Riachuelo"]},
    beleza_relogios:{label:"Beleza / Relógios",color:"#C979A5",groups:["Beleza","Body Work","Relógios"]}
  };
  const SETS={
    "Carter's":[101,111,121,141],
    "Body Work":[235,310,360],
    "Íntima":[135,165,225,245,265,275,330,365,375],
    "Praia":[131,240,331],
    "CBA":[130,255,500,505,510,520,540,560,565,572,595],
    "Beleza":[215,280,281,282,283,284,285,289],
    "Relógios":[550,551],
    "Casa Riachuelo":[400,405,410,415,420,425,430,435,440,445]
  };
  const MAPPING={};
  Object.entries(SETS).forEach(([label,codes])=>codes.forEach(code=>MAPPING[code]=label));
  const EXCLUDED=new Set([148,530,531,532,552]);
  let selected=null;
  function ggOf(r){
    const code=Number(r.dco_code??r.code);
    if(EXCLUDED.has(code))return null;
    return MAPPING[code]||({
      feminino_moda:"Feminino",masculino_moda:"Masculino",
      infantil_moda:"Infantil",moda_casa:"Casa Riachuelo",
      cba:"CBA",beleza:"Beleza",relogios:"Relógios",
      lpg:"Íntima"
    }[r.group_code]||null);
  }
  function worldOf(r){
    const code=Number(r.dco_code??r.code),gg=ggOf(r);
    if(!gg)return null;
    if(gg==="Beleza"||gg==="Body Work"||gg==="Relógios"||gg==="Casa Riachuelo")
      return gg==="Casa Riachuelo"?"casa":"beleza_relogios";
    const inferred=r.world_code;
    if(["feminino","masculino","infantil"].includes(inferred))return inferred;
    if(code===130||code===510)return "infantil";
    if([255,500,520,560,565].includes(code))return "feminino";
    if([505,540].includes(code))return "masculino";
    if(gg==="Feminino")return "feminino";
    if(gg==="Masculino")return "masculino";
    if(gg==="Infantil"||gg==="Carter's")return "infantil";
    return null; // DCO 572/595 sem vínculo seguro: não atribuir a Mundos arbitrariamente.
  }
  function display(v){return esc(v);}
  function aggregate(rows){
    return rows.reduce((o,r)=>{
      o.meta+=Number(r.target_financial||0);o.venda+=Number(r.sales_financial||0);
      o.metaFis+=Number(r.target_physical||0);o.fis+=Number(r.sales_physical||0);
      o.ly+=Number(r.ly_financial||0);o.lyFis+=Number(r.ly_physical||0);
      o.intervalo+=Number(r.interval_sales_financial||0);return o;
    },{meta:0,venda:0,metaFis:0,fis:0,ly:0,lyFis:0,intervalo:0});
  }
  function att(t){return t.meta?t.venda/t.meta*100:null;}
  function signed(v){return (v>=0?"+ ":"− ")+money(Math.abs(v),2);}
  function metric(label,value,detail,cls=""){
    return '<div class="gg-metric '+cls+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></div>';
  }
  function worldSwitcher(){
    const host=$("worldSwitcher");if(!host)return;
    const item=DATA[state.world]||DATA.feminino;
    $("worldTitle").textContent=item.label;
    host.classList.add("gg-world-grid");
    host.innerHTML=Object.entries(DATA).map(([id,world])=>
      '<button type="button" class="gg-world '+(state.world===id?'selected':'')+'" style="--gg-color:'+world.color+'" data-gg-world="'+id+'">'+
      '<span class="gg-world-dot"></span><strong>'+display(world.label)+'</strong><small>'+world.groups.length+' GGs</small>'+
      '</button>').join("");
    host.querySelectorAll("[data-gg-world]").forEach(b=>b.onclick=()=>{
      state.world=b.dataset.ggWorld;selected=null;renderGroups();
    });
  }
  function detailTable(rows){
    if(!rows.length)return '<div class="gg-empty">Ainda não há dados deste GG no input do dia.</div>';
    const tableRows=rows.slice().sort((a,b)=>Number(a.dco_code)-Number(b.dco_code)).map(r=>{
      const meta=Number(r.target_financial||0),sale=Number(r.sales_financial||0),ly=Number(r.ly_financial||0);
      const a=meta?sale/meta*100:null,d=sale-meta;
      return '<tr><td><strong>'+display(r.dco_code)+'</strong></td><td>'+display(String(r.department||"").replace(/^\d+\s*[-–]?\s*/,""))+'</td>'+
        '<td>'+money(meta,2)+'</td><td>'+money(sale,2)+'</td><td class="'+(a===null?'':a>=100?'positive':a>=90?'warning':'negative')+'">'+(a===null?'—':pct(a))+'</td>'+
        '<td class="'+(d>=0?'positive':'negative')+'">'+signed(d)+'</td><td>'+num(r.target_physical)+'</td><td>'+num(r.sales_physical)+'</td>'+
        '<td>'+(ly?money(ly,2):'—')+'</td><td>'+(ly?pct((sale/ly-1)*100):'—')+'</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table class="gg-dco-table"><thead><tr><th>DCO</th><th>Departamento</th><th>Meta Fin.</th><th>Venda</th><th>% Meta</th><th>Desvio</th><th>Meta Fís.</th><th>Físico</th><th>Venda A.A.</th><th>Evol. A.A.</th></tr></thead><tbody>'+tableRows+'</tbody></table></div>';
  }
  function render(){
    const world=DATA[state.world]||DATA.feminino;
    if(!DATA[state.world])state.world="feminino";
    worldSwitcher();
    const unique=new Map();
    // Metas já disponíveis antes do primeiro input; a venda corrente tem prioridade.
    (Array.isArray(state.ggTargets)?state.ggTargets:[]).forEach(r=>{
      const code=Number(r.dco_code);
      if(Number.isFinite(code)&&!EXCLUDED.has(code))unique.set(code,r);
    });
    (Array.isArray(state.detail?.rows)?state.detail.rows:[]).forEach(r=>{
      const code=Number(r.dco_code);
      if(Number.isFinite(code)&&!EXCLUDED.has(code))unique.set(code,r);
    });
    const rows=[...unique.values()].filter(r=>worldOf(r)===state.world);
    const totals=aggregate(rows),a=att(totals),e=totals.ly?100*(totals.venda/totals.ly-1):null;
    renderWorldVisual({attainment:a||0,physicalAttainment:totals.metaFis?totals.fis/totals.metaFis*100:0,evolution:e,intervalPct:totals.meta?totals.intervalo/totals.meta*100:0,hasRows:rows.length>0});
    $("worldKpis").innerHTML=[
      kpi("Meta do mundo",rows.length?money(totals.meta,2):"—","Soma de DCOs únicos"),
      kpi("Venda atual",rows.length?money(totals.venda,2):"—",a===null?"Aguardando meta":pct(a)+" da meta",a===null?"":a>=100?"positive":a>=90?"warning":"negative"),
      kpi("Desvio",rows.length?signed(totals.venda-totals.meta):"—","Venda − meta",totals.venda>=totals.meta?"positive":"negative"),
      kpi("Meta física",rows.length?num(totals.metaFis):"—",rows.length?num(totals.fis)+" peças vendidas":"Aguardando input")
    ].join("");
    if(!world.groups.includes(selected))selected=world.groups[0];
    const ggCards=world.groups.map(group=>{
      const subset=rows.filter(r=>ggOf(r)===group),t=aggregate(subset),percent=att(t);
      const cls=percent===null?"neutral":percent>=100?"good":percent>=90?"warn":"bad";
      return '<button type="button" class="gg-tile '+cls+(selected===group?' active':'')+'" data-gg-select="'+display(group)+'">'+
        '<span class="gg-tile-top"><b>'+display(group)+'</b><small>'+subset.length+' DCOs</small></span>'+
        '<span class="gg-tile-stats"><span>Meta<em>'+(subset.length?money(t.meta,0):'—')+'</em></span>'+
        '<span>Venda<em>'+(subset.length?money(t.venda,0):'—')+'</em></span>'+
        '<span>Atingimento<em>'+(percent===null?'—':pct(percent))+'</em></span></span>'+
        '<span class="gg-progress"><i style="width:'+Math.min(100,Math.max(0,percent||0))+'%"></i></span></button>';
    }).join("");
    const ggRows=rows.filter(r=>ggOf(r)===selected),ggT=aggregate(ggRows),ggA=att(ggT);
    $("groupContent").innerHTML=
      '<section class="gg-panel"><div class="gg-section-top"><div><span class="eyebrow">DISTRIBUIÇÃO OFICIAL</span><h2>GGs • '+display(world.label)+'</h2>'+
      '<p>Selecione um GG para analisar meta, desvio, venda física e DCOs.</p></div>'+
      '<span class="gg-count">'+world.groups.length+' GGs</span></div>'+
      '<div class="gg-tiles">'+ggCards+'</div>'+
      '<div class="gg-detail"><div class="gg-detail-header"><div><span class="eyebrow">DESEMPENHO DO GG</span><h3>'+display(selected)+'</h3></div>'+
      '<span class="gg-detail-code">'+ggRows.length+' DCOs</span></div>'+
      '<div class="gg-metrics">'+
      metric("Meta financeira",ggRows.length?money(ggT.meta,2):"—","Meta oficial por DCO")+
      metric("Venda realizada",ggRows.length?money(ggT.venda,2):"—","Último input")+
      metric("Atingimento",ggA===null?"—":pct(ggA),"Venda / meta",ggA===null?"":ggA>=100?"good":ggA>=90?"warn":"bad")+
      metric("Desvio",ggRows.length?signed(ggT.venda-ggT.meta):"—","Venda − meta",ggT.venda>=ggT.meta?"good":"bad")+
      metric("Meta física",ggRows.length?num(ggT.metaFis)+" peças":"—","Arquivo físico")+
      metric("Evolução A.A.",ggT.ly?pct((ggT.venda/ggT.ly-1)*100):"—","Comparação financeira")+
      '</div><h4>Detalhamento por DCO</h4>'+detailTable(ggRows)+
      '</div></section>';
    $("groupContent").querySelectorAll("[data-gg-select]").forEach(btn=>btn.onclick=()=>{
      selected=btn.dataset.ggSelect;render();
    });
  }
  const previousLoadAll=loadAll;
  loadAll=async function(...args){
    state.ggTargets=[];
    const result=await previousLoadAll(...args);
    if(result===false||!state.logged)return result;
    const currentStore=String(state.storeCode||"");
    try{
      const targets=await api("ggTargets",{
        matricula:state.matricula,
        business_date:localDate(),
        store_code:currentStore
      });
      if(String(state.storeCode)===currentStore){
        state.ggTargets=Array.isArray(targets)?targets:[];
        render();
      }
    }catch(e){
      // Não bloquear as demais telas em caso de indisponibilidade pontual.
      if(state.section==="grupos")toast("Metas por GG temporariamente indisponíveis.",true);
    }
    return result;
  };
  renderGroups=render;
  renderWorldSwitcher=worldSwitcher;
  window.ggOfficialMapping={ggOf,worldOf,excluded:[...EXCLUDED]};
})();