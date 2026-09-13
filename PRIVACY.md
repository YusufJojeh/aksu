# Privacy and data handling

Draft report data stays in browser memory and is not automatically persisted. Finalization intentionally sends the report snapshot and generated PDF to Supabase so authorized staff can retrieve an exact historical record.

- Report PDFs are stored in a private bucket; access is limited to the originating active employee or an active administrator.
- Reports and their employee/communication-number snapshots are immutable.
- Download events are recorded. Filenames exclude phone numbers.
- Sales staff can see only their own reports. Administrators can see organization-wide operational data.
- Suspended and former employees lose application, report, and storage access; their historical records remain intact.
- The service-role key is used only in the server-side invitation endpoint (`api/admin/invite-employee.ts`) and is never included in the browser bundle.
- Patient data is not placed in URLs or console logs. Blob preview URLs are revoked.

Local session tokens follow Supabase's browser session model. A restrictive CSP, output escaping through React, short authorization paths, RLS, and RPC-side validation reduce browser and API trust exposure.
