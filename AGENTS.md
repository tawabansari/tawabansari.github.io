# Forqan website editorial rules

## Fixed translation of the basmala

The user approved the following exact translations of `بسم الله الرحمن الرحیم` (including its Arabic spelling/diacritic variants). Use these in all new and edited website content, article openings, verse translations, templates, and generated PDF/export openings.

- Persian: به نام آن معبود یگانه؛ فرارحمن، با رحمت فراگیر؛ فرارحیم، با رحمت ویژه.
- English: In the name of The God, the Entirely Merciful, the Especially Merciful.

Preserve this wording, capitalization, spelling, and punctuation. In Persian, write `فرارحمن` and `فرارحیم` as shown, without an intervening space. Do not substitute older formulations such as “By Name of”, “The-God”, “The Merciful / The Compassionate”, or the former Persian opening.

Existing inline links may wrap parts of the translation, but the rendered sentence must remain exactly the approved text. Preserve the Arabic original. This rule standardizes the complete basmala translation; it does not authorize rewriting other verses or general lexical/theological explanations of individual words.

When changing shared rendering or PDF code, verify that both language outputs still use these exact sentences. Search existing source content for older complete basmala translations when adding or importing articles.

## Verse ranges in reflections

When supplied reflection text cites a range of verses, expand it into individually written surah-and-verse references in both Persian and English so each verse can be referenced separately. Link each reference to its own verified, installed verse anchor. If a verse is not yet available on the site, retain its individual reference as plain text rather than inventing a destination. Apply this also to the accompanying cross-reference entry when it repeats the range.

## One established root box for Allah

The root box for `الله` is already installed and approved in Persian and English. Reuse that language's existing basmala Allah box for every occurrence in Quran verses, even when the supplied text or master prompt does not mention this rule. Do not write a new definition, paraphrase the approved text, or create a verse-specific alternative.

Use the installed Allah button in `quran-reflection/fa/002-al-baqarah/index.html` and `quran-reflection/en/002-al-baqarah/index.html` as the respective canonical sources. Copy its `data-root`, `data-root-meaning`, `data-context`, and `data-learn-more` exactly. The root-study destinations are `/quran-terminology/fa/roots/a-l-h/` and `/quran-terminology/en/roots/a-l-h/`. Do not add conflicting root notes or alternative concept links.

Apply the same definition and link to diacritic/spelling variants and attached forms such as `بالله`, `لله`, `والله`, `فالله`, `فلله`, `ولله`, `تالله`, `وتالله`, `ءالله`, `أبالله`, and `اللهم`. Preserve the actual Arabic word, its `data-word`, and any accurate word-specific transliteration. Match the word carefully; do not change other words merely because they contain similar letters, or apply this rule to every word sharing the root أ ل ه.

This rule concerns the root-box metadata, not verse translations or Arabic text. Change the shared definition only if the user explicitly requests it; then keep all occurrences consistent in the affected language.

## Complete verse word boxes

For every newly installed or edited verse in both languages, lexical words with a `data-root` must have both a nonempty `data-root-meaning` (the general brief root meaning) and a separate `data-context` (the meaning in this verse). A contextual explanation or a root-study link does not replace the general root summary. Reuse an appropriate established summary from the same language's installed root study or word box; verify that it fits the word's root and sense. Preserve the canonical Allah metadata above. Grammatical words and proper names without an assigned lexical root should retain their appropriate notes rather than receive invented roots.

Before delivery, run `python3 scripts/check-root-boxes.py` with the paths of the new or edited verse units in both languages, alongside the relevant content checks. Do not treat word counts, valid links, or the presence of `data-context` alone as proof that word boxes are complete.

## No placeholder grammar notices in completed verse boxes

When installing supplied translations and reflections, remove the generic `data-root-note` notice “واژهٔ دستوری؛ ریشهٔ اشتقاقی برای این کاربرد درج نمی‌شود.” / “Grammatical word; no derivational root is assigned for this use.” from grammatical-word buttons once their specific role and contextual meaning are provided. Show the useful grammatical explanation and verse meaning without an added explanation of why no root is assigned. Preserve substantive grammatical notes and unresolved-study notices; do not remove placeholders from unfinished verses merely for consistency.
