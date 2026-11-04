/* Interface de cadastro de avatares. Preparada para conectar a API administrativa
   autenticada. Não persiste fotos no navegador nem expõe credenciais. */
(function(){
"use strict";
const STATES=[["original","Original"],["celebrate","Comemoração"],["tracking","Acompanhamento"],["attention","Atenção"],["react","Reação"]];
const normalize=v=>/^\d{1,6}$/.test(String(v||"").trim())?String(v).padStart(3,"0"):null;
let currentBranch="",avatarRecord=null;
function managerImage(state){
 if(!avatarRecord?.enabled)return null;
 return avatarRecord.images?.[state]||avatarRecord.images?.tracking||avatarRecord.images?.original||null;
}
function showAvatar(){
 const root=document.getElementById("maPartialMascot");
 if(!root||typeof state==="undefined"||!state.logged)return;
 const branch=normalize(state.storeCode);
 if(branch!==currentBranch){currentBranch=branch;avatarRecord=null;loadAvatar(branch);}
 const portrait=root.querySelector(".ma-mascot-portrait");
 if(!portrait)return;
 const mood=root.dataset.mood;
 const expression=mood==="good"?"celebrate":mood==="bad"?"react":mood==="pending"?"attention":"tracking";
 const src=managerImage(expression);
 let photo=portrait.querySelector(".ma-manager-photo");
 if(!photo){photo=document.createElement("img");photo.className="ma-manager-photo";photo.alt="Avatar do gerente da filial";photo.draggable=false;portrait.appendChild(photo);}
 if(src){photo.src=src;photo.hidden=false;photo.alt="Avatar de "+avatarRecord.manager_name+" — filial "+branch;}
 else {photo.hidden=true;photo.removeAttribute("src");}
 root.classList.toggle("ma-manager-custom",!!src);
}
async function loadAvatar(branch){
 if(!branch)return;
 try{
  // API deve validar sessão no servidor. Não consultar tabela protegida diretamente.
  if(typeof window.managerAvatarApi!=="function")return;
  const data=await window.managerAvatarApi("get",{branch_code:branch});
  if(currentBranch!==branch)return;
  avatarRecord=data||null;showAvatar();
 }catch(e){console.warn("Avatar da filial indisponível; mantendo padrão.",e);}
}
function buildAdmin(){
 if(document.getElementById("maAvatarAdmin"))return;
 const panel=document.getElementById("adminPanel-estrutura");
 if(!panel)return;
 const section=document.createElement("section");
 section.id="maAvatarAdmin";
 section.className="ma-avatar-admin";
 section.innerHTML='<h3>Avatares dos gerentes por filial</h3><p>Cadastre as expressões autorizadas de cada gerente. A configuração será compartilhada entre os dispositivos após ativar a API administrativa.</p>'+
 '<label>Filial <input id="maAvatarBranch" inputmode="numeric" maxlength="6" placeholder="108"></label>'+
 '<label>Nome do gerente <input id="maAvatarName" maxlength="120" placeholder="Nome do gerente"></label>'+
 STATES.map(([key,label])=>'<label>'+label+' <input type="file" data-avatar-expression="'+key+'" accept="image/png,image/jpeg,image/webp,image/avif"></label>').join("")+
 '<button type="button" id="maAvatarSave" class="btn primary" disabled>Salvar cadastro</button>'+
 '<p id="maAvatarStatus" role="status">Aguardando integração segura de upload e autenticação ADM.</p>';
 panel.appendChild(section);
 section.querySelector("#maAvatarSave").addEventListener("click",()=>{});
}
function init(){
 buildAdmin();
 const observer=new MutationObserver(()=>{if(typeof state!=="undefined"&&state.logged)showAvatar();});
 const root=document.getElementById("appShell");
 if(root)observer.observe(root,{attributes:true,attributeFilter:["class"],subtree:false});
 document.addEventListener("ma:dashboard-ready",showAvatar);
 document.addEventListener("click",e=>{if(e.target.closest("[data-section],#confirmPaste"))setTimeout(()=>{buildAdmin();showAvatar();},100)});
 setInterval(showAvatar,15000);
 showAvatar();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
