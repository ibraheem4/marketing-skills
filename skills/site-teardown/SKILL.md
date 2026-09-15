---
name: site-teardown
description: Tear down a competitor or reference marketing site so its actual decisions can be copied or rejected on evidence. Use when the user names a site to emulate, asks "what does X do on their homepage," compares themselves to a competitor, or is choosing a visual direction from references. Also use before writing marketing copy or designing a marketing page when references exist. Covers assets, palette, type, motion, page structure, proof density and copy register. Do not use for SEO ranking audits (see seo-audit) or for auditing your own site's structured data (see schema-markup).
metadata:
  version: 1.0.0
---

# Site teardown

Reference sites get described from memory and the description is usually wrong. This skill exists
because grepping a page is not the same as looking at it, and a summary of a page is not the page.

**The rule: you have not reviewed a site until you have rendered it and opened every image it
loads.** Everything else in this document supports that one rule.

## Failure modes this prevents

Each of these has actually happened. They are the reason for the steps below.

| Failure | What it looked like | The fix |
|---|---|---|
| Narrow grep, confident count | Reported "one PNG, zero photographs." The site had six PNGs including two full-bleed customer portraits. | Enumerate assets by extension across every host, then open them. |
| Bot wall analysed as content | A 403 returned a 32KB body. It was a Vercel security checkpoint, not the site. | Check `<title>` and expected content before believing any fetch. |
| Text summary missed the visual | A fetch summary said "illustrated feature icons." The page's whole personality was a hand-drawn mascot. | Render it. Summaries describe copy, not art direction. |
| Asked the wrong question | Concluded "no mascot, none of the references have one" from asset counts. | Layer names and inline data-URIs carry the answer. Search them. |

## Method

### 1. Get the real page

```bash
curl -sL --max-time 25 -A "<a current desktop UA>" "$URL" -o page.html -w "HTTP %{http_code} bytes=%{size_download}\n"
grep -o "<title>[^<]*" page.html
```

A 200 is not proof. A bot wall returns a plausible body. If the title is a checkpoint, challenge,
"Just a moment," or the size is suspiciously round and small, **you have not got the page** — say so
and switch to rendering, which often passes where curl does not.

### 2. Render it and look

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"   # or chromium
"$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --virtual-time-budget=9000 --window-size=1440,5200 \
  --screenshot=shot.png "$URL"
```

Then **read the image**. Tall window sizes capture more of the page; lazy-loaded sections below the
fold may still be missing, so shoot a second time scrolled, or accept and state the limit. Render at
a phone width too when responsive behaviour is part of the question.

If no renderer is available, say the review is source-only and flag every visual claim as inferred.

### 3. Enumerate every asset, then open them

Do not grep one host and one extension. Find the hosts first, then sweep all extensions:

```bash
grep -oE 'https://[A-Za-z0-9.-]+/[A-Za-z0-9._/-]+\.(png|jpe?g|webp|avif|svg|gif|mp4|webm|riv|json)' page.html \
  | sort -u | tee assets.txt | sed 's#.*//##' | cut -d/ -f1 | sort | uniq -c
```

Download them. Open every raster. For SVG, either render it or read the source — `<desc>` often
names the icon library (Streamline, Lucide, Phosphor), which tells you whether the icons were drawn
or licensed. Check dimensions: a 3024×4032 file is a phone photograph, a 372×56 file is a logo, a
256×256 file is an avatar.

**Inline SVG and data URIs are assets too** and they do not appear in the sweep above. The most
distinctive artwork on a page is often a data-URI `<img>` or an inline `<svg>` with hundreds of path
commands. Count them: `grep -c "<svg" page.html`.

### 4. Read the layer names

Page builders leak their design file. This is the highest-signal, least-known step:

- Framer: `data-framer-name="..."` — component and layer names, verbatim from the designer
- Webflow: `data-w-id`, class names carrying section names
- Next.js: route manifests, image loader paths that name the asset's purpose

```bash
grep -oE 'data-framer-name="[^"]{2,40}"' page.html | sort -u
```

A layer called `Turtle` is the answer to "do they have a mascot" and no asset sweep will find it.

### 5. Extract the system

**Palette** — count, do not eyeball. Then map each colour to where it is used, because a hex that
appears four times as a section field matters more than one that appears forty times as a border.

```bash
grep -oE '#[0-9a-fA-F]{6}' page.html | sort | uniq -c | sort -rn | head -20
```

**Type** — the font files on the wire tell you what the site is made of. A page that is mostly
`.woff2` by byte count is typography-led. Pull the families and the scale:

```bash
grep -oE "font-family:[^;\"}]{0,90}" page.html | sort -u
grep -oE "font-size:[0-9]{2,3}px" page.html | sort -u
grep -oE "font-weight:[0-9]{3}" page.html | sort | uniq -c | sort -rn
grep -oE "letter-spacing:-?[0-9.]+em" page.html | sort -u
```

Heavy weights plus tight negative tracking on display, and wide positive tracking on small labels,
is the current default. Note where a site departs from it.

**Motion** — what is loaded decides the strategy:

```bash
grep -oiE "(lottie|rive|gsap|framer-motion|three|spline|webgl|<video|@keyframes|animation:)" page.html | sort | uniq -c | sort -rn
```

No animation library plus a handful of CSS `animation:` rules means motion is deliberate and cheap.
A WebGL library with almost no image assets means the motion is procedural.

**Stack** — `grep -oiE "(framer|webflow|next|astro|wordpress|squarespace|sanity|contentful)"`. If a
reference the user admires is built in Framer, that is worth telling them plainly.

### 6. Count the page

Sections top to bottom, with what each one contains: photograph, illustration, diagram, video, logo
row, metric band, icon, screenshot, or plain text. Estimate word count. Then record **proof
density** — how many client logos, named case studies, metrics and testimonials appear, because that
is usually the real difference between two competitors and the thing a smaller firm cannot copy.

### 7. Quote the copy verbatim

Hero headline, subheadline, every section heading, and both CTAs, exactly as written. Paraphrase
loses the register, and register is most of what the user is asking about.

## What to produce

A teardown record per site, then a comparison. Keep every claim measurable:

```
## <site> — read <date>
Stack:            Framer / Next / Webflow, CMS if visible
Got the page:     yes | no (bot wall, source-only)
Hero:             "<headline verbatim>" / "<subhead verbatim>"
CTA:              "<primary>" / "<secondary>"
Sections:         N, listed in order with the visual content of each
Words:            approximate
Palette:          hex values with their role, not just a list
Type:             families, display size and tracking, weight distribution
Assets:           counts by kind, with what the images actually depict
Icons:            drawn or licensed (name the library)
Motion:           libraries loaded, CSS rules, what actually moves
Proof density:    logos / metrics / case studies / testimonials
Register:         one sentence, with a quote that demonstrates it
```

End with what the user should **take**, what they should **reject**, and what they **cannot copy**
because it rests on assets they do not have. That last column is the useful one: a competitor's
logo wall is not a design decision a two-person firm can adopt.

## Rules

- **Measure, then claim.** Every number in the output came from a command in this document.
- **Separate verified from inferred**, in the output, per claim. "Rendered and counted" and "read off
  the markup" are different from "looks like."
- **Date every reading.** Sites change. A teardown without a date is a liability the week after.
- **Never conclude an absence from one search.** "They have no X" requires having looked in the
  asset sweep, the inline SVG, the layer names and the render.
- **Do not recreate a competitor's distinctive branded UI.** Understand the decision, then design
  an original answer to the same problem. Copying the turtle is not the lesson; commissioning one
  drawing that answers your own headline is.
- **Report the awkward finding.** If the reference the user admires does the opposite of what they
  asked you to build, say so in one sentence with the evidence, then build what they asked for.
