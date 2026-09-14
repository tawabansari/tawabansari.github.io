# Forqan local library preview

Local branch: `codex/library-preview`. No commits, push, or deployment are required to preview.

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

1. Commit the reviewed files on `codex/library-preview`, then push that branch and open a pull request into `main`.
2. Wait for the **Build and publish site / build** check to pass. Pull requests build and validate without deploying.
3. In the repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. Keep the custom domain set to `forqan.co`.
4. Merge into `main`. The workflow builds, checks, and deploys the complete `_site` artifact automatically. Later content updates on `main` use this same pipeline.

If the changes reach `main` before the Pages source is configured, set the source and rerun the workflow from the Actions tab. Manual runs deploy only when run against `main`.

Do not commit `_site`, `node_modules`, or `vendor`. No content-by-content migration is needed. Phone layout review remains a manual check before publishing.
