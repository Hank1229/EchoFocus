# End-to-end tests

Playwright drives the built extension (`apps/extension/dist-vrt`, the same
build the visual suite loads) in a real Chromium, with no account and no
Supabase. `pnpm test:e2e` builds it and runs every spec here; CI runs the
same command in the Playwright image.

| Spec | Scenario |
| --- | --- |
| `tracking.spec.ts` | A2: only the focused tab is timed; entries match the dwell within a second; the popup shows the totals |
| `rules.spec.ts` | A3 / H12: five rules typed into Options against nine URLs; the two malformed rules are refused |
| `csv-export.spec.ts` | A6: the CSV floors minutes the way the popup does; the filename carries the local date |
| `delete-data.spec.ts` | A7: which keys "Delete all tracking data" removes and keeps; tracking resumes |
| `corrupt-aggregate.spec.ts` | A11: four corrupt `aggregates:<today>` shapes all show the empty state with no console error |

A12 (the dashboard preview pages log no console error) is an assertion
inside `tests/visual/dashboard.spec.ts`, which already starts the dev server.

The pomodoro walkthrough (A5) needs a whole focus round, five minutes at the
shortest setting, so it stays a manual test in `tests/exploratory/`.
