# Implementation Plan

Build in 4 phases. Stop between phases for review.

## Phase 1 — Fix auth verification issues

Audit and fix the current signup/password-reset flow:
- Ensure email confirmation is required (no auto-confirm) and the signup flow shows a clear "check your email" state instead of silently failing.
- Fix `reset-password.tsx` so it handles the Supabase recovery link correctly: detect the `PASSWORD_RECOVERY` auth event / hash tokens on mount, only allow setting a new password when a recovery session exists, and show a clear error if the link expired.
- Add an "email not confirmed" error path on sign in with a "resend confirmation" action.
- Verify the redirect URL used by `resetPasswordForEmail` points to `/reset-password` on the current origin.

## Phase 2 — AI features polish (Gemini already wired)

The Gemini gateway and 5 server functions (email, notes, tasks, research, chat) already exist via Lovable AI Gateway using `google/gemini-3-flash-preview`. Add the UX layer the user asked for:
- **Example prompt library**: each feature page (email, notes, tasks, research, chat) gets 3–5 curated example prompts shown as clickable chips that fill the form.
- **Customize prompts**: clicking a chip loads it into the input where the user can edit before sending.
- **Custom prompt option**: a "Write your own" chip that clears the form for free-form input.
- **Mothusi name onboarding**: first time a user opens chat, Mothusi asks "Hey Friend, Mothusi here, what name do you prefer?" Store the chosen name in `profiles.display_name` (or a new `preferred_name` column). All future chat replies start with "Hey [name]". Implemented by injecting the name into the chat system prompt and adding a one-time onboarding message when the user has no chat threads yet.

## Phase 3 — Meetings upgrade

Extend the notes page into a full meetings workflow:
- **Audio upload → transcribe → summarize**: add a file upload (mp3/wav/m4a/webm) to `/app/notes`. Store the file in a new private Supabase storage bucket `meeting-audio`. A new server function transcribes the audio via Gemini (multimodal audio input on `gemini-2.5-flash`), then feeds the transcript into the existing `summarizeMeeting`. Show transcript + summary side by side.
- **TTS playback of summary**: a "Listen" button on each summary uses the browser's `SpeechSynthesis` API to read it aloud (no extra cost, no backend). Play/pause/stop controls.
- **Scheduled meetings + 30-min reminders**: new `scheduled_meetings` table (title, starts_at, notes). A new `/app/meetings` page lists upcoming meetings with create/edit/delete. In-app toast reminders fire 30 minutes before `starts_at` using a polling hook on the authenticated layout (checks every 60s, dedupes via localStorage so each meeting fires once per browser).

## Phase 4 — Wire-up + verify

- Add navigation links in the sidebar for the new meetings page.
- Smoke-test each feature end-to-end in the preview.
- Confirm RLS on the new tables/bucket scopes everything to `auth.uid()`.

## Technical notes

- **DB changes** (Phase 2–3): add `preferred_name text` to `profiles`; create `scheduled_meetings` table with RLS; create `meeting-audio` storage bucket with per-user folder RLS; optionally add `transcript text` column to `meeting_summaries`.
- **Server functions**: new `transcribeAudio` server fn using Gemini multimodal; reuse existing `summarizeMeeting`. All under `requireSupabaseAuth`.
- **Reminders**: client-side polling hook in `_authenticated` layout — no cron, no edge function (matches user's "in-app toast only" choice).
- **No new secrets needed** — `LOVABLE_API_KEY` already covers Gemini calls including audio transcription.

## Open questions

1. For the **preferred name**, should it overwrite `profiles.display_name`, or live in a separate `preferred_name` column so the original display name is preserved?
2. For **audio transcription**, max file size — cap at 25 MB (≈30 min audio) to keep gateway calls fast?
