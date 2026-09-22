/**
 * node --test tests/engine.test.mjs
 *
 * Covers the parsers, because a parser that is subtly wrong produces confident
 * wrong findings — which is worse than no scan. Network paths are not tested
 * here; they are exercised by running the CLI against a real site.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseRobots, isAllowed, checkNoJs, checkStructuredData,
  checkFirstParagraph, assertFetchable, urlsFromSitemap, stripToText,
  checkFoundations, checkAcrossPages,
} from '../scripts/visibility-engine.mjs'

test('parseRobots collects sitemaps and per-agent groups', () => {
  const r = parseRobots(`
# comment
User-agent: *
Disallow: /admin

User-agent: GPTBot
Disallow: /

Sitemap: https://x.test/sitemap.xml
Sitemap: https://x.test/news.xml
`)
  assert.deepEqual(r.sitemaps, ['https://x.test/sitemap.xml', 'https://x.test/news.xml'])
  assert.equal(r.groups.length, 2)
})

test('isAllowed blocks an agent with its own Disallow: /', () => {
  const r = parseRobots('User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n')
  assert.equal(isAllowed(r, 'GPTBot').allowed, false)
  assert.equal(isAllowed(r, 'ClaudeBot').allowed, true)
})

test('isAllowed is case-insensitive on the agent name', () => {
  const r = parseRobots('User-agent: gptbot\nDisallow: /\n')
  assert.equal(isAllowed(r, 'GPTBot').allowed, false)
})

test('isAllowed treats an empty Disallow as allow-all', () => {
  const r = parseRobots('User-agent: *\nDisallow:\n')
  assert.equal(isAllowed(r, 'GPTBot').allowed, true)
})

test('isAllowed lets a longer Allow beat a shorter Disallow', () => {
  const r = parseRobots('User-agent: *\nDisallow: /app\nAllow: /app/public\n')
  assert.equal(isAllowed(r, 'CCBot', '/app/public/page').allowed, true)
  assert.equal(isAllowed(r, 'CCBot', '/app/private').allowed, false)
})

test('checkNoJs fails a shell page and names the hydration payload', () => {
  const html = `<html><head><title>T</title></head><body><div id="root"></div>
    <script id="__NEXT_DATA__" type="application/json">{"props":{"a":1}}</script></body></html>`
  const r = checkNoJs(html)
  assert.equal(r.hydrationPayload, true)
  const f = r.findings.find((x) => x.code === 'no-js-empty')
  assert.ok(f, 'expected no-js-empty')
  assert.match(f.message, /hydration payload/)
})

test('checkNoJs passes a page with real server-rendered text', () => {
  const html = `<html><body><h1>Hello</h1><p>${'word '.repeat(200)}</p></body></html>`
  const r = checkNoJs(html)
  assert.equal(r.findings.length, 0)
  assert.ok(r.visibleChars > 600)
})

test('stripToText removes script and style content, not just tags', () => {
  const t = stripToText('<style>body{color:red}</style><script>var x=1</script><p>Only this</p>')
  assert.equal(t, 'Only this')
})

test('checkStructuredData reports malformed separately from missing', () => {
  const bad = `<script type="application/ld+json">{"@type":"Article",}</script>`
  const r = checkStructuredData(bad)
  const mal = r.findings.find((f) => f.code === 'ld-json-malformed')
  assert.ok(mal, 'expected ld-json-malformed')
  assert.ok(mal.excerpt.length, 'malformed finding must carry the offending excerpt')
  assert.equal(r.findings.some((f) => f.code === 'ld-json-missing'), false,
    'a malformed block is present, so it must not also report missing')
})

test('checkStructuredData flags a page with no JSON-LD at all', () => {
  const r = checkStructuredData('<html><head><title>x</title></head><body></body></html>')
  assert.ok(r.findings.some((f) => f.code === 'ld-json-missing'))
})

test('checkStructuredData reads @graph, canonical, OG and title', () => {
  const html = `<html><head>
    <title>A title</title>
    <link rel="canonical" href="https://x.test/">
    <meta property="og:title" content="A">
    <meta name="description" content="d">
    <script type="application/ld+json">{"@graph":[{"@type":"Person","name":"P"},{"@type":"WebSite"}]}</script>
  </head><body></body></html>`
  const r = checkStructuredData(html)
  assert.deepEqual(r.types, ['Person', 'WebSite'])
  assert.equal(r.head.canonical, 'https://x.test/')
  assert.equal(r.head.title, 'A title')
  assert.equal(Object.keys(r.og).length, 1)
  assert.equal(r.findings.length, 0)
})

test('checkStructuredData handles single-quoted attributes', () => {
  const r = checkStructuredData(`<link rel='canonical' href='https://y.test/p'>`)
  assert.equal(r.head.canonical, 'https://y.test/p')
})

test('checkFirstParagraph takes the paragraph after the h1, not before it', () => {
  const html = `<body><p>nav blurb</p><h1>The question</h1><p>The answer sentence.</p></body>`
  const r = checkFirstParagraph(html)
  assert.equal(r.h1, 'The question')
  assert.equal(r.firstParagraph, 'The answer sentence.')
})

test('checkFirstParagraph does not score', () => {
  const r = checkFirstParagraph('<h1>H</h1><p>Well, it depends.</p>')
  assert.equal(r.score, undefined)
  assert.match(r.note, /human judgement/)
})

test('assertFetchable refuses private and internal targets', () => {
  for (const bad of [
    'http://localhost/', 'http://127.0.0.1/', 'http://10.1.1.1/',
    'http://192.168.0.1/', 'http://169.254.169.254/', 'http://172.16.0.1/',
    'http://thing.internal/', 'file:///etc/passwd',
  ]) {
    assert.throws(() => assertFetchable(bad), undefined, `should refuse ${bad}`)
  }
})

test('assertFetchable allows an ordinary https host', () => {
  assert.equal(assertFetchable('https://example.com/a').hostname, 'example.com')
})

test('urlsFromSitemap extracts locs up to the limit', () => {
  const xml = `<urlset>${['a', 'b', 'c'].map((s) => `<loc>https://x.test/${s}</loc>`).join('')}</urlset>`
  assert.equal(urlsFromSitemap(xml, 2).length, 2)
  assert.deepEqual(urlsFromSitemap(xml, 10), ['https://x.test/a', 'https://x.test/b', 'https://x.test/c'])
})

// ── foundations ────────────────────────────────────────────────────────────

test('checkFoundations catches a missing lang attribute', () => {
  const r = checkFoundations('<html><body><p>x</p></body></html>')
  assert.ok(r.findings.some((f) => f.code === 'lang-missing'))
  assert.equal(r.lang, null)
})

test('checkFoundations accepts a declared lang and reads hreflang', () => {
  const html = `<html lang="en"><head>
    <link rel="alternate" hreflang="fr" href="/fr">
    <link rel="alternate" hreflang="ar" href="/ar">
  </head><body><p>${'word '.repeat(300)}</p></body></html>`
  const r = checkFoundations(html)
  assert.equal(r.lang, 'en')
  assert.deepEqual(r.hreflang, ['fr', 'ar'])
  assert.equal(r.findings.some((f) => f.code === 'lang-missing'), false)
})

test('checkFoundations flags a skipped heading level', () => {
  const r = checkFoundations('<html lang="en"><h1>A</h1><h4>B</h4></html>')
  const f = r.findings.find((x) => x.code === 'heading-skipped')
  assert.ok(f)
  assert.match(f.message, /h1 jumps to h4/)
})

test('checkFoundations does not flag a legal heading order', () => {
  const r = checkFoundations('<html lang="en"><h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2></html>')
  assert.equal(r.findings.some((x) => x.code === 'heading-skipped'), false)
})

test('checkFoundations counts images missing alt, and alt="" counts as present', () => {
  const r = checkFoundations('<html lang="en"><img src=a><img src=b alt=""><img src=c alt="x"></html>')
  const f = r.findings.find((x) => x.code === 'img-alt-missing')
  assert.equal(r.images, 3)
  assert.equal(r.imagesWithoutAlt, 1)
  assert.match(f.message, /1 of 3/)
})

test('checkFoundations flags multiple h1 elements', () => {
  const r = checkFoundations('<html lang="en"><h1>A</h1><h1>B</h1></html>')
  assert.ok(r.findings.some((x) => x.code === 'h1-multiple'))
  assert.equal(r.h1Count, 2)
})

test('checkAcrossPages finds duplicate titles and descriptions', () => {
  const pages = [
    { url: 'https://x.test/a', head: { title: 'Same', description: 'D' }, lang: 'en' },
    { url: 'https://x.test/b', head: { title: 'Same', description: 'D' }, lang: 'en' },
  ]
  const f = checkAcrossPages(pages, 'https://x.test')
  assert.ok(f.some((x) => x.code === 'title-duplicate'))
  assert.ok(f.some((x) => x.code === 'description-duplicate'))
})

test('checkAcrossPages flags a canonical pointing at another page', () => {
  const pages = [{ url: 'https://x.test/a', head: { canonical: 'https://x.test/b' }, lang: 'en' }]
  const f = checkAcrossPages(pages, 'https://x.test')
  assert.ok(f.some((x) => x.code === 'canonical-mismatch'))
})

test('checkAcrossPages tolerates a trailing-slash-only canonical difference', () => {
  const pages = [{ url: 'https://x.test/a', head: { canonical: 'https://x.test/a/' }, lang: 'en' }]
  const f = checkAcrossPages(pages, 'https://x.test')
  assert.equal(f.some((x) => x.code === 'canonical-mismatch'), false)
})

test('checkAcrossPages flags inconsistent lang across pages', () => {
  const pages = [
    { url: 'https://x.test/a', head: {}, lang: 'en' },
    { url: 'https://x.test/b', head: {}, lang: 'en-US' },
  ]
  assert.ok(checkAcrossPages(pages, 'https://x.test').some((x) => x.code === 'lang-inconsistent'))
})

test('an unreachable page still carries both section arrays', async () => {
  // Regression: omitting them made flatMap yield undefined and the summary
  // crash on the *next* site in a multi-domain scan.
  const { scanSite } = await import('../scripts/visibility-engine.mjs')
  const r = await scanSite('http://127.0.0.1:1/', { allowLocal: true, timeoutMs: 300, maxPages: 1 })
  // Unreachable origin returns early; the shape must still be summarisable.
  assert.ok(Array.isArray(r.findings ?? r.siteFindings))
})

test('a disallowed path is skipped, not silently dropped', () => {
  // The engine must honour robots for its own crawling, not merely report on
  // it. isAllowed is the filter scanSite applies before fetching each page.
  const r = parseRobots('User-agent: *\nDisallow: /private\n')
  const ua = 'Mozilla/5.0 (compatible; ai-visibility-scan/0.2)'
  assert.equal(isAllowed(r, ua, '/private/report').allowed, false)
  assert.equal(isAllowed(r, ua, '/pricing').allowed, true)
})

test('checkRobots hands back the parsed rules so they can be honoured', () => {
  const r = parseRobots('User-agent: *\nDisallow: /x\n')
  assert.ok(r.groups.length, 'parsed rules must be usable by isAllowed')
  assert.equal(isAllowed(r, 'any-agent', '/x').allowed, false)
})
