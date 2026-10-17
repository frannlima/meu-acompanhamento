/* Meu Acompanhamento | ranking interativo e compartilhamento regional v32 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function sortables(){
 const targets=["homeGroupSharePanel","groupSharePanel","groupPanelModalContent","clarityGroupsTable"];
 for(const id of targets){
  const table=$(id)?.querySelector("table");
  const head=table?.tHead?.rows?.[0],body=table?.tBodies?.[0];
  if(!head||!body)continue;
  [...head.cells].forEach((th,i)=>{
   if(!i||th.dataset.maSortV32)return;
   th.dataset.maSortV32="1";th.classList.add("ma-sortable");th.tabIndex=0;th.setAttribute("role","button");
   th.setAttribute("aria-label","Ordenar "+th.textContent+" do maior ao menor ou vice-versa");
   const arrow=document.createElement("span");arrow.className="ma-sort-arrow";arrow.textContent=" ↕";th.appendChild(arrow);
   const sort=()=>{
    const dir=th.dataset.maDir==="desc"?"asc":"desc";th.dataset.maDir=dir;
    const totals=[...body.rows].filter(r=>r.classList.contains("group-total-row")||r.classList.contains("clarity-total"));
    const rows=[...body.rows].filter(r=>!totals.includes(r));
    const asNumber=row=>{
     const raw=(row.cells[i]?.textContent||"").trim();
     if(!raw||raw==="—")return null;
     const m=raw.match(/[-−+]?\s*[\d.,]+/);
     if(!m)return null;
     return Number(m[0].replace(/\s/g,"").replace("−","-").replace(/\./g,"").replace(",","."));
    };
    rows.sort((a,b)=>{
     const x=asNumber(a),y=asNumber(b);
     if(x==null||y==null)return x==null?(y==null?0:1):-1;
     return dir==="desc"?y-x:x-y;
    });
    rows.concat(totals).forEach((row,index)=>{
     body.appendChild(row);
     const badge=row.querySelector(".ma-rank-position");
     if(badge)badge.textContent=(index+1)+"º";
    });
    head.querySelectorAll(".ma-sort-arrow").forEach(s=>s.textContent=" ↕");
    arrow.textContent=dir==="desc"?" ▼":" ▲";
   };
   th.addEventListener("click",sort);
   th.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();sort();}});
  });
 }
}
const fecha=()=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza"}).format(new Date());
async function card(){
 const root=$("estoreOpsRegionalBody"),table=root?.querySelector("table");
 if(!table||!table.tHead||!table.tBodies[0]||!table.tBodies[0].rows.length)
   throw new Error("Abra Ver regional e aguarde a atualização das lojas para gerar a parcial.");
 const header=[...table.tHead.rows[0].cells].map(x=>x.textContent.trim());
 const rows=[...table.tBodies[0].rows].map(row=>[...row.cells].map(x=>x.textContent.trim()));
 const total=root.querySelector(".eo-region-kpis");
 const stats=total?[...total.querySelectorAll(".eo-stat")].map(x=>x.innerText):[];
 const width=2048,rowH=57,top=330,height=top+rows.length*rowH+190;
 const c=document.createElement("canvas");c.width=width;c.height=height;
 const g=c.getContext("2d");if(!g)throw new Error("Canvas não suportado.");
 const text=(s,x,y,font,color,align="left")=>{g.font=font;g.fillStyle=color;g.textAlign=align;g.fillText(String(s),x,y);};
 g.fillStyle="#173F35";g.fillRect(0,0,width,height);
 g.fillStyle="#DE7C00";g.fillRect(0,0,475,9);
 const logo=new Image();logo.src="./assets/riachuelo-logo.svg";
 try{await logo.decode();g.drawImage(logo,51,35,335,60);}catch(e){throw new Error("Logo oficial indisponível, tente novamente.");}
 text("Moda que inspira o Brasil",width-55,87,"700 26px Arial","#FFFFFF","right");
 text("eStore CE+PI • Parcial Regional",60,169,"900 53px Arial","#FFFFFF");
 text("Corte "+fecha()+" • Captação eStore ÷ venda real da filial para share",60,216,"600 25px Arial","#F5C879");
 text("Sem input = dado indisponível; não equivale automaticamente a venda zero.",60,255,"500 22px Arial","#F7F4ED");
 const cols=[0,1,2,3,4,5,6],pos=[70,188,450,735,1020,1260,1585];
 g.fillStyle="#E4ECE4";g.fillRect(37,282,width-74,61);
 cols.forEach((n,k)=>text(header[n],pos[k],321,"900 22px Arial","#173F35"));
 rows.forEach((r,i)=>{
  const yy=365+i*rowH;
  g.fillStyle=i%2?"#F9F7F0":"#FFFFFF";g.fillRect(37,yy-16,width-74,rowH);
  cols.forEach((n,k)=>{
   const val=r[n]||"—",max=k===5?20:23,display=val.length>max?val.slice(0,max-1)+"…":val;
   text(display,pos[k],yy+15,"650 22px Arial",k===3&&/^[−-]/.test(val)?"#AC3840":"#173F35");
  });
 });
 text("Consolidado regional · metas, captação, desvio, share real, pedidos e ticket médio por filial",58,height-81,"700 26px Arial","#FFFFFF");
 text("Riachuelo  •  Moda que inspira o Brasil",width-56,height-43,"600 22px Arial","#F5C879","right");
 return c;
}
async function shareRegional(){
 try{
  const picture=await card(),blob=await new Promise(resolve=>picture.toBlob(resolve,"image/png",1));
  if(!blob)throw new Error("Falha na conversão do card.");
  const file=new File([blob],"Parcial_Regional_eStore_CEPI_"+fecha().replace(/\//g,"-")+".png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:"Parcial Regional eStore CE+PI",text:"Consolidado eStore CE+PI • "+fecha()});return;}
   catch(e){if(e.name==="AbortError")return;}
  }
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),40000);
 }catch(e){if(typeof toast==="function")toast(e.message||String(e),true);else alert(e.message||String(e));}
}
function actions(){
 if(!state.logged)return;
 // O botão fixo da tela Início estava sem listener de compartilhamento.
 const shareHome=$("shareGroupPanelHome");
 if(shareHome&&!shareHome.dataset.maShareBound){
  shareHome.dataset.maShareBound="1";
  shareHome.addEventListener("click",()=>{
   const official=$("clarityShareDaily");
   if(official)official.click();
   else if(typeof toast==="function")toast("Aguarde o carregamento do card oficial.",true);
  });
 }
 const button=$("estoreOpsRegionalToggle"),pane=$("estoreOpsRegional");
 if(button&&!$("maRegionShare32")){
  const share=document.createElement("button");share.id="maRegionShare32";share.type="button";
  share.textContent="Compartilhar parcial CE+PI";share.className="ma-region-access";
  share.addEventListener("click",shareRegional);
  button.insertAdjacentElement("afterend",share);
 }
 if(pane&&!$("maRegionalShareInside32")){
  const share=document.createElement("button");share.id="maRegionalShareInside32";share.className="ma-region-access";share.type="button";
  share.textContent="Compartilhar card regional";share.addEventListener("click",shareRegional);
  pane.prepend(share);
 }
}
function enhance(){if(!state.logged)return;sortables();actions();}
document.addEventListener("ma:dashboard-ready",()=>setTimeout(enhance,80));
document.addEventListener("ma:estore-hourly-loaded",()=>setTimeout(enhance,120));
document.addEventListener("click",e=>{if(e.target.closest("[data-section]")||e.target.closest("#estoreOpsRegionalToggle"))setTimeout(enhance,80);});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{setTimeout(enhance,200)},{once:true});else enhance();
window.maOperationalShareV32={refresh:enhance,shareRegional};
})();