"""Regression tests for shared quotes: provenance, isolation and rebuild behavior."""
import tempfile
import unittest
from pathlib import Path
from shared_quran import VerseStore, resolve

class SharedQuranTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for lang in ('fa','en'):
            folder = self.root / 'quran-reflection' / lang / '002-al-baqarah' / 'units'
            folder.mkdir(parents=True)
            for v in (1,2):
                cls = 'farsi-verse' if lang == 'fa' else 'english-verse'
                (folder/f'{v:03d}.html').write_text(f'<section id="ayah-{v:03d}"><p class="arabic-text">عربي {v}</p><p class="{cls}">{lang} translation {v}</p><details data-type="reflection"><p class="arabic-text">NOT CANONICAL</p><p class="{cls}">NOT TRANSLATION</p>Private reflection</details></section>')
    def tearDown(self):self.temp.cleanup()
    def test_independent_quotes_language_and_anchors(self):
        deps={};out=resolve('<div data-quran-verses="2:1 2:2" id="old-anchor"></div>', 'fa', VerseStore(self.root), '/fa/article/', deps)
        self.assertEqual(out.count('data-canonical-verse='),2)
        self.assertIn('id="old-anchor"',out)
        self.assertIn('fa translation 1',out)
        self.assertNotIn('en translation',out)
        self.assertNotIn('Private reflection',out)
        self.assertNotIn('NOT CANONICAL',out)
        self.assertEqual(deps['fa:2:1']['pages'],['/fa/article/'])
    def test_changes_propagate_on_rebuild(self):
        marker='<div data-quran-verses="2:1"></div>'
        def render():return resolve(marker,'en',VerseStore(self.root),'/en/article/',{})
        before=render();p=self.root/'quran-reflection/en/002-al-baqarah/units/001.html'
        p.write_text(p.read_text().replace('Private reflection','Changed reflection'))
        self.assertEqual(before,render())
        p.write_text(p.read_text().replace('en translation 1','Improved translation'))
        self.assertIn('Improved translation',render())
        self.assertNotEqual(before,render())
    def test_migration_uses_preceding_label_and_preserves_prose(self):
        from migrate_article_verses import migrate
        source='<p><strong>2:1</strong></p><blockquote><p class="arabic">عربي 1</p><p class="translation">old</p></blockquote><p><strong>2:2</strong></p><p>Authored explanation.</p>'
        out,edits,remaining=migrate(source,'en',VerseStore(self.root))
        self.assertIn('data-quran-verses="2:1"',out)
        self.assertIn('<p><strong>2:2</strong></p>',out)
        self.assertIn('Authored explanation.',out)
        self.assertFalse(remaining)
    def test_persian_range_and_external_translation(self):
        from migrate_article_verses import migrate
        source='<blockquote lang="ar">عربي<p class="source"><a href="/quran-reflection/fa/002-al-baqarah/001/">آیات ۱ تا ۲</a></p></blockquote><p>ترجمه:</p><p>old translation</p><p>Keep commentary.</p>'
        out,_,_=migrate(source,'fa',VerseStore(self.root))
        self.assertIn('data-quran-verses="2:1 2:2"',out)
        self.assertNotIn('old translation',out)
        self.assertIn('Keep commentary.',out)

    def test_invalid_references_fail(self):
        for ref in ('', '2:1-2','115:1','2:287'):
            with self.assertRaises(ValueError):resolve(f'<div data-quran-verses="{ref}"></div>','en',VerseStore(self.root),'/',{})
    def test_missing_translation_fails(self):
        p=self.root/'quran-reflection/en/002-al-baqarah/units/001.html'
        p.write_text('<section id="ayah-001"><p class="arabic-text">عربي</p></section>')
        with self.assertRaises(ValueError):VerseStore(self.root).get('en',2,1)

if __name__=='__main__':unittest.main()
