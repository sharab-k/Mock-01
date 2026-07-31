import 'server-only'
import puppeteer, { type Browser } from 'puppeteer-core'

// Plain `puppeteer` bundles a full Chromium binary that's too large for
// Vercel's serverless function size limit (see BACKEND-IMPLEMENTATION-PLAN.md's
// correction note) — `puppeteer-core` + `@sparticuz/chromium` is the
// serverless-safe swap, same HTML-to-PDF approach either way.
//
// @sparticuz/chromium's bundled binary is Linux-only (built for AWS
// Lambda/Vercel's runtime), so it can't launch on a local Windows/macOS dev
// machine at all. Locally, this falls back to a system-installed Chrome/Edge
// instead — overridable via PUPPETEER_EXECUTABLE_PATH, auto-detected
// otherwise. This branch never runs in production.
async function resolveLaunchOptions() {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default
    return {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    }
  }

  const localCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter((p): p is string => !!p)

  const fs = await import('fs')
  const executablePath = localCandidates.find((p) => fs.existsSync(p))
  if (!executablePath) {
    throw new Error(
      'No local Chrome/Edge found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH to a Chromium-based browser executable.',
    )
  }

  return { args: [], executablePath, headless: true }
}

let browserPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = resolveLaunchOptions().then((options) => puppeteer.launch(options))
  }
  return browserPromise
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    await page.evaluateHandle('document.fonts.ready') // wait for the Google Fonts <link> to finish loading
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
