// Exercise the real generated search index in Node, without a browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import {normalize,suggest,categoryOrder,excerpt} from '../assets/js/search-utils.mjs';
import {headerState} from '../assets/js/header-state.mjs';
const site=path.resolve(process.argv[2]||'_site');
let language='en';
globalThis.document={currentScript:null,querySelector:()=>({getAttribute:()=>language})};
globalThis.fetch=async input=>{
  const url=new URL(String(input),'http://localhost/');
  const file=path.join(site,decodeURIComponent(url.pathname));
  try {return new Response(await fs.readFile(file),{headers:{'Content-Type':file.endsWith('.json')?'application/json':'application/octet-stream'}});}catch{return new Response('',{status:404});}
};
const engine=await import(pathToFileURL(path.join(site,'pagefind/pagefind.js')));
for(const [lang,q,type] of [['en','zakat','Terminology'],['fa','زکات','Terminology'],['en','justice','Articles'],['en','trust','Roots'],['en','Moses','Quran'],['fa','ایمان','Roots'],['fa','قرآن','Articles']]){
 language=lang;
 await engine.destroy();
 await engine.options({basePath:'http://localhost/pagefind/',noWorker:true});
 const found=await engine.search(normalize(q),{filters:{type}});
 assert(found.results.length>0,`No results for ${lang} ${q} ${type}`);
 const first=await found.results[0].data();
 assert(first.url.includes('/'+lang+'/'),`Wrong language for ${q}: ${first.url}`);
 assert(first.filters.type.includes(type));
 assert(first.meta.original.length>20);
 if(type==='Quran')assert(first.url.includes('#ayah-'),'Quran results must open individual passages');
 console.log(`${lang} / ${type} / ${q}: ${found.results.length} results; ${first.url}`);
}
await engine.destroy();

language='en';
await engine.options({basePath:'http://localhost/pagefind/',noWorker:true});
const verseOnly=await engine.search('contradiction',{filters:{type:'Quran'}});
const verseRecords=await Promise.all(verseOnly.results.map(r=>r.data()));
assert(!verseRecords.some(r=>r.url.endsWith('/002-al-baqarah/#ayah-002')),'Commentary must not make 2:2 a direct verse match');
const reflections=await engine.search('contradiction',{filters:{type:'Reflection'}});
const reflectionRecords=await Promise.all(reflections.results.map(r=>r.data()));
assert(reflectionRecords.some(r=>new URL(r.url).pathname.endsWith('/002-al-baqarah/')&&new URL(r.url).hash==='#ayah-002'),'Commentary remains searchable separately');
const directVerses=JSON.parse(await fs.readFile(path.join(site,'assets/data/verses.json'),'utf8'));
const salat=directVerses.find(v=>v.lang==='en'&&v.url.endsWith('/002-al-baqarah/#ayah-003'));
assert(salat.roots.includes('sad-l-w'));
assert(salat.original.includes('Salat')&&!salat.original.includes('Jihad'));
console.log('Passed direct verse / ta’wil separation and annotated Salat root coverage.');
await engine.destroy();

language='fa';
await engine.options({basePath:'http://localhost/pagefind/',noWorker:true});
for(const [a,b] of [['ایمان','ايمان'],['کافر','كافر'],['می\u200cشود','می شود']]){
 assert.equal(normalize(a),normalize(b));
 const left=await engine.search(normalize(a)),right=await engine.search(normalize(b));
 assert(left.results.length>0,`No normalized matches for ${a}`);
 assert.deepEqual(left.results.map(r=>r.id),right.results.map(r=>r.id));
 console.log(`Equivalent search: ${a} / ${b} (${left.results.length} results)`);
}
assert.equal(normalize('۲:۱۵'),normalize('٢:١٥'));
const vocabulary=JSON.parse(await fs.readFile(path.join(site,'assets/data/vocabulary-en.json'),'utf8'));
assert.equal(suggest('justcie',vocabulary),'justice');
assert.equal(suggest('justice',vocabulary),null);
assert.equal(suggest('ktb',vocabulary),null);
assert.deepEqual(categoryOrder('faith',''),['Quran','Roots','Terminology','Articles','Reflection','Guide']);
assert.equal(categoryOrder('a m n','')[0],'Quran');
assert.deepEqual(categoryOrder('faith','Articles'),['Articles']);
const original='This is an unchanged excerpt with ایمان and عربي words.';
assert(excerpt(original,'ايمان').includes('ایمان'));
assert(!excerpt(original,'ايمان').includes('ايمان'));
let state={y:0,turn:0,direction:0,hidden:false};
state=headerState(state,250,100);assert(state.hidden);
state=headerState(state,260,100);assert(state.hidden);
state=headerState(state,256,100);assert(state.hidden,'Ignore tiny scroll reversals');
state=headerState(state,242,100);assert(!state.hidden,'Reveal while scrolling upward');
state=headerState(state,500,100,true);assert(!state.hidden,'Keep controls visible during interaction');
state=headerState(state,0,100);assert(!state.hidden);
await engine.destroy();
console.log('Passed typo suggestion, search priority, original excerpts, and directional header behavior.');
