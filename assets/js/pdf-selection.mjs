// Shared by the dialog and service: published content is the only export source.
export function selectVerses(input, anchors) {
  const published = [...new Set(anchors.filter(id => /^ayah-\d{3}$/.test(id)))].sort();
  const numbers = published.map(id => Number(id.slice(5)));
  const scope = input.scope || 'verse';
  let from, to;
  if (scope === 'verse') {
    if (!published.includes(input.verse)) throw Error('Select a published verse');
    from = to = Number(input.verse.slice(5));
  } else if (scope === 'range') {
    ({from, to} = input);
    if (![from,to].every(n => Number.isInteger(n) && n >= 1 && n <= 286) || from > to) throw Error('Invalid verse range');
  } else if (scope === 'chapter') {
    from = numbers[0]; to = numbers.at(-1);
  } else throw Error('Invalid scope');
  const ids = published.filter(id => Number(id.slice(5)) >= from && Number(id.slice(5)) <= to);
  if (!ids.length) throw Error('No published verses in this selection');
  const missing = Array.from({length:to-from+1}, (_,i) => from+i).filter(n => !numbers.includes(n));
  return {scope, ids, from, to, missing};
}

export function numberRanges(numbers, lang = 'en') {
  const format = new Intl.NumberFormat(lang, {useGrouping:false});
  const runs = [];
  for (const number of numbers) {
    const last = runs.at(-1);
    if (last && number === last[1]+1) last[1] = number;
    else runs.push([number,number]);
  }
  return runs.map(([a,b]) => a === b ? format.format(a) : `${format.format(a)}–${format.format(b)}`).join(lang === 'fa' ? '، ' : ', ');
}
