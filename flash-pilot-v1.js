/* Referências Flash separadas dos resultados oficiais. */
(function(){
 'use strict';
 const core=window.MAFlashCore,endpoint='https://vvgejviwvtnlahbyopah.supabase.co/functions/v1/flash-sync';
 const publicKey='sb_publishable_XBa55FcPfePH_roJs2ejHg_KK9lV0R6';
 let packet=null,hourly=null,identity='',history=[],filter='',sort='total',syncStatus='Coleta local; sincronização não ativada.',lastPoll=0,busy=false,saving=false,retryPending=false,lastShareAt=0;
 const admin=()=>state.logged&&state.role==='administrador',allowed=()=>!!state.logged;
 const money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const percent=v=>v===null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
 const time=iso=>new Date(iso).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'});
 async function token(){return await window.maFlashAuth?.getToken?.()||null}
 async function cloud(action,payload={}){
  const jwt=await token();if(!jwt)throw Error('Confirme seu e-mail para sincronizar.');
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:publicKey,Authorization:'Bearer '+jwt},body:JSON.stringify({action,...payload,matricula:state.matricula})});
  const b=await r.json();if(!r.ok)throw Error(b.error||'Falha na sincronização.');return b.data;
 }
 function rows(){return (packet?.rows||[]).filter(r=>(admin()||r.store===String(state.storeCode).padStart(3,'0'))&&(!filter||r.store===filter));}
 function record(next){
  if(packet?.business_date===next.business_date&&Date.parse(packet.collected_at)>Date.parse(next.collected_at))return;
  packet=next;retryPending=true;
  const prior=history.find(p=>p.collected_at===next.collected_at&&p.business_date===next.business_date);if(!prior)history.unshift(next);
  history=history.sort((a,b)=>Date.parse(b.collected_at)-Date.parse(a.collected_at)).slice(0,96);paint();document.dispatchEvent(new CustomEvent('ma:flash-update'));
 }
 async function sharePacket(){
  if(!packet||!admin()||saving)return;
  retryPending=true;
  const jwt=await token();
  if(!jwt){syncStatus='Flash recebido no app. Para publicar automaticamente entre computadores, confirme seu e-mail autorizado uma única vez por sessão.';paint();return;}
  saving=true;const requested=packet;lastShareAt=Date.now();
  try{
    const result=await cloud('save',{packet:requested});
    const bridge=result?.estore_sync;
    retryPending=!bridge?.ok;
    syncStatus=bridge?.ok
      ?'Sincronizado automaticamente: '+Number(bridge.coverage||0)+'/18 filiais no eStore • coleta '+time(requested.collected_at)+'.'
      :'Flash salvo no histórico. Integração eStore pendente: '+String(bridge?.reason||'será tentada novamente.');
    if(packet?.collected_at!==requested.collected_at)retryPending=true;
  }catch(e){retryPending=true;syncStatus='Flash exibido localmente. Sincronização pendente: '+e.message+'. Nova tentativa automática.';}
  finally{saving=false;paint();}
 }
 async function loadShared(){
  if(!allowed()||busy||!await token())return;busy=true;const who=identity;
  try{const data=await cloud('history',{business_date:localDate()});if(who!==identity)return;
   if(data.length){const valid=data.map(core.validate);history=valid;const newest=valid[0];if(!packet||Date.parse(newest.collected_at)>Date.parse(packet.collected_at))packet=newest;}
   syncStatus=data.length?'Histórico compartilhado carregado.':'Nenhuma coleta compartilhada para hoje.';paint();document.dispatchEvent(new CustomEvent('ma:flash-update'));
  }catch(e){syncStatus=e.message;paint();}finally{busy=false;}
 }
 function paintHomeFlash(){
  const home=document.getElementById('section-inicio');
  if(!home)return;
  let box=document.getElementById('maFlashLiveStrip');
  if(!box){
    box=document.createElement('section');box.id='maFlashLiveStrip';
    box.className='ma-flash-live-strip';box.setAttribute('aria-label','Flash atualizado automaticamente');
    const kpis=home.querySelector('#kpiGrid');
    if(kpis)kpis.insertAdjacentElement('afterend',box);
    else home.querySelector('.section-head')?.insertAdjacentElement('afterend',box);
  }
  const code=String(state.storeCode||'').padStart(3,'0');
  const row=packet?.business_date===localDate()?(packet.rows||[]).find(r=>r.store===code):null;
  const current=Number.isFinite(Date.parse(packet?.collected_at||''))?Date.parse(packet.collected_at):null;
  const elapsed=current===null?null:Math.max(0,Math.floor((Date.now()-current)/60000));
  if(!state.logged){box.hidden=true;return}
  box.hidden=false;
  const stateLabel=row?(elapsed>15?'Coleta desatualizada':'Atualização automática Flash'):'Aguardando Flash autenticado';
  const amount=row?money(row.total):'—';
  const timeLabel=row?'Coletado '+time(packet.collected_at)+(row.source_time?' • Fonte '+row.source_time:''):'Coleta disponível após conectar a extensão e confirmar o e-mail autorizado';
  const sourceStatus=row?(elapsed>15?' • '+elapsed+' min sem atualização':' • '+elapsed+' min desde coleta'):'';
  box.innerHTML='<div class="ma-flash-live-inner"><div><span class="ma-flash-live-label">FLASH • VENDA OPERACIONAL (REFERÊNCIA)</span>'+
    '<strong>'+escape(amount)+'</strong><small>Loja '+escape(code)+' • '+escape(timeLabel)+escape(sourceStatus)+'</small></div>'+
    '<div class="ma-flash-live-side"><span class="'+(row&&elapsed<=15?'ma-flash-good':'ma-flash-wait')+'">'+escape(stateLabel)+'</span>'+
    '<small>Não substitui a venda oficial do Automação Web</small></div></div>';
 }
 function paint(){
  paintHomeFlash();
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
   const style=document.createElement('style');style.textContent='.ma-flash-live-strip{margin:14px 0;padding:15px 18px;border:1px solid #d7ded9;border-radius:15px;background:#f6f9f6;color:#173f35}.ma-flash-live-inner{display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px}.ma-flash-live-inner>div{display:grid;gap:4px}.ma-flash-live-label{font-size:11px;font-weight:800;letter-spacing:.08em}.ma-flash-live-inner strong{font-size:22px}.ma-flash-live-inner small{font-size:11px;color:#517067}.ma-flash-live-side{text-align:right}.ma-flash-good{font-size:12px;font-weight:800;color:#246b48}.ma-flash-wait{font-size:12px;font-weight:800;color:#ab5333}@media(max-width:680px){.ma-flash-live-side{text-align:left}}.flash-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:18px 0}.flash-kpi{padding:16px;border:1px solid #DAD9D6;border-radius:14px;background:#fff}.flash-kpi span{display:block;font-size:12px;color:#466964}.flash-kpi strong{display:block;font-size:22px;color:#173f35;margin-top:6px}.flash-tools{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0}.flash-tools select{padding:10px;border-radius:8px}.flash-table th,.flash-table td{font-size:12px!important;padding:12px!important;white-space:nowrap}.flash-table thead th{background:#173f35!important;color:white!important}.flash-late{color:#a34424}.flash-auth{margin:14px 0}.flash-auth input{padding:10px;max-width:100%}';document.head.append(style);
   const section=document.createElement('section');section.id='section-flash-pilot';section.className='section';section.innerHTML='<div class="section-head"><div><span class="eyebrow">FLASH • RESULTADO DAS LOJAS</span><h1>Flash • Gestão do dia</h1><p>Vendas das lojas, grupos, produtos e trocas.</p></div><button id="flashPilotClear" class="btn secondary">Limpar coleta local</button></div><section class="card"><div class="section-actions"><button id="flashSharedLoad" class="btn secondary">Consultar histórico compartilhado</button><button id="flashSharedSave" class="btn secondary">Salvar coleta compartilhada</button></div><details class="flash-auth"><summary>Confirmar e-mail para sincronização</summary><p>Use um e-mail vinculado à sua matrícula pelo administrador. A confirmação é exclusiva para as coletas Flash.</p><form id="flashEmailForm"><input name="email" type="email" required placeholder="E-mail autorizado" autocomplete="email"><button class="btn secondary">Enviar acesso por e-mail</button></form><form id="flashOtpForm" hidden><input name="code" inputmode="numeric" autocomplete="one-time-code" required placeholder="Código recebido"><button class="btn secondary">Confirmar código</button></form><p id="flashAuthStatus" role="status"></p></details><div id="flashPilotBody" aria-live="polite"></div></section>';main.append(section);
   document.getElementById('flashPilotClear').onclick=()=>{packet=null;history=[];paint();document.dispatchEvent(new CustomEvent('ma:flash-clear'));};
   document.getElementById('flashSharedLoad').onclick=loadShared;document.getElementById('flashSharedSave').onclick=()=>{sharePacket();};

   let email='';
   const authStatus=document.getElementById('flashAuthStatus');
   const emailForm=document.getElementById('flashEmailForm');
   const otpForm=document.getElementById('flashOtpForm');
   document.addEventListener('ma:flash-auth-result',async event=>{
     const r=event.detail;
     if(!r)return;
     setFlashAuthState(r.message,!r.ok);
     if(r.ok){await loadShared();if(packet?.business_date===localDate())await sharePacket();}
   });
   if(window.maFlashAuth?.isConnected?.()){
     setTimeout(async()=>{const valid=await token();if(valid)setFlashAuthState('A autenticação por e-mail está ativa nesta aba.');},250);
   }
   const cleanResponse=async r=>{try{return await r.json()}catch(_){return{}}};
   const authError=(r,b)=>{
     const code=String(b?.error_code||b?.code||'');
     if(r.status===429||code==='over_email_send_rate_limit')
       return 'Envio temporariamente bloqueado pelo limite de e-mails do Supabase (erro 429). Não insista agora: aguarde a liberação do limite do projeto. Para mais envios, configure SMTP próprio.';
     if(code==='over_request_rate_limit')
       return 'Muitas solicitações consecutivas. Aguarde antes de tentar novamente.';
     if(code==='email_address_not_authorized')
       return 'O servidor de e-mail do Supabase restringiu o destinatário. Verifique a configuração SMTP ou a lista de destinatários permitidos.';
     if(r.status===400||r.status===422)return 'Não foi possível processar o pedido: '+String(b?.msg||b?.error_description||b?.message||b?.error||'verifique a configuração de autenticação.').slice(0,180);
     return 'Serviço de e-mail indisponível (HTTP '+r.status+'). Confira a configuração do Supabase antes de tentar novamente.';
   };
   function setFlashAuthState(message,warning=false){
     authStatus.textContent=message;
     authStatus.style.color=warning?'#a33342':'#246447';
     authStatus.setAttribute('role','status');
     authStatus.setAttribute('aria-live','polite');
   }
   emailForm.onsubmit=async e=>{
     e.preventDefault();
     const button=e.target.querySelector('button');button.disabled=true;
     email=String(new FormData(e.target).get('email')||'').trim().toLowerCase();
     try{
       if(!email||!email.includes('@'))throw Error('Informe um e-mail válido.');
       setFlashAuthState('Solicitando autenticação ao Supabase...');
       const redirect=encodeURIComponent('https://frannlima.github.io/meu-acompanhamento/');
       const r=await fetch('https://vvgejviwvtnlahbyopah.supabase.co/auth/v1/otp?redirect_to='+redirect,{
         method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},
         body:JSON.stringify({email,create_user:false}),cache:'no-store'
       });
       const body=await cleanResponse(r);
       if(!r.ok)throw Error(authError(r,body));
       otpForm.hidden=false;
       setFlashAuthState('Solicitação aceita. Abra o e-mail recebido e clique no link de acesso. Se o e-mail contiver um código numérico, você também pode digitá-lo abaixo. A conclusão pelo link depende do endereço do app estar autorizado nas configurações de redirecionamento do Supabase.');
     }catch(err){setFlashAuthState(String(err?.message||'Não foi possível solicitar autenticação.'),true)}
     finally{button.disabled=false}
   };
   otpForm.onsubmit=async e=>{
     e.preventDefault();
     const button=e.target.querySelector('button');button.disabled=true;
     try{
       const code=String(new FormData(e.target).get('code')||'').replace(/\s/g,'');
       if(!/^\d{6,8}$/.test(code))throw Error('Digite o código numérico de 6 a 8 dígitos recebido por e-mail.');
       const r=await fetch('https://vvgejviwvtnlahbyopah.supabase.co/auth/v1/verify',{
         method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},
         body:JSON.stringify({email,token:code,type:'email'}),cache:'no-store'
       });
       const b=await cleanResponse(r);
       if(!r.ok||!b.access_token)throw Error(r.ok?'Não foi possível validar o código.':authError(r,b));
       if(!window.maFlashAuth?.saveAuth?.(b))throw Error('A sessão retornada pelo Supabase está incompleta.');
       setFlashAuthState('E-mail confirmado. Sincronizando as coletas Flash...');
       await loadShared();
       if(packet&&packet.business_date===localDate())await sharePacket();
       document.dispatchEvent(new CustomEvent('ma:flash-auth-ready'));
       setFlashAuthState('Identidade confirmada. '+(packet&&packet.business_date===localDate()?syncStatus:'Aguarde a próxima coleta automática da extensão.'));
     }catch(err){setFlashAuthState(String(err?.message||'Não foi possível confirmar o código.'),true)}
     finally{button.disabled=false}
   };
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
 function sync(){mount();const next=state.logged?String(state.matricula)+':'+state.role+':'+state.storeCode:'';if(identity!==next){packet=null;hourly=null;history=[];filter='';retryPending=false;identity=next;paint();}document.querySelectorAll('.ma-flash-entry').forEach(e=>{e.hidden=!allowed();e.classList.toggle('hidden',!allowed());});const save=document.getElementById('flashSharedSave');if(save)save.hidden=!admin();if(allowed()&&Date.now()-lastPoll>60000){lastPoll=Date.now();loadShared();if(state.section==='flash-pilot')paint();if(retryPending&&admin()&&!saving&&Date.now()-lastShareAt>60000)sharePacket();}}
 // Leitura somente da filial autorizada e da data atual; nunca mistura Flash com venda pura Web.
 window.getMA2FlashSnapshot=function(){
  if(!allowed()||!packet||packet.business_date!==localDate())return null;
  const code=String(state.storeCode||"").padStart(3,"0");
  const r=(packet.rows||[]).find(item=>item.store===code);
  if(!r)return null;
  return Object.freeze({store:code,business_date:packet.business_date,captured_at:packet.collected_at,
   total:r.total,target:r.target,omni:r.omni,coupons:r.coupons,source_time:r.source_time||null});
 };
 sync();setInterval(sync,1500);
})();
