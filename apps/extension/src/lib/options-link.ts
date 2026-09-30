// The popup's site rows open the Options page on one domain's category:
//   …/src/options/index.html#categories/github.com
// Anyone can type a hash, so the domain is checked against hostname
// characters before it is used to prefill anything.
const HOSTNAME = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/

export function categoriesLink(domain: string): string {
  return `${chrome.runtime.getURL('src/options/index.html')}#categories/${domain}`
}

export function parseOptionsHash(hash: string): { tab: string | null; domain: string | null } {
  const [tab, domain] = hash.replace(/^#/, '').split('/')
  return {
    tab: tab || null,
    domain: domain && HOSTNAME.test(domain) ? domain : null,
  }
}
