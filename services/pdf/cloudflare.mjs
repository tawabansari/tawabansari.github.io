import {launch} from '@cloudflare/playwright';
import stylesheet from './document.css';
import {selectDocument, renderPDF} from './render.mjs';

// Credentials stay in the browser binding. Only our published catalog can be exported.
export function createHandler({launchBrowser = launch, render = renderPDF, fetcher = fetch} = {}) {
  return async function handle(request, env) {
    const origin = env.SITE_ORIGIN || 'https://forqan.co';
    const headers = {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', Vary:'Origin',
      'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Expose-Headers':'Content-Disposition, Retry-After, X-PDF-Reason'};
    const reply = (body, status, extra = {}) => new Response(body, {status,headers:{...headers,...extra}});
    if (new URL(request.url).pathname !== '/api/pdf') return reply('Not found',404);
    if (request.headers.get('Origin') !== origin) return reply('Origin not allowed',403);
    if (request.method === 'OPTIONS') return reply(null,204);
    if (request.method !== 'POST') return reply('Method not allowed',405,{Allow:'POST, OPTIONS'});
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply('JSON required',415);
    if (Number(request.headers.get('Content-Length')) > 2048) return reply('Request too large',413);
    let input;
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply('Invalid request',400);
      let size = 0, body = '';
      const decoder = new TextDecoder();
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2048) { await reader.cancel(); return reply('Request too large',413); }
        body += decoder.decode(value,{stream:true});
      }
      input = JSON.parse(body + decoder.decode());
    } catch { return reply('Invalid request',400); }
    let browser;
    try {
      const response = await fetcher(`${origin}/assets/data/pdf-catalog.json`,{redirect:'error'});
      if (!response.ok) throw Error('Catalog unavailable');
      let selection;
      try { selection = selectDocument(input,(await response.json()).pages); }
      catch { return reply('Select a published study or verse',400); }
      browser = await launchBrowser(env.BROWSER);
      const result = await render(browser,selection,{siteOrigin:origin,publicOrigin:origin,stylesheet,fetchSource:fetcher});
      return reply(result.bytes,200,{'Content-Type':'application/pdf',
        'Content-Disposition':`attachment; filename="${result.filename}"`});
    } catch (error) {
      const message = String(error?.message || error);
      const daily = /time limit exceeded|daily|for today/i.test(message);
      const limited = daily || error?.status === 429 || /429|too many|rate limit|concurrent/i.test(message);
      const retry = daily ? Math.ceil((new Date().setUTCHours(24,0,0,0)-Date.now())/1000) : 30;
      return reply('PDF service temporarily unavailable',limited ? 429 : 503,
        {'Retry-After':String(retry),'X-PDF-Reason':daily ? 'daily-limit' : limited ? 'busy' : 'unavailable'});
    } finally { await browser?.close().catch(() => {}); }
  };
}
export default {fetch:createHandler()};
