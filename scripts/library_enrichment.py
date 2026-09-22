"""Presentation-only enrichment of built HTML; never rewrite authored studies."""
import hashlib
import html
import re
import unicodedata
from html.parser import HTMLParser
from urllib.parse import unquote, urljoin, urlsplit


def stable_anchors(source):
    """Content-derived anchors survive insertion of earlier paragraphs/sections.

    Keep the old numbered IDs as aliases for already shared search links.
    Explicit author IDs always take precedence.
    """
    class Anchors(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.lines=[0]
            self.lines.extend(m.end() for m in re.finditer('\n',source))
            self.open=[];self.nodes=[];self.in_main=False
        def source_offset(self):
            line,column=self.getpos()
            return self.lines[line-1]+column
        def handle_starttag(self,tag,attrs):
            attrs=dict(attrs)
            if tag=='main' and attrs.get('id')=='main-content':self.in_main=True
            if self.in_main and tag in ('h2','h3','p','li'):
                node=dict(tag=tag,attrs=attrs,start=self.source_offset(),end=self.source_offset()+len(self.get_starttag_text()),text=[])
                self.open.append(node);self.nodes.append(node)
        def handle_data(self,data):
            for node in self.open:node['text'].append(data)
        def handle_endtag(self,tag):
            for i in range(len(self.open)-1,-1,-1):
                if self.open[i]['tag']==tag:
                    self.open=self.open[:i];break
            if tag=='main':self.in_main=False;self.open=[]
    parsed=Anchors();parsed.feed(source)
    used=set(re.findall(r'\bid="([^"]+)"',source));counts={'study-section':0,'search-passage':0};edits=[]
    for node in parsed.nodes:
        if node['attrs'].get('id'):continue
        prefix='study-section' if node['tag'] in ('h2','h3') else 'search-passage'
        counts[prefix]+=1
        text=unicodedata.normalize('NFC',' '.join(''.join(node['text']).split()))
        digest=hashlib.sha256((node['tag']+'\n'+text).encode()).hexdigest()[:16]
        anchor=prefix+'-'+digest
        suffix=2
        while anchor in used:
            anchor=prefix+'-'+digest+'-'+str(suffix);suffix+=1
        used.add(anchor)
        legacy=prefix+'-'+str(counts[prefix])
        while legacy in used:legacy+='-'
        used.add(legacy)
        opening=source[node['start']:node['end']]
        replacement=opening[:-1]+' id="'+anchor+'"><span class="legacy-passage-anchor" id="'+legacy+'" aria-hidden="true"></span>'
        edits.append((node['start'],node['end'],replacement))
    for start,end,replacement in reversed(edits):source=source[:start]+replacement+source[end:]
    return source


def unavailable_references(source, url, lang, pages, redirects):
    """Disable unpublished study/verse destinations, including popup actions."""
    label='هنوز منتشر نشده' if lang=='fa' else 'Not yet published'
    def unavailable(value):
        target=urlsplit(urljoin('https://forqan.co'+url,html.unescape(value)))
        if target.netloc not in ('forqan.co','www.forqan.co','tawabansari.github.io'):return False
        path=unquote(target.path)
        if not re.match(r'^/(?:quran-(?:reflection|terminology)/(?:en|fa)/|(?:en|fa)/(?:articles|quran-terminology|quran-completeness|hadith-critique|salat|zakat)/)',path):return False
        if path in redirects:return False
        entry=pages.get(path)
        if entry is None:entry=pages.get(path.rstrip('/')+'/')
        if entry is None:return True
        # Published chapters may still contain unpublished verses.
        fragment=unquote(target.fragment)
        return bool(re.fullmatch(r'ayah-\d+',fragment) and fragment not in entry.get('anchors',[]))
    def link(match):
        attrs,inner=match[1],match[2]
        href=re.search(r'\bhref="([^"]+)"',attrs)
        if not href or not unavailable(href[1]):return match[0]
        attrs=re.sub(r'\s+href="[^"]*"','',attrs)
        attrs=re.sub(r'\s+title="[^"]*"','',attrs)
        attrs+=' aria-disabled="true" data-unpublished-reference="'+href[1]+'" title="'+label+'"'
        return '<a'+attrs+'>'+inner+'<span class="reference-pending" data-pagefind-ignore> ('+label+')</span></a>'
    source=re.sub(r'<a\b([^>]*\bhref="[^"]+"[^>]*)>(.*?)</a>',link,source,flags=re.S)
    def action(match):
        if unavailable(match[2]):return 'data-unpublished-'+match[1]+'="'+match[2]+'"'
        return match[0]
    return re.sub(r'data-(learn-more|concept-url)="([^"]+)"',action,source)
