/* Meu Acompanhamento • Instalação PWA orientada, sem download de APK. */
(()=>{
"use strict";
let deferredPrompt=null;
const standalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
const isiOS=()=>/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=()=>/Android/i.test(navigator.userAgent);
const isSamsungBrowser=()=>/SamsungBrowser/i.test(navigator.userAgent);
const inApp=()=>/WhatsApp|Instagram|FBAN|FBAV|; wv\)|\bwv\b/i.test(navigator.userAgent);
const installedButtons=[];
let dialog=null,launchControl=null;
const heading="Instalar Meu Acompanhamento";
window.addEventListener("beforeinstallprompt",(e)=>{
  // No Samsung Internet, o WebAPK gerado pelo navegador pode receber alerta
  // de incompatibilidade do Play Protect. Nunca oferecer instalação direta.
  e.preventDefault();
  deferredPrompt=isSamsungBrowser()?null:e;
  update();
});
window.addEventListener("appinstalled",()=>{
  deferredPrompt=null;
  update();
  closeDialog();
});
function makeButton(label,className){
  const b=document.createElement("button");
  b.type="button";
  b.className=className;
  b.textContent=label;
  b.addEventListener("click",start);
  installedButtons.push(b);
  return b;
}
function update(){
  const hide=standalone();
  installedButtons.forEach(b=>{b.hidden=hide;b.setAttribute("aria-hidden",String(hide))});
}
function closeDialog(){
  if(!dialog)return;
  if(dialog.open&&typeof dialog.close==="function")dialog.close();
  else dialog.removeAttribute("open");
  launchControl?.focus({preventScroll:true});
}
function instructions(){
  if(inApp())return {
    title:"Abra no navegador do celular",
    steps:["Este navegador interno pode oferecer somente um atalho. Use a opção Abrir no Chrome, se disponível, ou copie o endereço e abra diretamente no Google Chrome (Android) ou Safari (iPhone).","Depois, no navegador completo, abra Instalar Meu Acompanhamento e siga o procedimento próprio de instalação."]
  };
  if(isiOS())return {
    title:"Adicionar à Tela de Início — iPhone ou iPad",
    steps:["Abra este endereço no Safari.","Toque em Compartilhar (quadrado com seta para cima).","Selecione Adicionar à Tela de Início. Se necessário, role a lista de ações.","Confirme em Adicionar. O ícone Meu Acompanhamento ficará na tela inicial."]
  };
  if(isAndroid()&&isSamsungBrowser())return {
    title:"Instalação bloqueada no Samsung Internet",
    steps:["Se o Google Play Protect avisar que o app foi criado para uma versão antiga do Android, NÃO toque em Instalar assim mesmo nem desative a proteção.","Há relatos desse alerta em PWAs instalados pelo Samsung Internet. O pacote Android é gerado pelo navegador; o site não consegue atualizar o SDK desse pacote.","Abra o Google Chrome atualizado, digitando https://frannlima.github.io/meu-acompanhamento/ diretamente na barra de endereço.","Somente se o Chrome oferecer Instalar aplicativo sem alerta de segurança, prossiga e confira se abre sem barra de endereços.","Se o Chrome também mostrar o aviso, interrompa a instalação e utilize temporariamente a versão web até uma solução compatível ser validada."]
  };
  if(isAndroid())return {
    title:"Instalar o aplicativo no Android",
    steps:["Abra o endereço diretamente no Google Chrome atualizado. Não use o navegador interno de WhatsApp ou outro aplicativo.","Aguarde a página carregar e toque em Instalar aplicativo, se o navegador oferecer a instalação.","Se o botão automático não aparecer, abra o menu ⋮ do Chrome e procure Instalar aplicativo. Algumas versões exibem Adicionar à tela inicial antes de mostrar a opção Instalar.","Confirme Instalar somente se não houver aviso de segurança do Play Protect. Se aparecer Criar atalho, não confunda com aplicativo: atualize o navegador e tente novamente.","Abra o novo ícone e confirme que o Meu Acompanhamento aparece sem barra de endereços."]
  };
  return {
    title:"Instalar no computador",
    steps:["Abra o Meu Acompanhamento no Chrome ou Microsoft Edge.","Use a opção Instalar aplicativo na barra de endereços ou no menu do navegador.","Confirme a instalação para abrir o app em uma janela própria.","Se não aparecer, procure Apps no menu do navegador ou atualize o Chrome/Edge."]
  };
}
function createDialog(){
  dialog=document.createElement("dialog");
  dialog.id="maInstallDialog";
  dialog.className="ma-install-dialog";
  dialog.setAttribute("aria-labelledby","maInstallHeading");
  const frame=document.createElement("div");
  frame.className="ma-install-frame";
  const top=document.createElement("div");
  top.className="ma-install-top";
  const icon=document.createElement("img");
  icon.src="./assets/app-icon-192.png";
  icon.alt="";
  icon.width=52;
  icon.height=52;
  const title=document.createElement("div");
  title.innerHTML='<span class="ma-install-eyebrow">INSTALAÇÃO DO APP</span><h2 id="maInstallHeading">Instalar Meu Acompanhamento como aplicativo</h2>';
  const close=document.createElement("button");
  close.type="button";close.className="ma-install-close";close.textContent="✕";close.setAttribute("aria-label","Fechar instruções de instalação");close.onclick=closeDialog;
  top.append(icon,title,close);
  const desc=document.createElement("p");
  desc.className="ma-install-description";
  desc.textContent="Queremos um aplicativo independente, não um simples atalho do navegador. A instalação do PWA depende das opções oferecidas pelo seu aparelho. Seu login continua igual.";
  const subtitle=document.createElement("h3");
  subtitle.id="maInstallStepsTitle";
  const list=document.createElement("ol");
  list.className="ma-install-steps";
  const primary=document.createElement("button");
  primary.type="button";
  primary.className="ma-install-primary";
  primary.textContent="Instalar aplicativo";
  const notice=document.createElement("p");
  notice.className="ma-install-status";
  notice.setAttribute("role","status");
  primary.addEventListener("click",async()=>{
    if(isSamsungBrowser()||!deferredPrompt){const i=instructions();subtitle.textContent=i.title;fillSteps(list,i.steps);notice.textContent="A instalação depende de um pacote atualizado gerado pelo navegador. Não contorne avisos do Play Protect.";primary.hidden=true;return}
    const prompt=deferredPrompt;
    deferredPrompt=null;
    try{
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice?.outcome==="accepted"){
        notice.textContent="Instalação solicitada! Confirme no seu aparelho e procure o ícone Meu Acompanhamento.";
      } else {
        notice.textContent="Instalação não concluída. Você pode tentar novamente pelo menu do navegador.";
      }
    }catch(e){
      notice.textContent="A janela de instalação não abriu. Siga as orientações do seu navegador.";
    }
    const i=instructions();subtitle.textContent=i.title;fillSteps(list,i.steps);primary.hidden=true;
    update();
  });
  const copyLink=document.createElement("button");
  copyLink.type="button";copyLink.className="ma-install-copy";copyLink.textContent="Copiar link para abrir no Chrome";
  copyLink.addEventListener("click",async()=>{try{await navigator.clipboard.writeText("https://frannlima.github.io/meu-acompanhamento/");notice.textContent="Link copiado! Abra o Google Chrome, cole o endereço e escolha Instalar aplicativo."}catch{notice.textContent="Copie este endereço manualmente no Chrome: https://frannlima.github.io/meu-acompanhamento/"}});
  const footer=document.createElement("p");
  footer.className="ma-install-footer";
  footer.textContent="Se o dispositivo for corporativo, a instalação poderá depender das permissões configuradas pela TI.";
  frame.append(top,desc,subtitle,list,primary,copyLink,notice,footer);
  dialog.append(frame);
  dialog.addEventListener("click",(e)=>{if(e.target===dialog)closeDialog()});
  document.body.append(dialog);
  return {subtitle,list,primary,copyLink,notice};
}
function fillSteps(list,steps){
  list.replaceChildren();
  steps.forEach(step=>{const li=document.createElement("li");li.textContent=step;list.append(li)});
}
let ui=null;
function start(e){
  launchControl=e?.currentTarget||null;
  if(standalone())return;
  ui||=createDialog();
  const i=instructions();
  ui.subtitle.textContent=i.title;
  fillSteps(ui.list,i.steps);
  ui.primary.hidden=isSamsungBrowser()||!deferredPrompt;
  ui.copyLink.hidden=!isAndroid()||(!isSamsungBrowser()&&!!deferredPrompt);
  ui.notice.textContent=isSamsungBrowser()?"Por segurança, desabilitamos a instalação direta pelo Samsung Internet. Use o Chrome atualizado; se o Play Protect bloquear também, interrompa a instalação.":deferredPrompt?"O navegador oferece instalação, mas só prossiga se o Android não apresentar nenhum alerta de segurança.":isAndroid()?"Use o Chrome e procure Instalar aplicativo. Não ignore avisos do Play Protect e não confunda com Criar atalho.":"Siga as etapas do Safari ou do seu navegador.";
  if(typeof dialog.showModal==="function")dialog.showModal();
  else dialog.setAttribute("open","");
}
function init(){
  if(document.getElementById("maInstallDialog")||document.getElementById("maInstallLogin"))return;
  const loginForm=document.getElementById("loginForm");
  const loginSubmit=document.getElementById("loginBtn");
  if(loginForm&&loginSubmit){
    const card=document.createElement("div");
    card.className="ma-install-login";
    card.id="maInstallLogin";
    const button=makeButton("⬇ Instalar Meu Acompanhamento","ma-install-login-btn");
    const help=document.createElement("p");
    help.textContent="Instale como aplicativo independente, e não apenas como atalho de navegador.";
    card.append(button,help);
    loginSubmit.insertAdjacentElement("afterend",card);
  }
  const side=document.querySelector(".sidebar-bottom");
  if(side){
    const b=makeButton("⬇ Instalar aplicativo","ma-install-side-btn");
    b.id="maInstallSide";
    side.insertBefore(b,side.firstChild);
  }
  const mobile=document.querySelector(".mobile-header");
  if(mobile){
    const b=makeButton("Instalar","ma-install-mobile-btn");
    b.id="maInstallMobile";
    b.setAttribute("aria-label","Instalar Meu Acompanhamento na tela inicial");
    mobile.append(b);
  }
  update();
  const displayQuery=window.matchMedia("(display-mode: standalone)");
  displayQuery.addEventListener?.("change",update);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();