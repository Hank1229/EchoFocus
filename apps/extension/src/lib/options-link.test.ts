import { describe, it, expect } from 'vitest'
import { categoriesLink, parseOptionsHash } from './options-link'

describe('options link', () => {
  it('round-trips a domain through the Categories link', () => {
    const hash = new URL(categoriesLink('docs.google.com')).hash
    expect(parseOptionsHash(hash)).toEqual({ tab: 'categories', domain: 'docs.google.com' })
  })

  it('opens the tab alone when no domain follows', () => {
    expect(parseOptionsHash('#categories')).toEqual({ tab: 'categories', domain: null })
    expect(parseOptionsHash('')).toEqual({ tab: null, domain: null })
  })

  it('drops anything that is not a hostname', () => {
    expect(parseOptionsHash('#categories/<img src=x>').domain).toBeNull()
    expect(parseOptionsHash('#categories/GitHub.com').domain).toBeNull()
    expect(parseOptionsHash('#categories/-github.com').domain).toBeNull()
  })
})
