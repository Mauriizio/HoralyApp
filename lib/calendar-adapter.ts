// Abstract calendar adapter. The app is structured around this interface so a
// Google Calendar implementation can be added later without changing UI code.

import type { Reminder, ScheduleBlock, StudyBlock, Subject } from "./types"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string // ISO
  end: string // ISO
  colorHex?: string
}

export interface CalendarAdapter {
  readonly id: string
  readonly label: string
  readonly connected: boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
  syncSubjects(subjects: Subject[], blocks: ScheduleBlock[]): Promise<void>
  syncStudyBlocks(blocks: StudyBlock[], subjects: Subject[]): Promise<void>
  syncReminders(reminders: Reminder[]): Promise<void>
}

// Local-only adapter. Future: GoogleCalendarAdapter implementing this interface
// with OAuth and the Google Calendar API.
class LocalCalendarAdapter implements CalendarAdapter {
  id = "local"
  label = "Solo en este dispositivo"
  connected = true
  async connect() {}
  async disconnect() {}
  async syncSubjects() {}
  async syncStudyBlocks() {}
  async syncReminders() {}
}

export const activeCalendarAdapter: CalendarAdapter = new LocalCalendarAdapter()

// Helper to convert a schedule block into a calendar event. Not wired yet, but
// kept here so the future Google Calendar integration reuses the same shape.
export function buildEventFromBlock(
  block: ScheduleBlock,
  subject: Subject,
  moduleRange: { start: string; end: string },
  dateISODay: string, // "YYYY-MM-DD"
): CalendarEvent {
  return {
    id: block.id,
    title: subject.name,
    description: subject.notes,
    start: `${dateISODay}T${moduleRange.start}:00`,
    end: `${dateISODay}T${moduleRange.end}:00`,
    colorHex: subject.color,
  }
}
