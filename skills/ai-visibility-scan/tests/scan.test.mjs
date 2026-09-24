/**
 * node --test tests/scan.test.mjs
 *
 * scanSite against a local fixture site. allowLocal is set because the
 * fixture is on 127.0.0.1; the HTTP shell never sets it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanSite } from '../scripts/visibility-engine.mjs'
import { serve, html, sitemap } from './fixtures/serve.mjs'

const OPTS = { allowLocal: true, timeoutMs: 2_000 }

test('the homepage is the first page read, even when the sitemap omits it', async (t) => {
  const site = await serve((o) => ({
    '/': { body: html({ title: 'Home' }) },
    '/robots.txt': { type: 'text/plain', body: `User-agent: *\nAllow: /\nSitemap: ${o}/sitemap.xml\n` },
    '/sitemap.xml': sitemap(o, ['/a', '/b', '/c']),
    '/a': { body: html({ title: 'A' }) },
    '/b': { body: html({ title: 'B' }) },
    '/c': { body: html({ title: 'C' }) },
  }))
  t.after(site.close)
  const r = await scanSite(site.origin, { ...OPTS, maxPages: 2 })
  assert.equal(r.pages[0].url, site.origin + '/')
  assert.equal(r.pages.length, 2, 'the homepage counts toward maxPages')
  assert.equal(r.pages[1].url, site.origin + '/a')
})

test('a refused homepage still reads robots.txt and the discovery files', async (t) => {
  const site = await serve(() => ({
    '/': { status: 403, body: 'no' },
    '/robots.txt': { type: 'text/plain', body: 'User-agent: GPTBot\nDisallow: /\n' },
  }))
  t.after(site.close)
  const r = await scanSite(site.origin, OPTS)
  assert.deepEqual(r.homeUnreachable, { status: 403, error: null })
  assert.equal(r.error, undefined)
  assert.equal(r.robots.agents.GPTBot.allowed, false)
  assert.equal(r.pages.length, 0)
  assert.ok(r.siteFindings.some((f) => f.code === 'unreachable'))
  assert.ok(site.hits.includes('/llms.txt'))
})

test('only the first maxSitemaps sitemaps listed in robots.txt are fetched', async (t) => {
  const listed = [1, 2, 3, 4, 5].map((n) => `/sm-${n}.xml`)
  const site = await serve((o) => ({
    '/': { body: html() },
    '/robots.txt': { type: 'text/plain', body: listed.map((p) => `Sitemap: ${o}${p}`).join('\n') },
    ...Object.fromEntries(listed.map((p) => [p, sitemap(o, ['/'])])),
  }))
  t.after(site.close)
  const r = await scanSite(site.origin, OPTS)
  assert.equal(r.robots.sitemapsListed, 5)
  assert.equal(r.robots.sitemaps.length, 3)
  assert.ok(!site.hits.includes('/sm-4.xml') && !site.hits.includes('/sm-5.xml'))
  assert.ok(r.siteFindings.some((f) => f.code === 'sitemaps-unchecked'))
})

test('the deadline stops the scan and reports what it has', async (t) => {
  const site = await serve((o) => ({
    '/': { body: html() },
    '/sitemap.xml': sitemap(o, ['/slow-1', '/slow-2', '/slow-3']),
    '/slow-1': { body: html(), delay: 400 },
    '/slow-2': { body: html(), delay: 400 },
    '/slow-3': { body: html(), delay: 400 },
  }))
  t.after(site.close)
  const began = Date.now()
  const r = await scanSite(site.origin, { ...OPTS, deadlineMs: 300 })
  assert.equal(r.stopped, 'deadline')
  assert.ok(Date.now() - began < 1_500, 'stopped near the deadline, not after every slow page')
  assert.equal(r.pages[0].url, site.origin + '/')
  // A page fetch the deadline cut short was never read — it must not appear at all.
  assert.ok(!r.pages.some((p) => p.findings.some((f) => f.code === 'page-unreachable')), 'a cut-short page fetch must not be recorded as unreachable')
})

test('an aborted signal stops fetching', async (t) => {
  const site = await serve((o) => ({
    '/': { body: html() },
    '/sitemap.xml': sitemap(o, ['/a', '/b', '/c']),
    '/a': { body: html(), delay: 200 },
    '/b': { body: html() },
    '/c': { body: html() },
  }))
  t.after(site.close)
  const ac = new AbortController()
  setTimeout(() => ac.abort(), 100)
  const r = await scanSite(site.origin, { ...OPTS, signal: ac.signal })
  assert.equal(r.stopped, 'aborted')
  assert.ok(!site.hits.includes('/b'))
})

test('requests counts every fetch the scan made', async (t) => {
  const site = await serve((o) => ({ '/': { body: html() } }))
  t.after(site.close)
  const r = await scanSite(site.origin, OPTS)
  // homepage, robots.txt, llms.txt, sitemap.xml (discovery), sitemap.xml (urls)
  assert.equal(r.requests, site.hits.length)
})

test('a fetch cut short by the deadline is not reported as missing or broken', async (t) => {
  const site = await serve((o) => ({
    '/': { body: html() },
    '/robots.txt': { type: 'text/plain', body: `Sitemap: ${o}/slow-sitemap.xml\n` },
    '/slow-sitemap.xml': { ...sitemap(o, ['/']), delay: 500 },
    '/llms.txt': { body: 'llms', delay: 500 },
  }))
  t.after(site.close)
  const began = Date.now()
  const r = await scanSite(site.origin, { ...OPTS, deadlineMs: 150 })
  assert.equal(r.stopped, 'deadline')
  assert.ok(Date.now() - began < 1_000, 'did not wait out the delayed fetches')
  const codes = r.siteFindings.map((f) => f.code)
  assert.ok(!codes.includes('sitemap-broken'), 'the cut-short robots sitemap must not be reported broken')
  assert.ok(!codes.includes('sitemap-missing'), 'the cut-short discovery sitemap must not be reported missing')
  assert.ok(!codes.includes('llms-txt-missing'), 'the cut-short llms.txt must not be reported missing')
})

test('events arrive in the order the work happens', async (t) => {
  const site = await serve((o) => ({
    '/': { body: html() },
    '/robots.txt': { type: 'text/plain', body: `User-agent: GPTBot\nDisallow: /\n\nSitemap: ${o}/sitemap.xml\n` },
    '/sitemap.xml': sitemap(o, ['/a']),
    '/a': { body: html({ words: 60 }) },
  }))
  t.after(site.close)
  const events = []
  await scanSite(site.origin, { ...OPTS, onEvent: (e) => events.push(e) })
  const types = events.map((e) => e.type)
  assert.deepEqual(events[0], { type: 'fetch', path: '/', status: 200, ms: events[0].ms })
  const r = types.indexOf('robots')
  assert.deepEqual(types.slice(r + 1, r + 14), Array(13).fill('agent'))
  assert.equal(events[r].sitemaps, 1)
  assert.equal(events.find((e) => e.name === 'GPTBot').allowed, false)
  const pages = events.filter((e) => e.type === 'page')
  assert.deepEqual(pages.map((p) => p.path), ['/', '/a'])
  assert.ok(pages[1].notes.includes('no-js-thin'))
  assert.deepEqual(pages[0].types, ['WebPage'])
  for (let i = 1; i < events.length; i++) assert.ok(events[i].ms >= events[i - 1].ms)
})

test('a refused homepage emits unreachable, then robots and agents', async (t) => {
  const site = await serve(() => ({
    '/': { status: 403 },
    '/robots.txt': { type: 'text/plain', body: 'User-agent: *\nDisallow: /\n' },
  }))
  t.after(site.close)
  const events = []
  await scanSite(site.origin, { ...OPTS, onEvent: (e) => events.push(e) })
  assert.equal(events[0].type, 'unreachable')
  assert.equal(events[0].status, 403)
  assert.equal(events.filter((e) => e.type === 'agent').length, 13)
  assert.equal(events.some((e) => e.type === 'page'), false)
})

test('the report is the same with or without onEvent', async (t) => {
  const site = await serve((o) => ({ '/': { body: html() }, '/sitemap.xml': sitemap(o, ['/']) }))
  t.after(site.close)
  const strip = ({ startedAt, finishedAt, ...rest }) => rest
  const quiet = await scanSite(site.origin, OPTS)
  const loud = await scanSite(site.origin, { ...OPTS, onEvent: () => {} })
  assert.deepEqual(strip(loud), strip(quiet))
})

test('a deadline that lands inside the URL-list sitemap fetch emits no status-0 event', async (t) => {
  const site = await serve((o) => ({
    '/': { body: html() },
    '/robots.txt': { type: 'text/plain', body: 'User-agent: *\nAllow: /\n' },
    '/sitemap.xml': { ...sitemap(o, ['/a']), delay: 400 },
  }))
  t.after(site.close)
  const events = []
  const r = await scanSite(site.origin, { ...OPTS, deadlineMs: 120, onEvent: (e) => events.push(e) })
  assert.equal(r.stopped, 'deadline')
  assert.ok(!events.some((e) => e.status === 0), 'a fetch the deadline cut short must not emit an event at all')
})

test('onEvent throwing does not fail the scan', async (t) => {
  const site = await serve((o) => ({ '/': { body: html() }, '/sitemap.xml': sitemap(o, ['/']) }))
  t.after(site.close)
  const strip = ({ startedAt, finishedAt, ...rest }) => rest
  const quiet = await scanSite(site.origin, OPTS)
  const loud = await scanSite(site.origin, { ...OPTS, onEvent: () => { throw new Error('sink closed') } })
  assert.deepEqual(strip(loud), strip(quiet))
})

// robots.status separates "no robots.txt" (4xx: nothing is blocked) from
// "robots.txt was not read" (0, 5xx, cut short). `agents` is empty in both,
// and only the first may read as allowed.
test('robots.status is 0 when nothing answers at the domain', async () => {
  const events = []
  const r = await scanSite('http://127.0.0.1:1', { ...OPTS, timeoutMs: 300, onEvent: (e) => events.push(e) })
  assert.equal(r.robots.status, 0)
  assert.equal(r.robots.present, false)
  assert.deepEqual(r.robots.agents, {})
  assert.equal(events.find((e) => e.type === 'robots')?.status, 0)
})

test('robots.status carries a 5xx from robots.txt', async (t) => {
  const site = await serve(() => ({ '/': { body: html() }, '/robots.txt': { status: 503, body: 'down' } }))
  t.after(site.close)
  const r = await scanSite(site.origin, OPTS)
  assert.equal(r.robots.status, 503)
  assert.deepEqual(r.robots.agents, {})
})

test('robots.status is 404 when there is no robots.txt', async (t) => {
  const site = await serve(() => ({ '/': { body: html() } }))
  t.after(site.close)
  const r = await scanSite(site.origin, OPTS)
  assert.equal(r.robots.status, 404)
})

test('robots.status is null when the deadline cuts robots.txt short', async (t) => {
  const site = await serve(() => ({
    '/': { body: html() },
    '/robots.txt': { type: 'text/plain', body: 'User-agent: GPTBot\nDisallow: /\n', delay: 600 },
  }))
  t.after(site.close)
  const events = []
  const r = await scanSite(site.origin, { ...OPTS, deadlineMs: 200, onEvent: (e) => events.push(e) })
  assert.equal(r.stopped, 'deadline')
  assert.equal(r.robots.status, null)
  assert.ok(!events.some((e) => e.type === 'robots'), 'a cut-short robots.txt emits no robots event')
})

test('robots.status is 200 when robots.txt is read', async (t) => {
  const site = await serve(() => ({ '/': { body: html() }, '/robots.txt': { type: 'text/plain', body: 'User-agent: *\nAllow: /\n' } }))
  t.after(site.close)
  const r = await scanSite(site.origin, OPTS)
  assert.equal(r.robots.status, 200)
  assert.equal(r.robots.present, true)
})
