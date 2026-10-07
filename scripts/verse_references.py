"""Render unambiguous Qur'an citations as individually linked, isolated numbers."""
import html
import json
import re
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

NAV = json.loads((Path(__file__).resolve().parent.parent / 'assets/js/quran-navigation-data.js').read_text().split('=', 1)[1].strip().rstrip(';'))
CHAPTERS = {c['number']: c for c in NAV}
DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
NUM = r'[0-9۰-۹٠-٩]+'
REF = re.compile(rf'(?<![\w:：])({NUM})\s*[:：]\s*({NUM})(?:\s*(?:[–—−-]|الی|تا|to)\s*(?:\1\s*[:：]\s*)?({NUM}))?(?![\w:：])')
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}


def verse_references(source, lang):
    """Preserve prose, Arabic quotations, IDs and unrelated/external links.

    Only a named surah, a citation container, or an existing Qur'an link
    establishes the context for otherwise ambiguous numeric text.
    """
    def normalized(value):
        value = unicodedata.normalize('NFKD', value).casefold().translate(str.maketrans('يك', 'یک'))
        return ''.join(ch for ch in value if not unicodedata.combining(ch) and ch not in "'’‘ʿʾ-ـ")

    def valid(m):
        c, first = int(m[1]), int(m[2]); last = int(m[3] or m[2])
        return c in CHAPTERS and 1 <= first <= last <= CHAPTERS[c]['ayahs']

    def render(m):
        if not valid(m): return m[0]
        c, first, last = int(m[1]), int(m[2]), int(m[3] or m[2])
        links = []
        for v in range(first, last + 1):
            label = f'{c}:{v}'
            if lang == 'fa': label = label.translate(DIGITS)
            url = f'/quran-reflection/{lang}/{CHAPTERS[c]["slug"]}/#ayah-{v:03d}'
            links.append(f'<a class="verse-citation" data-verse-citation="true" href="{url}"><bdi dir="ltr">{label}</bdi></a>')
        return ('، ' if lang == 'fa' else ', ').join(links)

    def internal_verse(attrs):
        target = urlsplit(html.unescape(attrs.get('href', '')))
        return (not target.netloc or target.netloc in {'forqan.co','www.forqan.co','tawabansari.github.io'}) and bool(re.match(r'^/quran-reflection/(fa|en)/\d{3}-', target.path))

    # Some articles linked only the two endpoints, with a shortened final label.
    pair = re.compile(r'(<a\b[^>]*href="/quran-reflection/[^" ]+"[^>]*>)([^<>]+)</a>\s*[–—−-]\s*<a\b[^>]*href="/quran-reflection/[^" ]+"[^>]*>([^<>]+)</a>')
    def endpoints(m):
        a = REF.fullmatch(html.unescape(m[2]).strip())
        end = html.unescape(m[3]).strip()
        if not a or a[3] or ' id=' in m[0]: return m[0]
        full_end = REF.fullmatch(end)
        if full_end:
            if full_end[1] != a[1] or full_end[3]: return m[0]
            end = full_end[2]
        if not re.fullmatch(NUM, end): return m[0]
        combined = REF.fullmatch(a[1] + ':' + a[2] + '–' + end)
        # The target of the second link must agree with the printed endpoint.
        chapter = CHAPTERS.get(int(a[1]))
        if not chapter or not re.search(r'/' + re.escape(chapter['slug']) + r'/(?:#ayah-0*' + str(int(end)) + r'|0*' + str(int(end)) + r'/)"', m[0]): return m[0]
        return render(combined)

    class Citations(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.lines = [0] + [m.end() for m in re.finditer('\n', source)]
            self.stack = []; self.edits = []; self.anchor = None; self.block_text = ''; self.consumed = -1
        def source_offset(self):
            line, col = self.getpos(); return self.lines[line-1] + col
        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            if tag in {'p','li','h2','h3','td','figcaption'}: self.block_text = ''
            if tag not in VOID: self.stack.append((tag, attrs))
            if tag == 'a': self.anchor = (self.source_offset(), self.source_offset()+len(self.get_starttag_text()), attrs)
        def handle_startendtag(self, tag, attrs):
            pass
        def eligible(self):
            return any(t == 'main' and a.get('id') == 'main-content' for t,a in self.stack) and not any(t in {'script','style','code','pre','textarea','button','nav','h1'} or a.get('lang') == 'ar' or 'arabic' in a.get('class','').split() or 'data-verse-citation' in a or 'data-unpublished-reference' in a for t,a in self.stack)
        def handle_endtag(self, tag):
            if tag == 'a' and self.anchor:
                start, inner_start, attrs = self.anchor
                inner = source[inner_start:self.source_offset()]
                if self.source_offset() >= self.consumed and self.eligible() and internal_verse(attrs) and '<' not in inner and 'id' not in attrs:
                    joined = pair.match(source, start)
                    replacement = endpoints(joined) if joined else None
                    if joined and replacement != joined[0]:
                        self.edits.append((start, joined.end(), replacement))
                        self.consumed = joined.end()
                    else:
                        matches = list(REF.finditer(inner))
                        if matches and all(valid(m) for m in matches):
                            self.edits.append((start, self.source_offset()+len('</a>'), REF.sub(render, inner)))
                self.anchor = None
            for i in range(len(self.stack)-1,-1,-1):
                if self.stack[i][0] == tag:
                    self.stack = self.stack[:i]; break
        def handle_data(self, data):
            preceding = self.block_text
            self.block_text += data
            if self.source_offset() < self.consumed or self.anchor or not self.eligible() or not REF.search(data): return
            citation_context = any(re.search(r'(?:ref|source|citation|verse|ayah)', a.get('class','')) for _,a in self.stack)
            def replace(m):
                if not valid(m): return m[0]
                c = CHAPTERS[int(m[1])]
                before = preceding + data[:m.start()]
                names = [c['faName'], c['enName']] + c['aliases'].split()
                names += ['Al-' + n for n in c['aliases'].split() if n.isascii()]
                names += {20: ['Ṭā Hā', 'Ta-Ha'], 38: ['ص']}.get(c['number'], [])
                named = any(re.search(r'(?<!\w)'+re.escape(normalized(n))+r'\s*(?:[،,:؛]\s*|(?:آیات?|verses?)\s*)*$',normalized(before),re.I) for n in names if len(n)>2 or re.search('[\u0600-\u06ff]',n))
                # Subsequent citations in a compact reference list inherit its context.
                ref_list = bool(re.fullmatch(r'[\s()\[\]،,؛;وand0-9۰-۹٠-٩:：–—−-]*', data))
                quran_context = bool(re.search(r"(?:قرآن|آیات|آیه|Qur[’']?an|verses?)", before[-100:], re.I))
                other_source = bool(re.search(r'(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Job|Kings|Matthew|Mark|Luke|John|Romans|Corinthians|پیدایش|خروج|لاویان|تثنیه|ایوب|پادشاهان|متی|لوقا|یوحنا|بخاری|مسلم|Bukhari|Sahih)', before[-100:], re.I))
                return render(m) if not other_source and (citation_context or named or ref_list or quran_context) else m[0]
            replacement = REF.sub(replace, data)
            if replacement != data:self.edits.append((self.source_offset(), self.source_offset()+len(data), replacement))
    parser = Citations(); parser.feed(source)
    for start, end, replacement in reversed(parser.edits): source = source[:start]+replacement+source[end:]
    return source
