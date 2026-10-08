import {browserDocument} from './browser-model.mjs';
import {selectDocument,pdfFilename} from '../../assets/js/pdf-catalog.mjs';
import {documentChunks} from './browser-chunks.mjs';

export async function localPDF(input,{signal} = {}) {
  signal?.throwIfAborted();
  const catalog = await fetch('/assets/data/pdf-catalog.json',{signal});
  if (!catalog.ok) throw Error('Catalog unavailable');
  const selection = selectDocument(input,(await catalog.json()).pages);
  const response = await fetch(selection.url,{signal,redirect:'error'});
  if (!response.ok) throw Error('Content unavailable');
  const html = await response.text();
  signal?.throwIfAborted();
  const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const sourceURL = new URL(selection.url,canonical);
  if (selection.ids?.length === 1) sourceURL.hash = selection.ids[0];
  const model = browserDocument(selection,html,sourceURL.href);
  // Fresh sequential workers bound layout memory, including very long chapters.
  const run = data => new Promise((resolve,reject)=>{
    const worker = new Worker(new URL('./pdf-browser.worker.mjs',import.meta.url),{type:'module'});
    const cleanup = ()=>{ worker.terminate(); signal?.removeEventListener('abort',abort); };
    const abort = ()=>{cleanup();reject(signal.reason || new DOMException('Aborted','AbortError'));};
    signal?.addEventListener('abort',abort,{once:true});
    if (signal?.aborted) { abort(); return; }
    worker.onerror = ()=>{cleanup();reject(Error('PDF worker unavailable'));};
    worker.onmessage = ({data})=>{cleanup();data.blob?resolve(data.blob):reject(Error(data.error || 'PDF generation failed'));};
    worker.postMessage(data);
  });
  const parts = [];
  for (const chunk of documentChunks(model)) {
    signal?.throwIfAborted();
    parts.push(await run({model:chunk,origin:location.origin}));
  }
  const blob = await run({model:{title:model.title,lang:model.lang},blobs:parts});
  return {blob,filename:pdfFilename(selection)};
}
