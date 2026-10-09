import assert from 'node:assert/strict';
import {browse,initial} from '../assets/js/collection-browser.mjs';
const rows=Array.from({length:105},(_,i)=>({title:`Study ${i}`,search:`Study ${i} ${i===104?'Salat prayer صلوة':''}`,initial:i<60?'A':'B'}));
assert.equal(browse(rows).visible.length,105);
assert.equal(browse(rows,{query:'prayer'}).visible[0],rows[104]);
assert.equal(browse(rows,{query:'Study prayer'}).total,1);
assert.equal(browse(rows,{query:'not found'}).total,0);
assert.equal(browse([{search:'ایمان کافر',initial:'آ'}],{query:'ايمان كافر'}).total,1);
assert.equal(initial('آ'),'ا');
const dated=[
  {title:'Zebra',search:'Zebra',date:''},
  {title:'Beta',search:'Beta',date:'2026-06-05'},
  {title:'Alpha',search:'Alpha',date:'2026-10-01'},
  {title:'Gamma',search:'Gamma',date:''}
];
assert.deepEqual(browse(dated,{sort:'newest'}).visible.map(r=>r.title),['Alpha','Beta','Gamma','Zebra']);
assert.deepEqual(browse(dated,{sort:'alphabetical'}).visible.map(r=>r.title),['Alpha','Beta','Gamma','Zebra']);
assert.deepEqual(browse(dated).visible,dated,'Suggested editorial order is preserved');
assert.equal(dated[0].title,'Zebra','Sorting must not change the original reading order');
assert.deepEqual(browse([{title:'زکات',search:'زکات'},{title:'ایمان',search:'ایمان'},{title:'آیه',search:'آیه'}],{sort:'alphabetical',lang:'fa'}).visible.map(r=>r.title),['ایمان','آیه','زکات']);
assert.equal(browse(rows,{sort:'alphabetical'}).visible.at(-1),rows[104]);
console.log('Passed all 105 titles, whole-directory search, Persian/Arabic normalization, natural alphabetical order, newest/undated order, and unchanged editorial order.');
