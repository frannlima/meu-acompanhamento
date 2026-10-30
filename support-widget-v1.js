/* eStore Connect | Central de Ajuda gratuita, sem envio automático.
   O destino é configurado exclusivamente em support-channel.json, no mesmo projeto. */
(function () {
  "use strict";
  if (typeof document === "undefined" || window.__ecHelpWidgetV1) return;
  window.__ecHelpWidgetV1 = true;

  const script = document.currentScript;
  const application = script && script.dataset && script.dataset.app === "meu"
    ? "Meu Acompanhamento" : "eStore Connect";
  const configUrl = new URL("./support-channel.json", script && script.src || location.href);
  const storageKey = "ec-help-position-v1-" + (application === "eStore Connect" ? "estore" : "meu");
  let phone = "";
  let root, trigger, panel, feedback, openButton, storeInput, topicInput, questionInput;
  let pointer = null, suppressClick = false;


  const localGuides = {"eStore Connect":{"Acesso e login":"Confira sua matrícula, filial e perfil. Se o acesso estiver restrito, valide seu cadastro e a filial ativa. Não compartilhe senhas.","Indicadores e resultados":"Em Minha Filial consulte a venda captada, os pedidos, a meta e o share. Share real do dia = venda eStore ÷ venda real da loja. Para comparar D-1, confirme a data e a última atualização.","Atualização de vendas":"As parciais do Hora a Hora eStore devem refletir a filial correta. O consolidado ADM e a informação do supervisor não devem duplicar pedidos. Confira hora, filial e último registro antes de reenviar.","Funcionalidades do aplicativo":"Meu Resultado: desempenho individual. Minha Filial: operação. Meu Time: dispersão. Metas: objetivo financeiro e pedidos. Hora a Hora: parciais. Ranking: comparação. FCA: tratativas. Pool: base comissionável exclui BOPIS.","Suporte técnico":"Informe a tela, o horário e a mensagem de erro. Atualize a página uma vez e confirme se os dados foram salvos antes de repetir uma importação.","Outro assunto":"Descreva o menu e o resultado que deseja consultar. Posso orientar sobre eStore, metas, pedidos, share, BOPIS, campanhas, D-1, FCA, comissão e alertas."},"Meu Acompanhamento":{"Acesso e login":"O acesso utiliza matrícula e número da loja. Confirme a filial e a matrícula registradas no cadastro. Administração regional exige perfil autorizado.","Indicadores e resultados":"Cockpit: meta, venda, desvio, projeção e ritmo. Mundos/DCOs: desempenho dos grupos. Comerciais: desempenho por responsável. O share eStore utiliza venda da loja como denominador quando o Flash está atualizado.","Atualização de vendas":"Em Início, use Colar venda da web e confira a prévia antes de confirmar. Verifique a filial, a última parcial, as linhas reconhecidas e a atualização do Flash. Não importe duas vezes sem verificar o registro anterior.","Funcionalidades do aplicativo":"Início: visão geral. Cockpit: ritmo e projeção. Mundos/DCOs: grupos. Comerciais: resultados individuais. Painel de Descontos: descontos. eStore CE+PI: integração. Administração: cargas e permissões.","Suporte técnico":"Informe o menu, a filial, o horário, o resultado esperado e o observado. Confira se a parcial foi confirmada e se a atualização mais recente foi refletida antes de reenviar.","Outro assunto":"Posso ajudar com venda física, metas, parcial Hora a Hora, Mundos/DCOs, Comerciais, Flash, projeção, descontos e integração com eStore."}};
  function identity() {
    let session = {};
    try { session = JSON.parse(localStorage.getItem("meu_acompanhamento_session") || "{}"); } catch(_) {}
    const first = (selectors) => selectors.map(sel => document.querySelector(sel)).find(el => el && el.textContent && el.textContent.trim() !== "—");
    const nameEl = first(["#identityName","#mobileGreetingName","[data-user-name]","#userName",".user-name"]);
    const roleEl = first(["#identityRole","[data-user-role]","#userRole",".user-role"]);
    const rawName = (nameEl && nameEl.textContent || session.name || session.nome || session.user_name || "").trim();
    const rawRole = (roleEl && roleEl.textContent || session.role || session.cargo || session.funcao || "").trim();
    return {name:/^(—|meu acompanhamento|usuário|usuario)$/i.test(rawName)?"":rawName.slice(0,90),role:rawRole==="—"?"":rawRole.slice(0,90)};
  }
  function refreshGuide(){
    if(!panel)return;
    const user=identity(), hour=new Date().getHours(), salutation=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
    const welcome=panel.querySelector("#ec-help-welcome");
    if(welcome)welcome.textContent=salutation+(user.name?", "+user.name:"")+"! 💚"+(user.role?" · "+user.role:"")+"\nEstou aqui para ajudar com o "+application+".";
    const advice=panel.querySelector("#ec-help-advice");
    if(advice)advice.textContent=localGuides[application][topicInput.value] || "";
  }
  function validNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return /^55\d{10,11}$/.test(digits) ? digits : "";
  }
  function setFeedback(message, error) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.style.color = error ? "#a23930" : "#2c6954";
  }
  function storeHint() {
    const params = new URLSearchParams(location.search);
    for (const key of ["filial", "loja", "store"]) {
      const number = String(params.get(key) || "").replace(/\D/g, "");
      if (/^\d{2,4}$/.test(number)) return number;
    }
    if (application === "Meu Acompanhamento") {
      try {
        const s = JSON.parse(localStorage.getItem("meu_acompanhamento_session") || "{}");
        for (const key of ["store", "store_id", "storeNumber", "filial", "loja"]) {
          const number = String(s[key] || "").replace(/\D/g, "");
          if (/^\d{2,4}$/.test(number)) return number;
        }
      } catch (_) {}
    }
    return "";
  }
  function messageText() {
    const store = String(storeInput.value || "").replace(/[^\d]/g, "").slice(0, 4);
    const topic = topicInput.value;
    const question = questionInput.value.trim().slice(0, 2000);
    return [
      "Olá, equipe eStore Connect! Preciso de suporte.",
      "",
      "Aplicativo: " + application,
      "Colaborador: " + (identity().name || "Não identificado"),
      "Função: " + (identity().role || "Não identificada"),
      "Filial: " + (store || "Não informada"),
      "Assunto: " + topic,
      "",
      "Minha dúvida: " + (question || "Gostaria de receber orientação sobre o aplicativo.")
    ].join("\n");
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function placePanel() {
    if (!panel || panel.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 24);
    const height = panel.offsetHeight;
    panel.style.width = width + "px";
    panel.style.left = clamp(rect.right - width, 12, window.innerWidth - width - 12) + "px";
    const top = rect.top - height - 10 >= 8 ? rect.top - height - 10
      : rect.bottom + height + 10 <= window.innerHeight ? rect.bottom + 10
      : clamp(window.innerHeight - height - 12, 8, window.innerHeight);
    panel.style.top = top + "px";
  }
  function togglePanel() {
    panel.hidden = !panel.hidden;
    root.classList.toggle("ec-help-open", !panel.hidden);
    trigger.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) {
      placePanel();
      refreshGuide();
      questionInput.focus({preventScroll:true});
    } else {
      trigger.focus({preventScroll:true});
    }
  }
  async function copyMessage() {
    const content = messageText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const tmp = document.createElement("textarea");
        tmp.value = content; tmp.style.position = "fixed"; tmp.style.opacity = "0";
        document.body.appendChild(tmp); tmp.select();
        if (!document.execCommand("copy")) throw Error("Sem permissão de cópia.");
        tmp.remove();
      }
      setFeedback("Mensagem copiada. Você pode compartilhá-la com o atendimento.");
    } catch (_) {
      setFeedback("Não foi possível copiar automaticamente. Selecione o texto da sua mensagem.", true);
    }
  }
  function openConversation() {
    if (!phone) {
      setFeedback("O número novo da Central eStore Connect ainda não foi confirmado.", true);
      return;
    }
    const link = "https://wa.me/" + phone + "?text=" + encodeURIComponent(messageText());
    window.open(link, "_blank", "noopener,noreferrer");
    setFeedback("Confira o destinatário no WhatsApp Business e confirme o envio.");
  }
  function resetPositionIfOffscreen() {
    const rect = trigger.getBoundingClientRect();
    if (rect.right > window.innerWidth || rect.bottom > window.innerHeight ||
        rect.left < 0 || rect.top < 0) {
      trigger.style.left = ""; trigger.style.top = ""; trigger.style.right = ""; trigger.style.bottom = "";
      trigger.classList.remove("ec-help-moved");
      try { localStorage.removeItem(storageKey); } catch (_) {}
    }
    placePanel();
  }
  function mount() {
    if (document.getElementById("ec-help-trigger")) return;
    const css = document.createElement("style");
    css.id = "ec-help-styles";
    css.textContent = [
      ".ec-help-root{font-family:Arial,Helvetica,sans-serif;color:#19382f;z-index:2147480000}",
      ".ec-help-trigger{position:fixed;right:16px;bottom:calc(100px + env(safe-area-inset-bottom,0px));width:100px;height:100px;border:0;border-radius:50%;background:radial-gradient(circle at center,#19c864 0 31%,#08573d 33% 100%);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px #15e87895,0 6px 20px #002d2180;cursor:grab;touch-action:none;z-index:2147480001}",
      ".ec-help-trigger:before{content:\"\";position:absolute;inset:29px;border-radius:50%;box-shadow:0 0 0 3px #24f276,0 0 13px 6px #26ff80;animation:ec-help-glow 2.2s ease-in-out infinite;pointer-events:none}",
      ".ec-help-ring{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}.ec-help-ring text{fill:#fff;font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:.3px;paint-order:stroke;stroke:#06452e;stroke-width:1.5px;stroke-linejoin:round}.ec-help-ring .top{font-size:12.5px}.ec-help-ring .bottom{font-size:10.7px}",
      "@keyframes ec-help-glow{0%,100%{opacity:.4;box-shadow:0 0 0 2px #24f276,0 0 6px 3px #26ff80}50%{opacity:1;box-shadow:0 0 0 3px #24f276,0 0 19px 9px #26ff80}}@media(prefers-reduced-motion:reduce){.ec-help-trigger:before{animation:none}}",
      ".ec-help-trigger:focus-visible,.ec-help-root button:focus-visible,.ec-help-root input:focus-visible,.ec-help-root select:focus-visible,.ec-help-root textarea:focus-visible{outline:3px solid #e2b651;outline-offset:2px}",
      ".ec-help-trigger svg.ec-help-phone{width:38px;height:38px;pointer-events:none;position:relative;z-index:1;filter:drop-shadow(0 0 4px #15eb78)}",
      ".ec-help-welcome{white-space:pre-line;background:#e9faf0;border-radius:12px;padding:11px;margin:9px 0;font-size:13px;line-height:1.5}.ec-help-advice{white-space:pre-line;background:#f4f8f5;border-left:3px solid #18a95b;padding:10px;margin:10px 0;border-radius:8px;font-size:12px;line-height:1.5}",
      ".ec-help-panel{position:fixed;box-sizing:border-box;background:#fff;border:1px solid #d7e1dc;border-radius:18px;padding:16px;box-shadow:0 8px 32px #08241d45;z-index:2147480002;max-height:calc(100dvh - 24px);overflow:auto;font-size:14px;line-height:1.35}",
      ".ec-help-panel[hidden]{display:none!important}.ec-help-panel *{box-sizing:border-box}",
      ".ec-help-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}.ec-help-title{font-size:17px;font-weight:800}.ec-help-close{background:transparent;border:0;font-size:24px;color:#315f50;cursor:pointer;line-height:1}",
      ".ec-help-subtitle{color:#567166;font-size:12px;margin:0 0 12px}.ec-help-label{display:block;font-weight:700;font-size:12px;margin:9px 0 4px}",
      ".ec-help-field{width:100%;border:1px solid #bfcdc4;border-radius:9px;padding:9px 10px;color:#1c342d;background:#fff;font:inherit}",
      ".ec-help-actions{display:flex;gap:8px;margin-top:12px}.ec-help-action{flex:1;min-width:0;border-radius:10px;padding:10px 8px;border:1px solid #126447;cursor:pointer;font-weight:700;font-size:13px}",
      ".ec-help-primary{background:#14684e;color:#fff}.ec-help-primary:disabled{background:#e8efea;color:#62746a;border-color:#c7d4cb;cursor:not-allowed}",
      ".ec-help-secondary{background:#fff;color:#14684e}.ec-help-note{margin:10px 0 0;font-size:11px;color:#687b71}.ec-help-feedback{min-height:15px;font-size:11px;margin-top:8px;display:block}",
      "@media(max-width:420px){.ec-help-panel{padding:14px}.ec-help-trigger{bottom:calc(110px + env(safe-area-inset-bottom,0px))}}",
      "/* Acessos estáticos no cabeçalho: não cobrem resultados nem bloqueiam gestos. */",
      "#ecHeaderActions{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-shrink:0;margin-left:auto;min-width:0}",
      "#ec-help-trigger.ec-help-header-trigger{position:static!important;inset:auto!important;transform:none!important;flex:0 0 42px!important;width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;min-height:42px!important;margin:0!important;padding:0!important;border-radius:12px!important;display:inline-flex!important;background:#edf8f1!important;color:#17613f!important;border:1px solid #c7dbcf!important;box-shadow:none!important;cursor:pointer!important;touch-action:manipulation!important;animation:none!important}",
      "#ec-help-trigger.ec-help-header-trigger[hidden]{display:none!important}",
      "#ec-help-trigger.ec-help-header-trigger:before,#ec-help-trigger.ec-help-header-trigger .ec-help-ring{display:none!important}",
      "#ec-help-trigger.ec-help-header-trigger svg.ec-help-phone{width:23px!important;height:23px!important;filter:none!important}",
      "#shell>.top #ec-help-trigger.ec-help-header-trigger{background:#eff7f2!important;border-color:#b8d0c3!important}",
      "#appShell .mobile-header #ec-help-trigger.ec-help-header-trigger{background:rgba(255,255,255,.13)!important;color:#fff!important;border:1px solid rgba(255,255,255,.28)!important}",
      "#appShell .mobile-header #ec-help-trigger.ec-help-header-trigger svg{color:#fff!important}",
      "#appShell .sidebar-bottom #ec-help-trigger.ec-help-header-trigger{width:100%!important;max-width:none!important;flex-basis:auto!important;gap:8px!important;margin-bottom:10px!important}",
      "#appShell .sidebar-bottom #ec-help-trigger.ec-help-header-trigger:after{content:'Suporte';font-size:12px;font-weight:800}",
      "#appShell .mobile-header #ec-help-trigger.ec-help-header-trigger{margin-left:6px!important}",
      ".ec-help-root:not(.ec-help-open){pointer-events:none}",
      ".ec-help-root.ec-help-open{position:fixed;inset:0;z-index:2147480000;background:rgba(8,31,25,.56);pointer-events:auto}",
      ".ec-help-root .ec-help-panel{pointer-events:auto}",
      "@media(max-width:900px){.ec-help-root .ec-help-panel{position:fixed!important;left:50%!important;right:auto!important;top:calc(12px + env(safe-area-inset-top,0px))!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;width:min(440px,calc(100vw - 24px))!important;max-height:calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))!important;transform:translateX(-50%)!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.ec-help-actions{position:relative;flex-wrap:wrap}.ec-help-action{min-height:44px}.mobile-header .mobile-greeting{min-width:0!important;max-width:min(45vw,180px)}}",
      "@media(min-width:901px){.ec-help-root .ec-help-panel{left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(480px,calc(100vw - 32px))!important;max-height:calc(100dvh - 40px)!important}}",
      "@media(max-width:420px){#shell>.top #ecHeaderActions{gap:3px}#shell>.top .logo{width:112px!important;max-width:33vw!important}#shell>.top{gap:3px!important;padding:7px 7px!important}}"
    ].join("");
    document.head.appendChild(css);

    root = document.createElement("div");
    root.className = "ec-help-root";
    root.innerHTML =
      '<button type="button" class="ec-help-trigger" id="ec-help-trigger" aria-label="Abrir Central de Ajuda" aria-expanded="false" aria-controls="ec-help-panel" title="Central de Ajuda: toque para abrir, arraste para mover">' +
      '<svg class="ec-help-ring" viewBox="0 0 100 100" aria-hidden="true"><defs><path id="ec-help-upper" d="M 10 50 A 40 40 0 0 1 90 50"/><path id="ec-help-lower" d="M 10 50 A 40 40 0 0 0 90 50"/></defs><text class="top" text-anchor="middle"><textPath href="#ec-help-upper" startOffset="50%">SUPORTE</textPath></text><text class="bottom" text-anchor="middle"><textPath href="#ec-help-lower" startOffset="50%">eSTORE CONNECT</textPath></text></svg><svg class="ec-help-phone" viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M16 3a12.8 12.8 0 0 0-11 19.4L3 29l6.8-1.9A12.8 12.8 0 1 0 16 3zm0 2.5a10.3 10.3 0 1 1-5.1 19.2l-.5-.3-3.6 1 1-3.5-.3-.5A10.3 10.3 0 0 1 16 5.5zm-5.3 4.4c-.5 0-1 .2-1.4.7-.5.6-1.1 1.4-1.1 3s1.2 3.2 1.4 3.4a14.2 14.2 0 0 0 5.7 5c2.4.8 2.9.6 3.5.5.5-.1 1.7-.7 2-1.4.2-.7.2-1.3.1-1.4-.1-.1-.5-.3-1.1-.6l-1.7-.8c-.3-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1s-1.5-.6-2.8-1.8c-1-1-1.7-2.1-1.9-2.5-.2-.3 0-.5.2-.7l.6-.7c.2-.2.3-.4.4-.7.1-.2 0-.5-.1-.7l-.9-2.1c-.2-.6-.5-.6-.8-.6z"/></svg></button>' +
      '<section class="ec-help-panel" id="ec-help-panel" aria-label="Central de Ajuda eStore Connect" hidden>' +
      '<div class="ec-help-top"><strong class="ec-help-title">Central de Ajuda</strong><button class="ec-help-close" type="button" aria-label="Fechar central">×</button></div>' +
      '<p class="ec-help-subtitle">Atendimento contextual • ' + application + '</p><div id="ec-help-welcome" class="ec-help-welcome"></div>' +
      '<label class="ec-help-label" for="ec-help-store">Sua filial (opcional)</label><input id="ec-help-store" class="ec-help-field" inputmode="numeric" maxlength="4" placeholder="Ex.: 108"/>' +
      '<label class="ec-help-label" for="ec-help-topic">Qual o assunto?</label><select id="ec-help-topic" class="ec-help-field"><option>Acesso e login</option><option>Indicadores e resultados</option><option>Atualização de vendas</option><option>Funcionalidades do aplicativo</option><option>Suporte técnico</option><option>Outro assunto</option></select>' +
      '<div id="ec-help-advice" class="ec-help-advice" role="status" aria-live="polite"></div><label class="ec-help-label" for="ec-help-question">Descreva sua dúvida (opcional)</label><textarea id="ec-help-question" class="ec-help-field" rows="3" maxlength="2000" placeholder="Como podemos ajudar?"></textarea>' +
      '<div class="ec-help-actions"><button type="button" id="ec-help-copy" class="ec-help-action ec-help-secondary">Copiar mensagem</button><button type="button" id="ec-help-open" class="ec-help-action ec-help-primary" disabled>Abrir WhatsApp</button></div>' +
      '<span id="ec-help-feedback" class="ec-help-feedback" role="status" aria-live="polite"></span>' +
      '<p class="ec-help-note">O envio é gratuito e manual. Você confere a mensagem e o destinatário antes de enviar; não há leitura de conversas pelo aplicativo.</p></section>';
    document.body.appendChild(root);
    trigger = root.querySelector("#ec-help-trigger");
    trigger.classList.add("ec-help-header-trigger");
    trigger.title = "Abrir Central de Ajuda";
    const isPhone = () => window.matchMedia("(max-width:900px)").matches;
    function dockTrigger() {
      let destination = null;
      if (application === "Meu Acompanhamento") {
        const shell = document.querySelector("#appShell");
        const signedIn = shell && !shell.classList.contains("hidden");
        destination = signedIn
          ? (isPhone() ? document.querySelector(".mobile-header") : document.querySelector(".sidebar-bottom"))
          : document.querySelector("#loginScreen .login-card");
      } else {
        const shell = document.getElementById("shell");
        const signedIn = shell && !shell.classList.contains("hide") && getComputedStyle(shell).display !== "none";
        if (signedIn) {
          const header = document.querySelector("#shell > header.top");
          if (header) {
            destination = header.querySelector("#ecHeaderActions");
            if (!destination) {
              destination = document.createElement("div");
              destination.id = "ecHeaderActions";
              destination.setAttribute("role","group");
              destination.setAttribute("aria-label","Atalhos de ajuda e comunicados");
              header.appendChild(destination);
            }
          }
        } else {
          destination = document.querySelector("#login .loginbox");
        }
      }
      if (!destination) {
        trigger.hidden = true;
        return;
      }
      trigger.hidden = false;
      if (trigger.parentElement !== destination) destination.appendChild(trigger);
    }
    dockTrigger();
    window.addEventListener("resize",dockTrigger,{passive:true});
    document.addEventListener("click",()=>requestAnimationFrame(dockTrigger));
    setInterval(dockTrigger,2400);
    panel = root.querySelector("#ec-help-panel");
    feedback = root.querySelector("#ec-help-feedback");
    openButton = root.querySelector("#ec-help-open");
    storeInput = root.querySelector("#ec-help-store");
    topicInput = root.querySelector("#ec-help-topic");
    questionInput = root.querySelector("#ec-help-question");
    storeInput.value = storeHint();
    topicInput.addEventListener("change",refreshGuide);
    refreshGuide();
    root.querySelector(".ec-help-close").addEventListener("click", togglePanel);
    root.querySelector("#ec-help-copy").addEventListener("click", copyMessage);
    openButton.addEventListener("click", openConversation);
    trigger.addEventListener("click", togglePanel);
    document.addEventListener("keydown", function(e){if(e.key==="Escape"&&!panel.hidden)togglePanel();});
    window.addEventListener("resize", placePanel,{passive:true});
    setFeedback("Verificando o canal de atendimento…");
    fetch(configUrl.href, {cache:"no-store"}).then(function(r){
      if (!r.ok) throw Error("Configuração indisponível");
      return r.json();
    }).then(function(data){
      phone = data && data.enabled === true ? validNumber(data.phone_e164) : "";
      openButton.disabled = !phone;
      setFeedback(phone
        ? "Canal disponível. A conversa será aberta no WhatsApp Business."
        : "Canal aguardando confirmação do novo número comercial.", !phone);
    }).catch(function(){
      phone = ""; openButton.disabled = true;
      setFeedback("Canal não configurado. A mensagem pode ser copiada.", true);
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, {once:true});
  else mount();
})();
