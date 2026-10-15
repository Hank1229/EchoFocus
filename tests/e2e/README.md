# End-to-end tests

Playwright drives the built extension (`apps/extension/dist-vrt`, the same
build the visual suite loads) in a real Chromium, with no account and no
Supabase. `pnpm test:e2e` builds it, starts the web app's dev server on
127.0.0.1:3100 (the host the test build lists under `externally_connectable`;
`NEXT_PUBLIC_EXTENSION_IDS` is the dist-vrt ID, computed from its folder path
in `extension-id.ts`) and runs every spec here; CI runs the same command in the
Playwright image.

| Spec | Scenario |
| --- | --- |
| `tracking.spec.ts` | A2: only the focused tab is timed; entries match the dwell within a second; the popup shows the totals |
| `rules.spec.ts` | A3 / H12: five rules typed into Options against nine URLs; the two malformed rules are refused |
| `csv-export.spec.ts` | A6: the CSV floors minutes the way the popup does; the filename carries the local date |
| `delete-data.spec.ts` | A7: which keys "Delete all tracking data" removes and keeps; tracking resumes |
| `corrupt-aggregate.spec.ts` | A11: four corrupt `aggregates:<today>` shapes all show the empty state with no console error |
| `demo.spec.ts` | The public `/demo` in a browser with no extension: all eight pages open signed out with no console error, no request to Supabase (also for a visitor holding a dashboard session cookie, with a control showing the cookie works outside the demo), every write control disabled, every link inside `/demo` or to a public page, `noindex` on each page |
| `dashboard-link.spec.ts` | The dashboard's extension card on `/dev/preview/link`: signed out, same account, another account, a device linked elsewhere refusing, a link whose Google sign-in fails (Supabase is unreachable, so a link never succeeds here; that is a manual test), a non-dashboard page with no `chrome.runtime`, and no extension at all |

A12 (the dashboard preview pages log no console error) is an assertion
inside `tests/visual/dashboard.spec.ts`, which already starts the dev server.

The pomodoro walkthrough (A5) needs a whole focus round, five minutes at the
shortest setting, so it stays a manual test in `tests/exploratory/`.
