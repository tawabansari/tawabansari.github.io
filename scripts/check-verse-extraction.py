from library_content import extract
source='''<main id="main-content"><section class="ayah-block" id="ayah-001"><h2>Test 1:1</h2><p class="arabic-text"><button class="word-link" data-learn-more="/quran-terminology/en/roots/sad-l-w/">صلوة</button></p><p class="english-verse">Establish Salat.</p><details data-type="reflection"><p>A commentary-only banking discussion.</p><p class="arabic-text">اقتباس</p></details><details data-type="cross-reference"><p>Unrelated cross-reference</p></details></section></main>'''
records,features=extract(dict(kind='Quran',lang='en',url='/test/',title='Test'),source)
verse,reflection=records
assert verse['kind']=='Quran' and verse['original']=='صلوة Establish Salat.'
assert verse['roots']==['sad-l-w']
assert reflection['kind']=='Reflection' and 'banking' in reflection['original'] and 'اقتباس' in reflection['original']
assert 'banking' not in verse['original'] and 'Unrelated' not in reflection['original']
assert features[0]['excerpt']=='Establish Salat.'
print('Passed isolated verse text, nested commentary quotations, root annotations, and unchanged feature excerpts.')
