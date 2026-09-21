---
name: ai-visibility-scan
description: Use when you need to measure a site's search and AI visibility rather than describe it — running an SEO, AEO, GEO, answer-engine-optimization or generative-engine-optimization audit that actually fetches the site. Checks technical foundations (lang, hreflang, heading order, alt text, duplicate titles, canonical consistency, thin content) and answer-engine readiness (robots access for GPTBot/ClaudeBot/PerplexityBot, JSON-LD presence and validity, content without JavaScript, llms.txt, sitemap, first-paragraph answers). Also use when the user says "scan my site", "SEO audit", "AEO analysis", "GEO audit", "is my site AI-readable", "check AI visibility", "will ChatGPT cite us", "did that fix work", or asks for evidence behind an SEO claim. Emits a dated before/after artefact. For strategy see ai-seo; for the manual on-page checklist see seo-audit.
---

# AI visibility scan

`ai-seo` and `seo-audit` tell you what to look for. Neither runs anything, so
every finding they produce is an assertion. This skill is the instrument: it
fetches a site the way a model's crawler does and returns findings with a
command behind them.

## When to use it

Run it **before** advising and **after** fixing. A recommendation with no
baseline is a guess, and a fix nobody re-measured is not evidence.

## Running it

```bash
node scripts/visibility-scan.mjs example.com
node scripts/visibility-scan.mjs a.com b.com --compare --quiet
node scripts/visibility-scan.mjs example.com --out ./reports     # dated .json + .md
node scripts/visibility-scan.mjs http://127.0.0.1:8099 --allow-local  # a local build
```

Exit code is 1 when any check fails, so it works unchanged as a CI gate.

> **Behind a proxy** (sandboxes, corporate networks): set `NODE_USE_ENV_PROXY=1`.
> Node's `fetch` ignores `HTTP_PROXY` by default where `curl` honours it, and
> the symptom is every domain returning `fetch failed`.

## What it checks

Reported as two sections, and the order is the point: **answer-engine work
layers onto foundations rather than replacing it.** A report that mixes them
invites fixing the interesting half first.

**Foundations** — the SEO layer everything else sits on.

| Check | Fails when |
|---|---|
| `lang` | `<html>` declares no language |
| Heading order | A level is skipped, or there are multiple `<h1>` |
| Alt text | `<img>` without an `alt` attribute (`alt=""` counts as present) |
| Duplicate metadata | Two pages share a title or meta description |
| Canonical consistency | A page canonicalises somewhere other than itself |
| Thin content | Under 250 words |

**Answer engines** — readiness for extraction and citation.

| Check | Passes when |
|---|---|
| Bot access | AI crawlers are not disallowed, **and every `Sitemap:` in robots.txt returns 200** |
| No-JS content | Real text exists without executing JavaScript, not only in a hydration payload |
| Structured data | JSON-LD is present **and parses** — malformed is reported separately from missing, with the excerpt |
| First paragraph | Extracted and shown **for a human to judge** |

Plus `llms.txt`, `sitemap.xml`, canonical, Open Graph, `hreflang`, title length.

**Not covered, deliberately:** Core Web Vitals and anything needing a rendered
DOM, which require a real browser or the PageSpeed API — different runtime,
different failure modes. And whether models actually name you, which costs
money per run and recurs. Both are their own decision, not a bolt-on.

## Rules that cost something to learn

**Check 4 reports; it never scores.** A heuristic that grades prose produces
confident wrong findings, which is worse than no check. Read the paragraph.

**A `Sitemap:` line that 404s is worse than no line.** It is a false claim, and
it is the single most common real defect — a site moves to a new canonical
domain and `robots.txt` keeps pointing at the old one.

**A scan's blind spots are invisible by construction.** This tool reported
"0 failures" on a site whose `<html>` had no `lang` attribute, because no check
looked. "0 failures" means "passed the checks that exist", never "is good", and
the report should be read that way. Foundations exists because of that miss.

**Check what is deployed, not what the repo says.** A build config naming one
origin while the live site canonicalises to another silently poisons every
absolute URL, and no source-reading audit catches it. Fetch the live site.

**A sitemap names the canonical origin, not where a local build is served.**
The engine rebases sitemap URLs onto the origin under test; without that, a
"local" scan silently measures production and reports it as the build. This
happened during development.

**The results artefact must survive being shared.** A scan report rendered
client-side in an app route cannot be read by a model or previewed by a chat
app — which defeats the point of a report about machine readability. Observed
in the wild on a funded AEO product's own results page, 2026-09-21.

**SSRF protection belongs in the service, not a WAF.** A WAF cannot tell
`169.254.169.254` from a customer's domain. `assertFetchable` refuses private
ranges and non-HTTP protocols; `allowLocal` exists only for the CLI and CI
shells and must never be set by an HTTP endpoint taking a stranger's input.

## Verification

```bash
node --test tests/     # 27 parser tests
```

The parsers are tested, not the network paths — a parser that is subtly wrong
is what produces confident wrong findings. Exercise the network path by running
the CLI against a real site.

## Naming

One canonical name, synonyms in the description. "AI visibility" is the entity;
SEO, AEO, GEO and answer-engine optimization are the vocabulary, and they live
in the frontmatter where they cost nothing. Splitting into `seo-scan` and
`aeo-scan` would fragment the signal — the exact failure this tool detects.
`geo` is kept out of the name because it collides with geography.

## Related

`ai-seo` — strategy and the three pillars · `seo-audit` — the manual on-page
checklist this automates part of · `schema` — writing the structured data this
reports missing · `site-teardown` — render before claiming anything visual
