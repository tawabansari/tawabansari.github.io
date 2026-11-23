"""Check the published exchange catalog and its discussion destinations."""
import json,sys,re
from pathlib import Path
from html.parser import HTMLParser

class DiscussionActions(HTMLParser):
    """Count actual discussion elements, excluding CSS, scripts and comments."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.count = 0

    def handle_starttag(self, tag, attrs):
        if any(name == "data-tabsira-discuss" for name, value in attrs):
            self.count += 1

def discussion_count(source):
    parser = DiscussionActions()
    parser.feed(source)
    parser.close()
    return parser.count

# Inline styling must not look like a duplicate, but real duplicates still fail.
fixture = '<style>[data-tabsira-discuss]{margin:0}</style><script>const x="data-tabsira-discuss";</script><!-- <p data-tabsira-discuss> -->'
assert discussion_count(fixture) == 0
assert discussion_count(fixture + '<p data-tabsira-discuss><a>Discuss</a></p>') == 1
assert discussion_count('<p data-tabsira-discuss></p><p data-tabsira-discuss=""></p>') == 2

site=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
data=json.loads((site/'assets/data/tabsira-catalog.json').read_text())
assert data['version']==1 and data['sources']
seen=set()
for s in data['sources']:
    assert s['path'] not in seen;seen.add(s['path'])
    source=(site/s['path'].strip('/')/'index.html').read_text()
    assert discussion_count(source) == 1, s['path']
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
