-- Run these commands in pgAdmin4 Query Tool to optimize your database

-- 1. Index for Exams table
-- Note: 'id' is already indexed as primary key, but we often filter exams by created_at.
CREATE INDEX IF NOT EXISTS ix_exams_created_at ON exams (created_at);

-- 2. Indexes for Candidates table
-- Note: 'id' and 'candidate_id' are already indexed.
-- 'token' is frequently used by the public router for candidate access
CREATE INDEX IF NOT EXISTS ix_candidates_token ON candidates (token);

-- 'assigned_exam_id' is used constantly to fetch candidates for a specific exam
CREATE INDEX IF NOT EXISTS ix_candidates_assigned_exam_id ON candidates (assigned_exam_id);

-- 'status' is frequently filtered for Dashboard counts (Completed vs Live vs Not Started)
CREATE INDEX IF NOT EXISTS ix_candidates_status ON candidates (status);

-- 'email' is an important lookup for admin searches
CREATE INDEX IF NOT EXISTS ix_candidates_email ON candidates (email);

-- Optional but recommended: Add a partial index if searching for completed candidates is your heaviest query:
CREATE INDEX IF NOT EXISTS ix_candidates_completed ON candidates (status) WHERE status = 'Completed';
