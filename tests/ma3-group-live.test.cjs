const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../ma3-group-live-v1.js"),"utf8");
const input=[
 {key:"feminino",name:"Feminino",meta:1000,sale:400,att:40,abs:-600,evo:-25,ly:530,isDay:true,isHour:true},
 {key:"masculino",name:"Masculino",meta:500,sale:420,att:84,abs:-80,evo:15,ly:360,isDay:false,isHour:false}
];
function harness(){
 const live={dataset:{},innerHTML:"",hidden:true,querySelector(){return null},closest(){return {classList:{add(){}}}}};
 const card={querySelector(){return null},appendChild(){},classList:{add(){}}};
 const state={logged:true,storeCode:"108",day:{has_input:true,captured_at:"2026-10-23T15:30:00-03:00",target_financial:1500,sales_financial:820}};
 const document={readyState:"loading",addEventListener(){},getElementById(id){if(id==="ma3LiveGroup")return live;if(id==="ma3Card")return card;return null}};
 const window={maGroupImpact:{getAnalysis:()=>({gg:input,day:new Set(["feminino"]),hour:new Set(["feminino"]),valid:true,now:15*60+30})},
  getOfficialGgSummaries:()=>input.map(g=>({gg_label:g.name,sales_physical:100})),
  getOperationalSalesCurve:()=>[{h:14,fin:.25},{h:15,fin:.25},{h:16,fin:.25},{h:17,fin:.25}]};
 const context={state,document,window,Intl,Date,console,localDate:()=>"2026-10-23"};
 vm.runInNewContext(source,context,{filename:"ma3-group-live-v1.js"});
 return {model:window.maGroupLivePanel,live};
}
test("painel visível tem linhas HTML com botões por grupo e alertas D/H",()=>{
 const {model,live}=harness();model.render(true);
 assert.match(live.innerHTML,/PARCIAL HORA HORA/);
 assert.match(live.innerHTML,/data-gi-group="feminino"/);
 assert.match(live.innerHTML,/data-gi-group="masculino"/);
 assert.match(live.innerHTML,/gl-alert-day/);
 assert.match(live.innerHTML,/gl-alert-hour/);
 assert.match(live.innerHTML,/gl-mobile-head/);
 assert.match(live.innerHTML,/TOTAL LOJA/);
 assert.equal(live.hidden,false);
});
test("projeção usa fração até o minuto da última parcial, sem antecipar uma hora",()=>{
 const {model}=harness();const m=model.report();
 assert.ok(Math.abs(m.ratio-.375)<1e-8);
 assert.ok(Math.abs(m.projection-(820/.375))<.01);
 assert.equal(m.rows[0].name,"Masculino");
});
test("não exibe venda real antes de parcial válida",()=>{
 const {model}=harness();
 const m=model.report();assert.equal(m.valid,true);
});
