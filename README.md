# Marketing Skills

Marketing and content skills for Claude Code. Companion to [agent-skills](https://github.com/ibraheem4/agent-skills), which covers engineering practice — these cover the writing and the page.

## Skills

| Skill | Use when |
|-------|----------|
| `copywriting` | Writing or rewriting copy for a page — homepage, landing, pricing, feature, about |
| `copy-editing` | Editing copy that already exists, in focused passes |
| `landing-page` | Designing a single-offer page: structure, layout, conversion, SEO |
| `seo-audit` | Diagnosing why a site is not ranking — technical and on-page |
| `schema-markup` | Adding or fixing JSON-LD structured data |
| `site-teardown` | Pulling a competitor's actual decisions apart on evidence, before copying them |
| `stop-slop` | Removing the patterns that make prose read as AI-written |

## Install

```
/plugin marketplace add ibraheem4/claude-marketplace
/plugin install marketing-skills@ibraheem4
```

Then restart Claude Code. A plugin's install directory is keyed by the version string, so a
version bump is what triggers a re-fetch — pushing alone does not.

## Known gaps

Three skills reference siblings that do not exist yet, so those pointers dead-end:

- `copywriting` → `email-sequence`, `popup-cro`
- `seo-audit` → `programmatic-seo`

They are left in place rather than edited out, because they describe the intended shape of the
set. Writing them is the obvious next addition.

## Conventions

One directory per skill under `skills/`, each with a `SKILL.md` carrying `name`, `description`
and a `metadata.version`. Supporting material goes in that skill's `references/`.

A skill's `description` is what decides whether it triggers, so it should name the phrases a
person would actually type — not summarise the contents.
