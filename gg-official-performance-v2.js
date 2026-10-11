/* GGs oficiais — classificação extraída do arquivo financeiro mensal.
   Isolado no Meu Acompanhamento. Não altera vendas nem metas no banco. */
(function(){
  "use strict";
  const GG_DCO={
    "BELEZA":[215,280,281,282,283,284,285,289],
    "BODY WORK":[235,310,360],
    "CARTERS":[101,111,121,141],
    "CASA RIACHUELO":[400,405,410,415,420,425,430,435,440,445],
    "CBA":[255,500,505,510,520,540,560,565,572,595],
    "FEMININO":[200,204,205,206,208,217,220,227,230,250,270,290,295],
    "INFANTIL":[100,102,105,106,110,115,120,125,130,131,135,142,145,150,151,165,195,196],
    "INTIMA":[225,245,265,275,330,365,375],
    "MASCULINO":[301,305,306,314,315,320,325,340,350,380,390,395],
    "PRAIA":[240,331],
    "RELOGIOS":[550,551]
  };
  const aliases={
    "BELEZA":"Beleza","BODY WORK":"Body Work","CARTERS":"Carter's",
    "CASA RIACHUELO":"Casa Riachuelo","CBA":"CBA","FEMININO":"Feminino",
    "INFANTIL":"Infantil","INTIMA":"Íntima","MASCULINO":"Masculino",
    "PRAIA":"Praia","RELOGIOS":"Relógios"
  };
  const excluded=new Set([148,530,531,532,552]);
  const keyByDco=new Map();
  Object.entries(GG_DCO).forEach(([gg,codes])=>codes.forEach(code=>{
    if(keyByDco.has(code))throw new Error("DCO duplicado na classificação oficial: "+code);
    keyByDco.set(code,gg);
  }));
  function rows(){
    // Meta oficial em primeiro lugar; input acrescenta somente venda e variação.
    const byDco=new Map();
    for(const r of (Array.isArray(state.ggTargets)?state.ggTargets:[])){
      const code=Number(r.dco_code);if(!code||excluded.has(code))continue;
      byDco.set(code,{...r});
    }
    for(const r of (Array.isArray(state.detail?.rows)?state.detail.rows:[])){
      const code=Number(r.dco_code);if(!code||excluded.has(code))continue;
      const existing=byDco.get(code);
      byDco.set(code,existing?{
        ...existing,
        sales_financial:Number(r.sales_financial||0),
        sales_physical:Number(r.sales_physical||0),
        interval_sales_financial:Number(r.interval_sales_financial||0),
        department:r.department||existing.department
      }:{...r});
    }
    return [...byDco.values()];
  }
  function getSummaries(){
    const data=rows(),byGG=new Map();
    for(const r of data){
      const code=Number(r.dco_code);
      const gg=keyByDco.get(code);
      if(!gg)continue;
      if(!byGG.has(gg))byGG.set(gg,{
        group_code:aliases[gg],gg_label:aliases[gg],
        target_financial:0,target_physical:0,
        ly_financial:0,ly_physical:0,
        sales_financial:0,sales_physical:0,
        interval_sales_financial:0,dco_count:0
      });
      const g=byGG.get(gg);
      g.dco_count++;
      for(const key of ["target_financial","target_physical","ly_financial","ly_physical","sales_financial","sales_physical","interval_sales_financial"]){
        g[key]+=Number(r[key]||0);
      }
    }
    return Object.keys(GG_DCO).map(gg=>{
      const g=byGG.get(gg);
      if(!g)return null;
      g.attainment=g.target_financial?g.sales_financial/g.target_financial*100:0;
      g.deviation=g.sales_financial-g.target_financial;
      g.evolution_vs_ly=g.ly_financial?((g.sales_financial/g.ly_financial)-1)*100:null;
      return g;
    }).filter(Boolean);
  }
  function validateAgainstTotals(){
    const summary=getSummaries();
    const total=summary.reduce((n,g)=>n+Number(g.target_financial||0),0);
    const official=Number(state.day?.target_financial||0);
    return {summary,official,total,difference:official-total};
  }
  window.getOfficialGgSummaries=getSummaries;
  window.getOfficialGgForDco=code=>aliases[keyByDco.get(Number(code))]||null;
  window.getOfficialGgValidation=validateAgainstTotals;
})();