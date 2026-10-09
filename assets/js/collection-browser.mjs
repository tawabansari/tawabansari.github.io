import {normalize} from './search-utils.mjs';
export const initial = value => normalize(value).replace(/[^\p{L}\p{N}]/gu,'').slice(0,1);
export function browse(rows,{query='',sort='suggested',lang='en'}={}) {
  const tokens=normalize(query).split(' ').filter(Boolean);
  const visible=rows.filter(row=>tokens.every(token=>normalize(row.search).includes(token)));
  const collator=new Intl.Collator(lang,{sensitivity:'base',numeric:true});
  const byTitle=(a,b)=>collator.compare(normalize(a.title||a.search),normalize(b.title||b.search));
  if(sort==='alphabetical')visible.sort(byTitle);
  if(sort==='newest')visible.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||byTitle(a,b));
  return {visible,total:visible.length};
}
