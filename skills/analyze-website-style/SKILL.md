---
name: analyze-website-style
description: Analyze public or user-authorized websites from a UI and design-system perspective and produce implementation-ready style briefs. Use when the user asks to review, reverse-engineer, reproduce, emulate, or adapt a website's visual language; extract design tokens, typography, spacing, layout, components, imagery, motion, interaction states, and responsive behavior; compare an implementation with a reference site; or turn a URL into a reusable UI specification. The output is a design-token and component spec you can build from. For the marketing read of the same page — copy register, proof density, page structure, what to copy or reject — see site-teardown.
---

# Analyze Website Style

## Goal

Turn rendered website evidence into a reusable design specification. Capture the visual language, layout logic, component grammar, and responsive behavior needed to recreate the experience without treating screenshots as the specification.

Reproduce design principles and patterns. Do not copy protected copy, logos, trademarks, proprietary illustrations, photography, or licensed assets unless the user owns them or has explicitly supplied authorization.

## Select the audit depth

- Use **survey** for a quick style summary: one representative page and desktop/mobile evidence.
- Use **implementation-ready** by default when the user wants to recreate or build from the reference: inspect representative page types, desktop/tablet/mobile states, and key interactions.
- Use **comparison** when a target implementation exists: audit the reference, measure the target, and report mismatches by impact.

Make a reasonable scope choice from the request. Ask only when access, target pages, or intended deliverable would materially change the result.

## Workflow

### 1. Establish scope and access

1. Confirm the site is public or user-authorized.
2. Select three to five representative routes for an implementation-ready audit, such as home, product/detail, pricing, editorial/docs, and a form-heavy page.
3. Record the inspected URLs, date, viewport sizes, and any unavailable states.
4. Use the browser named by the user. If browser-control instructions are available, load and follow them before browser actions.
5. Do not bypass authentication, paywalls, bot controls, or access restrictions. Do not inspect cookies, passwords, local storage, profiles, or session stores.

### 2. Capture rendered evidence

1. Inspect desktop at approximately 1440×900 and mobile at approximately 390×844. Add a tablet viewport around 768×1024 when responsive structure matters. Record actual viewport dimensions.
2. Capture full-page context plus focused evidence for navigation, hero, content sections, repeated components, forms, overlays, and footer.
3. Inspect safe interaction states: default, hover, focus, active, disabled, expanded, selected, sticky, and scrolled where present.
4. Use supported DOM and computed-style inspection to measure rendered values. Prefer computed evidence over assumptions from class names or screenshots.
5. Never trigger purchases, submissions, account changes, or other consequential actions merely to expose a state.

### 3. Extract the system

For implementation-ready and comparison audits, read [references/audit-schema.md](references/audit-schema.md) before collecting details.

- Sample repeated elements before declaring a token or rule.
- Attach each important observation to a page, viewport, element or selector, state, and screenshot when available.
- Separate **observed**, **inferred**, and **recommended** values.
- Assign confidence as high, medium, or low. Never present an estimate as an exact source value.
- Identify meaningful exceptions instead of forcing every element into one system.

Extract:

- color roles and states;
- typefaces, type scale, weights, line heights, and text widths;
- spacing rhythm, density, containers, grids, and alignment;
- radii, borders, shadows, strokes, and icon treatment;
- component anatomy, variants, and interaction states;
- imagery, illustration, gradients, texture, and decorative motifs;
- breakpoints, reflow rules, visibility changes, and touch adaptations;
- motion durations, easing, sequencing, scroll behavior, and reduced-motion handling;
- content hierarchy, information density, and microcopy patterns.

### 4. Model the visual language

1. Summarize the style fingerprint in five to eight evidence-backed traits.
2. Convert repeated values into semantic tokens rather than page-specific names.
3. Describe layout as rules: container behavior, grid, vertical rhythm, overlap, layering, and section cadence.
4. Describe components by anatomy, variants, states, responsive changes, and content constraints.
5. Separate signature patterns that create the site's identity from generic patterns that can be implemented conventionally.
6. Call out accessibility or usability problems that should not be copied.

### 5. Validate

1. Recheck claimed tokens against at least three representative instances where possible.
2. Compare desktop and mobile before asserting responsive rules.
3. Confirm that proposed semantic tokens cover the audited components without excessive one-off values.
4. Rank unresolved gaps by their likely visual impact.
5. For comparison audits, validate the highest-impact differences visually after changes.

### 6. Deliver

Use [assets/style-report-template.md](assets/style-report-template.md) for a durable report. Preserve its section order when answering inline.

Include:

- an executive style fingerprint;
- coverage and evidence notes;
- token tables with observed values and confidence;
- layout and page blueprints;
- component, responsive, interaction, and motion specifications;
- an asset replacement plan;
- a minimum viable replication set, followed by refinement priorities;
- implementation mapping, including semantic CSS variables or design tokens when requested;
- uncertainties and follow-up evidence needed.

If the user asks to implement the result, complete the audit first. Then load the available frontend-design guidance before editing the target UI.

## Quality bar

- Produce a design system, not a screenshot description.
- Preserve proportions, hierarchy, rhythm, density, and responsive logic before decorative details.
- Link observations to direct page evidence.
- Use original copy and replace distinctive brand assets by default.
- Do not download or redistribute fonts or media without a compatible license.
- Refuse work intended to impersonate a real service, mislead users, or facilitate phishing; offer a clearly differentiated design instead.
