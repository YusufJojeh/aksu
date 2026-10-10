import type { Json } from './database.types'

/**
 * Narrows a generated row to its domain type. Generated rows type CHECK-constrained text as `string`
 * and jsonb as `Json`; domain types narrow those. Compilation fails if the domain type names a
 * column the row does not have, so schema drift surfaces after `node scripts/gen-db-types.mjs`.
 */
export function fromRow<Domain>(row: { [K in keyof Domain]-?: unknown }): Domain {
  return row as unknown as Domain
}

/** Our jsonb payloads are plain data; the generated `Json` type cannot express interfaces. */
export function toJson(value: object): Json {
  return value as unknown as Json
}
