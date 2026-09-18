import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installChromeStub } from '../test/chrome-stub'
import { sendMessage } from './messaging'

function answerWith(reply: unknown): void {
  ;(chrome.runtime as unknown as { sendMessage: unknown }).sendMessage = vi.fn(async () => reply)
}

function failWith(err: Error): void {
  ;(chrome.runtime as unknown as { sendMessage: unknown }).sendMessage = vi.fn(async () => {
    throw err
  })
}

beforeEach(() => {
  installChromeStub()
})

describe('sendMessage', () => {
  it('hands back the worker envelope unchanged', async () => {
    answerWith({ success: true, data: { idleTimeoutMinutes: 5 } })
    expect(await sendMessage('GET_SETTINGS')).toEqual({ success: true, data: { idleTimeoutMinutes: 5 } })
  })

  it('reports a refusal as a refusal, not as missing data', async () => {
    answerWith({ success: false, error: 'Invalid settings payload' })

    const response = await sendMessage('SAVE_SETTINGS', { nope: true })

    expect(response?.success).toBe(false)
    expect(response?.error).toBe('Invalid settings payload')
  })

  it('returns null when the message never reaches the worker', async () => {
    failWith(new Error('Could not establish connection'))
    expect(await sendMessage('SAVE_SETTINGS')).toBeNull()
  })

  it('returns null when the worker answers with nothing at all', async () => {
    answerWith(undefined)
    expect(await sendMessage('SAVE_SETTINGS')).toBeNull()
  })
})
