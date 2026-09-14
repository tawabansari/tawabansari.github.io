#!/usr/bin/env python3
"""Enrich generated HTML only. Authored pages and their existing anchors are untouched."""
import html
import json
import re
import sys
from pathlib import Path
from html.parser import HTMLParser
from library_content import extract
from library_collections import prepare as prepare_collections

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.title = []; self.heading = []; self.ids = []; self.in_title = False
        self.in_h1 = False; self.lang = 'en'; self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html': self.lang = attrs.get('lang', 'en')
        if tag == 'title': self.in_title = True
        if tag == 'h1' and not self.heading: self.in_h1 = True
        if attrs.get('id'): self.ids.append(attrs['id'])
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'h1': self.in_h1 = False
    def handle_data(self, data):
        if self.in_title: self.title.append(data)
        if self.in_h1: self.heading.append(data)

def plain(s):
    return html.unescape(re.sub('<[^>]+>', '', s)).strip()

def main():
    site = Path(sys.argv[1] if len(sys.argv)>1 else '_site').resolve()
    if not (site/'index.html').exists(): raise SystemExit('Build Jekyll before preparing the library.')
    pages = {}; sources = {}; redirects = {}
    for path in sorted(site.rglob('*.html')):
        if 'pagefind' in path.parts: continue
        source = path.read_text(); rel = path.relative_to(site).as_posix()
        url = '/' + (rel[:-10] if rel.endswith('index.html') else rel)
        if '<main class="container"' not in source: continue
        redirect = re.search(r'<meta[^>]+http-equiv=["\x27]refresh["\x27][^>]+content=["\x27][^"\x27]*url=([^"\x27]+)', source, re.I)
        if redirect:
            redirects[url] = html.unescape(redirect[1]); sources[url] = (path, source); continue
        # Add stable heading anchors only to the generated content region.
        if 'id="main-content"' in source:
            start = source.index('id="main-content"'); end = source.index('</main>',start)
            region = source[start:end]; used = set(re.findall(r'\bid="([^"]+)"',source)); number = [0]
            def heading_id(m):
                if re.search(r'\bid=',m[2]): return m[0]
                number[0] += 1; anchor = 'study-section-'+str(number[0])
                while anchor in used: anchor += '-'
                used.add(anchor)
                return '<'+m[1]+m[2]+' id="'+anchor+'">'
            region = re.sub(r'<(h[23])([^>]*)>',heading_id,region)
            number[0] = 0
            def passage_id(m):
                if re.search(r'\bid=',m[2]): return m[0]
                number[0] += 1; anchor = 'search-passage-'+str(number[0])
                while anchor in used: anchor += '-'
                used.add(anchor)
                return '<'+m[1]+m[2]+' id="'+anchor+'">'
            region = re.sub(r'<(p|li)([^>]*)>',passage_id,region)
            source = source[:start]+region+source[end:]
        parsed = Page(source)
        title = ' '.join(''.join(parsed.heading or parsed.title).split()).split(' | ')[0]
        if '/roots/' in url and not url.endswith('/roots/'): kind = 'Roots'
        elif re.search(r'/quran-reflection/(en|fa)/\d', url): kind = 'Quran'
        elif '/articles/' in url or '/quran-terminology/' in url or '/hadith-critique/' in url or '/quran-completeness/' in url or '/salat/' in url: kind = 'Articles'
        else: kind = 'Guide'
        pages[url] = dict(url=url,title=title,lang=parsed.lang,kind=kind)
        if kind == 'Quran': pages[url]['anchors'] = parsed.ids
        sources[url] = (path,source)
    pairs_path = Path(__file__).resolve().parent.parent/'_data/translation-pairs.json'
    explicit = {}
    for en,fa in json.loads(pairs_path.read_text()):
        if en not in pages or fa not in pages: raise SystemExit('Invalid translation pair: '+en+' '+fa)
        explicit[en]=fa; explicit[fa]=en
    for url, entry in pages.items():
        lang=entry['lang']; other='en' if lang=='fa' else 'fa'
        candidate=explicit.get(url,url.replace('/'+lang+'/', '/'+other+'/',1))
        if candidate not in pages:
            candidate = re.sub(r'-(en|fa)/$', '-'+other+'/', candidate)
        if candidate in pages and candidate != url: entry['translation']=candidate
    prepare_collections(site,pages,sources,redirects)
    reading = {}
    for entry in pages.values():
        if entry['kind']=='Quran':
            reading.setdefault(entry['lang'],{})[entry['url'].strip('/').split('/')[-1]] = [a for a in entry.get('anchors',[]) if re.match(r'^ayah-\d+$',a)]
    unavailable = {}
    search_records = []
    features = []
    for url,(path,source) in sources.items():
        if url in redirects or url in ['/', '/en/', '/fa/', '/search/'] or url.endswith('/roots/') or url.endswith('/surahs/'):
            source=source.replace(' data-pagefind-body','')
        entry=pages.get(url)
        if entry and (entry['kind']=='Quran' or url.endswith('/surahs/')):
            source=source.replace('<script src="/assets/js/quran-navigation-data.js">','<script>window.FORQAN_READING_AVAILABILITY='+json.dumps(reading,separators=(',',':'))+';</script>\n<script src="/assets/js/quran-navigation-data.js">')
        if entry and 'data-pagefind-body' in source:
            records, selections = extract(entry, source)
            search_records.extend(records); features.extend(selections)
        if entry:
            source=source.replace('id="main-content"', 'id="main-content" data-pagefind-filter="type:'+entry['kind']+'"')
            def mirror(m):
                attrs=m[1]; lang=re.search(r'data-language="(en|fa)"',attrs)[1]
                target=url if lang==entry['lang'] else entry.get('translation','/'+lang+'/')
                attrs=re.sub(r'href="[^"]*"','href="'+html.escape(target,quote=True)+'"',attrs)
                if lang != entry['lang'] and not entry.get('translation'):
                    attrs += ' title="'+('Browse the English library' if lang=='en' else 'مرور بخش فارسی')+'"'
                return '<a'+attrs+'>'
            source=re.sub(r'<a([^>]*data-language="(?:en|fa)"[^>]*)>',mirror,source)
        if url.endswith('/surahs/') or url.endswith('/roots/'):
            missing=[]
            def availability(m):
                attrs,inner=m[1],m[2]
                href=re.search(r'href="([^"]+)"',attrs)
                if not href: return m[0]
                target=html.unescape(href[1]).split('#')[0]
                if not re.search(r'^/quran-(reflection|terminology)/(en|fa)/',target): return m[0]
                if target in pages or target in redirects: return m[0]
                missing.append(target)
                attrs=re.sub(r'\s+href="[^"]+"','',attrs)
                attrs+=' aria-disabled="true" data-unpublished-url="'+html.escape(target,quote=True)+'"'
                label='هنوز منتشر نشده' if entry['lang']=='fa' else 'Not yet published'
                return '<a'+attrs+'>'+inner+'<span class="availability-label" data-pagefind-ignore>'+label+'</span></a>'
            source=re.sub(r'<a([^>]*href="[^"]+"[^>]*)>(.*?)</a>',availability,source,flags=re.S)
            unavailable[url]=len(missing)
        path.write_text(source)
    out=site/'assets/data'; out.mkdir(parents=True,exist_ok=True)
    (out/'library.json').write_text(json.dumps({'pages':list(pages.values()),'redirects':redirects},ensure_ascii=False,separators=(',',':')))
    (out/'search-records.json').write_text(json.dumps(search_records,ensure_ascii=False,separators=(',',':')))
    (out/'features.json').write_text(json.dumps(features,ensure_ascii=False,separators=(',',':')))
    # Render a real selection before JavaScript runs; feature rotation enhances it.
    for home_url,lang in [('/', 'en'),('/en/', 'en'),('/fa/', 'fa')]:
        first=next(f for f in features if f['kind']=='Quran' and f['lang']==lang)
        label='گزیده' if lang=='fa' else 'Excerpt'
        read='مطالعه این آیه' if lang=='fa' else 'Read this verse'
        feature_html='<h2 id="feature-heading">'+html.escape(first['title'])+'</h2><p class="feature-arabic" lang="ar" dir="rtl">'+html.escape(first['arabic'])+'</p><p class="feature-excerpt"><span class="excerpt-label">'+label+'</span>'+html.escape(first['excerpt'])+'</p><a class="feature-read" href="'+html.escape(first['url'])+'">'+read+'</a>'
        home=site/(home_url.strip('/')+'/index.html' if home_url!='/' else 'index.html')
        home.write_text(home.read_text().replace('<!-- ARCHIVE_FEATURE -->',feature_html))
    print('Prepared',len(pages),'published pages; excluded',len(redirects),'redirect pages from search.')
    print('Unpublished index destinations:', json.dumps(unavailable))

if __name__=='__main__': main()
