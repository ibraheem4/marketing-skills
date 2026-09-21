---
name: aeo-scan
description: Use when you need to measure a site's AI-search visibility rather than describe it — auditing whether answer engines can read a site, checking robots access for GPTBot/ClaudeBot/PerplexityBot, finding missing or malformed structured data, checking whether pages exist without JavaScript, verifying llms.txt and sitemap, or proving a before/after after SEO/AEO fixes. Also use when the user says "scan my site", "is my site AI-readable", "check AI visibility", "did that fix work", or asks for evidence behind an SEO claim. Runs actual checks and emits a dated artefact. For the strategy behind the findings see ai-seo; for traditional on-page auditing see seo-audit.
---

# AEO scan

`ai-seo` and `seo-audit` tell you what to look for. Neither runs anything, so
every finding they produce is an assertion. This skill is the instrument: it
fetches a site the way a model's crawler does and returns findings with a
command behind them.

## When to use it

Run it **before** advising and **after** fixing. A recommendation with no
baseline is a guess, and a fix nobody re-measured is not evidence.

## Running it

```bash
node scripts/aeo-scan.mjs example.com
node scripts/aeo-scan.mjs a.com b.com --compare --quiet
node scripts/aeo-scan.mjs example.com --out ./reports     # dated .json + .md
node scripts/aeo-scan.mjs http://127.0.0.1:8099 --allow-local   # a local build
```

Exit code is 1 when any check fails, so it works unchanged as a CI gate.

> **Behind a proxy** (sandboxes, corporate networks): set `NODE_USE_ENV_PROXY=1`.
> Node's `fetch` ignores `HTTP_PROXY` by default where `curl` honours it, and
> the symptom is every domain returning `fetch failed`.

## What it checks

| # | Check | Passes when |
|---|---|---|
| 1 | Bot access | AI crawlers are not disallowed, **and every `Sitemap:` in robots.txt actually returns 200** |
| 2 | No-JS content | Real text exists without executing JavaScript, not only in a hydration payload |
| 3 | Structured data | JSON-LD is present **and parses** — malformed is reported separately from missing, with the offending excerpt |
| 4 | First paragraph | Extracted and shown **for a human to judge** |

Plus `llms.txt`, `sitemap.xml`, canonical, Open Graph, title length.

## Rules that cost something to learn

**Check 4 reports; it never scores.** A heuristic that grades prose produces
confident wrong findings, which is worse than no check. Read the paragraph.

**A `Sitemap:` line that 404s is worse than no line.** It is a false claim, and
it is the single most common real defect — a site moves to a new canonical
domain and `robots.txt` keeps pointing at the old one.

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
node --test tests/     # 17 parser tests
```

The parsers are tested, not the network paths — a parser that is subtly wrong
is what produces confident wrong findings. Exercise the network path by running
the CLI against a real site.

## Related

`ai-seo` — strategy and the three pillars · `seo-audit` — traditional on-page
and technical audit · `schema` — writing the structured data this reports
missing · `site-teardown` — render before claiming anything visual
