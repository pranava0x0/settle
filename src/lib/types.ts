import type { SquabbleStatus, VoteSide } from "./constants";

export type User = {
  id: string;
  phone: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Squabble = {
  id: string;
  slug: string;
  creator_id: string;
  question: string;
  side_a: string;
  side_b: string;
  status: SquabbleStatus;
  winner_side: VoteSide | null;
  expires_at: string;
  created_at: string;
  closed_at: string | null;
};

export type Vote = {
  id: string;
  dispute_id: string;
  user_id: string;
  side: VoteSide;
  created_at: string;
};

export type SquabbleWithVotes = Squabble & {
  votes: Vote[];
  vote_count_a: number;
  vote_count_b: number;
  total_votes: number;
};
