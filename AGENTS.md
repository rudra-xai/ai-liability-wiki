# Agent playbook: keeping the AI Liability Wiki up to date

This wiki is maintained by AI agents. Run this playbook daily, for example as a scheduled Claude task, from the repository root.

## 1. Find today's news

Search for new developments since the newest `published` timestamp in `content/news.json`. Cover AI liability, AI insurance and coverage, AI litigation, AI legislation and regulation, and insurers' use of AI. Prefer primary sources (dockets, official journals, regulators) and reputable outlets.

## 2. Add stories to `content/news.json`

Each story:

```json
{
  "id": "YYYY-MM-DD-short-slug",
  "published": "2026-10-19T12:38:00-04:00",
  "title": "Sentence-case headline",
  "summary": "3–5 sentences, in your own words. Say who reported or decided what. Mark allegations as allegations and proposals as proposals.",
  "lens": "Optional: one or two sentences on why this matters for insurance. General analysis, never advice.",
  "jurisdictions": ["United States"],
  "tags": ["cyber"],
  "sources": [{ "name": "Outlet", "url": "https://..." }],
  "related": ["existing-page-slug"]
}
```

- The newest story becomes the main-page lead. Stories from the lead's day are grouped by region below it.
- `jurisdictions` must use names from `FLAGS` in `src/util.js`. Add a name there if one is missing.
- Never copy text from sources. Summarize briefly and link.

## 3. Update case and legislation pages

For each affected page in `content/cases/` or `content/legislation/`:

- Update `updated` (YYYY-MM-DD), `update` (one-line latest development), `updateKind` (`Case update` or `Opinion/Order`) or `status` (`proposed`, `enacted`, `in-force`, `guidance`, `withdrawn`).
- Add a dated section to the body with a footnote citing the primary document.
- Create a new page for any significant new case or law. Copy an existing file's front matter as a template.

## 4. Events, opinions and videos

- `content/events.json`: hearings, deadlines and effective dates for the coming two weeks.
- `content/opinions.json`: notable op-eds (title, author, outlet, date, url, optional summary).
- `content/videos.json`: talks or hearings, with `moments` from the publisher's chapter list only.

## 5. Build, check and publish

```bash
node src/build.js
```

The build fails on duplicate slugs and invalid JSON. Then search `dist/` for `class="new"`; each match is a wiki link to a missing page. Fix it or create the page. Commit with a message such as `News and case updates for 2026-10-20` and push; GitHub Actions deploys automatically.

## Writing rules

- Every page is labeled AI-generated. Accuracy matters more than coverage: if something cannot be verified, leave it out.
- Neutral tone. No legal or insurance advice. Never describe a specific insurer's policy terms unless they are public.
- Profiles of people cover public professional work only.

## News database

Every story in `content/news.json` is also exported at build time to the [news database](https://rudra-xai.github.io/ai-liability-wiki/news/database/) page and to `downloads/ai-liability-news.xlsx`, `.csv` and `.json`. Never delete old stories: the file is the permanent record. Always fill `jurisdictions` and `tags`, because they are filter columns.
