import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studyURL} from '../assets/js/reading-panel.mjs';
const base='https://forqan.co/quran-reflection/en/002-al-baqarah/';
for(const path of ['/quran-terminology/en/roots/a-m-n/','/fa/articles/quranic-marriage/','/en/salat/','/fa/quran-terminology/iman/'])assert.equal(studyURL(path,base)?.pathname,path);
for(const path of ['https://other.example/en/articles/a/','javascript:alert(1)','/search/','/quran-reflection/en/002-al-baqarah/','/quran-terminology/fa/roots/'])assert.equal(studyURL(path,base),null);
const clean=studyURL('/en/articles/example/?reading-panel=1&highlight=prayer#part',base);
assert.equal(clean.searchParams.has('reading-panel'),false);assert.equal(clean.searchParams.get('highlight'),'prayer');assert.equal(clean.hash,'#part');
for(const lang of ['en','fa']){
 const html=readFileSync(`_site/quran-reflection/${lang}/002-al-baqarah/index.html`,'utf8');
 assert.ok(html.includes('/assets/js/reading-panel.mjs'));assert.ok(html.includes('/assets/css/reading-panel.css'));
}
console.log('Passed reading panel route eligibility, external-link exclusion, clean study links, and bilingual generated integration.');
