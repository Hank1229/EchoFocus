'use client'

import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Category, MatchType } from '@echofocus/shared'
import { createClient } from '@/lib/supabase/client'
import { useLocale, type Locale } from '@/lib/i18n'

export interface Rule {
  id: string
  pattern: string
  match_type: MatchType
  category: Category
}

interface Draft {
  pattern: string
  matchType: MatchType
  category: Category
}

const MATCH_TYPES: MatchType[] = ['exact', 'wildcard', 'path']
const CATEGORIES: Category[] = ['productive', 'distraction', 'neutral', 'uncategorized']
const PATTERN_MAX = 120
const EMPTY_DRAFT: Draft = { pattern: '', matchType: 'exact', category: 'productive' }

const DOT: Record<Category, string> = {
  productive: 'var(--productive)',
  distraction: 'var(--rest)',
  neutral: 'var(--neutral)',
  uncategorized: 'var(--neutral)',
}

const matchLabels = (t: Locale): Record<MatchType, string> => ({
  exact: t.rules.matchExact,
  wildcard: t.rules.matchWildcard,
  path: t.rules.matchPath,
})

const matchHints = (t: Locale): Record<MatchType, string> => ({
  exact: t.rules.matchExactHint,
  wildcard: t.rules.matchWildcardHint,
  path: t.rules.matchPathHint,
})

type Problem = 'empty' | 'tooLong' | 'spaces' | 'wildcard' | 'path' | 'slash' | 'duplicate'

// The extension's matcher compares hostnames for exact/wildcard rules and does a
// substring test on the full URL for path rules, so a pattern that contradicts
// its match type would be stored and then silently never fire.
function check(draft: Draft, rules: Rule[], editingId: string | null): Problem | null {
  const pattern = draft.pattern.trim().toLowerCase()
  if (!pattern) return 'empty'
  if (pattern.length > PATTERN_MAX) return 'tooLong'
  if (/\s/.test(pattern)) return 'spaces'
  if (draft.matchType === 'wildcard' && !pattern.startsWith('*.')) return 'wildcard'
  if (draft.matchType === 'path' && !pattern.includes('/')) return 'path'
  if (draft.matchType !== 'path' && pattern.includes('/')) return 'slash'
  if (rules.some(r => r.id !== editingId && r.pattern === pattern && r.match_type === draft.matchType)) {
    return 'duplicate'
  }
  return null
}

const FIELD = 'pressable rounded-md border border-line bg-surface px-3 py-2 text-body text-content outline-none focus:border-accent'

function RuleFields({
  draft,
  onChange,
  autoFocus,
}: {
  draft: Draft
  onChange: (draft: Draft) => void
  autoFocus?: boolean
}) {
  const { t } = useLocale()
  const matches = matchLabels(t)

  return (
    <>
      <input
        type="text"
        value={draft.pattern}
        onChange={e => onChange({ ...draft, pattern: e.target.value })}
        placeholder={t.rules.patternPlaceholder}
        aria-label={t.rules.patternLabel}
        maxLength={PATTERN_MAX}
        autoFocus={autoFocus}
        className={`${FIELD} min-w-0 flex-1 placeholder:text-content-tertiary`}
      />
      <select
        value={draft.matchType}
        onChange={e => onChange({ ...draft, matchType: e.target.value as MatchType })}
        aria-label={t.rules.matchLabel}
        className={`${FIELD} sm:w-44`}
      >
        {MATCH_TYPES.map(value => (
          <option key={value} value={value}>{matches[value]}</option>
        ))}
      </select>
      <select
        value={draft.category}
        onChange={e => onChange({ ...draft, category: e.target.value as Category })}
        aria-label={t.rules.categoryLabel}
        className={`${FIELD} sm:w-40`}
      >
        {CATEGORIES.map(value => (
          <option key={value} value={value}>{t.categoryLabels[value]}</option>
        ))}
      </select>
    </>
  )
}

export default function RulesEditor({ userId, initialRules }: { userId: string; initialRules: Rule[] }) {
  const { t } = useLocale()
  const [rules, setRules] = useState(initialRules)

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)

  const matches = matchLabels(t)

  const problemText: Record<Problem, string> = {
    empty: t.rules.errorEmpty,
    tooLong: t.rules.errorTooLong.replace('{max}', String(PATTERN_MAX)),
    spaces: t.rules.errorSpaces,
    wildcard: t.rules.errorWildcard,
    path: t.rules.errorPath,
    slash: t.rules.errorSlash,
    duplicate: t.rules.errorDuplicate,
  }

  const columns = (draft: Draft) => ({
    pattern: draft.pattern.trim().toLowerCase(),
    match_type: draft.matchType,
    category: draft.category,
  })

  const add = async (event: FormEvent) => {
    event.preventDefault()
    const problem = check(draft, rules, null)
    if (problem) {
      setAddError(problemText[problem])
      return
    }

    setIsAdding(true)
    setAddError(null)
    const { data, error } = await createClient()
      .from('custom_rules')
      .insert({ user_id: userId, ...columns(draft) })
      .select('id, pattern, match_type, category')
      .single()
    setIsAdding(false)

    if (error || !data) {
      setAddError(t.rules.addFailed + (error?.message ?? t.rules.unknownError))
      return
    }
    setRules([data as Rule, ...rules])
    setDraft({ ...draft, pattern: '' })
  }

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setEditDraft({ pattern: rule.pattern, matchType: rule.match_type, category: rule.category })
    setEditError(null)
    setConfirmingId(null)
    setRowError(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    const problem = check(editDraft, rules, editingId)
    if (problem) {
      setEditError(problemText[problem])
      return
    }

    setIsSavingEdit(true)
    setEditError(null)
    const { data, error } = await createClient()
      .from('custom_rules')
      .update(columns(editDraft))
      .eq('id', editingId)
      .select('id, pattern, match_type, category')
      .single()
    setIsSavingEdit(false)

    if (error || !data) {
      setEditError(t.rules.updateFailed + (error?.message ?? t.rules.unknownError))
      return
    }
    const saved = data as Rule
    setRules(rules.map(rule => (rule.id === saved.id ? saved : rule)))
    setEditingId(null)
  }

  // `.select()` on the delete tells us a row actually went — an RLS mismatch
  // returns no error and no rows, which must not read as success.
  const remove = async (id: string) => {
    setDeletingId(id)
    setRowError(null)
    const { data, error } = await createClient()
      .from('custom_rules')
      .delete()
      .eq('id', id)
      .select('id')
    setDeletingId(null)

    if (error || !data?.length) {
      setRowError({ id, message: t.rules.deleteFailed + (error?.message ?? t.rules.unknownError) })
      return
    }
    setConfirmingId(null)
    setRules(rules.filter(rule => rule.id !== id))
  }

  return (
    <>
      <form onSubmit={add} className="mt-9 border-t border-line pt-7">
        <h2 className="text-label text-content-secondary">{t.rules.addTitle}</h2>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <RuleFields draft={draft} onChange={setDraft} />
          <button
            type="submit"
            disabled={isAdding}
            className="pressable flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-label text-accent-ink disabled:opacity-60"
          >
            <Plus size={15} strokeWidth={1.5} />
            {isAdding ? t.rules.adding : t.rules.add}
          </button>
        </div>
        <p className="mt-2.5 max-w-[62ch] text-caption text-content-tertiary">{matchHints(t)[draft.matchType]}</p>
        {addError && <p role="alert" className="mt-2 text-caption" style={{ color: 'var(--danger)' }}>{addError}</p>}
      </form>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
          <h2 className="text-label text-content-secondary">{t.rules.yourRules}</h2>
          <p className="text-caption text-content-tertiary">{t.rules.count.replace('{n}', String(rules.length))}</p>
        </div>

        {rules.length === 0 ? (
          <p className="mt-4 max-w-[62ch] text-body text-content-secondary">{t.rules.empty}</p>
        ) : (
          <ul>
            {rules.map(rule => (
              <li key={rule.id} className="border-b border-line py-3">
                {editingId === rule.id ? (
                  <>
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                      <RuleFields draft={editDraft} onChange={setEditDraft} autoFocus />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={isSavingEdit}
                          className="pressable flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-label text-accent-ink disabled:opacity-60"
                        >
                          <Check size={14} strokeWidth={1.5} />
                          {isSavingEdit ? t.rules.saving : t.rules.save}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditError(null) }}
                          className="pressable rounded-md px-3 py-2 text-label text-content-secondary hover:text-content"
                        >
                          {t.rules.cancel}
                        </button>
                      </div>
                    </div>
                    {editError && <p role="alert" className="mt-2.5 text-caption" style={{ color: 'var(--danger)' }}>{editError}</p>}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="min-w-0 flex-1 truncate text-body text-content">{rule.pattern}</span>
                      <span className="hidden w-36 flex-shrink-0 text-caption text-content-tertiary sm:block">
                        {matches[rule.match_type]}
                      </span>
                      {/* Wide enough for the longest category label, "Breaks & Browsing" */}
                      <span className="flex w-36 flex-shrink-0 items-center gap-2 text-caption text-content-secondary">
                        <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: DOT[rule.category] }} />
                        <span className="truncate">{t.categoryLabels[rule.category]}</span>
                      </span>
                      <div className="flex flex-shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => startEdit(rule)}
                          aria-label={t.rules.editAria.replace('{pattern}', rule.pattern)}
                          className="pressable rounded-md p-1.5 text-content-tertiary hover:text-content"
                        >
                          <Pencil size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => { setConfirmingId(rule.id); setRowError(null) }}
                          aria-label={t.rules.deleteAria.replace('{pattern}', rule.pattern)}
                          className="pressable rounded-md p-1.5 text-content-tertiary hover:text-[color:var(--danger)]"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {confirmingId === rule.id && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <p className="text-caption" style={{ color: 'var(--danger)' }}>{t.rules.deleteConfirm}</p>
                        <button
                          onClick={() => remove(rule.id)}
                          disabled={deletingId === rule.id}
                          className="pressable rounded-md px-3 py-1.5 text-caption font-semibold disabled:opacity-50" style={{ background: 'var(--danger)', color: 'var(--bg)' }}
                        >
                          {deletingId === rule.id ? t.rules.deleting : t.rules.confirmDelete}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="pressable flex items-center gap-1 text-caption text-content-secondary hover:text-content"
                        >
                          <X size={12} strokeWidth={2} />
                          {t.rules.cancel}
                        </button>
                      </div>
                    )}

                    {rowError?.id === rule.id && (
                      <p role="alert" className="mt-2 text-caption" style={{ color: 'var(--danger)' }}>{rowError.message}</p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
