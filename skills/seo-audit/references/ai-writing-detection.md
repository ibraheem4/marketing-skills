# AI writing detection

Why certain words and punctuation read as machine-written, and how to check a page for it.

🔴 **The lists themselves live in one place:**
[`../../copy-editing/references/banned-phrases.md`](../../copy-editing/references/banned-phrases.md).
Banned openers, transitions, closers, verbs, adjectives and filler words are all there.
This file is the reasoning, not the inventory. Do not re-list them here, or the two drift.

## Why em dashes are the strongest tell

- Models trained on edited books, papers and style guides, where em dashes are common.
- They use one as a shortcut for sentence variety instead of a comma, colon or parenthesis.
- Most people writing at a keyboard rarely reach for one, because it is not a key.

The overuse is consistent enough to work as a single-signal detector. One em dash on a page
is worth a second look; several is near-conclusive.

## Why the word lists work

The banned verbs and adjectives (delve, leverage, robust, comprehensive, seamless) are not
bad words. They are *evenly distributed* words: a model reaches for them at roughly the same
rate everywhere, where a person's vocabulary clusters around what they actually do. A page
that uses six of them in four paragraphs is the tell, not any single one.

That is why clusters matter more than hits. Rewrite the paragraph, not the word.

## Auditing a page

1. Search for `—`. Expect zero.
2. Search the banned openers against the first sentence of every section.
3. Count banned verbs and adjectives per 500 words. More than three or four clusters.
4. Read the first and last paragraph aloud. Those are where the formulas concentrate.
5. Check sentence-length variance. Uniform length is its own signal.

For sentence shape, rhythm and rhetorical structure rather than vocabulary, use the
`stop-slop` skill.
