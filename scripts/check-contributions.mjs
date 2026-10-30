import assert from 'node:assert/strict';
import {searchContributions} from '../assets/js/contributions.mjs';
const rows = [
  {lang:'fa',title:'پژوهش نخست',author:'علی',topic:'همزیستی',date:'2025-01-01',text:'شناخت و گفت‌وگو'},
  {lang:'fa',title:'پژوهش دوم',author:'مریم',topic:'آموزش',date:'2026-01-01',text:'نوشتن و یادگیری'},
  {lang:'en',title:'Research',author:'Ali',topic:'Coexistence',date:'2026-02-01',text:'A unique phrase within the full article'}
];
assert.equal(searchContributions(rows,{lang:'fa'})[0].author,'مریم');
assert.equal(searchContributions(rows,{lang:'fa',query:'علي'})[0].author,'علی');
assert.equal(searchContributions(rows,{lang:'fa',query:'یادگیری'})[0].author,'مریم');
assert.equal(searchContributions(rows,{lang:'en',query:'unique phrase'}).length,1);
assert.equal(searchContributions(rows,{lang:'fa',query:'unique phrase'}).length,0);
assert.equal(searchContributions(rows,{lang:'en',query:'coexistence'}).length,1);
assert.equal(searchContributions(rows,{lang:'en',query:'missing'}).length,0);
assert.equal(searchContributions(rows,{lang:'fa',sort:'author'})[0].author,'علی');
assert.equal(searchContributions([], {lang:'fa'}).length,0);
console.log('Passed independent submission search: full text, author, subject, normalization, ordering, and language isolation.');
