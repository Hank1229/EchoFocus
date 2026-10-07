export type InsightLanguage = 'en' | 'zh-TW'

// Insights come in English or Traditional Chinese only. A Chinese one always
// has Han characters, and an English one never does: the model only ever
// sees domain names and numbers, so nothing Chinese can be quoted into it.
export function insightLanguage(text: string): InsightLanguage {
  return /[一-鿿]/.test(text) ? 'zh-TW' : 'en'
}
