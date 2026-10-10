import { requireSupabase } from '../supabase'
import { fromRow, requireE164 } from './shared'

type ChannelType = 'whatsapp' | 'phone'

export interface CommunicationChannel {
  id: string
  phone_e164: string
  type: ChannelType
  label: string
  status: 'active' | 'inactive'
  created_at: string
  current_assignment?: { employee_id: string; assigned_at: string; profile?: { full_name: string } }
}

interface ChannelAssignmentRow { employee_id: string; assigned_at: string; unassigned_at?: string; profiles?: { full_name: string } }
type ChannelRow = Omit<CommunicationChannel, 'current_assignment'> & { channel_assignments: ChannelAssignmentRow[] }

const CHANNEL_SELECT = '*, channel_assignments(employee_id, assigned_at, unassigned_at, profiles!channel_assignments_employee_id_fkey(full_name))'

export async function listChannels(): Promise<CommunicationChannel[]> {
  const { data, error } = await requireSupabase().from('communication_channels').select(CHANNEL_SELECT).order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow<ChannelRow>).map(({ channel_assignments, ...channel }) => {
    const open = channel_assignments.find((assignment) => !assignment.unassigned_at)
    return {
      ...channel,
      current_assignment: open ? { employee_id: open.employee_id, assigned_at: open.assigned_at, profile: open.profiles } : undefined,
    }
  })
}

export async function createChannel(input: { phone: string; type: ChannelType; label: string }): Promise<void> {
  const phone = requireE164(input.phone)
  const { error } = await requireSupabase().from('communication_channels').insert({ phone_e164: phone, type: input.type, label: input.label.trim() })
  if (error) throw error
}

export async function setChannelStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await requireSupabase().from('communication_channels').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function updateChannel(id: string, patch: { phone?: string; label?: string; type?: ChannelType }): Promise<void> {
  const update: { phone_e164?: string; label?: string; type?: ChannelType; updated_at: string } = { updated_at: new Date().toISOString() }
  if (patch.phone !== undefined) update.phone_e164 = requireE164(patch.phone)
  if (patch.label !== undefined) update.label = patch.label.trim()
  if (patch.type !== undefined) update.type = patch.type
  const { error } = await requireSupabase().from('communication_channels').update(update).eq('id', id)
  if (error) throw error
}

export async function assignChannel(channelId: string, employeeId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('assign_channel', { p_channel_id: channelId, p_employee_id: employeeId })
  if (error) throw error
}

export async function unassignChannel(channelId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('unassign_channel', { p_channel_id: channelId })
  if (error) throw error
}
