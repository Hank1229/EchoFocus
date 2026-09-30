import { describe, it, expect } from 'vitest'
import { isDarkIcon } from './icon-tone'

function pixels(...rgba: [number, number, number, number][]): Uint8ClampedArray {
  return new Uint8ClampedArray(rgba.flat())
}

describe('isDarkIcon', () => {
  it('flags a black mark on a transparent ground, like GitHub cached in light mode', () => {
    expect(isDarkIcon(pixels([0, 0, 0, 255], [24, 23, 23, 255], [0, 0, 0, 0], [255, 255, 255, 0]))).toBe(true)
  })

  it('leaves colored and light icons alone', () => {
    expect(isDarkIcon(pixels([255, 0, 51, 255], [255, 255, 255, 255]))).toBe(false)
    expect(isDarkIcon(pixels([244, 128, 36, 255]))).toBe(false)
  })

  it('treats a fully transparent or empty icon as not dark', () => {
    expect(isDarkIcon(pixels([0, 0, 0, 0]))).toBe(false)
    expect(isDarkIcon(new Uint8ClampedArray())).toBe(false)
  })
})
