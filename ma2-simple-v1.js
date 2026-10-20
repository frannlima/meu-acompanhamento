/* Meu Acompanhamento 2.0 - experiência simples; KPI principal vem da venda pura Web. */
(function(){
"use strict";
const WORLD={feminino:["Feminino","#E03C31"],masculino:["Masculino","#2563EB"],infantil:["Infantil","#D69A00"],casa:["Casa","#25835b"],beleza_relogios:["Beleza","#E68699"]};
const EXCLUDED=new Set([320,530,531,532,552]);
let activeTab="hoje",lastIdentity="";
const money=v=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const percent=v=>Number.isFinite(v)?v.toLocaleString("pt-BR",{maximumFractionDigits:1,minimumFractionDigits:1})+"%":"—";
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const signed=v=>Number.isFinite(v)?(v>0?"+ ":"− ")+money(Math.abs(v)):"—";
const valid=v=>Number.isFinite(Number(v))?Number(v):0;
const isManager=()=>["supervisor","gerente","administrador"].includes(state.role);
const hasInput=()=>!!state.day?.has_input&&!!state.day?.captured_at;
const roleName=()=>({gerente:"Gerente",supervisor:"Supervisor",administrador:"Administrador",comercial:"Comercial",colaborador:"Colaborador"})[state.role]||"Colaborador";
const stamp=iso=>{try{return new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Fortaleza"})}catch{return "—"}};
const dayParts=iso=>{const p=new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/Fortaleza"}).formatToParts(new Date(iso||Date.now()));return {hour:Number(p.find(x=>x.type==="hour")?.value||0),minute:Number(p.find(x=>x.type==="minute")?.value||0)}};
function curve(){
 const rows=typeof window.getOperationalSalesCurve==="function"?window.getOperationalSalesCurve():[];
 const list=(Array.isArray(rows)?rows:[]).map(r=>({h:Number(r.h),w:Number(r.fin)})).filter(r=>Number.isFinite(r.h)&&Number.isFinite(r.w)&&r.w>=0);
 const total=list.reduce((n,r)=>n+r.w,0);
 if(total<=0)return null;
 return list.map(r=>({h:r.h,w:r.w/total}));
}
function fraction(rows,clock){
 if(!rows||!clock)return null;
 if(clock.hour>rows[rows.length-1].h)return 1;
 const p=rows.reduce((n,r)=>n+r.w*(clock.hour>r.h?1:clock.hour===r.h?Math.max(0,Math.min(1,clock.minute/60)):0),0);
 return Math.max(0,Math.min(1,p));
}
function outlook(){
 const d=state.day||{},target=valid(d.target_financial),sale=valid(d.sales_financial),has=hasInput();
 const rows=curve(),clock=has?dayParts(d.captured_at):null,share=has?fraction(rows,clock):null;
 const projection=has&&share!==null&&share>=.08&&target>0?sale/share:null;
 const attainment=has&&target>0?sale/target*100:null;
 const projected=projection!==null&&target>0?projection/target*100:null;
 const nextHour=clock&&rows?.find(r=>r.h>clock.hour)?.h;
 const nextFraction=nextHour!==undefined?fraction(rows,{hour:nextHour,minute:0}):1;
 const nextNeed=has&&rows&&target>0?Math.max(0,target*nextFraction-sale):null;
 return {target,sale,has,rows,clock,share,projection,attainment,projected,nextHour,nextNeed,
   expected:share!==null?target*share:null,
   projectedDeviation:projection!==null?projection-target:null};
}
function worlds(out){
 const all=new Map();
 for(const [code,[name,color]] of Object.entries(WORLD))all.set(code,{code,name,color,target:0,sale:0,aa:0,count:0,dcos:[]});
 const map=new Map();
 for(const r of Array.isArray(state.ggTargets)?state.ggTargets:[]){
  const id=Number(r.dco_code);if(id>0&&!EXCLUDED.has(id))map.set(id,{...r,sales_financial:0});
 }
 for(const r of Array.isArray(state.detail?.rows)?state.detail.rows:[]){
  const id=Number(r.dco_code);if(!id||EXCLUDED.has(id))continue;
  const prev=map.get(id)||{};
  map.set(id,{...prev,...r,target_financial:valid(prev.target_financial)>0?prev.target_financial:r.target_financial,sales_financial:r.sales_financial});
 }
 const classify=window.ggOfficialMapping?.worldOf;
 if(typeof classify!=="function")return [];
 for(const r of map.values()){
  const code=classify(r);
  const row=all.get(code);
  if(!row)continue;
  const target=valid(r.target_financial),sale=valid(r.sales_financial);
  row.target+=target;row.sale+=sale;row.aa+=valid(r.ly_financial);row.count++;
  row.dcos.push({id:Number(r.dco_code),target,sale,gap:out.share===null?null:sale-target*out.share});
 }
 return [...all.values()].filter(w=>w.target>0&&w.count>0).map(w=>({
  ...w,attainment:w.sale/w.target*100,expected:out.share!==null?w.target*out.share:null,
  gap:out.share!==null?w.sale-w.target*out.share:null,
  evolution:w.aa>0?(w.sale/w.aa-1)*100:null
 }));
}
function flashSnapshot(){
 try{return typeof window.getMA2FlashSnapshot==="function"?window.getMA2FlashSnapshot():null}catch{return null}
}
function kpi(label,value,secondary,klass=""){
 return '<div class="ma2-card '+klass+'"><span class="ma2-label">'+safe(label)+'</span><div class="ma2-value">'+safe(value)+'</div>'+(secondary?'<span class="ma2-hint">'+safe(secondary)+'</span>':"")+'</div>';
}
function lineChart(out){
 const rows=out.rows,history=Array.isArray(state.history)?state.history:[];
 if(!out.has||!rows||!history.length)return '<div class="ma2-hint">A curva aparecerá após os primeiros inputs de venda pura Web.</div>';
 const points=history.filter(p=>p?.captured_at&&Number.isFinite(Number(p.sales_financial)))
  .map(p=>({clock:dayParts(p.captured_at),sale:Number(p.sales_financial)}))
  .map(p=>({...p,x:fraction(rows,p.clock)})).filter(p=>p.x!==null).sort((a,b)=>a.x-b.x);
 points.push({x:out.share,sale:out.sale});
 const max=Math.max(out.target,out.sale,1)*1.1,x=s=>18+Math.min(1,Math.max(0,s))*630,y=v=>98-Math.min(1,Math.max(0,v/max))*81;
 const actual=points.map(p=>x(p.x).toFixed(1)+","+y(p.sale).toFixed(1)).join(" ");
 const planned=rows.map(r=>({x:fraction(rows,{hour:r.h+1,minute:0}),y:out.target*fraction(rows,{hour:r.h+1,minute:0})})).map(p=>x(p.x).toFixed(1)+","+y(p.y).toFixed(1)).join(" ");
 return '<svg class="ma2-curve" viewBox="0 0 665 110" preserveAspectRatio="none" role="img" aria-label="Curva da venda pura Web e meta acumulada por horário"><line x1="18" y1="98" x2="652" y2="98" stroke="#DEE8E0" stroke-width="1"/><polyline fill="none" stroke="#B9C7BE" stroke-width="2" stroke-dasharray="6 7" points="'+planned+'"/>'+(points.length>1?'<polyline fill="none" stroke="#18734F" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" points="'+actual+'"/>':'')+'</svg><div class="ma2-hint">— Venda pura Web &nbsp;&nbsp; ┄ Meta proporcional à curva histórica · Referência estimada</div>';
}
function navButton(label,action,active=false){
 return '<button type="button" class="ma2-tab" data-ma2="'+action+'" aria-selected="'+active+'">'+safe(label)+'</button>';
}
function navIcon(key){
 const icons={
  hoje:'<path d="m3 11 9-8 9 8v9h-6v-6H9v6H3z"/>',
  radar:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 19 5"/>',
  mundos:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="9" width="5" height="11" rx="1"/><rect x="17" y="6" width="4" height="14" rx="1"/>',
  equipe:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M16 6a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
  mais:'<circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>'
 };
 return '<svg class="ma2-navicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[key]||icons.mais)+'</svg>';
}
function ensureNavigation(){
 const dock=document.querySelector(".mobile-dock");
 if(dock){
  const role=isManager()?"manager":"staff";
  if(dock.dataset.ma2Role!==role){
   const links=isManager()?[["hoje","Hoje"],["radar","Radar"],["mundos","Mundos"],["equipe","Equipe"],["mais","Mais"]]:
                               [["hoje","Hoje"],["mundos","Meu mundo"],["mais","Mais"]];
   dock.innerHTML=links.map(([key,label])=>
    '<button type="button" class="dock-item ma2-dock-item" data-ma2="'+key+'" aria-label="'+label+'">'+navIcon(key)+'<span class="dock-label">'+label+'</span></button>').join("");
   dock.dataset.ma2Role=role;
  }
  const section=state.section;
  dock.querySelectorAll("[data-ma2]").forEach(b=>{
   const key=b.dataset.ma2;
   const active=section==="inicio"&&(key===activeTab)||
    section==="grupos"&&key==="mundos"||
    section==="comerciais"&&key==="equipe"||
    (section==="mais"||section==="admin"||section==="estore"||section==="descontos"||section==="flash-pilot"||section==="regional")&&key==="mais";
   b.classList.toggle("active",!!active);
   b.setAttribute("aria-current",active?"page":"false");
  });
 }
 const sidebar=document.getElementById("nav");
 if(sidebar){
  const main=sidebar.querySelector('[data-section="inicio"]');
  const oldLabel=main?.querySelector(".nav-label");if(oldLabel)oldLabel.textContent="Hoje";
  const commercialLabel=sidebar.querySelector('[data-section="comerciais"] .nav-label');if(commercialLabel)commercialLabel.textContent="Equipe comercial";
  let radar=sidebar.querySelector("#ma2SidebarRadar");
  if(isManager()&&!radar&&main){
   radar=document.createElement("button");
   radar.type="button";radar.id="ma2SidebarRadar";radar.className="nav-item ma2-sidebar-item";
   radar.dataset.ma2="radar";
   radar.innerHTML=navIcon("radar")+'<span class="nav-label">Radar de Prioridades</span>';
   main.insertAdjacentElement("afterend",radar);
  }
  if(radar){
   radar.hidden=!isManager();
   radar.classList.toggle("active",state.section==="inicio"&&activeTab==="radar");
  }
 }
}
function ensure(){
 const home=document.getElementById("section-inicio"),groups=document.getElementById("section-grupos");
 if(!home||!groups)return false;
 if(!document.getElementById("ma2Stage")){
  const stage=document.createElement("div");stage.id="ma2Stage";stage.setAttribute("aria-live","polite");
  home.prepend(stage);
 }
 if(!document.getElementById("ma2Worlds")){
  const panel=document.createElement("div");panel.id="ma2Worlds";
  groups.prepend(panel);
 }
 home.classList.toggle("ma2-radar",activeTab==="radar");groups.classList.add("ma2-worlds-active");
 return true;
}
function stageHeader(out){
 const now=hasInput()?stamp(state.day.captured_at):"Sem parcial";
 const options=Array.isArray(window.STORE_CODES)?window.STORE_CODES:["073","084","108","113","138","142","146","175","177","222","238","258","262","314","318","344","350","552"];
 const stores=state.role==="administrador"?
   '<div class="ma2-storepick"><label for="ma2Store">Filial em análise</label><select id="ma2Store" aria-label="Selecionar filial">'+
   options.map(s=>'<option value="'+s+'"'+(String(state.storeCode)===s?" selected":"")+'>Loja '+s+'</option>').join("")+'</select></div>':"";
 const name=safe(state.employeeName||"Equipe");
 return '<div class="ma2-hero"><div class="ma2-top"><span class="ma2-brand">RIACHUELO · MEU ACOMPANHAMENTO 2.0</span><span class="ma2-meta">🕒 '+now+'</span></div>'+
  '<h1>'+ (isManager()?'O resultado na palma da mão':'Meu mundo, meu resultado')+'</h1>'+
  '<p>Olá, '+name+' · '+roleName()+' · Loja '+safe(state.storeCode)+' · O simples é incrível.</p>'+stores+'</div>';
}
function today(out,items){
 if(!isManager()){
  const mine=items.find(w=>w.code===state.world),first=mine||items[0]||null;
  if(!first)return '<div class="ma2-card"><strong>Meu mundo</strong><p>Selecione seu mundo e aguarde as metas e o primeiro input.</p></div>';
  return '<div class="ma2-card"><div class="ma2-source">🎯 '+safe(first.name)+' <span class="ma2-pip">WEB · VENDA PURA</span></div>'+
   '<div class="ma2-grid" style="margin-top:12px">'+kpi("Venda do mundo",out.has?money(first.sale):"—")+
   kpi("Meta do mundo",money(first.target))+kpi("Atingimento",out.has?percent(first.attainment):"—")+
   kpi("Desvio até a curva",out.has&&first.gap!==null?signed(first.gap):"—")+'</div>'+
   '<div class="ma2-advice" style="margin-top:12px">Próximo passo: conferir primeiro os DCOs abaixo da curva e reforçar atendimento e reposição com a liderança.</div></div>'+
   '<div class="ma2-actions"><button class="ma2-btn primary" data-ma2="mundos">Ver meus DCOs →</button></div>';
 }
 const flash=flashSnapshot(),age=flash?Math.max(0,Math.round((Date.now()-Date.parse(flash.captured_at))/60000)):null;
 const flashInfo=flash?("Coletado às "+stamp(flash.captured_at)+(age>15?" · Atenção: coleta desatualizada":" · "+flash.coupons+" cupons · cupom médio "+(flash.coupons?money(flash.total/flash.coupons):"—"))):"Aguardando coleta Flash da loja.";
 const projectionText=out.projected!==null?percent(out.projected):"—";
 return '<div class="ma2-grid">'+
  '<div class="ma2-card"><div class="ma2-source">◎ Venda pura <span class="ma2-pip">WEB</span></div><strong class="ma2-number">'+(out.has?money(out.sale):"—")+'</strong><div class="ma2-hint">Base principal do acompanhamento e dos mundos</div></div>'+
  '<div class="ma2-card"><div class="ma2-source">▣ Venda operacional <span class="ma2-pip flash">FLASH</span></div><strong class="ma2-number">'+(flash?money(flash.total):"—")+'</strong><div class="ma2-hint">'+safe(flashInfo)+'</div></div></div>'+
  '<div class="ma2-four">'+
   kpi("Atingimento atual",out.attainment!==null?percent(out.attainment):"—","Venda pura Web ÷ meta")+
   kpi("Previsão fechamento",out.projection!==null?money(out.projection):"—","Estimativa pela curva Web")+
   kpi("% ating. projetado",projectionText,"Tendência estimada","ma2-proj")+
   kpi("Desvio projetado",out.projectedDeviation!==null?signed(out.projectedDeviation):"—","Previsão − meta",out.projectedDeviation!==null&&out.projectedDeviation<0?"ma2-danger":"")+
  '</div><div class="ma2-card"><div class="ma2-sectiontitle"><strong>Evolução da venda pura</strong><span>WEB · '+(out.has?"Até "+stamp(state.day.captured_at):"Aguardando atualização")+'</span></div>'+
   '<div class="ma2-progress"><i style="width:'+Math.max(0,Math.min(100,out.attainment||0))+'%"></i></div>'+lineChart(out)+'</div>'+
  '<div class="ma2-actions"><button class="ma2-btn primary" data-ma2="paste">↻ Atualizar parcial</button>'+
   '<button class="ma2-btn" data-ma2="radar">Ver Radar de Prioridades →</button></div>';
}
function priorityCard(w,i,out){
 const badge=w.gap!==null&&w.gap>=0?"No ritmo":"Atenção";
 const adv=w.gap!==null&&w.gap>=0?
  "Sustentar o atendimento e acompanhar o próximo input.":
  "Conferir abastecimento, cobertura de equipe e ações comerciais; reavaliar na próxima parcial.";
 return '<button class="ma2-priority" type="button" data-ma2-world="'+w.code+'"><div class="ma2-priorityhead"><span><span class="ma2-rank">'+(i+1)+'</span> <strong>'+safe(w.name)+'</strong></span><span class="ma2-status">'+badge+'</span></div>'+
  '<div class="ma2-minirow"><div><span>% atingimento</span><b>'+percent(w.attainment)+'</b></div>'+
  '<div><span>Desvio vs curva</span><b class="'+(w.gap<0?"ma2-danger":"")+'">'+(w.gap===null?"—":signed(w.gap))+'</b></div>'+
  '<div><span>Projeção do mundo</span><b>'+(w.target>0&&out.share>=.08?percent(w.sale/out.share/w.target*100):"—")+'</b></div></div>'+
  '<div class="ma2-advice">↗ '+adv+'</div></button>';
}
function radar(out,items){
 if(!isManager())return '<div class="ma2-card"><strong>Foco do meu mundo</strong><p>Prioridades operacionais são direcionadas pela liderança. Você acompanha o seu mundo no menu Mundos.</p></div>';
 const ordered=out.has&&out.share!==null?items.filter(w=>w.gap!==null).sort((a,b)=>a.gap-b.gap):[];
 const active=ordered.filter(w=>w.gap<0).slice(0,3),shown=active.length?active:ordered.slice(0,3);
 return '<div class="ma2-banner"><div><strong>🎯 Atingimento projetado da loja</strong><div class="ma2-hint">Venda pura Web · estimativa pela curva atual</div></div><div class="ma2-value">'+(out.projected!==null?percent(out.projected):"—")+'</div></div>'+
 '<div class="ma2-sectiontitle"><strong>Onde precisamos agir agora?</strong><span>3 maiores desvios vs curva</span></div>'+
 (shown.length?'<div class="ma2-priorities">'+shown.map((w,i)=>priorityCard(w,i,out)).join("")+'</div>':
  '<div class="ma2-card">Aguardando parcial e metas dos mundos para determinar as prioridades com segurança.</div>')+
 '<div class="ma2-card" style="margin-top:12px;background:#F0F7F2"><div class="ma2-sectiontitle"><strong>⚡ Desafio da próxima hora</strong><span>'+(out.nextHour!==undefined?out.nextHour+"h":"Próxima parcial")+'</span></div>'+
 '<div class="ma2-value">'+(out.nextNeed!==null?money(out.nextNeed):"—")+'</div>'+
 '<p class="ma2-hint">Venda pura adicional necessária para acompanhar a meta proporcional à curva no próximo horário. Não é promessa de resultado.</p></div>'+
 '<div class="ma2-actions"><button class="ma2-btn primary" data-ma2="mundos">Analisar mundos e DCOs →</button></div>';
}
function renderWorlds(out,items){
 const el=document.getElementById("ma2Worlds");if(!el)return;
 const visible=isManager()?items:items.filter(w=>w.code===state.world);
 el.innerHTML='<div class="ma2-sectiontitle"><strong>'+ (isManager()?"Mundos e DCOs":"Meu mundo")+'</strong><span>Venda pura Web · metas por DCO</span></div>'+
 (visible.length?'<div class="ma2-worldlist">'+visible.sort((a,b)=>a.attainment-b.attainment).map(w=>
  '<button class="ma2-worlditem" data-ma2-world="'+w.code+'"><div class="ma2-sectiontitle"><span class="ma2-name">'+safe(w.name)+'</span><strong>'+percent(w.attainment)+' →</strong></div>'+
  '<div class="ma2-progress"><i style="width:'+Math.max(0,Math.min(100,w.attainment))+'%;background:'+w.color+'"></i></div>'+
  '<div class="ma2-worldcols"><div><span>Venda Web</span><b>'+(out.has?money(w.sale):"—")+'</b></div>'+
   '<div><span>Meta</span><b>'+money(w.target)+'</b></div>'+
   '<div><span>Desvio vs curva</span><b>'+(out.has&&w.gap!==null?signed(w.gap):"—")+'</b></div>'+
   '<div><span>Evol. vs A.A.</span><b>'+(out.has&&w.evolution!==null?percent(w.evolution):"—")+'</b></div></div></button>').join("")+'</div>':
  '<div class="ma2-card">Metas e DCOs ainda não disponíveis para este mundo.</div>')+
 '<div class="ma2-actions"><button type="button" class="ma2-btn" data-ma2="advanced-worlds">'+
 (document.getElementById("section-grupos")?.classList.contains("ma2-expanded")?"Ocultar detalhes dos DCOs":"Ver análise detalhada por DCO →")+'</button></div>';
}
function ensureHomePlacement(){
 const home=document.getElementById("section-inicio"),stage=document.getElementById("ma2Stage");
 if(!home||!stage)return;
 home.classList.toggle("ma2-radar",activeTab==="radar");
 if(activeTab==="radar"){
  if(stage.parentElement!==home||stage!==home.firstElementChild)home.prepend(stage);
  return;
 }
 // A Home original, incluindo o carrossel institucional e os painéis, permanece visível.
 const clarity=document.getElementById("clarityHome");
 const summary=clarity?.querySelector(".clarity-summary");
 if(summary){
  if(summary.nextElementSibling!==stage)summary.insertAdjacentElement("afterend",stage);
 }else{
  const head=home.querySelector(":scope > .section-head");
  if(head&&head.nextElementSibling!==stage)head.insertAdjacentElement("afterend",stage);
 }
 const official=home.querySelector(".home-group-panel");
 const chart=clarity?.querySelector(".clarity-curve");
 if(official&&chart&&chart.nextElementSibling!==official)chart.insertAdjacentElement("afterend",official);
 if(official&&!official.dataset.ma2ActionsReady){
  const actions=official.querySelector(".group-panel-app-head");
  if(actions){
   const tools=document.createElement("div");tools.className="ma2-group-tools";
   const preview=document.createElement("button");preview.type="button";preview.className="btn secondary";
   preview.textContent="Visualizar card";
   preview.addEventListener("click",()=>{
    if(typeof window.openGroupPanel==="function")window.openGroupPanel();
    else{window.renderGroupSharePanel?.();document.getElementById("groupPanelModal")?.classList.remove("hidden");}
   });
   const download=document.createElement("button");download.type="button";download.className="btn secondary";
   download.textContent="Baixar imagem";
   download.addEventListener("click",()=>window.maDownloadGroupCard?.());
   const share=official.querySelector("#shareGroupPanelHome");
   if(share)share.textContent="Compartilhar card";
   tools.append(preview,download);
   actions.appendChild(tools);
   official.dataset.ma2ActionsReady="1";
  }
 }
}
function homeQuick(out){
 const forecast=out.projected!==null?percent(out.projected):"—";
 const amount=out.projectedDeviation===null?"Aguardando a primeira parcial":("Desvio projetado "+signed(out.projectedDeviation));
 return '<div class="ma2-quick" role="group" aria-label="Projeção resumida da venda pura Web">'+
  '<div class="ma2-quick-text"><span class="ma2-quick-icon" aria-hidden="true">◎</span><div><span class="ma2-hint">Atingimento projetado · venda pura Web</span>'+
  '<strong>'+forecast+'</strong><small>'+safe(amount)+' · Curva estimada</small></div></div>'+
  '<button class="ma2-btn primary" type="button" data-ma2="radar">Abrir Radar →</button></div>';
}
function render(){
 try{
  if(!state.logged||!ensure())return;
  const identity=state.matricula+":"+state.role+":"+state.storeCode;
  if(lastIdentity!==identity){activeTab="hoje";lastIdentity=identity;document.getElementById("section-inicio")?.classList.remove("ma2-expanded");document.getElementById("section-grupos")?.classList.remove("ma2-expanded")}
  ensureNavigation();
  const out=outlook(),items=worlds(out);
  const tabs='<div class="ma2-tabs" role="tablist" aria-label="Acompanhamento">'+navButton("Hoje","hoje",activeTab==="hoje")+
   (isManager()?navButton("Radar","radar",activeTab==="radar"):"")+
   navButton("Mundos","mundos")+ (isManager()?navButton("Equipe","equipe"):"")+
   navButton("Mais","mais")+'</div>';
  ensureHomePlacement();
  document.getElementById("ma2Stage").innerHTML=activeTab==="radar"
    ?stageHeader(out)+tabs+'<section role="tabpanel">'+radar(out,items)+'</section>'+
     '<div class="ma2-actions"><button type="button" class="ma2-btn" data-ma2="hoje">← Voltar aos painéis da Home</button></div>'+
     '<div class="ma2-foot">Radar baseado na venda pura Web e nas metas cadastradas por mundo.</div>'
    :homeQuick(out);
  renderWorlds(out,items);
 }catch(error){console.error("Interface Meu Acompanhamento 2.0:",error);
  document.getElementById("section-inicio")?.classList.remove("ma2-active");document.getElementById("section-grupos")?.classList.remove("ma2-worlds-active");}
}
document.addEventListener("click",ev=>{
 const btn=ev.target.closest("[data-ma2],[data-ma2-world]");if(!btn||!state.logged)return;
 const world=btn.dataset.ma2World;
 if(world&&WORLD[world]){
  state.world=world;
  if(typeof window.renderGroups==="function")window.renderGroups();
  document.getElementById("section-grupos")?.classList.add("ma2-expanded");
  render();
  window.setSection?.("grupos");return;
 }
 const action=btn.dataset.ma2;
 if(action==="paste"){window.showPaste?.();return}
 if(action==="hoje"||action==="radar"){activeTab=action;window.setSection?.("inicio");render();return}
 if(action==="mundos"){window.setSection?.("grupos");render();return}
 if(action==="equipe"){if(isManager()){window.setSection?.("comerciais");render()}return}
 if(action==="mais"){window.setSection?.("mais");render();return}
 if(action==="advanced-home"){document.getElementById("section-inicio")?.classList.toggle("ma2-expanded");render();return}
 if(action==="advanced-worlds"){document.getElementById("section-grupos")?.classList.toggle("ma2-expanded");render()}
});
document.addEventListener("change",ev=>{if(ev.target?.id==="ma2Store"&&state.role==="administrador")window.changeAdminStore?.(ev.target.value)});
// A seleção de mundo e a navegação legada também precisam redesenhar a nova experiência.
if(typeof window.setSection==="function"){
 const originalSetSection=window.setSection;
 window.setSection=function(){
  const res=originalSetSection.apply(this,arguments);
  if(state.logged)queueMicrotask(render);
  return res;
 };
}
if(typeof window.chooseWorld==="function"){
 const originalChooseWorld=window.chooseWorld;
 window.chooseWorld=function(){
  const res=originalChooseWorld.apply(this,arguments);
  if(state.logged)queueMicrotask(render);
  return res;
 };
}
document.addEventListener("ma:dashboard-ready",render);
document.addEventListener("ma:world-selected",render);
document.addEventListener("ma:section-change",render);
document.addEventListener("ma:flash-update",render);
document.addEventListener("ma:flash-clear",render);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
window.renderMA2=render;
})();
