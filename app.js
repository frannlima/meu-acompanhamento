"use strict";

const API_URL = "https://vvgejviwvtnlahbyopah.supabase.co/functions/v1/meu-acompanhamento-api";
const STORE_CODES = ["073","084","108","113","138","142","146","175","177","222","238","258","262","314","318","344","350","552"];
const WORLD_LABELS = {feminino:"Feminino",masculino:"Masculino",infantil:"Infantil",casa:"Casa",beleza_relogios:"Beleza/Relógios"};
const GROUP_LABELS = {feminino_moda:"Feminino Moda",masculino_moda:"Masculino Moda",infantil_moda:"Infantil Moda",moda_casa:"Moda Casa",cba:"CBA",beleza:"Beleza",relogios:"Relógios",lpg:"LPG",basket:"Basket"};
const WORLD_ORDER = ["feminino","masculino","infantil","casa","beleza_relogios"];
const GROUP_ORDER = ["feminino_moda","masculino_moda","infantil_moda","moda_casa","cba","beleza","relogios","lpg","basket"];
const EXCLUDED_DCO = new Set([530,531,532,552]);

const state = {
  logged:false, matricula:"", storeCode:"", employeeName:"", role:"colaborador",
  world:"feminino", section:"inicio", day:null, detail:null, groupSummary:null, history:[], regional:[],
  commercial:null, dcoCatalog:[], commercialPhotoData:"",
  editingCommercialId:null, commercialSelectedDcos:new Set(),
  scales:{scales:[],productivity:[]}, editingScaleId:null, adminTab:"metas",
  user:null, discounts:null, productivity:null
};

const $ = (id) => document.getElementById(id);
const money = (v, digits=0) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(v||0));
const num = (v) => Number(v||0).toLocaleString("pt-BR",{maximumFractionDigits:0});
const pct = (v) => Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%";
const esc = (v) => String(v??"").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const localDate = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza"}).format(new Date());
const localTime = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Fortaleza"}) : "—";
const roleLabel = (r) => ({administrador:"Administrador",gerente:"Gerente",supervisor:"Supervisor",comercial:"Comercial",colaborador:"Colaborador"}[r]||"Colaborador");

function toast(message, error=false){
  const el=$("toast"); el.textContent=message; el.className="toast show"+(error?" error":"");
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.className="toast",3200);
}

async function api(action, payload={}){
  const res = await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,...payload})
  });
  let body={};
  try{body=await res.json()}catch(_){}
  if(!res.ok) throw new Error(body.error||"Falha na comunicação com a base.");
  return body.data;
}

function setSection(section){
  state.section=section;
  document.querySelectorAll(".section").forEach(el=>el.classList.toggle("active",el.id==="section-"+section));
  document.querySelectorAll("[data-section]").forEach(el=>el.classList.toggle("active",el.dataset.section===section));
  if(section==="regional" && state.role==="administrador") loadRegional();
  if(section==="comerciais") loadCommercials();
  if(section==="historico") renderHistory();
  if(section==="admin" && state.role==="administrador") loadAdmin();
  window.scrollTo({top:0,behavior:"smooth"});
}

function parsePt(value){
  const s=String(value??"").trim().replace(/R\$/gi,"").replace(/%/g,"").replace(/\s/g,"");
  if(!s) return 0;
  const normalized=s.includes(",") ? s.replace(/\./g,"").replace(",",".") : s;
  const n=Number(normalized.replace(/[^0-9.-]/g,""));
  return Number.isFinite(n)?n:0;
}

function parsePaste(text){
  const rawLines=String(text||"").split(/\r?\n/).filter(line=>line.trim().length);
  const rows=[]; let invalid=0, excluded=0, sales=0, physical=0;
  for(const raw of rawLines){
    const firstText=raw.split("\t")[0].trim();
    if(/^grupo$/i.test(firstText) || /^TOTAL\s+(GRUPO|FILIAL)/i.test(firstText)) continue;
    const cols=raw.replace(/\r$/,"").split("\t");
    while(cols.length<14) cols.push("");
    if(cols.length!==14){invalid++;continue;}
    const dcoMatch=String(cols[1]||"").trim().match(/^(\d+)/);
    if(!dcoMatch){invalid++;continue;}
    const dco=Number(dcoMatch[1]);
    if(EXCLUDED_DCO.has(dco)){excluded++;continue;}
    rows.push(cols);
    sales+=parsePt(cols[5]);
    physical+=parsePt(cols[7]);
  }
  return {rows,invalid,excluded,sales,physical};
}

function showPaste(){
  $("pasteModal").classList.remove("hidden");
  $("pasteArea").focus();
  updatePastePreview();
}
function hidePaste(){
  $("pasteModal").classList.add("hidden");
  $("pasteFeedback").classList.add("hidden");
}
function updatePastePreview(){
  const p=parsePaste($("pasteArea").value);
  $("previewRows").textContent=p.rows.length;
  $("previewSales").textContent=p.rows.length?money(p.sales,2):"—";
  $("previewPhysical").textContent=p.rows.length?num(p.physical):"—";
  $("previewExcluded").textContent=p.excluded;
  const fb=$("pasteFeedback");
  if(p.invalid>0){
    fb.textContent=p.invalid+" linha(s) não puderam ser interpretadas nas 14 colunas.";
    fb.className="form-error";
  } else {
    fb.classList.add("hidden");
  }
  $("confirmPaste").disabled=p.rows.length===0 || p.invalid>0;
}

async function confirmPaste(){
  const text=$("pasteArea").value;
  const p=parsePaste(text);
  if(!p.rows.length || p.invalid){updatePastePreview();return;}
  const btn=$("confirmPaste"); btn.disabled=true; btn.textContent="Importando...";
  try{
    const result=await api("ingest",{
      matricula:state.matricula,store_code:state.storeCode,captured_at:new Date().toISOString(),tsv:text
    });
    const r=Array.isArray(result)?result[0]:result;
    $("pasteFeedback").textContent="Importação concluída: "+(r?.rows_valid??p.rows.length)+" DCOs válidos.";
    $("pasteFeedback").className="form-error form-success";
    await loadAll();
    $("pasteArea").value="";
    setTimeout(hidePaste,650);
    toast("Venda importada e painel atualizado.");
  }catch(e){
    $("pasteFeedback").textContent=e.message;
    $("pasteFeedback").className="form-error";
    toast(e.message,true);
  }finally{
    btn.textContent="Confirmar importação"; btn.disabled=false;
  }
}

async function doLogin(matricula, storeCode, save=true){
  const m=String(matricula||"").replace(/\D/g,"");
  const s=String(storeCode||"").replace(/\D/g,"").padStart(3,"0").slice(-3);
  if(!/^\d{5,12}$/.test(m)||!/^\d{3}$/.test(s)) throw new Error("Informe uma matrícula válida e a loja com 3 dígitos.");
  const data=await api("identify",{matricula:m,store_code:s});
  const person=Array.isArray(data)?data[0]:data;
  if(!person?.access_ok) throw new Error("Matrícula não encontrada para esta filial.");
  state.logged=true; state.matricula=m; state.storeCode=s;
  state.employeeName=person.first_name||person.full_name||"Colaborador";
  state.role=person.app_role||"colaborador";
  state.user=person;
  if(save) localStorage.setItem("meu_acompanhamento_session",JSON.stringify({matricula:m,storeCode:s}));
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  $("identityName").textContent=state.employeeName;
  if($("identityRole")) $("identityRole").textContent=person.job_title||roleLabel(state.role);
  if($("identityStore")) $("identityStore").textContent=person.store_name||("Loja "+state.storeCode);
  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",state.role!=="administrador"));
  $("adminStoreBar").classList.toggle("hidden",state.role!=="administrador");
  document.querySelectorAll(".reset-capable").forEach(el=>el.classList.toggle("hidden",!["administrador","gerente","supervisor"].includes(state.role)));
  buildAdminStoreSelect();
  await loadAll();
  if(typeof window.afterMeuAcompanhamentoLogin==="function") await window.afterMeuAcompanhamentoLogin(person);
  else showWorldModal();
}

function showWorldModal(){
  $("welcomeEyebrow").textContent="BEM-VINDO, "+state.employeeName.toUpperCase();
  $("welcomeText").innerHTML="Você está na <strong>Loja "+esc(state.storeCode)+"</strong>. Escolha seu mundo de atuação para começar.";
  $("worldModal").classList.remove("hidden");
}

function chooseWorld(world){
  state.world=world;
  $("worldModal").classList.add("hidden");
  renderWorldSwitcher();
  renderGroups();
  setSection("grupos");
}

function buildAdminStoreSelect(){
  const sel=$("adminStoreSelect");
  sel.innerHTML=STORE_CODES.map(c=>'<option value="'+c+'">Loja '+c+'</option>').join("");
  sel.value=state.storeCode;
}

async function changeAdminStore(code){
  state.storeCode=code;
  if($("identityStore")) $("identityStore").textContent="Loja "+state.storeCode;
  await loadAll();
  setSection("inicio");
}

async function loadAll(){
  $("workspaceLabel").textContent="WORKSPACE • LOJA "+state.storeCode;
  $("dateBadge").textContent=new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");
  try{
    const [day,detail,groups,history]=await Promise.all([
      api("dashboard",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode}),
      api("detail",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode}),
      api("groups",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode}),
      api("history",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode})
    ]);
    state.day=day; state.detail=detail; state.groupSummary=groups; state.history=Array.isArray(history)?history:[];
    renderDashboard(); renderGroups(); renderGroupSharePanel(); renderHistory();
    if(state.section==="comerciais") await loadCommercials();
  }catch(e){
    toast(e.message,true);
    $("metaNotice").textContent=e.message; $("metaNotice").className="notice error";
  }
}

function calcClock(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Fortaleza",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
  const mins=Number(parts.find(p=>p.type==="hour")?.value||0)*60+Number(parts.find(p=>p.type==="minute")?.value||0);
  return Math.max((22*60-mins)/60,0);
}

function kpi(label,value,foot,tone=""){
  return '<article class="kpi"><span>'+esc(label)+'</span><strong class="'+tone+'">'+esc(value)+'</strong><small>'+esc(foot)+'</small></article>';
}


function clampPct(value){
  return Math.max(0,Math.min(100,Math.abs(Number(value)||0)));
}

function visualDonut(label, ringValue, valueText, note, tone="primary"){
  return '<article class="visual-card">'+
    '<div class="visual-donut '+tone+'" style="--p:'+clampPct(ringValue)+'"><div><strong>'+esc(valueText)+'</strong><span>'+esc(label)+'</span></div></div>'+
    '<div class="visual-copy"><b>'+esc(label)+'</b><span>'+esc(note)+'</span></div>'+
  '</article>';
}

function renderHomeVisualSummary(metrics){
  const box=$("homeVisualSummary"); if(!box) return;
  const {has,attainment,projectionAttainment,evolution,intervalGrowth,pacePct,projection}=metrics;
  box.innerHTML=
    visualDonut("Atingimento",has?attainment:0,has?pct(attainment):"—",has?"Meta financeira do dia":"Aguardando input",has?(attainment>=100?"good":attainment>=90?"warn":"bad"):"neutral")+
    visualDonut("Projeção",projection?projectionAttainment:0,projection?pct(projectionAttainment):"—",projection?"Projeção de fechamento":"Disponível após formar ritmo",projection?(projectionAttainment>=100?"good":projectionAttainment>=90?"warn":"bad"):"neutral")+
    visualDonut("Vs LY",evolution===null?0:evolution,evolution===null?"—":pct(evolution),evolution===null?"Aguardando venda":(evolution>=0?"Evolução":"Involução"),evolution===null?"neutral":evolution>=0?"good":"bad")+
    visualDonut("Vs hora anterior",intervalGrowth===null?0:intervalGrowth,intervalGrowth===null?"—":pct(intervalGrowth),intervalGrowth===null?"Disponível após o 2º input":(intervalGrowth>=0?"Ritmo evoluindo":"Ritmo retraindo"),intervalGrowth===null?"neutral":intervalGrowth>=0?"good":"bad")+
    visualDonut("Ritmo necessário",pacePct||0,has?pct(pacePct||0):"—",has?"R$/h atual x necessário":"Aguardando acompanhamento",has?(pacePct>=100?"good":pacePct>=85?"warn":"bad"):"neutral");
}

function renderWorldVisual(metrics){
  const box=$("worldVisualSummary"); if(!box) return;
  const {attainment,physicalAttainment,evolution,intervalPct,hasRows}=metrics;
  box.innerHTML=
    visualDonut("% Meta",attainment,hasRows?pct(attainment):"—","Atingimento do mundo",hasRows?(attainment>=100?"good":attainment>=90?"warn":"bad"):"neutral")+
    visualDonut("Meta física",physicalAttainment,hasRows?pct(physicalAttainment):"—","Peças x meta física",hasRows?(physicalAttainment>=100?"good":physicalAttainment>=90?"warn":"bad"):"neutral")+
    visualDonut("Vs LY",evolution===null?0:evolution,evolution===null?"—":pct(evolution),evolution===null?"Sem referência":"Resultado do mundo vs LY",evolution===null?"neutral":evolution>=0?"good":"bad")+
    visualDonut("Último input",intervalPct,hasRows?pct(intervalPct):"—","Quanto do alvo veio no último input",hasRows?(intervalPct>=10?"good":intervalPct>=5?"warn":"bad"):"neutral");
}

function renderCommercialVisual(rows,total){
  const box=$("commercialVisualSummary"); if(!box) return;
  const ly=rows.reduce((a,r)=>a+Number(r.ly_financial||0),0);
  const evolution=ly?((total.sale/ly)-1)*100:null;
  const intervalPct=total.target?total.interval/total.target*100:0;
  const dcos=[...new Set(rows.flatMap(r=>(r.dcos||[]).map(d=>Number(d.dco_code))))];
  const coverage=detailRows().length?dcos.length/detailRows().length*100:0;
  const attainment=total.target?total.sale/total.target*100:0;
  box.innerHTML=
    visualDonut("Atingimento",attainment,pct(attainment),"Meta dos comerciais atribuídos",attainment>=100?"good":attainment>=90?"warn":"bad")+
    visualDonut("Vs LY",evolution===null?0:evolution,evolution===null?"—":pct(evolution),evolution===null?"Sem referência":"Evolução / involução comercial",evolution===null?"neutral":evolution>=0?"good":"bad")+
    visualDonut("Último input",intervalPct,pct(intervalPct),"Incremento do input sobre a meta",intervalPct>=10?"good":intervalPct>=5?"warn":"bad")+
    visualDonut("Cobertura DCO",coverage,pct(coverage),dcos.length+" DCO(s) com responsável",coverage>=90?"good":coverage>=70?"warn":"bad");
}

function renderHistoryVisual(){
  const box=$("historyVisualSummary"); if(!box) return;
  const d=state.day||{};
  const has=!!d.has_input;
  const target=Number(d.target_financial||0),sale=Number(d.sales_financial||0),ly=Number(d.ly_financial||0);
  const attainment=target?sale/target*100:0;
  const evolution=has&&ly?((sale/ly)-1)*100:null;
  const intervalGrowth=d.interval_growth_pct===null||d.interval_growth_pct===undefined?null:Number(d.interval_growth_pct);
  const inputCount=state.history.length;
  const cadence=Math.min(100,inputCount*12.5);
  box.innerHTML=
    visualDonut("Inputs hoje",cadence,String(inputCount),inputCount?"Snapshots registrados":"Nenhum snapshot","primary")+
    visualDonut("Atingimento",attainment,has?pct(attainment):"—","Posição atual do dia",has?(attainment>=100?"good":attainment>=90?"warn":"bad"):"neutral")+
    visualDonut("Vs LY",evolution===null?0:evolution,evolution===null?"—":pct(evolution),"Comparação acumulada",evolution===null?"neutral":evolution>=0?"good":"bad")+
    visualDonut("Vs hora anterior",intervalGrowth===null?0:intervalGrowth,intervalGrowth===null?"—":pct(intervalGrowth),"Evolução / retração do ritmo",intervalGrowth===null?"neutral":intervalGrowth>=0?"good":"bad");
}

function renderAdminVisual(){
  const box=$("adminVisualSummary"); if(!box||state.role!=="administrador") return;
  const d=state.day||{};
  const mapped=Array.isArray(state.dcoCatalog)?state.dcoCatalog.length:0;
  const scales=Array.isArray(state.scales?.scales)?state.scales.scales:[];
  const hc=scales.reduce((a,r)=>a+Number(r.actual_hc||0),0);
  const planned=scales.reduce((a,r)=>a+Number(r.planned_hc||0),0);
  const hcPct=planned?hc/planned*100:0;
  box.innerHTML=
    visualDonut("Meta do dia",d.has_target?100:0,d.has_target?"OK":"—",d.has_target?"Meta carregada":"Meta pendente",d.has_target?"good":"bad")+
    visualDonut("DCOs mapeados",mapped?100:0,mapped?String(mapped):"—","Estrutura ativa do app",mapped?"good":"neutral")+
    visualDonut("Input da loja",d.has_input?100:0,d.has_input?"ATIVO":"0",d.has_input?"Há snapshot válido hoje":"Aguardando venda",d.has_input?"good":"warn")+
    visualDonut("HC real x plano",hcPct,hcPct?pct(hcPct):"—",planned?hc+" de "+planned+" HC":"Escala ainda não cadastrada",hcPct>=95?"good":hcPct>=80?"warn":"neutral");
}

function renderDashboard(){
  const d=state.day||{};
  const target=Number(d.target_financial||0), targetPhysical=Number(d.target_physical||0);
  const sale=Number(d.sales_financial||0), physical=Number(d.sales_physical||0), ly=Number(d.ly_financial||0);
  const has=!!d.has_input, attainment=target? sale/target*100:0, deviation=sale-target;
  const evolution=has&&ly?((sale/ly)-1)*100:null;
  const interval=Number(d.interval_sales_financial||0), delta=Number(d.interval_delta_financial||0);
  const intervalGrowth=d.interval_growth_pct===null||d.interval_growth_pct===undefined?null:Number(d.interval_growth_pct);
  const intervalMinutes=Number(d.interval_minutes||0), remaining=calcClock();
  const openingTime=d.opening_time||"10:00";
  const firstInput=has && state.history.length===1;
  const currentPerHour=has&&intervalMinutes>0?interval/(intervalMinutes/60):0;
  const needed=target&&remaining>0?Math.max(0,target-sale)/remaining:0;
  const projection=has&&currentPerHour>0?sale+currentPerHour*remaining:0;
  const projDev=projection-target;
  const projectionAttainment=target&&projection?projection/target*100:0;
  const pacePct=needed&&currentPerHour?currentPerHour/needed*100:0;
  renderHomeVisualSummary({has,attainment,projectionAttainment,evolution,intervalGrowth,pacePct,projection});
  $("updateBadge").textContent=d.captured_at?"Atualizado "+localTime(d.captured_at):"Hoje";
  if($("resetDayBtn")){
    const canReset=["administrador","gerente","supervisor"].includes(state.role);
    $("resetDayBtn").classList.toggle("hidden",!(canReset&&has));
  }
  const notice=$("metaNotice");
  if(d.has_target&&!has){
    notice.innerHTML="<b>Meta do dia carregada e venda zerada.</b> Faça o primeiro input quando iniciar o acompanhamento. Se ele acontecer mais tarde, o ritmo considera o tempo desde a abertura às "+esc(openingTime)+".";
    notice.className="notice";
  } else if(firstInput){
    notice.innerHTML="<b>Primeiro input do dia.</b> O ritmo atual foi calculado considerando todo o período desde a abertura às "+esc(openingTime)+" até "+esc(localTime(d.captured_at))+".";
    notice.className="notice";
  } else notice.classList.add("hidden");
  $("kpiGrid").innerHTML=[
    kpi("Meta do dia",d.has_target?money(target,2):"Sem meta","Meta física "+num(targetPhysical)+" peças"),
    kpi("Venda atual",has?money(sale,2):"Aguardando input",has?pct(attainment)+" da meta":"Cole a primeira parcial",has?(attainment>=100?"positive":attainment>=90?"warning":"negative"):""),
    kpi("Venda física",has?num(physical)+" peças":"—","Meta física "+num(targetPhysical),has&&physical>=targetPhysical?"positive":""),
    kpi("Desvio total",has?(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2):"—",has?(deviation>=0?"Acima da meta":"Saldo para a meta"):"Será calculado no 1º input",has?(deviation>=0?"positive":"negative"):""),
    kpi("Projeção do dia",projection?money(projection,2):"—",projection?(projDev>=0?"+ ":"- ")+money(Math.abs(projDev),2)+" projetado":"Aguardando ritmo",projection?(projDev>=0?"positive":"negative"):""),
    kpi(evolution!==null&&evolution<0?"Involução vs LY":"Evolução vs LY",evolution!==null?pct(evolution):"—",evolution!==null?"Venda LY "+money(ly,2):"Disponível após o input",evolution!==null?(evolution>=0?"positive":"negative"):""),
    kpi("Último intervalo",has?money(interval,2):"—",firstInput?"Desde a abertura às "+openingTime:(intervalGrowth===null?"Aguardando comparação":pct(intervalGrowth)+" vs ritmo anterior"),intervalGrowth===null?"":intervalGrowth>=0?"positive":"negative"),
    kpi("R$/h necessário",needed?money(needed,2):"—","Para alcançar a meta até 22h","warning"),
    kpi("R$/h atual",currentPerHour?money(currentPerHour,2):"—",currentPerHour&&needed?pct((currentPerHour/needed-1)*100)+" vs necessário":"Aguardando 2º input",currentPerHour?(currentPerHour>=needed?"positive":"negative"):""),
    kpi("Tempo restante",remaining?remaining.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+" h":"Encerrado","Fechamento às 22h")
  ].join("");

  const sg=$("signalGrid");
  if(has){
    sg.classList.remove("hidden");
    sg.innerHTML='<div class="signal '+(intervalGrowth===null?"warn":intervalGrowth>=0?"good":"bad")+'"><b>'+(firstInput?"Ritmo desde a abertura":intervalGrowth>=0?"Evolução do ritmo":"Retração do ritmo")+':</b> '+(firstInput?money(currentPerHour,2)+" por hora":pct(intervalGrowth)+" • "+(delta>=0?"+ ":"- ")+money(Math.abs(delta),2)+"/h")+'</div>'+
      '<div class="signal '+(deviation>=0?"good":"warn")+'"><b>Desvio total:</b> '+(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2)+'</div>'+
      '<div class="signal '+(projection?(projDev>=0?"good":"warn"):"warn")+'"><b>Projeção:</b> '+(projection?(projDev>=0?"+ ":"- ")+money(Math.abs(projDev),2):"aguardando histórico")+'</div>';
  }else sg.classList.add("hidden");

  $("paceTitle").textContent=!has?"Aguardando o primeiro input da venda":currentPerHour>=needed?"A operação está no ritmo necessário":"A operação precisa acelerar para a meta";
  $("paceBadge").className="badge "+(!has?"outline":currentPerHour>=needed?"good":"warn");
  $("paceBadge").textContent=!has?"Sem input":currentPerHour>=needed?"No ritmo":"Atenção";
  $("paceGrid").innerHTML=[
    ["Meta do dia",target?money(target,2):"—",""],
    ["Venda atual",has?money(sale,2):"—",""],
    ["R$/h necessário",needed?money(needed,2):"—",""],
    ["R$/h atual",currentPerHour?money(currentPerHour,2):"—",currentPerHour>=needed?"positive":"negative"],
    ["Projeção",projection?money(projection,2):"—",projection?(projDev>=0?"positive":"negative"):""],
    ["Vs ritmo anterior",firstInput?"1º input":intervalGrowth===null?"—":pct(intervalGrowth),intervalGrowth===null?"":intervalGrowth>=0?"positive":"negative"]
  ].map(x=>'<div><span>'+x[0]+'</span><strong class="'+x[2]+'">'+x[1]+'</strong></div>').join("");

  $("intervalBox").className=has?"interval-live":"empty-box";
  $("intervalBox").innerHTML=has?'<strong>'+money(interval,2)+'</strong><span>'+(firstInput?'venda acumulada desde a abertura':'venda do último intervalo')+'</span><small>'+(firstInput?'Período considerado: '+openingTime+' até '+localTime(d.captured_at):'Atualização '+localTime(d.captured_at))+'</small>':"Faça o primeiro input para iniciar o acompanhamento do ritmo.";
  $("movementBox").className=has?"movement-live":"empty-box";
  $("movementBox").innerHTML=has?'<div><span>'+(firstInput?'Desde abertura':'Último intervalo')+'</span><strong>'+money(interval,2)+'</strong></div><div><span>Vs ritmo anterior</span><strong class="'+(intervalGrowth===null?"":intervalGrowth>=0?"positive":"negative")+'">'+(intervalGrowth===null?"—":pct(intervalGrowth))+'</strong></div><div><span>Atualização</span><strong>'+localTime(d.captured_at)+'</strong></div>':"Após o segundo input, o app mostra a evolução ou retração do ritmo.";
}

function detailRows(){return Array.isArray(state.detail?.rows)?state.detail.rows:[]}
function renderWorldSwitcher(){
  $("worldTitle").textContent=WORLD_LABELS[state.world]||state.world;
  $("worldSwitcher").innerHTML=WORLD_ORDER.map(w=>'<button data-world="'+w+'" class="'+(w===state.world?"active":"")+'">'+esc(WORLD_LABELS[w])+'</button>').join("");
  $("worldSwitcher").querySelectorAll("button").forEach(b=>b.onclick=()=>{state.world=b.dataset.world;renderWorldSwitcher();renderGroups()});
}

function renderGroups(){
  renderWorldSwitcher();
  const all=detailRows();
  const rows=all.filter(r=>r.world_code===state.world || (state.world==="beleza_relogios" && ["beleza","relogios"].includes(r.group_code)));
  const total=rows.reduce((a,r)=>{a.sale+=Number(r.sales_financial||0);a.target+=Number(r.target_financial||0);a.physical+=Number(r.sales_physical||0);a.ly+=Number(r.ly_financial||0);a.delta+=Number(r.interval_sales_financial||0);return a},{sale:0,target:0,physical:0,ly:0,delta:0});
  const att=total.target?total.sale/total.target*100:0, dev=total.sale-total.target;
  const targetPhysical=rows.reduce((a,r)=>a+Number(r.target_physical||0),0);
  const physicalAttainment=targetPhysical?total.physical/targetPhysical*100:0;
  const evolution=total.ly?((total.sale/total.ly)-1)*100:null;
  const intervalPct=total.target?total.delta/total.target*100:0;
  renderWorldVisual({attainment:att,physicalAttainment,evolution,intervalPct,hasRows:rows.length>0});
  $("worldKpis").innerHTML=[
    kpi("Meta do mundo",rows.length?money(total.target,2):"—","Soma dos DCOs"),
    kpi("Venda atual",rows.length?money(total.sale,2):"—",rows.length?pct(att)+" da meta":"Aguardando input",rows.length?(att>=100?"positive":att>=90?"warning":"negative"):""),
    kpi("Desvio",rows.length?(dev>=0?"+ ":"- ")+money(Math.abs(dev),2):"—","Meta x realizado",rows.length?(dev>=0?"positive":"negative"):""),
    kpi("Vs último input",rows.length?(total.delta>=0?"+ ":"- ")+money(Math.abs(total.delta),2):"—","Movimento do intervalo",rows.length?(total.delta>=0?"positive":"negative"):"")
  ].join("");

  if(!rows.length){
    $("groupContent").innerHTML='<section class="card"><div class="empty-box">Ainda não há venda importada para este mundo hoje.</div></section>';
    return;
  }
  const grouped={};
  rows.forEach(r=>{const g=r.group_code||"outros";(grouped[g]||(grouped[g]=[])).push(r)});
  $("groupContent").innerHTML=Object.entries(grouped).map(([g,items])=>{
    const t=items.reduce((a,r)=>{a.sale+=Number(r.sales_financial||0);a.target+=Number(r.target_financial||0);a.physical+=Number(r.sales_physical||0);a.ly+=Number(r.ly_financial||0);return a},{sale:0,target:0,physical:0,ly:0});
    const attainment=t.target?t.sale/t.target*100:0, deviation=t.sale-t.target;
    const trs=items.map(r=>{
      const sale=Number(r.sales_financial||0),target=Number(r.target_financial||0),a=target?sale/target*100:0,dev=sale-target,ly=Number(r.ly_financial||0),ev=ly?((sale/ly)-1)*100:null,delta=Number(r.interval_sales_financial||0);
      return '<tr><td>'+esc(r.dco_code)+'</td><td>'+esc(String(r.department||"").replace(/^\d+\s*-?\s*/,""))+'</td><td>'+money(target,2)+'</td><td>'+money(sale,2)+'</td><td class="'+(a>=100?"cell-good":a>=90?"cell-warn":"cell-bad")+'">'+pct(a)+'</td><td class="'+(dev>=0?"positive":"negative")+'">'+(dev>=0?"+ ":"- ")+money(Math.abs(dev),2)+'</td><td>'+num(r.sales_physical)+'</td><td>'+(ly?money(ly,2):"—")+'</td><td class="'+(ev===null?"":ev>=0?"positive":"negative")+'">'+(ev===null?"—":pct(ev))+'</td><td class="'+(delta>=0?"positive":"negative")+'">'+(delta>=0?"+ ":"- ")+money(Math.abs(delta),2)+'</td></tr>';
    }).join("");
    return '<section class="group-card"><div class="group-card-head"><div><span class="eyebrow">GRUPO</span><h2>'+esc(GROUP_LABELS[g]||g)+'</h2></div><div class="group-summary"><div><span>Venda</span><strong>'+money(t.sale,2)+'</strong></div><div><span>% Meta</span><strong class="'+(attainment>=100?"positive":attainment>=90?"warning":"negative")+'">'+pct(attainment)+'</strong></div><div><span>Desvio</span><strong class="'+(deviation>=0?"positive":"negative")+'">'+(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2)+'</strong></div></div></div><div class="table-wrap"><table><thead><tr><th>DCO</th><th>Departamento</th><th>Meta</th><th>Venda</th><th>% Meta</th><th>Desvio</th><th>Física</th><th>LY</th><th>Evol.</th><th>Vs Input</th></tr></thead><tbody>'+trs+'<tr class="total-row"><td colspan="2">TOTAL • '+esc(GROUP_LABELS[g]||g)+'</td><td>'+money(t.target,2)+'</td><td>'+money(t.sale,2)+'</td><td>'+pct(attainment)+'</td><td>'+(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2)+'</td><td>'+num(t.physical)+'</td><td>'+(t.ly?money(t.ly,2):"—")+'</td><td>—</td><td>—</td></tr></tbody></table></div></section>';
  }).join("");
}


function performanceClass(value, good=100, warn=70){
  const n=Number(value||0);
  return n>=good?"perf-good":n>=warn?"perf-warn":"perf-bad";
}

function signedMoney(value, digits=2){
  const n=Number(value||0);
  return (n>=0?"+ ":"- ")+money(Math.abs(n),digits);
}

function buildGroupPanelHtml(){
  const d=state.day||{};
  const groups=Array.isArray(state.groupSummary?.groups)?state.groupSummary.groups:[];
  const ordered=GROUP_ORDER.map(code=>groups.find(g=>g.group_code===code)).filter(Boolean);

  const target=Number(d.target_financial||ordered.reduce((a,g)=>a+Number(g.target_financial||0),0));
  const sale=Number(d.sales_financial||ordered.reduce((a,g)=>a+Number(g.sales_financial||0),0));
  const targetPhysical=Number(d.target_physical||ordered.reduce((a,g)=>a+Number(g.target_physical||0),0));
  const salesPhysical=Number(d.sales_physical||ordered.reduce((a,g)=>a+Number(g.sales_physical||0),0));
  const ly=Number(d.ly_financial||ordered.reduce((a,g)=>a+Number(g.ly_financial||0),0));
  const attainment=target?sale/target*100:0;
  const deviation=sale-target;
  const evolution=ly&&d.has_input?((sale/ly)-1)*100:null;

  const interval=Number(d.interval_sales_financial||0);
  const intervalDelta=Number(d.interval_delta_financial||0);
  const intervalGrowth=d.interval_growth_pct===null||d.interval_growth_pct===undefined?null:Number(d.interval_growth_pct);
  const intervalMinutes=Number(d.interval_minutes||0);
  const remaining=calcClock();
  const currentPerHour=d.has_input&&intervalMinutes>0?interval/(intervalMinutes/60):0;
  const projection=d.has_input&&currentPerHour>0?sale+currentPerHour*remaining:0;
  const projectionAttainment=target&&projection?projection/target*100:0;
  const projectionDelta=projection-target;

  const dateLabel=new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");
  const updated=d.captured_at?localTime(d.captured_at):"sem input";

  const rows=ordered.map(g=>{
    const meta=Number(g.target_financial||0);
    const venda=Number(g.sales_financial||0);
    const ating=meta?venda/meta*100:0;
    const desvio=venda-meta;
    const vendaLy=Number(g.ly_financial||0);
    const evol=g.evolution_vs_ly===null||g.evolution_vs_ly===undefined?null:Number(g.evolution_vs_ly);
    const metaFis=Number(g.target_physical||0);
    const vendaFis=Number(g.sales_physical||0);
    const atingFis=metaFis?vendaFis/metaFis*100:0;

    return '<tr>'+
      '<td class="group-name-cell">'+esc(GROUP_LABELS[g.group_code]||g.group_code)+'</td>'+
      '<td>'+money(meta,2)+'</td>'+
      '<td>'+money(venda,2)+'</td>'+
      '<td class="'+performanceClass(ating,100,70)+'">'+pct(ating)+'</td>'+
      '<td class="'+(desvio>=0?"perf-good":"perf-soft-bad")+'">'+(desvio>=0?signedMoney(desvio,2):signedMoney(desvio,2))+'</td>'+
      '<td>'+money(vendaLy,2)+'</td>'+
      '<td class="'+(evol===null?"":evol>=0?"perf-good":"perf-soft-bad")+'">'+(evol===null?"—":(evol>=0?"▲ ":"▼ ")+pct(evol))+'</td>'+
      '<td>'+num(metaFis)+'</td>'+
      '<td>'+num(vendaFis)+'</td>'+
      '<td class="'+performanceClass(atingFis,100,70)+'">'+pct(atingFis)+'</td>'+
    '</tr>';
  }).join("");

  const physicalAttainment=targetPhysical?salesPhysical/targetPhysical*100:0;
  const below=ordered.filter(g=>Number(g.attainment||0)<100).length;
  const bestAtt=[...ordered].sort((a,b)=>Number(b.attainment||0)-Number(a.attainment||0))[0];
  const bestEvolution=[...ordered].filter(g=>g.evolution_vs_ly!==null&&g.evolution_vs_ly!==undefined).sort((a,b)=>Number(b.evolution_vs_ly)-Number(a.evolution_vs_ly))[0];
  const worst=[...ordered].sort((a,b)=>Number(a.deviation||0)-Number(b.deviation||0)).slice(0,2);

  const projectionStatus=!projection
    ? '<span class="group-kpi-note neutral">Aguardando ritmo para projetar</span>'
    : '<span class="group-kpi-note '+(projectionDelta>=0?"positive":"negative")+'">'+
      (projectionDelta>=0?"▲ crescimento ":"▼ retração ")+signedMoney(projectionDelta,2)+'</span>';

  const lyStatus=evolution===null
    ? '<span class="group-kpi-note neutral">Aguardando venda</span>'
    : '<span class="group-kpi-note '+(evolution>=0?"positive":"negative")+'">'+(evolution>=0?"▲ evolução":"▼ involução")+' '+pct(evolution)+'</span>';

  const hourStatus=intervalGrowth===null
    ? '<span class="group-kpi-note neutral">Disponível após o 2º input</span>'
    : '<span class="group-kpi-note '+(intervalGrowth>=0?"positive":"negative")+'">'+(intervalGrowth>=0?"▲ evolução ":"▼ involução ")+pct(intervalGrowth)+' • '+signedMoney(intervalDelta,2)+'/h</span>';

  return '<div class="group-share-header">'+
      '<div class="group-share-brand"><img src="./assets/riachuelo-logo-vertical.svg" alt="Riachuelo"></div>'+
      '<div class="group-share-title"><h3>DESEMPENHO POR GRUPO DE VENDA</h3><p>Parcial hora a hora • Loja '+esc(state.storeCode)+' • '+dateLabel+' • Atualizado às '+updated+'</p></div>'+
      '<div class="group-share-slogan">MODA QUE<br>INSPIRA O BRASIL</div>'+
    '</div>'+
    '<div class="group-share-kpis">'+
      '<div class="group-kpi"><span>Meta do dia</span><strong>'+money(target,2)+'</strong><small>Meta física '+num(targetPhysical)+' peças</small></div>'+
      '<div class="group-kpi"><span>Venda atual</span><strong>'+money(sale,2)+'</strong><small>'+pct(attainment)+' da meta</small></div>'+
      '<div class="group-kpi projection"><span>Projeção de venda</span><strong>'+(projection?money(projection,2):"—")+'</strong><small>'+(projection?pct(projectionAttainment)+' de atingimento':"Aguardando 2º input")+'</small>'+projectionStatus+'</div>'+
      '<div class="group-kpi"><span>Evolução vs LY</span><strong class="'+(evolution===null?"":evolution>=0?"positive":"negative")+'">'+(evolution===null?"—":pct(evolution))+'</strong>'+lyStatus+'</div>'+
      '<div class="group-kpi"><span>Evolução vs hora anterior</span><strong class="'+(intervalGrowth===null?"":intervalGrowth>=0?"positive":"negative")+'">'+(intervalGrowth===null?"—":pct(intervalGrowth))+'</strong>'+hourStatus+'</div>'+
      '<div class="group-kpi deviation"><span>Desvio total</span><strong class="'+(deviation>=0?"positive":"negative")+'">'+signedMoney(deviation,2)+'</strong><small>'+pct(attainment-100)+' em relação à meta</small></div>'+
    '</div>'+
    '<div class="group-share-table-wrap"><table class="group-share-table"><thead><tr>'+
      '<th>Grupo de venda</th><th>Meta Fin.</th><th>Venda Fin.</th><th>% Meta</th><th>Desvio</th><th>Venda LY</th><th>Evolução / Involução vs LY</th><th>Meta Fís.</th><th>Venda Fís.</th><th>% Meta Fís.</th>'+
    '</tr></thead><tbody>'+rows+
      '<tr class="group-total-row"><td>Total</td><td>'+money(target,2)+'</td><td>'+money(sale,2)+'</td><td>'+pct(attainment)+'</td><td>'+signedMoney(deviation,2)+'</td><td>'+money(ly,2)+'</td><td>'+(evolution===null?"—":(evolution>=0?"▲ ":"▼ ")+pct(evolution))+'</td><td>'+num(targetPhysical)+'</td><td>'+num(salesPhysical)+'</td><td>'+pct(physicalAttainment)+'</td></tr>'+
    '</tbody></table></div>'+
    '<div class="group-share-insights">'+
      '<div><strong>'+below+' grupos</strong><span>abaixo da meta financeira</span></div>'+
      '<div><strong>'+(bestAtt?esc(GROUP_LABELS[bestAtt.group_code]||bestAtt.group_code):"—")+'</strong><span>maior atingimento '+(bestAtt?pct(bestAtt.attainment):"—")+'</span></div>'+
      '<div><strong>'+(bestEvolution?esc(GROUP_LABELS[bestEvolution.group_code]||bestEvolution.group_code):"—")+'</strong><span>melhor evolução vs LY '+(bestEvolution?pct(bestEvolution.evolution_vs_ly):"—")+'</span></div>'+
      '<div><strong>'+(worst.length?worst.map(g=>esc(GROUP_LABELS[g.group_code]||g.group_code)).join(" e "):"—")+'</strong><span>maiores desvios em valor</span></div>'+
    '</div>'+
    '<div class="group-share-footer"><span>RIACHUELO</span><b>Moda que inspira o Brasil</b></div>';
}

function renderGroupSharePanel(){
  const html=buildGroupPanelHtml();
  if($("groupSharePanel")) $("groupSharePanel").innerHTML=html;
  if($("homeGroupSharePanel")) $("homeGroupSharePanel").innerHTML=html;
  if($("groupPanelModalContent")) $("groupPanelModalContent").innerHTML=html;
}

function openGroupPanel(){
  renderGroupSharePanel();
  $("groupPanelModal").classList.remove("hidden");
}

function closeGroupPanel(){
  $("groupPanelModal").classList.add("hidden");
}

async function shareGroupPanelSummary(){
  const d=state.day||{};
  const target=Number(d.target_financial||0);
  const sale=Number(d.sales_financial||0);
  const attainment=target?sale/target*100:0;
  const deviation=sale-target;
  const ly=Number(d.ly_financial||0);
  const evolution=ly&&d.has_input?((sale/ly)-1)*100:null;
  const intervalGrowth=d.interval_growth_pct===null||d.interval_growth_pct===undefined?null:Number(d.interval_growth_pct);

  const textMsg='📊 *DESEMPENHO POR GRUPO DE VENDA*\n'+
    'Loja '+state.storeCode+' • '+new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR")+' • '+(d.captured_at?'Atualizado '+localTime(d.captured_at):'Sem input')+'\n\n'+
    '🎯 Meta: '+money(target,2)+'\n'+
    '💰 Venda: '+money(sale,2)+' • '+pct(attainment)+'\n'+
    '↕️ Desvio: '+signedMoney(deviation,2)+'\n'+
    '📈 Vs LY: '+(evolution===null?'—':pct(evolution))+'\n'+
    '🕐 Vs hora anterior: '+(intervalGrowth===null?'—':pct(intervalGrowth))+'\n\n'+
    'Painel completo disponível no Meu Acompanhamento.';

  try{
    if(navigator.share){
      await navigator.share({title:"Desempenho por Grupo de Venda",text:textMsg});
    }else if(navigator.clipboard){
      await navigator.clipboard.writeText(textMsg);
      toast("Resumo copiado. O painel está pronto para print.");
    }else{
      toast("Painel pronto para print.");
    }
  }catch(e){
    if(e?.name!=="AbortError") toast("Não foi possível compartilhar o resumo.",true);
  }
}

function renderHistory(){
  renderHistoryVisual();
  const rows=Array.isArray(state.history)?state.history:[];
  let prev=0;
  const html=rows.length?rows.map(r=>{
    const sale=Number(r.sales_financial||0), interval=sale-prev; prev=sale;
    return '<tr><td>'+localTime(r.captured_at)+'</td><td>'+money(sale,2)+'</td><td class="'+(interval>=0?"positive":"negative")+'">'+(interval>=0?"+ ":"- ")+money(Math.abs(interval),2)+'</td><td>'+num(r.sales_physical)+'</td><td>'+num(r.rows_valid)+'</td><td>'+num(r.rows_excluded)+'</td></tr>';
  }).join(""):'<tr><td colspan="6" style="text-align:center;padding:30px;color:#6F7C77">Nenhum input registrado hoje.</td></tr>';
  if($("historyTable")) $("historyTable").innerHTML=html;
  renderAdminInputs();
}

async function loadRegional(){
  if(state.role!=="administrador") return;
  try{
    state.regional=await api("regional",{matricula:state.matricula,business_date:localDate()});
    renderRegional();
  }catch(e){toast(e.message,true)}
}
function renderRegional(){
  const rows=Array.isArray(state.regional)?state.regional:[];
  const total=rows.reduce((a,r)=>{a.meta+=Number(r.target_financial||0);a.sale+=Number(r.sales_financial||0);a.physical+=Number(r.sales_physical||0);a.ly+=Number(r.ly_financial||0);a.inputs+=r.has_input?1:0;return a},{meta:0,sale:0,physical:0,ly:0,inputs:0});
  const att=total.meta?total.sale/total.meta*100:0, dev=total.sale-total.meta;
  const regionalEvolution=total.ly?((total.sale/total.ly)-1)*100:null;
  const intervalTotal=rows.reduce((a,r)=>a+Number(r.interval_sales_financial||0),0);
  const previousIntervalTotal=rows.reduce((a,r)=>a+Number(r.previous_interval_sales_financial||0),0);
  const regionalHourEvolution=previousIntervalTotal?((intervalTotal/previousIntervalTotal)-1)*100:null;
  const activePct=rows.length?total.inputs/rows.length*100:0;
  const avgAttRows=rows.filter(r=>r.has_input&&Number(r.target_financial||0)>0);
  const avgAtt=avgAttRows.length?avgAttRows.reduce((a,r)=>a+(Number(r.sales_financial||0)/Number(r.target_financial||1)*100),0)/avgAttRows.length:0;
  if($("regionalVisualSummary")) $("regionalVisualSummary").innerHTML=
    visualDonut("Atingimento regional",att,pct(att),"Venda regional x meta",att>=100?"good":att>=90?"warn":"bad")+
    visualDonut("Lojas atualizadas",activePct,pct(activePct),total.inputs+" de "+rows.length+" lojas",activePct>=90?"good":activePct>=70?"warn":"bad")+
    visualDonut("Vs LY",regionalEvolution===null?0:regionalEvolution,regionalEvolution===null?"—":pct(regionalEvolution),"Evolução / involução regional",regionalEvolution===null?"neutral":regionalEvolution>=0?"good":"bad")+
    visualDonut("Vs hora anterior",regionalHourEvolution===null?0:regionalHourEvolution,regionalHourEvolution===null?"—":pct(regionalHourEvolution),"Ritmo regional entre parciais",regionalHourEvolution===null?"neutral":regionalHourEvolution>=0?"good":"bad");
  $("regionalKpis").innerHTML=[
    kpi("Meta regional",money(total.meta,2),rows.length+" lojas"),
    kpi("Venda regional",money(total.sale,2),pct(att)+" da meta",att>=100?"positive":att>=90?"warning":"negative"),
    kpi("Desvio regional",(dev>=0?"+ ":"- ")+money(Math.abs(dev),2),"Meta x realizado",dev>=0?"positive":"negative"),
    kpi("Lojas com input",total.inputs+"/"+rows.length,"Atualizadas hoje",total.inputs===rows.length?"positive":"warning")
  ].join("");
  $("regionalTable").innerHTML=rows.map(r=>{
    const meta=Number(r.target_financial||0),sale=Number(r.sales_financial||0),ly=Number(r.ly_financial||0),a=meta?sale/meta*100:0,d=sale-meta,e=ly&&r.has_input?((sale/ly)-1)*100:null;
    const interval=Number(r.interval_sales_financial||0);
    const prevInterval=Number(r.previous_interval_sales_financial||0);
    const hourEvol=prevInterval?((interval/prevInterval)-1)*100:null;
    return '<tr><td><b>'+esc(r.store_code)+'</b></td><td>'+money(meta,2)+'</td><td>'+money(sale,2)+'</td><td class="'+(r.has_input?(a>=100?"cell-good":a>=90?"cell-warn":"cell-bad"):"")+'">'+(r.has_input?pct(a):"Sem input")+'</td><td class="'+(r.has_input?(d>=0?"positive":"negative"):"")+'">'+(r.has_input?(d>=0?"+ ":"- ")+money(Math.abs(d),2):"—")+'</td><td>'+num(r.sales_physical)+'</td><td>'+money(ly,2)+'</td><td class="'+(e===null?"":e>=0?"positive":"negative")+'">'+(e===null?"—":pct(e))+'</td><td class="'+(hourEvol===null?"":hourEvol>=0?"positive":"negative")+'">'+(hourEvol===null?"—":(hourEvol>=0?"▲ ":"▼ ")+pct(hourEvol))+'</td><td>'+localTime(r.captured_at)+'</td></tr>';
  }).join("");
  renderRegionalSharePanel();
}

function buildRegionalPanelHtml(){
  const rows=Array.isArray(state.regional)?state.regional:[];
  const total=rows.reduce((a,r)=>{
    a.meta+=Number(r.target_financial||0);
    a.sale+=Number(r.sales_financial||0);
    a.physical+=Number(r.sales_physical||0);
    a.ly+=Number(r.ly_financial||0);
    a.interval+=Number(r.interval_sales_financial||0);
    a.previousInterval+=Number(r.previous_interval_sales_financial||0);
    a.inputs+=r.has_input?1:0;
    return a;
  },{meta:0,sale:0,physical:0,ly:0,interval:0,previousInterval:0,inputs:0});

  const attainment=total.meta?total.sale/total.meta*100:0;
  const deviation=total.sale-total.meta;
  const evolution=total.ly?((total.sale/total.ly)-1)*100:null;
  const hourEvolution=total.previousInterval?((total.interval/total.previousInterval)-1)*100:null;
  const activePct=rows.length?total.inputs/rows.length*100:0;
  const updatedTimes=rows.filter(r=>r.captured_at).map(r=>new Date(r.captured_at).getTime());
  const latestUpdate=updatedTimes.length?localTime(new Date(Math.max(...updatedTimes)).toISOString()):"sem input";
  const dateLabel=new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");

  const tableRows=rows.map(r=>{
    const meta=Number(r.target_financial||0);
    const sale=Number(r.sales_financial||0);
    const ly=Number(r.ly_financial||0);
    const att=meta?sale/meta*100:0;
    const dev=sale-meta;
    const ev=ly&&r.has_input?((sale/ly)-1)*100:null;
    const interval=Number(r.interval_sales_financial||0);
    const prevInterval=Number(r.previous_interval_sales_financial||0);
    const hourEv=prevInterval?((interval/prevInterval)-1)*100:null;
    return '<tr>'+
      '<td class="regional-store-cell">'+esc(r.store_code)+'</td>'+
      '<td>'+money(meta,2)+'</td>'+
      '<td>'+money(sale,2)+'</td>'+
      '<td class="'+(r.has_input?performanceClass(att,100,90):"")+'">'+(r.has_input?pct(att):"Sem input")+'</td>'+
      '<td class="'+(r.has_input?(dev>=0?"perf-good":"perf-soft-bad"):"")+'">'+(r.has_input?signedMoney(dev,2):"—")+'</td>'+
      '<td>'+num(r.sales_physical)+'</td>'+
      '<td>'+money(ly,2)+'</td>'+
      '<td class="'+(ev===null?"":ev>=0?"perf-good":"perf-soft-bad")+'">'+(ev===null?"—":(ev>=0?"▲ ":"▼ ")+pct(ev))+'</td>'+
      '<td>'+money(interval,2)+'</td>'+
      '<td class="'+(hourEv===null?"":hourEv>=0?"perf-good":"perf-soft-bad")+'">'+(hourEv===null?"—":(hourEv>=0?"▲ ":"▼ ")+pct(hourEv))+'</td>'+
      '<td>'+localTime(r.captured_at)+'</td>'+
    '</tr>';
  }).join("");

  const topStores=[...rows]
    .filter(r=>r.has_input&&Number(r.target_financial||0)>0)
    .sort((a,b)=>(Number(b.sales_financial||0)/Number(b.target_financial||1))-(Number(a.sales_financial||0)/Number(a.target_financial||1)))
    .slice(0,3);

  const attention=[...rows]
    .filter(r=>r.has_input)
    .sort((a,b)=>(Number(a.sales_financial||0)-Number(a.target_financial||0))-(Number(b.sales_financial||0)-Number(b.target_financial||0)))
    .slice(0,3);

  return '<div class="regional-share-header">'+
      '<div class="regional-share-brand"><img src="./assets/riachuelo-logo-vertical.svg" alt="Riachuelo"></div>'+
      '<div class="regional-share-title"><span>CE+PI • PARCIAL HORA A HORA</span><h3>CONSOLIDADO REGIONAL</h3><p>'+dateLabel+' • Atualização mais recente às '+latestUpdate+'</p></div>'+
      '<div class="regional-share-slogan">MODA QUE<br>INSPIRA O BRASIL</div>'+
    '</div>'+
    '<div class="regional-share-kpis">'+
      '<div><span>Meta regional</span><strong>'+money(total.meta,2)+'</strong><small>'+rows.length+' lojas</small></div>'+
      '<div><span>Venda regional</span><strong>'+money(total.sale,2)+'</strong><small>'+pct(attainment)+' da meta</small></div>'+
      '<div><span>Desvio regional</span><strong class="'+(deviation>=0?"positive":"negative")+'">'+signedMoney(deviation,2)+'</strong><small>Meta x realizado</small></div>'+
      '<div><span>Vs LY</span><strong class="'+(evolution===null?"":evolution>=0?"positive":"negative")+'">'+(evolution===null?"—":pct(evolution))+'</strong><small>'+(evolution===null?"Sem referência":evolution>=0?"Evolução":"Involução")+'</small></div>'+
      '<div><span>Vs hora anterior</span><strong class="'+(hourEvolution===null?"":hourEvolution>=0?"positive":"negative")+'">'+(hourEvolution===null?"—":pct(hourEvolution))+'</strong><small>Ritmo entre parciais</small></div>'+
      '<div><span>Lojas atualizadas</span><strong>'+total.inputs+'/'+rows.length+'</strong><small>'+pct(activePct)+' com input</small></div>'+
    '</div>'+
    '<div class="regional-share-table-wrap"><table class="regional-share-table"><thead><tr>'+
      '<th>Loja</th><th>Meta Dia</th><th>Venda Atual</th><th>% Ating.</th><th>Desvio</th><th>Venda Fís.</th><th>Venda LY</th><th>Vs LY</th><th>Venda último input</th><th>Vs hora anterior</th><th>Atualização</th>'+
    '</tr></thead><tbody>'+tableRows+
      '<tr class="group-total-row"><td>CE+PI</td><td>'+money(total.meta,2)+'</td><td>'+money(total.sale,2)+'</td><td>'+pct(attainment)+'</td><td>'+signedMoney(deviation,2)+'</td><td>'+num(total.physical)+'</td><td>'+money(total.ly,2)+'</td><td>'+(evolution===null?"—":pct(evolution))+'</td><td>'+money(total.interval,2)+'</td><td>'+(hourEvolution===null?"—":pct(hourEvolution))+'</td><td>'+latestUpdate+'</td></tr>'+
    '</tbody></table></div>'+
    '<div class="regional-share-insights">'+
      '<div><span>TOP ATINGIMENTO</span><strong>'+(topStores.length?topStores.map(r=>"Loja "+esc(r.store_code)+" "+pct(Number(r.sales_financial||0)/Number(r.target_financial||1)*100)).join(" • "):"Aguardando inputs")+'</strong></div>'+
      '<div><span>MAIORES DESVIOS</span><strong>'+(attention.length?attention.map(r=>"Loja "+esc(r.store_code)+" "+signedMoney(Number(r.sales_financial||0)-Number(r.target_financial||0),0)).join(" • "):"Aguardando inputs")+'</strong></div>'+
      '<div><span>ATUALIZAÇÃO</span><strong>'+total.inputs+' de '+rows.length+' lojas com parcial</strong></div>'+
    '</div>'+
    '<div class="group-share-footer"><span>RIACHUELO</span><b>Moda que inspira o Brasil</b></div>';
}

function renderRegionalSharePanel(){
  if($("regionalPanelModalContent")) $("regionalPanelModalContent").innerHTML=buildRegionalPanelHtml();
}

function openRegionalPanel(){
  if(state.role!=="administrador") return;
  renderRegionalSharePanel();
  $("regionalPanelModal").classList.remove("hidden");
}

function closeRegionalPanel(){
  $("regionalPanelModal").classList.add("hidden");
}

async function createRegionalPanelImage(){
  const rows=Array.isArray(state.regional)?state.regional:[];
  const width=1800;
  const rowH=46;
  const height=350+(rows.length+1)*rowH+100;
  const canvas=document.createElement("canvas");
  canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext("2d");
  if(!ctx) throw new Error("Não foi possível gerar o painel.");

  const C={green:"#173F35",green2:"#466964",cream:"#F6F3EC",line:"#DAD9D6",white:"#FFFFFF",orange:"#DE7C00",red:"#B4493A",good:"#2E6B58",ink:"#17352E",muted:"#6F7C77",soft:"#F7F8F6"};
  ctx.fillStyle=C.white; ctx.fillRect(0,0,width,height);
  ctx.fillStyle=C.green; ctx.fillRect(0,0,width,142);
  ctx.fillStyle=C.orange; ctx.fillRect(0,142,width,7);

  ctx.fillStyle=C.white;
  ctx.font="800 28px Arial";
  ctx.fillText("RIACHUELO",52,58);
  ctx.font="700 14px Arial";
  ctx.fillText("CE+PI • PARCIAL HORA A HORA",52,88);
  ctx.font="800 40px Arial";
  ctx.fillText("CONSOLIDADO REGIONAL",520,66);
  ctx.font="400 16px Arial";
  ctx.fillStyle="#D6D2C4";
  ctx.fillText(new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR")+" • visão por lojas",520,96);
  ctx.textAlign="right";
  ctx.font="700 13px Arial";
  ctx.fillStyle=C.white;
  ctx.fillText("MODA QUE INSPIRA O BRASIL",1745,72);
  ctx.textAlign="left";

  const total=rows.reduce((a,r)=>{
    a.meta+=Number(r.target_financial||0); a.sale+=Number(r.sales_financial||0);
    a.ly+=Number(r.ly_financial||0); a.physical+=Number(r.sales_physical||0);
    a.interval+=Number(r.interval_sales_financial||0);
    a.previousInterval+=Number(r.previous_interval_sales_financial||0);
    a.inputs+=r.has_input?1:0; return a;
  },{meta:0,sale:0,ly:0,physical:0,interval:0,previousInterval:0,inputs:0});
  const att=total.meta?total.sale/total.meta*100:0;
  const dev=total.sale-total.meta;
  const ev=total.ly?((total.sale/total.ly)-1)*100:null;
  const hourEv=total.previousInterval?((total.interval/total.previousInterval)-1)*100:null;

  const cards=[
    ["META REGIONAL",money(total.meta,0),"Meta do dia"],
    ["VENDA REGIONAL",money(total.sale,0),pct(att)+" da meta"],
    ["DESVIO",signedMoney(dev,0),dev>=0?"Acima da meta":"Saldo para meta"],
    ["VS LY",ev===null?"—":pct(ev),ev===null?"Sem referência":ev>=0?"Evolução":"Involução"],
    ["VS HORA ANTERIOR",hourEv===null?"—":pct(hourEv),"Ritmo regional"],
    ["LOJAS ATUALIZADAS",total.inputs+"/"+rows.length,pct(rows.length?total.inputs/rows.length*100:0)+" com input"]
  ];
  const gap=12,cardW=(width-104-gap*5)/6,cardY=174,cardH=116;
  cards.forEach((c,i)=>{
    const x=52+i*(cardW+gap);
    ctx.fillStyle=C.soft; ctx.strokeStyle=C.line; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(x,cardY,cardW,cardH,14); ctx.fill(); ctx.stroke();
    ctx.fillStyle=C.green2; ctx.font="700 12px Arial"; ctx.fillText(c[0],x+16,cardY+26);
    ctx.fillStyle=(c[0]==="DESVIO"&&dev<0)||(c[0]==="VS LY"&&ev!==null&&ev<0)||(c[0]==="VS HORA ANTERIOR"&&hourEv!==null&&hourEv<0)?C.red:C.ink;
    ctx.font="800 24px Arial"; ctx.fillText(c[1],x+16,cardY+60);
    ctx.fillStyle=C.muted; ctx.font="400 12px Arial"; ctx.fillText(c[2],x+16,cardY+84);
  });

  const cols=[
    {k:"store",label:"Loja",w:90,align:"left"},
    {k:"meta",label:"Meta Dia",w:185},
    {k:"sale",label:"Venda Atual",w:185},
    {k:"att",label:"% Ating.",w:112},
    {k:"dev",label:"Desvio",w:175},
    {k:"physical",label:"Venda Fís.",w:110},
    {k:"ly",label:"Venda LY",w:170},
    {k:"ev",label:"Vs LY",w:110},
    {k:"interval",label:"Último Input",w:170},
    {k:"hour",label:"Vs Hora Ant.",w:125},
    {k:"update",label:"Atualização",w:110}
  ];
  const tableX=52,tableY=318;
  let x=tableX;
  ctx.fillStyle=C.green; ctx.fillRect(tableX,tableY,width-104,rowH);
  cols.forEach(col=>{
    ctx.fillStyle=C.white;ctx.font="700 12px Arial";
    if(col.align==="left"){ctx.textAlign="left";ctx.fillText(col.label,x+10,tableY+29)}
    else{ctx.textAlign="right";ctx.fillText(col.label,x+col.w-10,tableY+29)}
    x+=col.w;
  });

  function compactMoney(v){return money(Number(v||0),0)}
  rows.forEach((r,idx)=>{
    const y=tableY+rowH*(idx+1);
    ctx.fillStyle=idx%2===0?C.white:"#FBFCFB";ctx.fillRect(tableX,y,width-104,rowH);
    ctx.strokeStyle="#E8EBE9";ctx.beginPath();ctx.moveTo(tableX,y+rowH);ctx.lineTo(width-52,y+rowH);ctx.stroke();

    const meta=Number(r.target_financial||0),sale=Number(r.sales_financial||0),ly=Number(r.ly_financial||0);
    const attainment=meta?sale/meta*100:0, deviation=sale-meta;
    const evol=ly&&r.has_input?((sale/ly)-1)*100:null;
    const interval=Number(r.interval_sales_financial||0),prev=Number(r.previous_interval_sales_financial||0);
    const hEv=prev?((interval/prev)-1)*100:null;
    const vals={
      store:r.store_code,
      meta:compactMoney(meta),
      sale:compactMoney(sale),
      att:r.has_input?pct(attainment):"Sem input",
      dev:r.has_input?signedMoney(deviation,0):"—",
      physical:num(r.sales_physical),
      ly:compactMoney(ly),
      ev:evol===null?"—":pct(evol),
      interval:r.has_input?compactMoney(interval):"—",
      hour:hEv===null?"—":pct(hEv),
      update:localTime(r.captured_at)
    };
    x=tableX;
    cols.forEach(col=>{
      let tone=C.ink;
      if(col.k==="att"&&r.has_input) tone=attainment>=100?C.good:attainment>=90?C.orange:C.red;
      if(col.k==="dev"&&r.has_input) tone=deviation>=0?C.good:C.red;
      if(col.k==="ev"&&evol!==null) tone=evol>=0?C.good:C.red;
      if(col.k==="hour"&&hEv!==null) tone=hEv>=0?C.good:C.red;
      ctx.fillStyle=tone;ctx.font=(col.k==="store"?"800":"600")+" 12px Arial";
      if(col.align==="left"){ctx.textAlign="left";ctx.fillText(String(vals[col.k]),x+10,y+29)}
      else{ctx.textAlign="right";ctx.fillText(String(vals[col.k]),x+col.w-10,y+29)}
      x+=col.w;
    });
  });

  const ty=tableY+rowH*(rows.length+1);
  ctx.fillStyle=C.green;ctx.fillRect(tableX,ty,width-104,rowH);
  const totalVals=["CE+PI",compactMoney(total.meta),compactMoney(total.sale),pct(att),signedMoney(dev,0),num(total.physical),compactMoney(total.ly),ev===null?"—":pct(ev),compactMoney(total.interval),hourEv===null?"—":pct(hourEv),"—"];
  x=tableX;
  cols.forEach((col,i)=>{
    ctx.fillStyle=C.white;ctx.font="800 12px Arial";
    if(col.align==="left"){ctx.textAlign="left";ctx.fillText(totalVals[i],x+10,ty+29)}
    else{ctx.textAlign="right";ctx.fillText(totalVals[i],x+col.w-10,ty+29)}
    x+=col.w;
  });

  ctx.textAlign="left";ctx.fillStyle=C.green2;ctx.font="700 12px Arial";
  ctx.fillText("MEU ACOMPANHAMENTO • Resultado regional atualizado conforme último input de cada filial",52,height-38);
  ctx.textAlign="right";ctx.fillText("Moda que inspira o Brasil",width-52,height-38);
  ctx.textAlign="left";

  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Falha ao gerar imagem.")),"image/png",1));
}

async function shareRegionalPanel(){
  const rows=Array.isArray(state.regional)?state.regional:[];
  if(!rows.length){toast("Ainda não há dados regionais para compartilhar.",true);return}

  const total=rows.reduce((a,r)=>{
    a.meta+=Number(r.target_financial||0);a.sale+=Number(r.sales_financial||0);
    a.ly+=Number(r.ly_financial||0);a.interval+=Number(r.interval_sales_financial||0);
    a.previousInterval+=Number(r.previous_interval_sales_financial||0);a.inputs+=r.has_input?1:0;
    return a;
  },{meta:0,sale:0,ly:0,interval:0,previousInterval:0,inputs:0});
  const att=total.meta?total.sale/total.meta*100:0;
  const dev=total.sale-total.meta;
  const ev=total.ly?((total.sale/total.ly)-1)*100:null;
  const hourEv=total.previousInterval?((total.interval/total.previousInterval)-1)*100:null;
  const textMsg='📊 *CONSOLIDADO REGIONAL | HORA A HORA*\nCE+PI • '+new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR")+
    '\n\n🎯 Meta: '+money(total.meta,2)+'\n💰 Venda: '+money(total.sale,2)+' • '+pct(att)+
    '\n↕️ Desvio: '+signedMoney(dev,2)+'\n📈 Vs LY: '+(ev===null?'—':pct(ev))+
    '\n🕐 Vs hora anterior: '+(hourEv===null?'—':pct(hourEv))+'\n🏬 Lojas atualizadas: '+total.inputs+'/'+rows.length;

  const btn=$("shareRegionalPanel");
  btn.disabled=true;btn.textContent="Gerando painel...";
  try{
    const blob=await createRegionalPanelImage();
    const file=new File([blob],"Consolidado_Regional_CEPI_"+localDate()+".png",{type:"image/png"});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({title:"Consolidado Regional CE+PI",text:textMsg,files:[file]});
      toast("Painel regional compartilhado.");
    }else{
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      if(navigator.clipboard) await navigator.clipboard.writeText(textMsg).catch(()=>{});
      toast("Imagem do painel gerada. Resumo copiado para acompanhar o envio.");
    }
  }catch(e){
    if(e?.name!=="AbortError") toast(e.message||"Não foi possível compartilhar o painel regional.",true);
  }finally{
    btn.disabled=false;btn.textContent="Compartilhar painel";
  }
}


async function loadCommercials(){
  try{
    const data=await api("commercials",{
      matricula:state.matricula,
      business_date:localDate(),
      store_code:state.storeCode
    });
    state.commercial=data||{commercials:[]};
    renderCommercials();
    if(state.role==="administrador"){
      await ensureCommercialCatalog();
      renderAdminCommercials();
    }
  }catch(e){
    toast(e.message,true);
    if($("commercialEmpty")){
      $("commercialEmpty").textContent=e.message;
      $("commercialEmpty").classList.remove("hidden");
    }
  }
}

function renderCommercials(){
  const payload=state.commercial||{};
  const rows=Array.isArray(payload.commercials)?payload.commercials:[];
  const total=rows.reduce((a,r)=>{
    a.target+=Number(r.target_financial||0);
    a.sale+=Number(r.sales_financial||0);
    a.interval+=Number(r.interval_sales_financial||0);
    return a;
  },{target:0,sale:0,interval:0});
  const attainment=total.target?total.sale/total.target*100:0;
  const deviation=total.sale-total.target;
  renderCommercialVisual(rows,total);

  if($("commercialKpis")) $("commercialKpis").innerHTML=[
    kpi("Comerciais ativos",num(rows.length),"Com DCOs atribuídos na Loja "+state.storeCode),
    kpi("Meta atribuída",money(total.target,2),"Soma automática dos DCOs"),
    kpi("Venda atual",money(total.sale,2),rows.length?pct(attainment)+" da meta":"Aguardando cadastro",rows.length?(attainment>=100?"positive":attainment>=90?"warning":"negative"):""),
    kpi("Desvio",(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2),"Resultado x meta",deviation>=0?"positive":"negative")
  ].join("");

  const empty=$("commercialEmpty");
  const grid=$("commercialGrid");
  if($("commercialAdminStore")) $("commercialAdminStore").textContent="Loja "+state.storeCode;

  if(!grid||!empty) return;
  if(!rows.length){
    grid.innerHTML="";
    empty.innerHTML=state.role==="administrador"
      ? "<b>Nenhum comercial cadastrado para esta filial.</b><br>Cadastre em Administração → Comerciais."
      : "<b>Nenhum comercial cadastrado para esta filial.</b><br>O cadastro é realizado pela Administração.";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML=rows.map(r=>{
    const target=Number(r.target_financial||0);
    const sale=Number(r.sales_financial||0);
    const attainment=target?sale/target*100:0;
    const deviation=Number(r.deviation||0);
    const evolution=r.evolution_vs_ly===null||r.evolution_vs_ly===undefined?null:Number(r.evolution_vs_ly);
    const interval=Number(r.interval_sales_financial||0);
    const dcos=Array.isArray(r.dcos)?r.dcos:[];
    const detractors=dcos.filter(d=>Number(d.deviation||0)<0).slice(0,3);
    const worlds=[...new Set(dcos.map(d=>WORLD_LABELS[d.world_code]||d.world_code).filter(Boolean))];
    const initials=String(r.commercial_name||"?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    const photo=r.photo_url
      ? '<img src="'+esc(r.photo_url)+'" alt="'+esc(r.commercial_name)+'">'
      : '<span>'+esc(initials)+'</span>';
    const circle=Math.max(0,Math.min(100,attainment));

    return '<article class="commercial-card">'+
      '<div class="commercial-card-top">'+
        '<div class="commercial-person"><div class="commercial-avatar">'+photo+'</div><div><span class="eyebrow">RESPONSÁVEL COMERCIAL</span><h2>'+esc(r.commercial_name)+'</h2><small>'+esc(worlds.join(" • ")||"DCOs atribuídos")+'</small></div></div>'+
        '<div class="commercial-donut" style="--p:'+circle+'"><div><strong>'+pct(attainment)+'</strong><span>meta</span></div></div>'+
      '</div>'+
      '<div class="commercial-metrics">'+
        '<div><span>Meta</span><strong>'+money(target,2)+'</strong></div>'+
        '<div><span>Venda</span><strong>'+money(sale,2)+'</strong></div>'+
        '<div><span>Desvio</span><strong class="'+(deviation>=0?"positive":"negative")+'">'+(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2)+'</strong></div>'+
        '<div><span>Vs LY</span><strong class="'+(evolution===null?"":evolution>=0?"positive":"negative")+'">'+(evolution===null?"—":pct(evolution))+'</strong></div>'+
        '<div><span>Último input</span><strong class="'+(interval>=0?"positive":"negative")+'">'+(interval>=0?"+ ":"- ")+money(Math.abs(interval),2)+'</strong></div>'+
        '<div><span>DCOs</span><strong>'+num(dcos.length)+'</strong></div>'+
      '</div>'+
      '<div class="commercial-detractors"><span class="eyebrow">DCOs QUE MAIS PRESSIONAM O RESULTADO</span>'+
        (detractors.length?detractors.map(d=>
          '<div class="detractor-row"><span><b>'+esc(d.dco_code)+'</b> '+esc(d.dco_name)+'</span><strong class="negative">- '+money(Math.abs(Number(d.deviation||0)),2)+'</strong></div>'
        ).join(""):'<div class="detractor-row"><span>Sem DCO abaixo da meta no momento.</span><strong class="positive">✓</strong></div>')+
      '</div>'+
    '</article>';
  }).join("");
}

async function ensureCommercialCatalog(){
  try{
    state.dcoCatalog=await api("catalog",{matricula:state.matricula,store_code:state.storeCode})||[];
    renderCommercialDcos();
    renderAdminStructure();
  }catch(e){
    if($("commercialSaveFeedback")){
      $("commercialSaveFeedback").textContent=e.message;
      $("commercialSaveFeedback").className="form-error";
    }
  }
}

function renderCommercialDcos(){
  const box=$("commercialDcoSelector");
  if(!box) return;
  const filter=$("commercialWorldFilter")?.value||"";
  const rows=(Array.isArray(state.dcoCatalog)?state.dcoCatalog:[]).filter(d=>!filter||d.world_code===filter);
  box.innerHTML=rows.length?rows.map(d=>
    '<label class="dco-check"><input type="checkbox" value="'+esc(d.code)+'" '+(state.commercialSelectedDcos.has(Number(d.code))?"checked":"")+'><span><b>'+esc(d.code)+' • '+esc(d.name)+'</b><small>'+esc(GROUP_LABELS[d.group_code]||d.group_code||"Sem grupo")+' · '+esc(WORLD_LABELS[d.world_code]||d.world_code||"Geral")+'</small></span></label>'
  ).join(""):'<div class="empty-box small-empty">Nenhum DCO disponível neste filtro.</div>';
  box.querySelectorAll('input[type="checkbox"]').forEach(el=>el.addEventListener("change",()=>{
    const code=Number(el.value);
    if(el.checked) state.commercialSelectedDcos.add(code);
    else state.commercialSelectedDcos.delete(code);
  }));
}

function resetCommercialForm(){
  state.editingCommercialId=null;
  state.commercialSelectedDcos=new Set();
  state.commercialPhotoData="";
  if($("commercialName")) $("commercialName").value="";
  if($("commercialPhoto")) $("commercialPhoto").value="";
  if($("commercialWorldFilter")) $("commercialWorldFilter").value="";
  if($("commercialFormTitle")) $("commercialFormTitle").textContent="Cadastrar responsável";
  if($("saveCommercialBtn")) $("saveCommercialBtn").textContent="Salvar comercial";
  if($("cancelCommercialEdit")) $("cancelCommercialEdit").classList.add("hidden");
  if($("commercialCurrentPhoto")){$("commercialCurrentPhoto").innerHTML="";$("commercialCurrentPhoto").classList.add("hidden")}
  if($("commercialSaveFeedback")) $("commercialSaveFeedback").classList.add("hidden");
  renderCommercialDcos();
}

function editCommercial(id){
  const row=(state.commercial?.commercials||[]).find(r=>r.commercial_id===id);
  if(!row) return;
  state.editingCommercialId=id;
  state.commercialPhotoData="";
  state.commercialSelectedDcos=new Set((row.dcos||[]).map(d=>Number(d.dco_code)));
  $("commercialName").value=row.commercial_name||"";
  $("commercialPhoto").value="";
  $("commercialWorldFilter").value="";
  $("commercialFormTitle").textContent="Editar "+(row.commercial_name||"comercial");
  $("saveCommercialBtn").textContent="Salvar alterações";
  $("cancelCommercialEdit").classList.remove("hidden");
  const photoBox=$("commercialCurrentPhoto");
  if(row.photo_url){
    photoBox.innerHTML='<img src="'+esc(row.photo_url)+'" alt="'+esc(row.commercial_name)+'"><span>Foto atual. Selecione outra imagem apenas se quiser substituir.</span>';
    photoBox.classList.remove("hidden");
  }else{
    photoBox.innerHTML='<span>Sem foto cadastrada. Você pode adicionar agora.</span>';
    photoBox.classList.remove("hidden");
  }
  renderCommercialDcos();
  $("commercialAdminPanel").scrollIntoView({behavior:"smooth",block:"start"});
}

function renderAdminCommercials(){
  const box=$("adminCommercialList");
  if(!box) return;
  const rows=Array.isArray(state.commercial?.commercials)?state.commercial.commercials:[];
  if(!rows.length){
    box.innerHTML='<div class="empty-box">Nenhum comercial cadastrado nesta filial.</div>';
    return;
  }
  box.innerHTML=rows.map(r=>{
    const dcos=Array.isArray(r.dcos)?r.dcos:[];
    const initials=String(r.commercial_name||"?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    const photo=r.photo_url?'<img src="'+esc(r.photo_url)+'" alt="'+esc(r.commercial_name)+'">':'<span>'+esc(initials)+'</span>';
    return '<article class="admin-commercial-row">'+
      '<div class="commercial-avatar small-avatar">'+photo+'</div>'+
      '<div class="admin-commercial-info"><strong>'+esc(r.commercial_name)+'</strong><span>'+num(dcos.length)+' DCO(s) • '+dcos.map(d=>d.dco_code).join(", ")+'</span></div>'+
      '<button class="btn secondary small edit-commercial-btn" data-commercial-id="'+esc(r.commercial_id)+'">Editar cadastro</button>'+
    '</article>';
  }).join("");
  box.querySelectorAll(".edit-commercial-btn").forEach(btn=>btn.onclick=()=>editCommercial(btn.dataset.commercialId));
}

function selectVisibleCommercialDcos(){
  document.querySelectorAll("#commercialDcoSelector input[type=checkbox]").forEach(el=>{
    el.checked=true;
    state.commercialSelectedDcos.add(Number(el.value));
  });
}

async function saveCommercial(){
  const name=$("commercialName").value.trim();
  const codes=[...state.commercialSelectedDcos];
  const feedback=$("commercialSaveFeedback");
  if(!name){feedback.textContent="Informe o nome do comercial.";feedback.className="form-error";return}
  if(!codes.length){feedback.textContent="Selecione ao menos um DCO.";feedback.className="form-error";return}

  const btn=$("saveCommercialBtn"); btn.disabled=true; btn.textContent="Salvando...";
  try{
    const result=await api("saveCommercial",{
      matricula:state.matricula,
      store_code:state.storeCode,
      commercial_name:name,
      photo_url:state.commercialPhotoData||null,
      dco_codes:codes,
      commercial_id:state.editingCommercialId
    });
    feedback.textContent=(state.editingCommercialId?"Cadastro revisado":"Comercial cadastrado")+" com "+num(result?.dco_count||codes.length)+" DCO(s).";
    feedback.className="form-error form-success";
    await loadCommercials();
    resetCommercialForm();
    renderAdminCommercials();
    toast("Cadastro comercial atualizado.");
  }catch(e){
    feedback.textContent=e.message; feedback.className="form-error"; toast(e.message,true);
  }finally{
    btn.disabled=false;
    btn.textContent=state.editingCommercialId?"Salvar alterações":"Salvar comercial";
  }
}

function setAdminTab(tab){
  state.adminTab=tab;
  document.querySelectorAll(".admin-tab").forEach(el=>el.classList.toggle("active",el.dataset.adminTab===tab));
  document.querySelectorAll(".admin-panel").forEach(el=>el.classList.toggle("active",el.id==="adminPanel-"+tab));
  if(tab==="comerciais") loadCommercials();
  if(tab==="escalas") loadScales();
  if(tab==="estrutura") ensureCommercialCatalog();
  if(tab==="metas") renderAdminMeta();
  if(tab==="inputs") renderAdminInputs();
}

async function loadAdmin(){
  if(state.role!=="administrador") return;
  if($("scaleDate")&&!$("scaleDate").value) $("scaleDate").value=localDate();
  renderAdminMeta();
  renderAdminInputs();
  await ensureCommercialCatalog();
  renderAdminVisual();
  await loadCommercials();
  if(state.adminTab==="escalas") await loadScales();
  setAdminTab(state.adminTab||"metas");
}

function renderAdminMeta(){
  if(!$("adminMetaKpis")) return;
  const d=state.day||{};
  const target=Number(d.target_financial||0), physical=Number(d.target_physical||0), ly=Number(d.ly_financial||0);
  $("adminMetaStore").textContent="Loja "+state.storeCode+" • "+new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");
  $("adminMetaKpis").innerHTML=[
    kpi("Meta financeira",money(target,2),"Meta do dia"),
    kpi("Meta física",num(physical)+" peças","Meta do dia"),
    kpi("Venda LY",money(ly,2),"Referência ano anterior"),
    kpi("Abertura",d.opening_time||"10:00","Base do cálculo do ritmo")
  ].join("");
  const groups=Array.isArray(state.groupSummary?.groups)?state.groupSummary.groups:[];
  $("adminMetaGroups").innerHTML='<table><thead><tr><th>Grupo</th><th>Meta Fin.</th><th>Meta Fís.</th><th>Venda LY</th></tr></thead><tbody>'+
    GROUP_ORDER.map(code=>{
      const g=groups.find(x=>x.group_code===code);
      if(!g) return "";
      return '<tr><td><b>'+esc(GROUP_LABELS[code]||code)+'</b></td><td>'+money(g.target_financial,2)+'</td><td>'+num(g.target_physical)+'</td><td>'+money(g.ly_financial,2)+'</td></tr>';
    }).join("")+'</tbody></table>';
}

function renderAdminInputs(){
  const target=$("adminHistoryTable");
  if(!target) return;
  const rows=Array.isArray(state.history)?state.history:[];
  let prev=0;
  target.innerHTML=rows.length?rows.map(r=>{
    const sale=Number(r.sales_financial||0), interval=sale-prev; prev=sale;
    return '<tr><td>'+localTime(r.captured_at)+'</td><td>'+money(sale,2)+'</td><td class="'+(interval>=0?"positive":"negative")+'">'+signedMoney(interval,2)+'</td><td>'+num(r.sales_physical)+'</td><td>'+num(r.rows_valid)+'</td><td>'+num(r.rows_excluded)+'</td></tr>';
  }).join(""):'<tr><td colspan="6" style="text-align:center;padding:28px;color:#6F7C77">Nenhum input ativo hoje.</td></tr>';
}

function renderAdminStructure(){
  if(!$("adminStructureKpis")||!$("adminStructureList")) return;
  const rows=Array.isArray(state.dcoCatalog)?state.dcoCatalog:[];
  const worlds=new Set(rows.map(r=>r.world_code).filter(Boolean));
  const groups=new Set(rows.map(r=>r.group_code).filter(Boolean));
  $("adminStructureKpis").innerHTML=[
    kpi("Mundos",num(worlds.size),"Estrutura ativa"),
    kpi("Grupos",num(groups.size),"Grupos de venda"),
    kpi("DCOs",num(rows.length),"Eletrônicos excluídos"),
    kpi("Filial",state.storeCode,"Em parametrização")
  ].join("");
  $("adminStructureList").innerHTML=GROUP_ORDER.map(code=>{
    const dcos=rows.filter(r=>r.group_code===code);
    return '<div class="structure-group"><strong>'+esc(GROUP_LABELS[code]||code)+'</strong><span>'+dcos.map(d=>esc(d.code)+" • "+esc(d.name)).join(" · ")+'</span></div>';
  }).join("");
}

async function loadScales(){
  if(state.role!=="administrador") return;
  const date=$("scaleDate")?.value||localDate();
  try{
    state.scales=await api("scaleProductivity",{
      matricula:state.matricula,business_date:date,store_code:state.storeCode
    })||{scales:[],productivity:[]};
    renderScales();
    renderAdminVisual();
  }catch(e){toast(e.message,true)}
}

function renderScales(){
  const scales=Array.isArray(state.scales?.scales)?state.scales.scales:[];
  const productivity=Array.isArray(state.scales?.productivity)?state.scales.productivity:[];
  const totals=productivity.reduce((a,r)=>{
    a.plan+=Number(r.planned_hc||0);a.actual+=Number(r.actual_hc||0);
    a.target+=Number(r.scale_target||0);a.sale+=Number(r.sales_financial||0);a.phys+=Number(r.sales_physical||0);
    return a;
  },{plan:0,actual:0,target:0,sale:0,phys:0});
  if($("scaleKpis")) $("scaleKpis").innerHTML=[
    kpi("HC planejado",num(totals.plan),"Escalas cadastradas"),
    kpi("HC real",num(totals.actual),"Presença informada"),
    kpi("Venda / HC",totals.actual?money(totals.sale/totals.actual,2):"—","Produtividade financeira"),
    kpi("Peças / HC",totals.actual?(totals.phys/totals.actual).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}):"—","Produtividade física")
  ].join("");

  if($("productivityTable")) $("productivityTable").innerHTML=productivity.length?productivity.map(r=>
    '<tr><td><b>'+esc(GROUP_LABELS[r.group_code]||r.group_code)+'</b></td><td>'+num(r.planned_hc)+'</td><td>'+num(r.actual_hc)+'</td><td>'+money(r.scale_target,2)+'</td><td>'+money(r.sales_financial,2)+'</td><td>'+money(r.financial_per_hc,2)+'</td><td>'+Number(r.physical_per_hc||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+'</td><td>'+money(r.target_per_hc,2)+'</td></tr>'
  ).join(""):'<tr><td colspan="8" style="text-align:center;padding:28px;color:#6F7C77">Cadastre a escala para iniciar a leitura de produtividade.</td></tr>';

  if($("scaleTable")) $("scaleTable").innerHTML=scales.length?scales.map(r=>
    '<tr><td>'+esc(GROUP_LABELS[r.group_code]||r.group_code||"Geral")+'</td><td>'+esc(r.shift_name)+'</td><td>'+esc((r.start_time||"—")+"–"+(r.end_time||"—"))+'</td><td>'+num(r.planned_hc)+'</td><td>'+num(r.actual_hc)+'</td><td>'+money(r.target_financial,2)+'</td><td><button class="btn secondary small edit-scale-btn" data-scale-id="'+esc(r.id)+'">Editar</button></td></tr>'
  ).join(""):'<tr><td colspan="7" style="text-align:center;padding:28px;color:#6F7C77">Nenhuma escala cadastrada nesta data.</td></tr>';

  document.querySelectorAll(".edit-scale-btn").forEach(btn=>btn.onclick=()=>editScale(btn.dataset.scaleId));
}

function resetScaleForm(){
  state.editingScaleId=null;
  $("scaleDate").value=$("scaleDate").value||localDate();
  $("scaleGroup").value="feminino_moda";
  $("scaleShift").value="";
  $("scaleStart").value="";
  $("scaleEnd").value="";
  $("scalePlannedHc").value="0";
  $("scaleActualHc").value="0";
  $("scaleTarget").value="0";
  $("scaleNotes").value="";
  $("scaleFormTitle").textContent="Adicionar escala";
  $("saveScaleBtn").textContent="Salvar escala";
  $("cancelScaleEdit").classList.add("hidden");
  $("scaleFeedback").classList.add("hidden");
}

function editScale(id){
  const row=(state.scales?.scales||[]).find(r=>r.id===id);
  if(!row) return;
  state.editingScaleId=id;
  $("scaleDate").value=row.business_date||localDate();
  $("scaleGroup").value=row.group_code||"feminino_moda";
  $("scaleShift").value=row.shift_name||"";
  $("scaleStart").value=row.start_time||"";
  $("scaleEnd").value=row.end_time||"";
  $("scalePlannedHc").value=row.planned_hc||0;
  $("scaleActualHc").value=row.actual_hc||0;
  $("scaleTarget").value=row.target_financial||0;
  $("scaleNotes").value=row.notes||"";
  $("scaleFormTitle").textContent="Editar escala";
  $("saveScaleBtn").textContent="Salvar alterações";
  $("cancelScaleEdit").classList.remove("hidden");
}

async function saveScale(){
  const feedback=$("scaleFeedback");
  const shift=$("scaleShift").value.trim();
  if(!shift){feedback.textContent="Informe o turno.";feedback.className="form-error";return}
  const btn=$("saveScaleBtn");btn.disabled=true;btn.textContent="Salvando...";
  try{
    await api("saveScale",{
      matricula:state.matricula,
      scale_id:state.editingScaleId,
      business_date:$("scaleDate").value||localDate(),
      store_code:state.storeCode,
      group_code:$("scaleGroup").value,
      shift_name:shift,
      start_time:$("scaleStart").value||null,
      end_time:$("scaleEnd").value||null,
      planned_hc:Number($("scalePlannedHc").value||0),
      actual_hc:Number($("scaleActualHc").value||0),
      target_financial:Number($("scaleTarget").value||0),
      notes:$("scaleNotes").value.trim()||null
    });
    feedback.textContent=state.editingScaleId?"Escala atualizada.":"Escala cadastrada.";
    feedback.className="form-error form-success";
    resetScaleForm();
    await loadScales();
    toast("Escala e produtividade atualizadas.");
  }catch(e){feedback.textContent=e.message;feedback.className="form-error";toast(e.message,true)}
  finally{btn.disabled=false;btn.textContent=state.editingScaleId?"Salvar alterações":"Salvar escala"}
}

function openResetDay(){
  $("resetStoreLabel").textContent="Loja "+state.storeCode;
  $("resetFeedback").classList.add("hidden");
  $("resetDayModal").classList.remove("hidden");
}

function closeResetDay(){
  $("resetDayModal").classList.add("hidden");
}

async function confirmResetDay(){
  const btn=$("confirmResetDay");
  btn.disabled=true;
  btn.textContent="Zerando...";
  try{
    const result=await api("resetDay",{
      matricula:state.matricula,
      store_code:state.storeCode,
      business_date:localDate(),
      reason:"Reinício manual do acompanhamento pelo usuário"
    });
    $("resetFeedback").textContent=(result?.voided_batches||0)+" input(s) retirado(s) do cálculo. O próximo input recomeça o acompanhamento desde a abertura.";
    $("resetFeedback").className="form-error form-success";
    await loadAll();
    setTimeout(closeResetDay,800);
    toast("Acompanhamento de hoje zerado.");
  }catch(e){
    $("resetFeedback").textContent=e.message;
    $("resetFeedback").className="form-error";
    toast(e.message,true);
  }finally{
    btn.disabled=false;
    btn.textContent="Sim, zerar acompanhamento";
  }
}

function logout(){
  localStorage.removeItem("meu_acompanhamento_session");
  state.logged=false; $("appShell").classList.add("hidden"); $("loginScreen").classList.remove("hidden");
}

function bind(){
  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault(); const btn=$("loginBtn"),err=$("loginError");
    err.classList.add("hidden"); btn.disabled=true; btn.textContent="Validando acesso...";
    try{await doLogin($("matricula").value,$("storeCode").value,true)}
    catch(ex){err.textContent=ex.message;err.classList.remove("hidden")}
    finally{btn.disabled=false;btn.textContent="Entrar na minha loja"}
  });
  $("matricula").addEventListener("input",e=>e.target.value=e.target.value.replace(/\D/g,""));
  $("storeCode").addEventListener("input",e=>e.target.value=e.target.value.replace(/\D/g,"").slice(0,3));
  document.querySelectorAll("[data-section]").forEach(el=>el.addEventListener("click",()=>setSection(el.dataset.section)));
  document.querySelectorAll(".open-paste").forEach(el=>el.onclick=showPaste);
  $("pasteBtn").onclick=showPaste; $("closePaste").onclick=hidePaste; $("cancelPaste").onclick=hidePaste;
  $("resetDayBtn").onclick=openResetDay; $("cancelResetDay").onclick=closeResetDay; $("confirmResetDay").onclick=confirmResetDay;
  $("resetDayModal").addEventListener("click",e=>{if(e.target===$("resetDayModal")) closeResetDay()});
  $("pasteArea").addEventListener("input",updatePastePreview); $("confirmPaste").onclick=confirmPaste;
  if($("finishChecklist")) $("finishChecklist").onclick=()=>{$("checklistModal").classList.add("hidden");showWorldModal()};
  $("logoutBtn").onclick=logout; $("adminStoreSelect").onchange=e=>changeAdminStore(e.target.value);
  $("refreshRegional").onclick=loadRegional;
  $("openRegionalPanel").onclick=openRegionalPanel;
  $("closeRegionalPanel").onclick=closeRegionalPanel;
  $("shareRegionalPanel").onclick=shareRegionalPanel;
  $("regionalPanelModal").addEventListener("click",e=>{if(e.target===$("regionalPanelModal")) closeRegionalPanel()});
  $("refreshCommercials").onclick=loadCommercials;
  if($("openGroupPanel")) $("openGroupPanel").onclick=openGroupPanel;
  if($("openGroupPanelInline")) $("openGroupPanelInline").onclick=openGroupPanel;
  if($("openGroupPanelHome")) $("openGroupPanelHome").onclick=openGroupPanel;
  $("closeGroupPanel").onclick=closeGroupPanel;
  $("shareGroupPanel").onclick=shareGroupPanelSummary;
  $("groupPanelModal").addEventListener("click",e=>{if(e.target===$("groupPanelModal")) closeGroupPanel()});
  $("commercialWorldFilter").onchange=renderCommercialDcos;
  $("selectAllCommercialDcos").onclick=selectVisibleCommercialDcos;
  $("saveCommercialBtn").onclick=saveCommercial;
  $("newCommercialBtn").onclick=resetCommercialForm;
  $("cancelCommercialEdit").onclick=resetCommercialForm;
  document.querySelectorAll(".admin-tab").forEach(el=>el.onclick=()=>setAdminTab(el.dataset.adminTab));
  if($("newScaleBtn")) $("newScaleBtn").onclick=resetScaleForm;
  if($("cancelScaleEdit")) $("cancelScaleEdit").onclick=resetScaleForm;
  if($("saveScaleBtn")) $("saveScaleBtn").onclick=saveScale;
  if($("scaleDate")) $("scaleDate").onchange=loadScales;
  $("adminResetDayBtn").onclick=openResetDay;
  $("commercialPhoto").onchange=e=>{
    const file=e.target.files?.[0];
    if(!file){state.commercialPhotoData="";return}
    if(file.size>600000){toast("Use uma foto de até 600 KB.",true);e.target.value="";return}
    const reader=new FileReader();
    reader.onload=()=>{
      state.commercialPhotoData=String(reader.result||"");
      const box=$("commercialCurrentPhoto");
      if(box){
        box.innerHTML='<img src="'+esc(state.commercialPhotoData)+'" alt="Nova foto"><span>Nova foto selecionada. Ela será aplicada ao salvar.</span>';
        box.classList.remove("hidden");
      }
      toast("Foto pronta para salvar.");
    };
    reader.readAsDataURL(file);
  };
  $("worldChoices").innerHTML=WORLD_ORDER.map(w=>'<button class="world-choice" data-world="'+w+'"><strong>'+esc(WORLD_LABELS[w])+'</strong><span>Abrir resultado do mundo</span></button>').join("");
  $("worldChoices").querySelectorAll("button").forEach(b=>b.onclick=()=>chooseWorld(b.dataset.world));
}

async function boot(){
  bind();
  if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}))}
  const saved=localStorage.getItem("meu_acompanhamento_session");
  if(saved){
    try{
      const s=JSON.parse(saved); $("matricula").value=s.matricula||""; $("storeCode").value=s.storeCode||"";
      await doLogin(s.matricula,s.storeCode,false);
    }catch(_){localStorage.removeItem("meu_acompanhamento_session")}
  }else{
    $("matricula").value=""; $("storeCode").value="";
  }
}
window.addEventListener("DOMContentLoaded",()=>boot());
