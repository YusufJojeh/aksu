# Localization

UI copy is resolved exclusively through i18next JSON catalogs. Patient names, phone numbers, custom diagnoses, treatment names, material names, and prices are never translated automatically.

The `<html>` language and direction update when the interface language changes. Arabic is RTL; current other locales are LTR. Numeric form controls retain readable numeric direction.

Document translations are a separate concern from UI translations. A locale becomes a release-ready document language only after a clinic-approved PDF with translated fixed artwork is added to `public/templates/` and listed in `availableLocalizedTemplates`. Missing artwork deliberately falls back to `en.pdf` and surfaces a warning.

Arabic dynamic text is shaped by the browser typography engine using the bundled Noto Sans Arabic font, then embedded into the PDF as a high-resolution transparent PNG. This preserves connected glyphs, bidi ordering, mixed-script text, and readable phone numbers. `@pdf-lib/fontkit` also embeds the Arabic font in the generated document.
