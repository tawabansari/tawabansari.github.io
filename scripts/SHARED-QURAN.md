# Shared Quran quotations in research pages

Arabic and direct translations have one source: the direct `arabic-text` and
`farsi-verse` / `english-verse` children of the canonical ayah in
`quran-reflection/{lang}/{surah}/units/NNN.html` (or the chapter index for Fatihah).
Reflections, explanations, cross-references and nested quotations are never imported.
Do not paste another copy of the translation into an article.

Use an empty block in an HTML or Markdown article:

```html
<div class="shared-verse-placeholder" data-quran-verses="2:155 2:156"></div>
```

Every reference must be individual. Each becomes a full Arabic verse, its own
linked citation, and the translation in the article's language. Existing `id`
and `data-source-block` attributes on the marker are retained. Put editorial
comments outside the marker. Basmala openings retain the approved fixed wording.

`scripts/prepare-library.py` resolves these blocks after Jekyll and before search,
collections and PDF preparation. Run the normal full build after changing a verse;
the next deployment updates every dependent article. No browser fetch or extra
network connection is needed. Serving raw Jekyll output alone is insufficient.
Arabic uses the installed Tanzil text; the existing site Tanzil attribution applies.
Translation hyperlinks and emphasis are retained. Arabic lexical interaction stays
in the linked Quran reader. Provisional translations keep their status notice.

The generated `assets/data/verse-dependencies.json` records canonical source,
text hash and dependent article URLs. Use it to identify articles whose reasoning
may need editorial review after a translation changes: prose is never rewritten
automatically. The original article quotations remain recoverable in Git history.

Run `python3 scripts/test_shared_quran.py`, then
`python3 scripts/check-shared-quran.py _site` after a full build, alongside the
usual generated-site checks. Both dedicated checks also run in GitHub Actions.
`scripts/migrate_article_verses.py` is a conservative migration/audit helper; dry-run
is the default. Review unresolved entries (some are poetry, prayers or hadith).
Never infer that every Arabic expression is a Quran quotation.
