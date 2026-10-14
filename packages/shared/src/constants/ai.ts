// The least tracked time a day needs before it is worth an AI analysis. Below
// it the Dashboard does not call the ai-analyze function, the extension's
// evening alarm skips the day, and the function itself answers
// { insufficient: true } without spending a generation or calling Gemini.
//
// supabase/functions/ai-analyze/index.ts imports this file by relative path
// (Deno bundles it with the function), so it must stay free of other imports.
export const MIN_TRACKED_SECONDS_FOR_ANALYSIS = 30 * 60
