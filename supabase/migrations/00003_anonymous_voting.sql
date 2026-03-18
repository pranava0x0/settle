-- Allow anonymous voting: make phone nullable for anonymous users
-- Anonymous users are created via Supabase anonymous sign-in with no phone number.
-- Their profile row needs to exist (created by handle_new_user trigger) but phone can be NULL.

ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;

-- The handle_new_user trigger already inserts NEW.phone which is NULL for anonymous users.
-- The UNIQUE constraint on phone allows multiple NULLs (Postgres default behavior).
-- RLS vote insert policy (auth.uid() = user_id) works for anonymous users since they get auth.uid().
