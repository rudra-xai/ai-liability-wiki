# AI Liability Wiki (Rudra-X AI)

A Rudra-X version of [ailawwiki.com](https://ailawwiki.com), focused on AI liability and insurance. It is a static site generated from content files, maintained by AI agents and deployed to GitHub Pages. There are no dependencies: you only need Node 18 or later.

## Run it

```bash
node src/build.js      # builds into dist/
node src/serve.js      # previews at http://localhost:5180
```

## What it does (mirrors ailawwiki.com)

| Feature | Where |
|---|---|
| Main page: lead story, "last updated" time, breaking label that expires, region chips, regional news grid | `buildHome` in `src/build.js` |
| New-story dots (new since your last visit) | `assets/app.js` |
| Opinions sidebar and archive | `content/opinions.json` |
| Upcoming-events week calendar that highlights today | `content/events.json` |
| Featured videos with key moments, and archive | `content/videos.json` |
| Latest case and legislation updates | front matter of `content/cases/*.md` and `content/legislation/*.md` |
| Reference library: insurance, cases, legislation, governance, policy, people, organizations, AI systems, topics | hub pages in `content/pages/` |
| Wiki articles with infobox, numbered sections, contents sidebar, footnote citations, "In the news" | Markdown in `content/` |
| Monthly news archives, news by year, RSS feed, sitemap | `buildNews`, `buildSpecial` |
| News database: searchable table plus Excel (.xlsx), CSV and JSON downloads of every story | `buildDatabase`, `src/export.js` |
| Search (instant overlay, `/` or Ctrl+K, and a results page), random page, all pages, recent changes | `assets/app.js`, `buildSpecial` |
| Light, dark and system themes | header switch |
| Main page checks for new builds and offers a refresh | `latest.json` |
| AI-generated text notice on every page | built in |

New to this version: an optional **Coverage lens** note on news items, explaining why a development matters for insurance.

## Writing content

Articles are Markdown with a JSON front-matter block between `---` lines. The syntax includes `[[page-slug]]` and `[[page-slug|label]]` wiki links, `[^id]` footnotes with `[^id]: source` definitions, tables, and `{{list}}` on hub pages to place the automatic listing. See `AGENTS.md` for the daily update playbook and field definitions.

## Deploying

Push to a GitHub repository with Pages set to **GitHub Actions**. `.github/workflows/deploy.yml` builds and deploys on every push and also rebuilds hourly. For a project site at `user.github.io/repo/`, set the repository variable `BASE_PATH` to `/repo/`, and update `siteUrl` in `site.json`.
