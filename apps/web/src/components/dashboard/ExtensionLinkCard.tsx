'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/i18n'
import { connectExtension, detectExtension } from '@/lib/extension-link'

export type LinkStatus =
  | 'checking'
  | 'not-installed'
  | 'unlinked'
  | 'linked'
  | 'other-account'
  | 'device-linked-elsewhere'

// What the last press of the button led to; null until it is pressed.
export type LinkNotice = 'connecting' | 'linked' | 'failed' | 'busy' | 'mismatch' | null

export type LinkVariant = 'today' | 'settings'

interface Props {
  userId: string
  email: string
  hasAnyData: boolean
  variant: LinkVariant
}

// Today only interrupts when there is something to do or to explain; the
// Settings account tab always shows where the extension stands.
export function isVisibleOnToday(status: LinkStatus, notice: LinkNotice, hasAnyData: boolean): boolean {
  if (notice) return true
  if (status === 'not-installed') return !hasAnyData
  return status === 'unlinked' || status === 'other-account' || status === 'device-linked-elsewhere'
}

const REFRESH_AFTER_LINK_MS = 10_000

export default function ExtensionLinkCard({ userId, email, hasAnyData, variant }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<LinkStatus>('checking')
  const [notice, setNotice] = useState<LinkNotice>(null)
  const [extensionId, setExtensionId] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void detectExtension(userId).then(detection => {
      if (!live) return
      setStatus(detection.status)
      if ('extensionId' in detection) setExtensionId(detection.extensionId)
    })
    return () => { live = false }
  }, [userId])

  // The first hourly upload is already on its way; give it a moment, then
  // let the server components read it.
  useEffect(() => {
    if (variant !== 'today' || notice !== 'linked') return
    const timer = setTimeout(() => router.refresh(), REFRESH_AFTER_LINK_MS)
    return () => clearTimeout(timer)
  }, [variant, notice, router])

  const connect = async () => {
    if (!extensionId) return
    setNotice('connecting')
    const result = await connectExtension(extensionId, userId, email)
    if (result === 'linked') {
      setStatus('linked')
      setNotice('linked')
    } else if (result === 'other-account' || result === 'device-linked-elsewhere') {
      setStatus(result)
      setNotice(null)
    } else {
      setNotice(result)
    }
  }

  if (variant === 'today' && !isVisibleOnToday(status, notice, hasAnyData)) return null

  return (
    <ExtensionLinkView status={status} notice={notice} email={email} variant={variant} onConnect={() => void connect()} />
  )
}

interface ViewProps {
  status: LinkStatus
  notice: LinkNotice
  email: string
  variant: LinkVariant
  onConnect?: () => void
}

// The card's markup on its own, so /dev/preview/link can lay out every state.
export function ExtensionLinkView({ status, notice, email, variant, onConnect }: ViewProps) {
  const { t } = useLocale()
  const copy = t.extensionLink
  const withEmail = (text: string) => text.replaceAll('{email}', email)

  const statusLine: Record<LinkStatus, string> = {
    checking: copy.statusChecking,
    'not-installed': copy.statusNotInstalled,
    unlinked: copy.statusUnlinked,
    linked: copy.statusLinked,
    'other-account': copy.statusOtherAccount,
    'device-linked-elsewhere': copy.statusDeviceLinkedElsewhere,
  }
  const explanation: Partial<Record<LinkStatus, string>> = {
    'not-installed': copy.notInstalled,
    unlinked: copy.unlinked,
    'other-account': copy.otherAccount,
    'device-linked-elsewhere': copy.deviceLinkedElsewhere,
  }
  const noticeText: Record<Exclude<LinkNotice, null>, string> = {
    connecting: withEmail(copy.connecting),
    linked: copy.linked,
    failed: copy.failed,
    busy: copy.busy,
    mismatch: withEmail(copy.mismatch),
  }
  const isError = notice === 'failed' || notice === 'busy' || notice === 'mismatch'

  // Today says one thing: the outcome of a press, else why the card is here.
  // Settings keeps its status line, and explains only the states that ask
  // the user to act in the extension.
  const explains = variant === 'today' || status === 'other-account' || status === 'device-linked-elsewhere'
  const message = notice ? noticeText[notice] : explains ? explanation[status] : undefined

  return (
    <div
      data-link-status={status}
      className={`flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-line bg-surface px-4 py-3 ${
        variant === 'today' ? 'mb-8' : 'mt-6'
      }`}
    >
      <div className="min-w-0 max-w-[62ch] space-y-1">
        {variant === 'settings' && (
          <p className="text-body">
            <span className="text-label text-content-secondary">{copy.statusLabel}</span>
            <span className="ml-3 text-content">{statusLine[status]}</span>
          </p>
        )}
        {message && (
          <p
            role={isError ? 'alert' : notice ? 'status' : undefined}
            className={`text-caption leading-relaxed ${isError ? '' : 'text-content-secondary'}`}
            style={isError ? { color: 'var(--danger)' } : undefined}
          >
            {message}
          </p>
        )}
      </div>
      {status === 'unlinked' && (
        <button
          onClick={onConnect}
          disabled={notice === 'connecting'}
          className="pressable flex-shrink-0 rounded-md bg-accent px-4 py-2 text-label text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {withEmail(copy.connect)}
        </button>
      )}
    </div>
  )
}
