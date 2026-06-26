type Props = {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  sub?: string
  subUp?: boolean
}

export default function StatCard({ label, value, icon, iconBg, iconColor, sub, subUp }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-start gap-4 shadow-1">
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
    </div>
  )
}
