# AI-Driven ADHD Productivity System

An AI-powered todo app designed specifically for ADHD brains, focusing on reducing decision paralysis and maintaining engagement through intelligent task prioritization and dopamine-friendly UI.

## Project Structure

```
ai-todo/
├── ai-todo-frontend/     # Next.js frontend
│   ├── src/
│   │   ├── app/         # Next.js 13+ app directory
│   │   └── components/  # React components
│   └── ...
└── backend/             # FastAPI backend
    ├── app/
    │   ├── models/      # SQLAlchemy models
    │   ├── schemas/     # Pydantic schemas
    │   ├── services/    # Business logic
    │   └── routers/     # API endpoints
    └── tests/           # pytest test suite
```

## Core Features

1. AI Task Prioritization
2. Smart Reminders
3. Activity Tracking
4. Voice Notes
5. Future-Self Messages
6. Nested Tasks
7. "What Should I Do Next?" Button
8. Dopamine-Boosting UI

## Development Roadmap

### Phase 1 - Core Functionality (Completed)
- [x] Basic task management (CRUD operations)
- [x] AI-powered task prioritization
- [x] Frontend UI components
- [x] Backend API structure
- [x] Database setup and migrations
- [x] AI service integration

### Phase 2 - Enhanced Features (Completed)
- [x] Voice notes
- [x] Daily check-ins
- [x] Task nesting
- [x] Progress visualization

### Phase 3 - Polish & Security (Completed)
- [x] Authentication & Authorization with Supabase
- [x] User profiles
- [x] Data encryption
- [x] API rate limiting

## Getting Started

### Frontend (Next.js)
```bash
cd ai-todo-frontend
npm install
npm run dev
```
Runs on http://localhost:3005

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```
Runs on http://localhost:8005

## Deployment

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set the following environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend API

```bash
# Deploy manually from your local machine
cd ai-todo-frontend
vercel
```

### Backend Deployment (Railway or Render)

1. Push your code to GitHub
2. Connect your GitHub repository to Railway or Render
3. Set the following environment variables:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
   - `SUPABASE_JWT_SECRET`: Your Supabase JWT secret
   - `SUPABASE_USER_ID`: The UUID of your user in Supabase
   - `OPENAI_API_KEY`: Your OpenAI API key

```bash
# For Railway deployment
cd backend
railway link
railway up
```

## Database Migration

The application now uses Supabase PostgreSQL for data storage. Data migration from SQLite to Supabase can be done using the provided scripts:

```bash
# Backup SQLite data
cd backend
python scripts/backup_data.py

# Restore data to Supabase
python scripts/restore_to_supabase.py
```

## Testing

```bash
cd backend
pytest
```

## Notes
- Authentication is implemented using Supabase Authentication
- Data is stored in Supabase PostgreSQL database
- The application uses JWT tokens for API authentication
