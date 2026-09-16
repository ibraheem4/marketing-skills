# Website Style Audit Schema

Use this schema for implementation-ready and comparison audits.

## Contents

1. Evidence record
2. Coverage inventory
3. Foundations
4. Layout and responsive behavior
5. Components and states
6. Imagery and motion
7. Content design and accessibility
8. Page blueprints
9. Implementation mapping
10. Validation rules

## 1. Evidence record

Record important findings with these fields:

| Field | Meaning |
|---|---|
| Page | Direct inspected URL |
| Viewport | Width × height and device class |
| Region | Header, hero, section, card, footer, overlay, and so on |
| Element | Human label plus stable selector when available |
| State | Default, hover, focus, active, open, disabled, scrolled, and so on |
| Property | The design property being measured |
| Value | Rendered or computed value |
| Evidence type | Observed, inferred, or recommended |
| Confidence | High, medium, or low |
| Evidence | Screenshot or concise inspection note |

Use **observed** for rendered or computed values, **inferred** for rules derived from repeated evidence, and **recommended** for implementation choices not established by the site.

## 2. Coverage inventory

Capture:

- inspected routes and page archetypes;
- authentication or access limitations;
- viewport dimensions and zoom level;
- light, dark, or alternate themes;
- header before and after scroll;
- navigation open/closed states;
- representative content density extremes;
- at least one repeated component in multiple contexts;
- at least one form or interactive control when present;
- overlays, drawers, tooltips, or dialogs when safely reachable;
- loading, empty, error, and disabled states when visible without consequential actions.

## 3. Foundations

### Color

Extract semantic roles, not merely a color list:

- canvas, surface, elevated surface, and inverse surface;
- primary, secondary, muted, and inverse text;
- brand/accent and on-accent colors;
- border, divider, focus, and selection colors;
- success, warning, danger, and informational states;
- link default, hover, visited, and focus states;
- gradients, overlays, transparency, and blend behavior.

Record HEX or color-function values, opacity, context, contrast concerns, frequency, and confidence. Consolidate near-duplicates only when the rendered role supports it.

### Typography

For each role, record:

- font family and fallback stack;
- source or delivery method when visible;
- size, weight, line height, and letter spacing;
- casing, decoration, and optical treatment;
- maximum text width and wrapping behavior;
- responsive changes.

Cover display, H1–H6 as used, body large/default/small, label, button, navigation, caption, metadata, quote, and code/mono roles.

Do not redistribute font files. If licensing is unknown, name the observed font and recommend a metrically or stylistically similar licensed substitute.

### Spacing and density

Measure repeated:

- inline and stack gaps;
- component padding;
- section padding;
- grid gutters;
- control heights;
- icon-to-label gaps;
- paragraph and heading margins.

Infer a base scale only after sampling. Record outliers that carry visual significance.

### Shape and depth

Record:

- border radius scale by component role;
- border widths, styles, and opacity;
- shadow layers, blur, spread, and color;
- focus rings and outlines;
- clipping, masks, and overflow behavior;
- backdrop blur, glass, texture, noise, or grain.

## 4. Layout and responsive behavior

### Global layout

Determine:

- maximum content width and fluid behavior;
- outer page margins by viewport;
- column count, widths, and gutters;
- full-bleed versus contained sections;
- alignment anchors shared across sections;
- vertical section cadence;
- z-index and layering patterns;
- sticky or fixed regions;
- reading-width constraints.

### Breakpoint behavior

Prefer behavioral ranges over guessed framework defaults. Record where:

- navigation collapses;
- columns stack or reorder;
- type or spacing steps change;
- elements hide, appear, or become horizontally scrollable;
- controls become full width or touch-sized;
- artwork crops, repositions, or disappears;
- sticky regions change behavior.

Use exact breakpoint values only when observed in styles or measured through controlled viewport changes.

## 5. Components and states

Audit components that materially shape the site:

- site header and navigation;
- announcement bar;
- hero and section header;
- button and link families;
- cards, tiles, and feature rows;
- badges, tags, and pills;
- inputs, selects, checkboxes, radios, and validation;
- tabs, accordions, menus, breadcrumbs, and pagination;
- tables, lists, stats, timelines, and quotes;
- pricing, testimonials, and social proof;
- modal, popover, tooltip, drawer, and toast;
- footer and secondary navigation.

For each component, record:

1. anatomy and DOM-level hierarchy;
2. dimensions and internal spacing;
3. typography and icon rules;
4. variants and content constraints;
5. default, hover, focus-visible, active, disabled, selected, loading, and error states as applicable;
6. responsive transformations;
7. reusable versus page-specific status.

## 6. Imagery and motion

### Imagery and graphic language

Record:

- photo subject, crop, lighting, grading, and aspect ratio;
- illustration geometry, stroke, palette, dimensionality, and composition;
- icon family, size, stroke weight, fill behavior, and optical alignment;
- gradient direction and stops;
- background motifs, diagrams, device frames, texture, and masks;
- logo placement and clear-space behavior without copying the logo asset.

Separate reusable art direction from proprietary assets that require replacement.

### Motion

Record:

- trigger and target;
- property being animated;
- duration, delay, and easing when measurable;
- stagger or sequencing;
- entrance, hover, loading, navigation, and scroll-linked motion;
- whether animation is decorative or communicates state;
- reduced-motion behavior.

Avoid claiming timing precision from a screenshot. Mark visual estimates as inferred.

## 7. Content design and accessibility

### Content design

Describe:

- headline length and line-count patterns;
- sentence density and paragraph width;
- button-label style;
- navigation naming;
- capitalization and punctuation conventions;
- data-to-copy balance;
- use of proof, statistics, testimonials, and calls to action.

Generate original replacement copy. Do not reproduce substantial source prose.

### Accessibility

Check visible or inspectable evidence for:

- color contrast risks;
- visible keyboard focus;
- semantic headings and landmarks;
- control names and states;
- touch target size;
- motion sensitivity;
- zoom and text reflow;
- image alternatives when exposed.

Classify deficits as reference issues to fix, not traits to reproduce.

## 8. Page blueprints

For each archetype, record the ordered regions and their layout purpose. Example:

1. announcement and global navigation;
2. hero with primary action and proof;
3. credibility strip;
4. alternating feature narratives;
5. quantified outcomes;
6. testimonial or case study;
7. closing action;
8. multi-column footer.

Include container type, column behavior, section rhythm, background transition, and mobile ordering for each region.

## 9. Implementation mapping

Translate evidence into:

- semantic color, type, spacing, radius, shadow, and motion tokens;
- primitive components and compositional components;
- page templates and content slots;
- responsive rules and container queries or media queries;
- original asset requirements;
- minimum viable replication priorities;
- later refinement priorities.

When useful, provide a scaffold such as:

```css
:root {
  --color-canvas: /* observed value */;
  --color-surface: /* observed value */;
  --color-text: /* observed value */;
  --color-text-muted: /* observed value */;
  --color-accent: /* observed value */;

  --font-display: /* observed family or licensed substitute */;
  --font-body: /* observed family or licensed substitute */;

  --space-1: /* inferred scale */;
  --radius-control: /* observed value */;
  --shadow-elevated: /* observed value */;
  --motion-fast: /* observed or inferred value */;
}
```

Never invent filled values merely to complete the scaffold.

## 10. Validation rules

- Sample three instances before promoting a value to a shared token when possible.
- Preserve genuine context-specific exceptions.
- Validate hierarchy and geometry before polish.
- Compare mobile and desktop evidence before documenting reflow.
- Report exact values only when measured.
- Flag values affected by browser defaults, zoom, localization, or dynamic content.
- Rank mismatches as structural, systemic, component-level, or decorative.
- Treat structural and systemic mismatches as the first implementation priorities.
