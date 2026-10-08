// Parse the source as an inert document; only cleaned content enters the renderer.
export function prepareDocument({ids, scope, from, to, missing = [], title, lang, sourceURL, html}) {
  const sourceDocument = html ? new DOMParser().parseFromString(html, 'text/html') : document;
  const main = sourceDocument.getElementById('main-content');
  if (!main) throw Error('Content not found');
  const fa = lang === 'fa', num = n => new Intl.NumberFormat(lang, {useGrouping:false}).format(n);
  const content = ids ? document.createElement('main') : main.cloneNode(true);
  if (ids) for (const id of ids) {
    const original = sourceDocument.getElementById(id);
    if (!original?.matches('.ayah-block') || !original.querySelector('.arabic-text') || !original.querySelector(fa ? '.farsi-verse' : '.english-verse')) throw Error('Published verse content unavailable');
    const block = document.createElement('section'); block.className = 'ayah-block pdf-verse'; block.id = id;
    // Include only the three requested components, independent of on-screen collapsed state.
    for (const selector of ['.ayah-title,h2', '.arabic-text', fa ? '.farsi-verse' : '.english-verse', 'details[data-type="reflection"]']) {
      const part = original.querySelector(selector);
      if (part) block.append(part.cloneNode(true));
    }
    const reflection = block.querySelector('details[data-type="reflection"]');
    if (!reflection?.querySelector('.details-content')?.textContent.trim()) {
      reflection?.remove();
      const note = document.createElement('p'); note.className = 'pdf-unavailable';
      note.textContent = fa ? 'تأمل این آیه هنوز منتشر نشده است.' : 'Reflection for this verse is not yet published.';
      block.append(note);
    }
    block.querySelectorAll('details[data-type="cross-reference"]').forEach(node => node.remove());
    content.append(block);
  }
  // Preserve every Arabic word before removing interactive controls.
  content.querySelectorAll('button.word-link').forEach(button => {
    const word = document.createElement('span'); word.textContent = button.textContent; button.replaceWith(word);
  });
  content.querySelectorAll('script,style,link,meta,iframe,object,embed,form,button,input,select,textarea,dialog,nav,.library-toc,.library-find,.study-context,.study-related,.root-tools,.root-popover,.pdf-study-tools,.legacy-passage-anchor,.quran-gooya-link,.language-mirror-link,.reference-pending,[hidden],[aria-hidden="true"]').forEach(node => node.remove());
  content.querySelectorAll('details').forEach(details => {
    const section = document.createElement('section');
    for (const child of [...details.childNodes]) {
      if (child.nodeName === 'SUMMARY') {
        const heading = document.createElement(ids ? 'h3' : 'h2'); heading.textContent = child.textContent.trim(); section.append(heading);
      } else section.append(child);
    }
    details.replaceWith(section);
  });
  // The document gets one title, with the source page's own wording.
  const single = ids?.length === 1;
  const firstTitle = single ? content.querySelector('.ayah-title,h2') : !ids ? content.querySelector('h1') : null;
  const documentTitle = firstTitle?.textContent.trim() || title;
  firstTitle?.remove();
  for (const node of [content, ...content.querySelectorAll('*')]) {
    for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name) || ['style','hidden','inert','autofocus','tabindex','contenteditable'].includes(attr.name)) node.removeAttribute(attr.name);
    }
    if (node.matches('a[href]')) {
      const raw = node.getAttribute('href');
      try {
        const url = new URL(raw, sourceURL);
        if (!['http:','https:','mailto:'].includes(url.protocol)) node.removeAttribute('href');
        else node.href = url.href;
      } catch { node.removeAttribute('href'); }
      node.removeAttribute('target');
    }
    if (node.matches('img')) { node.loading = 'eager'; node.removeAttribute('srcset'); }
  }
  const direction = lang === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang; document.documentElement.dir = direction;
  document.documentElement.removeAttribute('class'); document.documentElement.removeAttribute('style');
  document.head.replaceChildren();
  document.title = documentTitle;
  const charset = document.createElement('meta'); charset.setAttribute('charset','utf-8'); document.head.append(charset);
  document.body.replaceChildren(); document.body.removeAttribute('class'); document.body.removeAttribute('style');
  if (ids) {
    // One opening per export, outside the individual verses and repeating page headers.
    const opening = document.createElement('div'); opening.className = 'pdf-opening';
    const basmala = document.createElement('p'); basmala.className = 'pdf-basmala'; basmala.lang = 'ar'; basmala.dir = 'rtl';
    basmala.textContent = 'بسم الله الرحمن الرحیم';
    const translation = document.createElement('p'); translation.className = 'pdf-basmala-translation';
    translation.lang = lang; translation.dir = direction;
    translation.textContent = fa ? 'به نام آن معبود یگانه فرابخشاینده و فرامهربان' : 'By Name of The-God The-Merciful The-Compassionate';
    opening.append(basmala, translation); document.body.append(opening);
  }
  const brand = document.createElement('p'); brand.className = 'pdf-brand'; brand.textContent = lang === 'fa' ? 'فرقان · مطالعه و تأمل در قرآن' : 'Forqan · Qur’an study and reflection';
  const heading = document.createElement('h1'); heading.textContent = documentTitle;
  const header = document.createElement('header'); header.className = 'pdf-header'; header.append(brand, heading);
  const source = document.createElement('p'); source.className = 'pdf-source';
  source.append(document.createTextNode(lang === 'fa' ? 'منبع: ' : 'Source: '));
  const link = document.createElement('a'); link.href = sourceURL; link.textContent = sourceURL; link.dir = 'ltr'; source.append(link);
  const footer = document.createElement('p'); footer.className = 'pdf-attribution';
  footer.textContent = lang === 'fa' ? 'آرشیو فرقان · بازنشر غیرتجاری با ذکر منبع آزاد است.' : 'Forqan Archive · Free to share for non-commercial purposes with attribution.';
  document.body.append(header, source, footer);
  if (ids && (ids.length > 1 || scope !== 'verse')) {
    const description = document.createElement('p'); description.className = 'pdf-export-description';
    description.textContent = scope === 'chapter'
      ? (fa ? `${num(ids.length)} آیهٔ منتشرشده · این فایل فقط شامل آیات منتشرشده است.` : `${num(ids.length)} published verses · This file includes published verses only.`)
      : (fa ? `آیات ${num(from)}–${num(to)} · ${num(ids.length)} آیه` : `Verses ${num(from)}–${num(to)} · ${num(ids.length)} verses`);
    document.body.append(description);
    if (missing.length) {
      const omitted = document.createElement('p'); omitted.className = 'pdf-unavailable';
      omitted.textContent = (fa ? 'آیات منتشرنشده که در این فایل نیستند: ' : 'Unpublished verses omitted: ') + missing.map(num).join(fa ? '، ' : ', ');
      document.body.append(omitted);
    }
  }
  if (ids?.length > 1) {
    const contents = document.createElement('section'); contents.className = 'pdf-contents';
    const contentsTitle = document.createElement('h2'); contentsTitle.textContent = fa ? 'فهرست آیات' : 'Verse contents';
    const list = document.createElement('ul');
    for (const id of ids) {
      const item = document.createElement('li'), link = document.createElement('a');
      link.href = '#' + id;
      link.textContent = content.querySelector('#' + id + ' .ayah-title')?.textContent.trim() || (fa ? 'آیهٔ ' : 'Verse ') + num(Number(id.slice(5)));
      item.append(link); list.append(item);
    }
    contents.append(contentsTitle, list); document.body.append(contents);
  }
  document.body.append(content);
  return {title:documentTitle, text:content.textContent};
}
