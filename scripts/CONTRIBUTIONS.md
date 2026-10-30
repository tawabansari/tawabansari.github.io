# Independent submitted writings

Entrances exist only on `/fa/articles/` and `/en/articles/`. The homepage and
primary navigation do not gain a new entry. The section uses its own search
JSON per language; never add these writings to `_data/study-catalog.json`,
translation pairs, or the central search records.

To publish an approved writing, create `fa/contributions/SLUG/index.md` or
`en/contributions/SLUG/index.md` with this front matter:

```yaml
---
layout: contributed-study
title: "The author's supplied title"
author: "Author's name"
topic: "Subject"
lang: en
publication_date: "2026-10-29"
permalink: /en/contributions/SLUG/
---
```

Follow with the supplied original text. Do not create a translated counterpart.
The other-language header link goes to that language's submission directory.
Do not publish draft or test articles in these directories: every rendered
article is considered published. Use `_drafts/` for unapproved material.

`prepare-library.py` invokes `prepare_contributions.py` after Jekyll. It validates
the four metadata fields, renders a no-JavaScript list, and creates standalone
`contributions-fa.json` / `contributions-en.json` with full text for local search.
Submission routes are excluded before central library enrichment and indexing.
`build-search.mjs` also rejects any submission record that reaches its input.
No submissions are included in featured reading, central suggestions, the
study catalogue, or the Tabsira Quran catalogue.

Checks: `python3 scripts/check-contributions.py _site` and
`node scripts/check-contributions.mjs`.

Individual contributions opt into reading tools with `data-contributed-study`.
They support contents, in-article search, reference previews, printing and PDF
without joining the central search catalogue. `build-pdf-client.mjs` adds their
minimal metadata to the export-only `pdf-catalog.json` as `Contributions`.
Contribution PDFs use the on-device renderer so an older hosted PDF service
cannot reject these independently catalogued articles. Exports retain the
author, subject, language, publication date, viewpoint notice and article opening.
