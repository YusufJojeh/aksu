import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clinicRegistry } from '../../clinics/registry'
import type { ClinicId } from '../../clinics/types'
import { createCustomer, listCustomers, updateCustomer, type Customer } from '../../lib/operations'
import { Accordion, AccordionField, AccordionItem, Button, Input, Select } from '../ui'

const CLINIC_IDS = Object.keys(clinicRegistry) as ClinicId[]

export function CustomersAdmin() {
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<Customer[]>([]); const [query, setQuery] = useState(''); const [clinicFilter, setClinicFilter] = useState(''); const [statusFilter, setStatusFilter] = useState(''); const [error, setError] = useState<string>()
  const [clinicId, setClinicId] = useState<ClinicId>(CLINIC_IDS[0] ?? 'aksu'); const [fullName, setFullName] = useState(''); const [phone, setPhone] = useState(''); const [identifier, setIdentifier] = useState(''); const [notes, setNotes] = useState('')
  const load = () => listCustomers().then(setCustomers).catch(() => setError(t('admin.customers.loadError')))
  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const mutate = (action: Promise<void>, failKey: 'updateFailed' | 'createFailed' = 'updateFailed') => void action.then(load).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : t(`admin.customers.${failKey}`)))
  const visible = customers.filter((customer) =>
    (!query || `${customer.full_name} ${customer.phone_e164 ?? ''} ${customer.patient_identifier ?? ''}`.toLowerCase().includes(query.toLowerCase())) &&
    (!clinicFilter || customer.clinic_id === clinicFilter) &&
    (!statusFilter || customer.status === statusFilter))
  return <main className="mx-auto max-w-[1400px] p-4 sm:p-7">
    <h1 className="text-2xl font-bold">{t('admin.customers.title')}</h1>
    <form className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4" onSubmit={(event) => {
      event.preventDefault()
      mutate(createCustomer({ clinicId, fullName, phone: phone || undefined, patientIdentifier: identifier || undefined, notes: notes || undefined }), 'createFailed')
      setFullName(''); setPhone(''); setIdentifier(''); setNotes('')
    }}>
      <label className="grid gap-1 text-sm">{t('admin.customers.clinicLabel')}<Select value={clinicId} onChange={(e) => setClinicId(e.target.value as ClinicId)}>{CLINIC_IDS.map((id) => <option key={id} value={id}>{t(`admin.clinic.${id}`)}</option>)}</Select></label>
      <label className="grid gap-1 text-sm">{t('admin.customers.fullNameLabel')}<Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">{t('admin.customers.phoneLabel')}<Input placeholder="+905551112233" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">{t('admin.customers.identifierLabel')}<Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">{t('admin.customers.notesLabel')}<Input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <Button type="submit" variant="primary">{t('admin.customers.createSubmit')}</Button>
    </form>
    <div className="mt-4 flex flex-wrap gap-3">
      <Input className="max-w-xs" aria-label={t('admin.customers.searchLabel')} placeholder={t('admin.customers.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <Select className="max-w-xs" aria-label={t('admin.customers.clinicFilterLabel')} value={clinicFilter} onChange={(e) => setClinicFilter(e.target.value)}>
        <option value="">{t('admin.common.allClinics')}</option>
        {CLINIC_IDS.map((id) => <option key={id} value={id}>{t(`admin.clinic.${id}`)}</option>)}
      </Select>
      <Select className="max-w-xs" aria-label={t('admin.customers.statusFilterLabel')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">{t('admin.common.allStatuses')}</option>
        <option value="active">{t('admin.status.active')}</option>
        <option value="archived">{t('admin.status.archived')}</option>
      </Select>
    </div>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-white md:block">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead><tr className="border-b text-stone-500">
          <th className="p-3">{t('admin.customers.colName')}</th><th>{t('admin.customers.colPhone')}</th><th>{t('admin.customers.colId')}</th><th>{t('admin.customers.colClinic')}</th><th>{t('admin.customers.colNotes')}</th><th>{t('admin.customers.colStatus')}</th><th>{t('admin.customers.colAdded')}</th><th />
        </tr></thead>
        <tbody>{visible.map((customer) => <tr key={customer.id} className="border-b">
          <td className="p-3 font-medium"><Input defaultValue={customer.full_name} onBlur={(e) => e.target.value.trim() !== customer.full_name && mutate(updateCustomer(customer.id, { fullName: e.target.value.trim() }))} /></td>
          <td><Input defaultValue={customer.phone_e164 ?? ''} onBlur={(e) => e.target.value.trim() !== (customer.phone_e164 ?? '') && mutate(updateCustomer(customer.id, { phone: e.target.value.trim() }))} /></td>
          <td><Input defaultValue={customer.patient_identifier ?? ''} onBlur={(e) => e.target.value.trim() !== (customer.patient_identifier ?? '') && mutate(updateCustomer(customer.id, { patientIdentifier: e.target.value.trim() }))} /></td>
          <td>{t(`admin.clinic.${customer.clinic_id}`)}</td>
          <td><Input defaultValue={customer.notes ?? ''} onBlur={(e) => e.target.value.trim() !== (customer.notes ?? '') && mutate(updateCustomer(customer.id, { notes: e.target.value.trim() }))} /></td>
          <td>{t(`admin.status.${customer.status}`)}</td>
          <td>{new Date(customer.created_at).toLocaleDateString()}</td>
          <td><Button onClick={() => mutate(updateCustomer(customer.id, { status: customer.status === 'active' ? 'archived' : 'active' }))}>{customer.status === 'active' ? t('admin.customers.archive') : t('admin.customers.unarchive')}</Button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-4 md:hidden">
      <Accordion>{visible.map((customer) => <AccordionItem key={customer.id} summary={<>
        <span className="font-semibold">{customer.full_name}</span>
        <span className="ms-2 text-xs text-stone-500">{t(`admin.status.${customer.status}`)}</span>
      </>}>
        <AccordionField label={t('admin.customers.colName')}><Input defaultValue={customer.full_name} onBlur={(e) => e.target.value.trim() !== customer.full_name && mutate(updateCustomer(customer.id, { fullName: e.target.value.trim() }))} /></AccordionField>
        <AccordionField label={t('admin.customers.colPhone')}><Input defaultValue={customer.phone_e164 ?? ''} onBlur={(e) => e.target.value.trim() !== (customer.phone_e164 ?? '') && mutate(updateCustomer(customer.id, { phone: e.target.value.trim() }))} /></AccordionField>
        <AccordionField label={t('admin.customers.colId')}><Input defaultValue={customer.patient_identifier ?? ''} onBlur={(e) => e.target.value.trim() !== (customer.patient_identifier ?? '') && mutate(updateCustomer(customer.id, { patientIdentifier: e.target.value.trim() }))} /></AccordionField>
        <AccordionField label={t('admin.customers.colClinic')}>{t(`admin.clinic.${customer.clinic_id}`)}</AccordionField>
        <AccordionField label={t('admin.customers.colNotes')}><Input defaultValue={customer.notes ?? ''} onBlur={(e) => e.target.value.trim() !== (customer.notes ?? '') && mutate(updateCustomer(customer.id, { notes: e.target.value.trim() }))} /></AccordionField>
        <AccordionField label={t('admin.customers.colAdded')}>{new Date(customer.created_at).toLocaleDateString()}</AccordionField>
        <AccordionField label={t('admin.customers.colStatus')}><Button className="w-full" onClick={() => mutate(updateCustomer(customer.id, { status: customer.status === 'active' ? 'archived' : 'active' }))}>{customer.status === 'active' ? t('admin.customers.archive') : t('admin.customers.unarchive')}</Button></AccordionField>
      </AccordionItem>)}</Accordion>
    </div>
  </main>
}
