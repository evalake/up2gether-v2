# DNS e registrant hardening — up2gether.com.br

Passos manuais que nao da pra fazer em codigo. Fazer no painel da **Cloudflare**
(DNS do dominio) e do **registro.br** (registrant).

## 1. DMARC (bloqueia phishing impersonando @up2gether.com.br)

Hoje nao existe `_dmarc.up2gether.com.br`. Qualquer um pode spoofar email
"de" @up2gether.com.br. Detectado pelo `/u2g-sec-watch`.

### Primeiro mes (modo observacao)

No Cloudflare, DNS > Add record:

- Type: `TXT`
- Name: `_dmarc`
- Content: `v=DMARC1; p=none; rua=mailto:dmarc@up2gether.com.br; adkim=s; aspf=s; pct=100`
- TTL: Auto

Com `p=none` o provedor so reporta, nao bloqueia. Deixa rodando uma semana
pra ver se alguem legitimo (Cloudflare Email Routing, sistemas de marketing,
etc) vai precisar ser alinhado no SPF/DKIM.

### Depois de validar (quarentena)

Troca pra:

- Content: `v=DMARC1; p=quarantine; rua=mailto:dmarc@up2gether.com.br; adkim=s; aspf=s; pct=100`

`p=quarantine` manda email suspeito pra spam. Se ainda nada quebrar por uma
semana, vai pra `p=reject` (bloqueio completo).

> Ativar caixa `dmarc@up2gether.com.br` no Cloudflare Email Routing pra
> receber os reports. Filtrar pra pasta propria, nao ficar no inbox.

## 2. DKIM (se for mandar email saindo do dominio)

Cloudflare Email Routing hoje e so **inbound**. Se passar a mandar email
(bot, onboarding, alerta), usar provedor com DKIM (Resend, SES, Postmark) e
publicar a TXT do DKIM deles em `<selector>._domainkey.up2gether.com.br`.

Sem email saindo: nao precisa de DKIM por agora.

## 3. MTA-STS (opcional, pra forcar TLS no receive)

So util quando o volume justificar. Pular.

## 4. RDAP/WHOIS — esconder o nome YURI do registrant

**Problema detectado:** consulta RDAP em `rdap.registro.br/domain/up2gether.com.br`
expoe o handle tecnico `YUAMA30`, que por sua vez expoe nome "YURI" e email
parcial. Qualquer pessoa que olhar WHOIS ve isso.

### Opcoes

1. **CNPJ** (ideal): registrar o dominio via uma PJ tua (MEI ou ME).
   - Registrant vira razao social da empresa, nao o nome pessoal.
   - Email do WHOIS vira o contato PJ (tipo contato@up2gether.com.br ao inves
     de email pessoal).
   - Troca no registro.br: transferir o dominio pro CNPJ (via painel, sem
     downtime, mantem DNS e nameservers).
   - Custo: baixo se ja tem MEI, ~R$ 60/ano MEI + R$ 40/ano dominio.

2. **Trocar contato tecnico pra handle separado** (paliativo):
   - Criar outro handle no registro.br com nome neutro ("Up2Gether Tech")
     e um email `tech@up2gether.com.br`.
   - Contato admin/cobranca pode continuar com o handle pessoal porem
     tecnico que e mais exposto.
   - Nao esconde tudo, so limita superficie.

3. **Nada**: aceitar que `.com.br` pessoa fisica tem nome exposto.
   Registro.br nao oferece privacy protection equivalente ao que .com/.net
   oferecem. Risco real e baixo (nome sozinho nao e vetor), mas cruzamento
   com outros dados publicos (GitHub, LinkedIn) pode virar dossie.

**Recomendacao:** opcao 1 quando tiver MEI pronto. Opcao 2 no meio tempo
(criar handle `u2gtech` ou similar e associar so ao dominio).

## 5. Pos-deploy: revalidar sec-watch

Depois de subir o backend (com config `APP_ENV=production` no Fly) e o
frontend (vercel.json com headers novos) + DMARC no Cloudflare:

```bash
python ~/.claude/scripts/u2g_sec_watch.py
```

Esperado: `fixed: [api_docs_exposed, api_security_headers, frontend_security_headers,
sse_token_in_query, discord_oauth_state, rate_limit_telemetry, dmarc_published]`.

Apos confirmar estavel (um dia rodando, sem regressao falsa), rodar:

```bash
python ~/.claude/scripts/u2g_sec_watch.py --update-baseline
```

pra mover os fixes pro baseline.

## 6. Variaveis novas pra setar

No Fly (backend):

```
fly secrets set APP_ENV=production -a up2gether-api
```

Sem isso, `/docs` continua exposto mesmo com o fix subido (o switch e gated
no env).
