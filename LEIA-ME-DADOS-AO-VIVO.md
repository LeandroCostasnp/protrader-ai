# ProTrader AI — Dados ao vivo (Forex) via proxy próprio

Objetivo: fazer o app receber **preço real ao vivo** de forma estável, sem depender
de proxies públicos que caem (o que hoje força o modo SIMULADO), e sem expor a API key.

## O que mudou

- Nova **Netlify Function** (`netlify/functions/td.js`): seu proxy privado da Twelve Data.
  A API key fica NO SERVIDOR (variável de ambiente), nunca no HTML.
- Todas as chamadas à Twelve Data (preço, MTF, DXY, scanner) passam por essa função.
- **Rate-limit local** de ~7 req/min embutido, para não estourar o plano free (8/min).
- Polling adaptativo: 20s com operação ativa, 60s ocioso, pausa com aba oculta.
- Indicador **REAL / SIMULADO / OFFLINE** sempre visível no topo.

## Limites do plano free da Twelve Data (confirmados)

- **8 requisições por minuto**, **800 por dia** (reset à meia-noite UTC).
- A configuração já respeita isso. Se quiser rodar o dia todo sem pausas,
  o plano Grow (US$ 29/mês) sobe para 55/min e remove o limite diário.

---

## Passo a passo (uma vez só)

### 1. Suba os arquivos no GitHub
No seu repositório `protrader-ai`, garanta esta estrutura:

```
protrader.html            (ou index.html)
netlify.toml
netlify/functions/td.js
```

### 2. Crie o site no Netlify (separado, como você quis)
- Netlify → Add new site → Import from GitHub → escolha `protrader-ai`.
- Build command: deixe vazio. Publish directory: `.` (já está no netlify.toml).
- Deploy. Anote o subdomínio, ex.: `protrader-leandro.netlify.app`.

### 3. Configure a API key COMO VARIÁVEL DE AMBIENTE (não no código!)
- Netlify → Site settings → Environment variables → Add a variable
  - Key:   `TD_API_KEY`
  - Value: sua chave da Twelve Data
- Faça um novo deploy (Deploys → Trigger deploy) para a variável valer.

### 4. Aponte o app para o seu proxy
No `protrader.html`, procure a linha:

```js
const PROXY_BASE = 'https://SEU-SITE.netlify.app/api/td?url=';
```

Troque `SEU-SITE` pelo seu subdomínio real, ex.:

```js
const PROXY_BASE = 'https://protrader-leandro.netlify.app/api/td?url=';
```

Salve, faça commit. Pronto — o app passa a usar dados ao vivo estáveis.

### 5. Teste
Abra o site. No topo deve aparecer **● DADOS REAIS** (verde).
Se aparecer **▲ SIMULADO** (âmbar), verifique:
- a variável `TD_API_KEY` está no Netlify e o deploy foi refeito depois de criá-la;
- o `PROXY_BASE` tem o subdomínio certo;
- você não estourou os 800 créditos do dia.

---

## Observação sobre segurança (importante)

A chave `394eedc2...` que estava escrita dentro do HTML **foi removida**.
Como esse repositório é público, considere-a comprometida:
gere uma **nova** API key na Twelve Data e use só ela na variável de ambiente.
A chave antiga continua no histórico de commits do GitHub — só uma chave nova resolve.
