import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { connectExtension, detectExtension, extensionIds, STATUS_TIMEOUT_MS } from './extension-link'

const USER = '11111111-1111-4111-8111-111111111111'

type Answer = { reply?: unknown; lastError?: boolean; never?: boolean; throws?: boolean }
let answers: Record<string, Answer>
let sent: Array<{ id: string; message: unknown }>

function installRuntime(): void {
  const runtime: { lastError?: unknown; sendMessage: (id: string, message: unknown, cb: (r: unknown) => void) => void } = {
    sendMessage(id, message, callback) {
      sent.push({ id, message })
      const answer = answers[id] ?? { lastError: true }
      if (answer.throws) throw new Error('Invalid extension id')
      if (answer.never) return
      setTimeout(() => {
        runtime.lastError = answer.lastError ? { message: 'Could not establish connection.' } : undefined
        callback(answer.lastError ? undefined : answer.reply)
        runtime.lastError = undefined
      }, 10)
    },
  }
  ;(globalThis as { chrome?: unknown }).chrome = { runtime }
}

beforeEach(() => {
  answers = {}
  sent = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  delete (globalThis as { chrome?: unknown }).chrome
})

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(STATUS_TIMEOUT_MS + 100)
  return promise
}

describe('extensionIds', () => {
  it('reads a comma-separated list and ignores blanks', () => {
    expect(extensionIds(' abc , ,def,')).toEqual(['abc', 'def'])
    expect(extensionIds('')).toEqual([])
    expect(extensionIds(undefined)).toEqual([])
  })
})

describe('detectExtension', () => {
  it('is not-installed when the page has no chrome.runtime', async () => {
    expect(await detectExtension(USER, ['abc'])).toEqual({ status: 'not-installed' })
  })

  it('is not-installed with no configured ID', async () => {
    installRuntime()
    expect(await detectExtension(USER, [])).toEqual({ status: 'not-installed' })
  })

  it('asks every ID for its status with this user', async () => {
    installRuntime()
    answers.abc = { reply: { ok: true, version: '1.0.0', signedIn: false, sameAccount: null } }
    expect(await settle(detectExtension(USER, ['abc']))).toEqual({ status: 'unlinked', extensionId: 'abc' })
    expect(sent).toEqual([{ id: 'abc', message: { v: 1, type: 'ECHOFOCUS_STATUS', userId: USER } }])
  })

  it('tells linked from another account', async () => {
    installRuntime()
    answers.abc = { reply: { ok: true, signedIn: true, sameAccount: true } }
    answers.def = { reply: { ok: true, signedIn: true, sameAccount: false } }
    expect(await settle(detectExtension(USER, ['abc']))).toEqual({ status: 'linked', extensionId: 'abc' })
    expect(await settle(detectExtension(USER, ['def']))).toEqual({ status: 'other-account', extensionId: 'def' })
  })

  it('a lastError, a throw, a timeout or a malformed reply all count as not-installed', async () => {
    installRuntime()
    answers.gone = { lastError: true }
    answers.bad = { throws: true }
    answers.slow = { never: true }
    answers.odd = { reply: { ok: true } }
    expect(await settle(detectExtension(USER, ['gone', 'bad', 'slow', 'odd']))).toEqual({ status: 'not-installed' })
  })

  it('the first ID to answer is the target', async () => {
    installRuntime()
    answers.slow = { never: true }
    answers.dev = { reply: { ok: true, signedIn: false } }
    expect(await settle(detectExtension(USER, ['slow', 'dev']))).toEqual({ status: 'unlinked', extensionId: 'dev' })
  })
})

describe('connectExtension', () => {
  it('sends CONNECT with the user and email', async () => {
    installRuntime()
    answers.abc = { reply: { ok: true } }
    expect(await settle(connectExtension('abc', USER, 'me@example.com'))).toBe('linked')
    expect(sent).toEqual([{ id: 'abc', message: { v: 1, type: 'ECHOFOCUS_CONNECT', userId: USER, email: 'me@example.com' } }])
  })

  it.each([
    ['already', 'linked'],
    ['other-account', 'other-account'],
    ['device-linked-elsewhere', 'device-linked-elsewhere'],
    ['busy', 'busy'],
    ['mismatch', 'mismatch'],
    ['failed', 'failed'],
    ['bad-request', 'failed'],
    ['constructor', 'failed'],
  ])('reason %s → %s', async (reason, expected) => {
    installRuntime()
    answers.abc = { reply: { ok: false, reason } }
    expect(await settle(connectExtension('abc', USER, 'me@example.com'))).toBe(expected)
  })

  it('no runtime or no reply is failed', async () => {
    expect(await connectExtension('abc', USER, 'me@example.com')).toBe('failed')
    installRuntime()
    answers.abc = { lastError: true }
    expect(await settle(connectExtension('abc', USER, 'me@example.com'))).toBe('failed')
  })
})
