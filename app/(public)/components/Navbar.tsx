import Link from 'next/link'
import Image from 'next/image'

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Programmes', href: '#programmes' },
  { label: 'Faculty', href: '#faculty' },
  { label: 'Notices', href: '#notices' },
  { label: 'Contact', href: '#enquiry' },
]

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-[62px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline shrink-0">
          <Image
            src="/logos/je-academy-logo.png"
            width={46}
            height={46}
            alt="JE Academy crest"
            style={{ mixBlendMode: 'multiply' }}
            priority
          />
          <span className="font-serif font-semibold text-[17px] text-neutral-950 hidden sm:block">JE Academy</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[13px] text-neutral-600 font-medium no-underline hover:text-neutral-950 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center text-[13px] font-medium rounded-xl px-4 py-2 border border-neutral-200 bg-white text-neutral-700 no-underline hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            Log in
          </Link>
          <a
            href="#enquiry"
            className="inline-flex items-center text-[13px] font-semibold rounded-xl px-4 py-2 bg-ink-700 text-white no-underline hover:bg-ink-800 transition-colors"
          >
            Enquire
          </a>
        </div>
      </div>
    </nav>
  )
}
