import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {selectDocument, renderPDF} from './render.mjs';

const preview = process.argv.includes('--preview');
const port = Number(process.env.PORT || 4003);
const siteOrigin = new URL(preview ? `http://127.0.0.1:${port}` : (process.env.SITE_ORIGIN || 'https://forqan.co')).origin;
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN || 'https://forqan.co').origin;
const allowedOrigin = preview ? siteOrigin : new URL(process.env.ALLOWED_ORIGIN || siteOrigin).origin;
const siteDirectory = path.resolve(fileURLToPath(new URL('../../_site/', import.meta.url)));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm'};
let browser, launching, active = 0;
async function getBrowser() {
  if (browser?.isConnected()) return browser;
  if (!launching) launching = chromium.launch({headless:true, chromiumSandbox:true,
    ...(process.env.PDF_BROWSER_PATH ? {executablePath:process.env.PDF_BROWSER_PATH} : {})
  }).then(value => browser = value).finally(() => { launching = null; });
  return launching;
}
async function catalog() {
  // Fresh content/availability on every request; no PDF snapshots or stale copies.
  if (preview) return JSON.parse(await readFile(path.join(siteDirectory,'assets/data/library.json'),'utf8')).pages;
  const response = await fetch(`${siteOrigin}/assets/data/library.json`, {redirect:'error',signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw Error('Catalog unavailable');
  return (await response.json()).pages;
}
async function serveStatic(req, res, pathname) {
  let relative;
  try { relative = decodeURIComponent(pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(siteDirectory, '.'+relative, relative.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(siteDirectory + path.sep) || relative.includes('\0')) { res.writeHead(403).end(); return; }
  try {
    let bytes = await readFile(file);
    if (file.endsWith('.html')) bytes = Buffer.from(bytes.toString().replace(/<meta name="forqan-pdf-endpoint" content="[^"]*">/, '<meta name="forqan-pdf-endpoint" content="/api/pdf">'));
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end('Not found'); }
}
const server = http.createServer(async (req,res) => {
  const pathname = new URL(req.url, siteOrigin).pathname;
  if (pathname !== '/api/pdf') {
    if (preview && ['GET','HEAD'].includes(req.method)) return serveStatic(req,res,pathname);
    res.writeHead(404).end('Not found'); return;
  }
  res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Vary','Origin');
  if (req.headers.origin && req.headers.origin !== allowedOrigin) { res.writeHead(403).end(); return; }
  res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Expose-Headers','Content-Disposition');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405,{'Allow':'POST, OPTIONS'}).end(); return; }
  if (!req.headers['content-type']?.startsWith('application/json')) { res.writeHead(415).end(); return; }
  if (active >= 2) { res.writeHead(429,{'Retry-After':'15'}).end('Busy; retry shortly.'); return; }
  active++;
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2048) { res.writeHead(413).end(); return; }
    }
    let input;
    try { input = JSON.parse(body); } catch { res.writeHead(400).end('Invalid request'); return; }
    let selection;
    const pages = await catalog();
    try { selection = selectDocument(input,pages); } catch { res.writeHead(400).end('Select a published study or verse.'); return; }
    const result = await renderPDF(await getBrowser(), selection, {siteOrigin, publicOrigin});
    if (res.destroyed) return;
    res.writeHead(200, {'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${result.filename}"`,'Content-Length':result.bytes.length});
    res.end(result.bytes);
  } catch (error) {
    console.error('PDF generation failed:',error.message);
    if (!res.headersSent && !res.destroyed) res.writeHead(503).end('PDF unavailable. Please try again.');
  } finally { active--; }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(port,process.env.HOST || '127.0.0.1',() => console.log(`Forqan PDF ${preview ? 'preview' : 'service'}: http://127.0.0.1:${port}${preview ? '/fa/quran-terminology/naskh-in-the-quran/' : '/api/pdf'}`));
async function stop() { server.close(); await browser?.close(); process.exit(0); }
process.on('SIGINT',stop); process.on('SIGTERM',stop);
