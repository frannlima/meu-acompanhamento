/* Autenticação de sincronização Flash: confirmação uma vez por sessão,
   renovação segura em memória da aba, sem senha do Flash. */
(function(){
  "use strict";
  const key="ria_secure_auth";
  const authUrl="https://vvgejviwvtnlahbyopah.supabase.co/auth/v1/token?grant_type=refresh_token";
  const apiKey="sb_publishable_XBa55FcPfePH_roJs2ejHg_KK9lV0R6";
  let inflight=null;
  function session(){try{return JSON.parse(sessionStorage.getItem(key)||"null")}catch(_){return null}}
  function saveAuth(data){
    if(!data?.access_token||!data?.refresh_token||!Number.isFinite(Number(data.expires_in)))return false;
    sessionStorage.setItem(key,JSON.stringify({
      access_token:data.access_token,refresh_token:data.refresh_token,
      expires_at:Date.now()+Math.max(60,Number(data.expires_in)-15)*1000
    }));
    return true;
  }
  async function getToken(){
    const auth=session();
    if(!auth?.access_token)return null;
    if(Number(auth.expires_at)>Date.now()+90_000)return auth.access_token;
    if(!auth.refresh_token)return Number(auth.expires_at)>Date.now()?auth.access_token:null;
    if(inflight)return inflight;
    inflight=(async()=>{
      try{
        const res=await fetch(authUrl,{method:"POST",headers:{"Content-Type":"application/json",apikey:apiKey},
          body:JSON.stringify({refresh_token:auth.refresh_token}),cache:"no-store"});
        const body=await res.json();
        if(!res.ok||!saveAuth(body)){
          if(res.status===400||res.status===401)sessionStorage.removeItem(key);
          throw Error("A sessão do e-mail expirou. Confirme o código novamente no app.");
        }
        document.dispatchEvent(new CustomEvent("ma:flash-auth-ready"));
        return session()?.access_token||null;
      }catch(error){
        console.warn("[Flash] Falha ao renovar sessão compartilhada:",error?.message||error);
        return Number(auth.expires_at)>Date.now()?auth.access_token:null;
      }
    })().finally(()=>{inflight=null;});
    return inflight;
  }
  // Aceita o fluxo de link do Supabase sem expor tokens na tela ou no histórico.
  // A API flash-sync continua a validar e-mail confirmado, matrícula e função.
  async function handleEmailLink(){
    const fragment=new URLSearchParams(location.hash.slice(1));
    if(!fragment.has("access_token")&&!fragment.has("error"))return false;
    const bearer=fragment.get("access_token");
    const refresh=fragment.get("refresh_token");
    const error=fragment.get("error_description")||fragment.get("error");
    // Remover fragmentos sensíveis imediatamente, inclusive quando a autenticação falhar.
    try{history.replaceState(history.state,"",location.pathname+location.search)}catch(_){}
    if(error){document.dispatchEvent(new CustomEvent("ma:flash-auth-result",{detail:{ok:false,message:"O link de acesso foi recusado ou expirou. Solicite outro somente após o limite de envios ser liberado."}}));return false}
    if(!bearer||!refresh)return false;
    try{
      const response=await fetch("https://vvgejviwvtnlahbyopah.supabase.co/auth/v1/user",{
        method:"GET",headers:{apikey:apiKey,Authorization:"Bearer "+bearer},
        cache:"no-store"
      });
      const user=await response.json().catch(()=>null);
      if(!response.ok||!user?.email_confirmed_at)throw Error("Sessão não confirmada pelo Supabase");
      const payload=JSON.parse(atob(bearer.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
      const remaining=Math.floor(Number(payload.exp||0)-Date.now()/1000);
      if(remaining<=0)throw Error("O link expirou");
      if(!saveAuth({access_token:bearer,refresh_token:refresh,expires_in:remaining}))
        throw Error("Sessão incompleta");
      document.dispatchEvent(new CustomEvent("ma:flash-auth-ready"));
      document.dispatchEvent(new CustomEvent("ma:flash-auth-result",{detail:{ok:true,message:"E-mail confirmado pelo link. A sincronização será liberada após a verificação do perfil administrativo."}}));
      return true;
    }catch(err){
      document.dispatchEvent(new CustomEvent("ma:flash-auth-result",{detail:{ok:false,message:"Não foi possível validar o link: "+String(err?.message||err)}}));
      return false;
    }
  }
  window.maFlashAuth=Object.freeze({getToken,saveAuth,isConnected:()=>!!session()?.access_token,handleEmailLink});
  // O evento de link é resolvido uma vez na aba de destino.
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",handleEmailLink,{once:true});
  else void handleEmailLink();
})();