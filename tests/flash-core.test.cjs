const assert=require('node:assert/strict');
const {numberBR,validate,share}=require('../flash-core-v1.js');
const input=()=>({version:1,kind:'flash-stores',source:'flash.riachuelo.com.br',business_date:'2026-10-18',collected_at:'2026-10-18T21:00:00Z',rows:[{store:'108',total:1000,omni:200,target:2000,coupons:5,source_time:'18:00'}]});
assert.equal(numberBR('200.365'),200365);assert.equal(numberBR('2.610,50'),2610.5);assert.equal(numberBR('-15.820,4'),-15820.4);
for(const s of ['','-','Loading...','1,2x','Infinity'])assert.throws(()=>numberBR(s));
assert.equal(validate(input()).rows[0].physical_reference,800);assert.equal(share(10,1000),1);assert.equal(share(10,0),null);
for(const code of ['109','519','089']){const p=input();p.rows[0].store=code;assert.throws(()=>validate(p));}
{const p=input();p.rows.push({...p.rows[0]});assert.throws(()=>validate(p));}
{const p=input();p.rows[0].omni=1001;assert.throws(()=>validate(p));}
{const p=input();p.rows[0].source_time='24:55';assert.throws(()=>validate(p));}
{const p=input();p.rows[0].total=null;assert.throws(()=>validate(p));}
console.log('Flash core: validações, canais e share aprovados.');
