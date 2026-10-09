import {normalize} from './search-utils.mjs';
export const initial = value => Array.from(normalize(value||'').replace(/[^\p{L}\p{N}]/gu,''))[0]||'';
const rowInitial = row => initial(row.title||row.initial||row.search);
export function availableLetters(rows,lang='en') {
  const collator=new Intl.Collator(lang,{sensitivity:'base',numeric:true});
  return [...new Set(rows.map(rowInitial).filter(Boolean))].sort(collator.compare);
}
export function browse(rows,{query='',sort='suggested',lang='en',format='all',letter=''}={}) {
  const tokens=normalize(query).split(' ').filter(Boolean);
  const selectedLetter=initial(letter);
  const visible=rows.filter(row=>(format==='all'||row.format===format)&&(!selectedLetter||rowInitial(row)===selectedLetter)&&tokens.every(token=>normalize(row.search).includes(token)));
  const collator=new Intl.Collator(lang,{sensitivity:'base',numeric:true});
  const byTitle=(a,b)=>collator.compare(normalize(a.title||a.search),normalize(b.title||b.search));
  if(sort==='alphabetical')visible.sort(byTitle);
  if(sort==='newest')visible.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||byTitle(a,b));
  return {visible,total:visible.length};
}
