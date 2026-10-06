# Meu Acompanhamento

Aplicativo independente para acompanhamento comercial CE+PI.

## Endereço
https://frannlima.github.io/meu-acompanhamento/

## Fluxo operacional
- Login por matrícula + loja
- Meta diária carregada automaticamente
- Seleção de Mundo
- Colagem direta da tabela oficial de 14 colunas
- Exclusão automática de TOTAL GRUPO / TOTAL FILIAL
- Eletrônicos fora do resultado (DCOs 530, 531, 532 e 552)
- Relógios preservados (550 e 551)
- Snapshot a cada input
- Comparativo por DCO, grupo e regional

## Arquitetura
- Frontend: GitHub Pages
- Backend: Supabase exclusivo do Meu Acompanhamento
- Cache PWA isolado: meu-acompanhamento-v1

Este projeto é independente do repositório app-estore-cepi.
