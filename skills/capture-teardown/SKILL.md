---
name: capture-teardown
description: Turn a folder of competitor or product screen captures into a cited source page and a design input, by reading every capture rather than a summary of them. Use when a capture set needs reviewing, a competitor flow needs tearing down, a design cites screenshots nobody has opened, or a spec's claims about another product need checking against the screens. Do not use to design the surface itself.
---

# Capture teardown

A summary of a capture set competes with the set, and the summary wins, because
it sits closer to the work. This skill exists because a first-time-user
experience was designed twice from one-line table rows while the captures those
rows compressed sat unread in the same repository.

Read the captures. Then diff them against whatever claims to summarise them.
Producing the design is a different skill.

## Workflow

1. **Inventory before reading.** List the directory and count. Do not trust a
 prior session's count or its claim about what was reviewed — the handoff that
 preceded this skill said "4 of 49 reviewed" and the 45 unread ones contradicted
 the spec in three places.
2. **Identify every file, including the ones nobody named.** A capture set
 accumulates: competitor flows, marketing pages, our own products, unrelated
 research. Open enough of each unknown to classify it. Group by source and
 flow position, and say plainly which files are out of scope rather than
 leaving them as "unidentified".
3. **Read the primary captures.** All of them, in flow order where there is one.
 A capture set is small; the cost of reading it is far below the cost of
 designing from a paraphrase of it.
4. **Record what each screen actually does**, in its own words — the literal
 headline, the button labels, the escape-hatch wording, what is on screen and
 what is conspicuously absent. Quote rather than characterise.
5. **Diff the screens against every existing claim about them.** Specs, decision
 pages, prior teardowns, canvas annotations. Each disagreement is a finding and
 goes in the output. Expect the claims to be directionally right and specifically
 wrong: a pattern cited to the wrong screen, a screen credited with something it
 does not do, a source attributed to one competitor that both do.
6. **Separate what the screens establish from what we inferred.** A competitor
 gesturing at a capability is not the same as demonstrating it, and overstating
 theirs weakens the case for ours.
7. **Write the source page** under `{{sources_dir}}/YYYY-MM-DD-<subject>.md` following the
 destination's schema. Cite file names inline so the next reader can open the exact
 capture. Copy load-bearing captures into `raw/` only when the page turns on
 them; leave the rest where they were captured.
8. **Fix the summaries that were wrong** — or better, replace the restatement with
 a citation. A spec should point at the source page, not paraphrase it.
9. **Hand off.** Design work uses `interface-design`; this skill stops at
 the finding.

## Rules

- Never design a surface from a table row summarising a screen you have not opened.
- Never mark a capture set reviewed on a partial read. Say how many of how many.
- Ask what an unidentified capture is rather than inferring intent from a filename.
- Quote the screen. "Continue without connecting, promoted to the primary dark
 button" is usable; "has an escape hatch" is not.
- Record what a competitor *cannot* do structurally, separately from what they
 merely have not done. The first is a durable advantage; the second is a race.
- Keep our own product captures out of the competitive findings. Both may be in
 the folder; they are different claims.

## Output

A source page, plus a findings list carrying: captures read of captures present,
what each flow does beat by beat, every disagreement found between the screens
and existing claims, what changes for our design, and what remains unread or
unidentified with the reason.

## Resources

- `references/teardown-checklist.md` — the per-screen questions, and the
 disagreements this method has already caught.
- Related: `site-teardown` reads a live site rather than captures; `analyze-website-style` turns either into a component spec.
 holds the reusable patterns and should be read before, not rederived after.
