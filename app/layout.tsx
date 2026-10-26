import type { Metadata } from 'next'
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import ReportChoiceHost from '@/components/dashboard/ReportChoiceHost'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'JE Academy',
  description: 'A structured academy experience for Primary through Intermediate — with real-time attendance, results, and progress shared directly with parents.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <ReportChoiceHost />
        {/* Vercel Speed Insights: real-user timings (TTFB, LCP, INP) per page. Loaded as
            Vercel's own script instead of the npm package; it only reports on Vercel. */}
        <Script id="vercel-speed-insights-init" strategy="afterInteractive">
          {'window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };'}
        </Script>
        <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
