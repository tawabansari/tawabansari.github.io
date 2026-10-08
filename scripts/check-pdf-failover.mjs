import assert from 'node:assert/strict';
import {createPDFClient} from '../assets/js/pdf-request.mjs';
const input = {path:'/quran-reflection/fa/002-al-baqarah/',verse:'ayah-106'};
const result = {blob:new Blob(['%PDF-test']),filename:'forqan-fa.pdf'};
const endpoint = 'https://pdf.example/api/pdf';
let remote = 0, fallback = 0, time = 100000;
const values = new Map(), storage = {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
const client = createPDFClient({now:()=>time,storage,
  fetcher:async()=>{remote++;return new Response('Quota exceeded',{status:429,headers:{'Retry-After':'3600'}});},
  local:async([selection])=>{fallback++;assert.deepEqual(selection,input);return result;}});
assert.equal((await client(input,{endpoint})).filename,result.filename);
await client(input,{endpoint});
assert.equal(remote,1); assert.equal(fallback,2);
time += 3600001; await client(input,{endpoint}); assert.equal(remote,2);
const success = createPDFClient({fetcher:async()=>new Response(result.blob,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="forqan-fa.pdf"'}}),local:()=>{throw Error('Should not fall back');}});
assert.equal((await success(input,{endpoint})).filename,result.filename);
for (const status of [400,403,413,415]) {
  let tried = false;
  await assert.rejects(createPDFClient({fetcher:async()=>new Response('',{status}),local:()=>{tried=true;}})(input,{endpoint}));
  assert.equal(tried,false,'Validation failures must not bypass the service');
}
for (const fail of [async()=>{throw TypeError('Network failed');},async()=>new Response('',{status:503}),async()=>new Response('<html>bad</html>',{headers:{'Content-Type':'application/pdf'}})]) {
  assert.equal((await createPDFClient({fetcher:fail,local:async()=>result})(input,{endpoint})).filename,result.filename);
}
let cancelledFallback = false;
const cancel = new AbortController();
const interrupted = createPDFClient({fetcher:async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason))),local:()=>{cancelledFallback=true;}})(input,{endpoint,signal:cancel.signal});
cancel.abort(); await assert.rejects(interrupted); assert.equal(cancelledFallback,false);
const timeout = createPDFClient({remoteTimeout:5,fetcher:async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason))),local:async()=>result});
assert.equal((await timeout(input,{endpoint})).filename,result.filename);
await assert.rejects(createPDFClient({local:async()=>({blob:new Blob(['bad'])})})(input,{}),/Invalid PDF/);
console.log('Passed PDF failover: quota cooldown/reset, transient errors, validation errors, successful primary, timeout, cancellation, and PDF validation.');
