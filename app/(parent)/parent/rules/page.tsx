import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import { fetchPublishedRules } from '@/lib/rules/data'

type Props = { searchParams: Promise<{ sort?: string }> }

export default async function ParentRulesPage({ searchParams }: Props) {
  const latest = (await searchParams).sort === 'latest'
  const rules = await fetchPublishedRules(latest ? 'latest' : 'academy')
  const chip = (on: boolean) => `text-[12px] font-semibold px-3 py-1.5 rounded-lg no-underline ${on ? 'bg-ink-700 text-white' : 'bg-white text-neutral-600 border border-neutral-200'}`

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><ScrollText size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Rules and regulations</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">The academy’s current rules and instructions. Tap a picture to open it full size.</p>
        </div>
      </div>

      {rules.length > 1 && (
        <div className="flex items-center gap-2">
          <Link href="/parent/rules" className={chip(!latest)}>Academy order</Link>
          <Link href="/parent/rules?sort=latest" className={chip(latest)}>Newest first</Link>
        </div>
      )}

      {rules.length === 0 && <p className="text-[13px] text-neutral-500 bg-white rounded-2xl border border-neutral-200 p-6 text-center">No rules have been published yet.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {rules.map((r) => (
          <article key={r.id} className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
            <a href={r.image_url ?? '#'} target="_blank" rel="noreferrer" className="block bg-neutral-100" aria-label={`Open ${r.title} full size`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not a static asset */}
              {r.image_url ? <img src={r.image_url} alt={r.title} className="w-full h-auto block" loading="lazy" /> : null}
            </a>
            <div className="p-4">
              <h2 className="text-[14px] font-bold text-neutral-900">{r.title}</h2>
              {r.description && <p className="mt-1 text-[13px] text-neutral-600 whitespace-pre-wrap">{r.description}</p>}
              {r.published_at && <p className="mt-2 text-[11px] font-mono text-neutral-400">Published {r.published_at.slice(0, 10)}</p>}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
