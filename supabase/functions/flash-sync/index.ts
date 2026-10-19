import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
const stores=['073','084','108','113','138','142','146','175','177','222','238','258','262','314','318','344','350','552'];
const headers={'Access-Control-Allow-Origin':'https://frannlima.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return response({error:'Método inválido'},405);
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return response({error:'Confirme seu e-mail para acessar as coletas compartilhadas.'},401);
 try{
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:auth,error:authError}=await sb.auth.getUser(token);
 if(authError||!auth.user?.email_confirmed_at||!auth.user.email)return response({error:'Sessão inválida ou expirada.'},401);
 const {data:binding,error:bindingError}=await sb.from('ria_authorized_emails').select('matricula,store_code').eq('email',auth.user.email.toLowerCase()).eq('active',true).maybeSingle();
 if(bindingError)throw bindingError;
 if(!binding)return response({error:'E-mail ainda não vinculado à matrícula pelo administrador.'},403);
 const {data:user,error:userError}=await sb.from('collaborator_directory').select('matricula,store_code,app_role').eq('matricula',binding.matricula).eq('active_for_access',true).maybeSingle();
 if(userError)throw userError;
 if(!user||String(user.store_code)!==String(binding.store_code)||!stores.includes(String(user.store_code)))return response({error:'Perfil sem acesso.'},403);
 const admin=user.app_role==='administrador';
 const text=await req.text();if(text.length>100000)return response({error:'Coleta muito grande.'},413);
 const body=JSON.parse(text);
 if(String(body.matricula)!==String(user.matricula))return response({error:'E-mail não corresponde ao usuário conectado no app.'},403);
 if(body.action==='save'){
 if(!admin)return response({error:'Somente administrador pode publicar a coleta regional.'},403);
 const p=body.packet;
 if(p?.version!==1||p.kind!=='flash-stores'||p.source!=='flash.riachuelo.com.br'||!/^\d{4}-\d{2}-\d{2}$/.test(p.business_date))return response({error:'Formato inválido.'},400);
 if(new Date(p.business_date+'T12:00:00Z').toISOString().slice(0,10)!==p.business_date)return response({error:'Data inválida.'},400);
 const age=Date.now()-Date.parse(p.collected_at);if(!Number.isFinite(age)||age< -60000||age>900000)return response({error:'Faça uma coleta recente.'},400);
 if(!Array.isArray(p.rows)||!p.rows.length||p.rows.length>18)return response({error:'Lojas inválidas.'},400);
 const seen=new Set();const rows=[];
 for(const r of p.rows){
 if(!stores.includes(r.store)||seen.has(r.store))return response({error:'Loja inválida ou duplicada.'},400);seen.add(r.store);
 if(['total','omni','target','coupons'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)||r.omni>r.total||!Number.isInteger(r.coupons))return response({error:'Indicadores inválidos.'},400);
 const source_time=r.source_time??null;if(source_time!==null&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(source_time))return response({error:'Horário inválido.'},400);
 rows.push({store:r.store,total:r.total,omni:r.omni,target:r.target,coupons:r.coupons,source_time});
 }
 rows.sort((a,b)=>a.store.localeCompare(b.store));
 const bytes=new TextEncoder().encode(JSON.stringify([p.business_date,rows]));const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 const {error}=await sb.from('flash_snapshots').upsert({business_date:p.business_date,collected_at:p.collected_at,rows,content_hash:hash,collected_by:user.matricula},{onConflict:'business_date,content_hash'});
 if(error)throw error;return response({data:{ok:true}});
 }
 if(body.action==='latest'||body.action==='history'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(body.business_date))return response({error:'Data inválida.'},400);
 const {data,error}=await sb.from('flash_snapshots').select('business_date,collected_at,rows').eq('business_date',body.business_date).order('collected_at',{ascending:false}).limit(body.action==='history'?96:1);
 if(error)throw error;
 const packets=(data||[]).map(p=>({version:1,kind:'flash-stores',source:'flash.riachuelo.com.br',...p,rows:admin?p.rows:p.rows.filter((r:any)=>r.store===String(user.store_code))}));
 return response({data:packets});
 }
 return response({error:'Ação inválida'},400);
 }catch{return response({error:'Não foi possível processar a coleta.'},500);}
});
