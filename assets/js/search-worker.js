import {guardedFetch} from './search-fetch.mjs';

let engine, guard, all, chain = Promise.resolve();
const found = new Map();
async function execute({method, args}) {
  if (method === 'init') {
    const {lang, entry} = args;
    // Pagefind's public browser API detects language from the document. This
    // minimal adapter provides that value inside our isolated module worker.
    globalThis.document = {currentScript:null,querySelector:()=>({getAttribute:()=>lang})};
    guard = guardedFetch(globalThis.fetch.bind(globalThis), entry, self.location.href);
    globalThis.fetch = guard.fetch;
    engine = await import('/pagefind/pagefind.js');
    await engine.options({basePath:'/pagefind/',baseUrl:'/',noWorker:true,excerptLength:40});
    return true;
  }
  guard.assertHealthy();
  if (method === 'search') {
    const result = await engine.search(args.query, args.options || {});
    guard.assertHealthy();
    for (const item of result.results) found.set(item.id, item);
    return result.results.map(({id,score,words})=>({id,score,words}));
  }
  if (method === 'records') {
    if (args.some(id => !found.has(id))) {
      all ||= engine.search(null).then(r => new Map(r.results.map(item=>[item.id,item])));
      const records = await all;
      guard.assertHealthy();
      for (const id of args) if (!found.has(id) && records.has(id)) found.set(id,records.get(id));
    }
    const records = await Promise.all(args.map(async id => {
      const hit = found.get(id);
      if (!hit) throw Error('Search record is missing from this version');
      const record = await hit.data();
      return {id,meta:record.meta,content:record.content};
    }));
    guard.assertHealthy();
    return records;
  }
  throw Error('Unknown search request');
}
self.onmessage = ({data}) => {
  // Serialize queries: an index failure belongs to this worker/version, and
  // cached result functions must not race across languages or generations.
  chain = chain.then(async()=>{
    try {self.postMessage({id:data.id,value:await execute(data)});}
    catch(error) {self.postMessage({id:data.id,error:error.message});}
  });
};
