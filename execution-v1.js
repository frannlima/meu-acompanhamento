
(function(){
  "use strict";

  const SECTIONS=["inicio","grupos","comerciais","estore","descontos","regional","mais"];
  const ROLES=["colaborador","comercial","supervisor","gerente","administrador"];
  const ROLE_NAMES={colaborador:"Colaborador",comercial:"Comercial",supervisor:"Supervisor",gerente:"Gerente",administrador:"Administrador"};
  const SECTION_NAMES={inicio:"Início",grupos:"Mundos",comerciais:"Comerciais",estore:"eStore",descontos:"Descontos",regional:"Regional",mais:"Mais"};

  function fileToDataURL(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader();
      fr.onload=()=>resolve(String(fr.result||""));
      fr.onerror=()=>reject(new Error("Não foi possível ler o arquivo."));
      fr.readAsDataURL(file);
    });
  }

  function fileToBase64(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader();
      fr.onload=()=>resolve(String(fr.result||"").split(",").pop()||"");
      fr.onerror=()=>reject(new Error("Não foi possível ler o arquivo."));
      fr.readAsDataURL(file);
    });
  }

  function effectiveTarget(row){
    return Number(row?.target_financial||row?.meta_financial||row?.target||0);
  }

  function hydrateDerivedLy(){
    const detail=Array.isArray(state.detail?.rows)?state.detail.rows:[];
    if(!detail.length) return;
    const storeLy=Number(state.day?.ly_financial||0);
    const direct=detail.reduce((s,r)=>s+Number(r.ly_financial||0),0);
    const missing=detail.filter(r=>!Number(r.ly_financial||0));
    const residual=Math.max(0,storeLy-direct);
    const targetMissing=missing.reduce((s,r)=>s+effectiveTarget(r),0);

    if(residual>0 && targetMissing>0){
      missing.forEach(r=>{
        r.ly_financial=residual*(effectiveTarget(r)/targetMissing);
        r.__derived_ly=true;
      });
    }

    if(Array.isArray(state.groupSummary?.groups)){
      const byGroup=new Map();
      detail.forEach(r=>{
        const code=r.group_code||"outros";
        const a=byGroup.get(code)||{ly:0,target:0,sale:0,physical:0,targetPhysical:0};
        a.ly+=Number(r.ly_financial||0);
        a.target+=effectiveTarget(r);
        a.sale+=Number(r.sales_financial||0);
        a.physical+=Number(r.sales_physical||0);
        a.targetPhysical+=Number(r.target_physical||0);
        byGroup.set(code,a);
      });
      state.groupSummary.groups.forEach(g=>{
        const a=byGroup.get(g.group_code);
        if(!a) return;
        g.target_financial=a.target;
        g.sales_financial=a.sale;
        g.ly_financial=a.ly;
        g.evolution_vs_ly=a.ly?((a.sale/a.ly)-1)*100:null;
        g.deviation=a.sale-a.target;
        g.target_physical=a.targetPhysical;
        g.sales_physical=a.physical;
      });
    }
  }

  function hydrateCommercials(){
    hydrateDerivedLy();
    const detail=Array.isArray(state.detail?.rows)?state.detail.rows:[];
    const map=new Map(detail.map(r=>[Number(r.dco_code),r]));
    const rows=Array.isArray(state.commercial?.commercials)?state.commercial.commercials:[];
    rows.forEach(r=>{
      const dcos=Array.isArray(r.dcos)?r.dcos:[];
      let target=0,ly=0,sale=Number(r.sales_financial||0),physical=Number(r.sales_physical||0);
      dcos.forEach(d=>{
        const base=map.get(Number(d.dco_code??d.code));
        if(base){
          d.target_financial=effectiveTarget(base);
          d.ly_financial=Number(base.ly_financial||0);
          d.sales_financial=Number(base.sales_financial||d.sales_financial||0);
          d.deviation=Number(d.sales_financial||0)-Number(d.target_financial||0);
          d.evolution_vs_ly=Number(d.ly_financial||0)?((Number(d.sales_financial||0)/Number(d.ly_financial))-1)*100:null;
          target+=Number(d.target_financial||0);
          ly+=Number(d.ly_financial||0);
        }else{
          target+=effectiveTarget(d);
          ly+=Number(d.ly_financial||0);
        }
      });
      if(target>0) r.target_financial=target;
      r.ly_financial=ly;
      r.attainment=target?sale/target*100:0;
      r.deviation=sale-target;
      r.evolution_vs_ly=ly?((sale/ly)-1)*100:null;
      r.sales_physical=physical;
    });
  }

  function normalizeDcoNameText(){
    document.querySelectorAll(".premium-dco-card .premium-dco-head strong, .commercial-dco-chips span, .dco-check b").forEach(el=>{
      el.childNodes.forEach(n=>{
        if(n.nodeType===Node.TEXT_NODE && /Calçados Femininos/i.test(n.nodeValue||"")) n.nodeValue=(n.nodeValue||"").replace(/Calçados Femininos/gi,"Calçados Feminino");
      });
      if(el.textContent==="Calçados Femininos") el.textContent="Calçados Feminino";
    });
  }

  function replaceLyLabels(root=document){
    const exact={
      "LY":"Venda A.A.",
      "Venda LY":"Venda A.A.",
      "Vs LY":"Evolução vs A.A.",
      "Evol. vs LY":"Evolução vs Ano Anterior",
      "Evolução vs LY":"Evolução vs Ano Anterior",
      "EVOL. VS LY":"EVOLUÇÃO VS ANO ANTERIOR",
      "VS LY":"EVOLUÇÃO VS A.A."
    };
    root.querySelectorAll("span,th,small,b,label,h3").forEach(el=>{
      const t=(el.textContent||"").trim();
      if(exact[t]) el.textContent=exact[t];
    });
  }

  function greetingForNow(){
    const h=Number(new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",hour12:false}).format(new Date()));
    return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
  }

  function ensureIdentityHero(){
    const main=document.querySelector(".main");
    if(!main) return null;
    let hero=$("executionIdentityHero");
    if(!hero){
      hero=document.createElement("section");
      hero.id="executionIdentityHero";
      hero.className="execution-identity-hero";
      const anchor=document.querySelector(".mobile-header");
      if(anchor) anchor.insertAdjacentElement("afterend",hero);
      else main.prepend(hero);
    }
    return hero;
  }

  function renderIdentityHero(){
    const hero=ensureIdentityHero();
    if(!hero || !state.logged) return;
    const u=state.user||{};
    const full=u.full_name||state.employeeName||"Time Riachuelo";
    const role=u.job_title||roleLabel(state.role);
    const storeName=u.store_name||"";
    hero.innerHTML=
      '<div class="identity-brand"><img src="./assets/riachuelo-logo.svg" alt="Riachuelo"></div>'+
      '<div class="identity-copy">'+
        '<span class="identity-greeting">'+greetingForNow()+',</span>'+
        '<h2>'+esc(full)+'!</h2>'+
        '<p>'+esc(role)+' <i>•</i> Loja '+esc(state.storeCode)+(storeName?' - '+esc(storeName):'')+'</p>'+
        '<small>Moda que inspira o Brasil</small>'+
      '</div>'+
      '<button id="executionAnnouncementBanner" class="execution-announcement-banner hidden" type="button"></button>';
  }

  function ensureModal(){
    let overlay=$("executionModal");
    if(overlay) return overlay;
    overlay=document.createElement("div");
    overlay.id="executionModal";
    overlay.className="execution-modal-overlay hidden";
    overlay.innerHTML=
      '<section class="execution-modal">'+
        '<button id="executionModalClose" type="button" class="execution-modal-close">×</button>'+
        '<div id="executionModalBody"></div>'+
      '</section>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click",e=>{if(e.target===overlay) closeModal()});
    $("executionModalClose").onclick=closeModal;
    return overlay;
  }
  function openModal(html){
    ensureModal();
    $("executionModalBody").innerHTML=html;
    $("executionModal").classList.remove("hidden");
  }
  function closeModal(){
    $("executionModal")?.classList.add("hidden");
    if(chatPollTimer){clearInterval(chatPollTimer);chatPollTimer=null;}
  }
  window.closeExecutionModal=closeModal;

  async function refreshAnnouncements(){
    if(!state.logged) return;
    try{
      const rows=await api("listAnnouncements",{matricula:state.matricula});
      state.executionAnnouncements=Array.isArray(rows)?rows:[];
      renderAnnouncementBanner();
    }catch(_){}
  }

  function renderAnnouncementBanner(){
    renderIdentityHero();
    const btn=$("executionAnnouncementBanner");
    if(!btn) return;
    const rows=Array.isArray(state.executionAnnouncements)?state.executionAnnouncements:[];
    const current=rows.find(x=>!x.seen)||rows[0];
    if(!current){btn.classList.add("hidden");return}
    btn.classList.remove("hidden");
    btn.classList.toggle("has-unread",!current.seen);
    btn.innerHTML=
      '<span class="announcement-icon">!</span>'+
      '<span><b>'+esc(current.title)+'</b><small>'+(current.seen?"Informação disponível":"Nova informação • toque para abrir")+'</small></span>'+
      '<i>›</i>';
    btn.onclick=()=>openAnnouncement(current);
  }

  async function openAnnouncement(item){
    const attachment=item.file_data
      ? (String(item.file_mime||"").startsWith("image/")
          ? '<img class="announcement-media" src="'+item.file_data+'" alt="">'
          : String(item.file_mime||"").startsWith("video/")
            ? '<video class="announcement-media" src="'+item.file_data+'" controls playsinline></video>'
            : '<a class="btn primary announcement-download" href="'+item.file_data+'" download="'+esc(item.file_name||"documento")+'">Abrir documento/anexo</a>')
      : "";
    openModal(
      '<div class="execution-modal-head"><span class="eyebrow">INFORMAÇÃO IMPORTANTE</span><h2>'+esc(item.title)+'</h2></div>'+
      '<div class="announcement-body">'+esc(item.body||"").replace(/\n/g,"<br>")+'</div>'+
      attachment+
      '<div class="execution-modal-actions"><button id="announcementDone" class="btn primary">Entendi</button></div>'
    );
    $("announcementDone").onclick=closeModal;
    if(!item.seen){
      try{await api("markAnnouncementRead",{matricula:state.matricula,announcement_id:item.id}); item.seen=true; renderAnnouncementBanner();}catch(_){}
    }
  }

  async function openAnnouncementsCenter(){
    await refreshAnnouncements();
    const rows=state.executionAnnouncements||[];
    openModal(
      '<div class="execution-modal-head"><span class="eyebrow">FIQUE POR DENTRO</span><h2>Informações importantes</h2><p>Direcionamentos, campanhas e comunicados da operação.</p></div>'+
      '<div class="announcement-list">'+(rows.length?rows.map(x=>
        '<button class="announcement-list-item" data-ann="'+esc(x.id)+'"><span class="'+(x.seen?"":"dot")+'"></span><div><b>'+esc(x.title)+'</b><small>'+new Date(x.created_at).toLocaleDateString("pt-BR")+'</small></div><i>›</i></button>'
      ).join(""):'<div class="empty-box">Nenhum informativo ativo no momento.</div>')+'</div>'+
      (state.role==="administrador"?'<div class="execution-modal-actions"><button id="newAnnouncementBtn" class="btn primary">＋ Novo informativo</button></div>':"")
    );
    document.querySelectorAll("[data-ann]").forEach(b=>b.onclick=()=>{
      const item=rows.find(x=>x.id===b.dataset.ann); if(item) openAnnouncement(item);
    });
    if($("newAnnouncementBtn")) $("newAnnouncementBtn").onclick=()=>openAnnouncementAdmin();
  }

  function openAnnouncementAdmin(){
    openModal(
      '<div class="execution-modal-head"><span class="eyebrow">ADMINISTRAÇÃO</span><h2>Cadastrar informativo</h2><p>Publique texto, imagem, vídeo ou documento e escolha quem deve visualizar.</p></div>'+
      '<div class="execution-form">'+
        '<label>Título<input id="annTitle" maxlength="120" placeholder="Ex.: Check diário dos Supervisores"></label>'+
        '<label>Mensagem<textarea id="annBody" rows="5" placeholder="Escreva o direcionamento..."></textarea></label>'+
        '<fieldset><legend>Quem deve visualizar</legend><div class="role-checks">'+
          '<label><input type="checkbox" value="all" checked> Todos</label>'+
          '<label><input type="checkbox" value="supervisor"> Supervisores</label>'+
          '<label><input type="checkbox" value="gerente"> Gerentes</label>'+
          '<label><input type="checkbox" value="comercial"> Comerciais</label>'+
          '<label><input type="checkbox" value="colaborador"> Colaboradores</label>'+
        '</div></fieldset>'+
        '<label>Anexo / mídia<input id="annFile" type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"></label>'+
        '<small class="execution-help">Imagens, vídeos e documentos de até aproximadamente 5 MB.</small>'+
        '<div id="annFeedback" class="form-error hidden"></div>'+
      '</div>'+
      '<div class="execution-modal-actions"><button id="saveAnnouncementBtn" class="btn primary">Publicar informativo</button></div>'
    );
    $("saveAnnouncementBtn").onclick=saveAnnouncementFromForm;
  }

  async function saveAnnouncementFromForm(){
    const btn=$("saveAnnouncementBtn"),fb=$("annFeedback");
    try{
      btn.disabled=true;btn.textContent="Publicando...";
      const file=$("annFile").files?.[0]||null;
      let fileData=null;
      if(file){
        if(file.size>5*1024*1024) throw new Error("O anexo deve ter até 5 MB.");
        fileData=await fileToDataURL(file);
      }
      const roles=[...document.querySelectorAll(".role-checks input:checked")].map(x=>x.value);
      await api("saveAnnouncement",{
        matricula:state.matricula,
        title:$("annTitle").value.trim(),
        body:$("annBody").value.trim(),
        audience_roles:roles.length?roles:["all"],
        media_type:file?.type?.split("/")[0]||null,
        file_name:file?.name||null,
        file_mime:file?.type||null,
        file_data:fileData
      });
      toast("Informativo publicado.");
      closeModal();
      await refreshAnnouncements();
    }catch(e){
      fb.textContent=e.message;fb.className="form-error";
    }finally{btn.disabled=false;btn.textContent="Publicar informativo"}
  }

  function moreButton(id,icon,title,small,handler,admin=false){
    const list=document.querySelector("#section-mais .premium-more-list");
    if(!list||$(id)) return;
    const b=document.createElement("button");
    b.id=id;
    if(admin) b.classList.add("execution-admin-tool");
    b.innerHTML='<span class="more-icon">'+icon+'</span><div><strong>'+title+'</strong><small>'+small+'</small></div><b>›</b>';
    b.onclick=handler;
    list.appendChild(b);
  }

  function gotoAdminTab(tab){
    setSection("admin");
    setTimeout(()=>{ if(typeof setAdminTab==="function") setAdminTab(tab); },80);
  }

  function ensureMoreTools(){
    const more=$("section-mais");
    if(!more) return;
    moreButton("moreAnnouncementsBtn","!","Informações importantes","Avisos, campanhas e direcionamentos",openAnnouncementsCenter,false);
    moreButton("moreChatBtn","💬","Chat entre lojas","Tire dúvidas sobre uso e navegação do app",openChat,false);

    if(state.role==="administrador"){
      moreButton("moreMonthlyTargetBtn","🎯","Alimentar Meta do Mês","Usar o modelo oficial de metas por DCO",()=>{gotoAdminTab("metas");setTimeout(()=>$("monthlyTargetFile")?.click(),250)},true);
      moreButton("moreCommercialAdminBtn","◎","Cadastrar / Editar Comerciais","Responsáveis, fotos e DCOs atribuídos",()=>gotoAdminTab("comerciais"),true);
      moreButton("moreAnnouncementAdminBtn","📣","Cadastrar Informativos","Texto, mídias, vídeos e documentos",openAnnouncementAdmin,true);
      moreButton("moreCollaboratorsBtn","👥","Atualizar Banco de Colaboradores","Importar base geral de colaboradores",openCollaboratorImport,true);
      moreButton("moreVisibilityBtn","◉","Visibilidade de Perfis","Definir menus disponíveis por perfil",openVisibilityAdmin,true);
    }

    const list=more.querySelector(".premium-more-list");
    const preferred=[
      "moreUpdateSalesBtn","moreMonthlyTargetBtn","moreCommercialAdminBtn","moreAnnouncementAdminBtn",
      "moreCollaboratorsBtn","moreVisibilityBtn","moreAnnouncementsBtn","moreChatBtn",
      "moreResetDayBtn","premiumInstallApp","premiumLogout"
    ];
    preferred.forEach(id=>{const el=$(id);if(el&&el.parentNode===list) list.appendChild(el)});
  }

  function openCollaboratorImport(){
    const input=document.createElement("input");
    input.type="file";input.accept=".xlsx,.xls";input.style.display="none";
    document.body.appendChild(input);
    input.onchange=async()=>{
      const file=input.files?.[0]; if(!file){input.remove();return}
      openModal('<div class="execution-modal-head"><span class="eyebrow">BASE DE COLABORADORES</span><h2>Atualizando banco de dados</h2></div><div class="import-progress">Lendo e validando '+esc(file.name)+'...</div>');
      try{
        const b64=await fileToBase64(file);
        const r=await api("importCollaborators",{matricula:state.matricula,filename:file.name,file_base64:b64});
        $("executionModalBody").innerHTML=
          '<div class="execution-modal-head"><span class="eyebrow">CONCLUÍDO</span><h2>Base atualizada</h2></div>'+
          '<div class="success-panel"><strong>'+num(r?.rows||0)+'</strong><span>colaboradores processados</span></div>'+
          '<div class="execution-modal-actions"><button class="btn primary" onclick="closeExecutionModal()">Fechar</button></div>';
      }catch(e){
        $("executionModalBody").innerHTML='<div class="execution-modal-head"><h2>Não foi possível atualizar</h2></div><div class="form-error">'+esc(e.message)+'</div>';
      }finally{input.remove()}
    };
    input.click();
  }

  async function openVisibilityAdmin(){
    let payload={rules:[]};
    try{payload=await api("getProfileVisibility",{matricula:state.matricula})||payload}catch(_){}
    const map=new Map((payload.rules||[]).map(x=>[x.role+"|"+x.section_code,!!x.enabled]));
    openModal(
      '<div class="execution-modal-head"><span class="eyebrow">PERFIS E ACESSOS</span><h2>Visibilidade dos menus</h2><p>Defina o que cada perfil enxerga no aplicativo.</p></div>'+
      '<div class="visibility-grid"><div></div>'+SECTIONS.map(s=>'<b>'+SECTION_NAMES[s]+'</b>').join("")+
      ROLES.map(role=>'<strong>'+ROLE_NAMES[role]+'</strong>'+SECTIONS.map(sec=>{
        const checked=map.has(role+"|"+sec)?map.get(role+"|"+sec):true;
        return '<label><input type="checkbox" data-role="'+role+'" data-sec="'+sec+'" '+(checked?"checked":"")+'></label>';
      }).join("")).join("")+'</div>'+
      '<div class="execution-modal-actions"><button id="saveVisibilityBtn" class="btn primary">Salvar visibilidade</button></div>'
    );
    $("saveVisibilityBtn").onclick=async()=>{
      const entries=[...document.querySelectorAll(".visibility-grid input")].map(x=>({role:x.dataset.role,section_code:x.dataset.sec,enabled:x.checked}));
      try{
        await api("saveProfileVisibility",{matricula:state.matricula,entries});
        toast("Visibilidade atualizada.");closeModal();await applyProfileVisibility(true);
      }catch(e){toast(e.message,true)}
    };
  }

  async function applyProfileVisibility(force=false){
    if(!state.logged) return;
    if(!force && state.executionVisibilityLoaded) return;
    try{
      const payload=await api("getProfileVisibility",{matricula:state.matricula});
      const role=payload?.role||state.role;
      const rules=(payload?.rules||[]).filter(x=>x.role===role);
      const map=new Map(rules.map(x=>[x.section_code,!!x.enabled]));
      SECTIONS.forEach(sec=>{
        const enabled=role==="administrador" ? true : (map.has(sec)?map.get(sec):true);
        document.querySelectorAll('[data-section="'+sec+'"],[data-more-section="'+sec+'"]').forEach(el=>el.classList.toggle("profile-hidden",!enabled));
      });
      state.executionVisibilityLoaded=true;
    }catch(_){}
  }

  let chatPollTimer=null;
  async function openChat(){
    openModal(
      '<div class="execution-modal-head"><span class="eyebrow">CONEXÃO ENTRE LOJAS</span><h2>Chat de apoio</h2><p>Tire dúvidas de navegação e compartilhe orientações sobre o app.</p></div>'+
      '<div id="chatMessages" class="chat-messages"><div class="empty-box">Carregando...</div></div>'+
      '<div class="chat-compose"><textarea id="chatText" rows="2" maxlength="2000" placeholder="Digite sua mensagem..."></textarea><button id="chatSendBtn" class="btn primary">Enviar</button></div>'
    );
    await loadChat();
    $("chatSendBtn").onclick=sendChat;
    clearInterval(chatPollTimer);
    chatPollTimer=setInterval(()=>{if(!$("executionModal")?.classList.contains("hidden") && $("chatMessages")) loadChat();},12000);
  }

  async function loadChat(){
    try{
      const rows=await api("chatList",{matricula:state.matricula});
      const box=$("chatMessages"); if(!box) return;
      box.innerHTML=(rows||[]).length?(rows||[]).map(m=>
        '<div class="chat-message '+(m.matricula===state.matricula?"mine":"")+'"><div><b>'+esc(m.sender_name)+'</b><span>Loja '+esc(m.store_code)+'</span></div><p>'+esc(m.message)+'</p><small>'+new Date(m.created_at).toLocaleString("pt-BR")+'</small></div>'
      ).join(""):'<div class="empty-box">Seja o primeiro a iniciar uma conversa.</div>';
      box.scrollTop=box.scrollHeight;
    }catch(e){if($("chatMessages")) $("chatMessages").innerHTML='<div class="form-error">'+esc(e.message)+'</div>'}
  }

  async function sendChat(){
    const text=$("chatText").value.trim(); if(!text) return;
    const btn=$("chatSendBtn"); btn.disabled=true;
    try{
      await api("chatSend",{matricula:state.matricula,message:text});
      $("chatText").value="";await loadChat();
    }catch(e){toast(e.message,true)}
    finally{btn.disabled=false}
  }

  function enhanceDcoCards(){
    hydrateDerivedLy();
    normalizeDcoNameText();
    replaceLyLabels();
    document.querySelectorAll(".premium-dco-card").forEach(card=>{
      const name=card.querySelector(".premium-dco-head strong");
      if(name) name.classList.add("dco-name-tag");
      card.classList.add("dco-pantone-card");
    });
  }

  function refreshExecutionUi(){
    if(!state.logged) return;
    hydrateDerivedLy();
    hydrateCommercials();
    renderIdentityHero();
    ensureMoreTools();
    enhanceDcoCards();
    replaceLyLabels();
    applyProfileVisibility();
    renderAnnouncementBanner();
  }

  const oldDashboard=window.renderDashboard;
  if(typeof oldDashboard==="function"){
    window.renderDashboard=function(){
      hydrateDerivedLy();
      oldDashboard();
      setTimeout(()=>{refreshExecutionUi();refreshAnnouncements();},0);
    };
  }

  const oldGroups=window.renderGroups;
  if(typeof oldGroups==="function"){
    window.renderGroups=function(){
      hydrateDerivedLy();
      oldGroups();
      setTimeout(enhanceDcoCards,0);
    };
  }

  const oldCommercials=window.renderCommercials;
  if(typeof oldCommercials==="function"){
    window.renderCommercials=function(){
      hydrateCommercials();
      oldCommercials();
      setTimeout(()=>{hydrateCommercials();replaceLyLabels();},0);
    };
  }

  const oldSetSection=window.setSection;
  if(typeof oldSetSection==="function"){
    window.setSection=function(section){
      oldSetSection(section);
      setTimeout(refreshExecutionUi,30);
    };
  }

  document.addEventListener("DOMContentLoaded",()=>{
    ensureModal();
    setTimeout(()=>{refreshExecutionUi();refreshAnnouncements();},350);
  });

  window.refreshExecutionUi=refreshExecutionUi;
})();
