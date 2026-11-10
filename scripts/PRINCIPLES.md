# Quranic Principles

The bilingual source of truth is `_data/principles/{id}.json`: one JSON object per principle, with Persian and English together in the same file. The filename must exactly match the permanent `id`. There is no combined content file to maintain. Entries have permanent descriptive IDs, separate positive/negative polarity, topic IDs, localized titles, aliases and explanations, a principal verse, optional ordered `evidence` verses for sufficient context, supporting references and related IDs. Source numbers record provenance from the supplied article; they are never displayed or used as public URLs.

Do not combine positive and negative principles or discard shared citations. Split entries retain the complete original reference set. Expand verse ranges into individual `[surah, verse]` pairs. Keep explanatory prose distinct from scripture; use the site's installed Arabic and translation for verse evidence. Translations marked provisional remain marked provisional in the principle display unless the user has supplied an approved principle-specific `primary_translation`.

Each entry has FA/EN front-matter stubs under `{lang}/principles/{id}/index.html`, with `layout: principle`, `principle_id`, `lang` and localized `title`. These URLs directly display the explanation and can be cited. Never change an established ID when editing its title; if an entry is merged, preserve its URL with a redirect.

`prepare_principles.py`, invoked by `prepare-library.py`, verifies installed anchors, inserts the principal verse and links supporting verses. An unavailable supporting verse stays plain text; a missing principal verse stops the build. It does not modify Quran source or word boxes.

The directory supports local search, positive/negative and topic filters, suggested reading order (default), alphabetical/Quran order, and a pinned two-column reader on wide desktop screens; narrow screens use the shared modal reader. Central search groups Principles after Quran verses; exact titles rank ahead of aliases, then explanation matches. Contributed writings remain excluded from central search.

Homepage has six destinations. Contributions is entered from the homepage, not the Books & Articles hub. Global header navigation is unchanged.

Validation: `python3 scripts/check-principle-data.py`, `python3 scripts/check-principle-regeneration.py`, `python3 scripts/check-principles.py BUILD_DIR`, `node scripts/check-principles.mjs`, plus the existing homepage, contribution and reading-panel checks. Build Jekyll, then run `prepare-library.py` and `build-search.mjs` before validating generated output.

`reading_order` is an editorial study sequence, not a claim of divine ranking. It starts with faith and Quranic foundations, justice, life and dignity, then related practical duties. All 144 principal selections were reviewed in November 2026; dependent fragments receive adjacent evidence or a self-contained alternative, while original and shared citations remain intact.

Evidence is re-extracted from the built Forqan chapter on every build, including translation status. By default, do not duplicate translations in principle data. An explicitly supplied editorial translation can be stored as `fa.primary_translation` and `en.primary_translation`; it affects only that principle, not the Quran source. References follow each displayed translation. After the explanation, display the principal verse evidence first, then supporting citations under «آیات مشابه دیگر» / “Other similar verses”, then related principles. Supporting citations remain compact. Copy link, PDF and print use the existing study tools. Principles are explicitly eligible in the published PDF catalog; contributed content remains excluded from central search.

The shared reading controller retains scroll and open details per history entry, with back/forward and a history selector. Choosing a new entry after going back discards the forward branch. Desktop inline selection is click-only; phones retain the modal. Global navigation exclusions are unchanged.

November follow-up: Persian evidence translations are centered; localized aliases appear inline with the heading. The reader toolbar owns copy/current-page PDF/print controls while embedded principle tools are hidden. Return-to-text restores the directory-selected principle and its reading position; Close dismisses the reader. Public Tanzil attribution is in the shared site footer, with source comments and independent export attribution retained.

The introductory overview is collapsed by default in both languages, separately from the ongoing-study note. Titles use «اصل » / “The Principle of ” in data and page metadata; alphabetical sorting ignores these prefixes and aliases. Permanent IDs and URLs are unchanged.

## Adding or editing a principle

1. Edit `_data/principles/{id}.json`, keeping both languages synchronized. For a new principle, create a separate JSON object in this folder; do not recreate the former combined file.
2. Keep the established fields: `id`, `source`, `polarity`, `categories`, individual `refs`, `primary`, `related`, `fa`, `en`, and `reading_order`. Each language contains `title`, `aliases`, and `description`. Use a new permanent ID for a new principle and an appropriate study sequence in `reading_order`.
3. For a new principle, also create its Persian and English page stubs under `fa/principles/{id}/index.html` and `en/principles/{id}/index.html`, following the existing front matter. Update the localized stub title if its title changes.
4. Optional `reference_groups` organize references by bilingual headings; `reference_notes` provide bilingual explanations for individual references. Keep these references in `refs` as well. `related` contains existing principle IDs.
5. Set `editorial_reviewed` to `true` only when the user's Persian revision and the synchronized English revision are complete. This displays the small green dot in the directory and detail page. New, unreviewed principles omit the field or use `false`.
6. Build and validate as described above. Jekyll automatically reads the folder as `site.data.principles`; Python preparation and checks use `principle_data.load_principles`. No content registry or combined JSON regeneration is needed.

Directory numbers are generated at display time from the visible, sorted rows, continuously across the positive/negative groups. Filtering starts the visible numbering at 1. They are not permanent principle identifiers. Topic membership is many-to-many through each record’s `categories` array; one content file can appear under multiple filters. When reviewing a supplied revision, suggest clearer bilingual title wording without silently changing its meaning.

The 20 bilingual topic filters are defined in `_data/principle-categories.json`. Assign each principle to all directly relevant topics in its `categories` array, using only those IDs and no duplicates. Every principle must have at least one topic. Keep the existing IDs stable; `faith` now labels ethics and self-development, while worship, divine duties, and oneness have their own filters. Topic membership does not imply that a principle is newly reviewed.

Optional `related_groups` contain bilingual `fa`/`en` headings and ordered `ids` lists. Their flattened IDs must match `related` exactly, so grouping never drops or duplicates a related principle. Without these groups, the existing flat related list is retained.
