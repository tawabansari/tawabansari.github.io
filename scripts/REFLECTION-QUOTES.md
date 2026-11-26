# Quran quotations inside authored reflections

Install semantic markup in the original verse unit or included reflection source, not `_site` and not a per-verse stylesheet.

```html
<p class="arabic-text" lang="ar" dir="rtl">«قَدْ كَانَ لَكُمْ آيَةٌ فِي فِئَتَيْنِ الْتَقَتَا»</p>
<p class="translation">«در دو گروهی که به هم رسیدند، نشانه‌ای برای شما بود.»</p>
```

Use the same classes in English. Translation text retains the page language and direction. Where a separate citation is authored, place it between the Arabic and translation (or after the translation) as `p.verse-ref` and verify its own installed verse anchor. Do not invent a citation, translation, or unavailable link. A citation combined with explanatory prose is not a standalone `verse-ref`.

Before installation:

- Identify standalone Quran excerpts from their actual Arabic text and context. Bold styling alone is not evidence. Inline quotations remain inline.
- Distinguish an associated translation from commentary, lexical discussion, another Arabic excerpt, and non-Quran quotations. Mark only the translation.
- Preserve all Arabic, translation and commentary wording, existing links, and word-button metadata. Structural repairs must not become editorial rewrites.
- For an existing approved Arabic class, retain its other classes and add the canonical `arabic-text`, `lang="ar"`, and `dir="rtl"` attributes.

Final checks:

1. Run `python3 scripts/check-reflection-quotes.py PATH...` and `python3 scripts/check-root-boxes.py PATH...` for both languages. The quotation checker finds verifiable unmarked excerpts and checks explicit Arabic attributes; human review is still required for translation association and excerpts with ellipses or alternate spelling.
2. Compare pre/post rendered text and word-button HTML for structural-only edits; neither may change.
3. Inspect both languages in a browser at desktop and phone widths: Arabic font, centered quotation/translation, citation layout, no horizontal overflow, and unchanged ordinary prose.
4. Report a build or preview limitation explicitly. Never claim a successful full build from a source-only preview.
