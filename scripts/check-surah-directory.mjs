import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual generated search script in both languages.
for (const lang of ['en', 'fa']) {
  const html = readFileSync(`_site/quran-reflection/${lang}/surahs/index.html`, 'utf8');
  const cards = [...html.matchAll(/<a\b([^>]*class="landing-card"[^>]*)>([\s\S]*?)<\/a>/g)].map(([, attrs, body]) => ({
    hidden: false,
    textContent: body.replace(/<[^>]*>/g, ' '),
    querySelector: () => ({textContent: body.match(/<h2\b[^>]*>(.*?)<\/h2>/s)[1]}),
    getAttribute: name => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null,
    hasAttribute: name => attrs.includes(`${name}=`),
  }));
  assert.equal(cards.length, 114);
  let update;
  const input = {value: '', addEventListener: (_, fn) => { update = fn; }};
  const count = {};
  const check = {checked: true};
  const document = {
    documentElement: {lang},
    getElementById: id => ({surahSearch: input, surahSearchCount: count, 'published-only': check})[id],
    querySelectorAll: () => cards,
  };
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('const indexedCards'));
  vm.runInNewContext(script, {document});
  const visible = () => cards.filter(c => !c.hidden);
  const published = cards.filter(c => !c.hasAttribute('data-unpublished-url'));
  assert.equal(visible().length, published.length);
  check.checked = false; update(); assert.equal(visible().length, 114);
  input.value = 'imran'; update(); assert.ok(visible().length > 0);
  check.checked = true; update(); assert.equal(visible().length, 0);
  input.value = 'fatiha'; update(); assert.equal(visible().length, 1);
  input.value = ''; update(); assert.equal(visible().length, published.length);
  console.log(`${lang}: publication toggle, search, and clearing search passed (${published.length} published).`);
}
