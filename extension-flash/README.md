# Flash — resultado das lojas (extensão 0.2.0)

Coleta o painel Total Lojas da sessão autenticada do usuário no Flash, filtrando as 18 lojas CE+PI. Não lê senhas, cookies ou endpoints internos. Não contorna bloqueios de instalação da empresa.

## Coleta manual

Abra o Flash em Total Lojas, selecione um dia e mantenha o Meu Acompanhamento aberto como administrador no mesmo perfil do Edge/Chrome. Na extensão, use Conferir coleta e Enviar. A aba do app mais recentemente acessada será o destino. O envio da extensão não confirma o aceite: confira o painel do app.

## Atualização periódica — opção explícita

Use Ativar atualização a cada 5 minutos e autorize os dois domínios apresentados. A extensão recarrega a única aba Total Lojas e lê a tabela renderizada. Requer computador ligado, navegador ativo, Flash autenticado e app aberto como administrador. Não opera com computador desligado, não renova credenciais e não tem acesso independente ao Flash.

O primeiro ciclo ocorre aproximadamente um minuto após ativação. O navegador pode atrasar alarmes. Se houver login, tabela indisponível, mais de uma aba Flash ou app fechado, exibe a pendência na extensão e tenta novamente no ciclo seguinte. Use Parar atualização automática para desligar. Não armazena vendas na extensão, somente a configuração e a última mensagem de estado.

A coleta periódica é código novo testado com mocks; a operação ponta a ponta no Edge do usuário ainda precisa ser validada. A versão instalada 0.1.1 mantém a coleta manual e não recebe a automação até ser substituída pela pasta 0.2.0.

## Visão do app

Menu Flash • Lojas: total Flash, orçamento da fonte, atingimento, desvio, OMNI, físico de referência, cupons, ticket, participação entre lojas coletadas, filtros e ordenação. A marcação de atraso se refere à idade da coleta. Hora Flash de cada loja é exibida separadamente. Sem informação não equivale a zero.

Histórico local em memória da sessão. Para histórico compartilhado, o endpoint flash-sync valida uma sessão Supabase Auth e o vínculo ativo do e-mail com matrícula/loja em ria_authorized_emails. Confirmação de e-mail não libera acesso sem esse vínculo. Administrador publica e consulta regional; demais perfis recebem somente a própria loja. A identificação normal do app não é alterada. Publicação e leitura compartilhadas ainda dependem do vínculo e do teste com sessão verificada.

A tabela flash_snapshots tem RLS e não possui permissões de acesso direto para anon/authenticated; acesso ocorre somente pelo serviço autorizado. Sem dados reais em arquivos ou repositório.

## Limites dos indicadores

Total Flash contém componentes ainda não conciliados com Automação Web. Físico de referência = total − OMNI, sem afirmar venda contábil líquida. Orçamento Flash não substitui a meta oficial. Relação eStore/Flash é indicativa. A integração não escreve na venda oficial.

## Pendências de escopo

Detalhamento por grupo/DCO, trocas, produtos, fotos/estoque e recorte por hora dependem da inspeção autenticada e validação dos campos disponíveis. Não há esses dados nesta versão. Share eStore oficial depende da conciliação de canais e vales-troca. A fonte eStore regional também permanece pendente de validação.

## Validação

node tests/flash-core.test.cjs
node tests/flash-capture.test.cjs
node tests/flash-view.test.cjs
node tests/flash-sync.test.cjs
