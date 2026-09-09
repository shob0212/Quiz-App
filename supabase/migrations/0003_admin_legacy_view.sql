-- Let the "admin" account (profiles.display_name = 'admin') see legacy
-- history/quiz_sessions rows that predate per-user ownership (user_id IS NULL),
-- in addition to their own rows. Regular users are unaffected.

CREATE POLICY "History select legacy for admin" ON public.history
  FOR SELECT USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.display_name) = 'admin'
    )
  );

CREATE POLICY "Quiz sessions select legacy for admin" ON public.quiz_sessions
  FOR SELECT USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.display_name) = 'admin'
    )
  );
