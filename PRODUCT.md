# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Sales staff (primary).** Clinic sales employees who turn a patient conversation into a priced treatment plan. They work both at a desk or laptop in the clinic and on a phone while on the move, often straight after a chat with the patient. They are not tech-savvy, so every flow must be hard to get wrong.
- **Administrators.** Clinic management who create and offboard staff accounts, assign communication numbers, browse the report archive, and read per-employee KPIs and alerts.
- **Patients (indirect).** Mostly international patients who receive the finished PDF. They never use the app.

## Product Purpose

Sales staff produce a clinic-branded, five-page A4 treatment plan PDF in the patient's language within minutes. They can also produce an MB Dental warranty certificate or a medical invitation letter. Each finalized PDF does two jobs:

- **For the patient:** the sales document they use to decide on treatment.
- **For the clinic:** the binding quote record. The exact bytes and an immutable data snapshot are archived.

Success means:

- a correct, on-brand PDF with accurate totals;
- the PDF goes out fast;
- every version can be traced and downloaded again later.

## Positioning

PDFs are not generic. The app fills each clinic's own supplied artwork at measured coordinates. Arabic is shaped correctly in right-to-left order. Every PDF is archived as an immutable record that edits branch from, never overwrite. Administrators can audit the output of each salesperson.

## Operating Context

- **Clinics:** Dr. Emir Aksu (Aksu Dental) and MB Dental Turkey.
- **Languages:**
  - Interface and document languages are chosen independently.
  - The interface ships en, ar, de, es, fr, it, pl, ru and tr.
  - MB documents support en, fr, de and ar only.
- **Sign-in:** sales staff sign in with their phone number only; there is no OTP. Admins sign in at `/admin`.
- **Report flow:** the live preview is generated in the browser. Finalize archives the PDF and then downloads it. "Edit" creates a new linked copy. My Reports shows the version history, a log of creations, edits and downloads, and filters for duplicates.
- **Tooling:** the app is hosted on Vercel and uses Supabase for auth, Postgres row-level security and private storage.

## Capabilities and Constraints

- **The PDF artwork is fixed.** Clinic-supplied templates are filled, never redesigned. Pages, artwork and static content stay intact.
- **Arabic RTL is first-class.** Arabic speakers are a major audience, so RTL in both the interface and the PDF must be as polished as English.
- **The two brands are kept apart.** Aksu and MB Dental data, templates, capabilities and visuals must never mix.
- **Clinic rules:**
  - Aksu has seven treatment rows and supports discounts.
  - MB requires a Patient ID, has six rows per visit, and has no discount.
- **Totals** use integer minor units. There is no currency conversion. Included or disabled rows count as zero.
- **Finalized reports and documents are immutable.** Reset and clear actions require confirmation.
- **Non-goals:** table overflow beyond the template's rows, public PDF links, destructive editing, and automatic saving of drafts.
- See `REQUIREMENTS.md`, `PRIVACY.md`, `LOCALIZATION.md` and `PDF_FIELD_MAP.md`.

## Brand Commitments

- The clinic names, logos and supplied PDF templates (`public/templates/`) are binding.
- The app interface is a neutral operations tool and does not compete with clinic branding.

## Evidence on Hand

- Real clinic templates and the reference reports that coordinates were measured from: `public/templates/`, `SERGIO ALMEIDO.pdf` and the Arabic reference report, as described in `README.md`.
- Visual-regression goldens: `tests/e2e/*-snapshots/`.
- There are no testimonials, metrics or case studies. Do not invent them.

## Product Principles

1. **Foolproof over flexible.** Assume a hurried, non-technical user on a phone. Prevent mistakes rather than explain them.
2. **The PDF is the product.** The interface exists to fill the clinic's artwork correctly. It must never alter that artwork.
3. **The record is sacred.** What was sent to a patient can always be retrieved exactly, and history is never rewritten.
4. **Every language is equal.** Arabic RTL and the other locales get the same care as English.
5. **Brands stay separate.** Each clinic's identity appears only in its own workspace and documents.

## Accessibility & Inclusion

- Staff are non-technical and often on phones. That means large touch targets, clear labels (never placeholder-only), and errors shown next to the field they belong to.
- RTL layout must be correct throughout.
- No formal standard has been confirmed. Default to WCAG 2.2 AA.
