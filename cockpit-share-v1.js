/* Cockpit | card compartilhável compacto e resumo textual consistente. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const GREEN="#173F35", SAGE="#466964", ORANGE="#DE7C00",
    BG="#F5F7F3", MUTED="#64766D", RED="#C4333E", GOOD="#15794E",
    WHITE="#FFFFFF", LINE="#DFE7DF";
  let busy=false;
  const brl=(value)=>Number(value).toLocaleString("pt-BR",{
    style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2
  });
  const percentage=(value,dec=1)=>Number.isFinite(value)
    ?value.toLocaleString("pt-BR",{minimumFractionDigits:dec,maximumFractionDigits:dec})+"%":"—";
  const signed=(value)=>value==null?"—":(value<0?"− ":"+ ")+brl(Math.abs(value));
  const signedPercent=(value)=>value==null?"—":(value>0?"+ ":"")+percentage(value);
  function inform(message,error=false){
    if(typeof toast==="function")toast(message,error);
    else console[error?"warn":"info"](message);
  }
  function shareState(){
    const api=window.maCockpit;
    const data=api?.getShareData?.();
    const summary=api?.getShareText?.();
    if(!data||!summary)throw new Error("Abra o Cockpit para gerar o card atualizado.");
    return {data,summary};
  }
  function type(ctx,text,x,y,size=28,color=GREEN,weight=700,maxWidth=900,align="left"){
    ctx.save();
    ctx.fillStyle=color;
    ctx.textAlign=align;
    ctx.textBaseline="alphabetic";
    ctx.font=weight+" "+size+"px Larsseit, Arial, sans-serif";
    ctx.fillText(String(text??"—"),x,y,maxWidth);
    ctx.restore();
  }
  function rounded(ctx,x,y,w,h,r,fill,stroke=null){
    const radius=Math.min(r,w/2,h/2);
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,y,w,h,radius);
    else{
      ctx.moveTo(x+radius,y);
      ctx.arcTo(x+w,y,x+w,y+h,radius);
      ctx.arcTo(x+w,y+h,x,y+h,radius);
      ctx.arcTo(x,y+h,x,y,radius);
      ctx.closePath();
    }
    ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function cell(ctx,x,y,label,value,{fill=WHITE,tone=GREEN,note="",big=false}={}){
    const width=472,height=big?155:120;
    rounded(ctx,x,y,width,height,19,fill,LINE);
    type(ctx,label.toUpperCase(),x+23,y+39,21,MUTED,750,424);
    type(ctx,value,x+23,y+(big?101:84),big?38:31,tone,850,426);
    if(note)type(ctx,note,x+23,y+height-17,16,MUTED,600,420);
  }
  function logo(){
    return new Promise(resolve=>{
      const img=new Image();
      const timer=setTimeout(()=>resolve(null),2200);
      img.onload=()=>{clearTimeout(timer);resolve(img);};
      img.onerror=()=>{clearTimeout(timer);resolve(null);};
      img.src="./assets/ria-signature-horizontal.svg";
    });
  }
  async function buildCard(data){
    // Resumo executivo em uma arte própria; sem reproduzir a tela extensa do aplicativo.
    const canvas=document.createElement("canvas");
    canvas.width=1080;canvas.height=1080;
    const c=canvas.getContext("2d",{alpha:false});
    if(!c)throw new Error("Este dispositivo não permite gerar imagem PNG.");
    c.fillStyle=BG;c.fillRect(0,0,1080,1080);
    c.fillStyle=GREEN;c.fillRect(0,0,1080,204);
    rounded(c,48,27,245,57,12,"#F6F3EC");
    const officialLogo=await logo();
    if(officialLogo){
      const w=226,h=Math.min(50,226*officialLogo.naturalHeight/officialLogo.naturalWidth);
      c.drawImage(officialLogo,57,55-h/2,w,h);
    }else{
      type(c,"RIA",65,67,40,GREEN,900,210);
    }
    type(c,"MODA QUE INSPIRA O BRASIL",1033,64,18,"#D9E8DD",750,660,"right");
    type(c,"COCKPIT DE VENDAS",48,137,41,WHITE,900,976);
    type(c,"LOJA "+data.store+"  •  "+data.date,48,178,24,"#E3EEE5",750,570);
    const current=data.has?"PARCIAL "+data.status:"SEM PARCIAL";
    rounded(c,752,151,280,37,15,data.has?"#DDF4E6":"#E9E9DF");
    type(c,current,892,177,17,data.has?GREEN:SAGE,850,250,"center");

    // Resumo visual com tamanho fixo e legível mesmo quando ainda não há vendas.
    cell(c,48,228,"Meta do dia",data.meta>0?brl(data.meta):"—",{fill:"#FFF7EB",tone:GREEN,big:true});
    cell(c,560,228,"Venda real",data.has?brl(data.sale):"—",{fill:"#EDF7F0",tone:GOOD,big:true});
    cell(c,48,403,"Atingimento",percentage(data.attainment),{fill:WHITE});
    cell(c,560,403,"Evolução vs A.A.",signedPercent(data.evolution),{
      tone:data.evolution==null?GREEN:data.evolution<0?RED:GOOD
    });
    cell(c,48,539,"Projeção",data.projection==null?"—":brl(data.projection),{
      fill:WHITE
    });
    cell(c,560,539,"Desvio da meta",signed(data.dev),{
      tone:data.dev==null?GREEN:data.dev<0?RED:GOOD
    });
    cell(c,48,675,"Ritmo vs hora anterior",signedPercent(data.growth),{
      tone:data.growth==null?GREEN:data.growth<0?RED:GOOD
    });
    cell(c,560,675,"Share eStore",percentage(data.share,2),{
      fill:"#EEF7FC",tone:GOOD
    });
    cell(c,48,811,"eStore CE+PI",data.estore==null?"—":brl(data.estore),{
      fill:"#EEF7FC",tone:GREEN,
      note:data.orders==null?"Sem parcial eStore":data.orders+" pedidos"
    });
    cell(c,560,811,"Destaque",data.best?.name||"—",{
      fill:"#ECF7EF",tone:GREEN,
      note:data.best?percentage(data.best.attainment)+" da meta":"Aguardando resultado"
    });

    c.fillStyle=GREEN;c.fillRect(0,960,1080,120);
    type(c,"MEU ACOMPANHAMENTO",48,1011,25,WHITE,800,600);
    type(c,"Resultado da loja • "+data.date,48,1047,18,"#DDEAE0",500,670);
    type(c,"Moda que inspira o Brasil",1033,1040,19,"#DDEAE0",750,380,"right");
    return canvas;
  }
  function png(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(
      blob=>blob?resolve(blob):reject(new Error("Falha ao criar a imagem do card.")),
      "image/png",1));
  }
  function save(blob,filename){
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  async function copySummary(summary){
    if(!navigator.clipboard?.writeText)return false;
    try{await navigator.clipboard.writeText(summary);return true;}
    catch(error){console.warn("Resumo não pôde ser copiado",error);return false;}
  }
  async function action(mode){
    if(busy)return;
    const button=$(mode==="share"?"cockpitShareCard":"cockpitDownloadCard");
    const previous=button?.textContent;
    busy=true;
    if(button){button.disabled=true;button.textContent="Preparando card…";}
    try{
      const {data,summary}=shareState();
      const image=await png(await buildCard(data));
      const filename="Cockpit_Loja_"+data.store+"_"+new Date().toLocaleDateString(
        "en-CA",{timeZone:"America/Fortaleza"})+".png";
      if(mode==="download"){
        save(image,filename);
        inform("Card resumido do Cockpit salvo.");
        return;
      }
      const file=new File([image],filename,{type:"image/png"});
      // WhatsApp e alguns alvos podem tratar mídia e legenda de maneiras distintas.
      // Entregar os dois campos juntos quando o compartilhamento nativo permitir.
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        try{
          await navigator.share({title:"Cockpit de Vendas • Loja "+data.store,
            text:summary,files:[file]});
          return;
        }catch(error){
          if(error?.name==="AbortError")return;
          console.warn("Falha no compartilhamento com arquivo",error);
        }
      }
      save(image,filename);
      const copied=await copySummary(summary);
      inform(copied?"Card baixado e resumo copiado para o WhatsApp.":
        "Card baixado. Use Enviar resumo para compartilhar o texto.",!copied);
    }catch(error){
      if(error?.name!=="AbortError")inform(error.message||"Falha ao preparar o card.",true);
    }finally{
      busy=false;
      if(button){button.disabled=false;button.textContent=previous;}
    }
  }
  function init(){
    $("cockpitShareCard")?.addEventListener("click",()=>void action("share"));
    $("cockpitDownloadCard")?.addEventListener("click",()=>void action("download"));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  window.maCockpitShareCard={buildCard};
})();