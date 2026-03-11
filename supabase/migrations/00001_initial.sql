-- Settle: Initial schema
-- Tables: users (profiles), disputes, votes
-- RLS: public read for disputes, auth-only voting, one vote per user

-- Enum for dispute status
CREATE TYPE dispute_status AS ENUM ('open', 'closed', 'expired');

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disputes (the questions being debated)
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  side_a TEXT NOT NULL,
  side_b TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  winner_side TEXT CHECK (winner_side IN ('a', 'b')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Votes (one per user per dispute)
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('a', 'b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dispute_id, user_id)
);

-- Indexes
CREATE INDEX idx_disputes_slug ON public.disputes(slug);
CREATE INDEX idx_disputes_creator ON public.disputes(creator_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_votes_dispute ON public.votes(dispute_id);
CREATE INDEX idx_votes_user ON public.votes(user_id);

-- RLS: Enable on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile, insert own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Disputes: anyone can read (for link sharing), only auth users can create
CREATE POLICY "Anyone can read disputes"
  ON public.disputes FOR SELECT
  USING (true);

CREATE POLICY "Auth users can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update own disputes"
  ON public.disputes FOR UPDATE
  USING (auth.uid() = creator_id);

-- Votes: auth users can read votes on any dispute, insert-only (no update/delete)
CREATE POLICY "Anyone can read votes"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "Auth users can vote"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone)
  VALUES (NEW.id, NEW.phone)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
