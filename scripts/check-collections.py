"""Check real generated directory entries, translated destinations, and shared studies."""
import json,sys
from pathlib import Path
from library_content import Document,clean
from library_collections import alphabet
site=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
data=json.loads((site/'assets/data/collections.json').read_text())
entries={e['url']:e for e in data['studies']}
seen=set()
for collection in data['collections']:
    source=(site/collection['url'].strip('/')/'index.html').read_text()
    root=Document(source).root
    links=[e for e in root.walk() if 'data-study-link' in e.attrs]
    urls=[e.attrs['href'] for e in links]
    assert len(urls)==len(set(urls))==collection['count'],collection['url']
    assert 'forqan-pathway-shell' not in source[source.index('<body'):],collection['url']
    assert 'data-pagefind-body' not in source
    assert '<!-- STUDY_COLLECTION -->' not in source
    for url,link in zip(urls,links):
        assert url in entries,url
        assert entries[url]['title'] == link.attrs.get('title') or entries[url]['title'] in clean(link),url
        seen.add(url)
    if '/quran-terminology/' in collection['url']:
        lang=collection['url'].split('/')[1]
        concepts=[entries[u]['concept'] for u in urls]
        assert concepts==sorted(concepts,key=lambda c:alphabet(c,lang))
        for slug in ('salat-in-the-quran','zakat-and-its-historical-distortion','book-of-riba-beyond-interest'):
            assert '/'+lang+'/articles/'+slug+'/' in urls
assert seen==set(entries),'Study absent from all collections'
for lang in ('en','fa'):
    other='fa' if lang=='en' else 'en'
    for slug in ('quranic-marriage','cutting-the-thiefs-hand-in-the-quran'):
        url=f'/{lang}/articles/{slug}/'
        assert url in entries
        root=Document((site/url.strip('/')/'index.html').read_text()).root
        context=root.first(lambda e:e.has_class('study-context'))
        assert context and any(e.attrs.get('href')==f'/{other}/articles/{slug}/' for e in context.walk())
for url,item in entries.items():
    root=Document((site/url.strip('/')/'index.html').read_text()).root
    assert root.first(lambda e:e.has_class('study-context'))
    for related in item.get('related',[]):
        assert related in entries and entries[related]['lang']==item['lang']
    # Added navigation and related reading must not contaminate search excerpts.
    main=root.first(lambda e:e.attrs.get('id')=='main-content')
    assert 'Back to your list' not in clean(main)
assert not (site/'assets/data/study-metadata.json').exists()
print(f'Passed collection counts, unique entries, full titles, alphabetical concepts, shared studies, and restored translations: {len(entries)} studies.')
