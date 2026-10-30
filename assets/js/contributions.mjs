import {normalize} from './search-utils.mjs';

export function searchContributions(records, {lang, query = '', sort = 'newest'} = {}) {
  const words = normalize(query).split(' ').filter(Boolean);
  const matches = records.filter(r => r.lang === lang && words.every(word =>
    normalize([r.title, r.author, r.topic, r.text].join(' ')).includes(word)));
  const collator = new Intl.Collator(lang, {sensitivity: 'base', numeric: true});
  const title = (a, b) => collator.compare(a.title, b.title);
  matches.sort(sort === 'author' ? (a, b) => collator.compare(a.author, b.author) || title(a, b)
    : sort === 'title' ? title
    : sort === 'oldest' ? (a, b) => a.date.localeCompare(b.date) || title(a, b)
    : (a, b) => b.date.localeCompare(a.date) || title(a, b));
  return matches;
}

export function mountContributions(root) {
  const lang = root.lang, fa = lang === 'fa';
  const form = root.querySelector('form');
  const query = form.elements.query, sort = form.elements.sort;
  const list = root.querySelector('.contribution-list');
  const rows = new Map([...list.children].map(row => [row.dataset.contributionUrl, row]));
  const status = root.querySelector('[role="status"]');
  const empty = root.querySelector('#contribution-empty');
  let records;
  let loading;
  const load = () => loading ||= fetch(`/assets/data/contributions-${lang}.json`).then(response => {
    if (!response.ok) throw Error('Unable to load submissions');
    return response.json();
  }).then(data => {
    if (!Array.isArray(data) || data.some(r => r.lang !== lang || !r.url.startsWith(`/${lang}/contributions/`))) throw Error('Invalid submission catalogue');
    return data;
  }).catch(error => { loading = undefined; throw error; });
  async function update() {
    try {
      records ||= await load();
      const matches = searchContributions(records, {lang, query: query.value, sort: sort.value});
      rows.forEach(row => { row.hidden = true; });
      for (const record of matches) {
        const row = rows.get(record.url);
        if (row) { row.hidden = false; list.append(row); }
      }
      empty.hidden = matches.length > 0;
      empty.textContent = records.length ? (fa ? 'نوشته‌ای مطابق جستجوی شما پیدا نشد.' : 'No submissions match your search.')
        : (fa ? 'هنوز نوشته‌ای به زبان فارسی در این بخش منتشر نشده است.' : 'No English submissions have been published yet.');
      status.textContent = fa ? `${matches.length.toLocaleString('fa')} نوشته` : `${matches.length} submissions`;
    } catch {
      // Preserve the server-rendered list and allow a retry; never use central search.
      status.textContent = fa ? 'جستجوی این بخش بارگیری نشد. لطفاً دوباره کوشش کنید.' : 'This section’s search could not load. Please try again.';
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); update(); });
  query.addEventListener('input', update);
  sort.addEventListener('change', update);
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-contributions]');
  if (root) mountContributions(root);
}
