const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"../sales-curve-tech-v1.js"),"utf8");
class TestDate extends Date{
 constructor(...args){super(...(args.length?args:["2026-10-23T18:20:00Z"]));}
 static now(){return Date.parse("2026-10-23T18:20:00Z");}
}
const currentDate="2026-10-23";
const point=(time,sale)=>({captured_at:time,sales_financial:sale});
function factory(options={}){
 const state={
  logged:true,storeCode:"108",history:[point("2026-10-23T14:10:00-03:00",210)],
  day:{has_input:true,captured_at:"2026-10-23T15:10:00-03:00",sales_financial:260,target_financial:1000},
  ...options
 };
 const raw=[
  {h:10,fin:.10},{h:11,fin:.10},{h:12,fin:.10},{h:13,fin:.10},
  {h:14,fin:.15},{h:15,fin:.15},{h:16,fin:.10},{h:17,fin:.10},
  {h:18,fin:.05},{h:19,fin:.025},{h:20,fin:.015},{h:21,fin:.01}
 ];
 const context={
  state,window:{getOperationalSalesCurve:()=>raw},Date:TestDate,
  document:{readyState:"loading",addEventListener(){}},localDate:()=>currentDate,
  Intl,console
 };
 vm.runInNewContext(source,context);
 return context.window.maTechSalesCurve.model();
}
test("recupera o desvio sem duplicar: rateio integral só sobre horas futuras",()=>{
 const m=factory();
 assert.equal(m.slots.find(r=>r.h===15).extra,0);
 assert.ok(m.gap<0);
 assert.ok(m.remainingWeight>0);
 const sum=m.slots.reduce((total,r)=>total+r.extra,0);
 assert.ok(Math.abs(sum+m.gap)<1e-7);
 const x=m.slots.find(r=>r.h===16),y=m.slots.find(r=>r.h===17);
 assert.ok(Math.abs(x.extra/y.extra-x.w/y.w)<1e-9);
});
test("sem parcial não inventa realização, déficit ou projeção",()=>{
 const m=factory({history:[],day:{has_input:false,target_financial:1000}});
 assert.equal(m.last,null);
 assert.equal(m.gap,null);
 assert.equal(m.projection,null);
 assert.equal(m.recoverable,0);
 assert.equal(m.intervals.length,0);
});
test("ignora inputs de outro dia e respeita o horário local de Fortaleza",()=>{
 const m=factory({history:[point("2026-10-22T15:00:00-03:00",500)],
  day:{has_input:true,captured_at:"2026-10-22T15:20:00-03:00",sales_financial:500,target_financial:1000}});
 assert.equal(m.last,null);
});
test("compara somente períodos entre inputs reais, não horas artificiais",()=>{
 const m=factory();
 assert.equal(m.intervals.length,1);
 assert.equal(m.intervals[0].from,14*60+10);
 assert.equal(m.intervals[0].to,15*60+10);
 assert.equal(m.intervals[0].real,50);
 assert.equal(m.intervals[0].minutes,60);
});
test("filiais de rua param a recuperação às 18h",()=>{
 const m=factory({storeCode:"084"});
 assert.equal(m.closing,18);
 assert.ok(m.slots.every(r=>r.h<18));
});
