import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {normalize,selectPassage} from '../assets/js/search-utils.mjs';
import {rankResults,parseReference,referenceResults} from '../assets/js/search-ranking.mjs';

const site = path.resolve(process.argv[2] || '_site'), lang = process.argv[3];
if (!lang) {
  // Pagefind's WASM state is language-specific. Exercise each language in an
  // independent runtime, like the real language switch in the browser.
  for (const language of ['en','fa']) {
    const run = spawnSync(process.execPath,[import.meta.filename,site,language],{stdio:'inherit'});
    assert.equal(run.status,0,language+' search regressions');
  }
} else {
  const read = async file => JSON.parse(await fs.readFile(path.join(site,file),'utf8'));
  const version = await read('assets/data/search-version.json');
  const catalog = await read(version.catalogs[lang]);
  globalThis.document = {currentScript:null,querySelector:()=>({getAttribute:()=>lang})};
  globalThis.fetch = async input => {
    const url = new URL(String(input),'http://localhost');
    return new Response(await fs.readFile(path.join(site,decodeURIComponent(url.pathname))));
  };
  const engine = await import(pathToFileURL(path.join(site,'pagefind/pagefind.js')));
  await engine.options({basePath:'http://localhost/pagefind/',baseUrl:'/',noWorker:true});
  const search = async (query,section='') => {
    const found = await engine.search(normalize(query));
    const hits = found.results.map(({id,score,words})=>({id,score,words}));
    assert(hits.every(hit=>catalog.records.some(r=>r.id===hit.id)),'Every result maps to lightweight catalog metadata');
    return {found,ranked:rankResults(hits,catalog,query,section)};
  };
  for (const query of ['naskh','abrogation','abrogated',...(lang==='fa'?['نسخ','منسوخ']:[])]) {
    const {ranked} = await search(query);
    const verse = ranked.find(r=>r.kind==='Quran' && r.chapter===2 && r.verseNumber===106);
    assert(verse,query+' finds 2:106');
    assert.equal(verse.bucket,'Quran');
    if (['naskh','abrogation','abrogated'].includes(query)) assert(['concept','root'].includes(verse.reason),'Indirect Quran matches explain their source');
    const study = ranked.findIndex(r=>r.url===`/${lang}/quran-terminology/naskh-in-the-quran/`);
    assert(study>=0,query+' finds the dedicated study');
    assert(ranked.slice(0,study).every(r=>['Quran','MatchedRoots'].includes(r.bucket)),query+' puts dedicated study before incidental mentions');
    console.log(lang,query,ranked.slice(0,5).map(r=>r.kind+': '+r.title).join(' | '));
  }
  for (const [query,slug] of [['salah','salat-in-the-quran'],['zakah','zakat-and-its-historical-distortion']]) {
    const {ranked} = await search(query);
    assert(ranked.some(r=>r.url===`/${lang}/articles/${slug}/`),'Alias retrieves '+slug);
    assert(ranked.some(r=>r.bucket==='MatchedRoots'),'Recognized word variant promotes the matching root');
    const studies = (await search(query,'Studies')).ranked;
    assert(studies.some(r=>r.url===`/${lang}/articles/${slug}/`),'Inclusive study filter');
    assert(studies.every(r=>['Articles','Terminology'].includes(r.kind)));
  }
  for (const query of ['shaytan','shaitan']) {
    const {ranked}=await search(query);
    assert(ranked.some(r=>r.url===`/${lang}/quran-terminology/satan-and-taghut/`),query+' finds the concept study');
    assert(ranked.some(r=>r.root==='sh-tt-n'&&r.bucket==='MatchedRoots'),query+' recognizes the transliteration');
  }
  for (const record of catalog.records) for (const alias of record.aliases) {
    assert(rankResults([],catalog,alias).some(r=>r.id===record.id),'Published catalog alias must retrieve its target: '+alias);
  }
  assert((await search('iman')).ranked.some(r=>r.root==='a-m-n'&&r.bucket==='MatchedRoots'));
  for (const query of ['nansakh','ننسخ','N S KH']) {
    const {ranked} = await search(query);
    assert(ranked.some(r=>r.bucket==='MatchedRoots' && r.root==='n-s-kh'),'Exact root / derivative priority');
    assert(ranked.filter(r=>r.bucket==='MatchedRoots').every(r=>r.root==='n-s-kh'),'Incidental roots do not get priority');
    assert(ranked.some(r=>r.kind==='Quran' && r.verseNumber===106));
  }
  const direct = await search(lang==='en'?'supersede':'ایمان');
  assert.equal(direct.ranked[0].kind,'Quran');
  assert.equal(direct.ranked[0].reason,'');
  assert.equal(rankResults([{id:catalog.records[0].id,score:100,words:[]}],catalog,'an-unmatched-query').length,0,'Metadata-only hits cannot masquerade as content matches');
  assert((await search('naskh','Articles')).ranked.some(r=>r.url.endsWith('/naskh-in-the-quran/')),'Legacy article filter includes concepts');
  const quoted = await engine.search('"abrogation"');
  assert(!rankResults(quoted.results,catalog,'"abrogation"').some(r=>r.kind==='Quran'&&r.verseNumber===106),'Quoted search does not expand aliases');
  for (const query of ['2:106','۲:۱۰۶','2/106','Baqarah 106','البقره ۱۰۶']) {
    const ref = parseReference(query,catalog.surahs);
    assert(ref?.valid,query+' parses');
    assert.equal(referenceResults(ref,catalog)[0]?.verseNumber,106);
  }
  assert.equal(referenceResults(parseReference('2:104–106',catalog.surahs),catalog).length,3);
  assert.equal(parseReference('2:287',catalog.surahs).valid,false);
  assert.equal(referenceResults(parseReference('3:1',catalog.surahs),catalog).length,0);
  // Stem matches must select a real matching paragraph, not a generic description.
  if (lang==='en') {
    const result = await search('abrogated');
    let checked=0;
    for (const hit of result.found.results) {
      const data=await hit.data(),passages=JSON.parse(data.meta.passages||'[]');
      const located=passages.filter(p=>hit.words.some(n=>n>=p.start&&n<p.end));
      if (!located.length) continue;
      const chosen=selectPassage(passages,'abrogated',data.meta.description,data.meta.original,hit.words);
      assert(located.includes(chosen),'Excerpt follows actual engine match positions');checked++;
    }
    assert(checked>3,'Exercised several real matching passages');
  }
  await engine.destroy();
  console.log('Passed '+lang+' concept aliases, verse/root priority, relevance, filters, references and excerpts.');
}
