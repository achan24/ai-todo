# Deployment Guide for AI-Todo App

This guide provides detailed instructions for deploying both the frontend and backend components of the AI-Todo application.

## Prerequisites

Before deploying, ensure you have:

1. A Supabase account with:
   - Authentication configured
   - PostgreSQL database set up
   - Row Level Security (RLS) policies in place
   - All necessary tables created

2. Environment variables ready:
   - Supabase URL
   - Supabase Anon Key
   - Supabase Service Key
   - Supabase JWT Secret
   - Database URL (PostgreSQL connection string)
   - OpenAI API Key

3. GitHub repository with your code

## Frontend Deployment (Vercel)

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and sign in
3. Click "New Project" and import your GitHub repository
4. Select the `ai-todo-frontend` directory as the root directory
5. Configure the following settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend API
7. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to your frontend directory:
   ```bash
   cd ai-todo-frontend
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. Follow the prompts to configure your project
6. Set environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXT_PUBLIC_API_URL
   ```

7. Deploy to production:
   ```bash
   vercel --prod
   ```

## Backend Deployment

### Option 1: Railway

1. Create a [Railway](https://railway.app) account
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

3. Login to Railway:
   ```bash
   railway login
   ```

4. Navigate to your backend directory:
   ```bash
   cd backend
   ```

5. Link to a new Railway project:
   ```bash
   railway init
   ```

6. Set environment variables:
   ```bash
   railway variables set DATABASE_URL="your-postgres-connection-string"
   railway variables set SUPABASE_URL="your-supabase-url"
   railway variables set SUPABASE_SERVICE_KEY="your-service-key"
   railway variables set SUPABASE_JWT_SECRET="your-jwt-secret"
   railway variables set SUPABASE_USER_ID="your-user-id"
   railway variables set OPENAI_API_KEY="your-openai-key"
   ```

7. Deploy:
   ```bash
   railway up
   ```

### Option 2: Render

1. Create a [Render](https://render.com) account
2. Go to the Render dashboard and click "New Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - Name: `ai-todo-backend`
   - Root Directory: `backend`
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
   - `SUPABASE_JWT_SECRET`: Your Supabase JWT secret
   - `SUPABASE_USER_ID`: The UUID of your user in Supabase
   - `OPENAI_API_KEY`: Your OpenAI API key
6. Click "Create Web Service"

## Connecting Frontend to Backend

After deploying both services:

1. Get the URL of your deployed backend (e.g., `https://ai-todo-backend.railway.app`)
2. Update the `NEXT_PUBLIC_API_URL` environment variable in your Vercel project to point to this URL
3. Redeploy your frontend if necessary

## Troubleshooting

### CORS Issues

If you encounter CORS issues:

1. Check that your backend CORS configuration allows requests from your frontend domain
2. Verify that your frontend is using the correct backend URL

### Authentication Issues

If authentication fails:

1. Verify that your Supabase JWT secret is correct
2. Check that your frontend is using the correct Supabase URL and anon key
3. Ensure your backend is correctly validating JWT tokens

### Database Connection Issues

If database connection fails:

1. Verify that your DATABASE_URL is correct
2. Check that your IP is allowed in Supabase's database settings
3. Ensure your database user has the necessary permissions

## Monitoring

- Use Vercel Analytics for frontend monitoring
- Use Railway/Render logs for backend monitoring
- Set up Supabase monitoring for database performance

## Backup and Recovery

Always maintain regular backups of your data:

```bash
# Backup Supabase data
cd backend
python scripts/backup_supabase_data.py
```

## Security Considerations

- Never commit environment variables to your repository
- Use environment variable encryption in your deployment platform
- Regularly rotate your API keys and secrets
- Enable MFA for your Supabase and deployment platform accounts
