import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env'), quiet: true })
const clientDist = path.join(root, 'Client', 'dist')
const previewPort = Number(process.env.PRERENDER_PORT || 4173)
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9333)
const apiTarget = (process.env.API_PROXY_TARGET || 'http://127.0.0.1:5000').replace(/\/$/, '')
const baseUrl = `http://localhost:${previewPort}`
const siteUrl = (
  process.env.PRERENDER_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.VITE_SITE_URL ||
  baseUrl
).replace(/\/$/, '')

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(candidate))
}

async function waitForUrl(url, timeout = 30000) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)

      if (response.ok) return
    } catch {}

    await delay(250)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPublishedPosts() {
  const articles = []
  let page = 1

  while (page <= 20) {
    const response = await fetch(`${apiTarget}/api/posts?limit=50&page=${page}`)

    if (!response.ok) {
      throw new Error(`Could not load posts for prerendering (${response.status}).`)
    }

    const payload = await response.json()
    articles.push(...(payload.posts || []))

    if (!payload.pagination || page >= payload.pagination.pages) break

    page += 1
  }

  return articles
}

function publicRoutes(posts) {
  const routes = new Map([
    [
      '/',
      "document.querySelectorAll('.article-card').length > 0 && Boolean(document.querySelector('.hero-cloud-feature:not(.hero-cloud-feature-loading)')) && document.querySelectorAll('.external-card').length > 0",
    ],
  ])
  const authors = new Set()

  for (const post of posts) {
    if (!post.slug) continue

    routes.set(`/posts/${post.slug}`, "Boolean(document.querySelector('.post-article'))")

    if (post.author?.id) authors.add(post.author.id)
  }

  for (const authorId of authors) {
    routes.set(`/authors/${authorId}`, "Boolean(document.querySelector('.author-hero'))")
  }

  return [...routes.entries()].map(([route, condition]) => ({ route, condition }))
}

function outputPath(route) {
  if (route === '/') return path.join(clientDist, 'index.html')

  return path.join(clientDist, `${route.replace(/^\//, '')}.html`)
}

function killTree(child) {
  if (!child?.pid) return

  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
    } else {
      child.kill('SIGTERM')
    }
  } catch {}
}

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  const pending = new Map()
  let nextId = 0

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)

    if (!request) return

    pending.delete(message.id)

    if (message.error) {
      request.reject(new Error(message.error.message))
    } else {
      request.resolve(message.result)
    }
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId

      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })

  return {
    send,
    close: () => socket.close(),
  }
}

async function run() {
  const chrome = chromePath()

  if (!chrome) {
    throw new Error('Chrome was not found. Set CHROME_PATH to use prerendering.')
  }

  if (!existsSync(path.join(clientDist, 'index.html'))) {
    throw new Error('Client build not found. Run `npm run client:build` first.')
  }

  const posts = await fetchPublishedPosts()
  const routes = publicRoutes(posts)
  const profile = await mkdtemp(path.join(tmpdir(), 'cloudcraft-prerender-'))
  const preview = spawn(
    `npm --prefix Client run preview -- --port ${previewPort}`,
    {
      cwd: root,
      stdio: 'ignore',
      windowsHide: true,
      shell: true,
    },
  )
  let browser = null

  try {
    await waitForUrl(baseUrl)

    browser = spawn(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        `--user-data-dir=${profile}`,
        `--remote-debugging-port=${debugPort}`,
        '--window-size=1280,900',
        'about:blank',
      ],
      { stdio: 'ignore', windowsHide: true },
    )

    await waitForUrl(`http://127.0.0.1:${debugPort}/json/version`)
    const target = await (
      await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, {
        method: 'PUT',
      })
    ).json()
    const cdp = await createCdpClient(target.webSocketDebuggerUrl)

    try {
      await cdp.send('Page.enable')
      await cdp.send('Runtime.enable')

      for (const { route, condition } of routes) {
        const url = `${baseUrl}${route}`
        const deadline = Date.now() + 20000
        let ready = false

        await cdp.send('Page.navigate', { url })

        while (Date.now() < deadline) {
          await delay(200)

          const result = await cdp.send('Runtime.evaluate', {
            expression: `document.readyState === 'complete' && (${condition})`,
            returnByValue: true,
          })

          if (result.result?.value) {
            ready = true
            break
          }
        }

        if (!ready) {
          throw new Error(`Timed out waiting for content on ${route}`)
        }

        await delay(300)

        const serialized = await cdp.send('Runtime.evaluate', {
          expression: `'<!doctype html>\\n' + document.documentElement.outerHTML`,
          returnByValue: true,
        })

        if (!serialized.result?.value) {
          throw new Error(`Could not serialize ${route}`)
        }

        const html = serialized.result.value.split(baseUrl).join(siteUrl)
        const destination = outputPath(route)

        await mkdir(path.dirname(destination), { recursive: true })
        await writeFile(destination, html, 'utf8')

        console.log(`prerendered ${route}`)
      }
    } finally {
      await cdp.send('Browser.close').catch(() => {})
      cdp.close()
    }
  } finally {
    killTree(browser)
    killTree(preview)
    await rm(profile, { recursive: true, force: true }).catch(() => {})
  }
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
