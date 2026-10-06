"use strict";

const API_URL = "https://vvgejviwvtnlahbyopah.supabase.co/functions/v1/meu-acompanhamento-api";
const STORE_CODES = ["073","084","108","113","138","142","146","175","177","222","238","258","262","314","318","344","350","552"];
const WORLD_LABELS = {feminino:"Feminino",masculino:"Masculino",infantil:"Infantil",casa:"Casa",beleza_relogios:"Beleza/Relógios"};
const GROUP_LABELS = {feminino_moda:"Feminino Moda",masculino_moda:"Masculino Moda",infantil_moda:"Infantil Moda",moda_casa:"Moda Casa",cba:"CBA",beleza:"Beleza",relogios:"Relógios",lpg:"LPG",basket:"Basket"};
const WORLD_ORDER = ["feminino","masculino","infantil","casa","beleza_relogios"];
const EXCLUDED_DCO = new Set([530,531,532,552]);

const state = {
  logged:false, matricula:"", storeCode:"", employeeName:"", role:"colaborador",
  world:"feminino", section:"inicio", day:null, detail:null, history:[], regional:[],
  commercial:null, dcoCatalog:[], commercialPhotoData:""
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
  if(save) localStorage.setItem("meu_acompanhamento_session",JSON.stringify({matricula:m,storeCode:s}));
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  $("identityName").textContent=state.employeeName;
  $("identityRole").textContent=roleLabel(state.role)+" • Loja "+state.storeCode;
  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",state.role!=="administrador"));
  $("adminStoreBar").classList.toggle("hidden",state.role!=="administrador");
  buildAdminStoreSelect();
  await loadAll();
  if(state.role==="supervisor") $("checklistModal").classList.remove("hidden");
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
  $("identityRole").textContent=roleLabel(state.role)+" • Loja "+state.storeCode;
  await loadAll();
  setSection("inicio");
}

async function loadAll(){
  $("workspaceLabel").textContent="WORKSPACE • LOJA "+state.storeCode;
  $("dateBadge").textContent=new Date(localDate()+"T12:00:00-03:00").toLocaleDateString("pt-BR");
  try{
    const [day,detail,history]=await Promise.all([
      api("dashboard",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode}),
      api("detail",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode}),
      api("history",{matricula:state.matricula,business_date:localDate(),store_code:state.storeCode})
    ]);
    state.day=day; state.detail=detail; state.history=Array.isArray(history)?history:[];
    renderDashboard(); renderGroups(); renderHistory();
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

function renderDashboard(){
  const d=state.day||{};
  const target=Number(d.target_financial||0), targetPhysical=Number(d.target_physical||0);
  const sale=Number(d.sales_financial||0), physical=Number(d.sales_physical||0), ly=Number(d.ly_financial||0);
  const has=!!d.has_input, attainment=target? sale/target*100:0, deviation=sale-target;
  const evolution=has&&ly?((sale/ly)-1)*100:null;
  const interval=Number(d.interval_sales_financial||0), delta=Number(d.interval_delta_financial||0);
  const intervalMinutes=Number(d.interval_minutes||0), remaining=calcClock();
  const currentPerHour=has&&intervalMinutes>0?interval/(intervalMinutes/60):0;
  const needed=target&&remaining>0?Math.max(0,target-sale)/remaining:0;
  const projection=has&&currentPerHour>0?sale+currentPerHour*remaining:0;
  const projDev=projection-target;
  $("updateBadge").textContent=d.captured_at?"Atualizado "+localTime(d.captured_at):"Hoje";
  const notice=$("metaNotice");
  if(d.has_target&&!has){notice.innerHTML="<b>Meta do dia carregada.</b> Faça o primeiro input da venda para iniciar o acompanhamento.";notice.className="notice";}
  else notice.classList.add("hidden");
  $("kpiGrid").innerHTML=[
    kpi("Meta do dia",d.has_target?money(target,2):"Sem meta","Meta física "+num(targetPhysical)+" peças"),
    kpi("Venda atual",has?money(sale,2):"Aguardando input",has?pct(attainment)+" da meta":"Cole a primeira parcial",has?(attainment>=100?"positive":attainment>=90?"warning":"negative"):""),
    kpi("Venda física",has?num(physical)+" peças":"—","Meta física "+num(targetPhysical),has&&physical>=targetPhysical?"positive":""),
    kpi("Desvio total",has?(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2):"—",has?(deviation>=0?"Acima da meta":"Saldo para a meta"):"Será calculado no 1º input",has?(deviation>=0?"positive":"negative"):""),
    kpi("Projeção do dia",projection?money(projection,2):"—",projection?(projDev>=0?"+ ":"- ")+money(Math.abs(projDev),2)+" projetado":"Aguardando ritmo",projection?(projDev>=0?"positive":"negative"):""),
    kpi(evolution!==null&&evolution<0?"Involução vs LY":"Evolução vs LY",evolution!==null?pct(evolution):"—",evolution!==null?"Venda LY "+money(ly,2):"Disponível após o input",evolution!==null?(evolution>=0?"positive":"negative"):""),
    kpi("Último intervalo",has?money(interval,2):"—",has?(delta>=0?"+ ":"- ")+money(Math.abs(delta),2)+" vs anterior":"Aguardando histórico",has?(delta>=0?"positive":"negative"):""),
    kpi("R$/h necessário",needed?money(needed,2):"—","Para alcançar a meta até 22h","warning"),
    kpi("R$/h atual",currentPerHour?money(currentPerHour,2):"—",currentPerHour&&needed?pct((currentPerHour/needed-1)*100)+" vs necessário":"Aguardando 2º input",currentPerHour?(currentPerHour>=needed?"positive":"negative"):""),
    kpi("Tempo restante",remaining?remaining.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+" h":"Encerrado","Fechamento às 22h")
  ].join("");

  const sg=$("signalGrid");
  if(has){
    sg.classList.remove("hidden");
    sg.innerHTML='<div class="signal '+(delta>=0?"good":"bad")+'"><b>'+(delta>=0?"Ganho":"Perda")+' de ritmo:</b> '+(delta>=0?"+ ":"- ")+money(Math.abs(delta),2)+'</div>'+
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
    ["Vs intervalo anterior",has?(delta>=0?"+ ":"- ")+money(Math.abs(delta),2):"—",delta>=0?"positive":"negative"]
  ].map(x=>'<div><span>'+x[0]+'</span><strong class="'+x[2]+'">'+x[1]+'</strong></div>').join("");

  $("intervalBox").className=has?"interval-live":"empty-box";
  $("intervalBox").innerHTML=has?'<strong>'+money(interval,2)+'</strong><span>venda do último intervalo</span><small>Atualização '+localTime(d.captured_at)+'</small>':"Faça o primeiro input para iniciar o acompanhamento do ritmo.";
  $("movementBox").className=has?"movement-live":"empty-box";
  $("movementBox").innerHTML=has?'<div><span>Último intervalo</span><strong>'+money(interval,2)+'</strong></div><div><span>Vs anterior</span><strong class="'+(delta>=0?"positive":"negative")+'">'+(delta>=0?"+ ":"- ")+money(Math.abs(delta),2)+'</strong></div><div><span>Atualização</span><strong>'+localTime(d.captured_at)+'</strong></div>':"Após o segundo input, o app mostra a variação do intervalo.";
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

function renderHistory(){
  const rows=Array.isArray(state.history)?state.history:[];
  let prev=0;
  $("historyTable").innerHTML=rows.length?rows.map(r=>{
    const sale=Number(r.sales_financial||0), interval=sale-prev; prev=sale;
    return '<tr><td>'+localTime(r.captured_at)+'</td><td>'+money(sale,2)+'</td><td class="'+(interval>=0?"positive":"negative")+'">'+(interval>=0?"+ ":"- ")+money(Math.abs(interval),2)+'</td><td>'+num(r.sales_physical)+'</td><td>'+num(r.rows_valid)+'</td><td>'+num(r.rows_excluded)+'</td></tr>';
  }).join(""):'<tr><td colspan="6" style="text-align:center;padding:30px;color:#6F7C77">Nenhum input registrado hoje.</td></tr>';
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
  $("regionalKpis").innerHTML=[
    kpi("Meta regional",money(total.meta,2),rows.length+" lojas"),
    kpi("Venda regional",money(total.sale,2),pct(att)+" da meta",att>=100?"positive":att>=90?"warning":"negative"),
    kpi("Desvio regional",(dev>=0?"+ ":"- ")+money(Math.abs(dev),2),"Meta x realizado",dev>=0?"positive":"negative"),
    kpi("Lojas com input",total.inputs+"/"+rows.length,"Atualizadas hoje",total.inputs===rows.length?"positive":"warning")
  ].join("");
  $("regionalTable").innerHTML=rows.map(r=>{
    const meta=Number(r.target_financial||0),sale=Number(r.sales_financial||0),ly=Number(r.ly_financial||0),a=meta?sale/meta*100:0,d=sale-meta,e=ly&&r.has_input?((sale/ly)-1)*100:null;
    return '<tr><td><b>'+esc(r.store_code)+'</b></td><td>'+money(meta,2)+'</td><td>'+money(sale,2)+'</td><td class="'+(r.has_input?(a>=100?"cell-good":a>=90?"cell-warn":"cell-bad"):"")+'">'+(r.has_input?pct(a):"Sem input")+'</td><td class="'+(r.has_input?(d>=0?"positive":"negative"):"")+'">'+(r.has_input?(d>=0?"+ ":"- ")+money(Math.abs(d),2):"—")+'</td><td>'+num(r.sales_physical)+'</td><td>'+money(ly,2)+'</td><td class="'+(e===null?"":e>=0?"positive":"negative")+'">'+(e===null?"—":pct(e))+'</td><td>'+localTime(r.captured_at)+'</td></tr>';
  }).join("");
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
    if(state.role==="administrador") await ensureCommercialCatalog();
  }catch(e){
    toast(e.message,true);
    $("commercialEmpty").textContent=e.message;
    $("commercialEmpty").classList.remove("hidden");
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

  $("commercialKpis").innerHTML=[
    kpi("Comerciais ativos",num(rows.length),"Com DCOs atribuídos na Loja "+state.storeCode),
    kpi("Meta atribuída",money(total.target,2),"Soma automática dos DCOs"),
    kpi("Venda atual",money(total.sale,2),rows.length?pct(attainment)+" da meta":"Aguardando cadastro",rows.length?(attainment>=100?"positive":attainment>=90?"warning":"negative"):""),
    kpi("Desvio",(deviation>=0?"+ ":"- ")+money(Math.abs(deviation),2),"Resultado x meta",deviation>=0?"positive":"negative")
  ].join("");

  const empty=$("commercialEmpty");
  const grid=$("commercialGrid");
  $("commercialAdminStore").textContent="Loja "+state.storeCode;

  if(!rows.length){
    grid.innerHTML="";
    empty.innerHTML=state.role==="administrador"
      ? "<b>Nenhum comercial cadastrado para esta filial.</b><br>Use o cadastro abaixo para informar o responsável e seus DCOs."
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
  }catch(e){
    $("commercialSaveFeedback").textContent=e.message;
    $("commercialSaveFeedback").className="form-error";
  }
}

function renderCommercialDcos(){
  const filter=$("commercialWorldFilter").value;
  const rows=(Array.isArray(state.dcoCatalog)?state.dcoCatalog:[]).filter(d=>!filter||d.world_code===filter);
  const box=$("commercialDcoSelector");
  box.innerHTML=rows.length?rows.map(d=>
    '<label class="dco-check"><input type="checkbox" value="'+esc(d.code)+'"><span><b>'+esc(d.code)+' • '+esc(d.name)+'</b><small>'+esc(GROUP_LABELS[d.group_code]||d.group_code||"Sem grupo")+' · '+esc(WORLD_LABELS[d.world_code]||d.world_code||"Geral")+'</small></span></label>'
  ).join(""):'<div class="empty-box small-empty">Nenhum DCO disponível neste filtro.</div>';
}

async function saveCommercial(){
  const name=$("commercialName").value.trim();
  const codes=[...document.querySelectorAll("#commercialDcoSelector input[type=checkbox]:checked")].map(el=>Number(el.value));
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
      dco_codes:codes
    });
    feedback.textContent="Comercial salvo com "+num(result?.dco_count||codes.length)+" DCO(s).";
    feedback.className="form-error form-success";
    $("commercialName").value="";
    $("commercialPhoto").value="";
    state.commercialPhotoData="";
    await loadCommercials();
    toast("Cadastro comercial atualizado.");
  }catch(e){
    feedback.textContent=e.message; feedback.className="form-error"; toast(e.message,true);
  }finally{
    btn.disabled=false; btn.textContent="Salvar comercial";
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
  $("pasteArea").addEventListener("input",updatePastePreview); $("confirmPaste").onclick=confirmPaste;
  $("finishChecklist").onclick=()=>{$("checklistModal").classList.add("hidden");showWorldModal()};
  $("logoutBtn").onclick=logout; $("adminStoreSelect").onchange=e=>changeAdminStore(e.target.value);
  $("refreshRegional").onclick=loadRegional;
  $("refreshCommercials").onclick=loadCommercials;
  $("commercialWorldFilter").onchange=renderCommercialDcos;
  $("selectAllCommercialDcos").onclick=()=>document.querySelectorAll("#commercialDcoSelector input[type=checkbox]").forEach(el=>el.checked=true);
  $("saveCommercialBtn").onclick=saveCommercial;
  $("commercialPhoto").onchange=e=>{
    const file=e.target.files?.[0];
    if(!file){state.commercialPhotoData="";return}
    if(file.size>600000){toast("Use uma foto de até 600 KB.",true);e.target.value="";return}
    const reader=new FileReader();
    reader.onload=()=>{state.commercialPhotoData=String(reader.result||"");toast("Foto pronta para salvar.")};
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
boot();
