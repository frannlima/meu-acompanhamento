# Central de Chamadas — integração com Meu Acompanhamento

Esta aplicação deverá consumir a mesma central compartilhada definida no repositório `frannlima/app-estore-cepi`, no documento `docs/central-chamadas-cepi.md`.

## Requisitos específicos
- Publicar eventos Flash de vendas com filial, data, janela de parcial, timestamp de origem, valor e identificador idempotente; snapshot repetido substitui a visão anterior, não soma.
- Exibir status de atualização Flash por loja, duas parciais consecutivas atrasadas e histórico de chamadas relacionadas ao Flash.
- Navegar para a central de chamadas autorizada, com proteção de perfil administrativo validada no backend.
- Indicador eStore é independente; não usar ausência de evento eStore como ausência de Flash.
- Caso existam dados de Flash regionais, share eStore deve ser obtido cruzando loja+data+janela, sem considerar valor agregado regional como valor por loja.
- Respeitar pausas, férias, horário America/Fortaleza e bloqueio de disparo sem credenciais/provedor.
- Não implementar chamadas diretamente no front-end nem armazenar chaves Twilio em arquivos publicados no GitHub Pages.

Status: documentação, sem chamadas automáticas habilitadas.
