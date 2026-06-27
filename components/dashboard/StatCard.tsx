import Link from 'next/link'

type Props = {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  sub?: string
  subUp?: boolean
  href?: string
}

export default function StatCard({ label, value, icon, iconBg, iconColor, sub, subUp, href }: Props) {
  const inner = (
    <div className={`bg-white rounded-2xl border border-neutral-200 p-5 flex items-start gap-4 shadow-1 transition-all ${href ? 'hover:border-ink-200 hover:shadow-md cursor-pointer' : ''}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[12px] text-neutral-500 font-medium mb-1">{label}</span>
        <span className="block text-[30px] font-bold text-neutral-900 leading-none mb-1.5">{value}</span>
        {sub && (
          <span className={`text-[11.5px] font-medium ${
            subUp === true  ? 'text-success' :
            subUp === false ? 'text-danger'  : 'text-neutral-400'
          }`}>
            {sub}
          </span>
        )}
      </div>
      {href && <span className="text-neutral-300 text-[12px] self-center shrink-0 mt-1">→</span>}
    </div>
  )

  if (href) return <Link href={href} className="no-underline block">{inner}</Link>
  return inner
}
