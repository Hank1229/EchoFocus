// Focus-score tiers. The score is the only number in the product that carries
// an emotional reading, so the numeral itself is tiered: emerald reads as a
// reward, teal as steady, slate as quiet. Red/orange never mark a score —
// orange belongs to the Breaks & Browsing category.
export type ScoreTier = 'strong' | 'steady' | 'quiet'

export function scoreTier(score: number): ScoreTier {
  if (score >= 70) return 'strong'
  if (score >= 40) return 'steady'
  return 'quiet'
}

// Token-based color for restyled surfaces. The low tier sits on
// --text-secondary, not tertiary: a stat numeral is essential content and
// tertiary fails contrast on the light theme.
const COLOR_VAR: Record<ScoreTier, string> = {
  strong: 'var(--productive)',
  steady: 'var(--accent)',
  quiet: 'var(--text-secondary)',
}

export function scoreColorVar(score: number) {
  return COLOR_VAR[scoreTier(score)]
}
