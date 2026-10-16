import {afterReadingLayout} from './reading-position.mjs';

export function reflectionURL(pathname, verseId) {
  if (!/^\/quran-reflection\/(fa|en)\/\d{3}-[^/]+\/$/.test(pathname)) return null;
  const match = /^ayah-(\d+)$/.exec(verseId);
  if (!match || Number(match[1]) < 1) return null;
  const url = new URL(pathname, 'https://tabsira.forqan.co');
  url.searchParams.set('verse', String(Number(match[1])));
  return url.href;
}

function init() {
  const verses = [...document.querySelectorAll('.ayah-block[id]')];
  if (!verses.length || !reflectionURL(location.pathname, verses[0].id)) return;
  const fa = document.documentElement.lang.startsWith('fa');
  const page = verses[0].parentElement;
  const toolbar = document.createElement('div');
  toolbar.className = 'reader-mode-toolbar';
  toolbar.dataset.pagefindIgnore = '';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', fa ? 'شیوهٔ خواندن' : 'Reading view');
  const modes = [['study', fa ? 'مطالعه و بررسی' : 'Study'], ['reading', fa ? 'خواندن' : 'Reading']];
  const buttons = modes.map(([mode, label]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => setMode(mode, true));
    toolbar.append(button); return button;
  });
  page.prepend(toolbar);

  function setMode(mode, preservePosition = false) {
    const current = verses.find(verse => verse.getBoundingClientRect().bottom > toolbar.getBoundingClientRect().bottom + 60) || verses.at(-1);
    document.body.classList.toggle('quran-reading-mode', mode === 'reading');
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(modes[index][0] === mode)));
    try { localStorage.setItem('forqan-reading-mode', mode); } catch {}
    if (preservePosition) afterReadingLayout(() => {
      const top = window.scrollY + current.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom - 12;
      window.scrollTo({top, behavior: 'instant'});
    });
  }
  let saved = 'study';
  try { saved = localStorage.getItem('forqan-reading-mode') || saved; } catch {}
  setMode(saved === 'reading' ? 'reading' : 'study');
  if (saved === 'reading' && /^#ayah-\d+$/.test(location.hash)) {
    afterReadingLayout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }

  verses.forEach(verse => {
    const heading = verse.querySelector('.ayah-title,h2');
    if (!heading) return;
    const reference = heading.querySelector('.ayah-reference');
    if (reference) {
      if (!reference.querySelector('a')) {
        const permalink = document.createElement('a');
        permalink.href = '#' + verse.id;
        const label = reference.textContent.trim();
        const parts = /^(.*?)\s+([0-9۰-۹٠-٩]+:[0-9۰-۹٠-٩]+)$/.exec(label);
        permalink.className = 'verse-permalink';
        if (parts) {
          const chapter = document.createElement('span');
          chapter.className = 'verse-reference-chapter'; chapter.textContent = parts[1];
          const number = document.createElement('span');
          number.className = 'verse-reference-number'; number.textContent = parts[2];
          permalink.append(chapter, ' ', number);
        } else permalink.textContent = label;
        reference.replaceChildren(permalink);
      }
      const number = document.createElement('a');
      number.className = 'reading-verse-number';
      number.href = '#' + verse.id;
      number.textContent = new Intl.NumberFormat(fa ? 'fa' : 'en', {useGrouping:false}).format(Number(verse.id.slice(5)));
      number.setAttribute('aria-label', reference.textContent.trim());
      number.title = reference.textContent.trim();
      number.dataset.pagefindIgnore = '';
      heading.prepend(number);
    }
    const link = document.createElement('a');
    link.className = 'tabsira-reflection-link';
    link.href = reflectionURL(location.pathname, verse.id);
    link.target = '_blank'; link.rel = 'noopener';
    link.dataset.pagefindIgnore = '';
    link.textContent = '✎';
    const label = fa ? 'نوشتن تبصره دربارهٔ این آیه' : 'Write a reflection on Tabsira';
    link.setAttribute('aria-label', label); link.title = label;
    const actions = heading.querySelector('.pdf-verse-actions') || heading;
    actions.querySelector('.copy-ayah-link')?.remove();
    const tools = document.createElement('div'); tools.className = 'verse-discussion-tools';
    tools.dataset.pagefindIgnore = '';
    const panels = [...verse.querySelectorAll(':scope > details[data-type]')];
    for (const panel of panels) {
      const summary = panel.querySelector('summary');
      if (!summary) continue;
      const group = document.createElement('div'); group.className = 'verse-discussion-group';
      const title = summary.childNodes[0].textContent.trim();
      const toggle = document.createElement('button'); toggle.type='button'; toggle.className='verse-panel-toggle';
      toggle.setAttribute('aria-controls',panel.id);
      const refresh = () => { toggle.textContent = title + (panel.open ? ' −' : ' +'); toggle.setAttribute('aria-expanded',String(panel.open)); };
      toggle.addEventListener('click',()=>{panel.open=!panel.open;refresh();});
      panel.addEventListener('toggle',refresh); refresh(); group.append(toggle);
      summary.querySelectorAll('.language-mirror-link,.copy-section-text').forEach(control=>group.append(control));
      if (panel.dataset.type === 'reflection') group.append(link);
      panel.classList.add('compact-verse-panel');
      tools.append(group);
    }
    if (!tools.contains(link)) tools.append(link);
    if (panels.length) panels[0].before(tools); else verse.append(tools);
    // Match visual and keyboard order, with verse search always at the far right.
    const search = actions.querySelector('.ayah-quran-nav-button');
    if (search) actions.append(search);
    if (reference) reference.title = reference.textContent.trim();
  });
}

if (typeof document !== 'undefined') init();
