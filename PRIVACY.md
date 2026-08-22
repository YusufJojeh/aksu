# Privacy

Patient information remains in browser memory and is not persisted by default. The application has no backend, analytics, error-reporting SDK, translation service, database, or authentication service.

Report data is never placed in query strings, URLs, remote logs, or network payloads. Fetches are limited to same-origin static PDF templates, fonts, JavaScript, and CSS. Blob URLs are local opaque handles and obsolete preview URLs are revoked.

Downloads exclude phone numbers from filenames. Production code does not log `ReportData`. Reset and clear actions remove in-memory patient values after confirmation. Closing or refreshing the tab discards unsaved data.
