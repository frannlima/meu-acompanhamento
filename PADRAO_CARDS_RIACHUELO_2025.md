# Padrão dos cards compartilháveis — Riachuelo (2025)

## Objetivo
Padronizar TODOS os modelos existentes de imagens compartilháveis nos apps **Meu Acompanhamento** e **eStore CE+PI** sem recriar layouts, sem modificar dados, cálculos, status, hierarquias de resultado ou ações de compartilhamento.

## Referências
- Brandbook Riachuelo 2025 e modelo de apresentação institucional aprovados.
- Logo institucional oficial já presente nos arquivos `assets` de cada app.
- Tipografia: **Larsseit** (Light/Regular/Medium/Bold); fallback Arial **somente enquanto não forem disponibilizados e incorporados os arquivos licenciados**.
- Paleta base: verde #0C2E2D; bege Duna #D7D0BB.
- Apoios Pantone da referência do usuário: 567 C #173F35; 3305 U #466964; Cool Gray 1 U #DAD9D6; 7527 C #D6D2C4; 138 C #DE7C00; 138 U #D37C32; 188 C #76232F; 187 U #AE535C; 175 C #6B3529; 174 U #9C5B4A; 179 C #E03C31; 485 U #E45D50; 701 C #E68699; 701 U #E98F9D.

## Invariantes de qualidade
1. Manter os modelos de card e os indicadores que já existem. Não duplicar títulos, logos, selos, rodapés ou KPIs.
2. Logo Riachuelo oficial, sempre proporcional, sem cortes nem deformações. Quando a composição original já trouxer o logo oficial no cabeçalho, não acrescentar uma segunda marca de destaque.
3. Títulos + números + legendas devem usar a mesma escala tipográfica relativa; a renderização Canvas deve preferir Larsseit. Evitar fontes inferiores a tamanho legível na imagem final.
4. Aplicar cores semânticas de forma consistente (atingimento/ganho, retração/desvio, zeragem/alerta) sem mudar o significado dos indicadores.
5. Usar imagens de campanhas oficiais **somente** nos cards de campanha, comunicação institucional ou reconhecimento, quando houver espaço seguro para leitura. Cards analíticos e tabelados permanecem com fundo sóbrio.
6. Para WhatsApp, preservar exportação legível em PNG e informações completas, sem truncar lojas/nomes relevantes.
7. Verificar no desktop e no celular o resultado da exportação final (não apenas o CSS e não apenas a prévia).
8. A assinatura institucional comum `brand-sharecards-2025.js` é base de compatibilidade, não substitui o acabamento específico de cada modelo.

## Inventário: Meu Acompanhamento

| Card existente | Origem no repositório | Padrão aprovado |
| --- | --- | --- |
| Parcial por Mundo / Grupos / DCOs | `enhancements-v9.js` | Tabela e grupos, topo verde, logo oficial vertical quando houver espaço, tarjas e desvios, fundo neutro |
| Hora a Hora / Resultado do Dia | `clarity-v1.js` | Painel analítico horizontal com valores, atingimento, AA, evolução, meta física e grupos; sem foto de fundo |
| Comerciais / Performance por responsável | `premium-v22.js` | Ranking com numeração, evolução, indicadores e fotografia do colaborador quando houver; identidade sóbria |
| Consolidado Regional | `app.js` | Painel horizontal por loja, metas, vendas e desvios; sem foto de fundo |
| Visualização HTML dos painéis de grupos/regional | `app.js` e estilos | Mesmo estilo da imagem de exportação quando for compartilhado; preservar controles |

## Inventário: eStore CE+PI

| Card existente | Origem no repositório | Padrão aprovado |
| --- | --- | --- |
| Meu Resultado / Minha Filial / Metas / Pool | `app-v2.js` (shareV4/canvasCard) | KPIs, meta, desvio, comissão, hierarquia de leitura; fundo neutro |
| Ranking e Destaques | `app-v2.js` (highlightsCanvasV5) | Reconhecimento, pódio, fotos existentes, Pantone nos destaques |
| Hora a Hora e parciais de lojas | `app-v2.js` | Analítico com informação completa por loja, pedido/share, atualização e status |
| Meu Time / Dispersão / Gestão | `app-v2.js` e `team-v112.js` | KPI e tabela, ranking, estado de zeragem e leitura executiva; sem foto de fundo |
| Meu Time Filial | `team-store-v113.js` | Mesma família visual com contexto e escala da filial |
| BOPIS | `bopis-analytics-v117.js` | Painel de captação, pedidos e frequência com semântica e distinção dos valores não elegíveis |
| FCA / Performance Semanal | `performance-v130.js` | Quadro executivo horizontal, leitura causal, lojas priorizadas, prazos e ações |
| Painel / Apresentação Regional | `presentation-v103.js` | Horizontal, logo proporcional, cards, rankings e tabela |
| Campanhas e incentivos eStore | `app-v2.js`, `assets` | Fotografia institucional apenas quando melhorar comunicação e mantendo legenda/CTA legíveis |

## Revisão e status
- **Implementado anteriormente:** assinatura institucional de exportação na maioria dos geradores PNG e CSS base da marca nos dois apps.
- **Etapa recente aplicada:** declaração de fonte Larsseit com fallback nos geradores Canvas localizados, com renovação das versões PWA.
- **Pendente:** incorporar os arquivos licenciados de fonte original (.otf/.woff), revisar individualmente duplicações do logotipo, fazer capturas de validação de cada card e verificar eventuais exportações construídas fora dos fluxos mapeados.
- **Critério de conclusão:** somente declarar “100% padronizado” depois de exportar e inspecionar visualmente todos os tipos de cards nos dois apps.
