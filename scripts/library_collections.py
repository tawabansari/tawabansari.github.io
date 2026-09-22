"""Render collection directories and navigation into generated HTML only."""
import json
import re
from pathlib import Path
from html import escape as esc
from library_content import Document, clean, shorten, passages

COLLECTIONS = {
 'terminology': ('quran-terminology', 'Qur’an Terminology', 'مفاهیم قرآنی', 'Conceptual studies of Qur’anic terms and ideas.', 'مطالعهٔ مفاهیم و اصطلاحات در قرآن.'),
 'completeness': ('quran-completeness', 'Qur’an Completeness', 'کامل بودن قرآن', 'Studies of the Qur’an’s authority, preservation, and sufficiency.', 'مطالعات دربارهٔ مرجعیت، حفظ و کفایت قرآن.'),
 'hadith': ('hadith-critique', 'Hadith Critique', 'نقد حدیث', 'Examinations of reports and inherited claims through the Qur’an.', 'بررسی روایت‌ها و باورهای موروثی در پرتو قرآن.'),
 'reflections': ('articles/reflections', 'Articles and Reflections', 'مقاله‌ها و تأملات', 'Independent essays and longer studies.', 'مقاله‌ها و پژوهش‌های مستقل.'),
 'salat': ('salat', 'Salat', 'صلوة', 'Studies of Salat in the Qur’an.', 'مطالعات صلوة در قرآن.'),
 'zakat': ('zakat', 'Zakat', 'زکات', 'Studies of Zakat in the Qur’an.', 'مطالعات زکات در قرآن.')
}
MAIN = ('terminology', 'completeness', 'hadith', 'reflections')

def label(key,lang): return COLLECTIONS[key][2 if lang=='fa' else 1]
def route(key,lang): return '/'+lang+'/'+COLLECTIONS[key][0]+'/'
def text(lang,en,fa): return fa if lang=='fa' else en
def alphabet(value,lang):
    value=re.sub(r'[\u064b-\u065f\u0670\u0640]', '',value).translate(str.maketrans({'ي':'ی','ى':'ی','ك':'ک','آ':'ا','أ':'ا','إ':'ا'})).casefold()
    if lang=='fa':
        letters='ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'
        return tuple(letters.find(c) if c in letters else 100+ord(c) for c in value)
    return value

def prepare(site,pages,sources,redirects):
    root=Path(__file__).resolve().parent.parent
    catalog=json.loads((root/'_data/study-catalog.json').read_text())
    metadata={m['url']:m for m in json.loads((site/'assets/data/study-metadata.json').read_text()) if m.get('url')}
    entries={}
    for item in catalog:
        url=item['url']
        if url in entries: raise ValueError('Duplicate catalog entry: '+url)
        if url not in pages or url in redirects: raise ValueError('Missing study destination: '+url)
        groups=item['collections']
        if not groups or len(groups)!=len(set(groups)) or any(g not in COLLECTIONS for g in groups):raise ValueError('Invalid collections: '+url)
        entries[url]=dict(item)
    # New writings remain visible even before editorial cataloguing.
    for url in pages:
        if re.match(r'^/(en|fa)/(articles|quran-terminology|quran-completeness|hadith-critique)/[^/]+/$',url) and url not in entries and url not in {route('reflections','en'),route('reflections','fa')}:
            group='terminology' if '/quran-terminology/' in url else 'completeness' if '/quran-completeness/' in url else 'hadith' if '/hadith-critique/' in url else 'reflections'
            entries[url]={'url':url,'collections':[group]}
            print('Automatically included new study:',url)
    for url,item in entries.items():
        info=metadata.get(url,{})
        item['lang']=pages[url]['lang'];item['title']=info.get('title') or pages[url]['title']
        pages[url]['title']=item['title']
        item['date']=info.get('date') or ''
        item['updated']=info.get('updated') or ''
        # A layout edit never becomes a revision date.
        description=item.get('description') or info.get('description')
        if not description:
            main=Document(sources[url][1]).root.first(lambda e:e.attrs.get('id')=='main-content')
            paragraph=main.first(lambda e:e.tag=='p' and len(clean(e))>90 and not e.has_class('tags')) if main else None
            description=clean(paragraph)
        item['description']=shorten(description or '',280)
        main=Document(sources[url][1]).root.first(lambda e:e.attrs.get('id')=='main-content')
        opening=next((p['text'] for p in passages(main) if len(p['text'])>110), '') if main else ''
        summary=description or ''
        if opening and opening not in summary and summary not in opening:
            summary+='\n\n'+opening
        elif opening and len(opening)>len(summary):
            summary=opening
        item['preview']=shorten(summary.strip(),650)
        if 'terminology' in item['collections']:
            pages[url]['kind']='Terminology'
            item.setdefault('concept',item['title'])
        if info.get('date') and not re.fullmatch(r'\d{4}-\d{2}-\d{2}',info['date']):raise ValueError('Invalid date: '+url)
    def members(key,lang):
        rows=[i for i in entries.values() if i['lang']==lang and key in i['collections']]
        if key=='terminology':rows.sort(key=lambda i:alphabet(i['concept'],lang))
        elif key=='reflections':rows.sort(key=lambda i:(not bool(i['date']),-(int(i['date'].replace('-','')) if i['date'] else 0),alphabet(i['title'],lang)))
        else:rows.sort(key=lambda i:(i.get('order',999),alphabet(i['title'],lang)))
        return rows
    def nav(lang,active=None):
        links=[f'<a href="/{lang}/articles/"'+(' aria-current="page"' if active=='hub' else '')+'>'+text(lang,'All collections','همهٔ مجموعه‌ها')+'</a>']
        links += [f'<a href="{route(k,lang)}"'+(' aria-current="page"' if active==k else '')+'>'+label(k,lang)+'</a>' for k in MAIN]
        return '<nav class="collection-nav" aria-label="'+text(lang,'Writing collections','مجموعه‌های نوشته‌ها')+'">'+''.join(links)+'</nav>'
    def row(item,key):
        lang=item['lang'];url=item['url'];concept=item.get('concept') if key=='terminology' else None
        heading=esc(concept or item['title'])
        aliases=' '.join(item.get('aliases',[]))
        searchable=' '.join([item['title'],item.get('concept',''),item['description'],aliases])
        first=(concept or item['title']).strip()[0]
        description='' if concept else '<p>'+esc(item['description'])+'</p>'
        return f'<li class="study-row" data-search="{esc(searchable,quote=True)}" data-initial="{esc(first,quote=True)}" id="study-{url.strip("/").split("/")[-1]}"><h2><a data-study-link href="{url}" title="{esc(item["title"],quote=True)}" data-preview-title="{esc(item["title"],quote=True)}" data-preview-summary="{esc(item["preview"],quote=True)}">{heading}</a></h2>{description}</li>'
    for lang in ('en','fa'):
        urls=[('/'+lang+'/articles/','hub')]+[(route(k,lang),k) for k in COLLECTIONS]
        for url,key in urls:
            if url not in sources:raise ValueError('Missing collection page: '+url)
            title=text(lang,'Articles','مقاله‌ها') if key=='hub' else label(key,lang)
            intro=text(lang,'Browse a collection, or explore independent articles and reflections.','یک مجموعه را انتخاب کنید یا مقاله‌ها و تأملات مستقل را بخوانید.') if key=='hub' else COLLECTIONS[key][4 if lang=='fa' else 3]
            body=f'<section class="collection-directory" lang="{lang}" dir="'+('rtl' if lang=='fa' else 'ltr')+f'" data-collection="{key}">{nav(lang,key)}<header class="collection-heading"><h1>{title}</h1><p>{intro}</p></header>'
            if key=='hub':
                body+='<div class="collection-grid">'
                for k in MAIN:
                    count=len(members(k,lang))
                    body+=f'<a class="collection-card" href="{route(k,lang)}"><h2>{label(k,lang)}</h2><p>{COLLECTIONS[k][4 if lang=="fa" else 3]}</p><span>{count} '+text(lang,'studies','نوشته')+'</span></a>'
                body+='</div><p class="dedicated-studies">'+text(lang,'Dedicated studies: ','مطالعات ویژه: ')+ ' · '.join(f'<a href="{route(k,lang)}">{label(k,lang)}</a>' for k in ('salat','zakat'))+'</p>'
            else:
                rows=members(key,lang)
                order=text(lang,'Alphabetical by concept','به ترتیب الفبای مفاهیم') if key=='terminology' else text(lang,'Newest dated studies first; undated studies follow alphabetically.','نوشته‌های تاریخ‌دار از تازه به قدیم؛ سپس نوشته‌های بدون تاریخ به ترتیب الفبا.') if key=='reflections' else text(lang,'Suggested reading order','ترتیب پیشنهادی مطالعه')
                body+=f'<p class="collection-count">{len(rows)} '+text(lang,'studies','نوشته')+' · '+order+'</p><div class="collection-browser-controls"></div><ol class="study-list">'+''.join(row(i,key) for i in rows)+'</ol><nav class="collection-pagination" aria-label="'+text(lang,'Pagination','صفحه‌ها')+'"></nav>'
            body+='</section>'
            path,source=sources[url]
            source=source.replace('<!-- STUDY_COLLECTION -->',body).replace(' data-pagefind-body','')
            sources[url]=(path,source)
    for url,item in entries.items():
        lang=item['lang'];primary=item['collections'][0]
        links=' · '.join(f'<a href="{route(k,lang)}">{label(k,lang)}</a>' for k in item['collections'])
        translation=pages[url].get('translation')
        translation_link=('<a href="'+translation+'">'+text(lang,'Read in فارسی','Read in English')+'</a>') if translation else text(lang,'Persian translation is not available.','ترجمهٔ انگلیسی در دسترس نیست.')
        top=f'<nav class="study-context" data-pagefind-ignore lang="{lang}" dir="'+('rtl' if lang=='fa' else 'ltr')+'">'+text(lang,'Collections: ','مجموعه‌ها: ')+links+f'<span class="study-translation">{translation_link}</span><a class="study-back" hidden href="{route(primary,lang)}">'+text(lang,'Back to your list','بازگشت به فهرست شما')+'</a></nav>'
        path,source=sources[url]
        source=re.sub(r'(<main\b[^>]*id="main-content"[^>]*>)',lambda m:m[0]+top,source,count=1)
        # Only curated related reading: same article URL, never a copied article.
        related=item.get('related',[])
        if related:
            if any(r not in entries or entries[r]['lang']!=lang or r==url for r in related):raise ValueError('Invalid related reading: '+url)
            bottom='<aside class="study-related" data-pagefind-ignore><h2>'+text(lang,'Related reading','مطالعهٔ مرتبط')+'</h2><ul>'+''.join(f'<li><a href="{r}">{esc(entries[r]["title"])}</a></li>' for r in related)+'</ul></aside>'
            start=source.index('id="main-content"');end=source.index('</main>',start);source=source[:end]+bottom+source[end:]
        sources[url]=(path,source)
    (site/'assets/data/collections.json').write_text(json.dumps({'studies':list(entries.values()),'collections':[{ 'url':route(k,l),'label':label(k,l),'count':len(members(k,l))} for l in ('en','fa') for k in COLLECTIONS]},ensure_ascii=False))
    (site/'assets/data/study-metadata.json').unlink()
    print('Validated collections:',len(entries),'studies; unique destinations and collection memberships.')
