/* Dados Flash são referências operacionais, nunca venda contábil reconciliada. */
(function(root){
  'use strict';
  const stores=['073','084','108','113','138','142','146','175','177','222','238','258','262','314','318','344','350','552'];
  function numberBR(value){
    const s=String(value??'').trim().replace(/\u00a0/g,'').replace(/^R\$\s*/, '');
    if(!/^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$/.test(s))throw Error('Valor numérico indisponível ou inválido: '+s);
    const n=Number(s.replace(/\./g,'').replace(',','.'));if(!Number.isFinite(n))throw Error('Número inválido');return n;
  }
  function validate(p){
    if(p?.version!==1||p.kind!=='flash-stores'||p.source!=='flash.riachuelo.com.br')throw Error('Origem ou formato inválido');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.business_date)||!Number.isFinite(Date.parse(p.collected_at)))throw Error('Data inválida');
    if(!Array.isArray(p.rows)||!p.rows.length||p.rows.length>stores.length)throw Error('Nenhuma loja regional válida');
    const seen=new Set();
    const rows=p.rows.map(r=>{
      if(!stores.includes(r.store)||seen.has(r.store))throw Error('Loja excluída ou duplicada');seen.add(r.store);
      for(const k of ['total','omni','target','coupons'])if(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)throw Error('Indicador inválido');
      if(r.omni>r.total||!Number.isInteger(r.coupons))throw Error('Canais ou cupons inconsistentes');
      const sourceTime=r.source_time==null||String(r.source_time).trim()===''||String(r.source_time).trim()==='-'?null:String(r.source_time).trim();
      if(sourceTime!==null&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(sourceTime))throw Error('Horário inválido na loja '+r.store+': '+String(sourceTime).slice(0,30));
      return {store:r.store,total:r.total,omni:r.omni,target:r.target,coupons:r.coupons,source_time:sourceTime,physical_reference:r.total-r.omni};
    });
    return {version:1,kind:p.kind,source:p.source,business_date:p.business_date,collected_at:p.collected_at,rows};
  }
  function share(captured,retail){return Number.isFinite(captured)&&captured>=0&&Number.isFinite(retail)&&retail>0?captured/retail*100:null;}
  const api={stores,numberBR,validate,share};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MAFlashCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
