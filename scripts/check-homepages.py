"""Validate localized homepages and their published selection pools."""
import json
import sys
from pathlib import Path
from library_content import Document
site=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
features=json.loads((site/'assets/data/features.json').read_text())
for lang in ['en','fa']:
    root=Document((site/lang/'index.html').read_text()).root
    home=root.first(lambda e:e.has_class('library-home'))
    assert home.attrs['data-home-language']==lang
    assert home.attrs['dir']==('rtl' if lang=='fa' else 'ltr')
    assert len([e for e in home.walk() if e.has_class('library-destination')])==4
    assert home.first(lambda e:e.tag=='input' and e.attrs.get('name')=='lang').attrs['value']==lang
    feature=home.first(lambda e:e.attrs.get('id')=='archive-feature')
    assert feature.attrs['data-feature-fixed-language']==lang
    assert not feature.first(lambda e:'data-feature-language' in e.attrs)
    assert '/'+lang+'/' in feature.first(lambda e:e.has_class('feature-read')).attrs['href']
    assert root.first(lambda e:e.has_class('library-home-link')).attrs['href']=='/'+lang+'/'
    for kind in ['Quran','Roots','Terminology','Articles','Reflection']:
        pool=[f for f in features if f['lang']==lang and f['kind']==kind]
        assert pool,(lang,kind)
        for f in pool:
            assert '/'+lang+'/' in f['url']
    print(lang+': localized layout, search language, home link, selection fallback and all five reading pools passed.')
