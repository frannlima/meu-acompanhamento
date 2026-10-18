/* Meu Acompanhamento • Instalação PWA orientada, sem download de APK. */
(()=>{
"use strict";
let deferredPrompt=null;
const standalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
const isiOS=()=>/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=()=>/Android/i.test(navigator.userAgent);
const inApp=()=>/WhatsApp|Instagram|FBAN|FBAV|; wv\)|\bwv\b/i.test(navigator.userAgent);
const installedButtons=[];
let dialog=null,launchControl=null;
const heading="Instalar Meu Acompanhamento";
window.addEventListener("beforeinstallprompt",(e)=>{
  e.preventDefault();
  deferredPrompt=e;
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
    steps:["Você está em um navegador dentro de outro aplicativo. Toque no menu do aplicativo e escolha Abrir no navegador, ou copie o link e abra no Chrome, Samsung Internet ou Safari.","Depois, volte ao botão Instalar Meu Acompanhamento para concluir."]
  };
  if(isiOS())return {
    title:"Adicionar à Tela de Início — iPhone ou iPad",
    steps:["Abra este endereço no Safari.","Toque em Compartilhar (quadrado com seta para cima).","Selecione Adicionar à Tela de Início. Se necessário, role a lista de ações.","Confirme em Adicionar. O ícone Meu Acompanhamento ficará na tela inicial."]
  };
  if(isAndroid())return {
    title:"Instalar no Android",
    steps:["Abra este endereço no Google Chrome ou Samsung Internet.","No menu do navegador (⋮ ou ☰), escolha Instalar aplicativo ou Adicionar à tela inicial.","Confirme Instalar ou Adicionar. Procure o ícone Meu Acompanhamento na tela de aplicativos ou na tela inicial.","Se a opção não estiver disponível, atualize o navegador e abra o link diretamente, fora do WhatsApp."]
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
  title.innerHTML='<span class="ma-install-eyebrow">ACESSO RÁPIDO</span><h2 id="maInstallHeading">Meu Acompanhamento na sua tela inicial</h2>';
  const close=document.createElement("button");
  close.type="button";close.className="ma-install-close";close.textContent="✕";close.setAttribute("aria-label","Fechar instruções de instalação");close.onclick=closeDialog;
  top.append(icon,title,close);
  const desc=document.createElement("p");
  desc.className="ma-install-description";
  desc.textContent="Instale como um aplicativo, sem precisar baixar APK ou acessar uma loja. Seu login continua igual.";
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
    if(!deferredPrompt){const i=instructions();subtitle.textContent=i.title;fillSteps(list,i.steps);notice.textContent="Siga estas instruções no navegador. A instalação é controlada pelo sistema e não pode ser forçada pelo site.";primary.hidden=true;return}
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
  const footer=document.createElement("p");
  footer.className="ma-install-footer";
  footer.textContent="Se o dispositivo for corporativo, a instalação poderá depender das permissões configuradas pela TI.";
  frame.append(top,desc,subtitle,list,primary,notice,footer);
  dialog.append(frame);
  dialog.addEventListener("click",(e)=>{if(e.target===dialog)closeDialog()});
  document.body.append(dialog);
  return {subtitle,list,primary,notice};
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
  ui.primary.hidden=!deferredPrompt;
  ui.notice.textContent=deferredPrompt?"Seu navegador permite instalar agora. Toque no botão abaixo para continuar.":"Se o navegador não apresentar a instalação automática, use as etapas abaixo.";
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
    help.textContent="Coloque o aplicativo na tela inicial do seu celular. Gratuito e sem loja de aplicativos.";
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