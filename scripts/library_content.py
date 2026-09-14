"""Read rendered content for search and featured excerpts, without modifying authored files."""
from html.parser import HTMLParser
import re

VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Element:
    def __init__(self,tag='',attrs=None): self.tag=tag;self.attrs=dict(attrs or []);self.children=[]
    def has_class(self,name): return name in self.attrs.get('class','').split()
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child,Element): yield from child.walk()
    def first(self,predicate): return next((e for e in self.walk() if predicate(e)),None)
    def text(self):
        if self.tag in {'script','style','nav','form','button'} and not self.has_class('word-link'):return ''
        if 'data-pagefind-ignore' in self.attrs:return ''
        return ' '.join(c.text() if isinstance(c,Element) else c for c in self.children)

class Document(HTMLParser):
    def __init__(self,source):
        super().__init__(convert_charrefs=True);self.root=Element();self.stack=[self.root];self.feed(source)
    def handle_starttag(self,tag,attrs):
        node=Element(tag,attrs);self.stack[-1].children.append(node)
        if tag not in VOID:self.stack.append(node)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:self.stack=self.stack[:i];break
    def handle_data(self,data):self.stack[-1].children.append(data)

def clean(node):return ' '.join(node.text().split()) if node else ''
def shorten(text,limit=300):
    if len(text)<=limit:return text
    return text[:limit].rsplit(' ',1)[0]+' …'

def extract(entry,source):
    root=Document(source).root
    main=root.first(lambda e:e.attrs.get('id')=='main-content')
    if not main:return [],[]
    kind=entry['kind'];lang=entry['lang'];url=entry['url'];title=entry['title']
    records=[];features=[]
    if kind=='Quran':
        for section in main.walk():
            if not section.has_class('ayah-block') or not section.attrs.get('id'):continue
            heading=section.first(lambda e:e.tag in ['h2','h3'])
            name=clean(heading) or title
            verse_url=url+'#'+section.attrs['id']
            # Only direct children hold the verse itself; quotations inside ta'wil stay there.
            verse_nodes=[e for e in section.children if isinstance(e,Element) and any(e.has_class(c) for c in ('arabic-text','english-verse','farsi-verse'))]
            arabic=' '.join(clean(e) for e in verse_nodes if e.has_class('arabic-text'))
            translation=' '.join(clean(e) for e in verse_nodes if e.has_class('english-verse') or e.has_class('farsi-verse'))
            verse=' '.join(v for v in (arabic,translation) if v)
            roots=sorted({e.attrs['data-learn-more'].rstrip('/').split('/')[-1] for node in verse_nodes for e in node.walk() if '/roots/' in e.attrs.get('data-learn-more','')})
            if verse:
                records.append(dict(url=verse_url,title=name,original=verse,lang=lang,kind='Quran',verse=verse,arabic=arabic,translation=translation,roots=roots))
            reflection=' '.join(clean(e) for e in section.children if isinstance(e,Element) and e.attrs.get('data-type')=='reflection')
            if reflection.strip():
                records.append(dict(url=url+'?in=reflection#'+section.attrs['id'],title=name,original=reflection,lang=lang,kind='Reflection'))
            if arabic and translation:
                features.append(dict(url=verse_url,title=name,arabic=shorten(arabic,260),excerpt=shorten(translation),lang=lang,kind=kind))
    else:
        records.append(dict(url=url,title=title,original=clean(main),lang=lang,kind=kind))
        candidate=None
        if kind=='Roots':candidate=main.first(lambda e:e.has_class('root-subtitle'))
        elif kind in ('Articles','Terminology') and re.search(r'/(articles|quran-terminology|hadith-critique|quran-completeness)/[^/]+/$',url):
            candidate=main.first(lambda e:e.tag=='p' and len(clean(e))>100 and not any(e.has_class(c) for c in ['arabic-text','arabic-quote','tags']))
        if candidate:
            features.append(dict(url=url,title=title,excerpt=shorten(clean(candidate)),lang=lang,kind=kind))
    return records,features
