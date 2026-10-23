/* Cockpit de Vendas | card horizontal 16:9 + resumo no compartilhamento nativo */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const GREEN="#173F35", DARK="#102D27", SAGE="#466964", ORANGE="#DE7C00";
  const BG="#F3F6F2", RED="#BC3846", GOOD="#147D52", WHITE="#FFFFFF", LINE="#DCE5DE", MUTED="#5D7066";
  let busy=false;
  const brl=v=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt=v=>v==null||!Number.isFinite(Number(v))?"—":brl(v);
  const percent=(v,d=1)=>v==null||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d})+"%";
  const signedMoney=v=>v==null?"—":(v<0?"− ":"+ ")+brl(Math.abs(v));
  const signedPct=v=>v==null?"—":(v>0?"+ ":"")+percent(v);
  function notice(message,failed=false){
    if(typeof toast==="function")toast(message,failed);
    else console[failed?"warn":"info"](message);
  }
  function state(){
    const api=window.maCockpit, data=api?.getShareData?.(), summary=api?.getShareText?.();
    if(!data||!summary)throw Error("Abra o Cockpit para compartilhar o resultado atualizado.");
    return {data,summary};
  }
  function box(ctx,x,y,w,h,r,fill,stroke=null){
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
    else{
      ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.arcTo(x,y+h-r,x+r,y,r);ctx.closePath();
    }
    ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();}
  }
  function text(ctx,str,x,y,size,color=GREEN,weight=800,width=1400,align="left"){
    ctx.save();ctx.fillStyle=color;ctx.textBaseline="alphabetic";ctx.textAlign=align;
    ctx.font=weight+" "+size+"px Larsseit, Arial, sans-serif";
    ctx.fillText(String(str??"—"),x,y,width);ctx.restore();
  }
  function iconBag(ctx,x,y,size=74){
    ctx.save();ctx.lineWidth=5;ctx.strokeStyle="#F4C78F";ctx.lineJoin="round";ctx.lineCap="round";
    box(ctx,x,y+15,size,size+8,13,"rgba(255,255,255,.10)","#BFE3CC");
    ctx.beginPath();ctx.moveTo(x+size*.24,y+17);ctx.bezierCurveTo(x+size*.22,y-15,x+size*.78,y-15,x+size*.76,y+17);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+18,y+size*.64);ctx.lineTo(x+size*.44,y+size*.46);ctx.lineTo(x+size*.60,y+size*.57);ctx.lineTo(x+size*.81,y+size*.30);ctx.stroke();
    ctx.restore();
  }
  function logo(){
    return new Promise(resolve=>{
      const img=new Image();let done=false;
      const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v)};
      const timer=setTimeout(()=>finish(null),2200);
      img.onload=()=>finish(img);img.onerror=()=>finish(null);
      img.src="./assets/ria-signature-horizontal.svg";
    });
  }
  function mini(ctx,x,y,w,label,value,{tone=GREEN,note=""}={}){
    box(ctx,x,y,w,163,18,WHITE,LINE);
    text(ctx,label.toUpperCase(),x+24,y+39,20,MUTED,760,w-46);
    text(ctx,value,x+24,y+103,38,tone,900,w-47);
    if(note)text(ctx,note,x+24,y+140,17,MUTED,600,w-46);
  }
  async function buildCard(d){
    await document.fonts?.ready;
    const canvas=document.createElement("canvas");
    canvas.width=1600;canvas.height=900;
    const c=canvas.getContext("2d",{alpha:false});
    if(!c)throw Error("Não foi possível criar o card neste dispositivo.");
    c.fillStyle=BG;c.fillRect(0,0,1600,900);

    const header=c.createLinearGradient(0,0,1600,0);
    header.addColorStop(0,DARK);header.addColorStop(.65,GREEN);header.addColorStop(1,"#24614F");
    c.fillStyle=header;c.fillRect(0,0,1600,195);
    box(c,60,25,267,63,12,"#F5F7F2");
    const mark=await logo();
    if(mark&&mark.naturalWidth>0){
      const ww=239,hh=Math.min(48,ww*mark.naturalHeight/mark.naturalWidth);
      c.drawImage(mark,74,56-hh/2,ww,hh);
    }else text(c,"RIACHUELO",74,70,32,GREEN,850,239);
    text(c,"MODA QUE INSPIRA O BRASIL",1015,69,20,"#DAEAE1",730,520,"right");
    const chip=d.has?"PARCIAL "+d.status:"AGUARDANDO PARCIAL";
    box(c,1170,28,370,62,16,d.has?"#D5F3E3":"#E4E8E2");
    text(c,chip,1355,68,20,d.has?GREEN:MUTED,850,328,"center");
    text(c,"COCKPIT DE VENDAS",61,142,47,WHITE,900,1050);
    text(c,"LOJA "+d.store+"  •  "+d.date+"  •  "+(d.has?"ATÉ "+d.status:"SEM PARCIAL"),63,178,24,"#E2EDE5",720,1435);

    // Primeiro nível: entrega real e meta financeira da loja.
    box(c,60,216,940,217,21,GREEN);
    iconBag(c,93,277,76);
    text(c,"VENDA REAL • WEB",207,278,25,"#C3E1D0",760,670);
    text(c,d.has?fmt(d.sale):"—",205,361,69,WHITE,900,720);
    text(c,d.has?"CAPTAÇÃO ACUMULADA ATÉ A ÚLTIMA PARCIAL":"AGUARDANDO A PRIMEIRA VENDA INFORMADA",
      207,398,18,"#D5E6DA",650,728);
    box(c,1020,216,520,217,21,"#FFF6EA","#F1E2D1");
    text(c,"META FINANCEIRA DO DIA",1052,273,23,MUTED,800,450);
    text(c,d.meta>0?fmt(d.meta):"—",1052,337,47,GREEN,900,455);
    box(c,1052,360,456,48,13,"#F8E7CF");
    text(c,"ATINGIMENTO",1072,392,20,"#8A5209",790,204);
    text(c,percent(d.attainment),1484,394,30,"#A75C00",900,198,"right");

    // Segundo nível: sinais gerenciais da hora atual.
    mini(c,60,452,358,"PROJEÇÃO",fmt(d.projection),{note:"Projeção pela curva histórica"});
    mini(c,434,452,358,"DESVIO DA META",signedMoney(d.dev),{
      tone:d.dev==null?GREEN:d.dev<0?RED:GOOD,note:"Venda real vs meta do dia"
    });
    mini(c,808,452,358,"EVOLUÇÃO VS A.A.",signedPct(d.evolution),{
      tone:d.evolution==null?GREEN:d.evolution<0?RED:GOOD,note:"Comparativo financeiro"
    });
    mini(c,1182,452,358,"RITMO VS HORA ANT.",signedPct(d.growth),{
      tone:d.growth==null?GREEN:d.growth<0?RED:GOOD,
      note:d.delta==null?"Aguardando parciais comparáveis":"Δ "+signedMoney(d.delta)+" no intervalo"
    });

    // Terceiro nível: resultado eStore e principal destaque do dia.
    box(c,60,637,1480,154,20,"#EDF7F4","#D3E7DC");
    text(c,"RESULTADO eSTORE  •  PARCIAL DA LOJA",89,673,20,GREEN,830,905);
    const segments=[
      {x:89,w:360,label:"CAPTAÇÃO eSTORE",value:fmt(d.estore),tone:GREEN},
      {x:476,w:213,label:"PEDIDOS",value:d.orders==null?"—":String(d.orders),tone:GREEN},
      {x:732,w:245,label:"SHARE eSTORE",value:percent(d.share,2),tone:GOOD},
      {x:1041,w:443,label:"DESTAQUE DO DIA",value:d.best?.name||"—",tone:GREEN}
    ];
    segments.forEach((seg,i)=>{
      if(i){c.strokeStyle="#CFDED4";c.lineWidth=2;c.beginPath();c.moveTo(seg.x-19,695);c.lineTo(seg.x-19,768);c.stroke();}
      text(c,seg.label,seg.x,716,18,MUTED,760,seg.w);
      text(c,seg.value,seg.x,761,i===3?30:34,seg.tone,890,seg.w);
    });

    c.fillStyle=GREEN;c.fillRect(0,809,1600,91);
    text(c,"MEU ACOMPANHAMENTO  •  RESULTADO DA HORA",61,853,25,WHITE,820,920);
    text(c,"Web + eStore CE+PI • dados conforme últimas parciais",61,881,17,"#C9DDD1",600,1000);
    text(c,"Moda que inspira o Brasil",1538,870,21,"#D9E8DC",740,470,"right");
    return canvas;
  }
  function png(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(
      blob=>blob?resolve(blob):reject(Error("Não foi possível criar a imagem do resultado.")),"image/png"));
  }
  function save(blob,filename){
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),7000);
  }
  async function copy(summary){
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(summary);return true;}}
    catch(e){console.warn("[Cockpit] legenda não copiada",e)}
    return false;
  }
  async function shareResult(){
    if(busy)return;
    const button=$("cockpitShareResult"),old=button?.innerHTML;
    busy=true;if(button){button.disabled=true;button.textContent="Preparando resultado…";}
    try{
      const {data,summary:rawSummary}=state();
      const summary=typeof window.maShareTextWithLink==="function"
        ?window.maShareTextWithLink(rawSummary,"cockpit"):rawSummary;
      const blob=await png(await buildCard(data));
      const filename="Cockpit_Loja_"+data.store+"_"+new Date().toLocaleDateString("en-CA",{timeZone:"America/Fortaleza"})+".png";
      const file=new File([blob],filename,{type:"image/png"});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        try{
          await navigator.share({title:"Cockpit de Vendas • Loja "+data.store,text:summary,files:[file]});
          return;
        }catch(error){
          if(error?.name==="AbortError")return;
          console.warn("[Cockpit] compartilhamento de imagem indisponível",error);
        }
      }
      // Compatibilidade para navegadores que não compartilham arquivos nativamente.
      save(blob,filename);
      const copied=await copy(summary);
      notice(copied?"Card horizontal salvo e legenda copiada. Compartilhe no WhatsApp.":
        "Card horizontal salvo. O texto pode ser copiado do Cockpit.",!copied);
    }catch(error){
      if(error?.name!=="AbortError")notice(error.message||"Falha ao compartilhar o resultado.",true);
    }finally{
      busy=false;
      if(button){button.disabled=false;button.innerHTML=old;}
    }
  }
  function init(){
    $("cockpitShareResult")?.addEventListener("click",()=>void shareResult());
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  window.maCockpitShareCard={buildCard,share:shareResult};
})();