#!/usr/bin/env python3
"""One-time conservative conversion of explicit article quotations to shared refs.
Dry-run by default. Never touches Quran units, roots, or authorial prose.
"""
from pathlib import Path
from html.parser import HTMLParser
import re,json,sys,html,unicodedata
from verse_references import REF,CHAPTERS
from shared_quran import VerseStore

VOID={'br','hr','img','input','link','meta','source','wbr'}
AR={'arabic','arabic-text','arabic-quote','quran-quote','quran-text','ayah-arabic','verse-arabic'}
class Node:
    def __init__(self,tag,attrs,start,parent):self.tag=tag;self.attrs=dict(attrs);self.start=start;self.end=start;self.parent=parent;self.children=[]
    def walk(self):
        yield self
        for c in self.children:yield from c.walk()
class Tree(HTMLParser):
    def __init__(self,s):
        super().__init__(convert_charrefs=False);self.s=s;self.lines=[0]+[m.end() for m in re.finditer('\n',s)];self.root=Node('',[],0,None);self.stack=[self.root];self.feed(s)
    def pos(self):l,c=self.getpos();return self.lines[l-1]+c
    def handle_starttag(self,t,a):
        n=Node(t,a,self.pos(),self.stack[-1]);n.openend=self.pos()+len(self.get_starttag_text());n.end=n.openend;self.stack[-1].children.append(n)
        if t not in VOID:self.stack.append(n)
    def handle_endtag(self,t):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==t:self.stack[i].end=self.s.find('>',self.pos())+1;self.stack=self.stack[:i];break

def letters(s):
    s=''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.category(c).startswith('M'))
    return re.sub(r'[^ء-ي]','',s.replace('ٱ','ا').replace('ی','ي').replace('ى','ي').replace('ک','ك'))

def plain(s):return html.unescape(re.sub('<[^>]+>','',s))
def marked(n):return n.tag in ['p','blockquote'] and (set(n.attrs.get('class','').split())&AR or n.attrs.get('lang')=='ar')
def references(s):
    found=[]
    # Numeric labels also expand legacy ranges; links alone must not drop a range.
    for m in REF.finditer(plain(s)):
        c,a,z=int(m[1]),int(m[2]),int(m[3] or m[2])
        if c in CHAPTERS and 1<=a<=z<=CHAPTERS[c]['ayahs']:found.extend(f'{c}:{v}' for v in range(a,z+1))
    if not found:
        for c,v in re.findall(r'/quran-reflection/(?:fa|en)/(\d{3})-[^/]+/(?:#ayah-)?(\d{1,3})',s):found.append(f'{int(c)}:{int(v)}')
    if found:
        m=re.search(r'(?:آیات|آیه‌های|verses?)\s*([۰-۹0-9]+)\s*(?:تا|to|–|—|-)\s*([۰-۹0-9]+)',plain(s),re.I)
        if m:
            c=int(found[0].split(':')[0]);a,z=map(int,m.groups())
            if 1<=a<=z<=CHAPTERS[c]['ayahs']:found=list(dict.fromkeys(found+[f'{c}:{v}' for v in range(a,z+1)]))
    if found:
        m=re.search(r'آیات\s*([۰-۹0-9]+)\s*و\s*([۰-۹0-9]+)',plain(s))
        if m:
            c=int(found[0].split(':')[0])
            found+= [f'{c}:{int(v)}' for v in m.groups() if 1<=int(v)<=CHAPTERS[c]['ayahs']]
    return list(dict.fromkeys(found))
def isref(n,s):return n.tag in ['p','cite','footer'] and (any(w in n.attrs.get('class','') for w in ['verse-ref','reference','citation','source']) or (references(s[n.start:n.end]) and len(re.sub(r'[\d۰-۹\s:؛،,.–—-]','',plain(s[n.start:n.end])))<55))
def marker(refs,n):
    keep=''.join(f' {k}="{html.escape(n.attrs[k],quote=True)}"' for k in ['id','data-source-block'] if k in n.attrs)
    return '<div class="shared-verse-placeholder" data-quran-verses="'+' '.join(refs)+'"'+keep+'></div>'

def migrate(s,lang,store):
    tree=Tree(s);edits=[];unresolved=[];used=set()
    for n in tree.root.walk():
        if not marked(n) or any(marked(c) for c in list(n.walk())[1:]):continue
        ar=plain(s[n.start:n.end]).strip()
        if not re.search('[\u0621-\u064a]',ar):continue
        if letters(ar)=='بسماللهالرحمنالرحيم':continue
        parent=n.parent;box=n if n.tag=='blockquote' else None
        ancestor=parent
        while ancestor and not box:
            if ancestor.tag=='blockquote':box=ancestor
            ancestor=ancestor.parent
        if box and (box.start,box.end) in used:continue
        if box:
            kids=box.children
            if any(k.tag not in ['p','cite','footer','span','a','br','strong','em','div'] for k in kids):unresolved.append((n.start,'complex-blockquote'));continue
            refs=references(s[box.start:box.end]);start,end=box.start,box.end;host=box
            # Keep explanatory paragraphs beyond an Arabic/translation/reference triple.
            unknown=[k for k in kids if k.tag=='p' and not marked(k) and not isref(k,s) and 'transliteration' not in k.attrs.get('class','')]
            if len(unknown)>1:unresolved.append((n.start,'extra-paragraphs'));continue
            siblings=box.parent.children;j=siblings.index(box);near=siblings[j+1:j+3]
            if not unknown and near and isref(near[0],s):
                refs=list(dict.fromkeys(refs+references(s[near[0].start:near[0].end])));end=near[0].end
                if len(near)>1 and 'translation' in near[1].attrs.get('class',''):end=near[1].end
            elif not unknown and len(near)>1 and 'translation' in near[0].attrs.get('class','') and isref(near[1],s):
                refs=list(dict.fromkeys(refs+references(s[near[1].start:near[1].end])));end=near[1].end
            elif not refs and j>0 and isref(siblings[j-1],s):
                refs=references(s[siblings[j-1].start:siblings[j-1].end])
        else:
            kids=parent.children;j=kids.index(n);near=kids[j+1:j+4];chosen=[]
            if near and isref(near[0],s):
                chosen=[near[0]]
                if len(near)>1 and near[1].tag=='p' and not marked(near[1]) and not isref(near[1],s):chosen.append(near[1])
            elif len(near)>1 and near[0].tag=='p' and not marked(near[0]) and isref(near[1],s):chosen=near[:2]
            if not chosen:unresolved.append((n.start,'no-adjacent-reference'));continue
            start,end=n.start,chosen[-1].end;refs=references(s[start:end]);host=n
        if not refs:
            # Individually reviewed unnumbered Quran excerpts (not hadith/poetry).
            explicit={letters('وَأَنْزَلَ مِنَ السَّمَاءِ مَاءً'):'2:22',letters('وَمَنْ شَكَرَ فَإِنَّمَا يَشْكُرُ لِنَفْسِهِ وَمَنْ كَفَرَ فَإِنَّ رَبِّي غَنِيٌّ كَرِيمٌ'):'27:40',letters('وَمَنْ يَقْتَرِفْ حَسَنَةً نَزِدْ لَهُ فِيهَا حُسْنًا'):'42:23'}
            if letters(ar) in explicit:refs=[explicit[letters(ar)]]
            else:unresolved.append((n.start,'no-reference'));continue
        if box:
            siblings=box.parent.children;j=siblings.index(box)
            after=[k for k in siblings[j+1:j+5] if k.start>=end]
            if len(after)>1 and plain(s[after[0].start:after[0].end]).strip() in ('ترجمه:', 'Translation:') and after[1].tag=='p':
                end=after[1].end
        for ref in refs:store.get(lang,*map(int,ref.split(':')))
        if any(start<b and end>a for a,b,_ in edits):continue
        replacement=marker(refs,host)
        # Preserve any old anchors on removed descendants at the replacement site.
        anchors=[c.attrs['id'] for c in tree.root.walk() if start<=c.start and c.end<=end and c is not host and 'id' in c.attrs]
        replacement=''.join('<span id="'+html.escape(a,quote=True)+'"></span>' for a in anchors)+replacement
        edits.append((start,end,replacement));used.add((start,end))
    result=s
    for a,b,r in sorted(edits,reverse=True):result=result[:a]+r+result[b:]
    return result,edits,unresolved

def article_scope(root):
    catalog=json.loads((root/'_data/study-catalog.json').read_text())
    targets={x['url'] for x in catalog if set(x['collections']) & {'terminology','reflections'}}
    scope={}
    for folder in ['fa/articles','en/articles','fa/quran-terminology','en/quran-terminology','_posts']:
        for p in (root/folder).rglob('*'):
            if p.suffix not in ['.html','.md']:continue
            s=p.read_text();fm=s.split('---',2)[1] if s.startswith('---') else ''
            m=re.search(r"^permalink:\s*[\"']?([^\s\"']+)",fm,re.M)
            url=m[1] if m else '/'+str(p.parent.relative_to(root))+'/'
            if 'redirect_to:' in fm:continue
            if url in targets or re.fullmatch(r'/(fa|en)/(articles|quran-terminology)/[^/]+/',url):scope[url]=str(p.relative_to(root))
    return scope

def main():
    apply='--apply' in sys.argv;root=Path(__file__).resolve().parent.parent;store=VerseStore(root)
    scope=article_scope(root);report=[];backup=Path('/tmp/shared-verses-before');backup.mkdir(exist_ok=True)
    for url,path in scope.items():
        p=root/path;s=p.read_text();lang=url.strip('/').split('/')[0];new,edits,unresolved=migrate(s,lang,store)
        if edits and apply:
            saved=backup/path;saved.parent.mkdir(parents=True,exist_ok=True);saved.write_text(s);p.write_text(new)
        report.append(dict(url=url,path=path,converted=len(edits),unresolved=[dict(line=s[:a].count('\n')+1,reason=r) for a,r in unresolved]))
    Path('/tmp/shared-verses-migration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('Converted' if apply else 'Would convert',sum(x['converted'] for x in report),'blocks in',sum(bool(x['converted']) for x in report),'pages;',sum(len(x['unresolved']) for x in report),'candidates need classification.')
if __name__=='__main__':main()
