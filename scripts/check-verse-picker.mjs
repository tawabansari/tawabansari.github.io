import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {findChapter, verseTarget} from '../assets/js/verse-picker.mjs';
const context = {window:{}};
vm.runInNewContext(readFileSync('assets/js/quran-navigation-data.js','utf8'),context);
for(const lang of ['en','fa']) {
 const html=readFileSync(`_site/quran-reflection/${lang}/surahs/index.html`,'utf8');
 const available=JSON.parse(html.match(/window.FORQAN_READING_AVAILABILITY=(.*?);<\/script>/)[1])[lang];
 const chapters=context.window.FORQAN_QURAN_NAV.filter(s=>available[s.slug]?.length);
 for(const q of ['2','۲','٢','Al-Baqarah','البقره','۲. البقره']) assert.equal(findChapter(chapters,q)?.number,2);
 assert.equal(findChapter(chapters,'999'),undefined);
 const chapter=findChapter(chapters,'2');
 for(const verse of ['1','۱','١']) assert.equal(verseTarget(chapter,verse,available,lang),`/quran-reflection/${lang}/${chapter.slug}/#ayah-001`);
 for(const verse of ['0','999','-1','1.2','abc']) assert.equal(verseTarget(chapter,verse,available,lang),null);
 for(const s of chapters){
  const page=readFileSync(`_site/quran-reflection/${lang}/${s.slug}/index.html`,'utf8');
  assert.ok(page.includes('src="/assets/js/verse-picker.mjs"'));
  for(const anchor of available[s.slug]) assert.ok(page.includes(`id="${anchor}"`));
 }
 console.log(`${lang}: chapter selection, digit variants, invalid verses and every available anchor passed.`);
}
