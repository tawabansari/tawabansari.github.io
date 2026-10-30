"""Verify independent search input and the real bilingual section boundaries."""
import json
import sys
import tempfile
from pathlib import Path
from contribution_scope import is_contribution
from prepare_contributions import prepare, read_submission
from library_content import Document

# Exercise populated catalogues without publishing invented writings.
with tempfile.TemporaryDirectory() as tmp:
    fixture = Path(tmp)
    for lang in ('fa', 'en'):
        base = fixture / lang / 'contributions'
        base.mkdir(parents=True)
        (base / 'index.html').write_text('<ol><!-- CONTRIBUTION_ROWS --></ol><p id="contribution-empty">Empty</p>')
        for slug, when in [('older', '2024-01-01'), ('newer', '2026-10-29')]:
            dest = base / slug
            dest.mkdir()
            meta = dict(title='Test <title>', author='Author & Co', topic='Subject', date=when)
            (dest / 'index.html').write_text('<script id="contribution-metadata" type="application/json">' + json.dumps(meta) + '</script><div data-contribution-body><p>UniqueSentinelFullText</p></div>')
    prepare(fixture)
    for lang in ('fa', 'en'):
        rows = json.loads((fixture / f'assets/data/contributions-{lang}.json').read_text())
        assert all(r['lang'] == lang and is_contribution(r['url']) for r in rows)
        assert rows[0]['date'] == '2026-10-29'
        assert rows[0]['text'] == 'UniqueSentinelFullText'
        html = (fixture / lang / 'contributions/index.html').read_text()
        assert 'Test &lt;title&gt;' in html and 'Author &amp; Co' in html
        assert 'id="contribution-empty" hidden' in html
    broken = fixture / 'en/contributions/older/index.html'
    broken.write_text(broken.read_text().replace('2024-01-01', '2024-99-99'))
    try:
        read_submission(broken, 'en', '/en/contributions/older/')
    except ValueError:
        pass
    else:
        raise AssertionError('Invalid publication date accepted')

site = Path(sys.argv[1] if len(sys.argv) > 1 else '_site')
for lang in ('fa', 'en'):
    root = Document((site / lang / 'contributions/index.html').read_text()).root
    main = root.first(lambda e: e.attrs.get('id') == 'main-content')
    assert 'data-pagefind-ignore' in main.attrs and 'data-pagefind-body' not in main.attrs
    assert root.first(lambda e: e.attrs.get('name') == 'query')
    assert root.first(lambda e: e.attrs.get('name') == 'sort')
    rows = json.loads((site / f'assets/data/contributions-{lang}.json').read_text())
    assert all(r['lang'] == lang for r in rows)
    hub = Document((site / lang / 'articles/index.html').read_text()).root
    assert len([e for e in hub.walk() if 'data-contribution-entrance' in e.attrs]) == 1
    assert len([e for e in hub.walk() if e.has_class('collection-card')]) == 5
    assert '/contributions/' not in (site / lang / 'index.html').read_text()
    assert not root.first(lambda e: e.attrs.get('data-language') == ('en' if lang == 'fa' else 'fa')).attrs['href'].endswith('/index.html')
for filename in ('library.json', 'collections.json', 'features.json', 'search-records.json'):
    path = site / 'assets/data' / filename
    if path.exists():
        assert '/contributions/' not in path.read_text(), 'Submission leaked into ' + filename
print('Passed submission metadata, full-text extraction, separate languages, empty state, hub-only entrances, and central catalogue exclusion.')
