"""Check stable principle records, split citations, installed evidence and search isolation."""
import json,re,sys
from pathlib import Path
from library_content import Document,clean
root=Path(__file__).resolve().parent.parent
site=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
rows=json.loads((root/'_data/quran-principles.json').read_text()); ids={r['id'] for r in rows}
assert len(ids)==len(rows)
for r in rows:
    assert r['polarity'] in ('positive','negative') and r['primary'] in r['refs']
    assert set(r['related'])<=ids and r['id'] not in r['related']
    assert len(r['refs'])==len(set(tuple(x) for x in r['refs']))
    for lang in ('fa','en'):
        assert r[lang]['title'] and r[lang]['description']
        path=site/lang/'principles'/r['id']/'index.html';source=path.read_text()
        assert '<!-- PRINCIPLE_' not in source
        main=Document(source).root.first(lambda e:e.has_class('principle-detail'))
        assert main and clean(main.first(lambda e:e.has_class('arabic-text')))
        assert clean(main.first(lambda e:e.has_class('principle-translation')))
        for e in main.walk():
            href=e.attrs.get('href','')
            if not href.startswith('/'):continue
            url,_,anchor=href.partition('#');target=site/(url.strip('/')+'/index.html')
            assert target.exists(),href
            if anchor:assert re.search(r'\bid=["\']'+re.escape(anchor)+r'["\']',target.read_text()),href
for source in {r['source'] for r in rows}:
    group=[r for r in rows if r['source']==source]
    if len(group)>1:
        assert {r['polarity'] for r in group}=={'positive','negative'}
        assert all(r['refs']==group[0]['refs'] for r in group)
for lang in ('fa','en'):
    version=json.loads((site/'assets/data/search-version.json').read_text())
    catalog=json.loads((site/version['catalogs'][lang].lstrip('/')).read_text())
    if catalog:
        assert len([r for r in catalog['records'] if r['kind']=='Principles'])==len(rows)
        assert not any('/contributions/' in r['url'] for r in catalog['records'])
print('Passed bilingual principle content, permanent URLs, separate polarity, shared references and installed verse anchors.')
