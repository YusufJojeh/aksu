import type { MbConditionKey, MbRecommendedTreatmentKey } from '../../../domain/report'

/**
 * One checkbox square exactly as the template artwork draws it, in pdf-lib user space
 * (`user_y = mediaBox.y + mediaBox.height - renderedY`). Every value in the locale profiles is
 * measured, never derived from an assumed row pitch: run
 * `python scripts/measure_mb_checkboxes.py public/templates/mb-dental/<locale>.pdf` to reproduce
 * them. The real artwork's rows are NOT evenly spaced — the English/German squares drift by up to
 * 3.2pt from a nominal 30pt pitch — so a uniform pitch puts marks visibly off-centre.
 */
export interface CheckboxBox {
  centerX: number
  centerY: number
  width: number
  height: number
}

/** `centers` lists one square per printed row, top of the panel first. */
export function checkboxColumn<Key extends string>(
  keys: readonly Key[],
  centerX: number,
  centers: readonly (readonly [number, number, number])[],
): Record<Key, CheckboxBox> {
  if (keys.length !== centers.length) {
    throw new Error(`MB checkbox column needs one measured square per key (${keys.length} keys, ${centers.length} squares)`)
  }
  const column = {} as Record<Key, CheckboxBox>
  keys.forEach((key, index) => {
    const [centerY, width, height] = centers[index]!
    column[key] = { centerX, centerY, width, height }
  })
  return column
}

/**
 * Every MB template prints the same eight conditions in the same order, top to bottom.
 */
export const mbConditionRowOrder: readonly MbConditionKey[] = [
  'missingTeeth', 'looseTeeth', 'gumInfectionOrDisease', 'crowdedOrCrookedTeeth',
  'toothDecayOrBrokenTeeth', 'teethGrindingOrClenching', 'biteOrJawProblems', 'aestheticToothDefects',
]

/**
 * Recommended-treatment rows differ between artworks and each locale therefore declares its own
 * printed order. English/German/Arabic print eight rows starting at "Dental Implants" and have no
 * extraction row at all; the French artwork prints "Extraction partielle/totale" first and has no
 * fillings row (verified by rendering each template's page 2, not by translating the key names).
 * A key with no square here is never drawn — silently marking a neighbouring row is worse than
 * marking nothing.
 */
export const mbRecommendedRowOrderLatin: readonly MbRecommendedTreatmentKey[] = [
  'dentalImplants', 'dentalFillings', 'zirconiaCrowns', 'emaxVeneers',
  'boneGrafting', 'sinusLift', 'deepCleaning', 'rootCanalTreatment',
]

export const mbRecommendedRowOrderFrench: readonly MbRecommendedTreatmentKey[] = [
  'dentalExtractions', 'dentalImplants', 'zirconiaCrowns', 'emaxVeneers',
  'boneGrafting', 'sinusLift', 'deepCleaning', 'rootCanalTreatment',
]
