"""A translation edit must reach principle evidence on the next build."""
import json,sys,tempfile
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parent))
import prepare_principles
with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp)/'source';site=Path(tmp)/'build'
    (root/'_data/principles').mkdir(parents=True);(root/'assets/js').mkdir(parents=True)
    (root/'_data/principles/example.json').write_text(json.dumps({'id':'example','source':1,'primary':[2,1],'evidence':[[2,1],[2,2]],'refs':[[2,1],[2,2]]}))
    (root/'assets/js/quran-navigation-data.js').write_text('const surahs = '+json.dumps([{'number':2,'slug':'002-test','faName':'آزمایش','enName':'Test'}])+';')
    for version in ['first','revised']:
        for lang in ['fa','en']:
            chapter=site/'quran-reflection'/lang/'002-test/index.html';chapter.parent.mkdir(parents=True,exist_ok=True)
            translation='farsi-verse' if lang=='fa' else 'english-verse'
            chapter.write_text(''.join(f'<section class="ayah-block" id="ayah-{v:03}"><p class="arabic-text">نص {v}</p><p class="{translation}">{lang} {version} {v}</p></section>' for v in [1,2]))
            page=site/lang/'principles/example/index.html';page.parent.mkdir(parents=True,exist_ok=True);page.write_text('<!-- PRINCIPLE_VERSE --><!-- PRINCIPLE_REFERENCES -->')
        with patch.object(prepare_principles,'ROOT',root):prepare_principles.prepare(site)
        for lang in ['fa','en']:
            rendered=(site/lang/'principles/example/index.html').read_text()
            for v in [1,2]:assert f'{lang} {version} {v}' in rendered and f'#ayah-{v:03}' in rendered
            assert rendered.index(f'{lang} {version} 1')<rendered.index('#ayah-001')
            if version=='revised':assert 'first' not in rendered
print('Passed source translation regeneration and individual context verse anchors in both languages.')
