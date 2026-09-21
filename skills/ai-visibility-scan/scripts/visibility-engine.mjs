/**
 * AEO/SEO checks. Pure functions over fetched bytes — no CLI, no process exit,
 * no assumptions about where it runs. The CLI, a CI step and an HTTP endpoint
 * all wrap this same module.
 *
 * Node 20+ for global fetch. No dependencies, deliberately: this file gets
 * vendored into a service, and a vendored copy with a dependency tree is a
 * liability.
 */

const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
  'CCBot', 'Bytespider', 'meta-externalagent',
]

/** Hosts a scan must never fetch. A WAF cannot make this call — it cannot tell
 *  a metadata endpoint from a customer's domain. So it lives here. */
const BLOCKED_HOST = /^(localhost$|.*\.local$|.*\.internal$)/i
const BLOCKED_IP = [
  /^127\./, /^10\./, /^192\.168\./, /^169\.254\./, /^0\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^::1$/, /^f[cd][0-9a-f]{2}:/i,
]

/**
 * `allowLocal` exists so the CLI and CI shells can scan a build served on
 * localhost — scanning what is actually served beats scanning source. It
 * defaults to false and the HTTP shell must never set it: there, the host
 * comes from a stranger and this is the only thing standing between the
 * service and being used as a proxy into a private network.
 */
export function assertFetchable(rawUrl, { allowLocal = false } = {}) {
  let u
  try { u = new URL(rawUrl) } catch { throw new Error(`not a URL: ${rawUrl}`) }
  if (!/^https?:$/.test(u.protocol)) throw new Error(`refusing protocol ${u.protocol}`)
  if (allowLocal) return u
  const host = u.hostname
  if (BLOCKED_HOST.test(host)) throw new Error(`refusing internal host ${host}`)
  if (BLOCKED_IP.some((re) => re.test(host))) throw new Error(`refusing private address ${host}`)
  return u
}

const DEFAULTS = {
  timeoutMs: 10_000,
  maxBytes: 3_000_000,
  maxRedirects: 5,
  maxPages: 25,
  allowLocal: false,
  userAgent: 'Mozilla/5.0 (compatible; ai-visibility-scan/0.2; +https://github.com/ibraheem4/marketing-skills)',
}

export async function get(url, opts = {}) {
  const o = { ...DEFAULTS, ...opts }
  assertFetchable(url, { allowLocal: o.allowLocal })
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), o.timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'user-agent': o.userAgent, accept: '*/*' },
    })
    const buf = await res.arrayBuffer()
    const truncated = buf.byteLength > o.maxBytes
    const body = new TextDecoder('utf-8', { fatal: false })
      .decode(truncated ? buf.slice(0, o.maxBytes) : buf)
    return {
      ok: res.ok, status: res.status, url: res.url, body, truncated,
      bytes: buf.byteLength, headers: Object.fromEntries(res.headers),
      redirected: res.redirected,
    }
  } catch (err) {
    return { ok: false, status: 0, url, body: '', error: String(err.message || err), bytes: 0 }
  } finally {
    clearTimeout(timer)
  }
}

// ── check 1 — bot access, and whether robots tells the truth ────────────────

export function parseRobots(text) {
  const groups = []
  let current = null
  const sitemaps = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    if (field === 'sitemap') { sitemaps.push(value); continue }
    if (field === 'user-agent') {
      if (!current || current.rules.length) { current = { agents: [], rules: [] }; groups.push(current) }
      current.agents.push(value.toLowerCase())
      continue
    }
    if (!current) continue
    if (field === 'allow' || field === 'disallow') current.rules.push({ type: field, path: value })
  }
  return { groups, sitemaps }
}

/** Longest-match wins, Allow beats Disallow at equal length — the documented
 *  Google precedence. An empty Disallow means "allow everything". */
export function isAllowed(robots, agent, path = '/') {
  const a = agent.toLowerCase()
  const specific = robots.groups.filter((g) => g.agents.includes(a))
  const group = specific.length ? specific : robots.groups.filter((g) => g.agents.includes('*'))
  if (!group.length) return { allowed: true, reason: 'no matching group' }
  const rules = group.flatMap((g) => g.rules)
  let best = null
  for (const r of rules) {
    if (r.type === 'disallow' && r.path === '') continue
    if (!r.path || !path.startsWith(r.path.replace(/\*$/, ''))) continue
    if (!best || r.path.length > best.path.length ||
        (r.path.length === best.path.length && r.type === 'allow')) best = r
  }
  if (!best) return { allowed: true, reason: 'no rule matches' }
  return { allowed: best.type === 'allow', reason: `${best.type}: ${best.path}` }
}

export async function checkRobots(origin, opts) {
  const res = await get(new URL('/robots.txt', origin).href, opts)
  const findings = []
  if (!res.ok) {
    findings.push({ level: 'warn', code: 'robots-missing', message: `/robots.txt returned ${res.status || res.error}` })
    return { findings, sitemaps: [], agents: {}, present: false }
  }
  const robots = parseRobots(res.body)
  const agents = {}
  for (const a of AI_AGENTS) {
    const v = isAllowed(robots, a)
    agents[a] = v
    if (!v.allowed) findings.push({ level: 'fail', code: 'bot-blocked', message: `${a} is blocked — ${v.reason}` })
  }
  // A Sitemap: line that 404s is worse than no line: it is a claim that is false.
  const sitemaps = []
  for (const sm of robots.sitemaps) {
    const head = await get(sm, opts)
    sitemaps.push({ url: sm, status: head.status })
    if (!head.ok) {
      findings.push({
        level: 'fail', code: 'sitemap-broken',
        message: `robots.txt advertises ${sm} — it returns ${head.status || head.error}`,
      })
    }
  }
  if (!robots.sitemaps.length) {
    findings.push({ level: 'warn', code: 'sitemap-undeclared', message: 'robots.txt declares no Sitemap:' })
  }
  return { findings, sitemaps, agents, present: true }
}

// ── check 2 — does the page exist without JavaScript ───────────────────────

export function stripToText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkNoJs(html) {
  const findings = []
  const text = stripToText(html)
  // Content that lives only in a hydration payload is invisible to anything
  // that does not execute JS — which is most of what matters here.
  const payload = /__NEXT_DATA__|self\.__next_f|__remixContext|__NUXT__|window\.__APOLLO/.test(html)
  if (text.length < 200) {
    findings.push({
      level: 'fail', code: 'no-js-empty',
      message: `only ${text.length} characters of text without JavaScript` +
        (payload ? ' — content appears to live in a hydration payload' : ''),
    })
  } else if (text.length < 600) {
    findings.push({ level: 'warn', code: 'no-js-thin', message: `${text.length} characters of text without JavaScript` })
  }
  return { findings, visibleChars: text.length, hydrationPayload: payload, text }
}

// ── check 3 — structured data, and where it is malformed ───────────────────

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? (m[2] ?? m[3] ?? '') : null
}

export function checkStructuredData(html) {
  const findings = []
  const blocks = []
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html))) {
    if (!/application\/ld\+json/i.test(m[1])) continue
    const raw = m[2].trim()
    try {
      const parsed = JSON.parse(raw)
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ?? [parsed])
      for (const it of items) blocks.push({ valid: true, type: it?.['@type'] ?? null, name: it?.name ?? it?.headline ?? null })
    } catch (err) {
      blocks.push({ valid: false, error: String(err.message || err), excerpt: raw.slice(0, 120) })
      // "and where it is malformed" is the promise — so name it, do not just count it.
      findings.push({ level: 'fail', code: 'ld-json-malformed', message: `ld+json does not parse: ${err.message}`, excerpt: raw.slice(0, 120) })
    }
  }
  if (!blocks.length) findings.push({ level: 'fail', code: 'ld-json-missing', message: 'no JSON-LD structured data' })

  const head = {}
  const linkRe = /<link\b[^>]*>/gi
  let l
  while ((l = linkRe.exec(html))) {
    const tag = l[0]
    if ((attr(tag, 'rel') || '').toLowerCase() === 'canonical') head.canonical = attr(tag, 'href')
    if (/alternate/i.test(attr(tag, 'rel') || '') && /rss|atom/i.test(attr(tag, 'type') || '')) head.feed = attr(tag, 'href')
  }
  const og = {}, tw = {}
  const metaRe = /<meta\b[^>]*>/gi
  let mt
  while ((mt = metaRe.exec(html))) {
    const tag = mt[0]
    const prop = (attr(tag, 'property') || '').toLowerCase()
    const name = (attr(tag, 'name') || '').toLowerCase()
    const content = attr(tag, 'content')
    if (prop.startsWith('og:')) og[prop] = content
    if (name.startsWith('twitter:')) tw[name] = content
    if (name === 'description') head.description = content
  }
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  head.title = titleM ? titleM[1].trim() : null

  if (!head.canonical) findings.push({ level: 'fail', code: 'canonical-missing', message: 'no rel=canonical' })
  if (!Object.keys(og).length) findings.push({ level: 'fail', code: 'og-missing', message: 'no Open Graph tags — shared links get no preview card' })
  if (!head.title) findings.push({ level: 'fail', code: 'title-missing', message: 'no <title>' })
  else if (head.title.length > 65) findings.push({ level: 'warn', code: 'title-long', message: `<title> is ${head.title.length} chars` })
  if (!head.description) findings.push({ level: 'warn', code: 'description-missing', message: 'no meta description' })

  return { findings, blocks, types: blocks.filter((b) => b.valid).map((b) => b.type), head, og, twitter: tw }
}

// ── foundations — the SEO layer answer-engine work sits on top of ──────────
//
// These are cheap: the bytes are already fetched. They exist because a scan
// that reports "0 failures" on a page whose <html> has no lang attribute is
// not measuring the site, it is measuring its own blind spot. That happened.

export function checkFoundations(html) {
  const findings = []

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? ''
  const lang = attr(htmlTag, 'lang')
  if (!lang) findings.push({ level: 'fail', code: 'lang-missing', message: '<html> has no lang attribute' })

  const hreflang = [...html.matchAll(/<link\b[^>]*hreflang\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((m) => m[1])

  // Heading order. A skipped level is a structural claim that is false, and
  // extractors lean on the hierarchy to decide what a passage is about.
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ level: Number(m[1]), text: stripToText(m[2]) }))
  const h1s = headings.filter((h) => h.level === 1)
  if (h1s.length > 1) findings.push({ level: 'warn', code: 'h1-multiple', message: `${h1s.length} <h1> elements` })
  let prev = 0
  for (const h of headings) {
    if (prev && h.level > prev + 1) {
      findings.push({ level: 'warn', code: 'heading-skipped', message: `h${prev} jumps to h${h.level} at "${h.text.slice(0, 40)}"` })
      break
    }
    prev = h.level
  }

  // Images without alt. Counted rather than listed — a gallery would flood it.
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0])
  const noAlt = imgs.filter((t) => attr(t, 'alt') === null)
  if (noAlt.length) findings.push({ level: 'warn', code: 'img-alt-missing', message: `${noAlt.length} of ${imgs.length} <img> without alt` })

  const words = stripToText(html).split(/\s+/).filter(Boolean).length
  if (words < 250) findings.push({ level: 'warn', code: 'thin-content', message: `${words} words` })

  return { findings, lang, hreflang, headings: headings.length, h1Count: h1s.length, images: imgs.length, imagesWithoutAlt: noAlt.length, words }
}

/** Site-wide foundations: things only visible across pages, not within one. */
export function checkAcrossPages(pages, origin) {
  const findings = []
  const seen = (key) => {
    const map = new Map()
    for (const p of pages) {
      const v = p.head?.[key]
      if (!v) continue
      map.set(v, [...(map.get(v) ?? []), p.url])
    }
    return [...map.entries()].filter(([, urls]) => urls.length > 1)
  }
  for (const [value, urls] of seen('title')) {
    findings.push({ level: 'warn', code: 'title-duplicate', message: `${urls.length} pages share the title "${value.slice(0, 50)}"` })
  }
  for (const [, urls] of seen('description')) {
    findings.push({ level: 'warn', code: 'description-duplicate', message: `${urls.length} pages share one meta description` })
  }
  // A canonical that points somewhere other than the page it is on is either a
  // deliberate consolidation or a bug, and it is usually a bug.
  for (const p of pages) {
    const c = p.head?.canonical
    if (!c) continue
    try {
      const want = new URL(p.url), got = new URL(c, origin)
      const norm = (u) => (u.pathname.replace(/\/$/, '') || '/')
      if (norm(want) !== norm(got)) {
        findings.push({ level: 'warn', code: 'canonical-mismatch', message: `${p.url} canonicalises to ${c}` })
      }
    } catch { /* unparseable canonical is already reported per page */ }
  }
  // One consistent term for the category, or the entity signal splits. This is
  // the advice the scan gives; not checking it here would be incoherent.
  const langs = new Set(pages.map((p) => p.lang).filter(Boolean))
  if (langs.size > 1) findings.push({ level: 'warn', code: 'lang-inconsistent', message: `pages declare different langs: ${[...langs].join(', ')}` })
  return findings
}

// ── check 4 — does the first paragraph answer? (reports, does not score) ───

export function checkFirstParagraph(html) {
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  const h1m = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
  const h1 = h1m ? stripToText(h1m[1]) : null
  let firstPara = null
  const after = h1m ? body.slice(h1m.index + h1m[0].length) : body
  const pm = after.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)
  if (pm) firstPara = stripToText(pm[1])
  const findings = []
  if (!h1) findings.push({ level: 'warn', code: 'h1-missing', message: 'no <h1>' })
  if (!firstPara) findings.push({ level: 'warn', code: 'first-para-missing', message: 'no paragraph after the <h1>' })
  // Deliberately no scoring. A heuristic that grades prose emits confident
  // wrong findings; a person reads the extracted paragraph and decides.
  return { findings, h1, firstParagraph: firstPara, note: 'reported for human judgement — not scored' }
}

// ── machine-readable files ─────────────────────────────────────────────────

export async function checkDiscoveryFiles(origin, opts) {
  const findings = []
  const files = {}
  for (const [path, code, level] of [
    ['/llms.txt', 'llms-txt-missing', 'warn'],
    ['/sitemap.xml', 'sitemap-missing', 'fail'],
  ]) {
    const res = await get(new URL(path, origin).href, opts)
    files[path] = res.status
    if (!res.ok) findings.push({ level, code, message: `${path} returned ${res.status || res.error}` })
  }
  return { findings, files }
}

// ── orchestration ──────────────────────────────────────────────────────────

export function urlsFromSitemap(xml, limit) {
  const out = []
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi
  let m
  while ((m = re.exec(xml)) && out.length < limit) out.push(m[1])
  return out
}

export async function scanSite(input, opts = {}) {
  const o = { ...DEFAULTS, ...opts }
  const origin = new URL(/^https?:\/\//.test(input) ? input : `https://${input}`).origin
  const startedAt = new Date().toISOString()

  const home = await get(origin + '/', o)
  if (!home.ok) {
    return { origin, startedAt, error: `homepage returned ${home.status || home.error}`, findings: [
      { level: 'fail', code: 'unreachable', message: `${origin} returned ${home.status || home.error}` },
    ], pages: [] }
  }

  const robots = await checkRobots(origin, o)
  const discovery = await checkDiscoveryFiles(origin, o)

  // Prefer the sitemap; fall back to same-origin links from the homepage.
  let urls = []
  const smUrl = robots.sitemaps.find((s) => s.status === 200)?.url || new URL('/sitemap.xml', origin).href
  const sm = await get(smUrl, o)
  if (sm.ok && /<loc>/i.test(sm.body)) urls = urlsFromSitemap(sm.body, o.maxPages)
  // A sitemap names the canonical origin, which is not where a local or staging
  // build is being served. Following those URLs silently scans production and
  // reports the result as if it were the build — so rebase them onto the origin
  // actually under test.
  urls = urls.map((u) => {
    try {
      const parsed = new URL(u)
      return parsed.origin === origin ? u : origin + parsed.pathname
    } catch { return u }
  })
  if (!urls.length) {
    const seen = new Set([origin + '/'])
    const re = /<a\b[^>]*href\s*=\s*"([^"]+)"/gi
    let m
    while ((m = re.exec(home.body)) && seen.size < o.maxPages) {
      try {
        const u = new URL(m[1], origin)
        if (u.origin === origin && !/\.(png|jpe?g|svg|css|js|ico|pdf|xml)$/i.test(u.pathname)) seen.add(u.origin + u.pathname)
      } catch { /* skip unparseable href */ }
    }
    urls = [...seen]
  }
  urls = [...new Set(urls)].slice(0, o.maxPages)

  const pages = []
  for (const url of urls) {
    const res = url === origin + '/' ? home : await get(url, o)
    if (!res.ok) {
      // Every section array must exist even here. Omitting them made flatMap
      // yield undefined and the summary crash on the next site scanned.
      const unreachable = [{ level: 'warn', code: 'page-unreachable', message: `returned ${res.status || res.error}` }]
      pages.push({ url, status: res.status, findings: unreachable, foundationFindings: [], answerEngineFindings: unreachable, head: {} })
      continue
    }
    const nojs = checkNoJs(res.body)
    const sd = checkStructuredData(res.body)
    const fp = checkFirstParagraph(res.body)
    const fo = checkFoundations(res.body)
    pages.push({
      url, status: res.status, bytes: res.bytes,
      visibleChars: nojs.visibleChars, hydrationPayload: nojs.hydrationPayload,
      structuredDataTypes: sd.types, head: sd.head, ogCount: Object.keys(sd.og).length,
      h1: fp.h1, firstParagraph: fp.firstParagraph,
      lang: fo.lang, hreflang: fo.hreflang, words: fo.words,
      images: fo.images, imagesWithoutAlt: fo.imagesWithoutAlt, h1Count: fo.h1Count,
      foundationFindings: fo.findings,
      answerEngineFindings: [...nojs.findings, ...sd.findings, ...fp.findings],
      findings: [...fo.findings, ...nojs.findings, ...sd.findings, ...fp.findings],
    })
  }

  const crossPage = checkAcrossPages(pages, origin)
  const siteFindings = [...robots.findings, ...discovery.findings, ...crossPage]
  const all = [...siteFindings, ...pages.flatMap((p) => p.findings)]
  // Two sections, reported separately, because the order matters: answer-engine
  // work layers onto foundations rather than replacing them, and a report that
  // mixes them invites fixing the interesting half first.
  const bySection = {
    foundations: [...crossPage, ...pages.flatMap((p) => p.foundationFindings)],
    answerEngines: [...robots.findings, ...discovery.findings, ...pages.flatMap((p) => p.answerEngineFindings)],
  }
  return {
    origin, startedAt, finishedAt: new Date().toISOString(),
    robots: { present: robots.present, sitemaps: robots.sitemaps, agents: robots.agents },
    discovery: discovery.files,
    siteFindings, pages, bySection,
    summary: {
      pagesScanned: pages.length,
      fail: all.filter((f) => f.level === 'fail').length,
      warn: all.filter((f) => f.level === 'warn').length,
      foundations: {
        fail: bySection.foundations.filter((f) => f.level === 'fail').length,
        warn: bySection.foundations.filter((f) => f.level === 'warn').length,
      },
      answerEngines: {
        fail: bySection.answerEngines.filter((f) => f.level === 'fail').length,
        warn: bySection.answerEngines.filter((f) => f.level === 'warn').length,
      },
    },
  }
}
