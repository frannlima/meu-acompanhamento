/* eStore CE+PI • performance operacional v3.
 * Única fonte da captação: hourly_get oficial.
 * Denominador do share: venda REAL registrada no Meu Acompanhamento.
 * Nunca utilizar a meta da loja como substituta da venda.
 */
(function(){
  "use strict";
  const API="https://fndkjgveeojlywkdrtxe.supabase.co/functions/v1/estore-api";
  const $=id=>document.getElementById(id);
  const storesAllowed=new Set(["073","084","108","113","138","142","146","175","177","222","238","258","262","314","318","344","350","552"]);
  const currency=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
  const count=v=>Math.trunc(Number(v)||0).toLocaleString("pt-BR");
  const percent=(v,digits=1)=>v===null||!Number.isFinite(v)?"—":v.toLocaleString("pt-BR",{minimumFractionDigits:digits,maximumFractionDigits:digits})+"%";
  const escHtml=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const code=v=>String(v||"").replace(/\D/g,"").padStart(3,"0");
  const context=()=>({store:code(state.storeCode),date:localDate(),id:String(state.matricula||"")});
  const same=(a,b)=>a?.store===b?.store&&a?.date===b?.date&&a?.id===b?.id;
  const hasOwnRole=()=>["administrador","gerente","supervisor"].includes(state.role);
  const signedMoney=v=>(v>=0?"+ ":"− ")+currency(Math.abs(v));
  const signedOrders=v=>(v>0?"+ ":"")+count(v);
  const validTime=(iso,day)=>{
    if(!iso||!Number.isFinite(Date.parse(iso)))return false;
    return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso))===day;
  };
  const time=iso=>iso&&Number.isFinite(Date.parse(iso))?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit"}).format(new Date(iso)):"—";
  let activeCtx=null,rows=null,tickets=null,shop=null,regionSales=null,loadingExtras=false,pollTimer=0,requestSeq=0;

  function currentRow(){return rows?.find(r=>code(r.st)===context().store)||null;}
  function ownRetail(){
    if(shop&&validTime(shop.captured_at,context().date)&&shop.has_input&&Number(shop.sales_financial)>0)return shop;
    const row=state.day||{};
    if(row.has_input&&validTime(row.captured_at,context().date)&&Number(row.sales_financial)>0)return row;
    return null;
  }
  function shareFor(cap,sale){return Number(sale)>0?cap/Number(sale)*100:null;}
  function stat(label,val,variant=""){return '<div class="eo-stat '+variant+'"><span>'+label+'</span><b>'+val+'</b></div>';}
  function subtitle(k){return k===null?'—':percent(k,2)}
  function paintSummary(){
    const host=$("estoreOpsSummary"),orders=$("estoreOpsOrders");
    if(!host||!orders||!state.logged)return;
    const c=context(),r=currentRow();
    if(!r){
      host.innerHTML='<div class="eo-wait"><b>Aguardando resultado oficial eStore</b><p>Abra esta tela ou toque em Atualizar para consultar a parcial.</p></div>';
      orders.innerHTML="";
      return;
    }
    const fed=!!r.updated_at,cap=Number(r.captured)||0,meta=Number(r.metaValue)||0,
      n=Math.trunc(Number(r.orders)||0),orderGoal=Math.trunc(Number(r.orderTarget)||0),
      att=meta>0?cap/meta*100:null,dev=meta>0?cap-meta:null,
      shopDay=ownRetail(),shopAmount=shopDay?Number(shopDay.sales_financial):0,
      share=fed&&shopAmount>0?shareFor(cap,shopAmount):null,
      ticket=n>0?cap/n:null,base=Number(tickets?.[c.store])||0,
      orderAtt=orderGoal>0?n/orderGoal*100:null,
      p=Math.max(0,Math.min(100,att||0));
    host.innerHTML=
      '<div class="eo-topline"><div><small>'+c.date.split("-").reverse().join("/")+' • Loja '+c.store+'</small><h2>eStore do dia</h2></div>'+
      '<span class="eo-update">↻ '+(fed?'Última parcial '+time(r.updated_at):'Aguardando 1ª parcial')+'</span></div>'+
      '<div class="eo-main-grid"><div class="eo-feature"><span>VENDA eSTORE ACUMULADA</span>'+
      '<strong>'+(fed?currency(cap):"—")+'</strong>'+
      '<div class="eo-meter" role="progressbar" aria-label="Atingimento financeiro" aria-valuenow="'+p.toFixed(1)+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+p.toFixed(1)+'%"></i></div>'+
      '<div class="eo-feature-foot"><span>Meta eStore: '+(meta>0?currency(meta):"não cadastrada")+'</span><b>'+percent(att)+'</b></div></div>'+
      '<div class="eo-side">'+stat("Atingimento",percent(att),att!==null&&att>=100?"eo-ok":"")+
      stat("Desvio financeiro",dev===null?"—":signedMoney(dev),dev!==null&&dev<0?"eo-bad":"eo-ok")+
      '<div class="eo-share"><span>SHARE SOBRE VENDA REAL DA LOJA</span><b>'+percent(share,2)+'</b>'+
      '<small>'+(share===null?"Aguardando venda válida da loja e captação eStore":'eStore '+currency(cap)+' ÷ loja '+currency(shopAmount))+'</small></div></div></div>';
    orders.innerHTML='<div class="eo-card-heading"><div><span class="eyebrow">DESEMPENHO COMERCIAL</span><h2>Pedidos e ticket médio</h2></div>'+
      '<span class="eo-update">Meta de pedidos oficial</span></div>'+
      '<div class="eo-orders-grid">'+stat("Meta de pedidos",orderGoal?count(orderGoal):"—")+
      stat("Pedidos do dia",fed?count(n):"—")+
      stat("Atingimento de pedidos",percent(orderAtt))+
      stat("Desvio de pedidos",orderGoal&&fed?signedOrders(n-orderGoal):"—",fed&&n<orderGoal?"eo-bad":"eo-ok")+'</div>'+
      '<div class="eo-tickets">'+stat("Ticket médio entregue",ticket===null?"—":currency(ticket))+
      stat("Ticket base oficial",base>0?currency(base):"—")+'</div>'+
      '<small class="eo-footnote">Ticket entregue = captação ÷ pedidos. Meta de pedidos e ticket-base seguem as referências cadastradas no eStore. Sem pedidos, o ticket entregue não é calculado.</small>';
  }

  function getRealSales(st){
    if(regionSales){
      const x=regionSales.get(st);
      if(x?.has_input&&validTime(x.captured_at,context().date)&&Number(x.sales_financial)>0)return Number(x.sales_financial);
    }
    if(st===context().store)return Number(ownRetail()?.sales_financial)||0;
    return 0;
  }
  function paintRegion(){
    const pane=$("estoreOpsRegional"),host=$("estoreOpsRegionalBody");
    if(!pane||!host||pane.classList.contains("hidden"))return;
    if(!rows){
      host.innerHTML='<p class="eo-wait">Aguardando os dados oficiais da regional.</p>';return;
    }
    const all=rows.filter(r=>storesAllowed.has(code(r.st))).slice().sort((a,b)=>Number(a.st)-Number(b.st));
    const total=all.reduce((acc,r)=>{
      const v=Number(r.captured)||0,m=Number(r.metaValue)||0,sale=getRealSales(code(r.st));
      acc.meta+=m;acc.captured+=v;acc.orders+=Number(r.orders)||0;acc.orderGoal+=Number(r.orderTarget)||0;
      if(sale>0){acc.retail+=sale;acc.matched++;acc.matchedCap+=v;}else if(v>0)acc.unmatched++;
      return acc;
    },{meta:0,captured:0,orders:0,orderGoal:0,retail:0,matched:0,matchedCap:0,unmatched:0});
    const share=total.retail>0&&total.unmatched===0?total.matchedCap/total.retail*100:null;
    host.innerHTML='<div class="eo-region-head"><div><span class="eyebrow">CE+PI • '+context().date.split("-").reverse().join("/")+'</span><h2>Acumulado regional por loja</h2></div>'+
      '<span class="eo-update">'+all.filter(r=>!!r.updated_at).length+' de '+all.length+' lojas atualizaram</span></div>'+
      '<div class="eo-region-kpis">'+stat("Meta regional",currency(total.meta))+
      stat("Captação",currency(total.captured))+
      stat("Desvio",signedMoney(total.captured-total.meta),total.captured<total.meta?"eo-bad":"eo-ok")+
      stat("Pedidos",count(total.orders)+" / "+count(total.orderGoal))+
      stat("Ticket entregue",total.orders>0?currency(total.captured/total.orders):"—")+
      stat("Share real regional",percent(share,2))+'</div>'+
      '<div class="eo-table-wrap"><table class="eo-table"><thead><tr>'+
      '<th>Loja</th><th>Meta eStore</th><th>Venda eStore</th><th>Desvio</th><th>Share real</th><th>Pedidos</th><th>Ticket entregue</th><th>Ticket base</th></tr></thead><tbody>'+
      all.map(r=>{
        const st=code(r.st),meta=Number(r.metaValue)||0,cap=Number(r.captured)||0,
          storeSale=getRealSales(st),ticket=Number(tickets?.[st])||0,order=Number(r.orders)||0;
        const fed=!!r.updated_at;
        return '<tr><th>'+escHtml(st)+'</th><td>'+currency(meta)+'</td>'+
          '<td>'+(fed?currency(cap):"Sem parcial")+'</td>'+
          '<td class="'+(cap-meta<0?"eo-negative":"eo-positive")+'">'+(fed?signedMoney(cap-meta):"—")+'</td>'+
          '<td>'+(fed&&storeSale>0?percent(shareFor(cap,storeSale),2):"—")+'</td>'+
          '<td>'+(fed?count(order):"—")+' / '+count(r.orderTarget)+'</td>'+
          '<td>'+(order>0?currency(cap/order):"—")+'</td>'+
          '<td>'+(ticket>0?currency(ticket):"—")+'</td></tr>';
      }).join("")+'</tbody></table></div>'+
      '<p class="eo-footnote">Share = captação eStore ÷ venda real do Hora a Hora da loja. Uma loja sem venda real válida exibe “—”. O share regional só aparece quando não há captação sem denominador disponível; as lojas sem input não são tratadas como venda zero confirmada.</p>'+
      (state.role!=="administrador"?'<p class="eo-footnote">As vendas reais das demais filiais exigem permissão administrativa na base do Meu Acompanhamento; seus shares ficam indisponíveis neste perfil.</p>':'');
  }

  function renderAll(){
    const entry=$("estoreHourEntry");
    if(entry)entry.classList.toggle("hidden",state.logged&&!hasOwnRole());
    paintSummary();paintRegion();
  }
  async function loadExtras(c){
    if(loadingExtras)return;
    loadingExtras=true;
    const id=++requestSeq;
    try{
      const promises=[
        fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
          body:JSON.stringify({action:"content_get",matricula:c.id})}).then(async r=>{
            const j=await r.json();if(!r.ok||j.ok!==true)throw Error(j.error||"Base de ticket indisponível");
            return j.historicalTickets?.values||{};
          }).catch(()=>null),
        api("dashboard",{matricula:c.id,business_date:c.date,store_code:c.store}).catch(()=>null),
        state.role==="administrador"?api("regional",{matricula:c.id,business_date:c.date}).catch(()=>null):Promise.resolve(null)
      ];
      const [tk,my,regional]=await Promise.all(promises);
      if(id!==requestSeq||!same(c,context()))return;
      tickets=tk;shop=my;
      regionSales=Array.isArray(regional)?new Map(regional.map(r=>[code(r.store_code),r])):null;
      renderAll();
    }finally{loadingExtras=false;}
  }
  function onHourly(event){
    const c=context(),detail=event.detail||{};
    if(!same({...detail.context,id:c.id},c)||!Array.isArray(detail.stores))return;
    if(!same(activeCtx,c)){
      activeCtx={...c};rows=null;shop=null;regionSales=null;tickets=null;
    }
    rows=detail.stores;
    renderAll();
    if(!loadingExtras)void loadExtras(c);
  }
  function onError(event){
    if(!same({...event.detail?.context,id:context().id},context()))return;
    if(rows)return; // mantém o último resultado íntegro em consultas pontualmente indisponíveis
    const host=$("estoreOpsSummary");if(host)host.innerHTML=
      '<div class="eo-wait"><b>Parcial indisponível</b><p>'+escHtml(event.detail?.message||"Não foi possível consultar a fonte oficial.")+'</p></div>';
  }
  function toggleRegion(){
    const pane=$("estoreOpsRegional"),button=$("estoreOpsRegionalToggle");
    if(!pane||!button)return;
    const show=pane.classList.contains("hidden");
    pane.classList.toggle("hidden",!show);
    button.setAttribute("aria-expanded",String(show));
    button.textContent=show?"Fechar regional ▾":"Ver regional ▸";
    if(show){paintRegion();pane.scrollIntoView({behavior:"smooth",block:"start"});}
  }
  function refresh(){
    if(!state.logged||state.section!=="estore")return;
    const c=context();
    if(!same(activeCtx,c)){rows=null;shop=null;regionSales=null;tickets=null;activeCtx={...c};renderAll();}
    const official=$("estoreLiveRefresh");
    if(official)official.click();
    if(!loadingExtras)void loadExtras(c);
  }
  function init(){
    if(!$("estoreOpsSummary"))return;
    $("estoreOpsRegionalToggle")?.addEventListener("click",toggleRegion);
    $("estoreOpsRefresh")?.addEventListener("click",refresh);
    document.addEventListener("ma:estore-hourly-loaded",onHourly);
    document.addEventListener("ma:estore-hourly-error",onError);
    document.addEventListener("ma:dashboard-ready",()=>{
      if(state.section==="estore"){shop=state.day;renderAll();}
    });
    document.addEventListener("click",event=>{
      if(event.target.closest('[data-section="estore"]'))setTimeout(refresh,160);
    });
    window.addEventListener("storage",event=>{
      if(event.key==="estore_hourly_changed_v3" && state.section==="estore")refresh();
    });
    document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.section==="estore")refresh();});
    pollTimer=setInterval(()=>{if(state.logged&&state.section==="estore"&&!document.hidden&&!loadingExtras)refresh();},60000);
    renderAll();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();