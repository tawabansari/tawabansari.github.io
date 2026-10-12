#!/usr/bin/env python3
"""Search metadata for the finished site, using published content only."""
import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote, urlsplit
from library_content import Document, clean, shorten

ORIGIN = 'https://forqan.co'
NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'


def destination(site, url):
    path = unquote(urlsplit(url).path)
    return site / (path.lstrip('/') + ('index.html' if path.endswith('/') else ''))


def main():
    site = Path(sys.argv[1] if len(sys.argv) > 1 else '_site')
    library = json.loads((site / 'assets/data/library.json').read_text())
    pages = {p['url']: p for p in library['pages']}
    eligible = set()
    for url, entry in pages.items():
        path = destination(site, url)
        source = path.read_text()
        root = Document(source).root
        canonical = root.first(lambda e: e.tag == 'link' and e.attrs.get('rel') == 'canonical')
        if not canonical or canonical.attrs.get('href') != ORIGIN + url:
            continue
        main_content = root.first(lambda e: e.attrs.get('id') == 'main-content')
        # Preserve explicitly authored descriptions, otherwise reuse visible content.
        meta = root.first(lambda e: e.tag == 'meta' and e.attrs.get('name') == 'description')
        description = (meta.attrs.get('content') if meta and meta.attrs.get('data-description-source') != 'site' else '') or entry.get('description')
        if not description and entry['kind'] == 'Quran':
            count = len([a for a in entry.get('anchors', []) if re.fullmatch(r'ayah-\d+', a)])
            description = (f"{entry['title']}: Arabic text, English translation, and Qur’an-by-Qur’an reflections for {count} published verses."
                           if entry['lang'] == 'en' else
                           f"{entry['title']}: متن عربی، ترجمهٔ فارسی و تأمل قرآن با قرآن برای {count} آیهٔ منتشرشده.")
        if not description and main_content:
            node = main_content.first(lambda e: e.has_class('root-subtitle'))
            if node is None:
                node = main_content.first(lambda e: e.tag == 'p' and len(clean(e)) > 60)
            description = clean(node)
        if description:
            description = shorten(' '.join(description.split()), 220)
            tag = '<meta name="description" content="' + html.escape(description, quote=True) + '">'
            source = re.sub(r'<meta\b[^>]*name="description"[^>]*>', lambda m: tag, source, count=1)
        # Use only reciprocal, published translations; never point to a fallback hub.
        alternate = entry.get('translation')
        links = []
        if alternate in pages and pages[alternate].get('translation') == url:
            for target in sorted([url, alternate]):
                links.append(f'<link rel="alternate" hreflang="{pages[target]["lang"]}" href="{html.escape(ORIGIN + target, quote=True)}">')
        if url in ('/', '/en/', '/fa/'):
            links = [f'<link rel="alternate" hreflang="{lang}" href="{ORIGIN}{target}">' for lang, target in [('en', '/en/'), ('fa', '/fa/'), ('x-default', '/')]]
        # The search interface has no results without a query; index the studies themselves.
        if url == '/search/':
            links.append('<meta name="robots" content="noindex,follow">')
        block = '<!-- discovery:start -->\n' + '\n'.join(links) + '\n<!-- discovery:end -->'
        source = re.sub(r'<!-- discovery:start -->.*?<!-- discovery:end -->\s*', '', source, flags=re.S)
        source = source.replace('</head>', block + '\n</head>', 1)
        path.write_text(source)
        if url != '/search/' and not re.search(r'<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex', source, re.I):
            eligible.add(ORIGIN + url)

    # include_relative source fragments were copied as standalone public HTML.
    # Keep their old URLs working, but send visitors/crawlers to the complete chapter.
    fragments = 0
    for path in site.glob('quran-reflection/*/*/units/*.html'):
        parent_url = '/' + path.parent.parent.relative_to(site).as_posix() + '/'
        if parent_url not in pages:
            raise ValueError('Fragment has no published chapter: ' + str(path))
        source = path.read_text()
        match = re.search(r'id="(ayah-\d+)"', source)
        if not match:
            # Permit rerunning this step on its own generated redirect.
            match = re.search(r'#(ayah-\d+)', source)
        if not match or match[1] not in pages[parent_url].get('anchors', []):
            raise ValueError('Fragment has no published verse: ' + str(path))
        target = parent_url + '#' + match[1]
        lang = pages[parent_url]['lang']
        label = 'Read this verse in its chapter' if lang == 'en' else 'خواندن این آیه در سوره'
        path.write_text(f'<!DOCTYPE html>\n<html lang="{lang}"><head><meta charset="utf-8">'
                        f'<title>{label}</title><link rel="canonical" href="{ORIGIN}{parent_url}">'
                        f'<meta http-equiv="refresh" content="0;url={target}"></head>'
                        f'<body><p><a href="{target}">{label}</a></p></body></html>\n')
        fragments += 1

    # Retain Jekyll's dates and sitemap:false choices; remove noncanonical entries.
    sitemap = site / 'sitemap.xml'
    tree = ET.parse(sitemap)
    ET.register_namespace('', NS)
    kept = 0
    for node in list(tree.getroot()):
        if node.findtext(f'{{{NS}}}loc') not in eligible:
            tree.getroot().remove(node)
        else:
            kept += 1
    tree.write(sitemap, encoding='utf-8', xml_declaration=True)
    print(f'Discovery: {kept} canonical sitemap URLs; {fragments} fragment URLs redirect to their chapters.')


if __name__ == '__main__':
    main()
