import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EmployeeProfile } from '../../auth/types'
import { assignChannel, createChannel, listChannels, listEmployees, setChannelStatus, unassignChannel, updateChannel, type CommunicationChannel } from '../../lib/operations'
import { Accordion, AccordionField, AccordionItem, Button, Input, Select } from '../ui'

export function ChannelsAdmin() {
  const { t } = useTranslation()
  const [channels, setChannels] = useState<CommunicationChannel[]>([]); const [employees, setEmployees] = useState<EmployeeProfile[]>([]); const [phone, setPhone] = useState(''); const [label, setLabel] = useState(''); const [type, setType] = useState<'whatsapp' | 'phone'>('whatsapp'); const [error, setError] = useState<string>()
  const load = () => Promise.all([listChannels(), listEmployees()]).then(([c, e]) => { setChannels(c); setEmployees(e) }).catch(() => setError(t('admin.channels.loadError')))
  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const mutate = (action: Promise<void>) => void action.then(load).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : t('admin.channels.updateFailed')))
  return <main className="mx-auto max-w-[1300px] p-4 sm:p-7">
    <h1 className="text-2xl font-bold">{t('admin.channels.title')}</h1>
    <form className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4" onSubmit={(e) => { e.preventDefault(); mutate(createChannel({ phone, label, type })); setPhone(''); setLabel('') }}>
      <label className="grid gap-1 text-sm">{t('admin.channels.phoneLabel')}<Input required placeholder={t('admin.channels.phonePlaceholder')} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">{t('admin.channels.typeLabel')}<Select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="whatsapp">{t('admin.channels.typeWhatsapp')}</option><option value="phone">{t('admin.channels.typePhone')}</option></Select></label>
      <label className="grid gap-1 text-sm">{t('admin.channels.labelLabel')}<Input value={label} onChange={(e) => setLabel(e.target.value)} /></label>
      <Button type="submit" variant="primary">{t('admin.channels.createSubmit')}</Button>
    </form>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-white md:block">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead><tr className="border-b text-stone-500">
          <th className="p-3">{t('admin.channels.colPhone')}</th><th>{t('admin.channels.colLabel')}</th><th>{t('admin.channels.colType')}</th><th>{t('admin.channels.colStatus')}</th><th>{t('admin.channels.colAssignee')}</th><th>{t('admin.channels.colAssignedDate')}</th><th>{t('admin.channels.colAssignment')}</th>
        </tr></thead>
        <tbody>{channels.map((channel) => <tr key={channel.id} className="border-b">
          <td className="p-3"><Input aria-label={`${t('admin.channels.colPhone')} ${channel.label || channel.phone_e164}`} defaultValue={channel.phone_e164} onBlur={(e) => e.target.value.trim() !== channel.phone_e164 && mutate(updateChannel(channel.id, { phone: e.target.value.trim() }))} /></td>
          <td><Input aria-label={`${t('admin.channels.colLabel')} ${channel.phone_e164}`} defaultValue={channel.label} onBlur={(e) => e.target.value.trim() !== channel.label && mutate(updateChannel(channel.id, { label: e.target.value.trim() }))} /></td>
          <td><Select aria-label={`${t('admin.channels.colType')} ${channel.phone_e164}`} value={channel.type} onChange={(e) => mutate(updateChannel(channel.id, { type: e.target.value as 'whatsapp' | 'phone' }))}><option value="whatsapp">{t('admin.channels.typeWhatsapp')}</option><option value="phone">{t('admin.channels.typePhone')}</option></Select></td>
          <td><Button onClick={() => mutate(setChannelStatus(channel.id, channel.status === 'active' ? 'inactive' : 'active'))}>{t(`admin.status.${channel.status}`)}</Button></td>
          <td>{channel.current_assignment?.profile?.full_name ?? '—'}</td>
          <td>{channel.current_assignment ? new Date(channel.current_assignment.assigned_at).toLocaleDateString() : '—'}</td>
          <td><Select aria-label={`${t('admin.channels.colAssignment')} ${channel.phone_e164}`} value={channel.current_assignment?.employee_id ?? ''} onChange={(e) => mutate(e.target.value ? assignChannel(channel.id, e.target.value) : unassignChannel(channel.id))}><option value="">{t('admin.common.unassigned')}</option>{employees.filter((employee) => ['pending', 'active'].includes(employee.status)).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</Select></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-4 md:hidden">
      <Accordion>{channels.map((channel) => <AccordionItem key={channel.id} summary={<>
        <span className="font-semibold">{channel.phone_e164}</span>
        {channel.label && <span className="ms-2 text-stone-500">{channel.label}</span>}
        <span className="ms-2 text-xs text-stone-500">{t(`admin.status.${channel.status}`)}</span>
      </>}>
        <AccordionField label={t('admin.channels.colPhone')}><Input aria-label={`${t('admin.channels.colPhone')} ${channel.label || channel.phone_e164}`} defaultValue={channel.phone_e164} onBlur={(e) => e.target.value.trim() !== channel.phone_e164 && mutate(updateChannel(channel.id, { phone: e.target.value.trim() }))} /></AccordionField>
        <AccordionField label={t('admin.channels.colLabel')}><Input aria-label={`${t('admin.channels.colLabel')} ${channel.phone_e164}`} defaultValue={channel.label} onBlur={(e) => e.target.value.trim() !== channel.label && mutate(updateChannel(channel.id, { label: e.target.value.trim() }))} /></AccordionField>
        <AccordionField label={t('admin.channels.colType')}><Select aria-label={`${t('admin.channels.colType')} ${channel.phone_e164}`} value={channel.type} onChange={(e) => mutate(updateChannel(channel.id, { type: e.target.value as 'whatsapp' | 'phone' }))}><option value="whatsapp">{t('admin.channels.typeWhatsapp')}</option><option value="phone">{t('admin.channels.typePhone')}</option></Select></AccordionField>
        <AccordionField label={t('admin.channels.colStatus')}><Button className="w-full" onClick={() => mutate(setChannelStatus(channel.id, channel.status === 'active' ? 'inactive' : 'active'))}>{t(`admin.status.${channel.status}`)}</Button></AccordionField>
        <AccordionField label={t('admin.channels.colAssignee')}>{channel.current_assignment?.profile?.full_name ?? '—'}</AccordionField>
        <AccordionField label={t('admin.channels.colAssignedDate')}>{channel.current_assignment ? new Date(channel.current_assignment.assigned_at).toLocaleDateString() : '—'}</AccordionField>
        <AccordionField label={t('admin.channels.colAssignment')}><Select aria-label={`${t('admin.channels.colAssignment')} ${channel.phone_e164}`} value={channel.current_assignment?.employee_id ?? ''} onChange={(e) => mutate(e.target.value ? assignChannel(channel.id, e.target.value) : unassignChannel(channel.id))}><option value="">{t('admin.common.unassigned')}</option>{employees.filter((employee) => ['pending', 'active'].includes(employee.status)).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</Select></AccordionField>
      </AccordionItem>)}</Accordion>
    </div>
  </main>
}
