import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir = await mkdtemp(path.join(os.tmpdir(),'forqan-worker-check-'));
try {
  await build({entryPoints:['services/pdf/cloudflare.mjs'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'handler.mjs'),loader:{'.css':'text'},plugins:[{
    name:'test-launch',setup(build) {
      build.onResolve({filter:/^@cloudflare\/playwright$/},()=>({path:'launch',namespace:'test'}));
      build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const launch = () => { throw Error("No live browser in unit test"); };',loader:'js'}));
    }
  }]});
  const {createHandler} = await import(path.join(dir,'handler.mjs'));
  const origin='https://forqan.co',url='https://pdf.example/api/pdf';
  const pages=[{url:'/en/articles/example/',title:'Example',kind:'Articles',lang:'en'}];
  const input={path:pages[0].url};
  const request=(data=input,headers={},method='POST')=>new Request(url,{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(data)}:{})});
  const catalog=async(url,options)=>{assert.equal(options.redirect,'manual');return Response.json({pages});};
  let closed=0,rendered=0;
  const handler=createHandler({fetcher:catalog,launchBrowser:async()=>({close:async()=>closed++}),render:async(browser,selection)=>{rendered++;assert.equal(selection.url,pages[0].url);return {bytes:new TextEncoder().encode('%PDF-test'),filename:'forqan-en-example.pdf'};}});
  let response=await handler(request(),{SITE_ORIGIN:origin});
  assert.equal(response.status,200); assert.equal(await response.text(),'%PDF-test');assert.equal(closed,1);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await handler(request(input,{Origin:'https://bad.example'}),{})).status,403);
  assert.equal((await handler(request({}, {},'OPTIONS'),{})).status,204);
  assert.equal((await handler(request({path:'https://bad.example'}),{})).status,400);
  assert.equal((await handler(request({path:'x'.repeat(3000)}),{})).status,413);
  assert.equal(rendered,1);
  const redirected=createHandler({fetcher:async()=>new Response(null,{status:302,headers:{Location:'https://bad.example'}}),launchBrowser:async()=>{throw Error('Must not follow a redirected catalog');}});
  assert.equal((await redirected(request(),{})).status,503);
  for (const [message,status,reason] of [['Browser time limit exceeded',429,'daily-limit'],['429 too many sessions',429,'busy'],['Connection failed',503,'unavailable']]) {
    const failing=createHandler({fetcher:catalog,launchBrowser:async()=>{throw Error(message);}});
    response=await failing(request(),{});
    assert.equal(response.status,status);assert.equal(response.headers.get('X-PDF-Reason'),reason);
    assert.ok(Number(response.headers.get('Retry-After'))>0);
  }
  const renderFailure=createHandler({fetcher:catalog,launchBrowser:async()=>({close:async()=>closed++}),render:async()=>{throw Error('Render failed');}});
  assert.equal((await renderFailure(request(),{})).status,503);assert.equal(closed,2);
  console.log('Passed Cloudflare handler: allowed origins, catalog restrictions, body bounds, success, quota/busy failures, and browser cleanup.');
} finally { await rm(dir,{recursive:true,force:true}); }
