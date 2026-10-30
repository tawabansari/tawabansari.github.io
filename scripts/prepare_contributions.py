"""Build independent submission lists and language-specific search data.

This catalogue is intentionally never passed to prepare_collections, Pagefind,
central suggestions, featured reading, or Tabsira's Quran catalogue.
"""
import json
import re
from datetime import date
from html import escape
from pathlib import Path
from library_content import Document, clean


def read_submission(path, lang, url):
    root = Document(path.read_text()).root
    metadata = root.first(lambda e: e.attrs.get('id') == 'contribution-metadata')
    body = root.first(lambda e: 'data-contribution-body' in e.attrs)
    if metadata is None or body is None:
        raise ValueError('Use the contributed-study layout: ' + url)
    record = json.loads(''.join(c for c in metadata.children if isinstance(c, str)))
    for key in ('title', 'author', 'topic', 'date'):
        if not isinstance(record.get(key), str) or not record[key].strip():
            raise ValueError('Missing submission ' + key + ': ' + url)
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', record['date']):
        raise ValueError('Use YYYY-MM-DD for publication_date: ' + url)
    date.fromisoformat(record['date'])
    record.update(url=url, lang=lang, text=clean(body))
    return record


def render_row(record, lang):
    e = lambda value: escape(value, quote=True)
    author, topic, language, published = ('نویسنده', 'موضوع', 'زبان', 'تاریخ انتشار') if lang == 'fa' else ('Author', 'Subject', 'Language', 'Published')
    language_name = 'فارسی' if lang == 'fa' else 'English'
    return (f'<li class="contribution-row" data-contribution-url="{e(record["url"])}">'
            f'<h2><a href="{e(record["url"])}">{e(record["title"])}</a></h2>'
            '<dl>'
            f'<div><dt>{author}</dt><dd>{e(record["author"])}</dd></div>'
            f'<div><dt>{topic}</dt><dd>{e(record["topic"])}</dd></div>'
            f'<div><dt>{language}</dt><dd>{language_name}</dd></div>'
            f'<div><dt>{published}</dt><dd><time datetime="{e(record["date"])}">{e(record["date"])}</time></dd></div>'
            '</dl></li>')


def prepare(site):
    output = site / 'assets/data'
    output.mkdir(parents=True, exist_ok=True)
    for lang in ('fa', 'en'):
        directory = site / lang / 'contributions'
        if not directory.exists():
            continue
        records = []
        for path in sorted(directory.rglob('*.html')):
            if path == directory / 'index.html':
                continue
            rel = path.relative_to(site).as_posix()
            url = '/' + (rel[:-10] if rel.endswith('index.html') else rel)
            records.append(read_submission(path, lang, url))
        # The directory's selected order is applied by the same client sorter;
        # publication order is also stable when JavaScript is unavailable.
        records.sort(key=lambda r: (r['date'], r['title']), reverse=True)
        (output / f'contributions-{lang}.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')))
        path = directory / 'index.html'
        source = path.read_text()
        rows = ''.join(render_row(r, lang) for r in records)
        source = source.replace('<!-- CONTRIBUTION_ROWS -->', rows)
        if records:
            source = source.replace('id="contribution-empty"', 'id="contribution-empty" hidden')
        path.write_text(source)
