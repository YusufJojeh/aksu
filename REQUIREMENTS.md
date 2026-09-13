# Requirements

## Product flow

Authenticated sales employees choose a clinic, enter patient and treatment data, review a live five-page preview, and finalize a report. Finalization archives the exact PDF and immutable snapshot before download. Administrators manage staff, communication-number ownership, reports, and analytics.

## Functional rules

- A4 portrait, five pages, based on clinic-supplied artwork.
- Aksu and MB data, capabilities, locale routing, templates, and coordinates stay isolated.
- Included or disabled rows contribute zero; totals use integer minor units with no conversion.
- MB requires Patient ID, supports six rows and EN/FR/DE/AR, and has no discount.
- Interface and document languages are independent; Arabic switches direction without reload.
- Every account starts `SALES/pending`; only active accounts can use operational data.
- A communication number has at most one active owner, and an employee at most one active number.
- Reassignment and offboarding preserve historical report snapshots.
- Finalized reports cannot be edited or deleted; edits create a new report linked to its parent.
- Reset and clear actions require accessible confirmation.

## Security rules

Authorization is enforced in PostgreSQL RLS and privileged RPCs, not only in the UI. Production has no authentication bypass. Private PDFs are readable only through report-linked storage policies. Service-role credentials remain server-side.

## Non-goals

Arbitrary table overflow, currency conversion, public PDF links, destructive report editing, and automatic draft persistence are excluded.
