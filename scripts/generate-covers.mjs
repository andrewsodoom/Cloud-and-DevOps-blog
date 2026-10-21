import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'Client', 'public', 'covers')

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

function spokes(accent) {
  return Array.from({ length: 7 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 7 - Math.PI / 2
    const x = 200 + Math.cos(angle) * 118
    const y = 200 + Math.sin(angle) * 118

    return `<line x1="200" y1="200" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${accent}" stroke-opacity=".45"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="${accent}" fill-opacity=".14" stroke="${accent}"/>`
  }).join('')
}

function glyph(kind, accent) {
  const line = `fill="none" stroke="${accent}" stroke-linecap="round" stroke-linejoin="round"`

  switch (kind) {
    case 'kubernetes':
      return `<svg viewBox="0 0 400 400" ${line}>
        <circle cx="200" cy="200" r="156" stroke-opacity=".12" />
        <circle cx="200" cy="200" r="118" stroke-opacity=".55" stroke-width="2" />
        <circle cx="200" cy="200" r="74" stroke-opacity=".24" stroke-dasharray="4 10" />
        ${spokes(accent)}
        <circle cx="200" cy="200" r="27" fill="${accent}" fill-opacity=".16" stroke-width="2" />
        <circle cx="200" cy="200" r="7" fill="${accent}" />
      </svg>`

    case 'terraform':
      return `<svg viewBox="0 0 400 400" ${line}>
        <path d="M200 54 312 118 200 182 88 118Z" stroke-opacity=".8" fill="${accent}" fill-opacity=".08" />
        <path d="M88 118v112l112 64V182" stroke-opacity=".55" fill="${accent}" fill-opacity=".04" />
        <path d="M312 118v112l-112 64V182" stroke-opacity=".55" fill="${accent}" fill-opacity=".04" />
        <path d="M200 182v112" stroke-opacity=".3" stroke-dasharray="5 9" />
        <path d="M128 92 240 156" stroke-opacity=".22" />
        <path d="M272 92 160 156" stroke-opacity=".22" />
      </svg>`

    case 'ci-cd':
      return `<svg viewBox="0 0 400 400" ${line}>
        <path d="M66 200h58" stroke-opacity=".7" stroke-width="3" />
        <circle cx="54" cy="200" r="23" fill="${accent}" fill-opacity=".12" stroke-width="2" />
        <circle cx="151" cy="200" r="30" fill="${accent}" fill-opacity=".1" stroke-width="2" />
        <path d="m140 200 8 8 15-17" stroke-width="3" />
        <path d="M181 200h58" stroke-opacity=".7" stroke-width="3" />
        <circle cx="268" cy="200" r="30" fill="${accent}" fill-opacity=".1" stroke-width="2" />
        <path d="M258 188v24M268 188v24M278 188v24" stroke-opacity=".75" />
        <path d="M298 200h50" stroke-opacity=".7" stroke-width="3" />
        <path d="m338 190 12 10-12 10" stroke-width="3" />
        <circle cx="370" cy="200" r="6" fill="${accent}" />
        <path d="M100 292h200" stroke-opacity=".14" stroke-dasharray="3 9" />
        <path d="M100 108h200" stroke-opacity=".14" stroke-dasharray="3 9" />
      </svg>`

    case 'aws':
      return `<svg viewBox="0 0 400 400" ${line}>
        <path d="M118 280c-30 0-54-24-54-54 0-27 20-49 46-53 8-41 44-71 86-71 44 0 81 31 89 73 34 3 59 31 59 64 0 23-12 41-30 41H118Z" stroke-opacity=".75" stroke-width="2" fill="${accent}" fill-opacity=".05" />
        <path d="M92 312h216" stroke-opacity=".3" stroke-dasharray="4 10" />
        <rect x="144" y="150" width="48" height="48" rx="10" fill="${accent}" fill-opacity=".1" />
        <rect x="208" y="150" width="48" height="48" rx="10" fill="${accent}" fill-opacity=".1" />
        <rect x="176" y="214" width="48" height="48" rx="10" fill="${accent}" fill-opacity=".1" />
        <circle cx="168" cy="174" r="7" fill="${accent}" />
        <circle cx="232" cy="174" r="7" fill="${accent}" />
        <circle cx="200" cy="238" r="7" fill="${accent}" />
      </svg>`

    case 'observability':
      return `<svg viewBox="0 0 400 400" ${line}>
        <circle cx="300" cy="112" r="64" stroke-opacity=".18" />
        <circle cx="300" cy="112" r="40" stroke-opacity=".35" stroke-dasharray="3 8" />
        <circle cx="300" cy="112" r="8" fill="${accent}" />
        <path d="M36 238h54l22-84 38 168 32-120 26 72 32-36h124" stroke-width="3" stroke-opacity=".9" />
        <path d="M36 272h80l18-38 28 74 26-50 22 14h154" stroke-opacity=".2" />
        <circle cx="112" cy="238" r="5" fill="${accent}" />
        <circle cx="230" cy="238" r="5" fill="${accent}" />
        <circle cx="352" cy="238" r="5" fill="${accent}" />
        <path d="M70 330h260" stroke-opacity=".14" stroke-dasharray="3 9" />
      </svg>`

    case 'docker':
      return `<svg viewBox="0 0 400 400" ${line}>
        <rect x="76" y="98" width="264" height="224" rx="24" stroke-opacity=".16" stroke-dasharray="5 11" />
        <rect x="92" y="126" width="74" height="58" rx="9" stroke-opacity=".75" fill="${accent}" fill-opacity=".08" />
        <rect x="178" y="126" width="74" height="58" rx="9" stroke-opacity=".9" fill="${accent}" fill-opacity=".11" />
        <rect x="264" y="126" width="74" height="58" rx="9" stroke-opacity=".55" fill="${accent}" fill-opacity=".05" />
        <rect x="135" y="196" width="74" height="58" rx="9" stroke-opacity="1" fill="${accent}" fill-opacity=".13" />
        <rect x="221" y="196" width="74" height="58" rx="9" stroke-opacity=".8" fill="${accent}" fill-opacity=".09" />
        <path d="M166 276h128v28c0 18-15 33-33 33h-62c-18 0-33-15-33-33v-28Z" stroke-opacity=".85" fill="${accent}" fill-opacity=".08" />
        <path d="M96 286h44M284 286h24" stroke-opacity=".4" stroke-dasharray="4 8" />
        <path d="M162 110h150" stroke-opacity=".18" stroke-dasharray="3 9" />
      </svg>`

    case 'platform':
      return `<svg viewBox="0 0 400 400" ${line}>
        <path d="M38 314c92 0 92-92 184-92s92-92 140-92" stroke-width="3" stroke-opacity=".85" />
        <path d="M38 344c92 0 92-92 184-92s92-92 140-92" stroke-opacity=".18" stroke-dasharray="4 10" />
        <circle cx="86" cy="314" r="10" fill="${accent}" fill-opacity=".35" />
        <circle cx="176" cy="268" r="10" fill="${accent}" fill-opacity=".5" />
        <circle cx="266" cy="176" r="10" fill="${accent}" fill-opacity=".7" />
        <circle cx="356" cy="130" r="10" fill="${accent}" />
        <path d="M86 314v-52M176 268v-52M266 176v-52" stroke-opacity=".25" />
        <path d="M62 262h48M152 216h48M242 124h48" stroke-opacity=".2" />
      </svg>`

    case 'sre':
      return `<svg viewBox="0 0 400 400" ${line}>
        <path d="M74 286a126 126 0 0 1 252 0" stroke-width="3" stroke-opacity=".8" />
        <path d="M100 286a100 100 0 0 1 200 0" stroke-opacity=".18" stroke-dasharray="4 10" />
        <path d="M200 286 266 190" stroke-width="3" />
        <circle cx="200" cy="286" r="12" fill="${accent}" fill-opacity=".25" stroke-width="2" />
        <circle cx="200" cy="286" r="4" fill="${accent}" />
        <path d="M92 254h18M290 254h18M120 208l14 12M280 208l-14 12M200 160v20" stroke-opacity=".55" />
      </svg>`

    case 'autoscaling':
      return `<svg viewBox="0 0 400 400" ${line}>
        <path d="M78 322V254h52v68" stroke-opacity=".4" fill="${accent}" fill-opacity=".05" />
        <path d="M144 322V204h52v118" stroke-opacity=".55" fill="${accent}" fill-opacity=".07" />
        <path d="M210 322V156h52v166" stroke-opacity=".7" fill="${accent}" fill-opacity=".09" />
        <path d="M276 322V106h52v216" stroke-opacity=".9" fill="${accent}" fill-opacity=".12" />
        <path d="M62 322h274" stroke-width="3" stroke-opacity=".8" />
        <path d="M62 106h274" stroke-opacity=".25" stroke-dasharray="4 10" />
        <path d="M310 82V58M298 70h24" stroke-opacity=".5" />
      </svg>`

    case 'state':
      return `<svg viewBox="0 0 400 400" ${line}>
        <ellipse cx="200" cy="104" rx="64" ry="20" stroke-opacity=".45" fill="${accent}" fill-opacity=".05" />
        <path d="M136 104v46c0 11 29 20 64 20s64-9 64-20v-46" stroke-opacity=".45" />
        <path d="M136 150v26" stroke-opacity=".2" />
        <path d="M264 150v26" stroke-opacity=".2" />
        <rect x="138" y="204" width="124" height="108" rx="16" stroke-opacity=".85" stroke-width="3" fill="${accent}" fill-opacity=".08" />
        <path d="M164 204v-26c0-20 16-36 36-36s36 16 36 36v26" stroke-width="3" stroke-opacity=".85" />
        <circle cx="200" cy="250" r="10" fill="${accent}" fill-opacity=".7" />
        <path d="M200 260v22" stroke-width="4" stroke-opacity=".7" />
      </svg>`

    case 'multi-account':
      return `<svg viewBox="0 0 400 400" ${line}>
        <rect x="148" y="62" width="104" height="64" rx="12" stroke-opacity=".85" fill="${accent}" fill-opacity=".08" />
        <path d="M200 126v42M104 232v-32h192v32M200 168v32" stroke-opacity=".45" />
        <rect x="48" y="232" width="104" height="64" rx="12" stroke-opacity=".55" fill="${accent}" fill-opacity=".05" />
        <rect x="148" y="232" width="104" height="64" rx="12" stroke-opacity=".75" fill="${accent}" fill-opacity=".07" />
        <rect x="248" y="232" width="104" height="64" rx="12" stroke-opacity=".55" fill="${accent}" fill-opacity=".05" />
        <circle cx="200" cy="94" r="7" fill="${accent}" />
        <circle cx="100" cy="264" r="7" fill="${accent}" />
        <circle cx="200" cy="264" r="7" fill="${accent}" />
        <circle cx="300" cy="264" r="7" fill="${accent}" />
        <path d="M76 330h248" stroke-opacity=".16" stroke-dasharray="4 10" />
      </svg>`

    case 'incident':
      return `<svg viewBox="0 0 400 400" ${line}>
        <path d="M200 76 326 302H74Z" stroke-width="3" stroke-opacity=".85" fill="${accent}" fill-opacity=".06" />
        <path d="M200 146v78" stroke-width="10" stroke-opacity=".75" />
        <circle cx="200" cy="264" r="8" fill="${accent}" />
        <path d="M46 340h60l16-34 22 62 24-44 18 16h168" stroke-opacity=".65" />
        <circle cx="106" cy="340" r="4" fill="${accent}" />
        <circle cx="316" cy="340" r="4" fill="${accent}" />
      </svg>`

    default:
      return ''
  }
}

const covers = [
  {
    slug: 'zero-downtime-kubernetes',
    title: 'Zero-downtime deploys on Kubernetes',
    category: 'Kubernetes',
    accent: '#42f5c5',
    glyph: 'kubernetes',
  },
  {
    slug: 'terraform-module-structure',
    title: 'A Terraform module structure that scales',
    category: 'Terraform',
    accent: '#a78bfa',
    glyph: 'terraform',
  },
  {
    slug: 'ci-cd-fail-fast',
    title: 'Pipelines that fail early and loudly',
    category: 'CI/CD',
    accent: '#7da2ff',
    glyph: 'ci-cd',
  },
  {
    slug: 'cutting-aws-bill-without-migration',
    title: 'Cut the AWS bill without a migration',
    category: 'AWS',
    accent: '#ffb454',
    glyph: 'aws',
  },
  {
    slug: 'opentelemetry-tracing-production',
    title: 'Tracing production with OpenTelemetry',
    category: 'Observability',
    accent: '#5ee7ff',
    glyph: 'observability',
  },
  {
    slug: 'docker-image-hardening',
    title: 'Hardening container images for production',
    category: 'Docker',
    accent: '#6ea8ff',
    glyph: 'docker',
  },
  {
    slug: 'platform-team-golden-paths',
    title: 'Golden paths platform teams can defend',
    category: 'Platform engineering',
    accent: '#5ff0c0',
    glyph: 'platform',
  },
  {
    slug: 'sre-error-budget-policy',
    title: 'An error budget policy people follow',
    category: 'SRE',
    accent: '#c4a5ff',
    glyph: 'sre',
  },
  {
    slug: 'kubernetes-autoscaling-hpa-vpa',
    title: 'HPA, VPA, and the autoscaling trap',
    category: 'Kubernetes',
    accent: '#82b4ff',
    glyph: 'autoscaling',
  },
  {
    slug: 'terraform-state-locking',
    title: 'Terraform state locking without the fear',
    category: 'Terraform',
    accent: '#b196ff',
    glyph: 'state',
  },
  {
    slug: 'aws-multi-account-strategy',
    title: 'A multi-account AWS strategy that holds up',
    category: 'AWS',
    accent: '#ffc06a',
    glyph: 'multi-account',
  },
  {
    slug: 'incident-response-runbook',
    title: 'Runbooks for the incident at 2 a.m.',
    category: 'SRE',
    accent: '#ff8a8a',
    glyph: 'incident',
  },
]

function coverHtml(cover, index) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 675px; overflow: hidden; }
  body {
    position: relative;
    color: #f4f8ff;
    font-family: "Segoe UI", Inter, system-ui, sans-serif;
    background:
      radial-gradient(900px 520px at 84% 16%, ${cover.accent}30, transparent 66%),
      radial-gradient(760px 460px at 8% 96%, #7da2ff22, transparent 70%),
      linear-gradient(135deg, #050912 0%, #0a1220 54%, #061019 100%);
  }
  .grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: linear-gradient(118deg, #000 8%, transparent 78%);
  }
  .glow {
    position: absolute;
    top: -280px;
    right: -240px;
    width: 760px;
    height: 760px;
    border-radius: 50%;
    background: radial-gradient(circle, ${cover.accent}55, transparent 62%);
    filter: blur(12px);
  }
  .frame {
    position: absolute;
    inset: 34px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
  }
  .top {
    position: absolute;
    top: 58px;
    left: 64px;
    right: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #d6e4ff;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.24em;
    text-transform: uppercase;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${cover.accent};
    box-shadow: 0 0 18px ${cover.accent};
  }
  .volume {
    color: #8fa4c4;
    font-size: 13px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
  }
  .halo {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 880px;
    height: 880px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, ${cover.accent}26 0%, ${cover.accent}0a 42%, transparent 66%);
  }
  .glyph {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 570px;
    height: 570px;
    transform: translate(-50%, -50%);
    opacity: 0.95;
    filter: drop-shadow(0 30px 70px rgba(0, 0, 0, 0.45));
  }
  .glyph svg { width: 100%; height: 100%; }
  .footer {
    position: absolute;
    left: 64px;
    bottom: 56px;
    display: flex;
    align-items: center;
    gap: 14px;
    color: #8fa4c4;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .footer i {
    display: block;
    width: 54px;
    height: 1px;
    background: ${cover.accent};
    opacity: 0.75;
  }
</style>
</head>
<body>
  <div class="grid"></div>
  <div class="glow"></div>
  <div class="halo"></div>
  <div class="frame"></div>
  <div class="top">
    <div class="brand"><span class="dot"></span>CloudCraft Journal</div>
    <div class="volume">Vol. 01 / 2026</div>
  </div>
  <div class="glyph">${glyph(cover.glyph, cover.accent)}</div>
  <div class="footer"><i></i>Field note ${String(index + 1).padStart(2, '0')} / ${cover.category}</div>
</body>
</html>`
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForUrl(url, timeout = 30000) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)

      if (response.ok) return
    } catch {}

    await delay(200)
  }

  throw new Error(`Timed out waiting for ${url}`)
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
    throw new Error('Chrome was not found. Set CHROME_PATH to generate covers.')
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'cloudcraft-covers-'))
  const profile = path.join(workDir, 'profile')
  const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9334)
  const browser = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--force-device-scale-factor=1',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${debugPort}`,
      '--window-size=1200,675',
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  )
  let cdp = null

  await mkdir(outputDir, { recursive: true })
  await mkdir(profile, { recursive: true })

  try {
    await waitForUrl(`http://127.0.0.1:${debugPort}/json/version`)
    const target = await (
      await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, {
        method: 'PUT',
      })
    ).json()

    cdp = await createCdpClient(target.webSocketDebuggerUrl)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 675,
      deviceScaleFactor: 1,
      mobile: false,
    })

    for (const [index, cover] of covers.entries()) {
      const htmlPath = path.join(workDir, `${cover.slug}.html`)
      const outputPath = path.join(outputDir, `${cover.slug}.jpg`)

      await writeFile(htmlPath, coverHtml(cover, index), 'utf8')
      await cdp.send('Page.navigate', { url: pathToFileURL(htmlPath).href })

      const deadline = Date.now() + 10000

      while (Date.now() < deadline) {
        await delay(100)

        const result = await cdp.send('Runtime.evaluate', {
          expression:
            "document.readyState === 'complete' && document.fonts.status === 'loaded'",
          returnByValue: true,
        })

        if (result.result?.value) break
      }

      await delay(250)

      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 92,
        fromSurface: true,
        captureBeyondViewport: false,
      })

      await writeFile(outputPath, Buffer.from(shot.data, 'base64'))
      console.log(`generated ${path.relative(root, outputPath)}`)
    }
  } finally {
    await cdp?.send('Browser.close').catch(() => {})
    try {
      cdp?.close()
    } catch {}
    killTree(browser)
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
