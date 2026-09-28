import {normalize} from './search-utils.mjs';

export function matchesSection(record, section) {
  // A study may belong to several collections. Its primary label is unchanged.
  return !section || (section === 'Studies' || section === 'Articles'
    ? ['Articles', 'Terminology'].includes(record.kind)
    : record.kind === section);
}

export function queryContext(query, catalog) {
  const key = normalize(query), quoted = /^\s*".+"\s*$/.test(query);
  const studies = quoted ? [] : catalog.records.filter(r => r.aliases?.includes(key));
  const studyUrls = new Set(studies.map(r => r.url));
  const roots = new Set(quoted ? [] : catalog.rootWords[key] || []);
  const explicitRoot = !quoted && catalog.rootForms.includes(key);
  return {key, quoted, studies, studyUrls, roots, explicitRoot};
}

// Sorting is deliberately independent of rendering and Pagefind's lazy fragments.
// Only verified root/word forms receive the second band, never incidental mentions.
export function rankResults(hits, catalog, query, section = '') {
  const context = queryContext(query, catalog);
  const byId = new Map(catalog.records.map(r => [r.id, r]));
  const candidates = new Map();
  for (const hit of hits) {
    if (context.explicitRoot) continue; // Never search separated root letters as ordinary words.
    if (!hit.words?.length) continue; // Metadata-only engine hits are not matching passages.
    const record = byId.get(hit.id);
    if (record && matchesSection(record, section)) candidates.set(hit.id, {...record, hit, reason: ''});
  }
  for (const record of catalog.records) {
    if (!matchesSection(record, section)) continue;
    let reason = '';
    if (context.studyUrls.has(record.url)) reason = 'concept';
    if (context.explicitRoot && record.annotatedRoots?.some(root=>context.roots.has(root))) reason = 'concept';
    if (record.kind === 'Roots' && context.roots.has(record.root)) reason = 'root';
    if (record.kind === 'Quran') {
      if (record.roots?.some(root => context.roots.has(root))) reason = 'root';
      if (record.concepts?.some(url => context.studyUrls.has(url))) reason = 'concept';
    }
    if (reason) {
      const existing = candidates.get(record.id);
      candidates.set(record.id, {...record, ...existing, reason: existing?.hit && record.kind === 'Quran' ? '' : reason});
    }
  }
  for (const record of candidates.values()) {
    record.bucket = record.kind === 'Quran' ? 'Quran'
      : record.kind === 'Roots' && context.roots.has(record.root) ? 'MatchedRoots' : 'Relevant';
    const title = normalize(record.title);
    const titleMatch = title === context.key ? 3
      : (` ${title} `).includes(` ${context.key} `) ? 2 : 0;
    record.priority = record.bucket === 'Quran' ? (record.reason ? 0 : 1)
      : context.studyUrls.has(record.url) ? 4 : titleMatch;
    record.score = record.hit?.score || 0;
    // Directory titles should not outrank the dedicated studies they link to.
    if (record.kind === 'Guide') record.priority = -1;
  }
  const bands = {Quran: 0, MatchedRoots: 1, Relevant: 2};
  return [...candidates.values()].sort((a,b) => bands[a.bucket] - bands[b.bucket]
    || b.priority - a.priority || b.score - a.score || a.url.localeCompare(b.url));
}

export function parseReference(value, surahs) {
  const raw = String(value).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
    .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/：/g,':').trim();
  const numeric = raw.match(/^(\d{1,3})\s*[:/\-]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?$/);
  let chapter, start, end;
  if (numeric) [chapter,start,end] = [Number(numeric[1]),Number(numeric[2]),Number(numeric[3] || numeric[2])];
  else {
    const named = raw.match(/^(.+?)\s+(?:verse\s+|آیه\s+|آية\s+)?(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?$/i);
    if (!named) return null;
    const compact = s => normalize(s).replace(/^al /,'').replace(/ /g,'');
    const surah = surahs.find(s => [s.enName,s.faName,s.enMeaning,s.faMeaning,...s.aliases.split(' ')]
      .some(name => compact(name) === compact(named[1])));
    if (!surah) return null;
    [chapter,start,end] = [surah.number,Number(named[2]),Number(named[3] || named[2])];
  }
  const max = surahs.find(s => s.number === chapter)?.ayahs;
  return {chapter,start,end,valid: Boolean(max && start >= 1 && end >= start && end <= max)};
}

export function referenceResults(reference, catalog) {
  if (!reference.valid) return [];
  return catalog.records.filter(r => r.kind === 'Quran' && r.chapter === reference.chapter
    && r.verseNumber >= reference.start && r.verseNumber <= reference.end)
    .sort((a,b) => a.verseNumber - b.verseNumber).map(r => ({...r,bucket:'Quran',reason:''}));
}
