const TD_HOST = 'api.twelvedata.com';
const CACHE_MS = 8000;
const cache = new Map();

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
      body: JSON.stringify({ status: 'error', message: 'TD_API_KEY nao configurada no Netlify' }) };
  }

  const raw = event.queryStringParameters && event.queryStringParameters.url;
  if (!raw) {
    return { statusCode: 400, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'parametro url ausente' }) };
  }

  let target;
  try {
    target = new URL(decodeURIComponent(raw));
  } catch (e) {
    return { statusCode: 400, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'url invalida' }) };
  }

  if (target.hostname !== TD_HOST) {
    return { statusCode: 403, headers: cors,
      body: JSON.stringify({ status: 'error', message: 'host nao permitido' }) };
  }

  target.searchParams.set('apikey', apiKey);

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
