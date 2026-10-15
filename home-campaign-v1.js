/* Capa Olhares Brasileiros — somente Meu Acompanhamento. */
(function(){
  'use strict';
  const MARKUP="      <div class=\"ol-stage\" role=\"region\" aria-roledescription=\"carrossel\" aria-label=\"Fotos da coleção Olhares Brasileiros\">\n        <div class=\"ol-slide active\" aria-hidden=\"false\"><img src=\"./assets/olhares-brasileiros-1.webp\" alt=\"As quatro artistas da coleção Olhares Brasileiros, em um cenário de vegetação brasileira\"></div>\n        <div class=\"ol-slide\" aria-hidden=\"true\"><img src=\"./assets/olhares-brasileiros-2.webp\" alt=\"Foto de divulgação da coleção com chapéu e peças estampadas em azul e branco\"></div>\n        <div class=\"ol-slide\" aria-hidden=\"true\"><img src=\"./assets/olhares-brasileiros-3.webp\" alt=\"Foto de divulgação da coleção com conjunto estampado em meio à vegetação\"></div>\n        <div class=\"ol-shade\"></div>\n        <div class=\"ol-campaign-top\"><span class=\"ol-campaign-tag\">RIACHUELO</span><span class=\"ol-count\">01 / 03</span></div>\n        <div class=\"ol-campaign-copy\"><span>Moda que inspira o Brasil</span><strong>Olhares<br>Brasileiros</strong><p>Arte, moda e identidade brasileira.</p></div>\n      </div>\n      <div class=\"ol-controls\">\n        <div class=\"ol-dots\" aria-label=\"Selecionar foto\">\n          <button class=\"ol-dot cursor-interaction\" type=\"button\" data-slide=\"0\" aria-label=\"Mostrar foto das artistas\" aria-pressed=\"true\"><span></span></button>\n          <button class=\"ol-dot cursor-interaction\" type=\"button\" data-slide=\"1\" aria-label=\"Mostrar foto da coleção azul\" aria-pressed=\"false\"><span></span></button>\n          <button class=\"ol-dot cursor-interaction\" type=\"button\" data-slide=\"2\" aria-label=\"Mostrar foto da coleção estampada\" aria-pressed=\"false\"><span></span></button>\n        </div>\n        <div class=\"ol-play-controls\">\n          <button class=\"cursor-interaction\" type=\"button\" data-prev aria-label=\"Foto anterior\"><span aria-hidden=\"true\">‹</span></button>\n          <button class=\"ol-toggle cursor-interaction\" type=\"button\" data-toggle aria-label=\"Pausar transição automática\"><span data-play-icon aria-hidden=\"true\">Ⅱ</span><span data-play-label>Pausar</span></button>\n          <button class=\"cursor-interaction\" type=\"button\" data-next aria-label=\"Próxima foto\"><span aria-hidden=\"true\">›</span></button>\n        </div>\n      </div>\n      <section class=\"ol-notice\" aria-label=\"Espaço de comunicados\">\n        <div class=\"ol-notice-tag\"><span aria-hidden=\"true\">●</span><span>FIQUE POR DENTRO</span><span id=\"homeCampaignNoticeCount\" class=\"ol-notice-count\"></span></div>\n        <h2 id=\"homeCampaignNoticeTitle\">Informações importantes</h2>\n        <p id=\"homeCampaignNoticeText\">Nenhum comunicado ativo no momento.</p>\n        <button id=\"homeCampaignRead\" type=\"button\" class=\"ol-read\">Ver comunicados <span aria-hidden=\"true\">→</span></button>\n      </section>\n";
  let root=null,current=0,timer=null,manualPause=false,visibleInPage=true,announcement=null,noticeOwner='';
  const failed=new Set();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const active=()=>state.logged&&state.section==='inicio'&&!document.hidden&&visibleInPage&&!manualPause&&!reduced.matches;
  function photos(){return root?[...root.querySelectorAll('.ol-slide')]:[];}
  function restart(){
    clearInterval(timer);timer=null;
    if(active()&&failed.size<photos().length-1)timer=setInterval(()=>show(current+1),5500);
  }
  function show(index,manual=false){
    const list=photos();if(!list.length)return;
    let next=(index+list.length)%list.length;
    for(let i=0;i<list.length&&failed.has(next);i++)next=(next+1)%list.length;
    if(failed.size===list.length){root.classList.add('ol-images-unavailable');return;}
    current=next;
    list.forEach((el,i)=>{el.classList.toggle('active',i===current);el.setAttribute('aria-hidden',String(i!==current));});
    root.querySelectorAll('[data-slide]').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===current)));
    root.querySelector('.ol-count').textContent=String(current+1).padStart(2,'0')+' / 03';
    if(manual)restart();
  }
  function syncToggle(){
    if(!root)return;
    const playing=!manualPause&&!reduced.matches;
    const b=root.querySelector('[data-toggle]');
    b.querySelector('[data-play-label]').textContent=reduced.matches?'Próxima':playing?'Pausar':'Reproduzir';
    b.querySelector('[data-play-icon]').textContent=playing?'Ⅱ':'▷';
    b.setAttribute('aria-label',reduced.matches?'Mostrar próxima foto sem animação':playing?'Pausar transição automática':'Reproduzir transição automática');
  }
  function renderNotice(){
    if(!root)return;
    const rows=Array.isArray(state.executionAnnouncements)&&noticeOwner===String(state.matricula)?state.executionAnnouncements:[];
    announcement=rows.find(item=>!item.seen)||rows[0]||null;
    const title=root.querySelector('#homeCampaignNoticeTitle'),text=root.querySelector('#homeCampaignNoticeText'),count=root.querySelector('#homeCampaignNoticeCount'),button=root.querySelector('#homeCampaignRead');
    title.textContent=announcement?.title||'Informações importantes';
    const body=String(announcement?.body||'').trim();
    text.textContent=announcement?(body.length>160?body.slice(0,157)+'…':body||'Toque para abrir o conteúdo completo e seus anexos.'):'Nenhum comunicado ativo no momento.';
    count.textContent=rows.length?(rows.filter(item=>!item.seen).length+' não lidos'):'';
    button.innerHTML=announcement?'Ler comunicado <span aria-hidden="true">→</span>':'Ver comunicados <span aria-hidden="true">→</span>';
  }
  function mount(){
    const head=document.querySelector('#section-inicio > .section-head');if(!head)return;
    if(!root){
      root=document.createElement('div');root.id='homeCampaignSlot';root.innerHTML=MARKUP;head.appendChild(root);
      root.querySelectorAll('.ol-slide img').forEach((img,i)=>{
        img.addEventListener('error',()=>{failed.add(i);const dot=root.querySelector('[data-slide="'+i+'"]');if(dot)dot.disabled=true;show(current===i?current+1:current);restart();});
        if(img.complete&&img.naturalWidth===0)failed.add(i);
      });
      root.addEventListener('click',e=>{
        const el=e.target.closest('button');if(!el)return;
        if(el.hasAttribute('data-slide'))show(Number(el.dataset.slide),true);
        else if(el.hasAttribute('data-prev'))show(current-1,true);
        else if(el.hasAttribute('data-next'))show(current+1,true);
        else if(el.hasAttribute('data-toggle')){
          if(reduced.matches){show(current+1,true);return;}
          manualPause=!manualPause;syncToggle();restart();
        }else if(el.id==='homeCampaignRead'){
          if(announcement&&typeof window.openHomeAnnouncement==='function')window.openHomeAnnouncement(announcement);
          else window.openHomeAnnouncementsCenter?.();
        }
      });
      const stage=root.querySelector('.ol-stage');let touchStart=null;
      stage.addEventListener('touchstart',e=>{touchStart=e.touches[0].clientX;},{passive:true});
      stage.addEventListener('touchend',e=>{if(touchStart===null)return;const delta=e.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>45)show(current+(delta<0?1:-1),true);touchStart=null;},{passive:true});
      if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visibleInPage=!!entries[0]?.isIntersecting;restart();},{threshold:.1}).observe(root);}
      root.addEventListener('focusin',()=>{clearInterval(timer);timer=null;});
      root.addEventListener('focusout',()=>setTimeout(()=>{if(!root.contains(document.activeElement))restart();},0));
      head.classList.add('home-campaign-enabled');
      const title=head.querySelector(':scope > div:not(.adaptive-home-identity):not(.section-actions):not(.adaptive-store-context):not(.home-admin-store):not(#homeCampaignSlot)');
      if(title)title.classList.add('home-campaign-heading');
      syncToggle();show(0);
    }
    renderNotice();restart();
  }
  const previousSetSection=window.setSection;
  window.setSection=function(...args){const result=previousSetSection.apply(this,args);mount();return result;};
  document.addEventListener('ma:announcements-ready',e=>{
    if(String(e.detail?.matricula)!==String(state.matricula))return;
    noticeOwner=String(state.matricula);mount();
  });
  document.addEventListener('ma:dashboard-ready',mount);
  document.addEventListener('visibilitychange',restart);
  window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;});
  window.addEventListener('pageshow',restart);
  reduced.addEventListener('change',()=>{syncToggle();restart();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
