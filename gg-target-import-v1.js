/* Importação separada: metas financeira e física por loja/data/DCO. */
(function(){
  "use strict";
  function norm(s){return String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
  function field(headers,alts){
    for(const a of alts){const k=headers.findIndex(h=>h===a);if(k>=0)return k;}
    for(const a of alts){const k=headers.findIndex(h=>h.includes(a));if(k>=0)return k;}
    return -1;
  }
  function parseNumber(v){
    if(v===null||v===undefined||v==="")return 0;
    if(typeof v==="number")return Number.isFinite(v)?v:0;
    let s=String(v).trim().replace(/\s/g,"");
    if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");
    else if(s.includes(","))s=s.replace(",",".");
    return Number(s.replace(/[^0-9.+-]/g,""))||0;
  }
  function parseDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);
    if(typeof v==="number"&&v>30000)return new Date(Date.UTC(1899,11,30)+Math.round(v*86400000)).toISOString().slice(0,10);
    const s=String(v??"").trim(),pt=s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(pt)return pt[3]+"-"+pt[2].padStart(2,"0")+"-"+pt[1].padStart(2,"0");
    return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):"";
  }
  function parseStore(v){
    const s=String(v??"").trim(),m=s.match(/^L?\s*(\d{3})\b/i);
    return m?m[1]:"";
  }
  function parseDco(v){
    const m=String(v??"").trim().match(/^(\d{3})\b/);
    return m?Number(m[1]):0;
  }
  const blockedDcos=new Set([148,530,531,532,552]);
  function parseWorkbook(file,source){
    const bytesPromise=file.arrayBuffer();
    return bytesPromise.then(data=>{
      const book=XLSX.read(data,{type:"array",cellDates:true});
      const sheet=book.Sheets[book.SheetNames[0]];
      const mat=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:null});
      const headers=(mat[0]||[]).map(norm);
      let date,store,dco,fin,lyfin,lyfis,fis;
      if(source==="financial"){
        store=field(headers,["loja"]);dco=field(headers,["dco"]);date=field(headers,["dia"]);
        fin=field(headers,["meta diaria"]);lyfin=field(headers,["vnd fin a a","vnd fin aa"]);
        lyfis=field(headers,["vnd fis a a","vnd fis aa"]);
        if([store,dco,date,fin,lyfin,lyfis].some(x=>x<0))throw new Error("Arquivo financeiro: cabeçalhos Loja, GG, DCO, Dia, Meta Diária, Vnd. Fin. A.A. e Vnd. Fis. A.A. são obrigatórios.");
      } else {
        store=field(headers,["loja"]);dco=field(headers,["cod dco","codigo dco"]);date=field(headers,["data"]);
        fis=field(headers,["meta fis"]);
        if([store,dco,date,fis].some(x=>x<0))throw new Error("Arquivo físico: cabeçalhos Data, Loja, Cód-DCO e Meta Fís. são obrigatórios.");
      }
      const records=new Map();let skipped=0;
      for(const row of mat.slice(1)){
        const business_date=parseDate(row[date]),store_code=parseStore(row[store]),dco_code=parseDco(row[dco]);
        if(!business_date||!store_code||!dco_code){skipped++;continue}
        if(["109","519"].includes(store_code)||blockedDcos.has(dco_code)){skipped++;continue}
        const item={business_date,store_code,dco_code};
        if(source==="financial"){
          item.target_financial=parseNumber(row[fin]);
          item.ly_financial=parseNumber(row[lyfin]);
          item.ly_physical=parseNumber(row[lyfis]);
        } else item.target_physical=parseNumber(row[fis]);
        records.set(business_date+"|"+store_code+"|"+dco_code,item);
      }
      const out=[...records.values()].sort((a,b)=>a.business_date.localeCompare(b.business_date)||a.store_code.localeCompare(b.store_code)||a.dco_code-b.dco_code);
      if(!out.length)throw new Error("Nenhuma linha diária válida encontrada no arquivo.");
      return {rows:out,skipped,sheet:book.SheetNames[0]};
    });
  }
  async function run(file,source){
    if(!file)return;
    const status=$("targetImportStatus");
    if(!status)return;
    const kind=source==="financial"?"financeira + A.A.":"física";
    if(!confirm("Atualizar a meta "+kind+" de "+file.name+"? As demais métricas serão preservadas."))return;
    const files=document.querySelectorAll("#financialTargetFile,#physicalTargetFile");
    files.forEach(el=>el.disabled=true);
    status.className="import-status loading";
    status.textContent="Validando arquivo de meta "+kind+"...";
    try{
      if(typeof XLSX==="undefined")throw new Error("Biblioteca Excel não carregou. Atualize com Ctrl+F5.");
      const {rows,skipped}=await parseWorkbook(file,source);
      const batchSize=350;
      let imported=0,ignored=0;
      for(let i=0;i<rows.length;i+=batchSize){
        const chunk=rows.slice(i,i+batchSize);
        status.textContent="Meta "+kind+": "+Math.min(i,rows.length).toLocaleString("pt-BR")+" / "+rows.length.toLocaleString("pt-BR")+" DCOs • lote "+(Math.floor(i/batchSize)+1)+" de "+Math.ceil(rows.length/batchSize)+". Não feche a tela.";
        let result=null;
        for(let attempt=1;attempt<=3;attempt++){
          try {
            result=await api("importGgTargetsBatch",{matricula:state.matricula,source,rows:chunk});
            break;
          }catch(e){
            if(attempt===3)throw new Error("Falha no lote "+(Math.floor(i/batchSize)+1)+": "+e.message+". Reimporte o arquivo para retomar (sem duplicações).");
            await new Promise(resolve=>setTimeout(resolve,800*attempt));
          }
        }
        imported+=Number(result?.rows_imported||0);
        ignored+=Number(result?.rows_ignored||0);
      }
      status.className="import-status success";
      status.textContent="Meta "+kind+" atualizada! "+imported.toLocaleString("pt-BR")+" DCOs gravados. "+(skipped+ignored).toLocaleString("pt-BR")+" linhas excluídas/inválidas. A outra fonte foi preservada.";
      await loadAll();
      toast("Meta "+kind+" atualizada com sucesso.");
    }catch(e){
      status.className="import-status error";
      status.textContent="Importação interrompida: "+String(e.message||e);
      toast("Erro ao atualizar meta.",true);
    }finally{
      files.forEach(el=>{el.disabled=false;el.value=""});
    }
  }
  function initialize(){
    const financial=$("financialTargetFile"),physical=$("physicalTargetFile");
    if(financial)financial.addEventListener("change",e=>run(e.target.files?.[0],"financial"));
    if(physical)physical.addEventListener("change",e=>run(e.target.files?.[0],"physical"));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);
  else initialize();
})();