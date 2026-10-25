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
  window.maFlashAuth=Object.freeze({getToken,saveAuth,isConnected:()=>!!session()?.access_token});
})();