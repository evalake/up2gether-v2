# up2gether -- Business Plan

Plano vivo. Atualiza conforme for validando hipotese no mercado.

## Glossario

Siglas de SaaS/growth que aparecem aqui. Decora nao, consulta quando precisar.

| Sigla | Significa | O que e |
|-------|-----------|---------|
| **MAU** | Monthly Active Users | Usuarios que fizeram pelo menos 1 acao no mes. Diferente de "usuarios registrados". |
| **DAU / WAU** | Daily / Weekly Active Users | Mesma ideia mas por dia/semana. DAU/MAU alto = produto vicia. |
| **ARPU** | Average Revenue Per User | Receita media por cliente. Total de receita / total de clientes. |
| **MRR** | Monthly Recurring Revenue | Receita recorrente mensal. So conta assinaturas ativas, nao pagamentos unicos. |
| **ARR** | Annual Recurring Revenue | MRR * 12. Metrica padrao pra comparar SaaS. |
| **LTV** | Lifetime Value | Quanto um cliente paga ao longo da vida toda antes de cancelar. ARPU * meses de retencao. |
| **CAC** | Customer Acquisition Cost | Quanto custa adquirir 1 cliente (marketing + vendas / clientes adquiridos). |
| **LTV/CAC** | Ratio LTV sobre CAC | Saude do negocio. <3x = ruim, >6x = muito bom. |
| **Churn** | Taxa de cancelamento mensal | % de clientes que cancelam no mes. SaaS saudavel = <5% mensal. |
| **Retention** | Retencao (inverso do churn) | % que continua. W4 = semana 4, M6 = mes 6. |
| **ICP** | Ideal Customer Profile | Perfil ideal de cliente. Quem mais precisa do produto e topa pagar. |
| **Seat-based** | Cobranca por assento | Preco escala com numero de usuarios, nao uso. Oposto de usage-based. |
| **Freemium** | Free + Premium | Tier gratis generoso, funil pra converter em pagante. |
| **Grandfathering** | "Avo legado" | Manter clientes antigos num plano/preco extinto. No nosso caso: teus amigos ficam free pra sempre. |
| **Dunning** | Cobranca de inadimplentes | Fluxo de retry quando cartao falha (email, nova tentativa, suspender). |
| **Cutoff** | Data de corte | Momento que define quem entra em X regra. No nosso caso: dia do lancamento paid. |
| **CAC payback** | Tempo de retorno do CAC | Quantos meses ate o cliente pagar de volta o que custou adquirir. <12 meses = saudavel. |
| **Burn rate** | Queima mensal | Quanto de grana queima por mes. Relevante quando infra + tools > receita. |
| **Runway** | Pista | Quantos meses sobrevive antes de zerar caixa. Burn rate vs reserva. |

## TL;DR

- **Quem paga:** dono do servidor Discord (grupo no up2gether)
- **Como escala:** tier por membros registrados no grupo (seat-based). Inativo tambem conta.
- **Quando cobrar:** growth-first. Free generoso pros primeiros 6-12 meses. Paywall suave depois.
- **Amigos/grupos iniciais:** flag `legacy_free = true` no grupo. Imune a qualquer paywall, pra sempre.
- **Exit em mente:** codebase e UX Discord-native. Metricas que o Discord compraria (retention de servidor, DAU, sessoes concluidas).

## ICP (quem e o cliente)

Dono/admin de servidor Discord com 30-500 membros ativos que:
- Joga com a galera mas sempre trava no "oq vamo jogar hoje"
- Ja usou Sesh, Mee6, bots de votacao, mas nada resolve o problema de *compatibilidade de biblioteca* (quem tem o jogo) + *agendamento* + *votacao* no mesmo lugar
- Ta disposto a pagar R$ 30-90/mes pra manter a comunidade viva (mesmo range do Discord Nitro, entao o usuario ja tem precedente de pagar pra coisa de Discord)

Nao e ICP agora: competitivo e-sports, servidores corporativos, comunidades >5k membros (enterprise depois, so quando der).

## Pricing (hipotese inicial)

Por grupo (servidor). Precos em BRL.

**Racional dos limites:** quase todo game com squad roda em 4-6 slots (Valorant/LoL/CS = 5, Destiny fireteam = 6, Apex = 3, Fortnite squad = 4, Overwatch = 5). Grupo real de amigos que joga junto tem 5-10 pessoas + reservas. Passou de ~10 ja virou "servidor com varias panelas", nao "grupo de amigos". Por isso o free e 10, nao 25 -- ativa paywall exatamente quando o servidor cresceu o bastante pra ter multiplas panelas coordenando.

| Tier | Preco | Limite de membros | Features | Perfil tipico |
|------|-------|-------------------|----------|----------------|
| **Free** | R$ 0 | ate 10 membros | Core: login Discord, sync Steam, votacao, 2 sessoes agendadas simultaneas, tema default | Panela classica: squad de 5 + reservas |
| **Pro** | R$ 29/mes ou R$ 290/ano | ate 30 membros | Sessoes ilimitadas, analytics basico, temas custom, web push prioritario | 2-3 panelas, crew de faculdade/trampo |
| **Community** | R$ 89/mes ou R$ 890/ano | ate 100 membros | Analytics completo, branding (logo/cor), API read, moderacao avancada | Streamer pequeno, comunidade organizada |
| **Creator** | R$ 249/mes ou R$ 2490/ano | ate 500 membros | White-label, suporte direto (eu no DM), features custom sob demanda | Streamer medio+, servidor grande |
| **Legacy** | R$ 0 pra sempre | sem limite | Tudo | Grupos existentes ate data do cutoff. Flag no DB. |

Servidor que passar de 500 ativos (caso raro pra jogos, e so streamer bem grande) continua usando normalmente, sem paywall duro. Eu entro em contato via DM pra conversar infra/pricing especifico. Nao tem tier publico acima disso. E app de jogos, nao ERP.

**Como conta o membro:** conta a partir do *primeiro login via Discord* no grupo. Convite pendente nao conta. Admin adicionar manualmente nao conta ate o usuario logar. Padrao de mercado (Slack, Linear, Notion): seat so ativa quando usuario autentica.

| Evento | Conta? |
|--------|--------|
| Convite enviado, nao aceito | Nao |
| Admin adicionou manualmente, usuario nunca logou | Nao |
| Usuario logou via Discord no grupo (primeira vez) | Comeca a contar |
| Usuario inativo mas ainda no grupo | Continua contando |
| Usuario saiu voluntariamente do grupo | Para de contar |
| Usuario foi removido/kickado pelo admin | Para de contar |
| Usuario banido | Para de contar |

Implementacao: coluna `activated_at timestamp` em `group_members`, populada no primeiro OAuth success. Counter = `count(*) where activated_at is not null`.

**Rationale do ancoramento:**
- R$ 29 fica 24% abaixo do Nitro (R$ 38). Usuario ja paga mensalidade de Discord, entao a barreira mental e baixa. O R$ 19 antigo comprimia margem demais sem ganho real em conversao.
- R$ 89 no Community cobre custo real de 100 membros ativos (SSE, audit, webhook Discord batendo toda hora) com folga. R$ 49 nao fechava conta se 3-4 grupos do tier acumulassem ao mesmo tempo.
- R$ 249 no Creator com teto de 500 e a mudanca critica. "100+ sem limite" do plano antigo era suicidio de margem, um server com 2000 pessoas comia tudo. Teto em 500 cobre 99% dos casos de gaming real (streamer medio-grande raramente tem >300 ativos simultaneos usando o app).
- Anual com desconto ~17% pra melhorar retencao e cash upfront
- Free calibrado pra panela classica (squad + reservas) cruzar o limite quando vira "comunidade de panelas"

Isso e hipotese, nao verdade. Primeira validacao e ver em M6 quantos grupos chegam em 10 membros e quantos convertem. Se conversao <5%, baixar limite do free pra 7. Se >15%, tao pagando demais pelo que recebem, subir valor.

**Trade-off do modelo seat-based:** simplicidade e previsibilidade pro cliente, mas cria friccao marginal pra convidar membros novos (dono pensa "sera que compensa?"). Mitigacao: limites dos tiers sao generosos o bastante pra nao travar crescimento organico do grupo. Se virar problema (donos removendo inativos pra economizar), repensar pra modelo hibrido.

## Grandfathering (teus amigos)

Todo grupo criado antes do cutoff recebe `legacy_free = true` no banco. Esse flag:
- Ignora todos os limites de MAU
- Desbloqueia features de Community tier
- Nunca expira

Implementacao: coluna em `groups`, check no entitlements service antes de qualquer gate. Migracao pra marcar todos os grupos atuais como legacy no dia do cutoff.

Bonus: teus amigos viram *case study* e prova social. Pedir depoimento quando forem lancar o paid.

## Go-to-market (growth-first)

**Fase 0 -- agora ate M3: invisivel**
- Nada de paywall, nada de paginas de preco
- Foco total em polir core loop (login, criar grupo, primeira sessao, voltar em 7 dias)
- Meta: 50 servidores ativos, 30% retencao W4

**Fase 1 -- M3 a M6: presenca**
- Registrar bot oficial no Discord, listar em top.gg e disboard
- SEO focado em long-tail PT-BR: "como organizar sessao jogos discord", "votacao jogos discord", "bot agendar jogo discord"
- Parceria com 3-5 streamers pequenos/medios (1k-10k seguidores) -- trocar acesso vitalicio Community por mencao
- Meta: 200 servidores, 1000 DAU, comecar coletar feedback estruturado

**Fase 2 -- M6 a M9: monetizacao suave**
- Lanca tier pago. Nenhum usuario atual e forcado (todos legacy)
- Primeiro paywall: *novos* servidores que cruzam 25 MAU ganham 30 dias de trial Pro gratis, depois downgrade ou pagar
- Stripe Brasil + Mercado Pago (BR-first, internacional depois)
- Meta: 10 conversoes pagantes, R$ 300 MRR

**Fase 3 -- M9 a M12: escala**
- Analytics pago, white-label pra Creator tier
- Programa de afiliados (20% recorrente pros 12 primeiros meses)
- Meta: R$ 1k MRR, 300 servidores ativos

**Fase 4 -- M12+: pensar em exit**
- Se MRR > R$ 5k e retencao M6 > 40%: comecar a mostrar deck pro pessoal do Discord (parcerias, depois M&A)
- Se nao: seguir bootstrapped, otimizar unit economics

## Unit economics (estimativa)

Supondo distribuicao em M12:
- 300 grupos ativos
- 70% free, 25% Pro, 4% Community, 1% Creator
- ARPU blended: 0.70 * 0 + 0.25 * 29 + 0.04 * 89 + 0.01 * 249 = **R$ 13.3/grupo/mes**
- MRR: 300 * 13.3 = **R$ 3.99k**

Custo por grupo (estimativa Fly + Neon + Vercel):
- Ate 30 membros: ~R$ 2-4/grupo/mes (compute compartilhado, DB shared)
- 30-100 membros: ~R$ 5-10/grupo/mes
- 100-500 membros: ~R$ 15-25/grupo/mes (SSE pesado, historico, audit)
- Margem bruta estimada: 85-92% nos tiers pagos (sobe conforme escala)

Precisa validar: se conversao free -> pago bate 5% com o limite de 10, o modelo funciona. Se bater 8-10% (realista pra core loop forte), MRR dobra sem mexer em preco.

CAC alvo: <R$ 45/server pago (organico + parcerias deve manter proximo de zero, budget cresce com ARPU maior)
LTV alvo: >R$ 280/server (12 meses de retencao * ARPU medio ~R$ 23 no mix pago)
LTV/CAC alvo: >6x antes de considerar growth pago

## O que precisa ser construido (pra suportar billing)

Nao construir *agora*. Construir em M4-M5, quando growth ja validou.

1. **Entitlements service** -- checar plano do grupo antes de permitir feature (sessao ilimitada, tema custom, etc). Feature flag por tier.
2. **Legacy flag** -- coluna `legacy_free` em `groups`, populada na migracao do cutoff
3. **Member counter** -- query simples em `group_members` retornando count por grupo. Cache de 1h pra nao bater DB a cada check de entitlement
4. **Billing integration** -- Stripe Brasil (cartao internacional + domestico) + Mercado Pago (PIX + boleto). Webhook pra atualizar status no DB.
5. **Trial state machine** -- trialing -> active -> past_due -> canceled. Dunning com 3 retries.
6. **Downgrade graceful** -- se cair de Pro pra Free, sessoes existentes viram read-only se passarem do limite, nao deletar
7. **Dashboard de billing** -- tela pro admin do grupo ver plano, trocar, baixar nota, cancelar

Tudo isso entra depois que o produto prova engagement. Construir billing em cima de produto que ninguem usa e o classico erro de founder.

## Riscos e mitigacao

| Risco | Mitigacao |
|-------|-----------|
| Discord lanca feature nativa (tipo "Events" mas com votacao) | Esse e o risco maior. Unica defesa e ser a melhor experiencia em 6 meses. Se Discord clonar, vender/encerrar. |
| Steam muda API de biblioteca privada | Ja e risco ativo. Cache agressivo + fallback manual (usuario marca jogos que tem). |
| Grupos nao chegam em 10 membros | Sinal de que o produto nao viralizou (grupo nao convida mais amigos). Voltar pra core loop, nao baixar preco. |
| Donos removem inativos pra economizar (gaming do sistema) | Aceitavel se marginal. Se virar comum, adicionar trial de 14 dias quando membro novo entra (nao conta pro tier no trial). |
| Legacy flag vira brecha (gente cria grupo fake pra ser legacy) | Cutoff rigido por data de criacao. Pos-cutoff, sem excecao. |
| Contabilidade / MEI / imposto | Abrir MEI em M6 antes de primeiro pagamento. Simples Nacional cobre ate R$ 81k/ano. |

## Metricas que importam

Weekly review dessas 5 metricas:
1. **Servidores ativos (DAU/WAU por server)** -- e a metrica que o Discord olharia em aquisicao
2. **Retention W4** -- quantos servers seguem ativos 4 semanas depois de criados
3. **Sessoes concluidas/semana** -- prova que o core loop funciona
4. **Conversao free -> pago** (depois de M6) -- valida pricing
5. **Churn mensal pago** -- se >7%/mes, pricing ou produto ta errado

Nao olhar: total users signed up (vanity), total groups created (vanity), Discord server count (vanity).

## Decisoes operacionais (fixadas 2026-04-14)

Depois de revisar o plano inteiro com pair programming, fixei isso pra parar de floar em "depois a gente decide":

| Tema | Decisao |
|------|---------|
| **Cutoff legacy** | 2026-10-14 (M6). Todo grupo criado antes dessa data = `legacy_free = true` pra sempre. Migration atual ja marcou todos como legacy; proxima migration vai *desmarcar* so os grupos criados entre o cutoff e o redeploy (caso nenhum, no-op). |
| **Gateway de pagamento** | Asaas. Motivos: PIX recorrente nativo, boleto, cartao domestico, taxa ~3.49% no credito e R$ 1.99 no boleto. Stripe Brasil nao faz PIX recorrente. Pagar.me e otimo mas mais caro. Asaas da conta de MEI-size. Internacional fica pra depois com Stripe em paralelo. |
| **Politica de reembolso** | 7 dias corridos apos primeira cobranca, sem pergunta (CDC). Cancelamento a qualquer momento, acesso ate fim do periodo pago. Nao estorna proporcional. |
| **CNPJ** | Abrir MEI em **2026-09** (1 mes antes do cutoff). Teto R$ 81k/ano cobre 1-2 anos tranquilo. Migrar pra ME/Simples quando ARR passar R$ 60k. |
| **Nota fiscal** | MEI pra PF nao precisa emitir. Quando chegar cliente PJ (Community/Creator), emitir via emissor do MEI. |
| **Free limit** | Mantem 10 por enquanto, mas marcar revisao em M3 (jul/2026): se retention W4 <25%, subir pra 15 (mais viralidade, MRR projetado -20%). Dado bate palpite. |
| **Trial** | Novos servidores que cruzam 25 membros na fase paga ganham 14 dias de trial Pro gratis. Nao cobra cartao no trial. Expirou sem pagar = downgrade automatico pra Free (read-only nas sessoes acima do limite). |

## Proximos passos imediatos

- [ ] Validar hipotese de pricing com 3-5 donos de servidor que nao sao amigos (entrevista, 15min cada)
- [x] Criar coluna `legacy_free` em `groups` + migracao (feito em 358242a31020)
- [x] Definir data do cutoff legacy (2026-10-14)
- [x] Escolher gateway (Asaas)
- [ ] Criar conta Asaas + sandbox (fazer so em agosto/2026, 2 meses antes do cutoff)
- [ ] Listar bot em top.gg (precisa bot oficial Discord, nao so OAuth)
- [ ] Escrever 3 posts SEO pt-BR pra validar trafego organico
- [ ] Abrir MEI em 2026-09
- [x] Definir regra de "membro registrado": primeiro login via Discord no grupo (activated_at populado)
- [ ] Revisar Free limit em 2026-07 com dado de retention W4
