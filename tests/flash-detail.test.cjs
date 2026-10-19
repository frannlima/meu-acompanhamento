const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),core=require('../flash-detail-core-v1.js');
const envelope=kind=>({version:1,kind,source:'flash.riachuelo.com.br',business_date:'2026-10-18',collected_at:new Date().toISOString(),store:'108'});
const dep={dco:148,name:'Fanlab',total:100,omni:10,target:200,coupons:2};
let p={...envelope('flash-departments'),rows:[dep]};assert.equal(core.groups(core.validate(p).rows)[0].world,'masculino');
for(const dco of core.excluded)assert.throws(()=>core.validate({...p,rows:[{...dep,dco}]}));
for(const store of ['109','519','073x'])assert.throws(()=>core.validate({...p,store}));
assert.throws(()=>core.validate({...p,business_date:'2026-02-30'}));assert.throws(()=>core.validate({...p,rows:[]}));assert.throws(()=>core.validate({...p,rows:[{...dep,omni:101}]}));
const photo={...envelope('flash-photos'),dco:230,rows:[{sku:'12345678001',image_url:'https://static.riachuelo.com.br/RCHLO/12345678001/portrait/test.jpg?imwidth=187'}]};assert.equal(core.validate(photo).rows.length,1);
for(const url of ['https://evil.example/x.jpg','https://static.riachuelo.com.br.evil.example/RCHLO/12345678001/x.jpg','http://static.riachuelo.com.br/RCHLO/12345678001/x.jpg','https://static.riachuelo.com.br/RCHLO/99999999999/x.jpg'])assert.throws(()=>core.validate({...photo,rows:[{...photo.rows[0],image_url:url}]}));
const product={...envelope('flash-products'),dco:230,rows:[{sku:'12345678001',description:'Produto de teste',quantity:2,sales:100,stock:-1,stock_cd:20}]};assert.equal(core.validate(product).rows[0].stock,-1);
const context={location:{origin:'https://flash.riachuelo.com.br',pathname:'/vendas/deptos/total/20261018/20261018/108'},setTimeout,URL,Promise,Date,document:{querySelector(){}}};vm.createContext(context);vm.runInContext(fs.readFileSync('extension-flash/capture.js','utf8'),context);
function fixture(heads,rows){context.document.querySelector=selector=>({querySelectorAll:selector=>selector==='thead th'?heads.map(textContent=>({textContent})):rows.map(row=>({querySelectorAll:()=>row.map(textContent=>({textContent}))}))});}
(async()=>{
 fixture(['-','Dep','Departamento','Total','Real Online','Orçado','Cupons'],[['1','148','FAN LAB','1.000','100','2.000','5'],['2','320','EXCLUIDO','1','0','1','1']]);let raw=await context.captureFlashDetail({kind:'flash-departments',store:'108'});assert.equal(raw.rows.length,1);assert.equal(raw.rows[0].dco,148);assert.equal(raw.date,'2026-10-18');
 context.location.pathname='/vendas/item/230/108/20261018';fixture(['Cód Sap','Descrição','Qtd Est.','Est CD','Qtd Vda','Vda Real'],[['12345678001','Produto teste','3','100','2','199,90']]);raw=await context.captureFlashDetail({kind:'flash-products',store:'108',dco:230});assert.equal(raw.rows[0].quantity,'2');assert.equal(raw.rows[0].stock,'3');
 context.location.pathname='/devolucao/loja/20261017';fixture(['Loja','Nome','Devolução R$','Devolução Qtde','Troca R$','Troca Qtde'],[['L108','Loja teste','0,0','0,0','-199,90','-2,0'],['L109','Excluída','0','0','0','0']]);raw=await context.captureFlashDetail({kind:'flash-exchanges',store:'108'});assert.equal(raw.scope,'stores');assert.equal(raw.date,'2026-10-17');assert.equal(raw.rows.length,1);assert.equal(raw.rows[0].exchange_quantity,'-2,0');
 console.log('Flash details: DCO mapping, exclusions, dates, source schemas, stock, exchange scope and photo allowlist passed.');
})().catch(e=>{console.error(e);process.exit(1)});
