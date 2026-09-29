import { z } from 'zod'
import type {
  TrackingEntry,
  DailyAggregate,
  TrackingState,
  Settings,
  ClassificationRule,
  AiAnalysisResult,
} from '@echofocus/shared'

// Runtime validation schemas for everything that crosses a trust boundary:
// chrome.storage reads, message payloads from popup/options, and API responses.
// On failure the callers log a warning and fall back to safe defaults — a
// corrupt storage key must never break tracking.

export const categorySchema = z.enum(['productive', 'distraction', 'neutral', 'uncategorized'])

export const trackingEntrySchema: z.ZodType<TrackingEntry> = z.object({
  id: z.string(),
  domain: z.string(),
  url: z.string(),
  title: z.string(),
  category: categorySchema,
  startTime: z.number(),
  duration: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const trackingEntryArraySchema = z.array(trackingEntrySchema)

const topDomainSchema = z.object({
  domain: z.string(),
  seconds: z.number(),
  category: categorySchema,
})

export const dailyAggregateSchema: z.ZodType<DailyAggregate> = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalSeconds: z.number(),
  productiveSeconds: z.number(),
  distractionSeconds: z.number(),
  neutralSeconds: z.number(),
  uncategorizedSeconds: z.number(),
  topDomains: z.array(topDomainSchema),
  focusScore: z.number(),
  // Absent on aggregates written before the hourly breakdown shipped, and
  // dropped (rather than failing the whole day) if the wrong shape shows up —
  // a bad bucket array must not cost the user a day of stats.
  productiveByHour: z.array(z.number()).length(24).optional().catch(undefined),
})

export const trackingStateSchema: z.ZodType<TrackingState> = z.object({
  isTracking: z.boolean(),
  isIdle: z.boolean(),
  activeTabId: z.number().nullable(),
  activeDomain: z.string().nullable(),
  activeUrl: z.string().nullable(),
  activeTitle: z.string().nullable(),
  activeCategory: categorySchema.nullable(),
  sessionStartTime: z.number().nullable(),
})

export const settingsSchema: z.ZodType<Settings> = z.object({
  trackingEnabled: z.boolean(),
  idleTimeoutMinutes: z.number().positive(),
  dataRetentionDays: z.number().positive(),
  dailyGoalMinutes: z.number().positive(),
})

// Partial settings — used for SAVE_SETTINGS payloads (options page sends
// only the fields it changed).
export const partialSettingsSchema = z
  .object({
    trackingEnabled: z.boolean(),
    idleTimeoutMinutes: z.number().positive(),
    dataRetentionDays: z.number().positive(),
    dailyGoalMinutes: z.number().positive(),
  })
  .partial()

export const classificationRuleSchema: z.ZodType<ClassificationRule> = z.object({
  id: z.string(),
  pattern: z.string().min(1),
  matchType: z.enum(['exact', 'wildcard', 'path']),
  category: categorySchema,
  isDefault: z.boolean(),
  createdAt: z.number(),
})

export const classificationRuleArraySchema = z.array(classificationRuleSchema)

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// GET_AI_ANALYSIS/REQUEST_AI_ANALYSIS payloads — both message types accept a
// bare date string, and REQUEST_AI_ANALYSIS also accepts { date, language }.
// Unvalidated, a malformed payload used to reach recomputeAndSaveAggregate(),
// which writes under `aggregates:${date}` — for a non-string payload that
// produces the literal key "aggregates:undefined".
export const aiAnalysisRequestSchema = z.union([
  dateStringSchema,
  z.object({ date: dateStringSchema, language: z.string().optional() }),
])

export const themePreferenceSchema = z.enum(['light', 'dark', 'system'])

export type ThemePreference = z.infer<typeof themePreferenceSchema>

export const pomodoroStateSchema = z.object({
  phase: z.enum(['idle', 'focusing', 'break']),
  endsAt: z.number().nullable(),
  pausedRemainingMs: z.number().nullable(),
})

export type PomodoroState = z.infer<typeof pomodoroStateSchema>

export const pomodoroSettingsSchema = z.object({
  focusMinutes: z.number().positive(),
  breakMinutes: z.number().positive(),
})

export type PomodoroSettings = z.infer<typeof pomodoroSettingsSchema>

export const pomodoroCommandSchema = z.enum(['start', 'pause', 'resume', 'skip', 'stop'])

export type PomodoroCommand = z.infer<typeof pomodoroCommandSchema>

export const aiAnalysisResultSchema: z.ZodType<AiAnalysisResult> = z.object({
  analysisText: z.string(),
  focusScore: z.number(),
  analyzedAt: z.number(),
})

// Validate an ai-analyze Edge Function response.
// NOTE (follow-up): lib/ai.ts should call this on the fetched JSON before
// returning it. Kept as a standalone helper for now to avoid conflicting
// with concurrent edits to lib/ai.ts.
export function validateAiAnalysisResult(data: unknown): AiAnalysisResult | null {
  const parsed = aiAnalysisResultSchema.safeParse(data)
  if (!parsed.success) {
    console.warn('[EchoFocus] Invalid AI analysis response:', parsed.error.message)
    return null
  }
  return parsed.data
}
