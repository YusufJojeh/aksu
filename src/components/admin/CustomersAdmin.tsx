import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clinicRegistry } from '../../clinics/registry'
import type { ClinicId } from '../../clinics/types'
import type { Locale } from '../../domain/report'
import { localeTags } from '../../lib/locale'
import {
  createCustomer,
  listCustomers,
  listReports,
  updateCustomer,
  type ArchivedReport,
  type Customer,
} from '../../lib/operations'
import { derivePatients } from '../../lib/patientDirectory'
import { Accordion, AccordionField, AccordionItem, Button, Input, ReadOnlyScope, Select } from '../ui'
import { errorText } from '../../i18n/errorText'

const CLINIC_IDS = Object.keys(clinicRegistry) as ClinicId[]

export function CustomersAdmin({ readOnly = false }: { readOnly?: boolean }) {
  const { t, i18n } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const tag = localeTags[(i18n.language in localeTags ? i18n.language : 'en') as Locale]
  const day = (value: string) => new Date(value).toLocaleDateString(tag, { dateStyle: 'medium' })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [query, setQuery] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState<string>()
  const [clinicId, setClinicId] = useState<ClinicId>(CLINIC_IDS[0] ?? 'aksu')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [notes, setNotes] = useState('')
  const load = () =>
    Promise.all([listCustomers(), listReports()])
      .then(([loadedCustomers, loadedReports]) => {
        setCustomers(loadedCustomers)
        setReports(loadedReports)
      })
      .catch(() => setError(t('admin.customers.loadError')))
      .finally(() => setLoaded(true))
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const mutate = (action: Promise<void>, failKey: 'updateFailed' | 'createFailed' = 'updateFailed') =>
    void action.then(load).catch((caught: unknown) => setError(errorText(caught, t, `admin.customers.${failKey}`)))
  const visible = customers.filter(
    (customer) =>
      (!query ||
        `${customer.full_name} ${customer.phone_e164 ?? ''} ${customer.patient_identifier ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!clinicFilter || customer.clinic_id === clinicFilter) &&
      (!statusFilter || customer.status === statusFilter),
  )
  const fromReports = derivePatients(reports, customers).filter(
    (patient) =>
      (!query ||
        `${patient.name} ${patient.phone} ${patient.identifier}`.toLowerCase().includes(query.toLowerCase())) &&
      (!clinicFilter || patient.clinics.includes(clinicFilter)) &&
      !statusFilter, // report patients are never archived, so an "archived" filter hides them
  )
  const create = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(undefined)
    // Keep the entries on failure so they can be corrected instead of retyped.
    try {
      await createCustomer({
        clinicId,
        fullName,
        phone: phone || undefined,
        patientIdentifier: identifier || undefined,
        notes: notes || undefined,
      })
      setFullName('')
      setPhone('')
      setIdentifier('')
      setNotes('')
      await load()
    } catch (caught) {
      setError(errorText(caught, t, 'admin.customers.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }
  const label = (column: string, customer: Customer) => `${t(`admin.customers.${column}`)} ${customer.full_name}`
  return (
    <main className="mx-auto max-w-[1400px] p-4 sm:p-7">
      <h1 className="text-2xl font-bold">{t('admin.customers.title')}</h1>
      {!readOnly && (
<form
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <label className="grid gap-1 text-sm">
          {t('admin.customers.clinicLabel')}
          <Select value={clinicId} onChange={(e) => setClinicId(e.target.value as ClinicId)}>
            {CLINIC_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`admin.clinic.${id}`)}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.customers.fullNameLabel')}
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.customers.phoneLabel')}
          <Input
            type="tel"
            inputMode="tel"
            placeholder="+905551112233"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.customers.identifierLabel')}
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.customers.notesLabel')}
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <Button type="submit" variant="primary" disabled={submitting} aria-busy={submitting}>
          {submitting ? t('admin.common.loading') : t('admin.customers.createSubmit')}
        </Button>
      </form>
)}
      <div className="mt-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          aria-label={t('admin.customers.searchLabel')}
          placeholder={t('admin.customers.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          className="max-w-xs"
          aria-label={t('admin.customers.clinicFilterLabel')}
          value={clinicFilter}
          onChange={(e) => setClinicFilter(e.target.value)}
        >
          <option value="">{t('admin.common.allClinics')}</option>
          {CLINIC_IDS.map((id) => (
            <option key={id} value={id}>
              {t(`admin.clinic.${id}`)}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-xs"
          aria-label={t('admin.customers.statusFilterLabel')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t('admin.common.allStatuses')}</option>
          <option value="active">{t('admin.status.active')}</option>
          <option value="archived">{t('admin.status.archived')}</option>
        </Select>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
      {!loaded && (
        <p role="status" className="mt-4 text-sm text-stone-600">
          {t('admin.common.loading')}
        </p>
      )}
      {loaded && fromReports.length > 0 && (
        <section className="mt-4 rounded-xl border bg-white" aria-label={t('admin.customers.fromReportsTitle')}>
          <h2 className="border-b px-4 py-3 font-bold">
            {t('admin.customers.fromReportsTitle')} <span className="text-stone-500">({fromReports.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-sm [&_td]:px-4 [&_td]:py-2 [&_th]:px-4 [&_th]:py-2">
              <thead>
                <tr className="border-b text-stone-600">
                  <th className="text-start">{t('admin.customers.colName')}</th>
                  <th className="text-start">{t('admin.customers.colPhone')}</th>
                  <th className="text-start">{t('admin.customers.colId')}</th>
                  <th className="text-start">{t('admin.customers.colClinic')}</th>
                  <th className="text-start">{t('admin.customers.colReports')}</th>
                  <th className="text-start">{t('admin.customers.colLastReport')}</th>
                </tr>
              </thead>
              <tbody>
                {fromReports.map((patient) => (
                  <tr key={patient.key} className="border-b last:border-b-0">
                    <td className="font-medium [overflow-wrap:anywhere]">{patient.name}</td>
                    <td dir="ltr" className="text-start">
                      {patient.phone}
                    </td>
                    <td>{patient.identifier}</td>
                    <td>{patient.clinics.map((id) => t(`admin.clinic.${id}`)).join(' · ')}</td>
                    <td>{patient.reportCount}</td>
                    <td>{day(patient.lastReportAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {loaded && visible.length === 0 && fromReports.length === 0 && (
        <p className="mt-4 rounded-xl border bg-white p-5 text-sm text-stone-600">
          {customers.length === 0 ? t('admin.customers.empty') : t('admin.common.noMatches')}
        </p>
      )}
<ReadOnlyScope readOnly={readOnly}>
      {visible.length > 0 && (
        <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-white md:block">
          <table className="w-full min-w-[1000px] text-start text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-3">
            <thead>
              <tr className="border-b text-stone-600">
                <th className="text-start">{t('admin.customers.colName')}</th>
                <th className="text-start">{t('admin.customers.colPhone')}</th>
                <th className="text-start">{t('admin.customers.colId')}</th>
                <th className="text-start">{t('admin.customers.colClinic')}</th>
                <th className="text-start">{t('admin.customers.colNotes')}</th>
                <th className="text-start">{t('admin.customers.colStatus')}</th>
                <th className="text-start">{t('admin.customers.colAdded')}</th>
                <th>
                  <span className="sr-only">{t('admin.employees.colActions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="font-medium">
                    <Input
                      aria-label={label('colName', customer)}
                      defaultValue={customer.full_name}
                      onBlur={(e) =>
                        e.target.value.trim() !== customer.full_name &&
                        mutate(updateCustomer(customer.id, { fullName: e.target.value.trim() }))
                      }
                    />
                  </td>
                  <td>
                    <Input
                      aria-label={label('colPhone', customer)}
                      type="tel"
                      defaultValue={customer.phone_e164 ?? ''}
                      onBlur={(e) =>
                        e.target.value.trim() !== (customer.phone_e164 ?? '') &&
                        mutate(updateCustomer(customer.id, { phone: e.target.value.trim() }))
                      }
                    />
                  </td>
                  <td>
                    <Input
                      aria-label={label('colId', customer)}
                      defaultValue={customer.patient_identifier ?? ''}
                      onBlur={(e) =>
                        e.target.value.trim() !== (customer.patient_identifier ?? '') &&
                        mutate(updateCustomer(customer.id, { patientIdentifier: e.target.value.trim() }))
                      }
                    />
                  </td>
                  <td>{t(`admin.clinic.${customer.clinic_id}`)}</td>
                  <td>
                    <Input
                      aria-label={label('colNotes', customer)}
                      defaultValue={customer.notes ?? ''}
                      onBlur={(e) =>
                        e.target.value.trim() !== (customer.notes ?? '') &&
                        mutate(updateCustomer(customer.id, { notes: e.target.value.trim() }))
                      }
                    />
                  </td>
                  <td>{t(`admin.status.${customer.status}`)}</td>
                  <td>{day(customer.created_at)}</td>
                  <td>
                    <Button
                      onClick={() =>
                        mutate(
                          updateCustomer(customer.id, { status: customer.status === 'active' ? 'archived' : 'active' }),
                        )
                      }
                    >
                      {customer.status === 'active' ? t('admin.customers.archive') : t('admin.customers.unarchive')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 md:hidden">
        <Accordion>
          {visible.map((customer) => (
            <AccordionItem
              key={customer.id}
              summary={
                <>
                  <span className="font-semibold [overflow-wrap:anywhere]">{customer.full_name}</span>
                  <span className="ms-2 text-xs text-stone-600">{t(`admin.status.${customer.status}`)}</span>
                </>
              }
            >
              <AccordionField label={t('admin.customers.colName')}>
                <Input
                  aria-label={label('colName', customer)}
                  defaultValue={customer.full_name}
                  onBlur={(e) =>
                    e.target.value.trim() !== customer.full_name &&
                    mutate(updateCustomer(customer.id, { fullName: e.target.value.trim() }))
                  }
                />
              </AccordionField>
              <AccordionField label={t('admin.customers.colPhone')}>
                <Input
                  aria-label={label('colPhone', customer)}
                  type="tel"
                  defaultValue={customer.phone_e164 ?? ''}
                  onBlur={(e) =>
                    e.target.value.trim() !== (customer.phone_e164 ?? '') &&
                    mutate(updateCustomer(customer.id, { phone: e.target.value.trim() }))
                  }
                />
              </AccordionField>
              <AccordionField label={t('admin.customers.colId')}>
                <Input
                  aria-label={label('colId', customer)}
                  defaultValue={customer.patient_identifier ?? ''}
                  onBlur={(e) =>
                    e.target.value.trim() !== (customer.patient_identifier ?? '') &&
                    mutate(updateCustomer(customer.id, { patientIdentifier: e.target.value.trim() }))
                  }
                />
              </AccordionField>
              <AccordionField label={t('admin.customers.colClinic')}>
                {t(`admin.clinic.${customer.clinic_id}`)}
              </AccordionField>
              <AccordionField label={t('admin.customers.colNotes')}>
                <Input
                  aria-label={label('colNotes', customer)}
                  defaultValue={customer.notes ?? ''}
                  onBlur={(e) =>
                    e.target.value.trim() !== (customer.notes ?? '') &&
                    mutate(updateCustomer(customer.id, { notes: e.target.value.trim() }))
                  }
                />
              </AccordionField>
              <AccordionField label={t('admin.customers.colAdded')}>{day(customer.created_at)}</AccordionField>
              <AccordionField label={t('admin.customers.colStatus')}>
                <Button
                  className="w-full"
                  onClick={() =>
                    mutate(
                      updateCustomer(customer.id, { status: customer.status === 'active' ? 'archived' : 'active' }),
                    )
                  }
                >
                  {customer.status === 'active' ? t('admin.customers.archive') : t('admin.customers.unarchive')}
                </Button>
              </AccordionField>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
</ReadOnlyScope>
    </main>
  )
}
