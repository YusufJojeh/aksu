# MB Dental Turkey — Bilingual Clinic Website

**Live client-review URL:** https://mb-dental-turkey.vercel.app

**Source:** `YusufJojeh/aksu` → `clinic-showcases-oct-2026` → `sites/mb-dental-turkey`

**Lovable foundation:** project a121d0b9-3c2e-43c5-b17b-d3883284eb83; original textual styling, content and logo source are preserved in `/lovable-reference/`. The launchable version was rebuilt as an independent static website and uses a vector brandmark adapted from the original Lovable SVG. Original generated photographic binaries were not ported; the website references editorial stock photography rather than representing it as photos of the clinic or its patients.

## Site coverage

- English and Arabic; language-aware navigation and right-to-left layout
- Home, treatment catalog, dental implants, zirconium crowns, E-max veneers, whitening, general dental care
- Patient journey, contact, privacy, and downloadable vector brandmark at `/logo.svg`
- Sticky mobile booking CTA, mobile navigation, FAQ disclosures, reduced-motion preferences
- WhatsApp inquiry form with name and phone validation, consent check, selected treatment and campaign attribution (`utm_*`, `gclid`, `fbclid`)
- Official clinic contact details and service categories; no invented medical outcomes, certification claims, or patient testimonials

## Verification

- Production Git-sourced deployment on Vercel was observed in the `READY` state.
- Client-side rendering validated for 20 localized paths (10 in English, 10 in Arabic), plus the brand guide, with a JavaScript DOM stub.
- **Not verified in a graphical browser:** actual mobile layout, external image loading, end-to-end WhatsApp submission, Core Web Vitals, and Lighthouse performance.
- This review release uses `noindex` and a restrictive `robots.txt`; remove after permission to publish publicly as an official clinic site.

## Maintenance

Source is currently on a feature branch, not the original repository's `main`, because the repository contains an existing unrelated application. Production was deployed explicitly from that branch to protect existing code. The Vercel projects are Git-linked, but new feature-branch pushes require production promotion or a change to the production branch setting. No unrelated source was modified.

## Patient privacy

Form data is compiled into a WhatsApp message in the browser; it is not posted to a database. Ad referral details are held in session storage. Actual clinic ownership, photos, clinical results and credentials require the provider's approval before public promotion.
