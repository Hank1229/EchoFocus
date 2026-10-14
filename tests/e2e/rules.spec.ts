import { test, expect, openExtensionPage, openSite, waitForSession, storage } from './support'

// A3: five rules typed into the Options form, nine URLs against them. Two of
// the five contradict their match type (an exact pattern with a path, a
// wildcard without "*."); since A3 / H12 the form refuses them, so they must
// not reach storage and the URLs they would have covered stay uncategorized.
const RULES = [
  { pattern: 'exact.example.com', matchType: 'exact', category: 'productive', saved: true },
  { pattern: '*.wild.example.com', matchType: 'wildcard', category: 'distraction', saved: true },
  { pattern: 'example.com/docs', matchType: 'path', category: 'productive', saved: true },
  { pattern: 'pathy.example.com/blog', matchType: 'exact', category: 'distraction', saved: false, error: "A domain pattern can't contain a slash" },
  { pattern: 'bare.example.com', matchType: 'wildcard', category: 'neutral', saved: false, error: 'A wildcard pattern has to start with *.' },
] as const

const VISITS = [
  { url: 'https://exact.example.com/anything', expected: 'productive' },      // exact rule
  { url: 'https://www.exact.example.com/', expected: 'productive' },          // exact rule, www. stripped
  { url: 'https://a.wild.example.com/', expected: 'distraction' },            // wildcard subdomain
  { url: 'https://wild.example.com/', expected: 'distraction' },              // wildcard base host
  { url: 'https://example.com/docs/intro', expected: 'productive' },          // path rule prefix
  { url: 'https://example.com/other', expected: 'uncategorized' },            // path rule does not cover /other
  { url: 'https://pathy.example.com/blog', expected: 'uncategorized' },       // the rejected exact-with-path rule
  { url: 'https://bare.example.com/', expected: 'uncategorized' },            // the rejected bare wildcard rule
  { url: 'https://sub.bare.example.com/', expected: 'uncategorized' },        // same, subdomain
]

test('rules typed into Options classify visits; malformed ones are refused (A3 / H12)', async ({ extension }) => {
  const options = await openExtensionPage(extension, 'src/options/index.html#categories', { width: 900, height: 900 })
  const pattern = options.getByPlaceholder('e.g. notion.so or *.google.com')
  await expect(pattern).toBeVisible()

  for (const rule of RULES) {
    await pattern.fill(rule.pattern)
    await options.locator('select').nth(0).selectOption(rule.matchType)
    await options.locator('select').nth(1).selectOption(rule.category)
    await options.getByRole('button', { name: 'Add rule' }).click()
    if (rule.saved) {
      await expect(options.getByText('Saved')).toBeVisible()
      await expect(pattern).toHaveValue('')
    } else {
      await expect(options.getByRole('alert')).toContainText(rule.error)
      // The refused pattern stays in the field for the user to fix.
      await expect(pattern).toHaveValue(rule.pattern)
    }
  }

  const { custom_rules } = await storage(extension.worker, 'custom_rules') as { custom_rules: { pattern: string; matchType: string }[] }
  expect(custom_rules.map(r => `${r.pattern}|${r.matchType}`).sort())
    .toEqual(RULES.filter(r => r.saved).map(r => `${r.pattern}|${r.matchType}`).sort())
  await expect(options.getByText(`Custom rules (${custom_rules.length})`)).toBeVisible()

  // The category is decided when the session opens, so each visit only has
  // to be seen by the worker, not dwelt on.
  for (const visit of VISITS) {
    const site = await openSite(extension, visit.url)
    const state = await waitForSession(extension.worker, visit.url)
    expect(state.activeCategory, visit.url).toBe(visit.expected)
    await site.close()
  }
})
