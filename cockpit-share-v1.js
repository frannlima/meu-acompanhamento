/* Cockpit: compartilhar a tela inteira como PNG, com fallback sem rede. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
let engine=null,busy=false;
function message(s,bad=false){if(typeof toast==="function")toast(s,bad);else console[bad?"warn":"log"](s);}
function text(root,selector){return root.querySelector(selector)?.textContent?.trim().replace(/\s+/g," ")||"—";}
function loadCapture(){
 if(typeof window.html2canvas==="function")return Promise.resolve(window.html2canvas);
 if(engine)return engine;
 engine=(async()=>{
   for(const url of [
     "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
     "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
   ]){
     try{
       await new Promise((ok,fail)=>{
         const tag=document.createElement("script");
         const timer=setTimeout(()=>{tag.remove();fail(new Error("timeout"));},5000);
         tag.async=true;tag.crossOrigin="anonymous";tag.src=url;
         tag.onload=()=>{clearTimeout(timer);ok();};
         tag.onerror=()=>{clearTimeout(timer);tag.remove();fail(new Error("unavailable"));};
         document.head.appendChild(tag);
       });
       if(typeof window.html2canvas==="function")return window.html2canvas;
     }catch(e){console.warn("Cockpit: biblioteca de captura indisponível",e);}
   }
   throw new Error("Motor de captura indisponível");
 })();
 return engine;
}
function backup(root){
 // Backup autônomo: imagem com os mesmos indicadores, mesmo offline.
 const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=1440;
 const c=canvas.getContext("2d");if(!c)throw new Error("Canvas indisponível");
 const green="#173F35",gray="#68766e";
 const rect=(x,y,w,h,bg="#fff")=>{c.fillStyle=bg;c.fillRect(x,y,w,h);};
 const write=(str,x,y,size=22,color=green,bold=false,width=1000)=>{
   c.fillStyle=color;c.font=(bold?"bold ":"normal ")+size+"px Arial";
   c.fillText(String(str).slice(0,100),x,y,width);
 };
 rect(0,0,1200,1440,"#f7faf7");rect(0,0,1200,178,green);
 write("COCKPIT DE VENDAS",45,63,37,"#fff",true);
 write(text(root,"#cockpitStore"),45,111,26,"#fff",true);
 write(text(root,"#cockpitTimestamp"),45,148,20,"#fff");
 [...root.querySelectorAll(".cp-main-tiles .cp-tile")].slice(0,3).forEach((el,i)=>{
   const x=36+i*382;rect(x,205,366,172);
   write(text(el,".cp-tile-label b"),x+14,242,18,gray,true,338);
   write(text(el,".cp-tile-value"),x+14,300,28,green,true,335);
   write(text(el,".cp-tile-sub"),x+14,344,16,gray,false,335);
 });
 [...root.querySelectorAll(".cp-signals .cp-signal")].slice(0,2).forEach((el,i)=>{
   const x=36+i*575,bad=el.classList.contains("cp-bad");
   rect(x,397,557,123,bad?"#ffe8e8":"#e5f6e9");
   write(text(el,"div"),x+16,432,20,green,true,515);
   write(text(el,"strong"),x+16,485,30,bad?"#c92c37":"#18764c",true,515);
 });
 write("HORÁRIOS DE PICO • CURVA HISTÓRICA",43,574,27,green,true);
 [...root.querySelectorAll(".cp-peaks .cp-peak")].slice(0,3).forEach((el,i)=>{
   const x=36+i*382,below=!!el.querySelector(".cp-peak-below"),above=!!el.querySelector(".cp-peak-above");
   rect(x,602,366,295,"#fff7ed");
   write(text(el,":scope > b"),x+14,638,25,green,true);
   write("Meta da faixa",x+14,676,17,gray);
   write(text(el,":scope > strong"),x+14,710,25,"#de7c00",true,330);
   write("Venda entre parciais",x+14,758,17,gray);
   write(text(el,".cp-peak-result > b"),x+14,799,24,below?"#c92c37":above?"#18764c":gray,true,337);
   write(text(el,".cp-peak-trend"),x+14,839,17,below?"#c92c37":above?"#18764c":gray,true,337);
   write(text(el,".cp-peak-gap"),x+14,866,13,gray,false,337);
   write(text(el,".cp-peak-window"),x+14,888,11,gray,false,337);
 });
 const estore=root.querySelector(".cp-estore");
 write("eSTORE CE+PI",43,954,27,green,true);rect(36,977,1128,188,"#eef8ff");
 if(estore){
   write("SHARE eSTORE: "+text(estore,".cp-estore-share b"),54,1017,22,"#18764c",true);
   [...estore.querySelectorAll(".cp-estore-metrics > div")].slice(0,3).forEach((el,i)=>{
     const x=54+i*374;
     write(text(el,"span"),x,1062,18,gray,true);
     write(text(el,"strong"),x,1111,25,green,true,345);
   });
   write(text(estore,".cp-estore-goal strong"),54,1150,16,gray,false,1000);
 }
 [...root.querySelectorAll(".cp-bottom-tile")].slice(0,2).forEach((el,i)=>{
   const x=36+i*575;rect(x,1200,557,145,i===0?"#e6f6eb":"#ffeeed");
   write(text(el,"h2"),x+14,1237,21,green,true,518);
   write(text(el,":scope > strong")!=="—"?text(el,":scope > strong"):text(el,"li"),x+14,1280,23,green,true,520);
   write(text(el,":scope > b"),x+14,1320,21,i===0?"#18764c":"#c92c37",true,520);
 });
 rect(0,1370,1200,70,green);
 write("MEU ACOMPANHAMENTO • Moda que inspira o Brasil",43,1412,20,"#fff",true);
 return canvas;
}
async function capture(){
 const root=document.querySelector("#section-cockpit .cp-frame");
 if(!root)throw new Error("Cockpit não encontrado");
 try{
   const html2canvas=await loadCapture();
   await Promise.race([document.fonts?.ready||Promise.resolve(),new Promise(ok=>setTimeout(ok,1500))]);
   const width=Math.max(1,root.scrollWidth),height=Math.max(1,root.scrollHeight);
   const scale=Math.max(.7,Math.min(2,1900/width,4800/height));
   return await html2canvas(root,{
     backgroundColor:"#fff",scale,useCORS:true,allowTaint:false,logging:false,
     scrollX:0,scrollY:-window.scrollY,
     onclone:d=>d.querySelectorAll("#cockpitRefresh,#cockpitShare,#cockpitShareCard,#cockpitDownloadCard").forEach(el=>el.style.display="none")
   });
 }catch(e){console.warn("Cockpit: usando imagem local sem CDN",e);return backup(root);}
}
function toBlob(canvas){
 return new Promise((ok,fail)=>canvas.toBlob(blob=>blob?ok(blob):fail(new Error("Falha na criação da imagem")),"image/png",1));
}
function save(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2500);
}
async function action(mode){
 if(busy)return;
 const btn=$(mode==="share"?"cockpitShareCard":"cockpitDownloadCard");
 const label=btn?.textContent;
 busy=true;if(btn){btn.disabled=true;btn.textContent="Gerando PNG…";}
 try{
   const blob=await toBlob(await capture());
   const store=String(text(document,"#cockpitStore")).replace(/\D/g,"").padStart(3,"0");
   const date=new Date().toLocaleDateString("en-CA",{timeZone:"America/Fortaleza"});
   const name="Cockpit_Loja_"+store+"_"+date+".png";
   const file=new File([blob],name,{type:"image/png"});
   if(mode==="share"&&navigator.share&&navigator.canShare?.({files:[file]})){
     await navigator.share({title:"Cockpit de Vendas • Loja "+store,files:[file]});
   }else{
     save(blob,name);
     message(mode==="share"?"Imagem gerada para enviar no WhatsApp.":"Imagem do Cockpit salva.");
   }
 }catch(e){if(e?.name!=="AbortError")message(e.message||"Não foi possível compartilhar o Cockpit.",true);}
 finally{busy=false;if(btn){btn.disabled=false;btn.textContent=label;}}
}
function init(){
 $("cockpitShareCard")?.addEventListener("click",()=>void action("share"));
 $("cockpitDownloadCard")?.addEventListener("click",()=>void action("download"));
 document.addEventListener("click",e=>{
   if(e.target.closest('[data-section="cockpit"]'))void loadCapture().catch(()=>{});
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();