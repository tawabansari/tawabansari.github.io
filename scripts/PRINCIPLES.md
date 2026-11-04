# Quranic Principles

The bilingual source of truth is `_data/quran-principles.json`. Entries have permanent descriptive IDs, separate positive/negative polarity, topic IDs, localized titles, aliases and explanations, a principal verse, optional ordered `evidence` verses for sufficient context, supporting references and related IDs. Source numbers record provenance from the supplied article; they are never displayed or used as public URLs.

Do not combine positive and negative principles or discard shared citations. Split entries retain the complete original reference set. Expand verse ranges into individual `[surah, verse]` pairs. Keep explanatory prose distinct from scripture; use the site's installed Arabic and translation for verse evidence. Translations marked provisional remain marked provisional in the principle display.

Each entry has FA/EN front-matter stubs under `{lang}/principles/{id}/index.html`, with `layout: principle`, `principle_id`, `lang` and localized `title`. These URLs directly display the explanation and can be cited. Never change an established ID when editing its title; if an entry is merged, preserve its URL with a redirect.

`prepare_principles.py`, invoked by `prepare-library.py`, verifies installed anchors, inserts the principal verse and links supporting verses. An unavailable supporting verse stays plain text; a missing principal verse stops the build. It does not modify Quran source or word boxes.

The directory supports local search, positive/negative and topic filters, suggested reading order (default), alphabetical/Quran order, and a pinned two-column reader on wide desktop screens; narrow screens use the shared modal reader. Central search groups Principles after Quran verses; exact titles rank ahead of aliases, then explanation matches. Contributed writings remain excluded from central search.

Homepage has six destinations. Contributions is entered from the homepage, not the Books & Articles hub. Global header navigation is unchanged.

Validation: `python3 scripts/check-principles.py BUILD_DIR`, `node scripts/check-principles.mjs`, plus the existing homepage, contribution and reading-panel checks. Build Jekyll, then run `prepare-library.py` and `build-search.mjs` before validating generated output.

`reading_order` is an editorial study sequence, not a claim of divine ranking. It starts with faith and Quranic foundations, justice, life and dignity, then related practical duties. All 144 principal selections were reviewed in November 2026; dependent fragments receive adjacent evidence or a self-contained alternative, while original and shared citations remain intact.

Evidence is re-extracted from the built Forqan chapter on every build, including translation status. Never duplicate translations in principle data. References follow each displayed translation. Further references are compact and precede the evidence. Copy link, PDF and print use the existing study tools. Principles are explicitly eligible in the published PDF catalog; contributed content remains excluded from central search.

The shared reading controller retains scroll and open details per history entry, with back/forward and a history selector. Choosing a new entry after going back discards the forward branch. Desktop inline selection is click-only; phones retain the modal. Global navigation exclusions are unchanged.

November follow-up: Persian evidence translations are centered; localized aliases appear inline with the heading. The reader toolbar owns copy/current-page PDF/print controls while embedded principle tools are hidden. Return-to-text restores the directory-selected principle and its reading position; Close dismisses the reader. Public Tanzil attribution is in the shared site footer, with source comments and independent export attribution retained.
