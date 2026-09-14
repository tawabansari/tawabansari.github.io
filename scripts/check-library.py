#!/usr/bin/env python3
"""Check generated routes, availability, anchors, and featured excerpts."""
from pathlib import Path
from html.parser import HTMLParser
import json
import re
import sys

site=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
manifest=json.loads((site/'assets/data/library.json').read_text())
pages={p['url']:p for p in manifest['pages']}
for url,page in pages.items():
    file=site/url.lstrip('/')/'index.html'
    assert file.exists(),url
    text=file.read_text()
    assert '<html lang="'+page['lang']+'">' in text,url
    for anchor in page.get('anchors',[]): assert 'id="'+anchor+'"' in text,(url,anchor)
    if page.get('translation'):
        assert page['translation'] in pages,(url,'translation')
        assert pages[page['translation']]['lang'] != page['lang']
for url in manifest['redirects']:
    assert 'data-pagefind-body' not in (site/url.lstrip('/')/'index.html').read_text()
for lang in ['en','fa']:
    for directory in [f'quran-reflection/{lang}/surahs',f'quran-terminology/{lang}/roots']:
        text=(site/directory/'index.html').read_text()
        for attrs in re.findall(r'<a([^>]*data-unpublished-url[^>]*)>',text):
            assert not re.search(r'\bhref=',attrs),attrs
            assert 'aria-disabled="true"' in attrs,attrs
    quran=pages[f'/quran-reflection/{lang}/002-al-baqarah/']
    assert quran['anchors'], 'No published verse anchors: '+lang
    text=(site/f'quran-reflection/{lang}/002-al-baqarah/index.html').read_text()
    assert 'window.FORQAN_READING_AVAILABILITY=' in text
home=(site/'index.html').read_text()
assert home.count('<main ')==1
assert 'data-pagefind-body' not in home
assert 'data-pagefind-body' not in (site/'search/index.html').read_text()
assert not (site/'node_modules').exists()
assert not (site/'scripts').exists()
print(f'Passed: {len(pages)} routes, translation targets, verse anchors, unpublished links, and search exclusions.')

from library_content import Document, clean
root=Document(home).root
for control in ['zoom-in','zoom-out','theme-toggle-btn']:
    assert len([e for e in root.walk() if e.attrs.get('id')==control])==1
    assert any(e.attrs.get('id')==control for e in root.first(lambda e:e.has_class('visible-reading-controls')).walk())
assert '<!-- ARCHIVE_FEATURE -->' not in home
assert 'feature-heading' in home
features=json.loads((site/'assets/data/features.json').read_text())
for lang in ['en','fa']:
    for kind in ['Quran','Roots','Articles']:
        pool=[f for f in features if f['lang']==lang and f['kind']==kind]
        assert len(pool)>1,(lang,kind)
        for item in pool:
            url,_,anchor=item['url'].partition('#')
            assert url in pages,item['url']
            source=(site/url.lstrip('/')/'index.html').read_text()
            if anchor:assert 'id="'+anchor+'"' in source,item['url']
            text=clean(Document(source).root)
            assert item['excerpt'].removesuffix(' …') in text,'Featured excerpt changed: '+item['url']
print('Passed visible controls, feature pools in both languages, live destinations, and verbatim excerpts.')
