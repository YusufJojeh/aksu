import type { LucideIcon } from "lucide-react"

const accents = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
} as const

/** Labels each band of the dashboard so the page reads top-down: overview → trends → people → patterns. */
export function SectionHeading({ icon: Icon, accent, children }: { icon: LucideIcon; accent: keyof typeof accents; children: string }) {
  return (
    <h2 className="flex items-center gap-2.5 pt-2 text-base font-semibold">
      <span className={`grid size-7 place-items-center rounded-md ${accents[accent]}`}><Icon className="size-4" aria-hidden /></span>
      {children}
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent rtl:bg-gradient-to-l" aria-hidden />
    </h2>
  )
}
