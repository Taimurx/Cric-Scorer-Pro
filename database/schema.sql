-- ============================================================================
-- CRIC SCORER PRO — ENTERPRISE DATABASE ARCHITECTURE (POSTGRESQL 16 & BIGQUERY)
-- Semantic Schema Mapping Implementation
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
CREATE TYPE match_format_enum AS ENUM ('T20', 'ODI', 'TEST', 'THE_HUNDRED', 'T10', 'CUSTOM');
CREATE TYPE match_status_enum AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'INNINGS_BREAK', 'COMPLETED', 'ABANDONED', 'TIED');
CREATE TYPE toss_decision_enum AS ENUM ('BAT', 'BOWL');
CREATE TYPE extra_type_enum AS ENUM ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY', 'NONE');
CREATE TYPE dismissal_type_enum AS ENUM (
  'BOWLED',
  'CAUGHT',
  'LBW',
  'RUN_OUT',
  'STUMPED',
  'HIT_WICKET',
  'RETIRED_HURT',
  'RETIRED_OUT',
  'TIMED_OUT',
  'OBSTRUCTING_FIELD',
  'HIT_BALL_TWICE'
);
CREATE TYPE user_role_enum AS ENUM ('SUPER_ADMIN', 'ORGANIZER', 'OFFICIAL_SCORER', 'UMPIRE', 'VIEWER');

-- ============================================================================
-- 1. DIMENSION TABLES (MASTER DATA)
-- ============================================================================

-- Users & Authentication (Linked to Firebase UID / Supabase Auth)
CREATE TABLE IF NOT EXISTS dim_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(32),
  role user_role_enum NOT NULL DEFAULT 'VIEWER',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tournaments Master
CREATE TABLE IF NOT EXISTS dim_tournaments (
  tournament_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES dim_users(user_id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  season VARCHAR(50),
  format match_format_enum NOT NULL DEFAULT 'T20',
  scheduled_overs INT NOT NULL DEFAULT 20 CHECK (scheduled_overs >= 1),
  location VARCHAR(200),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Teams Master
CREATE TABLE IF NOT EXISTS dim_teams (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  short_code VARCHAR(10) NOT NULL,
  logo_url TEXT,
  city VARCHAR(100),
  created_by UUID REFERENCES dim_users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Players Master
CREATE TABLE IF NOT EXISTS dim_players (
  player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  primary_team_id UUID REFERENCES dim_teams(team_id) ON DELETE SET NULL,
  batting_hand VARCHAR(20) NOT NULL DEFAULT 'RIGHT_HAND' CHECK (batting_hand IN ('RIGHT_HAND', 'LEFT_HAND')),
  bowling_style VARCHAR(50) DEFAULT 'RIGHT_ARM_MEDIUM',
  is_wicketkeeper BOOLEAN NOT NULL DEFAULT FALSE,
  jersey_number INT CHECK (jersey_number BETWEEN 0 AND 99),
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Team Squad Roster (Many-to-Many Bridge)
CREATE TABLE IF NOT EXISTS dim_team_rosters (
  team_id UUID NOT NULL REFERENCES dim_teams(team_id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES dim_players(player_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, player_id)
);

-- ============================================================================
-- 2. FACT TABLES (TRANSACTIONAL OPERATIONAL ENGINE)
-- ============================================================================

-- Matches (Anchor Entity)
CREATE TABLE IF NOT EXISTS fact_matches (
  match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_key VARCHAR(64) NOT NULL UNIQUE,
  tournament_id UUID REFERENCES dim_tournaments(tournament_id) ON DELETE SET NULL,
  home_team_id UUID NOT NULL REFERENCES dim_teams(team_id),
  away_team_id UUID NOT NULL REFERENCES dim_teams(team_id),
  venue VARCHAR(200) NOT NULL DEFAULT 'Standard Cricket Ground',
  scheduled_overs INT NOT NULL DEFAULT 20 CHECK (scheduled_overs >= 1),
  players_per_team INT NOT NULL DEFAULT 11 CHECK (players_per_team BETWEEN 2 AND 11),
  toss_winner_team_id UUID REFERENCES dim_teams(team_id),
  toss_decision toss_decision_enum,
  match_status match_status_enum NOT NULL DEFAULT 'SCHEDULED',
  result_summary TEXT,
  winner_team_id UUID REFERENCES dim_teams(team_id),
  player_of_the_match_id UUID REFERENCES dim_players(player_id),
  primary_scorer_id UUID REFERENCES dim_users(user_id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_teams_distinct CHECK (home_team_id <> away_team_id)
);

-- Match Innings
CREATE TABLE IF NOT EXISTS fact_match_innings (
  innings_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES fact_matches(match_id) ON DELETE CASCADE,
  innings_number INT NOT NULL CHECK (innings_number IN (1, 2, 3, 4)),
  batting_team_id UUID NOT NULL REFERENCES dim_teams(team_id),
  bowling_team_id UUID NOT NULL REFERENCES dim_teams(team_id),
  total_runs INT NOT NULL DEFAULT 0 CHECK (total_runs >= 0),
  total_wickets INT NOT NULL DEFAULT 0 CHECK (total_wickets BETWEEN 0 AND 10),
  legal_balls_bowled INT NOT NULL DEFAULT 0 CHECK (legal_balls_bowled >= 0),
  wide_runs INT NOT NULL DEFAULT 0 CHECK (wide_runs >= 0),
  no_ball_runs INT NOT NULL DEFAULT 0 CHECK (no_ball_runs >= 0),
  bye_runs INT NOT NULL DEFAULT 0 CHECK (bye_runs >= 0),
  leg_bye_runs INT NOT NULL DEFAULT 0 CHECK (leg_bye_runs >= 0),
  penalty_runs INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, innings_number)
);

-- Ball Events (Event-Sourcing Ledger: Append-only, Immutable)
CREATE TABLE IF NOT EXISTS fact_ball_events (
  ball_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES fact_match_innings(innings_id) ON DELETE CASCADE,
  over_number INT NOT NULL CHECK (over_number >= 0),
  ball_in_over INT NOT NULL CHECK (ball_in_over BETWEEN 1 AND 20),
  is_legal_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  bowler_id UUID NOT NULL REFERENCES dim_players(player_id),
  striker_id UUID NOT NULL REFERENCES dim_players(player_id),
  non_striker_id UUID NOT NULL REFERENCES dim_players(player_id),
  runs_off_bat INT NOT NULL DEFAULT 0 CHECK (runs_off_bat BETWEEN 0 AND 6),
  extra_type extra_type_enum NOT NULL DEFAULT 'NONE',
  extra_runs INT NOT NULL DEFAULT 0 CHECK (extra_runs >= 0),
  total_runs INT NOT NULL GENERATED ALWAYS AS (runs_off_bat + extra_runs) STORED,
  is_wicket BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_player_id UUID REFERENCES dim_players(player_id),
  dismissal_type dismissal_type_enum,
  fielder_id UUID REFERENCES dim_players(player_id),
  commentary TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Player Batting Scorecards
CREATE TABLE IF NOT EXISTS fact_player_batting_scorecards (
  scorecard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES fact_match_innings(innings_id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES dim_players(player_id),
  batting_position INT NOT NULL CHECK (batting_position BETWEEN 1 AND 11),
  runs_scored INT NOT NULL DEFAULT 0 CHECK (runs_scored >= 0),
  balls_faced INT NOT NULL DEFAULT 0 CHECK (balls_faced >= 0),
  fours INT NOT NULL DEFAULT 0 CHECK (fours >= 0),
  sixes INT NOT NULL DEFAULT 0 CHECK (sixes >= 0),
  dot_balls INT NOT NULL DEFAULT 0 CHECK (dot_balls >= 0),
  is_out BOOLEAN NOT NULL DEFAULT FALSE,
  dismissal_type dismissal_type_enum,
  bowler_id UUID REFERENCES dim_players(player_id),
  fielder_id UUID REFERENCES dim_players(player_id),
  strike_rate NUMERIC(6, 2) GENERATED ALWAYS AS (
    CASE WHEN balls_faced > 0 THEN ROUND((runs_scored::NUMERIC / balls_faced::NUMERIC) * 100.0, 2) ELSE 0.00 END
  ) STORED,
  UNIQUE(innings_id, player_id)
);

-- Player Bowling Scorecards
CREATE TABLE IF NOT EXISTS fact_player_bowling_scorecards (
  scorecard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES fact_match_innings(innings_id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES dim_players(player_id),
  legal_balls_bowled INT NOT NULL DEFAULT 0 CHECK (legal_balls_bowled >= 0),
  maidens INT NOT NULL DEFAULT 0 CHECK (maidens >= 0),
  runs_conceded INT NOT NULL DEFAULT 0 CHECK (runs_conceded >= 0),
  wickets INT NOT NULL DEFAULT 0 CHECK (wickets BETWEEN 0 AND 10),
  wide_balls INT NOT NULL DEFAULT 0 CHECK (wide_balls >= 0),
  no_balls INT NOT NULL DEFAULT 0 CHECK (no_balls >= 0),
  economy_rate NUMERIC(6, 2) GENERATED ALWAYS AS (
    CASE WHEN legal_balls_bowled > 0 THEN ROUND(runs_conceded::NUMERIC / (legal_balls_bowled::NUMERIC / 6.0), 2) ELSE 0.00 END
  ) STORED,
  UNIQUE(innings_id, player_id)
);

-- Fall of Wickets
CREATE TABLE IF NOT EXISTS fact_fall_of_wickets (
  fow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES fact_match_innings(innings_id) ON DELETE CASCADE,
  wicket_number INT NOT NULL CHECK (wicket_number BETWEEN 1 AND 10),
  team_score INT NOT NULL CHECK (team_score >= 0),
  overs_str VARCHAR(10) NOT NULL,
  player_out_id UUID NOT NULL REFERENCES dim_players(player_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(innings_id, wicket_number)
);

-- ============================================================================
-- 3. INDEXES FOR ENTERPRISE OLTP PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON fact_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON fact_matches(match_status);
CREATE INDEX IF NOT EXISTS idx_innings_match ON fact_match_innings(match_id);
CREATE INDEX IF NOT EXISTS idx_ball_events_innings ON fact_ball_events(innings_id, over_number);
CREATE INDEX IF NOT EXISTS idx_batting_player ON fact_player_batting_scorecards(player_id);
CREATE INDEX IF NOT EXISTS idx_bowling_player ON fact_player_bowling_scorecards(player_id);
CREATE INDEX IF NOT EXISTS idx_team_rosters_player ON dim_team_rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON dim_players(primary_team_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON dim_tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON dim_teams(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON fact_matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON fact_matches(away_team_id);

-- ============================================================================
-- 3.5. TRIGGERS FOR AUTO UPDATING updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_dim_users_updated_at BEFORE UPDATE ON dim_users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_dim_tournaments_updated_at BEFORE UPDATE ON dim_tournaments FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_dim_teams_updated_at BEFORE UPDATE ON dim_teams FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_dim_players_updated_at BEFORE UPDATE ON dim_players FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_fact_matches_updated_at BEFORE UPDATE ON fact_matches FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_fact_match_innings_updated_at BEFORE UPDATE ON fact_match_innings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- 4. ANALYTICAL VIEWS (NET RUN RATE & STANDINGS)
-- ============================================================================
CREATE OR REPLACE VIEW vw_tournament_standings AS
WITH match_stats AS (
  SELECT
    m.tournament_id,
    inn.batting_team_id AS team_id,
    COUNT(DISTINCT m.match_id) AS matches_played,
    SUM(CASE WHEN m.winner_team_id = inn.batting_team_id THEN 1 ELSE 0 END) AS won,
    SUM(CASE WHEN m.winner_team_id IS NOT NULL AND m.winner_team_id <> inn.batting_team_id AND m.match_status = 'COMPLETED' THEN 1 ELSE 0 END) AS lost,
    SUM(CASE WHEN m.match_status = 'TIED' THEN 1 ELSE 0 END) AS tied,
    SUM(inn.total_runs) AS runs_scored,
    SUM(inn.legal_balls_bowled) AS balls_faced,
    SUM(opp.total_runs) AS runs_conceded,
    SUM(opp.legal_balls_bowled) AS balls_bowled
  FROM fact_matches m
  JOIN fact_match_innings inn ON m.match_id = inn.match_id
  LEFT JOIN fact_match_innings opp ON m.match_id = opp.match_id AND opp.innings_id <> inn.innings_id
  WHERE m.tournament_id IS NOT NULL AND m.match_status IN ('COMPLETED', 'TIED')
  GROUP BY m.tournament_id, inn.batting_team_id
)
SELECT
  s.tournament_id,
  s.team_id,
  t.name AS team_name,
  s.matches_played,
  s.won,
  s.lost,
  s.tied,
  (s.won * 2 + s.tied * 1) AS points,
  ROUND(
    (COALESCE(s.runs_scored::NUMERIC / NULLIF(s.balls_faced::NUMERIC / 6.0, 0), 0)) -
    (COALESCE(s.runs_conceded::NUMERIC / NULLIF(s.balls_bowled::NUMERIC / 6.0, 0), 0)),
    3
  ) AS net_run_rate
FROM match_stats s
JOIN dim_teams t ON s.team_id = t.team_id
ORDER BY points DESC, net_run_rate DESC;
