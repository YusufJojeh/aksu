import { box } from '../shared/fieldBox'
import { enConditionColumn, enRecommendedColumn } from './en'
import { mbLatinCellSizes, mbTableRows } from './table'
import type { MbPdfCoordinates } from './types'

// Calibrated against the supplied Spanish template (`_  SPANISH MB report (1).pdf`), measured the
// same way as en.ts/de.ts: text-object positions for the cover labels, the artwork's own gold
// checkbox outlines (scripts/measure_mb_checkboxes.py) for page 2, and the printed gridlines for
// page 3. Three measurements pin this locale to the artwork rather than to an assumption:
//  - Page 2's squares are identical to en.pdf/de.pdf to the last 0.01pt, and the printed rows are
//    the same eight conditions and the same eight recommended treatments in the same order
//    (Implantes dentales / empastes dentales / coronas de zirconio / carillas E.max / injertos
//    óseos / elevación de seno maxilar / limpieza profunda / tratamiento de conducto radicular),
//    so this locale reuses the English columns verbatim instead of re-stating them.
//  - Page 3's gridlines are identical to de.pdf (not en.pdf): the third divider sits at x=401.4,
//    where English puts it at x=378.9. The German row edges therefore apply unchanged.
//  - Like the German artwork, the printed header row is mistranslated/reordered relative to
//    English: it reads Tratamiento | Cantidad (Quantity) | precio del material | unitario | Total,
//    swapping the labels of columns 2 and 3. Static clinic artwork is immutable, so the labels stay
//    as supplied and the dynamic values target the same PHYSICAL columns as every other locale
//    (col 2 = quality/material, col 3 = quantity) — what each column visually holds, not what its
//    label happens to say. See de.ts for the identical note.
//
// Cover values are drawn on the line BELOW their label, not to the right of it as in en/de/fr.
// That is forced by the artwork, not a redesign: the cover photo's left edge sits at x≈297, and
// Spanish prints the two longest labels of any locale — "IDENTIFICADOR DEL PACIENTE" ends at
// x=268.5 and "NOMBRE DEL PACIENTE" at x=228.9, leaving 21pt and 61pt of usable width inline.
// A patient ID shrunk into 21pt is unreadable, which §10/§27 treat as a release blocker, so every
// value takes the empty full-width line beneath its own label (measured clear: nothing else prints
// between a label and the next one down, and the lowest value box still clears the "Gracias por su
// confianza" script at y=105.8). All five fields move together so the column reads consistently.
// This template's MediaBox starts at y=7.83 (not 0), and pdf-lib draws in raw PDF user space, so
// row edges measured from the rendered page are shifted by that origin.
const MEDIA_BOX_Y = 7.83
const pdfRowEdges = (edges: number[]) => edges.map((y) => y + MEDIA_BOX_Y)
const firstVisitColumns = {
  treatment: [28.1, 230.1], quality: [230.1, 327.9], quantity: [327.9, 401.4], unitPrice: [401.4, 476.4], total: [476.4, 565.4],
} as const
const secondVisitColumns = {
  treatment: [22.1, 224.1], quality: [224.1, 321.9], quantity: [321.9, 402.0], unitPrice: [402.0, 470.5], total: [470.5, 559.5],
} as const

export const esMbPdfCoordinates: MbPdfCoordinates = {
  cover: {
    patientName: box(88, 376, 202, 19, 13),
    reportDate: box(89, 310, 201, 19, 13),
    age: box(87.5, 239, 202.5, 19, 13),
    patientId: box(83.7, 179, 206.3, 19, 13),
    phone: box(87.5, 117, 202.5, 19, 13),
  },
  oralHealth: {
    currentCondition: enConditionColumn,
    recommendedTreatments: enRecommendedColumn,
  },
  treatmentPlan: {
    // Same physical gold TOTAL pill as en.ts/de.ts (identical base artwork): x=307.1-564.8,
    // y=432.2-478.6 (first visit) / x=301.0-559.1, y=111.8-158.3 (second visit). See en.ts.
    firstVisit: { rows: mbTableRows(firstVisitColumns, pdfRowEdges([655.5, 628.0, 601.0, 573.8, 546.8, 519.7, 484.5]), mbLatinCellSizes), total: box(317, 437, 238, 36, 26, 'center', undefined, 18) },
    secondVisit: { rows: mbTableRows(secondVisitColumns, pdfRowEdges([335.0, 307.5, 280.5, 253.3, 226.3, 199.2, 164.0]), mbLatinCellSizes), total: box(311, 117, 238, 36, 26, 'center', undefined, 18) },
  },
}
