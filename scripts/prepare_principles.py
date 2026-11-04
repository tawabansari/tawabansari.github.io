"""Render principle evidence from installed verses; never change authored verse units."""
import html,json,re
from pathlib import Path
from library_content import Document,clean
ROOT=Path(__file__).resolve().parent.parent

def prepare(site):
    records=json.loads((ROOT/'_data/quran-principles.json').read_text())
    raw=(ROOT/'assets/js/quran-navigation-data.js').read_text()
    surahs={s['number']:s for s in json.loads(raw.split('=',1)[1].strip().rstrip(';'))}
    chapters={}; unavailable=[]
    def citation(ref,lang):
        s,v=ref;chapter=surahs[s];url=f'/quran-reflection/{lang}/{chapter["slug"]}/'
        if url not in chapters:
            path=site/(url.strip('/')+'/index.html')
            chapters[url]=path.read_text() if path.exists() else ''
        text=chapters[url]
        label=chapter['faName' if lang=='fa' else 'enName']+' '+str(s)+':'+str(v)
        if lang=='fa':label=label.translate(str.maketrans('0123456789','۰۱۲۳۴۵۶۷۸۹'))
        found=re.search(r'<section\b[^>]*\bid=["\'](ayah-0*'+str(v)+r')["\'][^>]*>',text)
        link=f'<a href="{url}#{found[1]}">{html.escape(label)}</a>' if found else html.escape(label)
        return link,text,found
    for record in records:
        for lang in ('fa','en'):
            path=site/lang/'principles'/record['id']/'index.html'
            if not path.exists():raise ValueError('Missing principle page: '+str(path))
            link,text,found=citation(record['primary'],lang)
            if not found:raise ValueError('Principal verse unavailable: '+str(record['primary'])+' '+lang)
            end=text.find('<section class="ayah-block"',found.end())
            node=Document(text[found.start():end if end!=-1 else len(text)]).root
            section=node.first(lambda e:e.has_class('ayah-block'))
            arabic=section.first(lambda e:e.has_class('arabic-text'))
            translation=section.first(lambda e:e.has_class('farsi-verse' if lang=='fa' else 'english-verse'))
            if not clean(arabic) or not clean(translation):raise ValueError('Missing verse text: '+str(record['primary'])+' '+lang)
            # Plain text removes interactive word boxes without changing the verse wording.
            notice=re.search(r'<!-- Arabic source: Tanzil.*?-->',text,re.S)
            verse=(notice[0] if notice else '')+f'<p>{link}</p><p class="arabic-text" lang="ar" dir="rtl">{html.escape(clean(arabic))}</p><p class="principle-translation">{html.escape(clean(translation))}</p>'
            if section.attrs.get('data-translation-status')=='provisional':
                verse+='<p class="principle-translation-status">'+('ترجمهٔ این آیه در فرقان هنوز موقت و در حال بازبینی است.' if lang=='fa' else 'This verse’s translation on Forqan is provisional and under review.')+'</p>'
            verse+='<p class="principle-attribution" data-pagefind-ignore>Quran text: <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil</a> · CC BY 3.0</p>'
            refs=[]
            for ref in record['refs']:
                if ref==record['primary']:continue
                c,_,exists=citation(ref,lang)
                if not exists:unavailable.append((record['id'],lang,ref))
                refs.append('<li>'+c+'</li>')
            other='<ul class="principle-citations">'+''.join(refs)+'</ul>' if refs else '<p>'+('این مدخل فعلاً به همان آیهٔ اصلی ارجاع دارد.' if lang=='fa' else 'This entry currently cites the principal verse above.')+'</p>'
            path.write_text(path.read_text().replace('<!-- PRINCIPLE_VERSE -->',verse).replace('<!-- PRINCIPLE_REFERENCES -->',other))
    print('Prepared',len(records),'principles in each language;',len(unavailable),'unavailable supporting references retained as text.')
