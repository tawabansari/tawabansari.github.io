"""Citation regressions: bidi isolation, complete ranges and safe scope."""
from verse_references import verse_references
from library_enrichment import unavailable_references

def wrap(s):return '<main id="main-content">'+s+'</main>'
source=wrap('<p>ابراهیم ۱۴:۳۵–۳۷</p>')
out=verse_references(source,'fa')
assert out.count('data-verse-citation=')==3
for v in [35,36,37]:
 assert f'/014-ibrahim/#ayah-{v:03d}' in out
assert '<bdi dir="ltr">۱۴:۳۶</bdi>' in out
assert verse_references(out,'fa')==out
source=wrap('<p><a href="/quran-reflection/en/002-al-baqarah/#ayah-001">Al-Baqarah 2:1–4</a></p>')
out=verse_references(source,'en');assert out.count('data-verse-citation=')==4 and 'Al-Baqarah ' in out
source=wrap('<p><a href="/quran-reflection/fa/028-al-qasas/#ayah-052">۲۸:۵۲</a>–<a href="/quran-reflection/fa/028-al-qasas/#ayah-053">۵۳</a></p>')
out=verse_references(source,'fa');assert out.count('data-verse-citation=')==2 and '<bdi dir="ltr">۲۸:۵۳</bdi>' in out
for unchanged in ['<p>Meeting at 2:30; ratio 2:1; 2026:10–12.</p>', '<p>بقره ۲:۲۸۷–۲۸۹</p>', '<p class="source">Genesis 6:1–4</p>', '<p class="source">Sahih Bukhari 2:1–4</p>', '<p lang="ar">البقرة 2:1–4</p>', '<pre>بقره ۲:۱–۴</pre>', '<a href="https://example.com/">بقره ۲:۱–۴</a>', '<button data-ref="2:1–4">بقره ۲:۱–۴</button>']:
 assert verse_references(wrap(unchanged),'fa')==wrap(unchanged),unchanged
assert verse_references('<nav>بقره ۲:۱–۴</nav>','fa')=='<nav>بقره ۲:۱–۴</nav>'
source=verse_references(wrap('<p>بقره ۲:۱–۴</p>'),'fa')
chapter='/quran-reflection/fa/002-al-baqarah/'
out=unavailable_references(source,'/fa/articles/test/','fa',{chapter:{'anchors':['ayah-001','ayah-003']}},{})
assert out.count('data-unpublished-reference=')==2 and out.count('href=')==2
assert verse_references(out,'fa')==out
print('Passed complete ranges, isolated full labels, separate endpoints, idempotence, invalid numbers, unrelated numbers, external links, Arabic/code exclusion, and per-verse publication status.')

source=wrap('<p><a href="/quran-reflection/en/002-al-baqarah/#ayah-001">2:1</a>–<a href="/quran-reflection/en/002-al-baqarah/#ayah-004">2:4</a></p>')
assert verse_references(source,'en').count('data-verse-citation=')==4

protected='<pre>'+source+'</pre>'
assert verse_references(protected,'en')==protected

# Biblical chapter/verse numbers must not become Qur'an citations, even in
# cross-reference containers or after a mention of the Qur'an.
for lang, sample in [
    ('fa', '<p class="cross-reference">ایوب ۱:۶ و ۲:۱</p>'),
    ('fa', '<p class="cross-reference">اول پادشاهان ۲۲:۱۹ تا ۲۲:۲۲</p>'),
    ('fa', '<p class="cross-reference">تثنیه ۱۴:۱</p>'),
    ('en', '<p class="cross-reference">Job 1:6–12 and 2:1–6</p>'),
    ('en', '<p class="cross-reference">1 Kings 22:19–22</p>'),
    ('en', '<p>The Qur’an is compared with Job 38:7.</p>'),
]:
    assert verse_references(wrap(sample), lang) == wrap(sample), sample
print('Passed Biblical citation exclusions in Persian and English.')
