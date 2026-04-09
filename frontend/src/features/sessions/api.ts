import { api } from '@/lib/api'

export type SessionRsvp = 'yes' | 'no' | 'maybe'

export type SessionRsvpRow = {
  user_id: string
  status: SessionRsvp
  updated_at: string
}

export type PlaySession = {
  id: string
  group_id: string
  game_id: string
  created_by: string | null
  title: string
  description: string | null
  start_at: string
  duration_minutes: number
  max_participants: number | null
  status: string
  created_at: string
  rsvp_yes: number
  rsvp_no: number
  rsvp_maybe: number
  user_rsvp: SessionRsvp | null
  rsvps: SessionRsvpRow[]
}

export type SessionCreateInput = {
  game_id: string
  title: string
  description?: string | null
  start_at: string // ISO
  duration_minutes?: number
  max_participants?: number | null
}

export const listSessions = (groupId: string) =>
  api<PlaySession[]>(`/groups/${groupId}/sessions`)

export const createSession = (groupId: string, input: SessionCreateInput) =>
  api<PlaySession>(`/groups/${groupId}/sessions`, { method: 'POST', body: input })

export const deleteSession = (groupId: string, sessionId: string) =>
  api<null>(`/groups/${groupId}/sessions/${sessionId}`, { method: 'DELETE' })

export const setRsvp = (groupId: string, sessionId: string, status: SessionRsvp) =>
  api<PlaySession>(`/groups/${groupId}/sessions/${sessionId}/rsvp`, {
    method: 'PUT',
    body: { status },
  })

export const rsvpSession = setRsvp

export const sessionIcsUrl = (groupId: string, sessionId: string) =>
  `/api/groups/${groupId}/sessions/${sessionId}/calendar.ics`

export type SessionAuditPerson = {
  id: string | null
  discord_id: string | null
  display_name: string | null
  avatar_url: string | null
}

export type SessionAuditRsvp = {
  user_id: string
  discord_id: string | null
  display_name: string
  avatar_url: string | null
  status: SessionRsvp
  updated_at: string
}

export type SessionAuditGame = {
  id: string
  name: string
  cover_url: string | null
}

export type SessionAudit = {
  session: PlaySession
  creator: SessionAuditPerson
  game: SessionAuditGame | null
  rsvps: SessionAuditRsvp[]
  non_respondents: SessionAuditPerson[]
}

export const getSessionAudit = (groupId: string, sessionId: string) =>
  api<SessionAudit>(`/groups/${groupId}/sessions/${sessionId}/audit`)
