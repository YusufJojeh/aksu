import type { PDFFont } from 'pdf-lib'
import type { FieldBox } from './profiles/shared/fieldBox'

export interface FittedText { text: string; fontSize: number; width: number }

export function fitTextToBox(text: string, font: Pick<PDFFont, 'widthOfTextAtSize'>, box: FieldBox, truncate = true): FittedText {
  let fontSize = box.fontSize
  const minimum = box.minFontSize ?? 6
  while (fontSize > minimum && font.widthOfTextAtSize(text, fontSize) > box.width) fontSize -= 0.5
  if (font.widthOfTextAtSize(text, fontSize) <= box.width || !truncate) return { text, fontSize, width: font.widthOfTextAtSize(text, fontSize) }
  let fitted = text
  while (fitted.length > 1 && font.widthOfTextAtSize(`${fitted}…`, fontSize) > box.width) fitted = fitted.slice(0, -1)
  fitted = `${fitted.trimEnd()}…`
  return { text: fitted, fontSize, width: font.widthOfTextAtSize(fitted, fontSize) }
}
