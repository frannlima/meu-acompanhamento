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
    trigger.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) {
      placePanel();
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
      ".ec-help-trigger{position:fixed;right:16px;bottom:calc(100px + env(safe-area-inset-bottom,0px));width:54px;height:54px;border:0;border-radius:50%;background:#14684e;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 5px 17px #002d2180;cursor:grab;touch-action:none;z-index:2147480001}",
      ".ec-help-trigger:focus-visible,.ec-help-root button:focus-visible,.ec-help-root input:focus-visible,.ec-help-root select:focus-visible,.ec-help-root textarea:focus-visible{outline:3px solid #e2b651;outline-offset:2px}",
      ".ec-help-trigger svg{width:27px;height:27px;pointer-events:none}",
      ".ec-help-panel{position:fixed;box-sizing:border-box;background:#fff;border:1px solid #d7e1dc;border-radius:18px;padding:16px;box-shadow:0 8px 32px #08241d45;z-index:2147480002;max-height:calc(100dvh - 24px);overflow:auto;font-size:14px;line-height:1.35}",
      ".ec-help-panel[hidden]{display:none!important}.ec-help-panel *{box-sizing:border-box}",
      ".ec-help-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}.ec-help-title{font-size:17px;font-weight:800}.ec-help-close{background:transparent;border:0;font-size:24px;color:#315f50;cursor:pointer;line-height:1}",
      ".ec-help-subtitle{color:#567166;font-size:12px;margin:0 0 12px}.ec-help-label{display:block;font-weight:700;font-size:12px;margin:9px 0 4px}",
      ".ec-help-field{width:100%;border:1px solid #bfcdc4;border-radius:9px;padding:9px 10px;color:#1c342d;background:#fff;font:inherit}",
      ".ec-help-actions{display:flex;gap:8px;margin-top:12px}.ec-help-action{flex:1;min-width:0;border-radius:10px;padding:10px 8px;border:1px solid #126447;cursor:pointer;font-weight:700;font-size:13px}",
      ".ec-help-primary{background:#14684e;color:#fff}.ec-help-primary:disabled{background:#e8efea;color:#62746a;border-color:#c7d4cb;cursor:not-allowed}",
      ".ec-help-secondary{background:#fff;color:#14684e}.ec-help-note{margin:10px 0 0;font-size:11px;color:#687b71}.ec-help-feedback{min-height:15px;font-size:11px;margin-top:8px;display:block}",
      "@media(max-width:420px){.ec-help-panel{padding:14px}.ec-help-trigger{bottom:calc(110px + env(safe-area-inset-bottom,0px))}}"
    ].join("");
    document.head.appendChild(css);

    root = document.createElement("div");
    root.className = "ec-help-root";
    root.innerHTML =
      '<button type="button" class="ec-help-trigger" id="ec-help-trigger" aria-label="Abrir Central de Ajuda" aria-expanded="false" aria-controls="ec-help-panel" title="Central de Ajuda: toque para abrir, arraste para mover">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8.4 8.4 0 0 1-8.5 8.5c-1.5 0-2.9-.35-4.1-1L3 20l1.2-4.3A8.3 8.3 0 0 1 3 11.5a8.5 8.5 0 0 1 17 0Z"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 1.9-2.5 3"/><path d="M12 15.8h.01"/></svg></button>' +
      '<section class="ec-help-panel" id="ec-help-panel" aria-label="Central de Ajuda eStore Connect" hidden>' +
      '<div class="ec-help-top"><strong class="ec-help-title">Central de Ajuda</strong><button class="ec-help-close" type="button" aria-label="Fechar central">×</button></div>' +
      '<p class="ec-help-subtitle">Atendimento eStore Connect pelo WhatsApp Business • ' + application + '</p>' +
      '<label class="ec-help-label" for="ec-help-store">Sua filial (opcional)</label><input id="ec-help-store" class="ec-help-field" inputmode="numeric" maxlength="4" placeholder="Ex.: 108"/>' +
      '<label class="ec-help-label" for="ec-help-topic">Qual o assunto?</label><select id="ec-help-topic" class="ec-help-field"><option>Acesso e login</option><option>Indicadores e resultados</option><option>Atualização de vendas</option><option>Funcionalidades do aplicativo</option><option>Suporte técnico</option><option>Outro assunto</option></select>' +
      '<label class="ec-help-label" for="ec-help-question">Descreva sua dúvida (opcional)</label><textarea id="ec-help-question" class="ec-help-field" rows="3" maxlength="2000" placeholder="Como podemos ajudar?"></textarea>' +
      '<div class="ec-help-actions"><button type="button" id="ec-help-copy" class="ec-help-action ec-help-secondary">Copiar mensagem</button><button type="button" id="ec-help-open" class="ec-help-action ec-help-primary" disabled>Abrir WhatsApp</button></div>' +
      '<span id="ec-help-feedback" class="ec-help-feedback" role="status" aria-live="polite"></span>' +
      '<p class="ec-help-note">O envio é gratuito e manual. Você confere a mensagem e o destinatário antes de enviar; não há leitura de conversas pelo aplicativo.</p></section>';
    document.body.appendChild(root);
    trigger = root.querySelector("#ec-help-trigger");
    panel = root.querySelector("#ec-help-panel");
    feedback = root.querySelector("#ec-help-feedback");
    openButton = root.querySelector("#ec-help-open");
    storeInput = root.querySelector("#ec-help-store");
    topicInput = root.querySelector("#ec-help-topic");
    questionInput = root.querySelector("#ec-help-question");
    storeInput.value = storeHint();
    root.querySelector(".ec-help-close").addEventListener("click", togglePanel);
    root.querySelector("#ec-help-copy").addEventListener("click", copyMessage);
    openButton.addEventListener("click", openConversation);
    trigger.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || pointer) return;
      const r = trigger.getBoundingClientRect();
      pointer = {id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top,moved:false};
      trigger.setPointerCapture(event.pointerId);
    });
    trigger.addEventListener("pointermove", function (event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (Math.hypot(dx,dy) > 7) pointer.moved = true;
      if (!pointer.moved) return;
      trigger.classList.add("ec-help-moved");
      trigger.style.right = "auto"; trigger.style.bottom = "auto";
      trigger.style.left = clamp(pointer.left + dx, 8, window.innerWidth - 62) + "px";
      trigger.style.top = clamp(pointer.top + dy, 8, window.innerHeight - 62) + "px";
      placePanel();
    });
    function endPointer(event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      suppressClick = pointer.moved;
      if (pointer.moved) {
        try { localStorage.setItem(storageKey, JSON.stringify({
          x: Number.parseFloat(trigger.style.left), y: Number.parseFloat(trigger.style.top)
        })); } catch (_) {}
      }
      pointer = null;
    }
    trigger.addEventListener("pointerup", endPointer);
    trigger.addEventListener("pointercancel", endPointer);
    trigger.addEventListener("click", function () {
      if (suppressClick) { suppressClick = false; return; }
      togglePanel();
    });
    document.addEventListener("keydown", function(e){if(e.key==="Escape"&&!panel.hidden)togglePanel();});
    window.addEventListener("resize", resetPositionIfOffscreen);
    try {
      const pos = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        trigger.style.right = "auto"; trigger.style.bottom = "auto";
        trigger.style.left = clamp(pos.x, 8, window.innerWidth - 62) + "px";
        trigger.style.top = clamp(pos.y, 8, window.innerHeight - 62) + "px";
      }
    } catch (_) {}
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
