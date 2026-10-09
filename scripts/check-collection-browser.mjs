import assert from 'node:assert/strict';
import {browse,initial,availableLetters} from '../assets/js/collection-browser.mjs';
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
const formats=[{title:'Salat',search:'Salat prayer',format:'book'},{title:'Prayer',search:'Prayer and faith',format:'essay'},{title:'Faith',search:'Faith',format:'study'}];
assert.deepEqual(browse(formats,{format:'book',query:'prayer'}).visible,[formats[0]]);
assert.equal(browse(formats,{format:'essay',query:'Salat'}).total,0);
assert.equal(browse(formats,{format:'all'}).total,3);
const directory=Array.from({length:105},(_,i)=>({title:`${i<60?'Alpha':'Beta'} ${i}`,search:`Study ${i} prayer`,format:i%2?'book':'essay'}));
assert.deepEqual(availableLetters(directory),['a','b']);
assert.equal(browse(directory,{letter:'B'}).total,45);
assert.equal(browse(directory,{letter:'B',query:'prayer',format:'book'}).total,22);
assert.equal(browse(directory,{letter:'B',query:'absent'}).total,0);
assert.equal(browse(directory,{letter:''}).total,105);
assert.deepEqual(browse(directory,{letter:'B'}).visible,directory.slice(60),'Letter filtering preserves editorial order');
const persian=[
  {title:'«آیات»',initial:'«',search:'آیات قرآن'},
  {title:'إِیمان',search:'ایمان'},
  {title:'كِتاب',search:'کتاب'},
  {title:'یقین',search:'یقین'},
  {title:'يُوسف',search:'یوسف'}
];
assert.deepEqual(availableLetters(persian,'fa'),['ا','ک','ی']);
assert.deepEqual(browse(persian,{letter:'آ'}).visible,persian.slice(0,2));
assert.equal(browse(persian,{letter:'ک'}).visible[0],persian[2]);
assert.equal(browse(persian,{letter:'ي'}).total,2);
assert.deepEqual(availableLetters(persian,'fa'),['ا','ک','ی'],'Filtering never removes choices from the directory');
assert.equal(initial(null),'');
assert.equal(browse(persian,{letter:'ا',query:'قرآن'}).total,1);
console.log('Passed 105-title browsing, letter/text/type combinations, Persian/Arabic initials, title punctuation, and preserved reading order.');
