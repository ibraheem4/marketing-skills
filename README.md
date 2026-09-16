# Marketing Skills

Marketing and content skills for Claude Code. Companion to [agent-skills](https://github.com/ibraheem4/agent-skills), which covers engineering practice — these cover the writing and the page.

## Skills

| Skill | Use when |
|-------|----------|
| `copywriting` | Writing or rewriting copy for a page — homepage, landing, pricing, feature, about |
| `copy-editing` | Editing copy that already exists, in focused passes |
| `stop-slop` | Removing the patterns that make prose read as AI-written |
| `landing-page` | Designing a single-offer page: structure, layout, conversion, SEO |
| `cro` | Improving conversion on any page or form |
| `popups` | Popups, modals, overlays, slide-ins and banners |
| `emails` | Email sequences, drip campaigns and lifecycle flows |
| `ab-testing` | Planning or implementing an experiment |
| `analytics` | Setting up or auditing tracking and measurement |
| `seo-audit` | Diagnosing why a site is not ranking — technical and on-page |
| `ai-seo` | Getting cited by AI assistants and answer engines |
| `programmatic-seo` | SEO pages at scale from templates and data |
| `schema` | Adding or fixing JSON-LD structured data |
| `marketing-psychology` | Why a change moves behaviour, not just what to change |
| `analyze-website-style` | Turning a reference site into design tokens and a component spec |
| `site-teardown` | Pulling a competitor's actual decisions apart on evidence |

Every cross-reference between these resolves to a skill that is here. Pointers to skills
outside this set have been removed rather than left dangling.

## Provenance and license

Most of this set is other people's work, used under MIT and credited here. Each skill's
frontmatter carries its own `author`, `source` and whether it was modified.

| Skills | Origin | License |
|---|---|---|
| `ab-testing`, `ai-seo`, `analytics`, `cro`, `emails`, `marketing-psychology`, `popups`, `programmatic-seo` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) — **copied unmodified** | MIT, © 2025 Corey Haines |
| `copywriting`, `copy-editing`, `seo-audit`, `schema` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) — **modified** | MIT, © 2025 Corey Haines |
| `stop-slop` | [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) — modified | MIT, © 2025 Hardik Pandya |
| `landing-page` | [MengTo/Skills](https://github.com/MengTo/Skills) — copied unmodified | MIT, © 2026 Meng To |
| `site-teardown` | original | MIT, © 2026 Ibraheem Abdul-Malik |

Corey Haines' library is the substantial majority of this set and is worth using directly —
it has 50 skills where this has 15. This repository exists because a smaller, self-consistent
subset is easier to reason about alongside `agent-skills`, not because it improves on the
original.

## Install

```
/plugin marketplace add ibraheem4/claude-marketplace
/plugin install marketing-skills@ibraheem4
```

Then restart Claude Code. A plugin's install directory is keyed by the version string, so a
version bump is what triggers a re-fetch — pushing alone does not.
