"""Regressions for stable search links, availability, and article previews."""
import json
import re
from pathlib import Path
from library_content import Document, clean
from library_enrichment import stable_anchors, unavailable_references

body='<main id="main-content"><h2>A heading</h2><p>A passage with <em>emphasis</em>.</p><p id="authored">Preserved.</p></main>'
before=stable_anchors(body)
after=stable_anchors(body.replace('<h2>', '<p>A new introduction.</p><h2>',1))
def paragraph_id(source):
    return Document(source).root.first(lambda e:e.tag=='p' and 'emphasis' in clean(e)).attrs['id']
assert paragraph_id(before)==paragraph_id(after)
assert 'id="authored"' in before and 'id="search-passage-1"' in before
assert clean(Document(body).root)==clean(Document(before).root)
assert stable_anchors(before)==before
chapter='/quran-reflection/en/002-al-baqarah/'
root='/quran-terminology/en/roots/example/'
pages={chapter:{'anchors':['ayah-001']}}
fixture=f'<a href="{chapter}#ayah-001">Published</a><a href="{chapter}#ayah-002">Citation</a><a href="https://forqan.co{root}">Root</a><button data-learn-more="{root}">Word</button><a href="https://example.org{root}">External</a>'
enriched=unavailable_references(fixture,chapter,'en',pages,{})
doc=Document(enriched).root
links=[e for e in doc.walk() if e.tag=='a']
assert 'href' in links[0].attrs and 'href' not in links[1].attrs and 'href' not in links[2].attrs and 'href' in links[3].attrs
assert 'Citation' in clean(links[1]) and links[1].attrs.get('aria-disabled')=='true'
assert 'data-unpublished-learn-more' in enriched
pages[chapter]['anchors'].append('ayah-002');pages[root]={}
assert unavailable_references(fixture,chapter,'en',pages,{})==fixture

site=Path('_site');manifest=json.loads((site/'assets/data/library.json').read_text())
pages={p['url']:p for p in manifest['pages']};redirects=manifest['redirects'];pending=0
for url in pages:
    source=(site/url.strip('/')/'index.html').read_text()
    # Enrichment is idempotent: no remaining active unpublished study references.
    assert unavailable_references(source,url,pages[url]['lang'],pages,redirects)==source,url
    pending+=source.count('data-unpublished-reference=')
    assert 'forqan-font-reset' not in source,url
for lang in ('en','fa'):
    source=(site/f'quran-reflection/{lang}/002-al-baqarah/index.html').read_text()
    assert 'setTimeout(restore,' not in source
    assert "highlightTarget.classList.remove('link-highlight')" not in source
    for collection in ('quran-terminology','articles/reflections'):
        doc=Document((site/f'{lang}/{collection}/index.html').read_text()).root
        for link in doc.walk():
            if 'data-study-link' in link.attrs:
                assert link.attrs.get('data-preview-title') and link.attrs.get('data-preview-summary'),link.attrs
print(f'Passed stable anchors after insertions, legacy anchors, unchanged text, publication activation, previews in both languages, and {pending} unavailable citations.')
