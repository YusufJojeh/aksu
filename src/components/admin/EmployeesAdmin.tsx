import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EmployeeProfile, EmployeeStatus, UserRole } from '../../auth/types'
import { deleteEmployee, inviteEmployee, listEmployees, offboardEmployee, updateEmployee } from '../../lib/operations'
import { Accordion, AccordionField, AccordionItem, Button, ConfirmDialog, Input, Select } from '../ui'

export function EmployeesAdmin() {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]); const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [error, setError] = useState<string>()
  const [inviteName, setInviteName] = useState(''); const [inviteEmail, setInviteEmail] = useState(''); const [invitePhone, setInvitePhone] = useState('')
  const [pendingDelete, setPendingDelete] = useState<EmployeeProfile>()
  const load = () => listEmployees().then(setEmployees).catch(() => setError(t('admin.employees.loadError')))
  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const mutate = (action: Promise<void>) => void action.then(load).catch(() => setError(t('admin.employees.updateFailed')))
  const removeEmployee = (employee: EmployeeProfile) => void deleteEmployee(employee.id).then(load).catch((caught: unknown) => {
    setError(caught instanceof Error && caught.message === 'employee_has_history' ? t('admin.employees.deleteBlocked') : t('admin.employees.deleteFailed'))
  })
  const visible = employees.filter((employee) => (!query || `${employee.full_name} ${employee.email}`.toLowerCase().includes(query.toLowerCase())) && (!status || employee.status === status))
  return <main className="mx-auto max-w-[1400px] p-4 sm:p-7">
    <h1 className="text-2xl font-bold">{t('admin.employees.title')}</h1>
    <form className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4" onSubmit={(event) => { event.preventDefault(); mutate(inviteEmployee({ fullName: inviteName, email: inviteEmail, workPhone: invitePhone })); setInviteName(''); setInviteEmail(''); setInvitePhone('') }}>
      <label className="grid gap-1 text-sm">{t('admin.employees.inviteFullName')}<Input required value={inviteName} onChange={(e) => setInviteName(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">{t('admin.employees.inviteEmail')}<Input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">{t('admin.employees.invitePhone')}<Input required placeholder="+905551112233" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} /></label>
      <Button type="submit" variant="primary">{t('admin.employees.inviteSubmit')}</Button>
    </form>
    <div className="mt-4 flex flex-wrap gap-3">
      <Input className="max-w-xs" aria-label={t('admin.employees.searchLabel')} placeholder={t('admin.employees.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <Select className="max-w-xs" aria-label={t('admin.employees.statusFilterLabel')} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">{t('admin.common.allStatuses')}</option>
        {(['pending', 'active', 'suspended', 'former'] as const).map((value) => <option key={value} value={value}>{t(`admin.status.${value}`)}</option>)}
      </Select>
    </div>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-white md:block">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead><tr className="border-b text-stone-500">
          <th className="p-3">{t('admin.employees.colName')}</th><th>{t('admin.employees.colEmail')}</th><th>{t('admin.employees.colRequestedPhone')}</th><th>{t('admin.employees.colRole')}</th><th>{t('admin.employees.colStatus')}</th><th>{t('admin.employees.colActions')}</th>
        </tr></thead>
        <tbody>{visible.map((employee) => <tr key={employee.id} className="border-b">
          <td className="p-3 font-medium"><Input defaultValue={employee.full_name} onBlur={(e) => e.target.value.trim() !== employee.full_name && mutate(updateEmployee(employee.id, { full_name: e.target.value.trim() }))} /></td>
          <td>{employee.email}</td>
          <td>{employee.requested_phone_e164}</td>
          <td><Select value={employee.role} onChange={(e) => mutate(updateEmployee(employee.id, { role: e.target.value as UserRole }))}><option>SALES</option><option>ADMIN</option></Select></td>
          <td><Select value={employee.status} onChange={(e) => { const value = e.target.value as EmployeeStatus; mutate(value === 'suspended' || value === 'former' ? offboardEmployee(employee.id, value) : updateEmployee(employee.id, { status: value })) }}>{(['pending', 'active', 'suspended', 'former'] as const).map((value) => <option key={value} value={value}>{t(`admin.status.${value}`)}</option>)}</Select></td>
          <td className="flex gap-2 p-3"><Button onClick={() => mutate(updateEmployee(employee.id, { status: 'active' }))}>{t('admin.employees.activate')}</Button><Button variant="danger" size="icon" aria-label={t('admin.employees.delete')} onClick={() => setPendingDelete(employee)}><Trash2 size={16} /></Button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-4 md:hidden">
      <Accordion>{visible.map((employee) => <AccordionItem key={employee.id} summary={<>
        <span className="font-semibold">{employee.full_name}</span>
        <span className="ms-2 text-xs text-stone-500">{t(`admin.status.${employee.status}`)}</span>
      </>}>
        <AccordionField label={t('admin.employees.colName')}><Input defaultValue={employee.full_name} onBlur={(e) => e.target.value.trim() !== employee.full_name && mutate(updateEmployee(employee.id, { full_name: e.target.value.trim() }))} /></AccordionField>
        <AccordionField label={t('admin.employees.colEmail')}>{employee.email}</AccordionField>
        <AccordionField label={t('admin.employees.colRequestedPhone')}>{employee.requested_phone_e164}</AccordionField>
        <AccordionField label={t('admin.employees.colRole')}><Select value={employee.role} onChange={(e) => mutate(updateEmployee(employee.id, { role: e.target.value as UserRole }))}><option>SALES</option><option>ADMIN</option></Select></AccordionField>
        <AccordionField label={t('admin.employees.colStatus')}><Select value={employee.status} onChange={(e) => { const value = e.target.value as EmployeeStatus; mutate(value === 'suspended' || value === 'former' ? offboardEmployee(employee.id, value) : updateEmployee(employee.id, { status: value })) }}>{(['pending', 'active', 'suspended', 'former'] as const).map((value) => <option key={value} value={value}>{t(`admin.status.${value}`)}</option>)}</Select></AccordionField>
        <AccordionField label={t('admin.employees.colActions')}><div className="flex gap-2"><Button className="flex-1" onClick={() => mutate(updateEmployee(employee.id, { status: 'active' }))}>{t('admin.employees.activate')}</Button><Button variant="danger" size="icon" aria-label={t('admin.employees.delete')} onClick={() => setPendingDelete(employee)}><Trash2 size={16} /></Button></div></AccordionField>
      </AccordionItem>)}</Accordion>
    </div>
    {pendingDelete && <ConfirmDialog
      open
      onOpenChange={(open) => !open && setPendingDelete(undefined)}
      title={t('admin.employees.delete')}
      body={t('admin.employees.deleteConfirm', { name: pendingDelete.full_name })}
      confirmLabel={t('admin.common.delete')}
      cancelLabel={t('admin.common.cancel')}
      onConfirm={() => removeEmployee(pendingDelete)}
    />}
  </main>
}
