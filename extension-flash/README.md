# Flash piloto — primeira etapa

Implementação experimental para Chrome/Edge desktop. Coleta assistida mediante clique do administrador, usando a sessão já aberta no Flash. Sem senhas, cookies, interceptação de rede ou endpoints internos. Não contorna restrições de instalação do computador.

## Fluxo implementado

1. Carregar esta pasta como extensão sem compactação, caso o ambiente permita. Isso é feito pelo usuário; não é instalado pelo aplicativo.
2. Manter exatamente uma aba de `https://frannlima.github.io/meu-acompanhamento/` aberta com login administrador e a versão que inclui este piloto.
3. No Flash, abrir **Vendas → Total Lojas** e escolher um único dia. Para visão completa da regional, não restringir a tabela a uma única loja.
4. Abrir a extensão, clicar **Conferir coleta** e conferir as lojas e a data. A coleta considera apenas as 18 lojas cadastradas no app e rejeita cabeçalhos inesperados, valores ausentes e lojas duplicadas.
5. Clicar **Enviar ao piloto no app**. O navegador solicita acesso ao domínio do app somente nessa etapa. Conferir o recebimento em **Flash piloto**, disponível para administrador no menu lateral e em Mais.
6. Abrir eStore e consultar a parcial para preencher a coluna eStore no piloto com a fonte já utilizada no app.

A coleta não transmite dados automaticamente ao carregar a página. Não contém temporizador em segundo plano, não altera a base oficial e não sincroniza entre computadores/celulares. O quadro piloto é mantido apenas em memória até logout/recarregamento; não é armazenado no repositório, em arquivo nem em servidor. Para limpar imediatamente, usar **Limpar coleta local**.

## Semântica

- **Total Flash**: número da tela, ainda sem conciliação de vales-troca.
- **OMNI**: Real Online, conforme definição operacional fornecida por Fran; não é eStore.
- **Físico de referência**: Total Flash menos OMNI. Não chamar de venda líquida contábil.
- **eStore / Total Flash**: percentual indicativo; não substitui o share oficial. Coletas das duas fontes têm horários independentes.
- **Orçamento Flash**: exibido apenas como referência; não substitui meta oficial (foram observadas diferenças entre telas do Flash).
- Ausência de uma loja não é zero confirmado. Horário nulo indica informação indisponível.

## Próximas etapas ainda não implementadas

- Conciliar totais do mesmo dia/horário com Automação Web e significado das trocas.
- Definir denominador oficial (canais, vales, captado/aprovado) antes de integrar o share definitivo.
- Persistência segura e distribuição para as lojas requerem implementação do lado do servidor e autorização por perfil, sem endpoint público de escrita.
- Atualização contínua exige ciclo de sessão, falhas, atraso e deduplicação validados.
- Trocas por grupos/DCOs exigem coleta validada no relatório de departamentos e mapeamento oficial dos grupos.
- Reposição prioritária exige dados por produto/loja, imagens e intervalo. A tela 100 Maiores Vendas não teve linhas carregadas na inspeção; não há garantia de fotos nem corte da última hora. Não subtrair snapshots de rankings incompletos como se fossem vendas exatas por hora.

## Validação

`node tests/flash-core.test.cjs`

`node tests/flash-capture.test.cjs`

A extensão ainda precisa de teste ponta a ponta no navegador do usuário. Nenhum envio real foi feito nesta implementação.
