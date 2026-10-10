/* Meu Acompanhamento • Parcial do Hora a Hora eStore CE+PI
 * Integração de consulta: não altera nem replica lançamentos do eStore.
 */
(function(){
  "use strict";
  const API="https://fndkjgveeojlywkdrtxe.supabase.co/functions/v1/estore-api";
  const PERIOD_MS=60000;
  let requestId=0,controller=null,lastContext="",lastAttempt=0;

  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
  const number=v=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0}).format(Number(v)||0);
  const percent=(v,digits=1)=>v==null?"—":new Intl.NumberFormat("pt-BR",{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v)+"%";
  const atTime=d=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit"}).format(d);
  const dateLabel=iso=>iso.split("-").reverse().join("/");
  const normalizeStore=s=>String(s||"").replace(/[^0-9]/g,"").padStart(3,"0");
  const openView=()=>state.logged&&state.section==="estore"&&!document.hidden&&$("estoreLivePanel")&&$("section-estore")?.classList.contains("active");
  const context=()=>({store:normalizeStore(state.storeCode),date:localDate()});
  const keyOf=c=>c.store+"|"+c.date;
  function status(text,kind="neutral"){
    const el=$("estoreLiveStatus");
    if(el){el.textContent=text;el.dataset.kind=kind;}
  }
  function busy(on){
    const btn=$("estoreLiveRefresh");
    if(btn){btn.disabled=on;btn.textContent=on?"Consultando…":"↻ Atualizar";}
  }
  function initialState(message="Aguardando leitura do Hora a Hora oficial."){
    const grid=$("estoreLiveGrid");
    if(grid)grid.innerHTML='<div class="estore-live-placeholder">'+message+'</div>';
    const meta=$("estoreLiveMeta");
    if(meta)meta.textContent="Dados oficiais do eStore CE+PI • somente leitura";
  }
  function metric(title,value,kind=""){
    return '<div class="estore-live-metric '+kind+'"><span>'+title+'</span><strong>'+value+'</strong></div>';
  }
  function render(data,store,date){
    const el=$("estoreLiveGrid");
    if(!el)return;
    const metaValue=Math.max(0,Number(data.metaValue)||0);
    const captured=Math.max(0,Number(data.captured)||0);
    const orders=Math.max(0,Math.trunc(Number(data.orders)||0));
    const orderTarget=Math.max(0,Math.trunc(Number(data.orderTarget)||0));
    const storeSales=Math.max(0,Number(data.storeSales)||0);
    const att=metaValue>0?captured/metaValue*100:null;
    // Share do Hora a Hora: venda captada eStore / venda da filial informada no painel.
    const share=storeSales>0?captured/storeSales*100:null;
    const deviation=metaValue>0?captured-metaValue:null;
    const updated=typeof data.updated_at==="string"&&data.updated_at.trim()?new Date(data.updated_at):null;
    const validUpdate=updated&&Number.isFinite(updated.getTime());
    const fed=!!data.updated_at;
    const progress=att===null?0:Math.max(0,Math.min(100,att));
    const tone=deviation===null?"":deviation>=0?"positive":"negative";
    const statusText=!fed?"Aguardando o primeiro lançamento da filial no Hora a Hora."
      :captured===0?"Último lançamento sem captação registrada."
      :"Parcial disponível • atualizada a partir do Hora a Hora.";
    status(statusText,fed?(captured>0?"success":"neutral"):"neutral");
    $("estoreLiveTitle").textContent="Loja "+store+" • "+dateLabel(date);
    $("estoreLiveMeta").textContent="Último lançamento: "+(validUpdate?atTime(updated):fed?"horário indisponível":"ainda não realizado")+
      "  •  Consulta: "+atTime(new Date());
    const ordersLabel=orderTarget>0?number(orders)+" / "+number(orderTarget):number(orders);
    const devLabel=deviation===null?"—":(deviation>=0?"+ ":"− ")+money(Math.abs(deviation));
    el.innerHTML=
      '<div class="estore-live-highlight">'+
        '<span>VENDA CAPTADA • eSTORE</span>'+
        '<strong>'+money(captured)+'</strong>'+
        '<small>Meta eStore da filial: '+(metaValue>0?money(metaValue):"sem meta cadastrada")+'</small>'+
        '<div class="estore-live-bar" role="progressbar" aria-label="Atingimento da meta eStore" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress.toFixed(1)+'">'+
          '<i style="width:'+progress.toFixed(1)+'%"></i>'+
        '</div>'+
      '</div>'+
      '<div class="estore-live-metrics">'+
        metric("PEDIDOS",ordersLabel)+
        metric("ATINGIMENTO",percent(att,1),att!==null&&att>=100?"positive":"")+
        metric("SHARE DA FILIAL",percent(share,2))+
        metric("DESVIO DA META",devLabel,tone)+
      '</div>';
  }
  async function update(force=false){
    if(!openView())return;
    const c=context(),k=keyOf(c);
    if(!c.store||c.store==="000")return;
    if(!force&&k===lastContext&&Date.now()-lastAttempt<PERIOD_MS)return;
    if(controller){controller.abort();controller=null;}
    lastContext=k;
    lastAttempt=Date.now();
    const id=++requestId;
    const ctrl=new AbortController();
    controller=ctrl;
    const timer=setTimeout(()=>ctrl.abort(),15000);
    busy(true);
    status("Buscando a parcial oficial do Hora a Hora eStore…");
    $("estoreLiveTitle").textContent="Loja "+c.store+" • "+dateLabel(c.date);
    try{
      const response=await fetch(API,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"hourly_get",result_date:c.date}),
        cache:"no-store",signal:ctrl.signal
      });
      if(!response.ok)throw new Error("Consulta indisponível ("+response.status+").");
      const payload=await response.json();
      if(!payload||payload.ok!==true||!Array.isArray(payload.stores)){
        throw new Error(payload?.error||"Dados oficiais indisponíveis.");
      }
      if(payload.result_date&&String(payload.result_date)!==c.date){
        throw new Error("A API retornou informações de outra data.");
      }
      if(id!==requestId||keyOf(context())!==k)return;
      const store=payload.stores.find(row=>normalizeStore(row?.st)===c.store);
      if(!store){
        initialState("A filial "+c.store+" não consta na parcial retornada pelo eStore.");
        status("Sem dados para a filial selecionada.","warning");
        return;
      }
      render(store,c.store,c.date);
    }catch(err){
      if(id!==requestId)return;
      initialState("Não foi possível consultar o resultado neste momento. Tente atualizar ou acesse o eStore CE+PI.");
      status(err?.name==="AbortError"?"Consulta demorou demais. Tente novamente.":"Falha na consulta do Hora a Hora.", "warning");
    }finally{
      clearTimeout(timer);
      if(id===requestId){controller=null;busy(false);}
    }
  }
  function tick(){
    if(!openView())return;
    const k=keyOf(context());
    if(k!==lastContext){
      lastContext="";
      initialState();
      update(true);
    }else if(Date.now()-lastAttempt>=PERIOD_MS){
      update();
    }
  }
  function init(){
    if(!$("estoreLivePanel"))return;
    $("estoreLiveRefresh")?.addEventListener("click",()=>update(true));
    document.addEventListener("click",event=>{
      if(event.target.closest('[data-section="estore"],[data-clarity-section="estore"]')){
        setTimeout(tick,130);
      }
    });
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastAttempt=0;tick();}});
    window.addEventListener("focus",()=>{lastAttempt=0;tick();});
    window.addEventListener("pageshow",()=>{lastAttempt=0;tick();});
    setInterval(tick,7000);
    tick();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();