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

### Phase 1 - Core Functionality (Current)
- [x] Basic task management (CRUD operations)
- [x] AI-powered task prioritization
- [x] Frontend UI components
- [x] Backend API structure
- [ ] Database setup and migrations
- [ ] AI service integration

### Phase 2 - Enhanced Features
- [ ] Voice notes
- [ ] Daily check-ins
- [ ] Task nesting
- [ ] Progress visualization

### Phase 3 - Polish & Security (Later)
- [ ] Authentication & Authorization
- [ ] User profiles
- [ ] Data encryption
- [ ] API rate limiting

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

## Testing

```bash
cd backend
pytest
```

## Notes
- Authentication will be implemented in Phase 3 to focus on core functionality first
- Currently using simple in-memory storage; will migrate to PostgreSQL later
