import { describe, expect, it } from 'vitest'
import en from '../../src/i18n/locales/en.json'
import ar from '../../src/i18n/locales/ar.json'
import de from '../../src/i18n/locales/de.json'
import es from '../../src/i18n/locales/es.json'
import fr from '../../src/i18n/locales/fr.json'
import itLocale from '../../src/i18n/locales/it.json'
import pl from '../../src/i18n/locales/pl.json'
import ru from '../../src/i18n/locales/ru.json'
import tr from '../../src/i18n/locales/tr.json'

type Tree = { [key: string]: string | Tree }
const flatten = (tree: Tree, prefix = ''): string[] => Object.entries(tree).flatMap(([key, value]) =>
  typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`])

// i18next plural suffixes differ per language (ar has _zero/_two/_few/_many), so compare the base key.
const base = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '')
// `document.*` holds strings printed inside the PDF artwork, which only exists for each clinic's
// supported document locales; it is not interface copy.
const interfaceKeys = (tree: Tree) => new Set(flatten(tree).filter((key) => !key.startsWith('document.')).map(base))

describe('interface locale parity', () => {
  const english = interfaceKeys(en as Tree)
  const locales = { ar, de, es, fr, it: itLocale, pl, ru, tr } as Record<string, Tree>
  for (const [code, tree] of Object.entries(locales)) {
    it(`${code} translates every interface key in en.json`, () => {
      const keys = interfaceKeys(tree)
      expect([...english].filter((key) => !keys.has(key))).toEqual([])
    })
  }
})
