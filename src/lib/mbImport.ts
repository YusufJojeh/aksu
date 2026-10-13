export interface MbEmployeeEntry {
  name: string
  phone: string
}

export interface ExistingProfile {
  id: string
  full_name: string
  requested_phone_e164: string
  role: string
  status: string
  clinic_id: string | null
}

export type MbImportAction =
  /** A live profile already uses this phone: nothing is created, it is only locked to MB Dental. */
  | { kind: 'lock-existing'; entry: MbEmployeeEntry; profile: ExistingProfile }
  | { kind: 'create'; entry: MbEmployeeEntry }
  /** A live profile has the same name on another phone: skipped so a person is never created twice. */
  | { kind: 'review'; entry: MbEmployeeEntry; profile: ExistingProfile }

const LIVE_STATUSES = new Set(['pending', 'active'])

/** Case-, accent- and spacing-insensitive name key ("Hadyl  " === "HADYL"). */
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * Decides, per sheet entry, whether to create an employee, only lock an existing one to MB Dental, or hold it for
 * a human. Phone is the identity (it is the sign-in), so a live profile on the same phone is the same person;
 * admins are never touched. A live profile whose first name matches on a different phone is a possible duplicate
 * and is reported instead of created.
 */
export function planMbImport(entries: MbEmployeeEntry[], profiles: ExistingProfile[]): MbImportAction[] {
  const live = profiles.filter((profile) => LIVE_STATUSES.has(profile.status))
  const seenPhones = new Set<string>()
  const seenNames = new Set<string>()
  const actions: MbImportAction[] = []
  for (const entry of entries) {
    const key = nameKey(entry.name)
    if (seenPhones.has(entry.phone) || seenNames.has(key)) continue // repeated rows in the sheet itself
    seenPhones.add(entry.phone)
    seenNames.add(key)

    const samePhone = live.find((profile) => profile.requested_phone_e164 === entry.phone)
    if (samePhone) {
      actions.push(
        samePhone.role === 'ADMIN'
          ? { kind: 'review', entry, profile: samePhone }
          : { kind: 'lock-existing', entry, profile: samePhone },
      )
      continue
    }
    const sameName = live.find(
      (profile) => profile.role !== 'ADMIN' && nameKey(profile.full_name).split(' ')[0] === key.split(' ')[0],
    )
    actions.push(sameName ? { kind: 'review', entry, profile: sameName } : { kind: 'create', entry })
  }
  return actions
}
