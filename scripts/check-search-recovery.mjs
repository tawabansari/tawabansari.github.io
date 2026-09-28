import assert from 'node:assert/strict';
import {SearchClient} from '../assets/js/search-client.mjs';
import {guardedFetch} from '../assets/js/search-fetch.mjs';

const failed=guardedFetch(async()=>new Response('',{status:404}),{},'http://localhost');
await assert.rejects(failed.fetch('http://localhost/pagefind/index/old.pf_index'));
assert.throws(()=>failed.assertHealthy(),/404/,'Failure remains visible even if Pagefind swallows the exception');
const fresh=guardedFetch(async()=>new Response('ok'),{version:'new'},'http://localhost');
assert.equal((await (await fresh.fetch('http://localhost/pagefind/pagefind-entry.json')).json()).version,'new');
fresh.assertHealthy();

let version='one', failures=0, persistent=false, constructions=0, terminated=0;
const inits=[];
const client=new SearchClient('en',{
  fetcher:async url=>new Response(JSON.stringify(url.startsWith('/assets/data/search-version')
    ? {version,catalogs:{en:'/catalog/'+version}} : {version,entry:{version},records:[]})),
  workerFactory:()=>{
    constructions++;
    return {
      terminate(){terminated++;},
      postMessage(message){queueMicrotask(()=>{
        if(message.method==='init')inits.push(message.args.entry.version);
        this.onmessage({data:message.method==='search'&&(persistent||failures-- > 0)
          ? {id:message.id,error:'Missing index chunk'}
          : {id:message.id,value:message.method==='search'?[{id:'result-'+version}]:true}});
      });}
    };
  }
});
assert.equal((await client.search('naskh'))[0].id,'result-one');
version='two';
assert.equal((await client.search('zakah'))[0].id,'result-two');
assert.deepEqual(inits,['one','two'],'Open tab recreates engine for deployment change');
assert.equal(terminated,1);
failures=1;
assert.equal((await client.search('naskh'))[0].id,'result-two','Transient chunk failure retries with a fresh worker');
assert.equal(constructions,3);
persistent=true;
await assert.rejects(client.search('naskh'),/Missing index chunk/,'Persistent failure never returns an empty successful result');
assert.equal(constructions,4,'Recovery is bounded rather than an infinite retry loop');
client.reset();
console.log('Passed coherent deployment refresh, swallowed chunk detection, fresh-worker retry and persistent failure reporting.');
