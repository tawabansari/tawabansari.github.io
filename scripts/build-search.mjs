import fs from 'node:fs/promises';
import path from 'node:path';
import * as pagefind from 'pagefind';
import {normalize} from '../assets/js/search-utils.mjs';
const site=path.resolve(process.argv[2]||'_site');
const input=path.join(site,'assets/data/search-records.json');
const records=JSON.parse(await fs.readFile(input,'utf8'));
const vocabulary={en:new Map(),fa:new Map()};
const {index,errors}=await pagefind.createIndex();
if(errors.length||!index)throw Error(errors.join('\n'));
try {
  for(const record of records){
    const normalized=normalize((record.kind==='Quran'?'':record.title+' ')+record.original);
    // Count documents, not repeated occurrences within one very long study.
    for(const token of new Set(normalized.split(' '))){
      if(token.length>=4&&token.length<=24&&/^\p{L}+$/u.test(token)){
        const map=vocabulary[record.lang];map.set(token,(map.get(token)||0)+1);
      }
    }
    const added=await index.addCustomRecord({url:record.url,content:normalized,language:record.lang,
      meta:{title:record.title,original:record.original,verse:record.verse||'',arabic:record.arabic||'',translation:record.translation||''},filters:{type:[record.kind]}});
    if(added.errors.length)throw Error(added.errors.join('\n'));
  }
  const written=await index.writeFiles({outputPath:path.join(site,'pagefind')});
  if(written.errors.length)throw Error(written.errors.join('\n'));
  for(const [lang,map] of Object.entries(vocabulary))await fs.writeFile(path.join(site,`assets/data/vocabulary-${lang}.json`),JSON.stringify([...map].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,12000)));
  await fs.writeFile(path.join(site,'assets/data/verses.json'),JSON.stringify(records.filter(r=>r.kind==='Quran')));
  await fs.unlink(input); // Intermediate index input, not a public download.
  console.log(`Indexed ${records.length} records, including ${records.filter(r=>r.kind==='Quran').length} individual Qur’an passages. Original wording is retained in result excerpts.`);
} finally {await pagefind.close();}
