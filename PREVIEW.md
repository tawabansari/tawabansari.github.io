# Forqan local library preview

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

Homepage section headings are the two language-specific links, with balanced English/Persian typography; duplicate links and decorative numbers are removed. Concept directories display short concept names in a responsive grid with 24 entries per page. Other collections display compact titles and descriptions with 10 entries per page. Small collections do not show pagination.

The in-collection filter searches all entries (full titles, concept names, descriptions, and catalog aliases), not only the visible page. Concept letter buttons filter the collection. The current query, letter, and page are reflected in the URL and retained by “Back to your list.” Without JavaScript, the complete static list remains accessible. The redundant directory breadcrumb is removed; conceptual studies no longer appear beneath Roots in their breadcrumb.

Review English and Persian concept grids, page 2, an alphabet filter, a term on another page, and returning from a study. The automated browser-logic test exercises a 105-entry collection. Physical-phone appearance remains for user review before publishing.
