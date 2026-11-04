# Avatares de gerentes por filial — implementação incremental

Branch: `feature/avatares-gerentes-filiais`

## Escopo
- Cadastro ADM: código da filial, nome do gerente, foto original, versões de comemoração, acompanhamento, atenção e reação.
- Identificar a filial selecionada pelo código, nunca pelo nome do gerente.
- Selecionar estado por projeção, curva e frescor da última parcial.
- Não modificar o avatar atual da filial 108 antes de integrar e validar.
- Utilizar fotos dos gerentes apenas com autorização; não criar imagens de pessoas sem referência autorizada.

## Integração pendente
1. Identificar estrutura real do aplicativo e ponto de entrada do ADM.
2. Aplicar migração SQL após revisar o modelo de autenticação.
3. Configurar bucket privado e políticas de leitura/escrita por perfil ADM.
4. Criar interface de cadastro/upload, com validação de formato e tamanho.
5. Conectar filial ativa, indicadores Hora a Hora e atualização de parciais.
6. Validar no celular, inclusive sem foto e sem venda atualizada.
7. Revisar testes e publicar somente após aprovação.

## Observações
Os limiares de performance são propostas iniciais, não parâmetros de negócio aprovados.
A função de seleção usa 30 minutos para desatualização como padrão ajustável.
Nenhuma foto real foi cadastrada.
