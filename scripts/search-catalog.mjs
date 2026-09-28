import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {normalize} from '../assets/js/search-utils.mjs';

const repo = path.resolve(import.meta.dirname,'..');
async function assignedJSON(file) {
  const text = await fs.readFile(file,'utf8');
  return JSON.parse(text.slice(text.indexOf('=')+1).trim().replace(/;$/,''));
}

export function passageLocations(record) {
  const indexed = normalize((record.kind === 'Quran' ? '' : record.title+' ')+record.original);
  let cursor = record.kind === 'Quran' ? 0 : normalize(record.title).length;
  return (record.passages || []).map(p => {
    const text = normalize(p.text), start = indexed.indexOf(text,cursor);
    if (start < 0 || !text) return p;
    cursor = start+text.length;
    const position = indexed.slice(0,start).trim().split(/\s+/).filter(Boolean).length;
    return {...p,start:position,end:position+text.split(' ').length};
  });
}

export async function writeCatalog(site, records) {
  const read = async file => JSON.parse(await fs.readFile(path.join(site,file),'utf8'));
  const entry = await read('pagefind/pagefind-entry.json');
  const studies = (await read('assets/data/collections.json')).studies;
  const studyByURL = new Map(studies.map(r => [r.url,r]));
  const rootData = await assignedJSON(path.join(repo,'assets/js/root-search-data.js'));
  const surahs = await assignedJSON(path.join(repo,'assets/js/quran-navigation-data.js'));
  const extraRoots = JSON.parse(await fs.readFile(path.join(repo,'_data/search-root-aliases.json'),'utf8'));
  const rootWords = {}, rootForms = new Set();
  const availableRoots = new Set(records.filter(r=>r.kind==='Roots').map(r=>r.url.split('/').filter(Boolean).pop()));
  const conceptRoots = {};
  for (const record of records) for (const word of record.words || []) {
    if (word.root) availableRoots.add(word.root);
    if (word.root && studyByURL.has(word.concept)) {
      conceptRoots[word.concept] ||= new Set();conceptRoots[word.concept].add(word.root);
    }
  }
  const add = (root,term) => {
    const key = normalize(term);if (!key) return;
    rootWords[key] ||= [];
    if (!rootWords[key].includes(root)) rootWords[key].push(root);
  };
  for (const [root,terms] of Object.entries(rootData.entries)) {
    if (!availableRoots.has(root)) continue;
    // The old registry combines morphology and English/Persian glosses. Glosses
    // are not proof that a query is a derivative of a particular Arabic root.
    const meanings = new Set((rootData.semantic[root] || []).map(s=>normalize(s).replace(/ /g,'')));
    for (const term of terms) if (!meanings.has(normalize(term).replace(/ /g,''))) add(root,term);
    add(root,root);rootForms.add(normalize(root));
    for (const term of terms) if (/^(?:[^ ]+ ){2,3}[^ ]+$/.test(term) && term.length < 12) rootForms.add(normalize(term));
  }
  for (const [root,terms] of Object.entries(extraRoots)) {
    if (!rootData.entries[root]) throw Error('Unknown root alias destination: '+root);
    for (const term of terms) add(root,term);
  }
  for (const record of records) for (const word of record.words || []) {
    if (word.root) {add(word.root,word.text);add(word.root,word.transliteration);}
  }
  const recordByURL = new Map(records.map(r=>[r.url,r]));
  const catalogs = {en:{records:[]},fa:{records:[]}};
  // Pagefind's pinned fragment format gives us lightweight IDs for ranking;
  // only the displayed results need to download their full text on the phone.
  for (const file of await fs.readdir(path.join(site,'pagefind/fragment'))) {
    if (!file.endsWith('.pf_fragment')) continue;
    const raw = gunzipSync(await fs.readFile(path.join(site,'pagefind/fragment',file))).toString();
    if (!raw.startsWith('pagefind_dcd')) throw Error('Unexpected Pagefind fragment format');
    const fragment = JSON.parse(raw.slice('pagefind_dcd'.length));
    const record = recordByURL.get(fragment.url);
    if (!record) throw Error('Unrecognized indexed record: '+fragment.url);
    const study = studyByURL.get(record.url);
    const aliases = study ? [...new Set([study.concept || '',study.title,...study.aliases || []].map(normalize).filter(Boolean))] : [];
    const item = {id:file.replace('.pf_fragment',''),url:record.url,title:record.title,kind:record.kind,aliases};
    if (study) item.annotatedRoots = [...conceptRoots[record.url] || []];
    if (record.kind === 'Roots') item.root = record.url.split('/').filter(Boolean).pop();
    if (record.kind === 'Quran') {
      item.roots = record.roots;
      item.concepts = [...new Set(record.words.map(w=>w.concept).filter(url=>studyByURL.has(url)))];
      item.chapter = Number(record.url.match(/\/(\d{3})-/)?.[1]);
      item.verseNumber = Number(record.url.match(/#ayah-0*(\d+)$/)?.[1]);
    }
    catalogs[record.lang].records.push(item);
  }
  // Include paired study names in alias lookup, while keeping result language fixed.
  const pages = (await read('assets/data/library.json')).pages;
  const allItems = new Map(Object.values(catalogs).flatMap(c=>c.records).map(r=>[r.url,r]));
  const originalAliases = new Map([...allItems].map(([url,r])=>[url,[...r.aliases]]));
  for (const page of pages) if (allItems.has(page.url) && originalAliases.has(page.translation)) {
    allItems.get(page.url).aliases = [...new Set([...originalAliases.get(page.url),...originalAliases.get(page.translation)])];
  }
  for (const catalog of Object.values(catalogs)) {
    catalog.records.sort((a,b)=>a.id.localeCompare(b.id));
    Object.assign(catalog,{rootWords,rootForms:[...rootForms],surahs,entry});
  }
  const hash = createHash('sha256').update(JSON.stringify(catalogs));
  for (const script of ['search-worker.js','search-fetch.mjs','search-client.mjs','search-ranking.mjs']) {
    hash.update(await fs.readFile(path.join(repo,'assets/js',script)));
  }
  const version = hash.digest('hex').slice(0,20);
  const paths = {};
  for (const [lang,catalog] of Object.entries(catalogs)) {
    paths[lang] = `/assets/data/search-catalog-${lang}.${version}.json`;
    await fs.writeFile(path.join(site,paths[lang]),JSON.stringify({...catalog,version}));
  }
  await fs.writeFile(path.join(site,'assets/data/search-version.json'),JSON.stringify({version,catalogs:paths}));
}
