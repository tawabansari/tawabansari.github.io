#!/usr/bin/env python3
"""Read-only source audit. Quran text is taken from installed main verse buttons."""
from pathlib import Path
from html.parser import HTMLParser
import re, sys, unicodedata
class Text(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]
    def handle_data(self, value): self.parts.append(value)
def plain(value):
    parser=Text(); parser.feed(value); return ''.join(parser.parts)
def norm(value):
    value=unicodedata.normalize('NFKD',value).translate(str.maketrans('أإآٱى','ااااي'))
    return ' '.join(re.sub(r'[^\u0621-\u063A\u0641-\u064A ]','',value).split()).replace('ا','').replace('ء','')
root=Path(__file__).resolve().parents[1]
corpus=[]
for p in (root/'quran-reflection/fa').glob('*/units/*.html'):
    m=re.search(r'<p class="arabic-text">(.*?)</p>',p.read_text(),re.S)
    if m: corpus.append(norm(plain(m[1])))
paths=[Path(p) for p in sys.argv[1:]] or list((root/'quran-reflection').glob('*/*/units/*.html'))
errors=[]; checked=0
for p in paths:
    for detail in re.findall(r'<details\b[^>]*data-type="reflection"[^>]*>.*?</details>',p.read_text(),re.S):
        for tag,body in re.findall(r'(<p\b[^>]*>)(.*?)</p>',detail,re.S):
            text=plain(body).strip(); normalized=norm(text)
            explicit='arabic-text' in tag
            verified=len(normalized.split())>=3 and not re.search('[A-Za-zپچژگ]',text) and any(normalized in v for v in corpus)
            if not (explicit or verified): continue
            checked+=1
            if not all(x in tag for x in ('arabic-text','lang="ar"','dir="rtl"')):
                errors.append(f'{p}: explicit Arabic markup missing: {text[:90]}')
for e in errors: print(e)
print(f'{checked} quotations checked; {len(errors)} markup issues. Review translation pairing separately.')
sys.exit(bool(errors))
