-- Enhanced database setup with proper indexes and constraints
-- Run this script in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create players table with enhanced constraints
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT NOT NULL UNIQUE CHECK (length(nickname) >= 1 AND length(nickname) <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_scores table with enhanced constraints and indexes
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (length(nickname) >= 1 AND length(nickname) <= 50),
  score INTEGER NOT NULL CHECK (score >= 0),
  word_count INTEGER NOT NULL CHECK (word_count >= 0),
  time_taken INTEGER NOT NULL CHECK (time_taken >= 0 AND time_taken <= 300),
  main_word TEXT NOT NULL CHECK (length(main_word) >= 3 AND length(main_word) <= 50),
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create optimized indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_game_scores_score_desc ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_word_count_desc ON game_scores(word_count DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_player_id ON game_scores(player_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_level ON game_scores(level);
CREATE INDEX IF NOT EXISTS idx_players_nickname ON players(nickname);

-- Enable Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a public game)
CREATE POLICY "Allow public read access to players" ON players
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to players" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to game_scores" ON game_scores
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to game_scores" ON game_scores
  FOR INSERT WITH CHECK (true);

-- Enable realtime for game_scores table
ALTER PUBLICATION supabase_realtime ADD TABLE game_scores;

-- Create a function to clean up old scores (optional)
CREATE OR REPLACE FUNCTION cleanup_old_scores()
RETURNS void AS $$
BEGIN
  -- Keep only the top 1000 scores by score
  DELETE FROM game_scores 
  WHERE id NOT IN (
    SELECT id FROM game_scores 
    ORDER BY score DESC 
    LIMIT 1000
  );
  
  -- Keep only the top 1000 scores by word count
  DELETE FROM game_scores 
  WHERE id NOT IN (
    SELECT id FROM game_scores 
    ORDER BY word_count DESC 
    LIMIT 1000
  );
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO players (nickname) VALUES 
  ('TestPlayer1'),
  ('TestPlayer2'),
  ('TestPlayer3')
ON CONFLICT (nickname) DO NOTHING;

-- Insert sample game scores
WITH sample_players AS (
  SELECT id, nickname FROM players WHERE nickname LIKE 'TestPlayer%'
)
INSERT INTO game_scores (player_id, nickname, score, word_count, time_taken, main_word, level)
SELECT 
  p.id,
  p.nickname,
  (random() * 2000 + 500)::integer,
  (random() * 25 + 5)::integer,
  (random() * 60 + 30)::integer,
  'TESTING',
  (random() * 5 + 1)::integer
FROM sample_players p
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 'Players table created' as status, count(*) as count FROM players;
SELECT 'Game scores table created' as status, count(*) as count FROM game_scores;
