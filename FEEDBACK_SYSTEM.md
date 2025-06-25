# Feedback Loop System

## Overview
The feedback loop system allows users to submit targeted feedback per slide for both Text QA and Vision QA features. This creates a supervised learning dataset for improving model outputs over time.

## Features

### ✅ Current Implementation
- **Per-slide feedback collection** in both Text QA and Vision QA tabs
- **Categorized feedback** with predefined categories for each QA type
- **Reusable FeedbackForm component** with clean UI/UX
- **Validation and error handling** for feedback submissions
- **TypeScript types** for type safety and consistency
- **Temporary JSON file logging** (ready for database migration)

### 🎯 User Experience
1. After viewing suggestions for each slide, users see: *"Did we miss anything on this slide?"*
2. Click **"✏️ Submit Feedback"** button
3. Fill out feedback form with:
   - Required text input: "What should we have flagged or improved?"
   - Optional category dropdown (different for Text vs Vision QA)
   - Submit/Cancel buttons
4. Success confirmation: *"Thanks! Your feedback will help us improve."*

## Data Collection

### Captured Data Points
- `slideNumber`: Which slide the feedback relates to
- `slideContent`: The actual slide text (Text QA) or description (Vision QA)
- `feedbackText`: User's detailed feedback
- `feedbackCategory`: Selected category (optional)
- `qaType`: "text" or "vision" 
- `fileName`: Name of the analyzed presentation
- `sessionId`: Unique session identifier
- `timestamp`: When feedback was submitted

### Feedback Categories

**Text QA Categories:**
- Grammar
- Tone
- Clarity
- Redundancy
- Other

**Vision QA Categories:**
- Alignment
- Spacing
- Color Contrast
- Font Issues
- Other

## Database Integration (Supabase)

### Ready for Migration
The current implementation is designed to easily migrate to Supabase. The feedback API already includes:
- Complete Supabase integration comments
- Suggested table schema
- Example query code

### Supabase Table Schema
```sql
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slide_number INTEGER NOT NULL,
  slide_content TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  feedback_category VARCHAR(50),
  qa_type VARCHAR(10) NOT NULL CHECK (qa_type IN ('text', 'vision')),
  file_name VARCHAR(255) NOT NULL,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Migration Steps
1. Set up Supabase project and get credentials
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Install Supabase client: `npm install @supabase/supabase-js`
4. Uncomment and implement the Supabase code in `/app/api/feedback/route.ts`
5. Create the feedback table using the provided schema

## Usage for Model Improvement

### Prompt Tuning
- **Text QA**: Analyze feedback to identify missed grammar/style issues
- **Vision QA**: Understand what visual problems the AI overlooks
- **Category Analysis**: See which types of issues are most commonly missed

### Fine-tuning Data
- **Positive Examples**: Slides where no feedback was submitted
- **Negative Examples**: Feedback indicates missed issues
- **Structured Training**: Categorized feedback provides labeled training data

### Analytics Opportunities
- Track improvement over time as feedback decreases
- Identify common blind spots across different presentation types
- A/B test prompt improvements using feedback as success metric

## API Endpoints

### POST /api/feedback
Submit feedback for a specific slide.

**Request Body:**
```typescript
{
  slideNumber: number
  slideContent: string
  feedbackText: string
  feedbackCategory?: string
  qaType: 'text' | 'vision'
  fileName: string
  sessionId?: string
}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  feedbackId?: string
  error?: string
}
```

## Files Structure
```
app/api/feedback/
  └── route.ts              # Feedback API endpoint
components/
  └── FeedbackForm.tsx      # Reusable feedback form component
  └── ReviewResults.tsx     # Updated to include feedback forms
types/
  └── feedback.ts           # TypeScript types and constants
feedback-logs/              # Temporary JSON storage (gitignored)
```

## Future Enhancements
- **Feedback analytics dashboard** to view collected feedback
- **Export functionality** for feedback data
- **Email notifications** when feedback is submitted
- **Feedback voting** (helpful/not helpful) for prioritization
- **Integration with ML training pipelines** 