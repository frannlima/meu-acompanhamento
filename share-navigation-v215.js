/* V215 | Rodapé institucional de navegação para todos os compartilhamentos do Meu Acompanhamento. */
(function(){
 "use strict";
 const ROOT="https://frannlima.github.io/meu-acompanhamento/";
 const MAP={
  inicio:"Início → Resultado dos Grupos",
  radar:"Radar de Prioridades",
  cockpit:"Cockpit de Vendas",
  grupos:"Mundos e DCOs",
  comerciais:"Equipe / Comerciais",
  descontos:"Painel de Descontos",
  estore:"eStore",
  regional:"Consolidado Regional",
  admin:"Administração"
 };
 function locationFor(view){
   let section=view;
   if(!MAP[section])section="inicio";
   return {path:MAP[section],url:ROOT+"?section="+encodeURIComponent(section)};
 }
 function activeSection(){
   try{
     if(state?.section==="inicio"&&document.querySelector("#section-inicio.ma2-radar"))return "radar";
     return MAP[state?.section]?state.section:"inicio";
   }catch(_){return "inicio"}
 }
 function complete(text,view){
   const original=String(text||"").trimEnd();
   if(original.includes("frannlima.github.io/meu-acompanhamento/"))return original;
   const dest=locationFor(view||activeSection());
   return original+"\n\n📲 Acompanhe no Meu Acompanhamento\n📍 Menu → "+dest.path+"\n🔗 "+dest.url;
 }
 window.maShareTextWithLink=complete;
 if(typeof navigator.share==="function"&&!navigator.share.__maFooter215){
   const original=navigator.share;
   const enhanced=function(data){
     if(!data||typeof data!=="object")return original.call(navigator,data);
     const newPayload={...data,text:complete(data.text||data.title||"")};
     return original.call(navigator,newPayload);
   };
   enhanced.__maFooter215=true;
   try{navigator.share=enhanced}catch(_){}
 }
})();
