import type { AnalyticsResponse } from '../../lib/adminApi'

function DailyTrend({ byDay }: { byDay: AnalyticsResponse['byDay'] }) {
  if (byDay.length === 0) return <p className="text-sm text-stone-500">No activity yet.</p>
  const max = Math.max(...byDay.map((day) => day.count), 1)
  return <div className="flex h-24 items-end gap-1">
    {byDay.map((day) => <div key={day.day} className="group relative flex-1">
      <div
        className="rounded-t bg-gold/70 transition group-hover:bg-gold"
        style={{ height: `${(day.count / max) * 100}%`, minHeight: day.count > 0 ? 4 : 0 }}
      />
      <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block">
        {day.count}
      </span>
    </div>)}
  </div>
}

export function AnalyticsPanel({ analytics }: { analytics: AnalyticsResponse | undefined }) {
  if (!analytics) return null

  return <div className="grid gap-4 sm:grid-cols-3">
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total reports</p>
      <p className="mt-1 text-3xl font-bold">{analytics.total}</p>
    </div>
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">By clinic</p>
      <ul className="mt-2 space-y-1 text-sm">
        {analytics.byClinic.map((row) => <li key={row.clinic_id} className="flex justify-between">
          <span>{row.clinic_id}</span><span className="font-semibold">{row.count}</span>
        </li>)}
        {analytics.byClinic.length === 0 && <li className="text-stone-500">No data yet.</li>}
      </ul>
    </div>
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Top employees</p>
      <ul className="mt-2 space-y-1 text-sm">
        {analytics.byEmployee.slice(0, 5).map((row) => <li key={row.employee_name} className="flex justify-between">
          <span>{row.employee_name}</span><span className="font-semibold">{row.count}</span>
        </li>)}
        {analytics.byEmployee.length === 0 && <li className="text-stone-500">No data yet.</li>}
      </ul>
    </div>
    <div className="rounded-xl border border-stone-200 bg-white p-5 sm:col-span-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Last 90 days</p>
      <DailyTrend byDay={analytics.byDay} />
    </div>
  </div>
}
