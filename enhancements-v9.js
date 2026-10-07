
// Enhancements v9 — Meu Acompanhamento
const __baseSetSection = setSection;
const __baseLoadAll = loadAll;
const __baseRenderGroups = renderGroups;
const __baseRenderCommercials = renderCommercials;
const __baseChangeAdminStore = changeAdminStore;
const __baseRenderAdminVisual = renderAdminVisual;

function greetingByTime(){
  const hour=Number(new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",hour:"2-digit",hour12:false}).format(new Date()));
  if(hour<12) return "Bom dia";
  if(hour<18) return "Boa tarde";
  return "Boa noite";
}
function personDisplayName(person){
  const parts=String(person?.full_name||person?.first_name||state.employeeName||"Colaborador").trim().split(/\s+/);
  if(parts.length<=1) return parts[0]||"Colaborador";
  return (parts[0]+" "+parts[1]).toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
}
function jobDisplayName(job){
  const raw=String(job||"").trim().toUpperCase();
  const exact={
    "SUPERVISOR EFICIENCIA OPERACIONAL":"Supervisor de Eficiência Operacional",
    "SUPERVISOR OPERACOES":"Supervisor de Operações",
    "SUPERVISOR DE OPERACOES":"Supervisor de Operações",
    "SUPERVISOR EXPERIENCIA":"Supervisor de Experiência",
    "SUPERVISOR COMERCIAL":"Supervisor Comercial",
    "GERENTE":"Gerente",
    "GERENTE DE LOJA":"Gerente de Loja"
  };
  if(exact[raw]) return exact[raw];
  const accents={EFICIENCIA:"Eficiência",OPERACOES:"Operações",EXPERIENCIA:"Experiência",OPERACIONAL:"Operacional",COMERCIAL:"Comercial",SUPERVISOR:"Supervisor",GERENTE:"Gerente",VENDEDOR:"Vendedor",ATENDENTE:"Atendente",ASSISTENTE:"Assistente",COORDENADOR:"Coordenador"};
  return raw.split(/\s+/).map((w,i)=>{
    if(["DE","DA","DO","DAS","DOS"].includes(w)) return w.toLowerCase();
    return accents[w]||w.toLowerCase().replace(/^./,c=>c.toUpperCase());
  }).join(" ");
}
function cleanStoreName(name,code){
  let s=String(name||"").replace(/^\s*\d{3}\s*/,"").replace(/^CE\s+/i,"").replace(/^PI\s+/i,"");
  s=s.replace(/\bSH\b/gi,"").replace(/\bSHOPPING\b/gi,"").replace(/\s+/g," ").trim();
  s=s.toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
  return (code?code+" - ":"")+ (s||("Loja "+code));
}
function updateIdentity(person=state.user){
  if(!person) return;
  const greet=greetingByTime();
  if($("identityGreeting")) $("identityGreeting").textContent=greet.toUpperCase();
  if($("identityName")) $("identityName").textContent=personDisplayName(person);
  if($("identityWelcome")) $("identityWelcome").textContent="Seja bem-vindo ao seu acompanhamento de vendas.";
  const job=jobDisplayName(person.job_title||roleLabel(state.role));
  const store=cleanStoreName(person.store_name,person.store_code||state.storeCode);
  if($("identityRole")) $("identityRole").textContent=job;
  if($("identityStore")) $("identityStore").textContent=store;
  if($("mobileGreetingName")) $("mobileGreetingName").textContent=greet+", "+personDisplayName(person)+"!";
  if($("mobileGreetingMeta")) $("mobileGreetingMeta").textContent=job+" • "+store;
}

async function refreshAdminStoreCatalog(){
  if(state.role!=="administrador"||!$("adminStoreSelect")) return;
  try{
    const stores=await api("storeCatalog",{matricula:state.matricula});
    if(!Array.isArray(stores)) return;
    const current=state.storeCode;
    $("adminStoreSelect").innerHTML=stores.map(s=>'<option value="'+esc(s.code)+'">'+esc(cleanStoreName(s.name,s.code))+'</option>').join("");
    $("adminStoreSelect").value=current;
  }catch(e){ console.warn("Store catalog",e); }
}

function dailyWelcomeKey(day=localDate()){
  return "ma_acolher_"+day+"_"+state.matricula;
}

function enterMainApp(){
  if($("dailyWelcomeModal")) $("dailyWelcomeModal").classList.add("hidden");
  if($("worldModal")) $("worldModal").classList.add("hidden");
  setSection("inicio");
  window.scrollTo({top:0,behavior:"auto"});
}

window.afterMeuAcompanhamentoLogin = async function(person){
  state.user=person;
  updateIdentity(person);
  await refreshAdminStoreCatalog();

  const day=localDate();
  const key=dailyWelcomeKey(day);

  // O controle local evita repetição no mesmo aparelho mesmo se o endpoint
  // de status oscilar ou o PWA for recarregado ao voltar de um link externo.
  if(localStorage.getItem(key)==="1"){
    enterMainApp();
    return;
  }

  let already=false;
  try{
    already=!!(await api("welcomeStatus",{matricula:state.matricula,business_date:day}));
  }catch(_){
    already=false;
  }

  if(already){
    localStorage.setItem(key,"1");
    enterMainApp();
    return;
  }

  // Marca antes de exibir para impedir duplicidade por reload/retorno do mobile.
  localStorage.setItem(key,"1");
  try{
    await api("markWelcome",{matricula:state.matricula,business_date:day,store_code:state.storeCode});
  }catch(e){
    console.warn("Não foi possível registrar o acolhimento no servidor.",e);
  }

  const sup=state.role==="supervisor" || /SUPERVISOR/i.test(String(person?.job_title||""));
  if($("dailyWelcomeTitle")) $("dailyWelcomeTitle").textContent=greetingByTime()+", "+personDisplayName(person)+"!";
  if($("supervisorWelcomeBlock")) $("supervisorWelcomeBlock").classList.toggle("hidden",!sup);
  setSection("inicio");
  $("dailyWelcomeModal").classList.remove("hidden");
};

function closeDailyWelcomeFlow(){
  enterMainApp();
}

function closeSupervisorChecklist(showMessage=false){
  const modal=$("supervisorChecklistModal");
  const frame=$("supervisorChecklistFrame");
  if(modal) modal.classList.add("hidden");
  if(frame){
    frame.dataset.phase="";
    frame.dataset.openedAt="";
    frame.src="about:blank";
  }
  enterMainApp();
  if(showMessage) toast("Checklist concluído. Você voltou ao Meu Acompanhamento.");
}

function openSupervisorChecklist(event){
  if(event) event.preventDefault();
  const url=$("supervisorChecklistLink")?.href||"https://rotina-super-ria-ce-pi.franlimabreu.chatgpt.site/";
  localStorage.setItem(dailyWelcomeKey(),"1");
  enterMainApp();

  const modal=$("supervisorChecklistModal");
  const frame=$("supervisorChecklistFrame");
  if(!modal||!frame){
    const child=window.open(url,"_blank","noopener,noreferrer");
    if(!child) toast("O navegador bloqueou a abertura do checklist.",true);
    return;
  }

  frame.dataset.phase="initial";
  frame.dataset.openedAt=String(Date.now());
  frame.src=url;
  modal.classList.remove("hidden");
}

function handleChecklistFrameLoad(){
  const frame=$("supervisorChecklistFrame");
  if(!frame || !frame.dataset.phase) return;
  const openedAt=Number(frame.dataset.openedAt||0);

  if(frame.dataset.phase==="initial"){
    frame.dataset.phase="ready";
    return;
  }

  // A navegação posterior ao carregamento inicial normalmente ocorre
  // ao concluir o checklist. Fechamos o conteúdo externo antes que um
  // eventual destino de Excel substitua a experiência do app.
  if(frame.dataset.phase==="ready" && Date.now()-openedAt>1800){
    closeSupervisorChecklist(true);
  }
}

function openChecklistExternalFallback(){
  sessionStorage.setItem("ma_checklist_open","1");
  sessionStorage.setItem("ma_checklist_open_at",String(Date.now()));
  const modal=$("supervisorChecklistModal");
  if(modal) modal.classList.add("hidden");
  enterMainApp();
}

function restoreAfterChecklist(){
  if(sessionStorage.getItem("ma_checklist_open")!=="1") return;
  const openedAt=Number(sessionStorage.getItem("ma_checklist_open_at")||0);
  if(Date.now()-openedAt<1200) return;
  sessionStorage.removeItem("ma_checklist_open");
  sessionStorage.removeItem("ma_checklist_open_at");
  enterMainApp();
  toast("Você voltou ao Meu Acompanhamento.");
}

function openMobileMore(){
  const sheet=$("mobileMoreSheet");
  if(!sheet) return;
  sheet.classList.remove("hidden");
  sheet.setAttribute("aria-hidden","false");
  document.body.classList.add("mobile-sheet-open");
}

function closeMobileMore(){
  const sheet=$("mobileMoreSheet");
  if(!sheet) return;
  sheet.classList.add("hidden");
  sheet.setAttribute("aria-hidden","true");
  document.body.classList.remove("mobile-sheet-open");
}

function syncMobileDock(section){
  const more=$("mobileMoreBtn");
  if(!more) return;
  const primary=new Set(["inicio","grupos","comerciais","estore"]);
  more.classList.toggle("active",!primary.has(section));
}

changeAdminStore = async function(code){
  state.storeCode=code;
  await loadAll();
  if(state.section==="descontos") await loadDiscounts();
  if(state.section==="admin"&&state.role==="administrador") await loadDailyProductivity();
  __baseSetSection("inicio");
  if($("adminStoreSelect")) $("adminStoreSelect").value=code;
  updateIdentity(state.user);
};

setSection = function(section){
  __baseSetSection(section);
  closeMobileMore();
  syncMobileDock(section);
  if(section==="descontos") loadDiscounts();
  if(section==="comerciais") renderCommercialGroupCards();
  if(section==="admin" && state.role==="administrador"){
    loadDailyProductivity();
    renderAdminVisual();
  }
};

loadAll = async function(){
  await __baseLoadAll();
  updateIdentity(state.user);
  renderCommercialGroupCards();
  if(state.section==="descontos") await loadDiscounts();
  if(state.role==="administrador" && state.section==="admin") await loadDailyProductivity();
};

renderGroups = function(){
  __baseRenderGroups();
  const cards=[...document.querySelectorAll("#groupContent .group-card")];
  cards.forEach(card=>{
    const name=card.querySelector("h2")?.textContent||"";
    const code=GROUP_ORDER.find(c=>(GROUP_LABELS[c]||c)===name);
    const g=(state.groupSummary?.groups||[]).find(x=>x.group_code===code);
    const att=Number(g?.attainment||0);
    card.classList.remove("group-tone-good","group-tone-warn","group-tone-bad");
    card.classList.add(att>=100?"group-tone-good":att>=90?"group-tone-warn":"group-tone-bad");
  });
};

function renderCommercialGroupCards(){
  const box=$("commercialGroupCards");
  if(!box) return;
  const groups=Array.isArray(state.groupSummary?.groups)?state.groupSummary.groups:[];
  box.innerHTML=GROUP_ORDER.map((code,idx)=>{
    const g=groups.find(x=>x.group_code===code)||{};
    const target=Number(g.target_financial||0), sale=Number(g.sales_financial||0);
    const att=target?sale/target*100:0, dev=sale-target;
    const ev=g.evolution_vs_ly===null||g.evolution_vs_ly===undefined?null:Number(g.evolution_vs_ly);
    const interval=Number(g.interval_sales_financial||0);
    const tone=!state.day?.has_input?"neutral":att>=100?"good":att>=90?"warn":"bad";
    return '<article class="commercial-group-card tone-'+tone+' tone-'+(idx%6)+'">'+
      '<div class="commercial-group-top"><span>'+esc(GROUP_LABELS[code]||code)+'</span><b>'+pct(att)+'</b></div>'+
      '<strong>'+money(sale,0)+'</strong>'+
      '<div class="commercial-group-grid">'+
        '<small>Desvio <b class="'+(dev>=0?"positive":"negative")+'">'+signedMoney(dev,0)+'</b></small>'+
        '<small>Vs LY <b class="'+(ev===null?"":ev>=0?"positive":"negative")+'">'+(ev===null?"—":pct(ev))+'</b></small>'+
        '<small>Último input <b>'+signedMoney(interval,0)+'</b></small>'+
      '</div>'+
    '</article>';
  }).join("");
}
renderCommercials = function(){
  __baseRenderCommercials();
  renderCommercialGroupCards();
};

async function loadDiscounts(){
  const kpis=$("discountKpis");
  if(!kpis) return;
  try{
    const data=await api("discounts",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode});
    state.discounts=data||{};
    renderDiscounts();
  }catch(e){
    kpis.innerHTML='<div class="notice">'+esc(e.message)+'</div>';
  }
}
function discountBar(label,value,max,meta=""){
  const width=max>0?Math.max(2,Math.min(100,Number(value||0)/max*100)):0;
  return '<div class="discount-bar-row"><div class="discount-bar-label"><strong>'+esc(label)+'</strong><span>'+esc(meta)+'</span></div><div class="discount-track"><i style="width:'+width+'%"></i></div><b>'+money(value,2)+'</b></div>';
}
function renderDiscounts(){
  const d=state.discounts||{};
  const groups=Array.isArray(d.groups)?d.groups:[];
  const worlds=Array.isArray(d.worlds)?d.worlds:[];
  const dcos=Array.isArray(d.dcos)?d.dcos:[];
  const totalDiscount=Number(d.total_discount||0), totalSales=Number(d.total_sales||0), dp=Number(d.discount_pct||0);
  const topGroup=groups[0],topDco=dcos[0];
  $("discountKpis").innerHTML=[
    kpi("Valor de descontos",money(totalDiscount,2),totalSales?"Sobre venda "+money(totalSales,0):"Aguardando venda",dp<=1?"positive":dp<=2?"warning":"negative"),
    kpi("% sobre a venda",pct(dp),"Desconto total ÷ venda líquida",dp<=1?"positive":dp<=2?"warning":"negative"),
    kpi("DCOs com desconto",num(d.dcos_with_discount||0),"Incidências por DCO"),
    kpi("Maior impacto",topDco?topDco.dco_code+" • "+topDco.dco_name:"—",topDco?money(topDco.discount_value,2):"Sem input",topDco?"negative":"")
  ].join("");
  const maxWorld=Math.max(0,...worlds.map(x=>Number(x.discount_value||0)));
  $("discountWorldChart").innerHTML=worlds.length?worlds.map(w=>discountBar(WORLD_LABELS[w.world_code]||w.world_code,w.discount_value,maxWorld,pct(w.share_of_discount)+" do desconto")).join(""):'<div class="empty-box">Aguardando o primeiro input.</div>';
  const maxGroup=Math.max(0,...groups.map(x=>Number(x.discount_pct||0)));
  $("discountGroupChart").innerHTML=groups.length?groups.map(g=>{
    const pctSale=Number(g.discount_pct||0);
    const width=maxGroup?Math.max(2,pctSale/maxGroup*100):0;
    return '<div class="discount-bar-row"><div class="discount-bar-label"><strong>'+esc(GROUP_LABELS[g.group_code]||g.group_code)+'</strong><span>'+num(g.dcos_with_discount)+' DCO(s) com desconto</span></div><div class="discount-track percent"><i style="width:'+width+'%"></i></div><b>'+pct(pctSale)+'</b></div>';
  }).join(""):'<div class="empty-box">Aguardando o primeiro input.</div>';
  $("discountDcoTable").innerHTML=dcos.length?dcos.slice(0,20).map(r=>
    '<tr><td><b>'+esc(r.dco_code)+'</b> • '+esc(r.dco_name)+'</td><td>'+esc(GROUP_LABELS[r.group_code]||r.group_code)+'</td><td>'+money(r.sales_financial,2)+'</td><td class="negative">'+money(r.discount_value,2)+'</td><td class="'+(Number(r.discount_pct)<=1?"positive":"negative")+'">'+pct(r.discount_pct)+'</td><td>'+pct(r.share_of_discount)+'</td></tr>'
  ).join(""):'<tr><td colspan="6" class="empty-cell">Nenhum desconto identificado no último input.</td></tr>';
  const topGroupText=topGroup?(GROUP_LABELS[topGroup.group_code]||topGroup.group_code)+" concentra "+pct(topGroup.share_of_discount)+" dos descontos":"Aguardando dados";
  $("discountInsight").innerHTML='<div><span>LEITURA GERENCIAL</span><strong>'+esc(topGroupText)+'</strong></div>'+
    '<div><span>IMPORTANTE</span><strong>A incidência representa DCOs com desconto; a venda web não informa a quantidade de transações com desconto.</strong></div>';
}

async function loadDailyProductivity(){
  if(state.role!=="administrador") return;
  try{
    const data=await api("productivity",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode});
    state.productivity=data||{groups:[]};
    renderDailyProductivity();
    renderAdminVisual();
  }catch(e){toast(e.message,true)}
}
loadScales = loadDailyProductivity;
function renderDailyProductivity(){
  const d=state.productivity||{};
  const groups=Array.isArray(d.groups)?d.groups:[];
  if($("hcDateLabel")) $("hcDateLabel").textContent=new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");
  if($("productivityKpis")) $("productivityKpis").innerHTML=[
    kpi("HC disponível",num(d.total_hc||0),"Total informado no dia"),
    kpi("Venda física",num(d.total_physical||0)+" peças","Último input"),
    kpi("Peças / HC",Number(d.pieces_per_hc||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}),"Produtividade física geral"),
    kpi("Venda / HC",money(d.financial_per_hc||0,2),"Produtividade financeira geral")
  ].join("");
  if($("hcInputsGrid")) $("hcInputsGrid").innerHTML=GROUP_ORDER.map(code=>{
    const g=groups.find(x=>x.group_code===code)||{};
    return '<label class="hc-input-card"><span>'+esc(GROUP_LABELS[code]||code)+'</span><input type="number" min="0" step="1" data-hc-group="'+code+'" value="'+Number(g.hc_available||0)+'"><small>'+num(g.sales_physical||0)+' peças no último input</small></label>';
  }).join("");
  const max=Math.max(0,...groups.map(g=>Number(g.pieces_per_hc||0)));
  if($("productivityBars")) $("productivityBars").innerHTML=groups.map(g=>{
    const v=Number(g.pieces_per_hc||0),width=max?Math.max(2,v/max*100):0;
    return '<div class="prod-bar"><span>'+esc(GROUP_LABELS[g.group_code]||g.group_code)+'</span><div><i style="width:'+width+'%"></i></div><b>'+v.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+'</b></div>';
  }).join("");
  if($("productivityTable")) $("productivityTable").innerHTML=groups.map(g=>
    '<tr><td><b>'+esc(GROUP_LABELS[g.group_code]||g.group_code)+'</b></td><td>'+num(g.hc_available)+'</td><td>'+num(g.sales_physical)+'</td><td>'+Number(g.pieces_per_hc||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+'</td><td>'+money(g.sales_financial,2)+'</td><td>'+money(g.financial_per_hc,2)+'</td></tr>'
  ).join("");
}
async function saveDailyHC(){
  const entries=[...document.querySelectorAll("[data-hc-group]")].map(el=>({group_code:el.dataset.hcGroup,hc_available:Number(el.value||0)}));
  const btn=$("saveDailyHCBtn"),fb=$("hcFeedback");
  btn.disabled=true;btn.textContent="Salvando...";
  try{
    await api("saveDailyHC",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode,entries});
    fb.textContent="HC do dia salvo. A produtividade foi recalculada com o último input.";
    fb.className="form-error form-success";
    await loadDailyProductivity();
    toast("HC do dia atualizado.");
  }catch(e){fb.textContent=e.message;fb.className="form-error";toast(e.message,true)}
  finally{btn.disabled=false;btn.textContent="Salvar HC do dia"}
}

renderAdminVisual = function(){
  const box=$("adminVisualSummary");
  if(!box||state.role!=="administrador") return;
  const d=state.day||{},p=state.productivity||{};
  const mapped=Array.isArray(state.dcoCatalog)?state.dcoCatalog.length:0;
  box.innerHTML=
    visualDonut("Meta do dia",d.has_target?100:0,d.has_target?"OK":"—",d.has_target?"Meta carregada":"Meta pendente",d.has_target?"good":"bad")+
    visualDonut("DCOs mapeados",mapped?100:0,mapped?String(mapped):"—","Estrutura ativa",mapped?"good":"neutral")+
    visualDonut("Input da loja",d.has_input?100:0,d.has_input?"ATIVO":"0",d.has_input?"Snapshot válido hoje":"Aguardando venda",d.has_input?"good":"warn")+
    visualDonut("HC disponível",Number(p.total_hc||0)>0?100:0,String(p.total_hc||0),"Colaboradores informados no dia",Number(p.total_hc||0)>0?"good":"neutral");
};

async function importMonthlyTargets(file){
  if(!file) return;
  const status=$("targetImportStatus");
  if(!confirm("Importar "+file.name+" e atualizar as metas por DCO?")){ $("monthlyTargetFile").value=""; return; }
  status.className="import-status loading";status.textContent="Lendo arquivo e validando metas...";
  try{
    const buf=await file.arrayBuffer();
    let binary="";const bytes=new Uint8Array(buf);const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    const b64=btoa(binary);
    const r=await api("importTargets",{
      matricula:state.matricula,
      filename:file.name,
      file_base64:b64
    })||{};
    status.className="import-status success";
    status.innerHTML='<strong>Importação concluída.</strong> '+num(r.rows_imported)+' linhas • '+num(r.stores)+' lojas • '+num(r.dcos)+' DCOs • período '+esc(r.date_from||"—")+' a '+esc(r.date_to||"—")+'.';
    await loadAll();
    toast("Metas do mês atualizadas.");
  }catch(e){
    status.className="import-status error";status.textContent="Falha na importação: "+(e.message||"erro não identificado");toast(e.message||"Falha na importação.",true);
  }finally{$("monthlyTargetFile").value=""}
}

function canvasRoundedRect(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
}
function loadCanvasImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src})}
async function createGroupPanelImage(){
  const d=state.day||{};
  const groups=GROUP_ORDER.map(code=>(state.groupSummary?.groups||[]).find(g=>g.group_code===code)).filter(Boolean);
  const width=1840,rowH=46,height=360+(groups.length+1)*rowH+165;
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d");
  const C={
    green:"#173F35",green2:"#466964",cream:"#F7F4ED",line:"#DAD9D6",white:"#FFFFFF",
    orange:"#DE7C00",red:"#AE535C",good:"#2E6B58",ink:"#17352E",muted:"#6F7C77",
    goodBg:"#DDEFE5",warnBg:"#F7E9A5",badBg:"#F8D8D5",riskBg:"#F7E1E3",projectionBg:"#EEF5EF"
  };
  const perfFill=(v,good=100,warn=70)=>Number(v)>=good?C.goodBg:Number(v)>=warn?C.warnBg:C.badBg;
  const perfText=(v,good=100,warn=70)=>Number(v)>=good?C.good:Number(v)>=warn?"#7A6400":C.red;
  ctx.fillStyle=C.white;ctx.fillRect(0,0,width,height);
  ctx.fillStyle=C.green;ctx.fillRect(0,0,width,130);

  try{
    const logo=await loadCanvasImage("./assets/riachuelo-logo-vertical.svg");
    canvasRoundedRect(ctx,42,20,90,90,18,"#F8F6F0");
    ctx.drawImage(logo,51,29,72,72);
  }catch(_){}

  ctx.fillStyle=C.white;ctx.font="800 30px Arial";ctx.textAlign="left";
  ctx.fillText("DESEMPENHO POR GRUPO DE VENDA",175,55);
  ctx.font="400 15px Arial";ctx.fillStyle="#D6D2C4";
  ctx.fillText("Parcial hora a hora • Loja "+state.storeCode+" • "+new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR")+" • "+(d.captured_at?"Atualizado "+localTime(d.captured_at):"sem input"),175,87);
  ctx.textAlign="right";ctx.font="700 13px Arial";ctx.fillStyle=C.white;
  ctx.fillText("MODA QUE INSPIRA O BRASIL",width-42,63);
  ctx.textAlign="left";

  const target=Number(d.target_financial||0),sale=Number(d.sales_financial||0),ly=Number(d.ly_financial||0);
  const att=target?sale/target*100:0,dev=sale-target,ev=ly&&d.has_input?((sale/ly)-1)*100:null;
  const intGrowth=d.interval_growth_pct===null||d.interval_growth_pct===undefined?null:Number(d.interval_growth_pct);
  const remaining=calcClock(),interval=Number(d.interval_sales_financial||0),mins=Number(d.interval_minutes||0);
  const rate=d.has_input&&mins>0?interval/(mins/60):0;
  const projection=d.has_input&&rate>0?sale+rate*remaining:0;
  const projAtt=target&&projection?projection/target*100:0;

  const cards=[
    ["META DO DIA",money(target,0),C.cream,C.ink],
    ["VENDA ATUAL",money(sale,0),C.cream,C.ink],
    ["PROJEÇÃO",projection?money(projection,0):"—",projection?perfFill(projAtt,100,90):C.projectionBg,projection?perfText(projAtt,100,90):C.ink],
    ["VS LY",ev===null?"—":pct(ev),ev===null?C.cream:(ev>=0?C.goodBg:C.riskBg),ev===null?C.ink:(ev>=0?C.good:C.red)],
    ["VS HORA ANT.",intGrowth===null?"—":pct(intGrowth),intGrowth===null?C.cream:(intGrowth>=0?C.goodBg:C.riskBg),intGrowth===null?C.ink:(intGrowth>=0?C.good:C.red)],
    ["ATINGIMENTO",pct(att),target?perfFill(att,100,70):C.cream,target?perfText(att,100,70):C.ink]
  ];
  const gap=10,cw=(width-84-gap*5)/6,cy=150,ch=94;
  cards.forEach((c,i)=>{
    const x=42+i*(cw+gap);
    canvasRoundedRect(ctx,x,cy,cw,ch,14,c[2],C.line);
    ctx.fillStyle=C.green2;ctx.font="700 11px Arial";ctx.fillText(c[0],x+14,cy+25);
    ctx.fillStyle=c[3];ctx.font="800 20px Arial";ctx.fillText(c[1],x+14,cy+58);
  });

  const cols=[
    ["Grupo",220],["Meta Fin.",175],["Venda Fin.",175],["% Meta",115],["Desvio",175],
    ["Venda LY",165],["Vs LY",125],["Meta Fís.",105],["Venda Fís.",105],["% Fís.",110],["Projeção dia",230]
  ];
  const tableWidth=cols.reduce((a,c)=>a+c[1],0);
  let x=42,ty=270;
  ctx.fillStyle=C.green;ctx.fillRect(42,ty,tableWidth,rowH);
  cols.forEach(([lab,w],i)=>{
    ctx.fillStyle=C.white;ctx.font="700 11px Arial";ctx.textAlign=i===0?"left":"right";
    ctx.fillText(lab,i===0?x+10:x+w-10,ty+29);x+=w;
  });

  groups.forEach((g,idx)=>{
    const y=ty+rowH*(idx+1);
    ctx.fillStyle=idx%2?C.cream:C.white;ctx.fillRect(42,y,tableWidth,rowH);
    const meta=Number(g.target_financial||0),v=Number(g.sales_financial||0),a=meta?v/meta*100:0,dv=v-meta;
    const lv=Number(g.ly_financial||0),e=g.evolution_vs_ly==null?null:Number(g.evolution_vs_ly);
    const mf=Number(g.target_physical||0),vf=Number(g.sales_physical||0),pf=mf?vf/mf*100:0;
    const groupInterval=Number(g.interval_sales_financial||0);
    const groupRate=d.has_input&&mins>0?groupInterval/(mins/60):0;
    const gp=d.has_input&&groupRate>0?v+groupRate*remaining:0;
    const gpAtt=meta&&gp?gp/meta*100:0;
    const vals=[
      GROUP_LABELS[g.group_code]||g.group_code,money(meta,0),money(v,0),pct(a),signedMoney(dv,0),
      money(lv,0),e===null?"—":pct(e),num(mf),num(vf),pct(pf),gp?money(gp,0):"—"
    ];
    x=42;
    cols.forEach(([lab,w],i)=>{
      let fill=null,color=C.ink;
      if(i===3){fill=perfFill(a,100,70);color=perfText(a,100,70)}
      if(i===4){fill=dv>=0?C.goodBg:C.riskBg;color=dv>=0?C.good:C.red}
      if(i===6&&e!==null){fill=e>=0?C.goodBg:C.riskBg;color=e>=0?C.good:C.red}
      if(i===9){fill=perfFill(pf,100,70);color=perfText(pf,100,70)}
      if(i===10&&gp){fill=perfFill(gpAtt,100,90);color=perfText(gpAtt,100,90)}
      if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,rowH)}
      ctx.fillStyle=color;ctx.font=(i===0?"800":"600")+" 11px Arial";ctx.textAlign=i===0?"left":"right";
      ctx.fillText(vals[i],i===0?x+10:x+w-10,y+29);
      x+=w;
    });
  });

  const fy=ty+rowH*(groups.length+1);
  ctx.fillStyle=C.green;ctx.fillRect(42,fy,tableWidth,rowH);
  const totalVals=["TOTAL",money(target,0),money(sale,0),pct(att),signedMoney(dev,0),money(ly,0),ev===null?"—":pct(ev),num(d.target_physical||0),num(d.sales_physical||0),d.target_physical?pct(Number(d.sales_physical||0)/Number(d.target_physical||0)*100):"0,0%",projection?money(projection,0):"—"];
  x=42;
  cols.forEach(([lab,w],i)=>{
    ctx.fillStyle=C.white;ctx.font="800 11px Arial";ctx.textAlign=i===0?"left":"right";
    ctx.fillText(totalVals[i],i===0?x+10:x+w-10,fy+29);x+=w;
  });

  const below=groups.filter(g=>Number(g.attainment||0)<100).length;
  const bestAtt=[...groups].sort((a,b)=>Number(b.attainment||0)-Number(a.attainment||0))[0];
  const bestEvolution=[...groups].filter(g=>g.evolution_vs_ly!==null&&g.evolution_vs_ly!==undefined).sort((a,b)=>Number(b.evolution_vs_ly)-Number(a.evolution_vs_ly))[0];
  const worst=[...groups].sort((a,b)=>Number(a.deviation||0)-Number(b.deviation||0)).slice(0,2);

  const insights=[
    ["◎",below+" grupos","abaixo da meta financeira","#E7F0EB",C.green2],
    ["▥",bestAtt?(GROUP_LABELS[bestAtt.group_code]||bestAtt.group_code):"—","maior atingimento "+(bestAtt?pct(bestAtt.attainment):"—"),"#F7EACD",C.orange],
    ["↗",bestEvolution?(GROUP_LABELS[bestEvolution.group_code]||bestEvolution.group_code):"—","melhor evolução vs LY "+(bestEvolution?pct(bestEvolution.evolution_vs_ly):"—"),"#E1F0E8",C.good],
    ["!",worst.length?worst.map(g=>GROUP_LABELS[g.group_code]||g.group_code).join(" e "):"—","maiores desvios em valor","#F8E1E4",C.red]
  ];
  const insightY=fy+rowH+16,insGap=10,insW=(tableWidth-insGap*3)/4,insH=72;
  insights.forEach((it,i)=>{
    const ix=42+i*(insW+insGap);
    canvasRoundedRect(ctx,ix,insightY,insW,insH,14,it[3],C.line);
    ctx.fillStyle=it[4];ctx.beginPath();ctx.arc(ix+31,insightY+36,18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=C.white;ctx.font="800 16px Arial";ctx.textAlign="center";ctx.fillText(it[0],ix+31,insightY+42);
    ctx.textAlign="left";ctx.fillStyle=C.ink;ctx.font="800 13px Arial";ctx.fillText(it[1],ix+60,insightY+29);
    ctx.fillStyle=C.muted;ctx.font="600 9px Arial";ctx.fillText(it[2],ix+60,insightY+48);
  });

  ctx.fillStyle=C.green2;ctx.font="700 11px Arial";ctx.textAlign="left";
  ctx.fillText("MEU ACOMPANHAMENTO • Parcial pronta para compartilhamento",42,height-28);
  ctx.textAlign="right";ctx.fillText("Moda que inspira o Brasil",width-42,height-28);

  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Falha ao gerar painel.")),"image/png",1));
}
async function shareMainGroupPanel(){
  const btn=$("shareGroupPanelHome")||$("shareGroupPanel");
  if(btn){btn.disabled=true;btn.textContent="Gerando painel..."}
  try{
    const blob=await createGroupPanelImage();
    const file=new File([blob],"Parcial_Grupos_Loja_"+state.storeCode+"_"+localDate()+".png",{type:"image/png"});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({title:"Desempenho por grupo de venda",files:[file]});
    }else{
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast("Imagem da parcial gerada para compartilhamento.");
    }
  }catch(e){if(e?.name!=="AbortError")toast(e.message||"Falha ao compartilhar.",true)}
  finally{if(btn){btn.disabled=false;btn.textContent="Compartilhar painel"}}
}

function applyResponsiveTableLabels(root=document){
  root.querySelectorAll(".table-wrap table:not(.group-share-table):not(.regional-share-table)").forEach(table=>{
    const headers=[...table.querySelectorAll("thead th")].map(th=>th.textContent.trim());
    table.querySelectorAll("tbody tr").forEach(row=>{
      [...row.children].forEach((cell,index)=>{
        if(cell.tagName==="TD" && !cell.dataset.label) cell.dataset.label=headers[index]||"";
      });
    });
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  if($("closeDailyWelcome")) $("closeDailyWelcome").onclick=closeDailyWelcomeFlow;
  if($("continueDailyWelcome")) $("continueDailyWelcome").onclick=closeDailyWelcomeFlow;
  if($("dailyWelcomeModal")) $("dailyWelcomeModal").addEventListener("click",e=>{if(e.target===$("dailyWelcomeModal")) closeDailyWelcomeFlow()});
  if($("supervisorChecklistLink")) $("supervisorChecklistLink").onclick=openSupervisorChecklist;
  if($("mobileMoreBtn")) $("mobileMoreBtn").onclick=openMobileMore;
  if($("closeMobileMore")) $("closeMobileMore").onclick=closeMobileMore;
  if($("mobileMoreBackdrop")) $("mobileMoreBackdrop").onclick=closeMobileMore;
  if($("mobileLogoutBtn")) $("mobileLogoutBtn").onclick=()=>{closeMobileMore();logout()};
  if($("closeSupervisorChecklist")) $("closeSupervisorChecklist").onclick=()=>closeSupervisorChecklist(false);
  if($("supervisorChecklistFrame")) $("supervisorChecklistFrame").onload=handleChecklistFrameLoad;
  if($("supervisorChecklistModal")) $("supervisorChecklistModal").addEventListener("click",e=>{if(e.target===$("supervisorChecklistModal")) closeSupervisorChecklist(false)});
  if($("openChecklistExternal")) $("openChecklistExternal").addEventListener("click",openChecklistExternalFallback);
  if($("refreshDiscounts")) $("refreshDiscounts").onclick=loadDiscounts;
  if($("saveDailyHCBtn")) $("saveDailyHCBtn").onclick=saveDailyHC;
  if($("monthlyTargetFile")) $("monthlyTargetFile").onchange=e=>importMonthlyTargets(e.target.files?.[0]);
  if($("shareGroupPanelHome")) $("shareGroupPanelHome").onclick=shareMainGroupPanel;
  if($("shareGroupPanel")) $("shareGroupPanel").onclick=shareMainGroupPanel;
  document.querySelectorAll(".embrace-card a").forEach(a=>a.addEventListener("click",()=>setTimeout(closeDailyWelcomeFlow,80)));

  applyResponsiveTableLabels();
  const tableObserver=new MutationObserver(()=>applyResponsiveTableLabels());
  tableObserver.observe(document.body,{subtree:true,childList:true});

  window.addEventListener("focus",restoreAfterChecklist);
  window.addEventListener("pageshow",restoreAfterChecklist);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden) restoreAfterChecklist()});
  updateIdentity(state.user);
});
