const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 let handler,role='administrador',mapped=true,writes=0;
 const sb={auth:{getUser:async()=>({data:{user:{email:'test@example.invalid',email_confirmed_at:'2026-01-01'}}})},from(name){const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit:async()=>({data:[{business_date:'2026-10-18',collected_at:new Date().toISOString(),rows:[{store:'108'},{store:'073'}]}]}),maybeSingle:async()=>({data:name==='ria_authorized_emails'?(mapped?{matricula:'test',store_code:'108'}:null):{matricula:'test',store_code:'108',app_role:role}}),upsert:async()=>{writes++;return {error:null}}};return q}};
 globalThis.MAFlashDetailCore=require('../flash-detail-core-v1.js');globalThis.__flashTest={createClient:()=>sb};globalThis.Deno={env:{get:()=>''},serve:f=>handler=f};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'flash-sync-test-')),file=path.join(dir,'index.ts');fs.writeFileSync(file,'const {createClient}=globalThis.__flashTest;\n'+fs.readFileSync('supabase/functions/flash-sync/index.ts','utf8').replace(/^import .*\n/gm,''));await import('file://'+file);
 const req=(body,auth=true)=>new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer test'}:{})},body:JSON.stringify(body)});
 assert.equal((await handler(req({action:'latest'},false))).status,401);
 mapped=false;assert.equal((await handler(req({action:'latest'}))).status,403);mapped=true;
 assert.equal((await handler(req({action:'latest',matricula:'different'}))).status,403);
 role='supervisor';assert.equal((await handler(req({action:'save',matricula:'test'}))).status,403);
 const own=await (await handler(req({action:'latest',matricula:'test',business_date:'2026-10-18'}))).json();assert.equal(own.data[0].rows.length,1);assert.equal(own.data[0].rows[0].store,'108');
 role='administrador';const p={version:1,kind:'flash-stores',source:'flash.riachuelo.com.br',business_date:'2026-10-18',collected_at:new Date().toISOString(),rows:[{store:'108',total:100,omni:10,target:200,coupons:1,source_time:null}]};
 assert.equal((await handler(req({action:'save',matricula:'test',packet:p}))).status,200);assert.equal(writes,1);
 const detail={version:1,kind:'flash-products',source:'flash.riachuelo.com.br',business_date:'2026-10-18',collected_at:new Date().toISOString(),store:'108',dco:230,rows:[{sku:'12345678001',description:'Produto de teste',quantity:1,sales:100,stock:2,stock_cd:50}]};assert.equal((await handler(req({action:'save_detail',matricula:'test',packet:detail}))).status,200);assert.equal(writes,2);role='supervisor';assert.equal((await handler(req({action:'save_detail',matricula:'test',packet:detail}))).status,403);role='administrador';detail.dco=320;assert.equal((await handler(req({action:'save_detail',matricula:'test',packet:detail}))).status,400);
 p.rows[0].store='109';assert.equal((await handler(req({action:'save',matricula:'test',packet:p}))).status,400);assert.equal(writes,2);
 fs.rmSync(dir,{recursive:true});console.log('Flash sync: missing auth, binding, identity, write role, store scope and excluded stores passed.');
})().catch(e=>{console.error(e);process.exit(1)});
