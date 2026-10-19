# Flash → Meu Acompanhamento • 0.3.0

A extensão consulta somente páginas do Flash na sessão aberta pelo usuário. O app precisa estar aberto como administrador no mesmo perfil do navegador. Não solicita nem copia senha, cookie ou token do Flash.

## Instalação / atualização

1. Extraia o ZIP em uma pasta permanente.
2. Em `edge://extensions`, atualize a extensão já instalada apontando para a pasta extraída (Carregar sem compactação), ou substitua os arquivos da pasta atual e clique em Recarregar.
3. Confira que a versão exibida é 0.3.0. Abra Total Lojas e o Meu Acompanhamento.
4. Na extensão, escolha a loja dos grupos/produtos e ative a coleta a cada cinco minutos. Autorize acesso somente aos dois domínios indicados.

## Relatórios

- **Lojas:** 18 lojas CE+PI; total, OMNI, orçamento, cupons e horário da fonte.
- **Grupos / DCOs:** todos os departamentos carregados da loja selecionada. Fanlab no Masculino, Relógios em Beleza; DCO 320 e Eletrônicos excluídos.
- **Produtos:** até 100 linhas visíveis por DCO. Em branco, a configuração escolhe o maior DCO em venda de cada mundo; alternativamente, informe até cinco DCOs. A cobertura aparece no painel. Os rankings são entre os itens coletados, com venda acumulada do dia; não há filtro nativo da última hora.
- **Fotos:** consulta no Raio X o primeiro item em quantidade de cada DCO coletado. Só aceita URLs de `static.riachuelo.com.br` contendo o SAP correto. Outros produtos mantêm link para o Flash e indicação de foto ainda não coletada.
- **Trocas:** usa a data dos links publicados no menu do Flash. Na validação de 18/10, a fonte disponibilizou somente 17/10. Há visão por loja e visão por DCO da empresa; a fonte observada não cruza DCO com loja.

A coleta automática recarrega Total Lojas e utiliza uma aba auxiliar para os detalhes, fechada ao terminar. Falhas de carregamento preservam a última coleta; ausência não vira zero. Cada envio exige confirmação do app. O ciclo tem limite de duração e relatórios pendentes são tentados na atualização seguinte.

O computador e o navegador devem permanecer ligados. A extensão não efetua login, não renova credenciais e pausa quando o Flash pede autenticação. A automatização não funciona 24 horas com o computador desligado.

## Proteção e interpretação

A extensão guarda somente configuração e status. O app mantém coletas locais em memória. Compartilhamento entre dispositivos exige e-mail confirmado e vínculo administrativo com a matrícula; os serviços verificam o usuário e o escopo da loja no servidor. Nenhum dado Flash entra na base oficial de vendas automaticamente.

Total Flash não equivale à venda contábil líquida do Automação Web. Total menos OMNI é somente físico de referência. Trocas/devoluções não identificam valores de vales-troca resgatados; não são usados para ajustar o total. eStore e OMNI permanecem conceitos distintos.
