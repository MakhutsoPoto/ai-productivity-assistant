-- Add preferred name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Add transcript column to meeting_summaries for audio-derived summaries
ALTER TABLE public.meeting_summaries ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Scheduled meetings table for in-app reminders
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_meetings TO authenticated;
GRANT ALL ON public.scheduled_meetings TO service_role;

ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own meetings" ON public.scheduled_meetings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_user_starts ON public.scheduled_meetings(user_id, starts_at);

-- Private storage bucket for uploaded meeting audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-audio', 'meeting-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Per-user folder policies: files stored under {user_id}/{filename}
CREATE POLICY "users read own meeting audio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users upload own meeting audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own meeting audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
