import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EmployeeProfile, EmployeeStatus, UserRole } from '../../auth/types'
import { createEmployee, deleteEmployee, listEmployees, offboardEmployee, updateEmployee } from '../../lib/operations'
import { Accordion, AccordionField, AccordionItem, Button, ConfirmDialog, Input, ReadOnlyScope, Select } from '../ui'
import { errorText } from '../../i18n/errorText'

const statuses = ['pending', 'active', 'suspended', 'former'] as const
const roles: UserRole[] = ['SALES', 'TEAM_LEAD', 'ADMIN']

// Offboarding and role changes take effect immediately on someone else's access, so both ask first.
type PendingChange =
  | { employee: EmployeeProfile; kind: 'status'; value: EmployeeStatus }
  | { employee: EmployeeProfile; kind: 'role'; value: UserRole }

export function EmployeesAdmin({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string>()
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [loaded, setLoaded] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<EmployeeProfile>()
  const [pendingChange, setPendingChange] = useState<PendingChange>()
  const load = () =>
    listEmployees()
      .then(setEmployees)
      .catch(() => setError(t('admin.employees.loadError')))
      .finally(() => setLoaded(true))
  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const mutate = (action: Promise<void>) =>
    void action.then(load).catch(() => setError(t('admin.employees.updateFailed')))
  const removeEmployee = (employee: EmployeeProfile) =>
    void deleteEmployee(employee.id)
      .then(load)
      .catch((caught: unknown) => {
        setError(errorText(caught, t, 'admin.employees.deleteFailed'))
      })
  const create = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(undefined)
    setNotice(undefined)
    try {
      await createEmployee({ fullName: newName, email: newEmail, workPhone: newPhone })
      // Only clear the form once the account exists, so a typo can be corrected instead of retyped.
      setNotice(t('admin.employees.created', { name: newName.trim(), phone: newPhone.trim() }))
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      await load()
    } catch (caught) {
      setError(errorText(caught, t, 'admin.employees.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }
  const changeStatus = (employee: EmployeeProfile, value: EmployeeStatus) => {
    if (value === employee.status) return
    if (value === 'suspended' || value === 'former') setPendingChange({ employee, kind: 'status', value })
    else mutate(updateEmployee(employee.id, { status: value }))
  }
  const changeRole = (employee: EmployeeProfile, value: UserRole) => {
    if (value !== employee.role) setPendingChange({ employee, kind: 'role', value })
  }
  const confirmChange = (change: PendingChange) =>
    mutate(
      change.kind === 'role'
        ? updateEmployee(change.employee.id, { role: change.value })
        : offboardEmployee(change.employee.id, change.value as 'suspended' | 'former'),
    )
  const visible = employees.filter(
    (employee) =>
      (!query || `${employee.full_name} ${employee.email}`.toLowerCase().includes(query.toLowerCase())) &&
      (!status || employee.status === status),
  )
  const nameLabel = (employee: EmployeeProfile) => `${t('admin.employees.colName')} ${employee.email}`
  const nameInput = (employee: EmployeeProfile) => (
    <Input
      aria-label={nameLabel(employee)}
      defaultValue={employee.full_name}
      onBlur={(e) =>
        e.target.value.trim() !== employee.full_name &&
        mutate(updateEmployee(employee.id, { full_name: e.target.value.trim() }))
      }
    />
  )
  const roleSelect = (employee: EmployeeProfile) => (
    <Select
      aria-label={`${t('admin.employees.colRole')} ${employee.email}`}
      value={employee.role}
      onChange={(e) => changeRole(employee, e.target.value as UserRole)}
    >
      {roles.map((role) => (
        <option key={role} value={role}>
          {t(`admin.role.${role}`)}
        </option>
      ))}
    </Select>
  )
  const statusSelect = (employee: EmployeeProfile) => (
    <Select
      aria-label={`${t('admin.employees.colStatus')} ${employee.email}`}
      value={employee.status}
      onChange={(e) => changeStatus(employee, e.target.value as EmployeeStatus)}
    >
      {statuses.map((value) => (
        <option key={value} value={value}>
          {t(`admin.status.${value}`)}
        </option>
      ))}
    </Select>
  )
  const actions = (employee: EmployeeProfile, wide?: boolean) => (
    <>
      {employee.status !== 'active' && (
        <Button
          className={wide ? 'flex-1' : undefined}
          onClick={() => mutate(updateEmployee(employee.id, { status: 'active' }))}
        >
          {t('admin.employees.activate')}
        </Button>
      )}
      <Button
        variant="danger"
        size="icon"
        aria-label={`${t('admin.employees.delete')} ${employee.full_name}`}
        title={t('admin.employees.delete')}
        onClick={() => setPendingDelete(employee)}
      >
        <Trash2 size={16} />
      </Button>
    </>
  )
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1400px] p-4 sm:p-7">
      <h1 className="text-2xl font-bold">{t('admin.employees.title')}</h1>
      {!readOnly && (
<form
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <label className="grid gap-1 text-sm">
          {t('admin.employees.createFullName')}
          <Input required autoComplete="off" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.employees.createEmail')}
          <Input
            type="email"
            dir="ltr"
            autoComplete="off"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t('admin.employees.createPhone')}
          <Input
            required
            type="tel"
            inputMode="tel"
            placeholder="+905551112233"
            dir="ltr"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
        </label>
        <Button type="submit" variant="primary" disabled={submitting} aria-busy={submitting}>
          {submitting ? t('admin.common.loading') : t('admin.employees.createSubmit')}
        </Button>
      </form>
)}
      <p role="status" className="mt-3 text-sm text-stone-700 empty:sr-only">
        {notice}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          aria-label={t('admin.employees.searchLabel')}
          placeholder={t('admin.employees.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          className="max-w-xs"
          aria-label={t('admin.employees.statusFilterLabel')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t('admin.common.allStatuses')}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t(`admin.status.${value}`)}
            </option>
          ))}
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
      {loaded && visible.length === 0 && (
        <p className="mt-4 rounded-xl border bg-white p-5 text-sm text-stone-600">
          {employees.length === 0 ? t('admin.employees.empty') : t('admin.common.noMatches')}
        </p>
      )}
<ReadOnlyScope readOnly={readOnly}>
      {visible.length > 0 && (
        <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-white md:block">
          <table className="w-full min-w-[1000px] text-start text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-3">
            <thead>
              <tr className="border-b text-stone-600">
                <th className="text-start">{t('admin.employees.colName')}</th>
                <th className="text-start">{t('admin.employees.colEmail')}</th>
                <th className="text-start">{t('admin.employees.colRequestedPhone')}</th>
                <th className="text-start">{t('admin.employees.colRole')}</th>
                <th className="text-start">{t('admin.employees.colStatus')}</th>
                <th className="text-start">{t('admin.employees.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((employee) => (
                <tr key={employee.id} className="border-b">
                  <td className="font-medium">{nameInput(employee)}</td>
                  <td className="[overflow-wrap:anywhere]">{employee.email}</td>
                  <td className="tabular-nums">{employee.requested_phone_e164}</td>
                  <td>{roleSelect(employee)}</td>
                  <td>{statusSelect(employee)}</td>
                  <td>
                    <div className="flex gap-2">{actions(employee)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 md:hidden">
        <Accordion>
          {visible.map((employee) => (
            <AccordionItem
              key={employee.id}
              summary={
                <>
                  <span className="font-semibold [overflow-wrap:anywhere]">{employee.full_name}</span>
                  <span className="ms-2 text-xs text-stone-600">{t(`admin.status.${employee.status}`)}</span>
                </>
              }
            >
              <AccordionField label={t('admin.employees.colName')}>{nameInput(employee)}</AccordionField>
              <AccordionField label={t('admin.employees.colEmail')}>
                <span className="[overflow-wrap:anywhere]">{employee.email}</span>
              </AccordionField>
              <AccordionField label={t('admin.employees.colRequestedPhone')}>
                {employee.requested_phone_e164}
              </AccordionField>
              <AccordionField label={t('admin.employees.colRole')}>{roleSelect(employee)}</AccordionField>
              <AccordionField label={t('admin.employees.colStatus')}>{statusSelect(employee)}</AccordionField>
              <AccordionField label={t('admin.employees.colActions')}>
                <div className="flex gap-2">{actions(employee, true)}</div>
              </AccordionField>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
</ReadOnlyScope>
      {pendingDelete && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendingDelete(undefined)}
          title={t('admin.employees.deleteTitle', { name: pendingDelete.full_name })}
          body={t('admin.employees.deleteConfirm', { name: pendingDelete.full_name })}
          confirmLabel={t('admin.common.delete')}
          cancelLabel={t('admin.common.cancel')}
          onConfirm={() => removeEmployee(pendingDelete)}
        />
      )}
      {pendingChange && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendingChange(undefined)}
          title={
            pendingChange.kind === 'role'
              ? t('admin.employees.roleTitle', {
                  name: pendingChange.employee.full_name,
                  role: t(`admin.role.${pendingChange.value}`),
                })
              : t('admin.employees.offboardTitle', {
                  name: pendingChange.employee.full_name,
                  status: t(`admin.status.${pendingChange.value}`),
                })
          }
          body={
            pendingChange.kind === 'role'
              ? t('admin.employees.roleBody', { name: pendingChange.employee.full_name })
              : t('admin.employees.offboardBody')
          }
          confirmLabel={
            pendingChange.kind === 'role'
              ? t('admin.role.' + pendingChange.value)
              : t(`admin.status.${pendingChange.value}`)
          }
          cancelLabel={t('admin.common.cancel')}
          onConfirm={() => confirmChange(pendingChange)}
        />
      )}
    </main>
  )
}
