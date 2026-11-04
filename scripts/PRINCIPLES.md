# Quranic Principles

The bilingual source of truth is `_data/quran-principles.json`. Entries have permanent descriptive IDs, separate positive/negative polarity, topic IDs, localized titles, aliases and explanations, a principal verse, supporting references and related IDs. Source numbers record provenance from the supplied article; they are never displayed or used as public URLs.

Do not combine positive and negative principles or discard shared citations. Split entries retain the complete original reference set. Expand verse ranges into individual `[surah, verse]` pairs. Keep explanatory prose distinct from scripture; use the site's installed Arabic and translation for verse evidence. Translations marked provisional remain marked provisional in the principle display.

Each entry has FA/EN front-matter stubs under `{lang}/principles/{id}/index.html`, with `layout: principle`, `principle_id`, `lang` and localized `title`. These URLs directly display the explanation and can be cited. Never change an established ID when editing its title; if an entry is merged, preserve its URL with a redirect.

`prepare_principles.py`, invoked by `prepare-library.py`, verifies installed anchors, inserts the principal verse and links supporting verses. An unavailable supporting verse stays plain text; a missing principal verse stops the build. It does not modify Quran source or word boxes.

The directory supports local search, positive/negative and topic filters, alphabetical/Quran order, and the shared reading panel on desktop and phone. Central search groups Principles after Quran verses; exact titles rank ahead of aliases, then explanation matches. Contributed writings remain excluded from central search.

Homepage has six destinations. Contributions is entered from the homepage, not the Books & Articles hub. Global header navigation is unchanged.

Validation: `python3 scripts/check-principles.py BUILD_DIR`, `node scripts/check-principles.mjs`, plus the existing homepage, contribution and reading-panel checks. Build Jekyll, then run `prepare-library.py` and `build-search.mjs` before validating generated output.
