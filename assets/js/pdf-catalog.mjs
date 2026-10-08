import {selectVerses} from './pdf-selection.mjs';

export function selectDocument(input, pages) {
  if (!input || typeof input.path !== 'string' || input.path.length > 500 || !/^\/(?:en|fa|quran-terminology|quran-reflection)\/[a-z0-9/-]+\/$/.test(input.path)) throw Error('Invalid path');
  if (input.reflection !== undefined) throw Error('Verse exports always include reflection');
  if (input.allowPartial !== undefined && typeof input.allowPartial !== 'boolean') throw Error('Invalid partial selection');
  const entry = pages.find(page => page.url === input.path);
  if (!entry || !['en','fa'].includes(entry.lang)) throw Error('Unpublished page');
  if (entry.kind === 'Quran') {
    const selection = selectVerses(input, entry.anchors || []);
    if (selection.scope === 'range' && selection.missing.length && input.allowPartial !== true) throw Error('Confirm omitted unpublished verses');
    return {...entry, ...selection};
  } else if (!['Articles','Terminology','Roots'].includes(entry.kind) || /\/(?:articles|roots|quran-terminology|hadith-critique|quran-completeness|salat|zakat)\/$/.test(input.path) || input.verse || input.scope || input.from !== undefined || input.to !== undefined) throw Error('Select a study');
  return {...entry};
}


export function pdfFilename(selection) {
  const slug = selection.url.split('/').filter(Boolean).at(-1);
  const suffix = selection.scope === 'chapter' ? '-published-verses' : selection.ids?.length === 1 ? '-'+selection.ids[0] : selection.ids?.length ? `-verses-${selection.from}-${selection.to}` : '';
  return `forqan-${selection.lang}-${slug}${suffix}.pdf`;
}
