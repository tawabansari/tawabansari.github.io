import {normalize,suggest,excerpt,selectPassage,highlightedParts} from './search-utils.mjs';
import {rankResults,parseReference,referenceResults} from './search-ranking.mjs';
import {SearchClient} from './search-client.mjs';

const form = document.getElementById('archive-search-form');
if (form) {
  const query = document.getElementById('archive-query'), language = document.getElementById('search-language');
  const type = document.getElementById('search-type'), status = document.getElementById('search-status');
  const results = document.getElementById('search-results'), jump = document.getElementById('search-result-navigation');
  const params = new URLSearchParams(location.search);
  query.value = params.get('q') || '';
  language.value = params.get('lang') === 'fa' || (!params.has('lang') && /[\u0600-\u06ff]/.test(query.value)) ? 'fa' : 'en';
  const selected = params.get('type') === 'Articles' ? 'Studies' : params.get('type');
  type.value = ['Quran','Roots','Terminology','Studies','Reflection'].includes(selected) ? selected : '';
  const lang = language.value, fa = lang === 'fa';
  const text = (en,faText) => fa ? faText : en;
  document.documentElement.lang = lang;
  results.dir = jump.dir = fa ? 'rtl' : 'ltr';
  const labels = {
    Quran:text('Verse text and translations','متن آیات و ترجمه'),
    Roots:text('Root study','مطالعهٔ ریشه'),
    MatchedRoots:text('Matching roots','ریشه‌های مطابق'),
    Relevant:text('Studies and other matches','مطالعات و دیگر نتیجه‌های مرتبط'),
    Terminology:text('Qur’an Terminology','مفاهیم قرآنی'),
    Articles:text('Article','مقاله'),
    Reflection:text('Ta’wil and reflection','تأویل و تأمل'),
    Guide:text('Guide','راهنما')
  };
  const client = new SearchClient(lang);
  let generation = 0, timer, vocabulary;
  const canonical = value => {
    const url = new URL(value,location.origin);
    if (url.origin !== location.origin) throw Error('Invalid search destination');
    return url;
  };
  function card(record,fragment,raw) {
    const data = fragment.meta;
    let passages;
    try {passages = JSON.parse(data.passages || '[]');} catch {passages = [];}
    const locations = record.hit?.words || [];
    const chosen = selectPassage(passages,raw,data.description,data.original,locations);
    // Use words actually matched by Pagefind, including English word families.
    const indexedWords = (fragment.content || '').split(/\s+/);
    const matchedTerms = [...new Set(locations.map(n=>indexedWords[n]).filter(Boolean))];
    const displayQuery = matchedTerms.length ? matchedTerms.join(' ') : raw;
    const url = canonical(record.url);
    if (record.kind !== 'Quran' && chosen.anchor) url.hash = chosen.anchor;
    if (raw) url.searchParams.set('highlight',raw);
    if (record.kind === 'Reflection') url.searchParams.set('in','reflection');
    const article = document.createElement('article');article.className = 'search-result';
    article.dataset.kind = record.kind;article.dataset.match = record.reason || 'text';
    const meta = document.createElement('small');meta.textContent = labels[record.kind]+' · '+text('English','فارسی');
    article.append(meta);
    const heading = document.createElement('h3'), link = document.createElement('a');
    link.href = url.pathname+url.search+url.hash;link.textContent = record.title;heading.append(link);article.append(heading);
    if (record.kind === 'Quran') {
      const arabic = document.createElement('p');arabic.className = 'verse-arabic';arabic.lang = 'ar';arabic.dir = 'rtl';arabic.textContent = data.arabic;
      const translation = document.createElement('p');translation.className = 'verse-translation';translation.lang = lang;translation.textContent = data.translation;
      article.append(arabic,translation);
    } else if (chosen.text) {
      const p = document.createElement('p');
      for (const part of highlightedParts(excerpt(chosen.text,displayQuery,280),displayQuery)) {
        if (part.match) {const mark = document.createElement('mark');mark.textContent = part.text;p.append(mark);}
        else p.append(document.createTextNode(part.text));
      }
      article.append(p);
    }
    if (record.reason) {
      const note = document.createElement('small');note.className = 'result-section';
      note.textContent = record.reason === 'root'
        ? text(record.kind === 'Quran' ? 'Matched an annotated root in the verse' : 'Matched the root or one of its word forms',record.kind === 'Quran' ? 'تطبیق با ریشهٔ نشانه‌گذاری‌شده در آیه' : 'تطبیق با ریشه یا یکی از صورت‌های واژه')
        : text(record.kind === 'Quran' ? 'Linked to this concept in the verse annotations' : 'Matched a concept name or alternative term',record.kind === 'Quran' ? 'پیوند با این مفهوم در نشانه‌گذاری آیه' : 'تطبیق با نام مفهوم یا نام دیگر آن');
      article.append(note);
    }
    return article;
  }
  function failure(token) {
    if (token !== generation) return;
    results.replaceChildren();jump.replaceChildren();
    status.textContent = text('Search could not finish loading. Please retry.','بارگذاری جستجو کامل نشد. دوباره تلاش کنید.');
    const retry = document.createElement('button');retry.type = 'button';retry.className = 'library-more';retry.textContent = text('Retry search','تلاش دوباره');
    retry.addEventListener('click',run);results.append(retry);
  }
  async function render(records,raw,token) {
    const groups = ['Quran','MatchedRoots','Relevant'].map(bucket=>({bucket,items:records.filter(r=>r.bucket===bucket)})).filter(g=>g.items.length);
    // Fetch first-screen excerpts together, before exposing an incomplete list.
    const first = groups.flatMap(g=>g.items.slice(0,5));
    const fragments = await client.records(first.map(r=>r.id));
    if (token !== generation) return;
    const cached = new Map(fragments.map(r=>[r.id,r]));
    for (const {bucket,items} of groups) {
      const section = document.createElement('section');section.className = 'search-result-group';section.id = 'results-'+bucket;
      const heading = document.createElement('h2');heading.textContent = labels[bucket]+' ('+items.length.toLocaleString(lang)+')';
      const list = document.createElement('div');section.append(heading,list);
      const nav = document.createElement('a');nav.href = '#'+section.id;nav.textContent = labels[bucket]+' · '+items.length.toLocaleString(lang);jump.append(nav);
      let cursor = Math.min(5,items.length);
      for (const record of items.slice(0,cursor)) list.append(card(record,cached.get(record.id),raw));
      const more = document.createElement('button');more.type = 'button';more.className = 'library-more';more.textContent = text('More results in this section','نتیجه‌های بیشتر در این بخش');more.hidden = cursor >= items.length;
      more.addEventListener('click',async()=>{
        more.disabled = true;
        try {
          const next = items.slice(cursor,cursor+10);
          const loaded = await client.records(next.map(r=>r.id));
          if (token !== generation) return;
          next.forEach((r,i)=>list.append(card(r,loaded[i],raw)));
          cursor += next.length;more.hidden = cursor >= items.length;
        } catch {client.reset();failure(token);}
        finally {more.disabled = false;}
      });
      section.append(more);results.append(section);
    }
  }
  async function correction(raw,token) {
    if (type.value === 'Roots') return;
    vocabulary ||= client.json('/assets/data/vocabulary-'+lang+'.json').catch(error=>{vocabulary=null;throw error;});
    const proposed = suggest(raw,await vocabulary);
    if (!proposed || token !== generation) return;
    const hits = await client.search(proposed);
    if (token !== generation || !rankResults(hits,client.catalog,proposed,type.value).length) return;
    const box = document.createElement('p');box.className = 'search-suggestion';box.append(document.createTextNode(text('Did you mean ','آیا منظورتان این بود؟ ')));
    const button = document.createElement('button');button.type = 'button';button.textContent = proposed;
    button.addEventListener('click',()=>{query.value=proposed;run();query.focus();});box.append(button);results.append(box);
  }
  async function run() {
    const token = ++generation, raw = query.value.trim();
    results.replaceChildren();jump.replaceChildren();
    const url = new URL('/search/',location.origin);
    if (raw) url.searchParams.set('q',raw);
    url.searchParams.set('lang',lang);if (type.value) url.searchParams.set('type',type.value);
    history.replaceState(null,'',url.pathname+url.search);
    if (!normalize(raw)) {status.textContent=text('Enter a word, topic, or verse reference. Try 2:106 or naskh.','یک واژه، موضوع یا شماره آیه وارد کنید؛ مثلاً ۲:۱۰۶ یا نسخ.');return;}
    status.textContent = text('Searching…','در حال جستجو…');
    try {
      const exact = /^\s*".+"\s*$/.test(raw);
      const hits = await client.search(exact ? '"'+normalize(raw)+'"' : normalize(raw));
      if (token !== generation) return;
      const reference = parseReference(raw,client.catalog.surahs);
      const records = reference ? referenceResults(reference,client.catalog) : rankResults(hits,client.catalog,raw,type.value);
      if (reference) {
        status.textContent = !reference.valid ? text('That verse reference is not valid.','این شمارهٔ آیه معتبر نیست.')
          : !records.length ? text('These verses are not yet published in the archive.','این آیات هنوز در مجموعه منتشر نشده‌اند.')
          : text(`${records.length} published verse${records.length===1?'':'s'} found.`,`${records.length.toLocaleString('fa')} آیهٔ منتشرشده پیدا شد.`);
      } else status.textContent = records.length ? text(`${records.length} results in published content.`,`${records.length.toLocaleString('fa')} نتیجه در مطالب منتشرشده.`)
        : text('No results. Try another term or the other language.','نتیجه‌ای پیدا نشد. واژه‌ای دیگر یا زبان دیگر را امتحان کنید.');
      if (records.length) await render(records,reference?'':raw,token);
      else if (!reference && !exact) await correction(raw,token);
    } catch {failure(token);}
  }
  form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);run();});
  query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,350);});
  type.addEventListener('change',()=>{clearTimeout(timer);run();});
  language.addEventListener('change',()=>{
    const url = new URL('/search/',location.origin);url.searchParams.set('q',query.value);url.searchParams.set('lang',language.value);
    if (type.value) url.searchParams.set('type',type.value);
    try {localStorage.setItem('forqan-language',language.value);} catch {}
    location.assign(url.pathname+url.search);
  });
  run();
}
