const STORAGE_KEY = 'employeeName'

export function getEmployeeName(): string | undefined {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function setEmployeeName(name: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, name)
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — the name simply won't persist across reloads.
  }
}
