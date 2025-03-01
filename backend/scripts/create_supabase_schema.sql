-- Complete Supabase schema for AI-Todo application
-- This includes all tables from the SQLite backup

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goals (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority INTEGER DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE,
    completion_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags JSONB DEFAULT '[]'::JSONB
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES public.goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority INTEGER DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE,
    completion_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent_id INTEGER REFERENCES public.tasks(id) ON DELETE CASCADE,
    tags JSONB DEFAULT '[]'::JSONB
);

CREATE TABLE IF NOT EXISTS public.metrics (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_value DOUBLE PRECISION,
    current_value DOUBLE PRECISION DEFAULT 0,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.strategies (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.experiences (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES public.goals(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES public.tasks(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    experience_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contributions_list JSONB DEFAULT '[]'::JSONB
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update the goals table to reference strategies
ALTER TABLE public.goals 
    ADD CONSTRAINT fk_current_strategy 
    FOREIGN KEY (current_strategy_id) 
    REFERENCES public.strategies(id) 
    ON DELETE SET NULL;

-- Set up Row Level Security (RLS) policies
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view their own data'
    ) THEN
        CREATE POLICY "Users can view their own data" ON public.users
            FOR ALL USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can view their own goals'
    ) THEN
        CREATE POLICY "Users can view their own goals" ON public.goals
            FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'Users can view their own tasks'
    ) THEN
        CREATE POLICY "Users can view their own tasks" ON public.tasks
            FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'metrics' AND policyname = 'Users can view metrics for their goals'
    ) THEN
        CREATE POLICY "Users can view metrics for their goals" ON public.metrics
            FOR ALL USING (
                goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'strategies' AND policyname = 'Users can view strategies for their goals'
    ) THEN
        CREATE POLICY "Users can view strategies for their goals" ON public.strategies
            FOR ALL USING (
                goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'experiences' AND policyname = 'Users can view their experiences'
    ) THEN
        CREATE POLICY "Users can view their experiences" ON public.experiences
            FOR ALL USING (
                goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid()) OR
                task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Users can view their conversations'
    ) THEN
        CREATE POLICY "Users can view their conversations" ON public.conversations
            FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'conversation_messages' AND policyname = 'Users can view messages in their conversations'
    ) THEN
        CREATE POLICY "Users can view messages in their conversations" ON public.conversation_messages
            FOR ALL USING (
                conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
            );
    END IF;
END
$$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_users_updated_at'
    ) THEN
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_goals_updated_at'
    ) THEN
        CREATE TRIGGER update_goals_updated_at
        BEFORE UPDATE ON goals
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_tasks_updated_at'
    ) THEN
        CREATE TRIGGER update_tasks_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_metrics_updated_at'
    ) THEN
        CREATE TRIGGER update_metrics_updated_at
        BEFORE UPDATE ON metrics
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_strategies_updated_at'
    ) THEN
        CREATE TRIGGER update_strategies_updated_at
        BEFORE UPDATE ON strategies
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_experiences_updated_at'
    ) THEN
        CREATE TRIGGER update_experiences_updated_at
        BEFORE UPDATE ON experiences
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_conversations_updated_at'
    ) THEN
        CREATE TRIGGER update_conversations_updated_at
        BEFORE UPDATE ON conversations
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_conversation_messages_updated_at'
    ) THEN
        CREATE TRIGGER update_conversation_messages_updated_at
        BEFORE UPDATE ON conversation_messages
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
    END IF;
END
$$;
