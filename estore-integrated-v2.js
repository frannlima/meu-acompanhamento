/* Meu Acompanhamento • Hora a Hora eStore integrado • v2 */
(function(){
 "use strict";
 const API="https://fndkjgveeojlywkdrtxe.supabase.co/functions/v1/estore-api";
 const $=id=>document.getElementById(id);
 const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
 const pct=v=>v===null||!Number.isFinite(v)?"—":v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";
 const brDate=d=>d.split("-").reverse().join("/");
 const time=d=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit"}).format(new Date(d));
 const norm=s=>String(s||"").replace(/\D/g,"").padStart(3,"0");
 const ctx=()=>({store:norm(state.storeCode),date:localDate()});
 const ctxKey=c=>c.store+"|"+c.date;
 const visible=()=>state.logged&&state.section==="estore"&&!document.hidden&&$("section-estore")?.classList.contains("active");
 let loadedRetailStore="",loadedRetailDate="",loadedEstore=null,loadedEstoreKey="",seq=0,controller=null,lastRequest=0,lastKey="",submitting=false;
 function status(msg,tone=""){const el=$("estoreLiveStatus");if(el){el.textContent=msg;el.dataset.kind=tone;}}
 function feedback(msg,tone=""){const el=$("estoreHourFeedback");if(el){el.textContent=msg;el.dataset.kind=tone;}}
 function retail(c){
   const day=state.day||{};
   if(loadedRetailStore!==c.store||loadedRetailDate!==c.date||!day.has_input||!day.captured_at)return null;
   const updated=new Date(day.captured_at),sale=Number(day.sales_financial);
   if(!Number.isFinite(updated.getTime())||!Number.isFinite(sale)||sale<=0)return null;
   const date=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).format(updated);
   return date===c.date?{sale,updated}:null;
 }
 function render(row,c){
   if(ctxKey(c)!==ctxKey(ctx()))return;
   const output=$("estoreLiveGrid");if(!output)return;
   const has=!!row?.updated_at,cap=Math.max(0,Number(row?.captured)||0),orders=Math.max(0,Math.trunc(Number(row?.orders)||0)),
      orderGoal=Math.max(0,Math.trunc(Number(row?.orderTarget)||0)),goal=Math.max(0,Number(row?.metaValue)||0),
      shop=retail(c),share=has&&shop?cap/shop.sale*100:null,att=has&&goal>0?cap/goal*100:null,
      deviation=has&&goal>0?cap-goal:null;
   const eDate=row?.updated_at&&Number.isFinite(Date.parse(row.updated_at))?time(row.updated_at):"sem lançamento";
   const rDate=shop?time(shop.updated):"sem input da loja";
   $("estoreLiveTitle").textContent="Loja "+c.store+" • "+brDate(c.date);
   $("estoreLiveMeta").textContent="eStore: "+eDate+" • Venda loja: "+rDate+" • Consulta: "+time(new Date());
   status(!has?"Aguardando a primeira parcial eStore para esta filial.":!shop?
     "eStore atualizado. Falta a venda real da filial para calcular o share.":
     "Share operacional: últimas parciais disponíveis de cada base.",has&&shop?"success":"warning");
   const metric=(title,val,cls="")=>'<div class="estore-live-metric '+cls+'"><span>'+title+'</span><strong>'+val+'</strong></div>';
   const progress=att===null?0:Math.min(100,Math.max(0,att));
   output.innerHTML='<div class="estore-live-highlight"><span>VENDA CAPTADA eSTORE</span><strong>'+(has?money(cap):"—")+'</strong>'+
     '<small>Meta eStore: '+(goal?money(goal):"não cadastrada")+'</small>'+
     '<div class="estore-live-bar" role="progressbar" aria-label="Atingimento eStore" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress.toFixed(1)+'"><i style="width:'+progress.toFixed(1)+'%"></i></div></div>'+
     '<div class="estore-live-metrics">'+
     metric("PEDIDOS",has?orders+(orderGoal?" / "+orderGoal:""):"—")+
     metric("ATINGIMENTO DA META",pct(att),att!==null&&att>=100?"positive":"")+
     metric("DESVIO META",deviation===null?"—":(deviation<0?"− ":"+ ")+money(Math.abs(deviation)),deviation===null?"":deviation>=0?"positive":"negative")+
     metric("VENDA REAL DA LOJA",shop?money(shop.sale):"—")+'</div>'+
     '<div class="estore-live-share-real"><span>SHARE eSTORE SOBRE VENDA REAL</span><strong>'+pct(share)+'</strong>'+
     '<small>'+(share===null?"Aguardando captação eStore e venda da loja válidas para esta data.":
     "Captação eStore ÷ venda real acumulada da filial. As duas atualizações podem ter horários diferentes.")+'</small>'+
     '<div class="estore-share-bases"><div>Captação eStore<b>'+(has?money(cap):"—")+'</b><small>Atualizada às '+eDate+'</small></div>'+
     '<div>Venda real da filial<b>'+(shop?money(shop.sale):"—")+'</b><small>Atualizada às '+rDate+'</small></div></div></div>';
 }
 async function update(force=false){
   if(!visible())return;
   const c=ctx(),k=ctxKey(c);
   if(!c.store||c.store==="000")return;
   if(!force&&k===lastKey&&Date.now()-lastRequest<60000)return;
   controller?.abort();
   const ctrl=new AbortController(),id=++seq;
   controller=ctrl;lastKey=k;lastRequest=Date.now();
   const timeout=setTimeout(()=>ctrl.abort(),15000),button=$("estoreLiveRefresh");
   if(button){button.disabled=true;button.textContent="Consultando…";}
   status("Consultando o Hora a Hora eStore oficial…");
   $("estoreLiveTitle").textContent="Loja "+c.store+" • "+brDate(c.date);
   try{
     const response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({action:"hourly_get",result_date:c.date}),signal:ctrl.signal,cache:"no-store"});
     const data=await response.json().catch(()=>({}));
     if(!response.ok||data.ok!==true||!Array.isArray(data.stores))throw new Error(data.error||"Consulta eStore indisponível.");
     if(data.result_date&&String(data.result_date)!==c.date)throw new Error("A API retornou outra data.");
     if(id!==seq||ctxKey(ctx())!==k)return;
     const row=data.stores.find(x=>norm(x.st)===c.store);
     if(!row)throw new Error("Filial não encontrada na parcial eStore.");
     loadedEstore=row;loadedEstoreKey=k;render(row,c);
   }catch(e){
     if(id!==seq||ctxKey(ctx())!==k)return;
     loadedEstore=null;loadedEstoreKey="";
     const grid=$("estoreLiveGrid");if(grid)grid.textContent="Não foi possível carregar a parcial eStore. Tente atualizar.";
     status(e?.name==="AbortError"?"Tempo de consulta esgotado.":String(e?.message||"Falha na consulta"),"warning");
   }finally{
     clearTimeout(timeout);
     if(id===seq){controller=null;if(button){button.disabled=false;button.textContent="↻ Atualizar";}}
   }
 }
 function currencyInput(value){
   const raw=String(value??"").trim().replace(/\s/g,"");
   if(!/^\d+(?:[.,]\d{1,2})?$/.test(raw))return null;
   const n=Number(raw.replace(",","."));return Number.isFinite(n)?n:null;
 }
 async function submit(e){
   e.preventDefault();
   if(!state.logged||submitting)return;
   const c=ctx(),captured=currencyInput($("estoreHourAmount")?.value),o=String($("estoreHourOrders")?.value||"").trim(),
     orders=/^\d+$/.test(o)?Number(o):null;
   if(captured===null||orders===null||!Number.isSafeInteger(orders)){
     feedback("Informe venda válida e quantidade inteira de pedidos, sem valores negativos.","error");return;
   }
   if(captured===0&&orders===0&&!window.confirm("Registrar uma parcial eStore com valores zerados?"))return;
   submitting=true;const button=$("estoreHourSubmit");
   if(button){button.disabled=true;button.textContent="Registrando…";}
   feedback("Enviando para a base oficial do eStore…");
   try{
     const response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
       body:JSON.stringify({action:"hourly_submit",matricula:String(state.matricula),store_code:c.store,result_date:c.date,
         captured,orders,store_sales:0,incremental:true,source:state.role==="administrador"?"admin":"store"})});
     const data=await response.json().catch(()=>({}));
     if(!response.ok||data.ok!==true)throw new Error(data.error||"Lançamento não autorizado pelo eStore. Verifique suas permissões.");
     if(ctxKey(ctx())===ctxKey(c)){
       $("estoreHourAmount").value="";$("estoreHourOrders").value="";
       feedback("Parcial somada ao eStore oficial. Atualizando o share…","success");
       await update(true);
     }else feedback("Lançamento registrado; a filial em tela mudou. Consulte a filial correta.","success");
   }catch(err){feedback("Não foi possível registrar: "+String(err?.message||"erro de conexão"),"error");}
   finally{submitting=false;if(button){button.disabled=false;button.textContent="＋ Adicionar ao acumulado";}}
 }
 function gotoHour(){
   if(!state.logged)return;
   setSection("estore");
   setTimeout(()=>{
     $("estoreHourEntry")?.scrollIntoView({behavior:"smooth",block:"start"});
     void update(true);
   },180);
 }
 function quickFab(){
   if($("estoreQuickFab"))return;
   const btn=document.createElement("button");
   btn.type="button";btn.id="estoreQuickFab";
   btn.setAttribute("aria-label","Abrir Hora a Hora eStore no Meu Acompanhamento");
   btn.innerHTML='<span aria-hidden="true">◷</span><b>eStore<br>HH</b>';
   btn.addEventListener("click",gotoHour);
   document.body.appendChild(btn);
 }
 function tick(){
   if(!visible())return;
   const k=ctxKey(ctx());
   if(k!==lastKey){lastKey="";loadedEstore=null;loadedEstoreKey="";void update(true);}
   else if(Date.now()-lastRequest>=60000)void update();
 }
 function init(){
   if(!$("estoreLivePanel"))return;
   quickFab();
   $("estoreHourForm")?.addEventListener("submit",submit);
   $("estoreLiveRefresh")?.addEventListener("click",()=>void update(true));
   $("estoreHubQuick")?.addEventListener("click",e=>{e.preventDefault();gotoHour();});
   document.addEventListener("click",e=>{if(e.target.closest('[data-section="estore"],[data-clarity-section="estore"]'))setTimeout(tick,140);});
   document.addEventListener("ma:dashboard-ready",event=>{
     loadedRetailStore=norm(event.detail?.store);loadedRetailDate=String(event.detail?.business_date||"");
     if(visible()){
       const c=ctx();
       if(loadedEstore&&loadedEstoreKey===ctxKey(c))render(loadedEstore,c);
       else void update(true);
     }
   });
   document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastRequest=0;tick();}});
   window.addEventListener("focus",()=>{lastRequest=0;tick();});
   window.addEventListener("pageshow",()=>{lastRequest=0;tick();});
   setInterval(tick,7000);
   tick();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
