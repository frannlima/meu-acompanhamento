/* Piloto em memória da sessão. Não grava nem substitui resultados oficiais. */
(function(){
  'use strict';
  let packet=null,hourly=null,identity='';
  const core=window.MAFlashCore;
  const money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const percent=v=>v===null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
  const time=iso=>new Date(iso).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'});
  function allowed(){return state.logged&&state.role==='administrador';}
  function paint(){
    const host=document.getElementById('flashPilotBody');if(!host)return;
    host.replaceChildren();if(!allowed())return;
    if(!packet){host.textContent='Aguardando coleta assistida do Flash neste computador. Abra Total Lojas e use a extensão do piloto.';return;}
    const today=localDate(),isToday=packet.business_date===today;
    const summary=document.createElement('p');summary.textContent='Fonte: Flash • Dia '+packet.business_date+' • Coletado às '+time(packet.collected_at)+' • '+packet.rows.length+'/18 lojas. '+(isToday?'':'Coleta de outro dia. ')+ 'Trocas ainda não conciliadas. Físico de referência = total Flash − OMNI; não equivale à venda contábil líquida.';host.append(summary);
    const table=document.createElement('div');table.className='table-wrap';
    table.innerHTML='<table><thead><tr><th>Loja</th><th>Total Flash</th><th>OMNI</th><th>Físico de referência</th><th>Orçamento Flash</th><th>Cupons</th><th>Hora Flash</th><th>eStore</th><th>eStore / Total Flash*</th></tr></thead><tbody>'+packet.rows.map(r=>{
      const e=isToday&&hourly?.context?.date===packet.business_date?hourly.stores.find(e=>String(e.st).padStart(3,'0')===r.store):null;
      const cap=e?.updated_at&&Number.isFinite(Number(e.captured))?Number(e.captured):null;
      return '<tr><th>'+r.store+'</th><td>'+money(r.total)+'</td><td>'+money(r.omni)+'</td><td>'+money(r.physical_reference)+'</td><td>'+money(r.target)+'</td><td>'+r.coupons+'</td><td>'+escape(r.source_time??'—')+'</td><td>'+(cap===null?'—':money(cap))+'</td><td>'+percent(cap===null?null:core.share(cap,r.total))+'</td></tr>';
    }).join('')+'</tbody></table>';host.append(table);
    const note=document.createElement('p');note.textContent='* Relação indicativa entre fontes, não share oficial: vales-troca e horários precisam ser conciliados. O total online do Flash é OMNI, não eStore. As lojas ausentes não são consideradas zeradas. Dados ficam somente nesta sessão e não aparecem em outros celulares.';host.append(note);
  }
  function mount(){
    const main=document.querySelector('#appShell main');if(!main)return;
    if(!document.getElementById('section-flash-pilot')){
    const section=document.createElement('section');section.id='section-flash-pilot';section.className='section';
    section.innerHTML='<div class="section-head"><div><span class="eyebrow">PILOTO • ADMINISTRAÇÃO</span><h1>Flash: conferência por canal</h1><p>Consolidação assistida para validar a integração.</p></div><button id="flashPilotClear" class="btn secondary">Limpar coleta local</button></div><section class="card"><div id="flashPilotBody" aria-live="polite"></div></section>';
    main.append(section);
    document.getElementById('flashPilotClear').onclick=()=>{packet=null;paint();};
    }
    for(const parent of ['#nav','.mobile-more-grid','#section-mais']){
      const container=document.querySelector(parent);if(!container||container.querySelector('.ma-flash-entry'))continue;
      const button=document.createElement('button');button.type='button';button.className='btn secondary ma-flash-entry';button.textContent='Flash piloto';button.onclick=()=>{if(allowed()){paint();setSection('flash-pilot');}};container.append(button);
    }
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.type!=='MA_FLASH_PILOT_V1'||!allowed())return;
    try{
      const next=core.validate(event.data.payload);
      if(Date.parse(next.collected_at)>Date.now()+60000||Date.now()-Date.parse(next.collected_at)>900000)throw Error('Coleta expirada; colete novamente no Flash.');
      packet=next;paint();toast('Flash recebido no piloto. Base oficial preservada.');
    }catch(e){toast(e.message,true);}
  });
  document.addEventListener('ma:estore-hourly-loaded',event=>{
    if(allowed()&&event.detail?.context?.date===localDate()&&String(event.detail?.context?.store).padStart(3,'0')===String(state.storeCode).padStart(3,'0')&&Array.isArray(event.detail?.stores)){hourly=event.detail;paint();}
  });
  function sync(){
    mount();const next=state.logged?String(state.matricula):'';
    if(identity!==next){packet=null;hourly=null;identity=next;paint();}
    document.querySelectorAll('.ma-flash-entry').forEach(el=>{el.hidden=!allowed();el.classList.toggle('hidden',!allowed());});
    if(!allowed()&&document.getElementById('section-flash-pilot')?.classList.contains('active')&&state.logged)setSection('inicio');
  }
  sync();setInterval(sync,1500);
})();
