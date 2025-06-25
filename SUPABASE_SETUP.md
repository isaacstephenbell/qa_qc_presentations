# Supabase Setup Guide for Feedback Loop System

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and click "New Project"
3. Choose your organization and create project
4. Wait for project to be ready (~2 minutes)

### 2. Get Your Credentials
Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **Service Role Key** (secret key - keep this private!)

### 3. Add Environment Variables
Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**⚠️ Important:** 
- The `NEXT_PUBLIC_SUPABASE_URL` is public (can be exposed to client)
- The `SUPABASE_SERVICE_ROLE_KEY` is secret (server-side only)

### 4. Create Database Table
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-migration.sql`
3. Paste it into the SQL Editor
4. Click **Run** to create the table and indexes

### 5. Test the Connection
1. Restart your development server: `npm run dev`
2. Upload a presentation and submit some feedback
3. Check your Supabase dashboard → **Table Editor** → **feedback** table
4. You should see feedback entries appearing!

## 🗄️ Database Schema

The feedback table stores:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `slide_number` | INTEGER | Which slide (1, 2, 3...) |
| `slide_content` | TEXT | Slide text or description |
| `feedback_text` | TEXT | User's feedback or rating |
| `feedback_category` | VARCHAR(50) | Grammar, Tone, Alignment, etc. |
| `qa_type` | VARCHAR(10) | 'text' or 'vision' |
| `file_name` | VARCHAR(255) | Presentation filename |
| `session_id` | VARCHAR(100) | Session identifier |
| `suggestion_id` | VARCHAR(100) | Specific suggestion being rated |
| `feedback_type` | VARCHAR(10) | 'positive', 'negative', or 'missed' |
| `created_at` | TIMESTAMP | When feedback was submitted |

## 📊 Analytics View

The setup also creates a `feedback_analytics` view for easy reporting:

```sql
SELECT * FROM feedback_analytics 
WHERE feedback_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY feedback_date DESC;
```

This shows feedback trends by day, QA type, and feedback type.

## 🔍 Useful Queries

### Recent Feedback
```sql
SELECT * FROM feedback 
ORDER BY created_at DESC 
LIMIT 10;
```

### Positive vs Negative Ratings
```sql
SELECT 
  qa_type,
  feedback_type,
  COUNT(*) as count
FROM feedback 
WHERE feedback_type IN ('positive', 'negative')
GROUP BY qa_type, feedback_type;
```

### Most Common Missed Issues
```sql
SELECT 
  feedback_category,
  COUNT(*) as count
FROM feedback 
WHERE feedback_type = 'missed'
GROUP BY feedback_category
ORDER BY count DESC;
```

### Feedback by File
```sql
SELECT 
  file_name,
  COUNT(*) as total_feedback,
  COUNT(CASE WHEN feedback_type = 'positive' THEN 1 END) as positive,
  COUNT(CASE WHEN feedback_type = 'negative' THEN 1 END) as negative,
  COUNT(CASE WHEN feedback_type = 'missed' THEN 1 END) as missed
FROM feedback 
GROUP BY file_name
ORDER BY total_feedback DESC;
```

## 🔒 Security Notes

- The Service Role Key bypasses Row Level Security (RLS)
- For production, consider enabling RLS and creating appropriate policies
- The current setup allows all feedback insertion (suitable for this use case)
- Monitor your Supabase usage to stay within free tier limits

## 🚨 Troubleshooting

### "Missing Supabase environment variables"
- Check your `.env.local` file has both variables
- Restart your development server after adding variables
- Make sure variable names match exactly (including `NEXT_PUBLIC_`)

### "Database error: relation 'feedback' does not exist"
- Run the SQL migration script in Supabase SQL Editor
- Make sure you're connected to the correct project

### Feedback not appearing in Supabase
- Check browser console for errors
- Verify API endpoint is working: `/api/feedback`
- Check Supabase logs in dashboard for database errors

## 📈 Next Steps

Once set up, you can:
1. **Monitor feedback** in real-time via Supabase dashboard
2. **Export data** for ML training using Supabase's API
3. **Build analytics dashboards** using the feedback_analytics view
4. **Set up webhooks** for real-time notifications
5. **Create reports** to track AI improvement over time

## 🔄 Migration from File Logging

If you had the old file-based logging:
1. The new system automatically replaces file logging
2. Old JSON files in `/feedback-logs` can be safely deleted
3. All new feedback goes directly to Supabase
4. No code changes needed - just add environment variables! 