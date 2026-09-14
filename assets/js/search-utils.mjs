// Shared by the index builder and the browser: displayed source text stays unchanged.
export function normalize(value) {
  return String(value).normalize('NFKD')
    .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06edـ]/g, '')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[أإآٱ]/g, 'ا')
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
    .replace(/[\u200c\u200d]/g, ' ').toLowerCase()
    .replace(/[^\p{L}\p{N}:]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
export function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const rows = Array.from({length:a.length+1}, (_,i) => [i]);
  for (let j=0;j<=b.length;j++) rows[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) {
    rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
  }
  return rows[a.length][b.length];
}
export function suggest(query, vocabulary) {
  const words=normalize(query).split(' '), known=new Map(vocabulary);
  let changed=false;
  const replacement=words.map(word=>{
    if(word.length<4||known.has(word)||!/^\p{L}+$/u.test(word))return word;
    const limit=word.length>=8?2:1;
    const candidates=vocabulary.filter(([v])=>Math.abs(v.length-word.length)<=limit)
      .map(([v,n])=>({word:v,n,d:editDistance(word,v)})).filter(v=>v.d<=limit)
      .sort((a,b)=>a.d-b.d||b.n-a.n);
    if(!candidates.length)return word;
    changed=true;return candidates[0].word;
  });
  return changed?replacement.join(' '):null;
}
export function categoryOrder(query, type) {
  if(type)return [type];
  return ['Quran','Roots','Terminology','Articles','Reflection','Guide'];
}
export function excerpt(original, query, max=240) {
  const tokens=normalize(query).split(' ').filter(Boolean),phrase=normalize(query);
  const words=String(original).split(/\s+/);
  const starts=new Set([0]);
  words.forEach((word,i)=>{if(tokens.some(t=>normalize(word).includes(t)))starts.add(Math.max(0,i-8));});
  let best='',bestScore=-1;
  for(const start of starts){
    let out='',end=start;
    while(end<words.length && (out.length+words[end].length<max || end===start))out+=(out?' ':'')+words[end++];
    const normalized=normalize(out),score=tokens.filter(t=>normalized.includes(t)).length*10+(phrase&&normalized.includes(phrase)?20:0);
    if(score>bestScore){bestScore=score;best=(start?'… ':'')+out+(end<words.length?' …':'');}
  }
  return best;
}

export function selectPassage(passages, query, description='', original='') {
  const tokens=[...new Set(normalize(query).split(' ').filter(Boolean))], phrase=normalize(query);
  let best=null,score=0;
  for(const passage of passages){
    const text=normalize(passage.text),hits=tokens.filter(t=>text.includes(t)).length;
    const rank=hits*10+(phrase&&text.includes(phrase)?20:0);
    if(rank>score){best=passage;score=rank;}
  }
  return best || {text:description || passages[0]?.text || original,anchor:''};
}
export function highlightedParts(text, query) {
  const tokens=normalize(query).split(' ').filter(Boolean);
  return String(text).split(/(\s+)/).map(text=>({text,match:tokens.some(t=>normalize(text).includes(t))}));
}
