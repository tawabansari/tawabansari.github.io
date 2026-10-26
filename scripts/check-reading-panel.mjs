import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studyURL,isReadingReference,isSamePageVerseReference} from '../assets/js/reading-panel.mjs';
const base='https://forqan.co/quran-reflection/en/002-al-baqarah/';
for(const path of ['/quran-terminology/en/roots/a-m-n/','/fa/articles/quranic-marriage/','/en/salat/','/fa/quran-terminology/iman/','/quran-reflection/en/002-al-baqarah/'])assert.equal(studyURL(path,base)?.pathname,path);
for(const path of ['https://other.example/en/articles/a/','javascript:alert(1)','/assets/book.pdf','/assets/data.json','mailto:hello@example.org','tel:123','/search/','/quran-terminology/fa/roots/','/en/','/about.html','/en/articles/','/en/quran-terminology/','/quran-reflection/en/surahs/'])assert.equal(studyURL(path,base),null);
// A reading destination alone must never capture global navigation or directory cards.
const reference={href:'/quran-reflection/en/004-an-nisa/#ayah-006',closest:selector=>selector==='#main-content,.root-popover'?{}:null};
assert.equal(isReadingReference(reference,'https://forqan.co/en/articles/quranic-marriage/'),true);
assert.equal(isReadingReference(reference,'https://forqan.co/en/articles/'),false);
assert.equal(isReadingReference({...reference,closest:()=>null},base),false);
assert.equal(isReadingReference({...reference,closest:()=>({})},base),false);
// Introduction and standalone verse references are added only on desktop.
const verseReference={...reference,href:'/quran-reflection/fa/002-al-baqarah/285/'};
for(const source of ['/fa/introduction/','/quran-reflection/fa/002-al-baqarah/062/','/fa/articles/quranic-marriage/','/quran-terminology/fa/roots/a-m-n/']){
 const sourceURL=new URL(source,base).href;
 assert.equal(isReadingReference(verseReference,sourceURL,true),true);
 assert.equal(isReadingReference(verseReference,sourceURL,false),false);
 assert.equal(isReadingReference({...verseReference,closest:()=>({})},sourceURL,true),false);
}
assert.equal(isReadingReference(reference,new URL('/fa/introduction/',base).href,true),true);
assert.equal(isReadingReference(reference,new URL('/fa/introduction/',base).href,false),false);
assert.equal(isReadingReference(reference,new URL('/quran-reflection/fa/002-al-baqarah/062/',base).href,true),true);
assert.equal(isReadingReference(reference,new URL('/quran-reflection/fa/002-al-baqarah/062/',base).href,false),false);
const clean=studyURL('/en/articles/example/?reading-panel=1&highlight=prayer#part',base);
assert.equal(clean.searchParams.has('reading-panel'),false);assert.equal(clean.searchParams.get('highlight'),'prayer');assert.equal(clean.hash,'#part');
for(const lang of ['en','fa']){
 const html=readFileSync(`_site/quran-reflection/${lang}/002-al-baqarah/index.html`,'utf8');
 assert.ok(html.includes('/assets/js/reading-panel.mjs'));assert.ok(html.includes('/assets/css/reading-panel.css'));
}
console.log('Passed reading panel route eligibility, external-link exclusion, clean study links, and bilingual generated integration.');

// Regression: citations from 2:185 to 2:184 preview on desktop in both languages.
for (const lang of ['fa','en']) {
 const source = `https://forqan.co/quran-reflection/${lang}/002-al-baqarah/#ayah-185`;
 const citation = {href:`/quran-reflection/${lang}/002-al-baqarah/#ayah-184`, closest:selector => ['#main-content,.root-popover','.details-content'].includes(selector) ? {} : null};
 assert.equal(isSamePageVerseReference(citation,source,true),true);
 assert.equal(isSamePageVerseReference(citation,source,false),false);
 assert.equal(isSamePageVerseReference({...citation,closest:selector=>selector==='#main-content,.root-popover'?{}:null},source,true),false);
 assert.equal(isSamePageVerseReference({...citation,closest:()=>({})},source,true),false);
 assert.equal(isSamePageVerseReference({...citation,href:'#contents'},source,true),false);
}
console.log('Passed same-surah citations, mobile preservation, and navigation exclusions.');
