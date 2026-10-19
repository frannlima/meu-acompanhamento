const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();class Element{constructor(){this.hidden=false;this.classList={toggle(){}};this.children=[];}append(e){this.children.push(e);if(e.id)elements.set(e.id,e)}set innerHTML(html){this.html=html;for(const m of html.matchAll(/id="([^"]+)"/g))if(!elements.has(m[1]))elements.set(m[1],new Element())}get innerHTML(){return this.html||''}querySelector(){return null}}
const main=new Element(),body=new Element(),head=new Element();let receive;const core=require('../flash-core-v1.js');
const state={logged:true,role:'administrador',matricula:'test',storeCode:'108'};
const window={MAFlashCore:core,addEventListener(t,f){if(t==='message')receive=f}};
const document={head,createElement:()=>new Element(),getElementById:id=>elements.get(id),querySelector:s=>s==='#appShell main'?main:null,querySelectorAll:()=>[],addEventListener(){}};
vm.runInNewContext(fs.readFileSync('flash-pilot-v1.js','utf8'),{window,document,state,location:{origin:'https://frannlima.github.io'},sessionStorage:{getItem:()=>null},setInterval(){},localDate:()=>new Date().toISOString().slice(0,10),toast(){},setSection(){},FormData,fetch(){throw Error('Unverified session must not fetch')},console});
const packet={version:1,kind:'flash-stores',source:'flash.riachuelo.com.br',business_date:new Date().toISOString().slice(0,10),collected_at:new Date().toISOString(),rows:[{store:'108',total:100,omni:10,target:200,coupons:2,source_time:'20:40'},{store:'073',total:300,omni:0,target:300,coupons:3,source_time:null}]};
receive({source:null,origin:'https://frannlima.github.io',data:{type:'MA_FLASH_PILOT_V1',payload:packet}});
const html=elements.get('flashPilotBody').innerHTML;assert.match(html,/80%/);assert.match(html,/400,00/);assert.match(html,/25%/);assert.match(html,/50%/);assert.match(html,/Histórico de coletas \(1\)/);
receive({source:null,origin:'https://evil.example',data:{type:'MA_FLASH_PILOT_V1',payload:{}}});assert.equal(elements.get('flashPilotBody').innerHTML,html);
console.log('Flash regional view: totals, attainment, store share, history and origin guard passed.');
