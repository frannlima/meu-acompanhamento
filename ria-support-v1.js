(()=>{
'use strict';
const topics=[
['Conhecer os menus','menu'],
['Atualizar Hora a Hora','hora'],
['Importar metas do mês','meta'],
['Atualizar resultado D-1','d1'],
['Interpretar indicadores','indicadores'],
['Tratar desvios e FCA','fca'],
['Relatar erro no app','erro'],
['eStore e BOPIS','bopis']
];
const answers={
menu:'Que bom que você quer conhecer melhor a ferramenta! 💚\n\n• Início / Visão Geral: acompanhe meta, realizado, desvio e ritmo.\n• Mundos / DCOs: veja como cada grupo contribui para o resultado.\n• Comerciais: consulte o desempenho por responsável.\n• Hora a Hora: acompanhe a evolução dos inputs de venda.\n• eStore CE+PI: consulte indicadores do canal digital.\n• Administração: recursos de cadastro e importação disponíveis apenas aos perfis autorizados.\n\nQual desses menus gostaria de explorar comigo?',
hora:'Vamos fazer juntos! 💚\n\n1. Acesse Início e toque em “Colar venda da web”.\n2. Copie a tabela de vendas do sistema autorizado e cole no campo indicado.\n3. Confira a prévia: linhas reconhecidas, venda financeira e venda física.\n4. Se os números estiverem corretos, confirme a importação.\n5. Volte à Visão Geral e confirme a atualização da parcial.\n\nSe a prévia não reconhecer os valores, não confirme: me diga o que apareceu.',
meta:'Ótima iniciativa! 💚 O cadastro de metas depende do perfil de administração.\n\n1. Entre em Administração com um perfil autorizado.\n2. Localize a importação de metas mensais.\n3. Selecione o arquivo oficial correspondente ao período.\n4. Confira mês, filial, valores totais e distribuição antes de concluir.\n5. Confirme se a Visão Geral e os Mundos apresentam os valores esperados.\n\nSe não encontrar a opção, pode ser uma restrição do seu perfil. Não tente substituir metas sem validação.',
d1:'Vamos conferir essa atualização com cuidado! 💚\n\nSe você estiver trabalhando com o eStore, os dados do dia anterior (D-1) devem vir dos relatórios oficiais de colaboradores e de lojas, respeitando a origem de cada indicador.\n\nNo Meu Acompanhamento, o input de venda hora a hora é um fluxo diferente. Antes de orientar o envio do arquivo, me diga: você quer atualizar o resultado eStore D-1 ou a venda da loja?',
indicadores:'Adorei sua iniciativa de entender os números! 💚\n\n• Meta: objetivo planejado.\n• Realizado: venda registrada.\n• Atingimento: realizado ÷ meta × 100.\n• Desvio: realizado − meta.\n• Projeção: estimativa de fechamento a partir do ritmo disponível.\n\nUm desvio negativo mostra o valor que ainda falta frente à referência. Qual indicador está gerando dúvida?',
fca:'Vamos transformar a leitura do desvio em ação! 💚\n\nPara montar um FCA semanal:\n1. Fato: registre o indicador, período e tamanho do desvio.\n2. Causa: investigue as evidências, sem confundir hipótese com diagnóstico.\n3. Ação: defina o que fazer, quem será responsável, prazo e como medir.\n4. Acompanhamento: confira evolução e registre os resultados das tratativas.\n\nA loja foi priorizada por qual indicador? Posso ajudar a estruturar o FCA.',
erro:'Obrigado por sinalizar a dificuldade. 💚 Vamos investigar sem perder seu trabalho.\n\nMe diga: qual menu apresentou problema, o que você tentou fazer e qual foi o comportamento (erro na tela, travamento ou informação não atualizada)?\n\nNão compartilhe senha, tokens nem dados pessoais. Se necessário, registre uma captura de tela sem informações sensíveis e encaminhe pelo canal de suporte autorizado.',
bopis:'Claro, vamos entender! 💚 BOPIS é uma compra online com retirada na loja. No acompanhamento eStore, vendas classificadas como BOPIS não compõem a base comissionável dos colaboradores nem o pool de supervisores; podem aparecer no total comercial da filial conforme as regras do painel.\n\nOnde o valor aparece: Meu Resultado, Minha Filial ou Pool? Assim verificamos a leitura correta.'
};
function classify(t){const s=t.toLowerCase();if(/bopis|comiss|estore/.test(s))return 'bopis';if(/fca|tratativa|desvio|prioriz/.test(s))return 'fca';if(/hora|colar|parcial/.test(s))return 'hora';if(/meta|mensal/.test(s))return 'meta';if(/d-1|ontem|dia anterior/.test(s))return 'd1';if(/erro|trav|falha|problema|bug|tela/.test(s))return 'erro';if(/indicador|ating|proje|share/.test(s))return 'indicadores';if(/menu|aprender|utilizar|funcionalidade/.test(s))return 'menu';return null}
function init(){
const nav=document.querySelector('#nav');const main=document.querySelector('.main');if(!nav||!main)return;
if(!nav.querySelector('[data-section="ria-suporte"]')){const btn=document.createElement('button');btn.className='nav-item';btn.dataset.section='ria-suporte';btn.innerHTML='<span class="nav-icon" aria-hidden="true">✦</span><span class="nav-label">Suporte às Filiais • RIA</span>';nav.append(btn)}
if(!document.getElementById('section-ria-suporte')){
const sec=document.createElement('section');sec.id='section-ria-suporte';sec.className='section';sec.innerHTML='<div class="section-head"><div><span class="eyebrow">CENTRAL DE APOIO</span><h1>Suporte às Filiais</h1><p>Aprenda, tire dúvidas e encontre orientações com a RIA.</p></div></div><div class="ria-support"><div class="ria-hero"><div class="ria-avatar" aria-hidden="true">✦</div><div><h2>RIA · Sua parceira no dia a dia</h2><p>Estou aqui para acolher, orientar e ajudar você a encontrar uma solução. 💚</p></div></div><div id="riaWelcome" class="ria-welcome"><h3>Como posso ajudar você hoje?</h3><p>Escolha um assunto abaixo ou me conte com suas palavras. Estou aqui para ajudar no seu ritmo. 💚</p><div id="riaTopics" class="ria-chips"></div></div><div id="riaChat" class="ria-chat" role="log" aria-live="polite" aria-label="Conversa com a RIA" hidden></div><form id="riaForm" class="ria-form"><label for="riaInput" class="ria-input-label">Prefere explicar sua dúvida?</label><div class="ria-input-row"><textarea id="riaInput" maxlength="750" rows="2" aria-label="Sua dúvida" placeholder="Escreva aqui o que precisa. Pode explicar do seu jeito..." required></textarea><button type="submit">Enviar ➜</button></div></form><p class="ria-note">Assistente de orientação guiada. Nesta versão, respostas são baseadas em procedimentos predefinidos; a IA generativa e a análise de dados em tempo real ainda não estão ativas. Para erros sem solução, procure o suporte responsável. Não envie dados sensíveis.</p></div>';main.append(sec)
}
const chat=document.getElementById('riaChat'),form=document.getElementById('riaForm'),input=document.getElementById('riaInput'),chips=document.getElementById('riaTopics');
if(!chat.dataset.ready){chat.dataset.ready='1';let count=0;function add(role,message){chat.hidden=false;document.getElementById('riaWelcome')?.classList.add('ria-started');const d=document.createElement('div');d.className='ria-message '+role;d.textContent=message;chat.append(d);chat.scrollTop=chat.scrollHeight;}let context={topic:null,menu:null};function guided(q,key){
const v=q.trim().toLowerCase();const detected=key||classify(q);
const menu=/(meu resultado|minha filial|pool|visão geral|visao geral|administra|mundo|comerciais)/i.exec(q);
if(menu)context.menu=menu[0];
if(detected)context.topic=detected;
if(context.topic==='bopis'){
if(/meu resultado/i.test(v))return 'Entendi! 💚 Você está consultando o menu Meu Resultado. Ali, o valor identificado como BOPIS deve ficar separado da base comissionável. A venda BOPIS não entra no cálculo da comissão individual.\n\nVamos conferir juntos: esse valor está destacado como BOPIS ou aparece somado às vendas aprovadas? Assim verificamos se a apresentação do painel está correta.';
if(/minha filial/i.test(v))return 'Certo! 💚 No Minha Filial, a venda BOPIS pode aparecer na composição comercial da loja, mas não deve integrar a base comissionável. Você quer conferir o valor apresentado ou o cálculo da comissão?';
if(/pool/i.test(v))return 'Obrigado por indicar o Pool! 💚 Valores BOPIS não devem compor a base do rateio de supervisores. Esse valor foi listado como BOPIS ou incluído no valor utilizado para o cálculo do Pool?';
if(/(somad|inclu|junto|aprovad)/i.test(v))return 'Obrigada por explicar! 💚 Se a venda BOPIS estiver compondo a base usada no cálculo de comissão, precisamos verificar uma possível divergência. Não altere os dados antes de conferir os valores aprovados e o campo BOPIS. Qual total de vendas aprovadas e qual valor BOPIS o aplicativo está exibindo?';
if(/(separad|destacad)/i.test(v))return 'Perfeito, obrigada! 💚 Quando o BOPIS está separado, ele serve para dar transparência à classificação. O importante é confirmar que não foi considerado na base comissionável. Gostaria de entender como conferir essa base?';
return 'Vamos conferir o BOPIS juntos! 💚 A venda pode aparecer para consulta, mas não entra no cálculo de comissionamento do colaborador nem do pool. Em qual menu você visualizou o valor: Meu Resultado, Minha Filial ou Pool?';
}
if(context.topic==='erro'&&/meu resultado/i.test(v))return 'Entendi, o problema é no Meu Resultado. 💚 Obrigada por explicar. O que você percebeu: valor incorreto, informação que não atualiza, comissão divergente ou dificuldade para acessar? Me diga qual opção se aproxima do ocorrido.';
if(context.topic==='hora'&&/(não|nao|falh|erro|trav)/i.test(v))return 'Entendi que a atualização do Hora a Hora não funcionou. 💚 Antes de tentar novamente, os valores apareceram corretamente na prévia de importação? Se não, conte se surgiu erro ou se nenhuma linha foi reconhecida.';
if(detected&&answers[detected])return answers[detected];
if(context.menu)return 'Estou acompanhando sua dúvida sobre '+context.menu+'. 💚 Me conte o que deseja verificar nesse menu: onde encontrar uma função, como interpretar um valor ou como corrigir uma dificuldade? Se eu não tiver um procedimento validado, vou orientar o encaminhamento.';
return 'Estou aqui com você! 💚 Para te orientar com segurança, me diga qual menu você está usando e qual informação gostaria de entender. Posso ajudar com navegação, metas, Hora a Hora, indicadores, FCA e eStore. Para casos fora desses roteiros, ainda precisaremos de suporte humano.';
}
function reply(q,key){add('user',q);add('assistant',guided(q,key));count++;if(count>30){chat.querySelectorAll('.ria-message').forEach((n,i)=>{if(i<chat.children.length-26)n.remove()})}}
topics.forEach(([label,key])=>{const b=document.createElement('button');b.type='button';b.className='ria-chip';b.textContent=label;b.addEventListener('click',()=>reply(label,key));chips.append(b)});
form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;reply(q);input.value='';input.focus()})}
nav.querySelector('[data-section="ria-suporte"]').addEventListener('click',()=>{document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));document.getElementById('section-ria-suporte').classList.add('active');nav.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.section==='ria-suporte'));window.scrollTo?.(0,0)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();