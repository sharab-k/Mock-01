import { ScrollText } from 'lucide-react'
import RulesManager from '@/components/dashboard/rules/RulesManager'
import { fetchAllRules } from '@/lib/rules/data'

export default async function RulesPage() {
  const rules = await fetchAllRules()
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><ScrollText size={18} className="text-ink-600" /></div>
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Rules and regulations</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Upload the academy’s rules as pictures and publish them for parents. Changes show in the parent portal as soon as they are published.</p>
        </div>
      </div>
      <RulesManager rules={rules} />
    </>
  )
}
