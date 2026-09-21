#!/usr/bin/env node
/**
 * CLI shell over aeo-engine. Prints a report, writes artefacts, exits non-zero
 * on failures so CI can use it unchanged.
 *
 *   ./aeo-scan.mjs example.com
 *   ./aeo-scan.mjs example.com --json --out ./reports --max-pages 40
 *   ./aeo-scan.mjs a.com b.com --compare
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { scanSite } from './aeo-engine.mjs'

const argv = process.argv.slice(2)
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.log(`aeo-scan — the four AI-visibility checks, run against a site

  aeo-scan <domain...> [options]

  --json              print the full report as JSON
  --out <dir>         write <host>-<date>.json and .md
  --max-pages <n>     pages to scan (default 25)
  --allow-local       permit localhost — for scanning a local build only
  --compare           one table across every domain given
  --quiet             findings only, no per-page detail

Exit code is 1 if any check fails, so CI can gate on it.`)
  process.exit(0)
}

const flag = (name, fallback = null) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}
const has = (name) => argv.includes(name)
const domains = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out' && argv[i - 1] !== '--max-pages')

const opts = { maxPages: Number(flag('--max-pages', 25)), allowLocal: has('--allow-local') }
const B = (s) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s)
const RED = (s) => (process.stdout.isTTY ? `\x1b[31m${s}\x1b[0m` : s)
const YEL = (s) => (process.stdout.isTTY ? `\x1b[33m${s}\x1b[0m` : s)
const GRN = (s) => (process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s)
const mark = (l) => (l === 'fail' ? RED('FAIL') : l === 'warn' ? YEL('warn') : GRN('ok'))

function markdown(r) {
  const L = [`# AEO scan — ${r.origin}`, '', `Scanned ${r.startedAt}. ${r.summary.pagesScanned} pages, **${r.summary.fail} failures**, ${r.summary.warn} warnings.`, '']
  L.push('## Site-level', '')
  L.push('| Signal | Result |', '|---|---|')
  L.push(`| robots.txt | ${r.robots.present ? 'present' : 'MISSING'} |`)
  for (const [p, s] of Object.entries(r.discovery)) L.push(`| ${p} | ${s === 200 ? '200' : `**${s}**`} |`)
  for (const sm of r.robots.sitemaps) L.push(`| Sitemap: ${sm.url} | ${sm.status === 200 ? '200' : `**${sm.status}**`} |`)
  const blocked = Object.entries(r.robots.agents).filter(([, v]) => !v.allowed)
  L.push(`| AI crawlers blocked | ${blocked.length ? blocked.map(([a]) => a).join(', ') : 'none'} |`, '')
  if (r.siteFindings.length) {
    L.push('## Site findings', '')
    for (const f of r.siteFindings) L.push(`- **${f.level.toUpperCase()}** \`${f.code}\` — ${f.message}`)
    L.push('')
  }
  L.push('## Pages', '', '| URL | text (no JS) | JSON-LD | OG | canonical | findings |', '|---|---|---|---|---|---|')
  for (const p of r.pages) {
    L.push(`| ${p.url} | ${p.visibleChars ?? '—'} | ${(p.structuredDataTypes || []).join(', ') || '—'} | ${p.ogCount ?? 0} | ${p.head?.canonical ? 'yes' : 'no'} | ${p.findings.length} |`)
  }
  L.push('', '## First paragraphs — for human judgement, not scored', '')
  for (const p of r.pages) {
    if (!p.firstParagraph) continue
    L.push(`### ${p.h1 || p.url}`, '', `> ${p.firstParagraph.slice(0, 400)}`, '')
  }
  return L.join('\n')
}

const reports = []
for (const d of domains) {
  process.stderr.write(`scanning ${d}…\n`)
  const r = await scanSite(d, opts)
  reports.push(r)

  if (has('--json')) { console.log(JSON.stringify(r, null, 2)); continue }

  console.log(`\n${B(r.origin)}`)
  if (r.error) { console.log(`  ${RED('FAIL')}  ${r.error}`); continue }
  console.log(`  ${r.summary.pagesScanned} pages · ${r.summary.fail} failures · ${r.summary.warn} warnings`)
  console.log(`\n  ${B('Site')}`)
  for (const [p, s] of Object.entries(r.discovery)) console.log(`    ${s === 200 ? GRN('ok  ') : RED('FAIL')}  ${p} → ${s}`)
  for (const f of r.siteFindings) console.log(`    ${mark(f.level)}  ${f.code} — ${f.message}`)
  if (!has('--quiet')) {
    console.log(`\n  ${B('Pages')}`)
    for (const p of r.pages) {
      const types = (p.structuredDataTypes || []).filter(Boolean).join(',') || 'none'
      console.log(`    ${p.findings.some((f) => f.level === 'fail') ? RED('FAIL') : GRN('ok  ')}  ${p.url}`)
      console.log(`          text=${p.visibleChars} ld+json=${types} og=${p.ogCount} canonical=${p.head?.canonical ? 'yes' : 'no'}`)
      for (const f of p.findings) console.log(`          ${mark(f.level)} ${f.code} — ${f.message}`)
    }
  }

  const out = flag('--out')
  if (out) {
    mkdirSync(out, { recursive: true })
    const host = new URL(r.origin).host
    const stamp = r.startedAt.slice(0, 10)
    writeFileSync(join(out, `aeo-scan-${host}-${stamp}.json`), JSON.stringify(r, null, 2))
    writeFileSync(join(out, `aeo-scan-${host}-${stamp}.md`), markdown(r))
    console.log(`\n  wrote aeo-scan-${host}-${stamp}.{json,md} to ${out}`)
  }
}

if (has('--compare') && reports.length > 1) {
  console.log(`\n${B('Comparison')}\n`)
  const row = (c) => c.map((s, i) => String(s).padEnd(i === 0 ? 26 : 13)).join('')
  console.log(B(row(['', 'sitemap', 'llms.txt', 'ld+json', 'og', 'canonical', 'fails'])))
  for (const r of reports) {
    const home = r.pages?.[0]
    console.log(row([
      new URL(r.origin).host,
      r.discovery?.['/sitemap.xml'] ?? '—',
      r.discovery?.['/llms.txt'] ?? '—',
      (home?.structuredDataTypes || []).filter(Boolean).length || 0,
      home?.ogCount ?? 0,
      home?.head?.canonical ? 'yes' : 'no',
      r.summary?.fail ?? '—',
    ]))
  }
}

process.exitCode = reports.some((r) => (r.summary?.fail ?? 1) > 0) ? 1 : 0
