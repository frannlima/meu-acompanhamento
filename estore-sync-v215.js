/* eStore CE+PI → Meu Acompanhamento | consolidação somente leitura, v215.
   Um único snapshot oficial alimenta todos os componentes sem registrar pedidos novamente. */
(function(){
 "use strict";
 const API="https://fndkjgveeojlywkdrtxe.supabase.co/functions/v1/estore-api";
 let lastKey="",lastRequest=0,inFlight=false,sequence=0;
 function context(){
   const code=String(state.storeCode||"").replace(/\D/g,"").padStart(3,"0");
   return {store:code,date:localDate(),matricula:String(state.matricula||"")};
 }
 function eligible(){
   try{return !!state.logged&&!!state.matricula&&["administrador","gerente","supervisor"].includes(state.role)&&!document.hidden}catch(_){return false}
 }
 async function sync(force=false){
   if(!eligible()||inFlight)return;
   const c=context(),key=c.store+"|"+c.date;
   if(!/^\d{3}$/.test(c.store)||!c.matricula)return;
   if(!force&&key===lastKey&&Date.now()-lastRequest<60000)return;
   const id=++sequence;inFlight=true;lastRequest=Date.now();lastKey=key;
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
   try{
     const res=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({action:"hourly_get",matricula:c.matricula,result_date:c.date}),
       cache:"no-store",signal:ctrl.signal});
     const data=await res.json().catch(()=>({}));
     if(!res.ok||data.ok!==true||!Array.isArray(data.stores)||String(data.result_date||c.date)!==c.date)
       throw new Error(data.error||"Parcial eStore indisponível.");
     if(id!==sequence||!eligible()||context().store+"|"+context().date!==key)return;
     const row=data.stores.find(x=>String(x.st||"").replace(/\D/g,"").padStart(3,"0")===c.store);
     if(!row)return;
     // Os valores são acumulados do backend: não somar aqui nem inserir novamente.
     window.maEstoreConsolidatedV215={
       store:c.store,date:c.date,updated_at:row.updated_at||null,
       captured:row.updated_at?Math.max(0,Number(row.captured)||0):null,
       orders:row.updated_at?Math.max(0,Math.trunc(Number(row.orders)||0)):null,
       metaValue:Math.max(0,Number(row.metaValue)||0)
     };
     const detail={context:{store:c.store,date:c.date},stores:data.stores,updated_at:row.updated_at||null,source:"official_hourly_get"};
     document.dispatchEvent(new CustomEvent("ma:estore-hourly-loaded",{detail}));
     document.dispatchEvent(new CustomEvent("ma:estore-sync",{detail:{...detail,row}}));
   }catch(e){
     // Falha de rede não zera o último acumulado válido.
     if(e?.name!=="AbortError")console.warn("[eStore CE+PI] Sincronização indisponível:",e);
   }finally{clearTimeout(timeout);inFlight=false}
 }
 window.maRefreshEstoreV215=()=>sync(true);
 document.addEventListener("ma:dashboard-ready",()=>void sync(true));
 document.addEventListener("ma:section-change",()=>void sync());
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)void sync(true)});
 window.addEventListener("pageshow",()=>void sync(true));
 window.addEventListener("focus",()=>void sync());
 window.addEventListener("storage",ev=>{if(ev.key==="estore_hourly_changed_v3")void sync(true)});
 setInterval(()=>void sync(),60000);
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void sync(true),{once:true});
 else void sync(true);
})();
