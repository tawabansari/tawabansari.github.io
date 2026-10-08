import {selectVerses, numberRanges} from './pdf-selection.mjs';
import {createPDFClient} from './pdf-request.mjs';

// An HTTPS service is primary; the optional browser renderer is the fallback.
export function pdfEndpoint(value, base) {
  try {
    if (!value) return null;
    const url = new URL(value, base);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

function init() {
  const endpoint = pdfEndpoint(document.querySelector('meta[name="forqan-pdf-endpoint"]')?.content, location.href);
  const fallback = document.querySelector('meta[name="forqan-pdf-fallback"]')?.content === 'true';
  let storage;
  try { storage = window.localStorage; } catch {}
  const download = createPDFClient({storage});
  const main = document.getElementById('main-content');
  if ((!endpoint && !fallback) || !main || !window.HTMLDialogElement) return;
  const lang = document.documentElement.lang === 'fa' ? 'fa' : 'en', fa = lang === 'fa';
  const num = n => new Intl.NumberFormat(lang, {useGrouping:false}).format(n);
  const verses = [...main.querySelectorAll('.ayah-block[id]')];
  const anchors = verses.map(verse => verse.id);
  const chapter = window.FORQAN_QURAN_NAV?.find(item => location.pathname.endsWith(`/${item.slug}/`));
  const chapterName = chapter?.[fa ? 'faName' : 'enName'] || document.title.split(' | ')[0];
  const total = chapter?.ayahs || Math.max(...anchors.map(id => Number(id.slice(5))));
  const kind = main.dataset.pagefindFilter?.replace('type:', '');
  const study = !verses.length && main.hasAttribute('data-pagefind-body') && ['Articles', 'Terminology', 'Roots'].includes(kind)
    ? main.querySelector('article,.root-study-page,.forqan-page-ltr,.forqan-page-rtl') : null;
  if (!verses.length && !study) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'pdf-download-dialog'; dialog.dir = fa ? 'rtl' : 'ltr';
  dialog.setAttribute('aria-labelledby', 'pdf-download-title');
  dialog.innerHTML = `<h2 id="pdf-download-title">${fa ? 'دریافت PDF' : 'Download PDF'}</h2>
    <p class="pdf-selection"></p>
    <fieldset class="pdf-scope"><legend>${fa ? 'انتخاب آیات' : 'Choose verses'}</legend>
      <label><input type="radio" name="pdf-scope" value="verse" checked> <span data-pdf-current></span></label>
      <label><input type="radio" name="pdf-scope" value="range"> ${fa ? 'بازه‌ای از آیات' : 'A range of verses'}</label>
      <div class="pdf-range" hidden>
        <label>${fa ? 'از آیه' : 'From verse'}<select data-pdf-from></select></label>
        <label>${fa ? 'تا آیه' : 'To verse'}<select data-pdf-to></select></label>
      </div>
      <label><input type="radio" name="pdf-scope" value="chapter"> ${fa ? 'همهٔ آیات منتشرشدهٔ این سوره' : 'All published verses in this chapter'}</label>
    </fieldset>
    <p class="pdf-summary" aria-live="polite"></p>
    <p class="pdf-includes"></p>
    <p class="pdf-missing" hidden></p>
    <label class="pdf-partial" hidden><input type="checkbox"> ${fa ? 'دریافت فقط آیات منتشرشده در این بازه' : 'Download only the published verses in this range'}</label>
    <p class="pdf-reflection-note" hidden></p>
    <p class="pdf-download-status" role="status" aria-live="polite"></p>
    <div class="pdf-dialog-actions"><button type="button" data-pdf-save>${fa ? 'دریافت PDF' : 'Download PDF'}</button><button type="button" data-pdf-close>${fa ? 'بستن' : 'Close'}</button></div>`;
  document.body.append(dialog);
  const save = dialog.querySelector('[data-pdf-save]');
  const status = dialog.querySelector('[role="status"]');
  const scope = dialog.querySelector('.pdf-scope');
  const range = dialog.querySelector('.pdf-range');
  const from = dialog.querySelector('[data-pdf-from]'), to = dialog.querySelector('[data-pdf-to]');
  const partial = dialog.querySelector('.pdf-partial'), acknowledge = partial.querySelector('input');
  const summary = dialog.querySelector('.pdf-summary'), missing = dialog.querySelector('.pdf-missing');
  const reflectionNote = dialog.querySelector('.pdf-reflection-note');
  let selection, currentVerse, controller, focusOrigin, downloadURL;
  if (verses.length) for (let n = 1; n <= total; n++) {
    from.add(new Option(num(n), String(n))); to.add(new Option(num(n), String(n)));
  }
  const release = () => { if (downloadURL) URL.revokeObjectURL(downloadURL); downloadURL = null; };
  const cancel = () => { controller?.abort(); controller = null; dialog.close(); focusOrigin?.focus({preventScroll:true}); };
  dialog.querySelector('[data-pdf-close]').addEventListener('click', cancel);
  // Keep Escape local when this dialog is opened inside the study reading panel.
  dialog.addEventListener('keydown', e => { if (e.key === 'Escape') e.stopPropagation(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); cancel(); });
  window.addEventListener('pagehide', release);

  function updateSelection() {
    status.replaceChildren(); selection = null;
    missing.hidden = partial.hidden = reflectionNote.hidden = true;
    save.disabled = false;
    if (!currentVerse) { selection = {path:location.pathname}; summary.textContent = ''; return; }
    const mode = scope.querySelector('input:checked').value;
    range.hidden = mode !== 'range';
    const request = {path:location.pathname, scope:mode, ...(mode === 'verse' ? {verse:currentVerse.id} : mode === 'range' ? {from:Number(from.value),to:Number(to.value)} : {})};
    try {
      const selected = selectVerses(request, anchors);
      const span = numberRanges(selected.from === selected.to ? [selected.from] : Array.from({length:selected.to-selected.from+1},(_,i) => selected.from+i), lang);
      summary.textContent = fa ? `${chapterName} · ${selected.from === selected.to ? 'آیهٔ' : 'آیات'} ${span} · ${num(selected.ids.length)} آیه` : `${chapterName} · ${selected.from === selected.to ? 'verse' : 'verses'} ${span} · ${num(selected.ids.length)} ${selected.ids.length === 1 ? 'verse' : 'verses'}`;
      if (mode === 'chapter') summary.textContent = fa ? `${chapterName} · ${num(selected.ids.length)} آیهٔ منتشرشده از ${num(total)} آیه` : `${chapterName} · ${num(selected.ids.length)} published verses of ${num(total)}`;
      if (selected.missing.length) {
        missing.hidden = false;
        missing.textContent = (fa ? 'این آیات هنوز منتشر نشده‌اند و در فایل نخواهند بود: ' : 'These verses are not published and will be omitted: ') + numberRanges(selected.missing, lang);
        partial.hidden = mode !== 'range';
        save.disabled = mode === 'range' && !acknowledge.checked;
        if (mode === 'range') request.allowPartial = acknowledge.checked;
      }
      const noReflection = selected.ids.filter(id => !document.getElementById(id)?.querySelector('details[data-type="reflection"] .details-content')?.textContent.trim());
      if (noReflection.length) {
        reflectionNote.hidden = false;
        reflectionNote.textContent = (fa ? 'تأمل این آیات هنوز منتشر نشده است: ' : 'Reflection is not yet published for: ') + numberRanges(noReflection.map(id => Number(id.slice(5))), lang);
      }
      selection = request;
    } catch {
      summary.textContent = Number(from.value) > Number(to.value)
        ? (fa ? 'آیهٔ پایان باید برابر یا پس از آیهٔ آغاز باشد.' : 'The end verse must be at or after the start verse.')
        : (fa ? 'در این بازه آیه‌ای منتشر نشده است.' : 'No verses are published in this range yet.');
      save.disabled = true;
    }
  }
  scope.addEventListener('change', () => { acknowledge.checked = false; updateSelection(); });
  acknowledge.addEventListener('change', updateSelection);

  function open(button, verse) {
    release(); focusOrigin = button; currentVerse = verse;
    scope.hidden = !verse;
    dialog.querySelector('.pdf-selection').textContent = verse ? chapterName : study.querySelector('h1')?.textContent.trim() || document.title.split(' | ')[0];
    dialog.querySelector('.pdf-includes').textContent = verse
      ? (fa ? 'متن عربی، ترجمهٔ فارسی و تأمل ما. بدون بخش ارجاعات متقابل.' : 'Arabic text, English translation, and Our Reflection. Cross-references are excluded.')
      : (fa ? 'نسخه‌ای خوانا از متن کامل برای ذخیره و مطالعه، با متن قابل انتخاب.' : 'A clean copy of the full study to save and read, with selectable text.');
    if (verse) {
      const n = Number(verse.id.slice(5)); from.value = to.value = String(n);
      dialog.querySelector('[data-pdf-current]').textContent = fa ? `همین آیه (${num(n)})` : `This verse (${num(n)})`;
      scope.querySelector('[value="verse"]').checked = true;
    }
    scope.disabled = acknowledge.disabled = false; acknowledge.checked = false;
    updateSelection(); dialog.showModal();
    (verse ? scope.querySelector('input:checked') : save).focus();
  }
  save.addEventListener('click', async () => {
    if (!selection || save.disabled) return;
    release(); const request = new AbortController(); controller = request;
    const timeout = setTimeout(() => request.abort(), 600000);
    save.disabled = scope.disabled = acknowledge.disabled = true;
    status.textContent = fa ? 'در حال آماده‌سازی PDF… مجموعه‌های بزرگ ممکن است کمی زمان ببرند.' : 'Preparing your PDF… Larger selections may take a little longer.';
    try {
      const {blob,filename} = await download(selection,{endpoint,fallback,signal:request.signal});
      if (!dialog.open || controller !== request) return;
      downloadURL = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = downloadURL;
      link.download = filename;
      link.textContent = fa ? 'دریافت دوبارهٔ فایل PDF' : 'Download the PDF again';
      status.replaceChildren(document.createTextNode(fa ? 'فایل آماده است. ' : 'Your PDF is ready. '), link);
      link.click();
    } catch {
      if (dialog.open && controller === request) status.textContent = fa ? 'ساخت PDF انجام نشد. لطفاً دوباره تلاش کنید.' : 'The PDF could not be created. Please try again.';
    } finally {
      clearTimeout(timeout);
      if (controller === request) { controller = null; save.disabled = scope.disabled = acknowledge.disabled = false; }
    }
  });
  function addButton(target, verse) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'pdf-download-button';
    if (verse) button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 2v10m-4-4 4 4 4-4M3 13v4h14v-4"/></svg><span>PDF</span>';
    else button.textContent = fa ? 'دریافت PDF' : 'Download PDF';
    button.setAttribute('aria-label', verse ? (fa ? 'دریافت PDF آیه یا مجموعه‌ای از آیات' : 'Download this verse or a selection as PDF') : button.textContent);
    button.title = button.getAttribute('aria-label'); button.setAttribute('aria-haspopup','dialog');
    button.dataset.pagefindIgnore = ''; button.addEventListener('click', () => open(button, verse)); target.append(button);
    if (verse) {
      const actions = document.createElement('span'); actions.className = 'pdf-verse-actions'; actions.dataset.pagefindIgnore = '';
      target.querySelectorAll('.copy-ayah-text,.copy-ayah-link,.ayah-quran-nav-button,.quran-gooya-link,.pdf-download-button').forEach(control => actions.append(control));
      target.append(actions);
    }
  }
  if (study) {
    const tools = document.createElement('div'); tools.className = 'pdf-study-tools'; tools.dataset.pagefindIgnore = '';
    const heading = study.querySelector('h1');
    (heading?.closest('header,.root-hero') || heading || study.firstElementChild).insertAdjacentElement('afterend', tools);
    addButton(tools);
  }
  verses.forEach(verse => { const title = verse.querySelector('.ayah-title,h2'); if (title) addButton(title, verse); });
}
if (typeof document !== 'undefined') init();
