/* Acesso ADM separado: Supabase Auth + allowlist no banco.
   O login operacional por matrícula permanece intacto. */
(function(){
"use strict";
const URL="https://vvgejviwvtnlahbyopah.supabase.co";
const KEY="sb_publishable_XBa55FcPfePH_roJs2ejHg_KK9lV0R6";
const BUCKET="manager-avatars";
const EXPRESSIONS=["original","celebrate","tracking","attention","react"];
let client=null,active=null,ready=false;
function status(msg){const el=document.getElementById("maAvatarStatus");if(el)el.textContent=msg;}
function adminSection(){return document.getElementById("maAvatarAdmin");}
function controls(){
 const section=adminSection();if(!section||section.dataset.authReady)return;
 section.dataset.authReady="1";
 const wrap=document.createElement("div");
 wrap.innerHTML='<div class="ma-avatar-auth"><label>E-mail de administrador <input type="email" id="maAvatarEmail" autocomplete="email" placeholder="seu@email.com"></label><button type="button" class="btn secondary" id="maAvatarLogin">Entrar com link seguro</button><button type="button" class="btn secondary" id="maAvatarLogout" hidden>Sair do acesso ADM</button><p id="maAvatarIdentity"></p></div>';
 section.insertBefore(wrap,section.firstChild.nextSibling);
 wrap.querySelector("#maAvatarLogin").addEventListener("click",login);
 wrap.querySelector("#maAvatarLogout").addEventListener("click",()=>client.auth.signOut());
 section.querySelector("#maAvatarSave").addEventListener("click",save);
 section.querySelector("#maAvatarBranch").addEventListener("change",loadRecord);
}
async function login(){
 const email=document.getElementById("maAvatarEmail")?.value.trim();
 if(!email){status("Informe o e-mail autorizado.");return;}
 status("Enviando link de acesso...");
 const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
 status(error?"Não foi possível enviar o link: "+error.message:"Confira o link de acesso no seu e-mail.");
}
async function session(){
 const {data:{session}}=await client.auth.getSession();
 active=session;
 let authorized=false;
 if(session){
  const {data,error}=await client.from("manager_avatar_admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
  authorized=!error&&!!data;
 }
 const section=adminSection();
 if(!section)return;
 section.querySelector("#maAvatarSave").disabled=!authorized;
 section.querySelector("#maAvatarLogout").hidden=!session;
 section.querySelector("#maAvatarLogin").hidden=!!session;
 section.querySelector("#maAvatarIdentity").textContent=session?(authorized?"ADM autenticado: "+session.user.email:"Conta autenticada, mas sem permissão de administrar avatares."):"Acesso administrativo adicional necessário.";
 section.querySelectorAll('input:not(#maAvatarEmail)').forEach(el=>el.disabled=!authorized);
 if(authorized){status("Acesso autorizado. Selecione a filial e as fotos.");await loadRecord();}
 else status("O administrador precisa ser autorizado no Supabase antes de salvar.");
}
async function loadRecord(){
 if(!active)return;
 const branch=document.getElementById("maAvatarBranch")?.value.trim().padStart(3,"0");
 if(!/^\d{3}$/.test(branch))return;
 const {data,error}=await client.from("branch_manager_avatars").select("*").eq("branch_code",branch).maybeSingle();
 if(error){status(error.message);return;}
 document.getElementById("maAvatarName").value=data?.manager_name||"";
 status(data?"Cadastro encontrado. Novas fotos substituirão apenas as expressões selecionadas.":"Filial sem cadastro. Preencha o nome e as imagens.");
}
async function save(){
 const branch=document.getElementById("maAvatarBranch").value.trim().padStart(3,"0");
 const name=document.getElementById("maAvatarName").value.trim();
 if(!/^\d{3}$/.test(branch)||!name){status("Informe uma filial válida e o nome do gerente.");return;}
 const button=document.getElementById("maAvatarSave");button.disabled=true;
 try{
  const {data:old,error:lookupError}=await client.from("branch_manager_avatars").select("images").eq("branch_code",branch).maybeSingle();
  if(lookupError)throw lookupError;
  const images={...(old?.images||{})};
  for(const expression of EXPRESSIONS){
   const file=document.querySelector('[data-avatar-expression="'+expression+'"]')?.files?.[0];
   if(!file)continue;
   if(file.size>5242880||!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type))throw new Error("Imagem inválida ou acima de 5 MB: "+expression);
   const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"})[file.type];
   const path=branch+"/"+expression+"-"+crypto.randomUUID()+"."+ext;
   const {error}=await client.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(error)throw error;
   images[expression]=path;
  }
  if(!Object.keys(images).length)throw new Error("Selecione ao menos uma foto.");
  const {error}=await client.from("branch_manager_avatars").upsert({branch_code:branch,manager_name:name,images,enabled:true,updated_at:new Date().toISOString()},{onConflict:"branch_code"});
  if(error)throw error;
  status("Cadastro salvo com segurança para a filial "+branch+".");
 }catch(e){status("Não foi possível salvar: "+e.message);}
 finally{button.disabled=false;}
}
async function start(){
 if(ready)return;
 const section=adminSection();if(!section||!window.supabase?.createClient)return;
 if(typeof state==="undefined"||state.role!=="administrador")return;
 ready=true;controls();
 client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"ma-avatar-admin-auth"}});
 client.auth.onAuthStateChange(()=>setTimeout(session,0));
 await session();
}
document.addEventListener("DOMContentLoaded",()=>{start();document.addEventListener("click",()=>setTimeout(start,100));});
window.addEventListener("pageshow",start);
})();
