export function normalizePhone(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!hasPlus || digits.length < 7 || digits.length > 15 || digits.startsWith('0')) return undefined
  return `+${digits}`
}
