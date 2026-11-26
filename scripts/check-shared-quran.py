#!/usr/bin/env python3
"""Validate generated shared verses against their canonical Arabic/translation."""
import json
import re
import sys
from pathlib import Path
from library_content import Document, clean
from shared_quran import VerseStore
from migrate_article_verses import article_scope

site=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
root=Path(__file__).resolve().parent.parent
store=VerseStore(root)
deps=json.loads((site/'assets/data/verse-dependencies.json').read_text())
urls=sorted({page for dep in deps.values() for page in dep['pages']})
expected={}
for url,path in article_scope(root).items():
    refs=[ref for marker in re.findall(r'data-quran-verses="([^"]+)"',(root/path).read_text()) for ref in marker.split()]
    if refs:expected[url]=refs
assert set(expected)<=set(urls), 'A source article is missing from generated dependencies'
count=0
for url in urls:
    path=site/url.lstrip('/')/'index.html'
    source=path.read_text()
    assert 'data-quran-verses=' not in source, f'Unresolved marker: {url}'
    assert '/assets/css/shared-quran.css' in source, f'Missing shared style: {url}'
    actual=[]
    for el in Document(source).root.walk():
        if not el.has_class('shared-verse'):continue
        lang=el.attrs['data-verse-language'];ref=el.attrs['data-canonical-verse']
        actual.append(ref)
        canonical=store.get(lang,*map(int,ref.split(':')))
        assert el.attrs['data-source-sha256']==canonical['sha256'], f'Stale source: {url} {ref}'
        assert clean(el.first(lambda e:e.has_class('arabic-text')))==canonical['arabic'], f'Arabic mismatch: {url} {ref}'
        assert clean(el.first(lambda e:e.has_class('translation')))==canonical['translation'], f'Translation mismatch: {url} {ref}'
        citation=el.first(lambda e:e.tag=='a' and e.attrs.get('href')==canonical['url'])
        assert citation is not None, f'Missing verse destination: {url} {ref}'
        assert el.first(lambda e:e.attrs.get('data-type')=='reflection') is None
        assert url in deps[f'{lang}:{ref}']['pages']
        count+=1
    if url in expected:assert actual==expected[url], f'Verse sequence/count differs from source: {url}'
assert count, 'No shared verses found'
print(f'Shared Quran quotations verified: {count} verses across {len(urls)} pages.')
