-- Theme preference and pomodoro settings ride the existing per-column
-- preferences sync. Purely additive: no existing column, RLS policy, or API
-- contract changes. Defaults reproduce the behavior users already have
-- (follow the OS, 25/5 rounds, reminders on), so accounts that never touch
-- the new settings are unaffected.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS pomodoro_focus_minutes INT NOT NULL DEFAULT 25
    CHECK (pomodoro_focus_minutes BETWEEN 1 AND 240),
  ADD COLUMN IF NOT EXISTS pomodoro_break_minutes INT NOT NULL DEFAULT 5
    CHECK (pomodoro_break_minutes BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS pomodoro_reminders_enabled BOOLEAN NOT NULL DEFAULT true;
