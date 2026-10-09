# Forqan local library preview

## Direct PDF download preview

After building, run `pnpm run preview:pdf` and open `http://127.0.0.1:4003` to review on-demand article and verse downloads. The PDF preview requires Chromium (`pnpm exec playwright install chromium`, or set `PDF_BROWSER_PATH` to an installed Chrome executable). Each verse button offers a single verse, a range, or all published verses in the chapter. Every verse export includes Arabic, the page-language translation, and reflection, and excludes the Cross-References section. Missing verses require confirmation for range exports; multi-verse PDFs have a linked contents list. Persian/Arabic fonts are embedded; the PDF has selectable text, source links, and page numbers. See `services/pdf/README.md` for the renderer and hosting setup. The preview enables automatic browser fallback when the primary service is limited or unavailable. Cloudflare free-tier deployment and a live quota-failover check are still required before production activation. See `services/pdf/README.md` for setup and the fallback’s font/device limitations.

## Search relevance and recovery

Search now shows verse matches first (literal matches ahead of clearly labeled root/concept connections), then roots matched through a recognized root name or word form. Remaining studies, ta’wil, and incidental root mentions share a relevance-ranked group. Dedicated concept aliases and exact titles lead that group. Result counts link directly to each group.

Global search uses the existing study catalog aliases and paired concept names. Verse expansion uses existing word-level root/concept annotations, not inferred theological relationships. `_data/search-root-aliases.json` adds reviewed spellings to the existing morphology registry; ordinary English/Persian root glosses do not automatically earn root priority. Authored verse text and translations are unchanged.

The “All studies” filter includes both articles and terminology. Old `type=Articles` links remain compatible. Numeric, named, and ranged verse references are supported, and quoted queries request an exact phrase without alias expansion. Excerpts follow the engine’s actual word matches, including English word families.

The build emits versioned, language-specific search catalogs tied to the generated Pagefind entry. A dedicated worker detects failed index downloads even when Pagefind catches them internally. Searches check for a new deployment and retry a failed load once with a fresh worker. Persistent failures show a retry control rather than an apparently successful partial result. Catalog metadata permits ranking without downloading every matching long study.

`scripts/check-search-ranking.mjs` checks the real generated index in separate English/Persian processes, including Naskh/2:106, spelling aliases, root priority, filters, verse references, and excerpts. `scripts/check-search-recovery.mjs` covers deployment changes and failed downloads. Both run in `pnpm run check`.

Local branch: `codex/article-collections`. No commits, push, or deployment are required to preview.

## Build and preview

With the existing Ruby/Bundler environment and Node.js 24 with pnpm 11.19.0 available:

```sh
bundle check
pnpm install --frozen-lockfile
pnpm run preview
```

Open http://127.0.0.1:4000. Stop with Ctrl-C. Re-run after editing to regenerate availability and full-text search.

The build runs Jekyll, enriches **generated HTML only**, and then builds normalized Pagefind records. A plain Jekyll build alone does not produce the search index or availability checks. The GitHub Pages workflow runs the supported GitHub Pages Jekyll builder, then the same enrichment, search indexing, and validation commands used locally. The hosted Jekyll environment may differ from your local Ruby installation; pull-request checks validate its output before merging.

## Scope

- Bilingual home with rotating verse/root/article excerpts, simple Introduction and Methodology links, a Home icon, and Selected Reading / گزیده‌ای از مطالب at the bottom.
- Visible zoom/theme controls; header hides when scrolling down and returns when scrolling up, remaining accessible during keyboard/menu interaction.
- Full-text search with English/Farsi and section filters, Qur’an passages before articles and roots, exact-title priority, normalized Arabic/Persian spelling, typo suggestions, original excerpts, and per-section load-more results.
- Published-only directory filtering; unpublished links clearly labeled.
- Automatic contents, find within a study, saved reading continuation.
- Generated availability data prevents the verse navigator offering unpublished content.
- Existing translations, studies, source fragments, public paths, and authored anchors are preserved.
- Translation pairs with differing slugs can be maintained centrally in `_data/translation-pairs.json`; uncertain pairs fall back to the language library.

## Validation

```sh
node scripts/check-search.mjs _site
python3 scripts/check-library.py _site
```

Search uses the same normalization for indexing and queries, plus existing root aliases and conservative typo suggestions. It is not semantic/AI search. Persian stemming is not provided by Pagefind. Bookmarks and accounts are outside this first preview. Existing page-specific styles are retained for compatibility.

## Publishing after review

1. Commit the reviewed files on `codex/article-collections`, then push that branch and open a pull request into `main`.
2. Wait for the **Build and publish site / build** check to pass. Pull requests build and validate without deploying.
3. In the repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. Keep the custom domain set to `forqan.co`.
4. Merge into `main`. The workflow builds, checks, and deploys the complete `_site` artifact automatically. Later content updates on `main` use this same pipeline.

If the changes reach `main` before the Pages source is configured, set the source and rerun the workflow from the Actions tab. Manual runs deploy only when run against `main`.

Do not commit `_site`, `node_modules`, or `vendor`. No content-by-content migration is needed. Phone layout review remains a manual check before publishing.

## Article collections preview

The article hub now separates collections from individual writings. Qur’an Terminology / مفاهیم قرآنی has its own homepage entrance; its entries are alphabetical by concept in each language. Qur’an Completeness and Hadith Critique use a proposed reading order. Articles and Reflections uses known publication dates, with undated entries following alphabetically. Missing publication dates are not inferred from layout changes.

`_data/study-catalog.json` controls collection membership, short concept labels, directory summaries, suggested order, and selected related reading. Full titles and recorded dates are read from the actual Jekyll documents. Salat, Zakat, and Riba appear in both Terminology and Articles and Reflections, using their original URLs. Salat and Zakat also have dedicated collection pages. No article body needs to move or change.

New writings are included automatically based on their existing section until catalogued. The build rejects broken catalog destinations, repeated membership, and invalid related-study links. `pnpm run check` also verifies collection counts, title consistency, alphabetical order, shared entries, and the two restored English translations.

Review the homepage, both language versions of the article hub and Terminology, a shared study, its return link after opening it from a list, and related reading. The proposed reading order and directory summaries are editorial choices for review. Changes remain local until approved.

## Mobile layout and verse search refinement

Phone headers use a deliberate two-row layout: Home and section navigation, followed by reading controls, Search, language, and menu. Search controls can shrink and wrap within the viewport; input and select text has a 16px minimum to avoid focus zoom on mobile.

Search now indexes Arabic verse text and its translation separately from ta’wil. Default order is verse text, roots, terminology, articles, then ta’wil. Exact article titles stay in their category. Verse results show the actual Arabic and translation; ta’wil results open the corresponding reflection. Explicit root forms (such as `ص ل و`) can match existing word annotations. Coverage is limited to published passages and available annotations, not the entire Qur’an or a semantic concept search.

Search groups handle loading failures independently and provide retry controls. The earlier phone loading error could not be diagnosed from the screenshot alone; physical-device verification is still needed.

## Compact browsing refinement

Homepage section headings are the two language-specific links, with balanced English/Persian typography; duplicate links and decorative numbers are removed. Collection directories display every title on one page. Directories use compact title rows on phones and desktops, with no fixed card height or title truncation. A single letter selector sits beside search; All letters is the default and selecting a letter filters the list. Articles offer newest-first and alphabetical ordering; the thematic collections retain their suggested reading order and identify a starting study.

The in-collection filter searches full titles, concept names, descriptions, and catalog aliases. Letter, text, and study-type filters combine without changing the selected reading order. The letter selector stays stable while filtering; clearing filters restores all titles. Query, letter, study type, and sort are reflected in the URL and retained by “Back to your list”; old page and title-anchor links remain usable. Without JavaScript, the complete static list remains accessible. The redundant directory breadcrumb is removed; conceptual studies no longer appear beneath Roots in their breadcrumb.

At wide desktop sizes a reserved side column shows the selected study’s standalone abstract, without overlapping titles or changing their positions. At narrower sizes an information button opens a compact bottom sheet. Titles always navigate directly, including on touch screens. Previews show the full title, publication type, authored summary/description, and up to three actual section headings. They offer Read and Download PDF actions using the same primary/fallback PDF mechanism as the full study page. Closing or changing a preview cancels an in-progress export.

The homepage entrance is Books & Articles / کتاب‌ها و مقاله‌ها, shortened to Books / کتاب‌ها in the phone header. Study types are editorial catalog metadata, not inferred from PDF page counts. Salat, Zakat and The Book of Riba are marked as books in both languages; other catalogued studies and articles retain their distinct types.

Review English and Persian directories, letter selection, ordering, combined filters, preview-to-study navigation and returning to the same title. The automated browser-logic test exercises all 105 entries and ordering with missing dates. Physical-phone appearance remains for user review before publishing.
