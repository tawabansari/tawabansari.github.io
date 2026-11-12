# Forqan website editorial rules

## Separate files for Quranic principles

Store each principle in its own `_data/principles/{id}.json` file, with Persian and English content together. The filename must match the permanent principle ID. Add future principles as new files in this folder; do not recreate a combined principles content file. Preserve existing page URLs and keep both languages synchronized when editing. Follow `scripts/PRINCIPLES.md` for page stubs, review markers, and validation.

## Principle titles, numbering, and topics

When the user revises a principle, suggest a clearer title in Persian and English as part of the editorial review; distinguish a wording improvement from a change in meaning. Do not silently change an approved title's meaning. Display numbers belong to the directory renderer, not principle titles, IDs, URLs, or content. Recompute consecutive numbers for the visible list after filtering and sorting. A principle may belong to multiple topic filters without duplicating its content file. Title, numbering, or category changes alone do not mark a principle editorially reviewed.

## Fixed translation of the basmala

The user approved the following exact translations of `بسم الله الرحمن الرحیم` (including its Arabic spelling/diacritic variants). Use these in all new and edited website content, article openings, verse translations, templates, and generated PDF/export openings.

- Persian: به نام آن معبود یگانه؛ فرارحمن، با رحمت فراگیر؛ فرارحیم، با رحمت ویژه.
- English: In the name of The God, the Entirely Merciful, the Especially Merciful.

Preserve this wording, capitalization, spelling, and punctuation. In Persian, write `فرارحمن` and `فرارحیم` as shown, without an intervening space. Do not substitute older formulations such as “By Name of”, “The-God”, “The Merciful / The Compassionate”, or the former Persian opening.

Existing inline links may wrap parts of the translation, but the rendered sentence must remain exactly the approved text. Preserve the Arabic original. This rule standardizes the complete basmala translation; it does not authorize rewriting other verses or general lexical/theological explanations of individual words.

When changing shared rendering or PDF code, verify that both language outputs still use these exact sentences. Search existing source content for older complete basmala translations when adding or importing articles.

## Preserve the distinction between Nabi and Rasul

Apply this approved Forqan editorial rule to all new Persian and English translations, word boxes, reflections, and subsequent revisions. Preserve the exact Quranic title rather than substituting one title for the other, even when a person holds both roles.

- `نبي` → Persian `نبی`; English `Prophet`. Do not render it as `پیامبر`, `فرستاده`, or `Messenger`.
- `رسول` → Persian `فرستاده`; English `Messenger`. Although `پیامبر` can denote a bearer of a message, use `فرستاده` as the standard equivalent to preserve the distinction. Do not substitute `نبی` or `Prophet`.
- Preserve both titles separately when both occur: `رَسُولًا نَبِيًّا` → `فرستاده‌ای و نبی` / `a Messenger and a Prophet`. For example, `نَبِيُّهُمْ` → `نبی‌شان` / `their Prophet`.

For word boxes, distinguish the general root meaning from the contextual meaning:

- Nabi, `ن ب أ`: brief root meaning `خبر مهم، آگاهی و نبأ.` / `Important news, awareness, and divine tidings.` Context: `نبی؛ دریافت‌کننده آگاهی و خبر الهی.` / `Prophet; a recipient of divine knowledge and news.` Adapt pronouns and context accurately without replacing the title. This news is not necessarily prediction of future events; do not define Prophet solely as a foreteller.
- Rasul, `ر س ل`: brief root meaning `فرستادن، روانه کردن و رساندن.` / `Sending, dispatching, and conveying.` Context: `فرستاده؛ مأمور رساندن پیام.` / `Messenger; one commissioned to convey the message.` Adapt pronouns and context accurately.

Keep direct translations limited to the equivalent of the title used in the Arabic. Discussion of the roles and possible wisdom in the choice of title belongs in the reflection, not in added interpretive wording in the verse translation. Preserve the Quran's lexical distinctions rather than merging them through customary translation habits.

## Verse ranges in reflections

When supplied reflection text cites a range of verses, expand it into individually written surah-and-verse references in both Persian and English so each verse can be referenced separately. Link each reference to its own verified, installed verse anchor. If a verse is not yet available on the site, retain its individual reference as plain text rather than inventing a destination. Apply this also to the accompanying cross-reference entry when it repeats the range.

## One established root box for Allah

The root box for `الله` is already installed and approved in Persian and English. Reuse that language's existing basmala Allah box for every occurrence in Quran verses, even when the supplied text or master prompt does not mention this rule. Do not write a new definition, paraphrase the approved text, or create a verse-specific alternative.

Use the installed Allah button in `quran-reflection/fa/002-al-baqarah/index.html` and `quran-reflection/en/002-al-baqarah/index.html` as the respective canonical sources. Copy its `data-root`, `data-root-meaning`, `data-context`, and `data-learn-more` exactly. The root-study destinations are `/quran-terminology/fa/roots/a-l-h/` and `/quran-terminology/en/roots/a-l-h/`. Do not add conflicting root notes or alternative concept links.

Apply the same definition and link to diacritic/spelling variants and attached forms such as `بالله`, `لله`, `والله`, `فالله`, `فلله`, `ولله`, `تالله`, `وتالله`, `ءالله`, `أبالله`, and `اللهم`. Preserve the actual Arabic word, its `data-word`, and any accurate word-specific transliteration. Match the word carefully; do not change other words merely because they contain similar letters, or apply this rule to every word sharing the root أ ل ه.

This rule concerns the root-box metadata, not verse translations or Arabic text. Change the shared definition only if the user explicitly requests it; then keep all occurrences consistent in the affected language.

## Preserve word boxes in verses with existing reflections during root installation

When installing or updating a root study, preserve the existing word-box text and metadata in verses that already have a ta'wil/reflection, in both Persian and English. Check the verse for existing reflection content (including `data-type="reflection"` and any included reflection files) before preparing edits. Do not replace the root label, brief root meaning, verse-specific meaning, transliteration, or notes with content from the root study. Do not remove existing notices or fill missing text fields in these protected boxes as part of root installation.

Only add the relevant `data-learn-more` root-study link when it is missing. Preserve existing links; report a conflicting link for separate review. Publishing a root study must not cause shared rendering or enrichment code to overwrite these authored boxes. Make changes to protected box text only when the user explicitly requests those changes separately.

This protection takes precedence over the completeness and placeholder-cleanup rules below during root installation. A link-only addition does not authorize completing or rewriting other fields or surrounding word boxes. If a content check identifies a pre-existing issue in a protected box, report it without changing the protected text. Before installation, verify that the only differences in protected boxes are the permitted missing-link additions.

## Complete verse word boxes

For every newly installed or edited verse in both languages, lexical words with a `data-root` must have both a nonempty `data-root-meaning` (the general brief root meaning) and a separate `data-context` (the meaning in this verse). A contextual explanation or a root-study link does not replace the general root summary. Reuse an appropriate established summary from the same language's installed root study or word box; verify that it fits the word's root and sense. Preserve the canonical Allah metadata above. Grammatical words and proper names without an assigned lexical root should retain their appropriate notes rather than receive invented roots.

Before delivery, run `python3 scripts/check-root-boxes.py` with the paths of the new or edited verse units in both languages, alongside the relevant content checks. Do not treat word counts, valid links, or the presence of `data-context` alone as proof that word boxes are complete.

## No placeholder grammar notices in completed verse boxes

When installing supplied translations and reflections, remove the generic `data-root-note` notice “واژهٔ دستوری؛ ریشهٔ اشتقاقی برای این کاربرد درج نمی‌شود.” / “Grammatical word; no derivational root is assigned for this use.” from grammatical-word buttons once their specific role and contextual meaning are provided. Show the useful grammatical explanation and verse meaning without an added explanation of why no root is assigned. Preserve substantive grammatical notes and unresolved-study notices; do not remove placeholders from unfinished verses merely for consistency.

## Related studies belong in cross-references

For Quran verse units in both languages, place the separate related-studies list inside the `data-type="cross-reference"` details, after the verse references, under its own related-studies heading. Do not append that list inside the reflection details. Preserve inline research links that form part of the authored reflection prose.
