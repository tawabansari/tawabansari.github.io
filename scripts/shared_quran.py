"""Resolve article verse references at build time from the canonical Quran reader.

Only the direct Arabic/translation paragraphs of an ayah are used. Reflections,
notes and cross-references are never transcluded. No network requests are made.
"""
import hashlib
import html
import json
import re
from pathlib import Path
from library_content import Document, Element, clean
from verse_references import CHAPTERS

MARKER = re.compile(r'<div\b(?=[^>]*\bdata-quran-verses=)[^>]*>\s*</div>', re.S)

def translation_markup(node):
    """Keep authored translation links/emphasis without duplicating reader IDs."""
    if not isinstance(node, Element):
        return html.escape(node)
    body=''.join(translation_markup(c) for c in node.children)
    if node.tag not in ('a','em','strong','bdi','span','br'):
        return body
    attrs=''.join(f' {k}="{html.escape(v,quote=True)}"' for k,v in node.attrs.items() if k in ('href','lang','dir','title'))
    return f'<{node.tag}{attrs}>'+body+(f'</{node.tag}>' if node.tag!='br' else '')

class VerseStore:
    def __init__(self, root):
        self.root = Path(root)
        self.cache = {}

    def get(self, lang, chapter, verse):
        key = (lang, chapter, verse)
        if key in self.cache:
            return self.cache[key]
        if lang not in ('fa', 'en') or chapter not in CHAPTERS or not 1 <= verse <= CHAPTERS[chapter]['ayahs']:
            raise ValueError('Invalid verse: ' + str(key))
        slug = CHAPTERS[chapter]['slug']
        folder = self.root / 'quran-reflection' / lang / slug
        unit = folder / 'units' / f'{verse:03d}.html'
        source = unit if unit.exists() else folder / 'index.html'
        raw_source = source.read_text()
        doc = Document(raw_source).root
        copyright_notice = next((m[0] for m in re.finditer(r'<!--.*?-->',raw_source,re.S) if 'Tanzil' in m[0] and 'COPYRIGHT BLOCK' in m[0]), '')
        section = doc.first(lambda e: e.attrs.get('id') == f'ayah-{verse:03d}')
        if section is None:
            raise ValueError('Missing canonical ayah: ' + str(key))
        # Direct children only: nested reflection quotations must never win.
        children = [e for e in section.children if isinstance(e, Element)]
        arabic = next((e for e in children if e.has_class('arabic-text')), None)
        translation = next((e for e in children if e.has_class('farsi-verse' if lang == 'fa' else 'english-verse')), None)
        if not clean(arabic) or not clean(translation):
            raise ValueError('Missing canonical Arabic/translation: ' + str(key))
        value = dict(copyright=copyright_notice, arabic=clean(arabic), translation=clean(translation), translation_html=translation_markup(translation),
                     provisional=section.attrs.get('data-translation-status') == 'provisional',
                     url=f'/quran-reflection/{lang}/{slug}/#ayah-{verse:03d}',
                     source=source.relative_to(self.root).as_posix())
        value['sha256'] = hashlib.sha256((value['arabic']+'\n'+value['translation']).encode()).hexdigest()
        self.cache[key] = value
        return value

    def render(self, lang, chapter, verse):
        value = self.get(lang, chapter, verse)
        label = CHAPTERS[chapter]['faName' if lang == 'fa' else 'enName'] + f' {chapter}:{verse}'
        if lang == 'fa':
            label = label.translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
        # The quote is plain canonical text; interactive lexical boxes stay in the
        # reader. No independently authored lexical metadata is manufactured.
        notice = ''
        if value['provisional']:
            notice = '<p class="shared-verse-status">' + ('ترجمهٔ این آیه در فرقان موقت و در حال بازبینی است.' if lang == 'fa' else 'This verse’s translation on Forqan is provisional and under review.') + '</p>'
        return (f'<blockquote class="shared-verse" data-quote-formatted="true" data-canonical-verse="{chapter}:{verse}" data-verse-language="{lang}" data-source-sha256="{value["sha256"]}">'
                f'<p class="arabic-text" lang="ar" dir="rtl">{html.escape(value["arabic"])}</p>'
                f'<p class="verse-ref"><a href="{value["url"]}">{html.escape(label)}</a></p>'
                f'<p class="translation" lang="{lang}" dir="{"rtl" if lang == "fa" else "ltr"}">{value["translation_html"]}</p>'
                + notice + '</blockquote>')


def resolve(source, lang, store, page_url, dependencies):
    credited = ['Tanzil' in source and 'COPYRIGHT BLOCK' in source]
    def replace(match):
        node = Document(match[0]).root.first(lambda e: 'data-quran-verses' in e.attrs)
        raw = node.attrs['data-quran-verses'].split()
        if not raw or any(not re.fullmatch(r'\d+:\d+', r) for r in raw):
            raise ValueError('Use individual chapter:verse references: '+match[0])
        rendered = []
        notice = ''
        for ref in raw:
            chapter, verse = map(int, ref.split(':'))
            value = store.get(lang, chapter, verse)
            if not credited[0] and value['copyright']:
                notice=value['copyright']+'\n';credited[0]=True
            dep = dependencies.setdefault(f'{lang}:{chapter}:{verse}', dict(source=value['source'], sha256=value['sha256'], pages=[]))
            if page_url not in dep['pages']:
                dep['pages'].append(page_url)
            rendered.append(store.render(lang, chapter, verse))
        preserved = ''.join(f' {k}="{html.escape(v,quote=True)}"' for k,v in node.attrs.items() if k in ['id','data-source-block'])
        return notice+'<div class="shared-verse-group"'+preserved+'>'+''.join(rendered)+'</div>'
    result = MARKER.sub(replace, source)
    if 'data-quran-verses=' in result:
        raise ValueError('Malformed shared Quran marker in '+page_url)
    return result
