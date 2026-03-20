-- Fix handle_new_user trigger for anonymous users.
-- Problem: Supabase sets auth.users.phone to '' (empty string) for anonymous users,
-- which violates the UNIQUE constraint on public.users.phone when multiple anonymous
-- users sign up. Fix: NULLIF to convert empty string to NULL (Postgres UNIQUE allows multiple NULLs).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone)
  VALUES (NEW.id, NULLIF(NEW.phone, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
