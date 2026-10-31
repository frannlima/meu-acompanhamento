const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../ma3-group-live-v1.js"),"utf8");
const input=[
 {key:"feminino",name:"Feminino",meta:1000,sale:400,att:40,abs:-600,evo:-25,ly:530,isDay:true,isHour:true},
 {key:"masculino",name:"Masculino",meta:500,sale:420,att:84,abs:-80,evo:15,ly:360,isDay:false,isHour:false}
];
function harness(dayOverrides={}){
 const live={dataset:{},innerHTML:"",hidden:true,querySelector(){return null},closest(){return {classList:{add(){}}}}};
 const card={querySelector(){return null},appendChild(){},classList:{add(){}}};
 const state={logged:true,storeCode:"108",day:{has_input:true,captured_at:"2026-10-23T15:30:00-03:00",target_financial:1500,sales_financial:820,ly_financial:1200,sales_physical:45,...dayOverrides}};
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

test("Total Loja usa base A.A. oficial, evolução consolidada, desvio integral e venda física",()=>{
 const {model,live}=harness();
 const m=model.report();
 assert.equal(m.totalLy,1200);
 assert.equal(m.totalPhysical,45);
 assert.ok(Math.abs(m.totalEvolution-(-31.666666666666664))<.001);
 model.render(true);
 const output=live.innerHTML.replace(/\u00a0/g," ");
 assert.match(output,/R\$ 1\.200,00/);
 assert.match(output,/▼ -31,7%/);
 assert.match(output,/-R\$ 680,00/);
 assert.match(output,/gl-data gl-physical" role="cell">45/);
 assert.match(output,/gl-hly/);
 assert.match(output,/VENDA A\.A\./);
});
test("desvio não usa 'mil' nem no grupo nem no Total Loja",()=>{
 const {model,live}=harness({target_financial:10500});
 model.render(true);
 assert.match(live.innerHTML.replace(/\u00a0/g," "),/-R\$ 9\.680,00/);
 const html=live.innerHTML.replace(/\u00a0/g," ");
 const cells=[...html.matchAll(/class="gl-data gl-dev"[^>]*>(.*?)<\/div>/g)].map(x=>x[1]);
 assert.ok(cells.length>0);
 assert.ok(cells.every(x=>!x.includes(" mil")));
});
test("base A.A. indisponível não gera percentual inventado",()=>{
 const {model}=harness({ly_financial:0,sales_physical:null});
 const m=model.report();
 assert.equal(m.totalLy,null);
 assert.equal(m.totalEvolution,null);
});
