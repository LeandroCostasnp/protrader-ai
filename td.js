// ═══════════════════════════════════════════════════════════════
//  ProTrader AI — Proxy privado para Twelve Data
//  A API key fica NO SERVIDOR (variável de ambiente TD_API_KEY),
//  nunca no HTML público. O front chama esta função e ela repassa
//  a requisição para a Twelve Data já com a chave.
//
//  Segurança:
//   - Só aceita chamadas ao domínio api.twelvedata.com (não é proxy aberto).
//   - A chave nunca aparece na resposta nem nos logs do cliente.
//
//  Economia de cota:
//   - Cache em memória de 8s por (endpoint+símbolo+intervalo).
//     Vários componentes do app pedindo o mesmo dado = 1 crédito só.
// ═══════════════════════════════════════════════════════════════

const TD_HOST = 'api.twelvedata.com';
const CACHE_MS = 8000;
const cache = new Map(); // key -> { ts, body, status }

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const apiKey = process.env.TD_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'TD_API_KEY não configurada no Netlify' }) };
  }

  // O front manda ?url=<url completa da Twelve Data, SEM apikey>
  const raw = event.queryStringParameters && event.queryStringParameters.url;
  if (!raw) {
    return { statusCode: 400, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'parâmetro url ausente' }) };
  }

  let target;
  try {
    target = new URL(decodeURIComponent(raw));
  } catch (e) {
    return { statusCode: 400, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'url inválida' }) };
  }

  // Trava de segurança: só Twelve Data.
  if (target.hostname !== TD_HOST) {
    return { statusCode: 403, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'host não permitido' }) };
  }

  // Injeta a chave no servidor (sobrescreve qualquer apikey que venha do cliente).
  target.searchParams.set('apikey', apiKey);

  // Cache: chave sem a apikey, pra não vazar nada.
  const cacheKey = target.pathname + '?' +
    [...target.searchParams.entries()]
      .filter(([k]) => k !== 'apikey')
      .map(([k, v]) => `${k}=${v}`).sort().join('&');

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_MS) {
    return { statusCode: hit.status, headers: { ...cors, 'X-Cache': 'HIT' }, body: hit.body };
  }

  try {
    const res = await fetch(target.toString());
    const body = await res.text();
    cache.set(cacheKey, { ts: Date.now(), body, status: res.status });
    return { statusCode: res.status, headers: { ...cors, 'X-Cache': 'MISS' }, body };
  } catch (e) {
    return { statusCode: 502, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'falha ao contatar Twelve Data' }) };
  }
};
