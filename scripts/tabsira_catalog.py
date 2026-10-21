"""Publish discussion destinations from the rendered library, not a path whitelist."""
import json, re, html
from pathlib import Path
from datetime import datetime, timezone

def publish(site, pages, records):
    repo = Path(__file__).resolve().parent.parent
    raw = (repo/'assets/js/quran-navigation-data.js').read_text()
    chapters = json.loads(raw.split('=',1)[1].strip().rstrip(';'))
    entries = []
    by_url = {}
    for record in records:
        by_url.setdefault(record['url'].split('?')[0].split('#')[0], []).append(record)
    for path, page in pages.items():
        content = by_url.get(path, [])
        if not content or page['kind'] not in ('Quran','Articles','Terminology','Roots'): continue
        chapter = next((c for c in chapters if path.endswith('/'+c['slug']+'/')), None) if page['kind']=='Quran' else None
        available = sorted(set(int(a[5:]) for a in page.get('anchors',[]) if re.fullmatch(r'ayah-\d+',a))) if chapter else []
        if page['kind']=='Quran' and (not chapter or not available): continue
        # Keep the existing Tabsira IDs so earlier conversations remain attached.
        entry = dict(id='chapter:'+chapter['slug'] if chapter else 'article:'+path,
            path=path, lang=page['lang'], title=page['title'], kind='chapters' if chapter else 'articles',
            category='roots' if page['kind']=='Roots' else ('chapters' if chapter else 'articles'),
            chapter=chapter['number'] if chapter else None, verses=chapter['ayahs'] if chapter else None,
            available=available, published='', excerpt=(page.get('description') or content[0].get('description') or content[0].get('original',''))[:600])
        entries.append(entry)
        target='https://tabsira.forqan.co'+path
        label='گفت‌وگو در تبصره' if page['lang']=='fa' else 'Discuss on Tabsira'
        file=site/path.strip('/')/'index.html'
        if file.exists():
            source=file.read_text()
            if 'data-tabsira-discuss' not in source:
                link='<p data-tabsira-discuss data-pagefind-ignore><a class="tabsira-source-link" href="'+html.escape(target,quote=True)+'">'+label+' ↗</a></p>'
                source=re.sub(r'(</h1>)',lambda m:m[0]+link,source,count=1)
                file.write_text(source)
    if not entries: raise ValueError('Refusing to publish an empty Tabsira catalog')
    output=dict(version=1, generatedAt=datetime.now(timezone.utc).isoformat(), sources=entries)
    data=json.dumps(output,ensure_ascii=False,separators=(',',':'))
    if len(data.encode())>1500000: raise ValueError('Tabsira catalog exceeds size limit')
    (site/'assets/data/tabsira-catalog.json').write_text(data)
    print('Published',len(entries),'Tabsira discussion destinations')
