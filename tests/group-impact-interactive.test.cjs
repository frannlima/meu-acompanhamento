const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"../group-impact-interactive-v1.js"),"utf8");
function model(options={}){
 const state={
  logged:true,storeCode:"108",
  day:{has_input:true,captured_at:"2026-10-23T16:30:00-03:00",interval_minutes:30},
  detail:{rows:[{dco_code:200,interval_sales_financial:60},{dco_code:301,interval_sales_financial:200}]},
  ...options
 };
 const groups=options.groups||[
  {gg_label:"Feminino",target_financial:1000,sales_financial:400,ly_financial:300,interval_sales_financial:60},
  {gg_label:"Masculino",target_financial:500,sales_financial:420,ly_financial:500,interval_sales_financial:200}
 ];
 const window={getOfficialGgSummaries:()=>groups,
  getOfficialGgForDco:c=>Number(c)===200?"Feminino":"Masculino",
  getOperationalSalesCurve:()=>[14,15,16,17].map(h=>({h,fin:.25}))};
 const context={state,window,localDate:()=> "2026-10-23",
  document:{readyState:"loading",addEventListener(){}},Intl,Date,console};
 vm.runInNewContext(source,context,{filename:"group-impact-interactive-v1.js"});
 return window.maGroupImpact.getAnalysis();
}
test("classifica alertas dia e hora por déficit monetário real",()=>{
 const x=model();assert.equal(x.valid,true);
 assert.equal(x.day.has("feminino"),true);
 assert.equal(x.hour.has("feminino"),true);
 assert.equal(x.hour.has("masculino"),false);
 assert.equal(x.byKey.get("feminino").hourGap,-65);
 assert.ok(x.byKey.get("masculino").hourGap>0);
});
test("sem primeira parcial não calcula alarmes falsos",()=>{
 const x=model({day:{has_input:false,captured_at:null,interval_minutes:0}});
 assert.equal(x.valid,false);
 assert.equal(x.hour.size,0);assert.equal(x.day.size,0);
 assert.equal(x.byKey.get("feminino").evo,null);
});
test("sem janela válida a hora fica indisponível",()=>{
 const x=model({day:{has_input:true,captured_at:"2026-10-23T16:30:00-03:00",interval_minutes:0}});
 assert.equal(x.hour.size,0);assert.equal(x.byKey.get("feminino").hourGap,null);
 assert.equal(x.day.has("feminino"),true);
});
test("ignora parcial de dia anterior",()=>{
 const x=model({day:{has_input:true,captured_at:"2026-10-22T16:30:00-03:00",interval_minutes:30}});
 assert.equal(x.valid,false);assert.equal(x.day.size,0);assert.equal(x.hour.size,0);
});
