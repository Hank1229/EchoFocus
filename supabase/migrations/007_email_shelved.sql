-- EchoFocus — 007: email reports are shelved; the flag should say so
--
-- The feature has never run (no scheduler, UI hidden), yet the column
-- defaulted every account into it. Until a real sending domain exists and the
-- feature returns with its own opt-in flow, nobody is "enabled".

ALTER TABLE public.user_preferences
  ALTER COLUMN email_report_enabled SET DEFAULT FALSE;

UPDATE public.user_preferences
   SET email_report_enabled = FALSE
 WHERE email_report_enabled = TRUE;
