import { describe, expect, it } from 'vitest'
import { metadata } from './layout'

describe('/demo metadata', () => {
  it('keeps the sample data out of search engines', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
