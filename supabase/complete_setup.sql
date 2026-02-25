-- =====================================================
-- English AI Diary - Complete Database Setup
-- =====================================================
-- このファイルを Supabase SQL Editor に貼り付けて実行してください
-- 順番に実行されるので、1回のコピペでOKです
-- =====================================================

-- =====================================================
-- 1. UUID Extension
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. Users Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- 3. Helper Function for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Push Subscriptions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.push_subscriptions ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. Notification Settings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  new_comment BOOLEAN DEFAULT TRUE,
  family_diary BOOLEAN DEFAULT TRUE,
  daily_reminder BOOLEAN DEFAULT FALSE,
  reminder_time TIME DEFAULT '20:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings" ON public.notification_settings
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.notification_settings ADD CONSTRAINT unique_user_notification_settings UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_notification_settings();

-- =====================================================
-- 6. Family Relationships Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'parent-child',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT different_users CHECK (parent_id != child_id)
);

ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own family relationships" ON public.family_relationships
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = child_id);

CREATE POLICY "Users can create family relationships as parent" ON public.family_relationships
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Users can update family relationships" ON public.family_relationships
  FOR UPDATE
  USING (auth.uid() = parent_id OR auth.uid() = child_id)
  WITH CHECK (auth.uid() = parent_id OR auth.uid() = child_id);

CREATE POLICY "Users can delete family relationships" ON public.family_relationships
  FOR DELETE USING (auth.uid() = parent_id OR auth.uid() = child_id);

ALTER TABLE public.family_relationships ADD CONSTRAINT unique_family_relationship UNIQUE (parent_id, child_id);

CREATE INDEX IF NOT EXISTS idx_family_relationships_parent_id ON public.family_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_child_id ON public.family_relationships(child_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_status ON public.family_relationships(status);

CREATE TRIGGER update_family_relationships_updated_at
  BEFORE UPDATE ON public.family_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION delete_family_relationship(relationship_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_parent_id UUID;
  v_child_id UUID;
BEGIN
  v_user_id := auth.uid();

  SELECT parent_id, child_id INTO v_parent_id, v_child_id
  FROM public.family_relationships
  WHERE id = relationship_id;

  IF v_user_id = v_parent_id OR v_user_id = v_child_id THEN
    DELETE FROM public.family_relationships WHERE id = relationship_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_family_relationship TO authenticated;

-- =====================================================
-- 7. Diary Entries Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  transcription TEXT,
  ai_analysis JSONB,
  mood TEXT,
  tags TEXT[],
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diary entries" ON public.diary_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view family diary entries" ON public.diary_entries
  FOR SELECT USING (
    NOT is_private AND
    EXISTS (
      SELECT 1 FROM public.family_relationships
      WHERE (parent_id = auth.uid() AND child_id = user_id) OR
            (child_id = auth.uid() AND parent_id = user_id)
    )
  );

CREATE POLICY "Users can create own diary entries" ON public.diary_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diary entries" ON public.diary_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diary entries" ON public.diary_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON public.diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON public.diary_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_is_private ON public.diary_entries(is_private);

CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. Diary Comments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.diary_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id UUID REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.diary_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.diary_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on viewable diary entries" ON public.diary_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diary_entries
      WHERE id = diary_entry_id AND (
        user_id = auth.uid() OR
        (NOT is_private AND EXISTS (
          SELECT 1 FROM public.family_relationships
          WHERE (parent_id = auth.uid() AND child_id = diary_entries.user_id) OR
                (child_id = auth.uid() AND parent_id = diary_entries.user_id)
        ))
      )
    )
  );

CREATE POLICY "Users can create comments on viewable entries" ON public.diary_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.diary_entries
      WHERE id = diary_entry_id AND (
        user_id = auth.uid() OR
        (NOT is_private AND EXISTS (
          SELECT 1 FROM public.family_relationships
          WHERE (parent_id = auth.uid() AND child_id = diary_entries.user_id) OR
                (child_id = auth.uid() AND parent_id = diary_entries.user_id)
        ))
      )
    )
  );

CREATE POLICY "Users can update own comments" ON public.diary_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.diary_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_diary_comments_diary_entry_id ON public.diary_comments(diary_entry_id);
CREATE INDEX IF NOT EXISTS idx_diary_comments_user_id ON public.diary_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_comments_parent_comment_id ON public.diary_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_diary_comments_created_at ON public.diary_comments(created_at DESC);

CREATE TRIGGER update_diary_comments_updated_at
  BEFORE UPDATE ON public.diary_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. Subscriptions Table (Stripe)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_type TEXT CHECK (plan_type IN ('free', 'basic_monthly', 'basic_yearly')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 10. Payment History Table (Stripe)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'jpy',
  status TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);

CREATE POLICY "Users can view own payment history" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment history" ON public.payment_history
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Setup Complete!
-- =====================================================
