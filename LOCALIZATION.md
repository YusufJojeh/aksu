# Localization

UI copy is resolved exclusively through i18next JSON catalogs. Patient names, phone numbers, custom diagnoses, treatment names, material names, and prices are never translated automatically. This applies identically to both clinics; the interface catalog is shared app-wide and not scoped per clinic.

The `<html>` language and direction update when the interface language changes. Arabic is RTL; current other locales are LTR. Numeric form controls retain readable numeric direction.

## Document (template) locales are scoped per clinic

Document translations are separate from UI translations, and — unlike the interface language — document-locale support differs by clinic:

- **Dr. Emir Aksu** supports all 9 interface locales as document locales. English and Arabic have approved templates; Arabic loads `public/templates/aksu/ar.pdf` directly and uses its own measured RTL coordinate map (`src/pdf/profiles/aksu/ar.ts`) and does not fall back to English. The other 7 locales deliberately fall back to the English artwork and surface a visible warning. Selecting Arabic defaults the document currency to EUR but does not change the interface language.
- **MB Dental** supports exactly 4 document locales — English, French, German, Arabic — matching its 4 supplied template PDFs under `public/templates/mb-dental/`. There is **no fallback locale**: selecting (or generating for) any other locale throws rather than silently substituting another clinic's or another locale's artwork. This is enforced in `src/pdf/profiles/mb/index.ts`'s `resolveMbTemplate`.

Template identity is always the pair `(clinicId, locale)`, never locale alone — `src/pdf/profiles/resolve.ts` and `src/pdf/templateCache.ts` key resolution and caching by both, so `aksu/en` and `mb-dental/en` can never collide or be confused with each other even though both clinics offer an "en" document locale.

Arabic dynamic text is shaped by the browser typography engine using the bundled Noto Sans Arabic font, then embedded into the PDF as a high-resolution transparent PNG for connected glyphs, bidi ordering, mixed-script text, and readable phone numbers. The original five-page artwork remains vector/text/image PDF content. A transparent embedded-font text layer makes newly entered values inspectable while the sanitized template guarantees no stale patient layer exists. MB Dental's Arabic template reuses this exact technique, including the same descending-x RTL treatment-row ordering already proven for Aksu Arabic.

Arabic EUR document values are formatted as `100 يورو`, and included services as `مجاني`. Aksu Arabic keeps the source discount label and second-visit heading as static artwork and therefore does not request or render a discount-expiry sentence — MB Dental has no discount concept at all for any locale, so this does not apply to it.

## MB Dental's German template anomaly

The German MB Dental template's treatment-table header labels are mistranslated and reordered relative to the English/French artwork (confirmed by direct visual inspection). Per the rule that supplied clinic artwork is never "corrected," the static header text is left exactly as supplied; the German coordinate module (`src/pdf/profiles/mb/de.ts`) instead targets the same physical column positions as the English/French templates so dynamic values still land in the semantically correct column despite the mislabeled header. See `PDF_FIELD_MAP.md` for details.
