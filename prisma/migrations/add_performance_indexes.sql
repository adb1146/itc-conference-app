-- Add indexes for faster session queries
CREATE INDEX IF NOT EXISTS idx_sessions_track ON "Session"(track);
CREATE INDEX IF NOT EXISTS idx_sessions_startTime ON "Session"("startTime");
CREATE INDEX IF NOT EXISTS idx_sessions_location ON "Session"(location);
CREATE INDEX IF NOT EXISTS idx_sessions_level ON "Session"(level);

-- Add GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_session_tags ON "Session" USING GIN (tags);

-- Add indexes for faster speaker queries
CREATE INDEX IF NOT EXISTS idx_speakers_company ON "Speaker"(company);
CREATE INDEX IF NOT EXISTS idx_speakers_role ON "Speaker"(role);
CREATE INDEX IF NOT EXISTS idx_speakers_name ON "Speaker"(name);

-- Add GIN index for expertise array search
CREATE INDEX IF NOT EXISTS idx_speaker_expertise ON "Speaker" USING GIN (expertise);

-- Add composite indexes for common join patterns
CREATE INDEX IF NOT EXISTS idx_session_speaker_session ON "SessionSpeaker"("sessionId");
CREATE INDEX IF NOT EXISTS idx_session_speaker_speaker ON "SessionSpeaker"("speakerId");

-- Add indexes for user queries
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_company ON "User"(company);

-- Add GIN index for user interests
CREATE INDEX IF NOT EXISTS idx_user_interests ON "User" USING GIN (interests);

-- Add indexes for favorites
CREATE INDEX IF NOT EXISTS idx_favorite_user ON "Favorite"("userId");
CREATE INDEX IF NOT EXISTS idx_favorite_session ON "Favorite"("sessionId");

-- Add text search indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_session_title_text ON "Session" USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_session_description_text ON "Session" USING GIN (to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_speaker_bio_text ON "Speaker" USING GIN (to_tsvector('english', bio));

-- Analyze tables to update statistics
ANALYZE "Session";
ANALYZE "Speaker";
ANALYZE "SessionSpeaker";
ANALYZE "User";
ANALYZE "Favorite";