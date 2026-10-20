/* Capa Olhares Brasileiros — somente Meu Acompanhamento. */
(function(){
  'use strict';
  const MARKUP="      <div class=\"ol-stage\" role=\"region\" aria-roledescription=\"carrossel\" aria-label=\"Fotos da coleção Olhares Brasileiros\">\n        <div class=\"ol-slide active\" aria-hidden=\"false\"><img src=\"./assets/olhares-brasileiros-1.webp\" alt=\"As quatro artistas da coleção Olhares Brasileiros, em um cenário de vegetação brasileira\"></div>\n        <div class=\"ol-slide\" aria-hidden=\"true\"><img src=\"./assets/olhares-brasileiros-2.webp\" alt=\"Foto de divulgação da coleção com chapéu e peças estampadas em azul e branco\"></div>\n        <div class=\"ol-slide\" aria-hidden=\"true\"><img src=\"./assets/olhares-brasileiros-3.webp\" alt=\"Foto de divulgação da coleção com conjunto estampado em meio à vegetação\"></div>\n        <div class=\"ol-shade\"></div>\n        <div class=\"ol-campaign-top\"><span class=\"ol-count\">01 / 03</span></div>\n        <div class=\"ol-campaign-copy\"><span>Moda que inspira o Brasil</span><strong>Olhares<br>Brasileiros</strong><p>Arte, moda e identidade brasileira.</p></div>\n      </div>\n      <div class=\"ol-controls\">\n        <div class=\"ol-dots\" aria-label=\"Selecionar foto\">\n          <button class=\"ol-dot cursor-interaction\" type=\"button\" data-slide=\"0\" aria-label=\"Mostrar foto das artistas\" aria-pressed=\"true\"><span></span></button>\n          <button class=\"ol-dot cursor-interaction\" type=\"button\" data-slide=\"1\" aria-label=\"Mostrar foto da coleção azul\" aria-pressed=\"false\"><span></span></button>\n          <button class=\"ol-dot cursor-interaction\" type=\"button\" data-slide=\"2\" aria-label=\"Mostrar foto da coleção estampada\" aria-pressed=\"false\"><span></span></button>\n        </div>\n        <div class=\"ol-play-controls\">\n          <button class=\"cursor-interaction\" type=\"button\" data-prev aria-label=\"Foto anterior\"><span aria-hidden=\"true\">‹</span></button>\n          <button class=\"ol-toggle cursor-interaction\" type=\"button\" data-toggle aria-label=\"Pausar transição automática\"><span data-play-icon aria-hidden=\"true\">Ⅱ</span><span data-play-label>Pausar</span></button>\n          <button class=\"cursor-interaction\" type=\"button\" data-next aria-label=\"Próxima foto\"><span aria-hidden=\"true\">›</span></button>\n        </div>\n      </div>\n      <section class=\"ol-notice\" aria-label=\"Espaço de comunicados\">\n        <div class=\"ol-notice-tag\"><span aria-hidden=\"true\">●</span><span>FIQUE POR DENTRO</span><span id=\"homeCampaignNoticeCount\" class=\"ol-notice-count\"></span></div>\n        <h2 id=\"homeCampaignNoticeTitle\">Informações importantes</h2>\n        <p id=\"homeCampaignNoticeText\">Nenhum comunicado ativo no momento.</p>\n        <button id=\"homeCampaignRead\" type=\"button\" class=\"ol-read\">Ver comunicados <span aria-hidden=\"true\">→</span></button>\n      </section>\n";
  const VIDEO_SLIDE="<div class=\"ol-slide ol-slide-video\" aria-hidden=\"false\"><video class=\"ol-campaign-video\" muted autoplay playsinline webkit-playsinline preload=\"auto\" poster=\"./assets/olhares-brasileiros-1.webp\" aria-label=\"Vídeo da campanha Olhares Brasileiros\"><source src=\"./assets/olhares-brasileiros-transicao.mp4\" type=\"video/mp4\"></video></div>";
  const VIDEO_DOT='<button class="ol-dot cursor-interaction" type="button" data-slide="0" aria-label="Mostrar vídeo da campanha" aria-pressed="true"><span></span></button>';
  const MUSIC_BUTTON='<button class="ol-sound cursor-interaction" type="button" data-sound aria-pressed="false" aria-label="Ativar trilha instrumental"><span class="ol-sound-icon" aria-hidden="true">♫</span><span data-sound-label>Ativar som</span></button>';
  const CAMPAIGN_MARKUP=MARKUP
    .replace('class="ol-slide active" aria-hidden="false"','class="ol-slide" aria-hidden="true"')
    .replace(/data-slide="(\d+)"/g,(_,n)=>'data-slide="'+(Number(n)+1)+'"')
    .replace('aria-pressed="true"','aria-pressed="false"')
    .replace('<div class="ol-shade"></div>',VIDEO_SLIDE+'<div class="ol-shade"></div>')
    .replace('<div class="ol-dots" aria-label="Selecionar foto">','<div class="ol-dots" aria-label="Selecionar vídeo ou foto">'+VIDEO_DOT)
    .replace('01 / 03','01 / 04')
    .replace('Fotos da coleção Olhares Brasileiros','Vídeo e fotos da coleção Olhares Brasileiros')
    .replace('<button class="ol-toggle',MUSIC_BUTTON+'<button class="ol-toggle');
  let root=null,current=0,timer=null,playProbe=null,playAttempt=0,manualPause=false,announcement=null,noticeOwner='';
  const failed=new Set();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const active=()=>state.logged&&state.section==='inicio'&&!document.hidden&&!manualPause&&!reduced.matches;
  // Ordem visual: vídeo primeiro; as três fotos conservam sua posição original no DOM e no CSS.
  function photos(){
    if(!root)return [];
    const slides=[...root.querySelectorAll('.ol-slide')];
    const videoSlide=root.querySelector('.ol-slide-video');
    return videoSlide?[videoSlide,...slides.filter(el=>el!==videoSlide)]:slides;
  }
  function video(){return root?.querySelector('.ol-campaign-video');}

  // Moldura editorial: uma fotografia CONGELADA do próprio vídeo preenche as laterais.
  // É extraída uma única vez por estágio, sem criar um segundo player nem repetir
  // captura durante o carrossel. A imagem original serve de fallback se indisponível.
  let frozenFrameStage=0;
  function captureFrozenVideoFrame(player,preferScene=false){
    const slide=root?.querySelector('.ol-slide-video');
    if(!slide||!player||player.readyState<2||!player.videoWidth||!player.videoHeight)return;
    if(preferScene){
      if(frozenFrameStage>=2||player.currentTime<.65)return;
    }else if(frozenFrameStage>=1)return;
    try{
      // Miniatura 16:9: recorte central do vídeo (também em formato retrato).
      // A miniatura não aparece como segundo vídeo, apenas como plano de fundo.
      const w=480,h=270,vw=player.videoWidth,vh=player.videoHeight;
      const scale=Math.max(w/vw,h/vh);
      const dw=vw*scale,dh=vh*scale;
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx)return;
      ctx.drawImage(player,(w-dw)/2,(h-dh)/2,dw,dh);
      const frozen=canvas.toDataURL('image/jpeg',.72);
      if(!frozen||frozen.length<100)return;
      // CSS utiliza a mesma imagem paralisada nas duas laterais.
      slide.style.setProperty('--ol-frozen-frame','url("'+frozen+'")');
      slide.classList.add('ol-video-frame-ready');
      frozenFrameStage=preferScene?2:1;
    }catch(_){
      // Alguns aparelhos restringem leitura de frames; o poster permanece funcional.
    }
  }
  function visibleSlides(){return photos().map((_,i)=>i).filter(i=>!failed.has(i));}
  function offerVideoPlay(){
    if(!root||current!==0||failed.has(0))return;
    root.classList.add('ol-video-needs-play');
    syncToggle();
  }
  function restart(){
    clearTimeout(timer);timer=null;
    clearTimeout(playProbe);playProbe=null;
    const attemptId=++playAttempt;
    window.RiaCampaignMusic?.sync(Boolean(state.logged&&state.section==='inicio'&&!document.hidden));
    const player=video();
    const canPlay=active()&&!failed.has(0);
    if(player){
      if(current!==0||!canPlay){
        player.pause();
        if(current!==0)root?.classList.remove('ol-video-needs-play');
      }else{
        player.muted=true;
        player.defaultMuted=true;
        const initialTime=player.currentTime;
        try{
          const started=player.play();
          if(started?.then)started.then(()=>{
            if(attemptId!==playAttempt||current!==0||!active())return;
            if(!player.paused){root?.classList.remove('ol-video-needs-play');syncToggle();}
          }).catch(()=>{if(attemptId===playAttempt)offerVideoPlay();});
        }catch(_){offerVideoPlay();}
        // Se o vídeo não avançar, exibir uma ação manual em vez de uma imagem estática.
        playProbe=setTimeout(()=>{
          if(attemptId!==playAttempt||current!==0||!active())return;
          if(player.paused||player.currentTime<=initialTime+.08)offerVideoPlay();
        },2600);
      }
    }
    if(!active()||!visibleSlides().length)return;
    if(current===0&&!failed.has(0)){
      timer=setTimeout(()=>show(1),22000);
    }else{
      timer=setTimeout(()=>show(current+1),5500);
    }
  }
  function show(index){
    const list=photos();if(!list.length)return;
    let next=(index+list.length)%list.length;
    for(let i=0;i<list.length&&failed.has(next);i++)next=(next+1)%list.length;
    if(failed.size===list.length){root.classList.add('ol-images-unavailable');return;}
    const previous=current;
    if(previous===0&&next!==0)video()?.pause();
    current=next;
    if(current===0&&previous!==0){try{video().currentTime=0;}catch(_){}}
    list.forEach((el,i)=>{el.classList.toggle('active',i===current);el.setAttribute('aria-hidden',String(i!==current));});
    root.classList.toggle('ol-video-active',current===0&&!failed.has(0));
    if(current!==0)root.classList.remove("ol-video-needs-play");
    root.querySelectorAll('[data-slide]').forEach(el=>{
      const i=Number(el.dataset.slide);
      el.setAttribute('aria-pressed',String(i===current));
      el.hidden=failed.has(i);
    });
    const order=visibleSlides();
    root.querySelector('.ol-count').textContent=String(order.indexOf(current)+1).padStart(2,'0')+' / '+String(order.length).padStart(2,'0');
    restart();
  }
  function syncToggle(){
    if(!root)return;
    const playing=!manualPause&&!reduced.matches&&!(current===0&&(video()?.paused||root.classList.contains('ol-video-needs-play')));
    const b=root.querySelector('[data-toggle]');
    b.querySelector('[data-play-label]').textContent=reduced.matches?'Próxima':playing?'Pausar':'Reproduzir';
    b.querySelector('[data-play-icon]').textContent=playing?'Ⅱ':'▷';
    b.setAttribute('aria-label',reduced.matches?'Mostrar próxima foto sem animação':playing?'Pausar transição automática':'Reproduzir transição automática');
  }
  function syncSoundButton(){
    const btn=root?.querySelector('[data-sound]');
    if(!btn)return;
    const music=window.RiaCampaignMusic;
    const isOn=Boolean(music?.enabled);
    const supported=Boolean(music?.supported);
    btn.disabled=!supported;
    btn.setAttribute('aria-pressed',String(isOn));
    btn.setAttribute('aria-label',isOn?'Silenciar trilha instrumental':'Ativar trilha instrumental');
    btn.querySelector('[data-sound-label]').textContent=isOn?'Som ligado':'Ativar som';
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
      root=document.createElement('div');root.id='homeCampaignSlot';root.innerHTML=CAMPAIGN_MARKUP;head.appendChild(root);
      photos().forEach((slide,i)=>{
        const img=slide.querySelector('img');
        if(!img)return;
        img.addEventListener('error',()=>{
          failed.add(i);
          show(current===i?current+1:current);
        });
        if(img.complete&&img.naturalWidth===0)failed.add(i);
      });
      const player=video();
      if(player){
        player.addEventListener("playing",()=>{root.classList.remove("ol-video-needs-play");syncToggle();});
        player.addEventListener("pause",()=>{
          if(current===0&&state.section==='inicio'&&!document.hidden&&!player.ended)offerVideoPlay();
        });
        player.addEventListener("stalled",offerVideoPlay);
        player.addEventListener("waiting",()=>{root.classList.add("ol-video-needs-play");syncToggle();});
        player.addEventListener('loadeddata',()=>captureFrozenVideoFrame(player));
        player.addEventListener('timeupdate',()=>captureFrozenVideoFrame(player,true));
        player.addEventListener('seeked',()=>captureFrozenVideoFrame(player,player.currentTime>=.65));
        if(player.readyState>=2)captureFrozenVideoFrame(player);
        player.addEventListener('ended',()=>{if(current===0&&!manualPause)show(1);});
        player.addEventListener('error',()=>{
          failed.add(0);
          show(current===0?1:current);
        });
      }
      const replay=document.createElement('button');replay.type='button';replay.className='ol-video-replay';replay.textContent='▶ Reproduzir vídeo';replay.setAttribute('aria-label','Reproduzir vídeo da campanha');root.querySelector('.ol-slide-video')?.appendChild(replay);
      replay.addEventListener('click',()=>{manualPause=false;restart();syncToggle();});
      root.querySelector('.ol-campaign-video')?.addEventListener('click',()=>{if(current!==0)return;manualPause=false;restart();});
      root.addEventListener('click',e=>{
        const el=e.target.closest('button');if(!el)return;
        if(el.hasAttribute('data-slide')){manualPause=false;syncToggle();show(Number(el.dataset.slide),true);}
        else if(el.hasAttribute('data-sound')){
          const music=window.RiaCampaignMusic;
          if(music)music.toggle().then(()=>{syncSoundButton();restart();}).catch(e=>{
            syncSoundButton();console.warn('[Campanha] Áudio indisponível:',e);
            if(typeof window.toast==='function')window.toast('Não foi possível ativar o som neste dispositivo.',true);
          });
        }
        else if(el.hasAttribute('data-prev')){manualPause=false;syncToggle();show(current-1,true);}
        else if(el.hasAttribute('data-next')){manualPause=false;syncToggle();show(current+1,true);}
        else if(el.hasAttribute('data-toggle')){
          if(reduced.matches){show(current+1,true);return;}
          manualPause=current===0&&video()?.paused?false:!manualPause;
          if(!manualPause&&current===0)root.classList.remove('ol-video-needs-play');
          syncToggle();restart();
        }else if(el.id==='homeCampaignRead'){
          if(announcement&&typeof window.openHomeAnnouncement==='function')window.openHomeAnnouncement(announcement);
          else window.openHomeAnnouncementsCenter?.();
        }
      });
      const stage=root.querySelector('.ol-stage');let touchStart=null;
      stage.addEventListener('touchstart',e=>{touchStart=e.touches[0].clientX;},{passive:true});
      stage.addEventListener('touchend',e=>{if(touchStart===null)return;const delta=e.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>45)show(current+(delta<0?1:-1),true);touchStart=null;},{passive:true});
      // A página ativa controla o vídeo: observar o carrossel inteiro causava pausas indevidas no desktop.
      root.addEventListener('focusin',e=>{if(e.target.closest('[data-sound]'))return;clearInterval(timer);timer=null;});
      root.addEventListener('focusout',()=>setTimeout(()=>{if(!root.contains(document.activeElement))restart();},0));
      head.classList.add('home-campaign-enabled');
      const title=head.querySelector(':scope > div:not(.adaptive-home-identity):not(.section-actions):not(.adaptive-store-context):not(.home-admin-store):not(#homeCampaignSlot)');
      if(title)title.classList.add('home-campaign-heading');
      syncToggle();syncSoundButton();show(0);
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
  window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;window.RiaCampaignMusic?.sync(false);});
  window.addEventListener('pageshow',restart);
  reduced.addEventListener('change',()=>{syncToggle();restart();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
