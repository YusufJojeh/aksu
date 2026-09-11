import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { clsx } from 'clsx'

const cn = (...values: Array<string | false | null | undefined>) => clsx(values)

const buttonVariants = {
  primary: 'bg-ink text-white hover:bg-stone-700',
  outline: 'border border-stone-300 bg-white text-ink hover:bg-stone-100',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  icon: 'bg-white text-ink shadow-sm hover:bg-stone-100',
} as const

const buttonSizes = {
  default: 'min-h-10 px-4',
  icon: 'size-9 min-h-9 p-0',
} as const

export function Button({ className, type = 'button', variant = 'outline', size = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes }) {
  return <button type={type} className={cn('inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50', buttonVariants[variant], buttonSizes[size], className)} {...props} />
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-stone-400 focus:border-gold focus:ring-2 focus:ring-gold/20', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/20', className)} {...props} />
}

export function Checkbox({ label, className, ...props }: { label?: React.ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <label className={cn('inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm', className)}>
    <span className="relative inline-flex size-5 shrink-0">
      <input type="checkbox" className="peer sr-only" {...props} />
      <span aria-hidden className="absolute inset-0 rounded-md border-2 border-stone-300 bg-white transition peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2" />
      <Check aria-hidden size={13} strokeWidth={3} className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 transition peer-checked:opacity-100" />
    </span>
    {label}
  </label>
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('grid gap-1.5 text-sm font-medium text-stone-700', className)}><span>{label}</span>{children}{error && <span className="text-xs font-medium text-red-700">{error}</span>}</label>
}

export const Tabs = TabsPrimitive.Root
export const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => <TabsPrimitive.List className={cn('grid grid-cols-2 rounded-lg bg-stone-200 p-1', className)} {...props} />
export const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => <TabsPrimitive.Trigger className={cn('rounded-md px-3 py-2 text-sm font-semibold text-stone-600 data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm', className)} {...props} />

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, cancelLabel, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; body: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void }) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl focus:outline-none">
        <DialogPrimitive.Title className="text-lg font-bold text-ink">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-stone-600">{body}</DialogPrimitive.Description>
        <div className="mt-6 flex justify-end gap-2">
          <DialogPrimitive.Close asChild><Button variant="outline">{cancelLabel}</Button></DialogPrimitive.Close>
          <Button variant="danger" onClick={() => { onConfirm(); onOpenChange(false) }}>{confirmLabel}</Button>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
