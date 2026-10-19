const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const elements={status:{},capture:{},send:{}};
const context={document:{getElementById:id=>elements[id]},location:{origin:'https://flash.riachuelo.com.br',pathname:'/vendas/lojas/total'}};
vm.createContext(context);vm.runInContext(fs.readFileSync('extension-flash/capture.js','utf8'),context);
const heads=['-','Loja','Data Inaug.','Região','UF','Total','Real Online','% Online','Orçado','Atg','','','Cup Médio','Cupom','Margem Liq.','Hora'];
function tableRow(store){const c=Array(16).fill('');c[1]='L'+store+' Nome Loja';c[5]='200.365';c[6]='2.610';c[8]='310.158';c[13]='826';c[15]='18:30';return {querySelectorAll:()=>c.map(textContent=>({textContent}))};}
function setup(headers=heads,start='18/10/2026',end=start){context.document.querySelector=s=>s==='#dataDe'?{selectedOptions:[{textContent:start}]}:s==='#dataAte'?{selectedOptions:[{textContent:end}]}:{querySelectorAll:s=>s==='thead th'?headers.map(textContent=>({textContent})):[tableRow('108'),tableRow('109'),tableRow('519')]};}
setup();let p=context.captureVisibleTable(['108']);assert.equal(p.rows.length,1);assert.equal(p.rows[0].omni,'2.610');assert.equal(p.date,'2026-10-18');
setup(['Loja','Venda']);assert.throws(()=>context.captureVisibleTable(['108']),/Cabeçalhos/);
setup(heads,'17/10/2026','18/10/2026');assert.throws(()=>context.captureVisibleTable(['108']),/único dia/);
console.log('Flash capture: filtros, cabeçalhos e intervalo aprovados.');
