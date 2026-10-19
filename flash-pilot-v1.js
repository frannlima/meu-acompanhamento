/* Referências Flash separadas dos resultados oficiais. */
(function(){
 'use strict';
 const core=window.MAFlashCore,endpoint='https://vvgejviwvtnlahbyopah.supabase.co/functions/v1/flash-sync';
 const publicKey='sb_publishable_XBa55FcPfePH_roJs2ejHg_KK9lV0R6';
 let packet=null,hourly=null,identity='',history=[],filter='',sort='total',syncStatus='Coleta local; sincronização não ativada.',lastPoll=0,busy=false;
 const admin=()=>state.logged&&state.role==='administrador',allowed=()=>!!state.logged;
 const money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const percent=v=>v===null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
 const time=iso=>new Date(iso).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'});
 function token(){try{const a=JSON.parse(sessionStorage.getItem('ria_secure_auth')||'null');return a?.expires_at>Date.now()?a.access_token:null}catch{return null}}
 async function cloud(action,payload={}){
  const jwt=token();if(!jwt)throw Error('Confirme seu e-mail para sincronizar.');
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:publicKey,Authorization:'Bearer '+jwt},body:JSON.stringify({action,...payload,matricula:state.matricula})});
  const b=await r.json();if(!r.ok)throw Error(b.error||'Falha na sincronização.');return b.data;
 }
 function rows(){return (packet?.rows||[]).filter(r=>(admin()||r.store===String(state.storeCode).padStart(3,'0'))&&(!filter||r.store===filter));}
 function record(next){
  packet=next;
  const prior=history.find(p=>p.collected_at===next.collected_at&&p.business_date===next.business_date);if(!prior)history.unshift(next);
  history=history.sort((a,b)=>Date.parse(b.collected_at)-Date.parse(a.collected_at)).slice(0,96);paint();
 }
 async function sharePacket(){
  if(!packet||!admin()||!token())return;
  try{await cloud('save',{packet});syncStatus='Coleta salva no histórico compartilhado.';}catch(e){syncStatus=e.message;}paint();
 }
 async function loadShared(){
  if(!allowed()||!token()||busy)return;busy=true;const who=identity;
  try{const data=await cloud('history',{business_date:localDate()});if(who!==identity)return;
   if(data.length){const valid=data.map(core.validate);history=valid;const newest=valid[0];if(!packet||Date.parse(newest.collected_at)>Date.parse(packet.collected_at))packet=newest;}
   syncStatus=data.length?'Histórico compartilhado carregado.':'Nenhuma coleta compartilhada para hoje.';paint();
  }catch(e){syncStatus=e.message;paint();}finally{busy=false;}
 }
 function paint(){
  const host=document.getElementById('flashPilotBody');if(!host||!allowed())return;
  if(!packet){host.innerHTML='<p>Aguardando coleta do Flash. Administrador: abra Total Lojas e use a extensão.</p><p>'+escape(syncStatus)+'</p>';return;}
  const visible=rows(),total=visible.reduce((a,r)=>a+r.total,0),omni=visible.reduce((a,r)=>a+r.omni,0),target=visible.reduce((a,r)=>a+r.target,0),coupons=visible.reduce((a,r)=>a+r.coupons,0);
  const age=Math.max(0,Math.floor((Date.now()-Date.parse(packet.collected_at))/60000));
  const ordered=visible.slice().sort((a,b)=>sort==='attainment'?(b.target>0?b.total/b.target:-1)-(a.target>0?a.total/a.target:-1):sort==='gap'?(a.total-a.target)-(b.total-b.target):sort==='store'?a.store.localeCompare(b.store):b.total-a.total);
  const card=(label,value)=>'<div class="flash-kpi"><span>'+label+'</span><strong>'+value+'</strong></div>';
  host.innerHTML='<p>Fonte: Flash • Dia '+escape(packet.business_date)+' • Coletado às '+time(packet.collected_at)+' • '+(admin()?packet.rows.length+'/18 lojas':String(state.storeCode))+' • <strong class="'+(age>15?'flash-late':'')+'">'+(age>15?'Coleta desatualizada: ':'Coletado há ')+age+' min</strong></p>'+
   '<p id="flashSyncStatus">'+escape(syncStatus)+'</p><div class="flash-kpis">'+card('Total Flash',money(total))+card('Orçamento Flash',money(target))+card('Atingimento',percent(target>0?total/target*100:null))+card('Desvio vs orçamento',money(total-target))+card('OMNI',money(omni))+card('Físico de referência',money(total-omni))+card('Cupons',String(coupons))+card('Ticket por cupom',coupons?money(total/coupons):'—')+'</div>'+
   '<div class="flash-tools"><label>Loja <select id="flashStore"><option value="">'+(admin()?'Regional • lojas coletadas':'Minha loja')+'</option>'+packet.rows.filter(r=>admin()||r.store===String(state.storeCode).padStart(3,'0')).map(r=>'<option '+(filter===r.store?'selected ':'')+'value="'+r.store+'">'+r.store+'</option>').join('')+'</select></label><label>Ordenar <select id="flashSort">'+[['total','Maior venda'],['attainment','Maior atingimento'],['gap','Maior desvio negativo'],['store','Código da loja']].map(([v,l])=>'<option value="'+v+'" '+(sort===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div>'+
   '<div class="table-wrap"><table class="flash-table"><thead><tr><th>Loja</th><th>Total Flash</th><th>Orçamento</th><th>Atingimento</th><th>Desvio R$</th><th>Part. nas lojas coletadas</th><th>OMNI</th><th>Físico de referência</th><th>Cupons</th><th>Hora Flash</th><th>eStore</th><th>eStore / Total Flash*</th></tr></thead><tbody>'+ordered.map(r=>{
    const e=packet.business_date===localDate()&&hourly?.context?.date===packet.business_date?hourly.stores.find(e=>String(e.st).padStart(3,'0')===r.store):null;
    const cap=e?.updated_at&&Number.isFinite(Number(e.captured))?Number(e.captured):null;
    const regionalTotal=admin()?packet.rows.reduce((n,r)=>n+r.total,0):0;
    return '<tr><th>'+r.store+'</th><td>'+money(r.total)+'</td><td>'+money(r.target)+'</td><td>'+percent(r.target>0?r.total/r.target*100:null)+'</td><td>'+money(r.total-r.target)+'</td><td>'+percent(regionalTotal>0?r.total/regionalTotal*100:null)+'</td><td>'+money(r.omni)+'</td><td>'+money(r.physical_reference)+'</td><td>'+r.coupons+'</td><td>'+escape(r.source_time??'—')+'</td><td>'+(cap===null?'—':money(cap))+'</td><td>'+percent(cap===null?null:core.share(cap,r.total))+'</td></tr>';
   }).join('')+'</tbody></table></div><p>Total Flash e orçamento são referências da fonte. Físico de referência = total − OMNI; vales-troca ainda não conciliados. * Relação eStore indicativa. Ausência de informação não significa venda zerada.</p>'+
   '<details><summary>Histórico de coletas ('+history.filter(p=>p.business_date===packet.business_date).length+')</summary><ul>'+history.filter(p=>p.business_date===packet.business_date).map(p=>'<li>'+time(p.collected_at)+' • '+money(p.rows.filter(r=>admin()||r.store===String(state.storeCode).padStart(3,'0')).reduce((n,r)=>n+r.total,0))+' • '+p.rows.length+' lojas</li>').join('')+'</ul></details>';
  document.getElementById('flashStore').onchange=e=>{filter=e.target.value;paint();};document.getElementById('flashSort').onchange=e=>{sort=e.target.value;paint();};
 }
 function mount(){
  const main=document.querySelector('#appShell main');if(!main)return;
  if(!document.getElementById('section-flash-pilot')){
   const style=document.createElement('style');style.textContent='.flash-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:18px 0}.flash-kpi{padding:16px;border:1px solid #DAD9D6;border-radius:14px;background:#fff}.flash-kpi span{display:block;font-size:12px;color:#466964}.flash-kpi strong{display:block;font-size:22px;color:#173f35;margin-top:6px}.flash-tools{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0}.flash-tools select{padding:10px;border-radius:8px}.flash-table th,.flash-table td{font-size:12px!important;padding:12px!important;white-space:nowrap}.flash-table thead th{background:#173f35!important;color:white!important}.flash-late{color:#a34424}.flash-auth{margin:14px 0}.flash-auth input{padding:10px;max-width:100%}';document.head.append(style);
   const section=document.createElement('section');section.id='section-flash-pilot';section.className='section';section.innerHTML='<div class="section-head"><div><span class="eyebrow">FLASH • RESULTADO DAS LOJAS</span><h1>Flash • Gestão do dia</h1><p>Vendas das lojas, grupos, produtos e trocas.</p></div><button id="flashPilotClear" class="btn secondary">Limpar coleta local</button></div><section class="card"><div class="section-actions"><button id="flashSharedLoad" class="btn secondary">Consultar histórico compartilhado</button><button id="flashSharedSave" class="btn secondary">Salvar coleta compartilhada</button></div><details class="flash-auth"><summary>Confirmar e-mail para sincronização</summary><p>Use um e-mail vinculado à sua matrícula pelo administrador. A confirmação é exclusiva para as coletas Flash.</p><form id="flashEmailForm"><input name="email" type="email" required placeholder="E-mail autorizado" autocomplete="email"><button class="btn secondary">Enviar código</button></form><form id="flashOtpForm" hidden><input name="code" inputmode="numeric" autocomplete="one-time-code" required placeholder="Código recebido"><button class="btn secondary">Confirmar código</button></form><p id="flashAuthStatus" role="status"></p></details><div id="flashPilotBody" aria-live="polite"></div></section>';main.append(section);
   document.getElementById('flashPilotClear').onclick=()=>{packet=null;history=[];paint();document.dispatchEvent(new CustomEvent('ma:flash-clear'));};
   document.getElementById('flashSharedLoad').onclick=loadShared;document.getElementById('flashSharedSave').onclick=()=>{if(!token()){syncStatus='Confirme seu e-mail para salvar a coleta.';paint();}else sharePacket();};
   let email='';const authStatus=document.getElementById('flashAuthStatus');
   document.getElementById('flashEmailForm').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;email=new FormData(e.target).get('email').toString().trim().toLowerCase();try{const r=await fetch('https://vvgejviwvtnlahbyopah.supabase.co/auth/v1/otp',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});if(!r.ok)throw Error('Não foi possível enviar o código.');document.getElementById('flashOtpForm').hidden=false;authStatus.textContent='Confira o código no e-mail. O acesso depende do vínculo administrativo.';}catch(e){authStatus.textContent=e.message}finally{button.disabled=false}};
   document.getElementById('flashOtpForm').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const r=await fetch('https://vvgejviwvtnlahbyopah.supabase.co/auth/v1/verify',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({email,token:new FormData(e.target).get('code'),type:'email'})});const b=await r.json();if(!r.ok||!b.access_token)throw Error('Código inválido ou expirado.');sessionStorage.setItem('ria_secure_auth',JSON.stringify({access_token:b.access_token,expires_at:Date.now()+(b.expires_in-60)*1000}));authStatus.textContent='E-mail confirmado.';await loadShared();document.dispatchEvent(new CustomEvent('ma:flash-auth-ready'));}catch(e){authStatus.textContent=e.message}finally{button.disabled=false}};
  }
  for(const parent of ['#nav','.mobile-more-grid','#section-mais']){const el=document.querySelector(parent);if(!el||el.querySelector('.ma-flash-entry'))continue;const b=document.createElement('button');b.type='button';b.className='btn secondary ma-flash-entry';b.textContent='Flash • Gestão do dia';b.onclick=()=>{if(allowed()){paint();setSection('flash-pilot');loadShared();}};el.append(b);}
 }
 window.addEventListener('message',event=>{
  if((event.source!==window&&event.source!==null)||event.origin!==location.origin||event.data?.type!=='MA_FLASH_PILOT_V1'||event.data.payload?.kind!=='flash-stores')return;
  const ack=(ok,error)=>{if(event.data.requestId)window.postMessage({type:'MA_FLASH_ACK_V1',requestId:event.data.requestId,ok,error},location.origin);};
  if(!admin()){ack(false,'Entre como administrador para receber a coleta.');return;}
  try{sync();const next=core.validate(event.data.payload);const age=Date.now()-Date.parse(next.collected_at);if(age< -60000||age>900000)throw Error('Coleta expirada; colete novamente.');record(next);sharePacket();toast('Coleta Flash recebida.');ack(true);}catch(e){const h=document.getElementById('flashPilotBody');if(h)h.textContent='Coleta recusada: '+e.message;toast(e.message,true);ack(false,e.message);}
 });
 document.addEventListener('ma:estore-hourly-loaded',event=>{if(allowed()&&event.detail?.context?.date===localDate()&&String(event.detail.context.store).padStart(3,'0')===String(state.storeCode).padStart(3,'0')&&Array.isArray(event.detail.stores)){hourly=event.detail;paint();}});
 function sync(){mount();const next=state.logged?String(state.matricula)+':'+state.role+':'+state.storeCode:'';if(identity!==next){packet=null;hourly=null;history=[];filter='';identity=next;paint();}document.querySelectorAll('.ma-flash-entry').forEach(e=>{e.hidden=!allowed();e.classList.toggle('hidden',!allowed());});const save=document.getElementById('flashSharedSave');if(save)save.hidden=!admin();if(allowed()&&Date.now()-lastPoll>60000){lastPoll=Date.now();loadShared();if(state.section==='flash-pilot')paint();}}
 sync();setInterval(sync,1500);
})();
