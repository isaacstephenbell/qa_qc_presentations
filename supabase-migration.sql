-- Feedback Loop System - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create the feedback table
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slide_number INTEGER NOT NULL,
  slide_content TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  feedback_category VARCHAR(50),
  qa_type VARCHAR(10) NOT NULL CHECK (qa_type IN ('text', 'vision')),
  file_name VARCHAR(255) NOT NULL,
  session_id VARCHAR(100),
  suggestion_id VARCHAR(100), -- ID of the specific suggestion being rated
  feedback_type VARCHAR(10) NOT NULL DEFAULT 'missed' CHECK (feedback_type IN ('positive', 'negative', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_feedback_qa_type ON feedback(qa_type);
CREATE INDEX idx_feedback_file_name ON feedback(file_name);
CREATE INDEX idx_feedback_session_id ON feedback(session_id);
CREATE INDEX idx_feedback_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
CREATE INDEX idx_feedback_slide_number ON feedback(slide_number);

-- Create a composite index for common queries
CREATE INDEX idx_feedback_composite ON feedback(qa_type, feedback_type, created_at);

-- Add comments for documentation
COMMENT ON TABLE feedback IS 'Stores user feedback on AI suggestions for continuous improvement';
COMMENT ON COLUMN feedback.slide_number IS 'Which slide the feedback relates to';
COMMENT ON COLUMN feedback.slide_content IS 'The actual slide text (Text QA) or description (Vision QA)';
COMMENT ON COLUMN feedback.feedback_text IS 'User''s detailed feedback or auto-generated rating text';
COMMENT ON COLUMN feedback.feedback_category IS 'Category of feedback (Grammar, Tone, Alignment, etc.)';
COMMENT ON COLUMN feedback.qa_type IS 'Type of QA: text or vision';
COMMENT ON COLUMN feedback.file_name IS 'Name of the analyzed presentation file';
COMMENT ON COLUMN feedback.session_id IS 'Unique session identifier for grouping feedback';
COMMENT ON COLUMN feedback.suggestion_id IS 'ID of specific AI suggestion being rated (for thumbs up/down)';
COMMENT ON COLUMN feedback.feedback_type IS 'Type of feedback: positive (thumbs up), negative (thumbs down), or missed (additional issue)';

-- Optional: Create a view for analytics
CREATE VIEW feedback_analytics AS
SELECT 
  qa_type,
  feedback_type,
  feedback_category,
  COUNT(*) as feedback_count,
  DATE_TRUNC('day', created_at) as feedback_date
FROM feedback 
GROUP BY qa_type, feedback_type, feedback_category, DATE_TRUNC('day', created_at)
ORDER BY feedback_date DESC;

COMMENT ON VIEW feedback_analytics IS 'Aggregated feedback data for analytics and reporting';

-- Optional: Enable Row Level Security (RLS) if needed
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Example policy (uncomment if you want to restrict access)
-- CREATE POLICY "Allow feedback insertion" ON feedback FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow feedback reading for authenticated users" ON feedback FOR SELECT USING (true); 