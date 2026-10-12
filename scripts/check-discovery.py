#!/usr/bin/env python3
"""Check public search destinations after all build enrichment has finished."""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote, urlsplit
from library_content import Document

site = Path(sys.argv[1] if len(sys.argv) > 1 else '_site')
origin = 'https://forqan.co'


def file_for(url):
    path = unquote(urlsplit(url).path)
    return site / (path.lstrip('/') + ('index.html' if path.endswith('/') else ''))


def elements(source, tag):
    return [e for e in Document(source.split('</head>', 1)[0] + '</head></html>').root.walk() if e.tag == tag]


urls = [e.text for e in ET.parse(site / 'sitemap.xml').iter() if e.tag.endswith('}loc')]
assert urls and len(urls) == len(set(urls)), 'Empty or duplicate sitemap URLs'
assert origin + '/quran-reflection/en/001-al-fatihah/' in urls
assert origin + '/quran-reflection/fa/001-al-fatihah/' in urls
assert origin + '/search/' not in urls
for url in urls:
    assert '/units/' not in url, url
    assert url.startswith(origin + '/') and not urlsplit(url).fragment, url
    source = file_for(url).read_text()
    links = elements(source, 'link')
    canonical = [e.attrs.get('href') for e in links if e.attrs.get('rel') == 'canonical']
    assert canonical == [url], (url, canonical)
    assert not re.search(r'http-equiv=["\x27]refresh', source, re.I), url
    assert not any('noindex' in e.attrs.get('content', '') for e in elements(source, 'meta') if e.attrs.get('name') == 'robots'), url
    alternates = {e.attrs['hreflang']: e.attrs['href'] for e in links if 'hreflang' in e.attrs}
    for language, target in alternates.items():
        assert target in urls, (url, target)
        target_source = file_for(target).read_text()
        assert url in [e.attrs.get('href') for e in elements(target_source, 'link') if 'hreflang' in e.attrs], (url, 'nonreciprocal alternate', target)
        if language != 'x-default':
            assert elements(target_source, 'html')[0].attrs['lang'] == language

for path in site.glob('quran-reflection/*/*/units/*.html'):
    source = path.read_text()
    root = Document(source).root
    refresh = root.first(lambda e: e.tag == 'meta' and e.attrs.get('http-equiv') == 'refresh')
    assert refresh, path
    target = refresh.attrs['content'].split('url=', 1)[1]
    chapter = file_for(target).read_text()
    assert f'id="{urlsplit(target).fragment}"' in chapter, (path, target)
    assert 'class="ayah-block"' not in source, ('Raw duplicate verse', path)

for lang in ('en', 'fa'):
    for url in [f'/quran-reflection/{lang}/001-al-fatihah/', f'/quran-terminology/{lang}/roots/r-h-m/']:
        source = file_for(url).read_text()
        descriptions = [e.attrs['content'] for e in elements(source, 'meta') if e.attrs.get('name') == 'description']
        assert len(descriptions) == 1 and len(descriptions[0]) > 30, url
        assert 'reflective articles in English and Farsi' not in descriptions[0], url

print(f'Discovery checks passed: {len(urls)} canonical URLs, reciprocal languages, descriptions, and verse redirects.')
