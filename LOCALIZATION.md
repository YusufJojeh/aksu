# Localization

UI copy is resolved exclusively through i18next JSON catalogs. Patient names, phone numbers, custom diagnoses, treatment names, material names, and prices are never translated automatically.

The `<html>` language and direction update when the interface language changes. Arabic is RTL; current other locales are LTR. Numeric form controls retain readable numeric direction.

Document translations are separate from UI translations. English and Arabic have approved templates; Arabic loads `public/templates/ar.pdf` directly and uses its own measured RTL coordinate map. Other document locales deliberately fall back to English and surface a warning. Selecting Arabic defaults the document currency to EUR but does not change the interface language.

Arabic dynamic text is shaped by the browser typography engine using the bundled Noto Sans Arabic font, then embedded into the PDF as a high-resolution transparent PNG for connected glyphs, bidi ordering, mixed-script text, and readable phone numbers. The original five-page artwork remains vector/text/image PDF content. A transparent embedded-font text layer makes newly entered values inspectable while the sanitized template guarantees no stale patient layer exists.

Arabic EUR document values are formatted as `100 يورو`, and included services as `مجاني`. Arabic keeps the source discount label and second-visit heading as static artwork and therefore does not request or render a discount-expiry sentence.
