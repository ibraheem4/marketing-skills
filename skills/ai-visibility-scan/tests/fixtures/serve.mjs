import { createServer } from 'node:http'

export async function serve(build) {
  const hits = []
  let routes = {}
  const server = createServer((req, res) => {
    hits.push(req.url)
    const r = routes[req.url]
    if (!r) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return }
    const send = () => {
      res.writeHead(r.status ?? 200, { 'content-type': r.type ?? 'text/html' })
      res.end(r.body ?? '')
    }
    if (r.delay) setTimeout(send, r.delay)
    else send()
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const origin = `http://127.0.0.1:${server.address().port}`
  routes = build(origin)
  return {
    origin,
    hits,
    close: () => new Promise((ok) => { server.closeAllConnections(); server.close(ok) }),
  }
}

export function html({ title = 'Page', words = 200, ld = true } = {}) {
  return `<!doctype html><html lang="en"><head><title>${title}</title>
<link rel="canonical" href="/"><meta property="og:title" content="${title}">
${ld ? '<script type="application/ld+json">{"@type":"WebPage"}</script>' : ''}
</head><body><h1>${title}</h1><p>${'word '.repeat(words)}</p></body></html>`
}

export const sitemap = (origin, paths) =>
  ({ type: 'application/xml', body: `<urlset>${paths.map((p) => `<loc>${origin}${p}</loc>`).join('')}</urlset>` })
