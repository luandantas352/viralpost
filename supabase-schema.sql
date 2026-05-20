-- ViralPost - Schema Supabase com RLS
-- Execute este SQL no SQL Editor do Supabase

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    plan TEXT DEFAULT 'inactive',
    plan_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Tabela de carrosséis criados
CREATE TABLE IF NOT EXISTS carousels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    style TEXT,
    slides JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own carousels"
    ON carousels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own carousels"
    ON carousels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own carousels"
    ON carousels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own carousels"
    ON carousels FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
