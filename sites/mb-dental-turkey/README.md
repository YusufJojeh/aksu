# MB Dental Turkey — Medical Tourism Landing Page

**Published client-review site:** https://mb-dental-turkey.vercel.app

**Source:** `YusufJojeh/aksu` → `clinic-showcases-oct-2026` → this directory.

A bilingual, single-page lead-generation landing for international dental tourism in Istanbul, redesigned using guidance from **nextlevelbuilder/ui-ux-pro-max-skill** (landing funnels, hierarchy, touch targets, reduced-motion accessibility, legible typography). Separate identity systems: Swiss/clinical for Dr. Emir Aksu, and warm/editorial travel for MB Dental Turkey.

## Conversion journey

Paid traffic arrives on `/en` or `/ar`, chooses one of five treatments, compares treatment/travel quotation paths, reviews a four-step journey and FAQ, then requests an **itemized price on WhatsApp**. The form collects intended service, quantity, currency, country, month, package option, contact and consent. Campaign parameters are forwarded as text in the prepared WhatsApp message.

Pricing is intentionally individualized because no official fixed clinic tariff was verified. Do not misrepresent quote options as confirmed inclusions. The sites carry `noindex,nofollow` and `robots.txt` exclusion while awaiting clinic approval.

## Source and testing

- `index.html`: SEO shell and existing verified service data
- `landing.js`: bilingual one-page funnel and behavior
- `landing.css`: differentiated design systems, responsive styles and reduced motion
- `logo.svg`: original Lovable-inspired vector mark
- `tests.mjs`: Node VM checks for localized structure, sections, quote form and WhatsApp deep link

Run `node tests.mjs`.

The project is deployed directly from feature branch `clinic-showcases-oct-2026` to a Git-linked Vercel project; default repository `main` remains untouched. Automatic production deployment from feature-branch pushes is not yet configured.

**Limits:** No verified clinic price list, no fabricated treatment results or testimonials. Desktop/mobile browser rendering, real WhatsApp delivery and Lighthouse performance should be checked separately before campaign launch.
