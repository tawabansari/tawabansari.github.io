import {normalize} from './search-utils.mjs';
export const initial = value => normalize(value).replace(/[^\p{L}\p{N}]/gu,'').slice(0,1);
export function browse(rows,{query='',letter='',page=1,size=12}={}) {
  const tokens=normalize(query).split(' ').filter(Boolean);
  const filtered=rows.filter(row=>(!letter||initial(row.initial)===initial(letter))&&tokens.every(token=>normalize(row.search).includes(token)));
  const pages=Math.max(1,Math.ceil(filtered.length/size));
  page=Math.max(1,Math.min(pages,Number.isFinite(Number(page))?Math.floor(Number(page)):1));
  return {filtered,visible:filtered.slice((page-1)*size,page*size),page,pages,total:filtered.length};
}
