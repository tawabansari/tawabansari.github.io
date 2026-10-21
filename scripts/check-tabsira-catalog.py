"""Check the published exchange catalog and its discussion destinations."""
import json,sys,re
from pathlib import Path
site=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
data=json.loads((site/'assets/data/tabsira-catalog.json').read_text())
assert data['version']==1 and data['sources']
seen=set()
for s in data['sources']:
    assert s['path'] not in seen;seen.add(s['path'])
    source=(site/s['path'].strip('/')/'index.html').read_text()
    assert source.count('data-tabsira-discuss') == 1, s['path']
    assert 'class="tabsira-source-link"' in source, s['path']
    assert 'https://tabsira.forqan.co'+s['path'] in source, s['path']
    assert s['title'] and s['lang'] in ('fa','en')
    if s['kind']=='chapters':
        assert s['id']=='chapter:'+s['path'].strip('/').split('/')[-1]
        for v in s['available']:assert re.search(r'id=["\']ayah-0*'+str(v)+r'["\']',source),s['path']
    else: assert s['id']=='article:'+s['path']
# Terminology is a collection kind, and must not be silently dropped again.
pages=json.loads((site/'assets/data/library.json').read_text())['pages']
for p in pages:
    if p['kind'] in ('Roots','Terminology') and not p['url'].endswith('/roots/'):
        assert p['url'] in seen,p['url']
print('Verified',len(seen),'discussion destinations and published verse anchors')

# Every catalogued book must have the same discussion destination as articles.
repo=Path(__file__).resolve().parent.parent
for work in json.loads((repo/'_data/study-catalog.json').read_text()):
    if work.get('format')=='book':assert work['url'] in seen,work['url']
