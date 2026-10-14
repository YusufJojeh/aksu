import { FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listReportReviews, type ArchivedReport } from '../../lib/operations'
import { saveBlob } from '../../lib/download'
import { reportsToXlsx } from '../../lib/reportsExport'
import { Button } from '../ui'

/** Exports the given reports (plus their review decisions) as an .xlsx file. Shown to admins and team leads only. */
export function ExportReportsButton({ reports }: { reports: ArchivedReport[] }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const run = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const blob = await reportsToXlsx(reports, await listReportReviews())
      saveBlob(blob, `reports-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <span>
      <Button disabled={busy || reports.length === 0} onClick={() => void run()}>
        {busy ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" /> : <FileSpreadsheet size={15} />}
        {t('admin.export.button', { count: reports.length })}
      </Button>
      {failed && (
        <span role="alert" className="ms-2 text-xs text-red-700">
          {t('admin.export.failed')}
        </span>
      )}
    </span>
  )
}
