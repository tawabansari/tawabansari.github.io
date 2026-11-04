import assert from 'node:assert/strict';
import {studyURL,isReadingReference} from '../assets/js/reading-panel.mjs';
import {rankResults} from '../assets/js/search-ranking.mjs';
const base='https://forqan.co/fa/principles/';
const target='/fa/principles/truthfulness/';
const link={href:target,closest:s=>s==='#main-content,.root-popover'?{}:null};
for(const desktop of [true,false]){
 assert.ok(studyURL(target,base,desktop));
 assert.equal(isReadingReference(link,base,desktop),true);
 assert.equal(isReadingReference({...link,closest:()=>({})},base,desktop),false);
 assert.equal(isReadingReference({...link,href:'/quran-reflection/fa/009-at-tawbah/#ayah-119'},new URL(target,base).href,desktop),true);
}
const records=[{id:'verse',kind:'Quran',title:'Verse',url:'/v'}, {id:'title',kind:'Principles',title:'Truth',aliases:['truth'],url:'/p/t'}, {id:'alias',kind:'Principles',title:'Honesty',aliases:['truth'],url:'/p/a'}, {id:'body',kind:'Principles',title:'Another',aliases:[],url:'/p/b'}, {id:'article',kind:'Articles',title:'Truth',url:'/a'}];
const catalog={records,rootWords:{},rootForms:[]};
assert.deepEqual(rankResults(records.map(r=>({id:r.id,words:[1],score:10})),catalog,'truth').map(r=>r.id),['verse','title','alias','body','article']);
assert.deepEqual(rankResults([],catalog,'truth','Principles').map(r=>r.id),['title','alias']);
console.log('Passed desktop/mobile principle reference scope and Quran-first, title-before-alias ranking.');
