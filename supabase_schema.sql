-- 1. PROFILES TABLE (Extends Auth.Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  about TEXT DEFAULT 'Hey there! I am using MiniChat',
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  notification_settings JSONB DEFAULT '{"enabled": true, "sound": true, "showPreview": true}'::jsonb,
  custom_ringtone JSONB DEFAULT '{"url": "", "name": ""}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONVERSATIONS TABLE
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT DEFAULT 'private' CHECK (type IN ('private', 'group')),
  group_name TEXT,
  group_avatar TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PARTICIPANTS TABLE
CREATE TABLE public.participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- 4. MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'file', 'system')),
  media_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted_everyone BOOLEAN DEFAULT FALSE,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reactions JSONB DEFAULT '[]'::jsonb,
  deleted_for UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CALLS TABLE
CREATE TABLE public.calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID REFERENCES public.profiles(id),
  conversation_id UUID REFERENCES public.conversations(id),
  type TEXT DEFAULT 'audio' CHECK (type IN ('audio', 'video')),
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('completed', 'missed', 'rejected', 'busy', 'ongoing')),
  duration INTEGER DEFAULT 0,
  is_group BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  participants UUID[] DEFAULT '{}' -- array of profile IDs
);

-- RLS (ROW LEVEL SECURITY) POLICIES
-- Enabling RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view all profiles, but only edit their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Participants: Users can see conversations they belong to
CREATE POLICY "Users can view their participant entries" ON public.participants FOR SELECT USING (auth.uid() = user_id);

-- Conversations: Users can see conversations they are participants in
CREATE POLICY "Users can view conversations they are in" ON public.conversations FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = public.conversations.id AND user_id = auth.uid()));

-- Messages: Users can see messages in conversations they are in
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT
USING (EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert messages into their conversations" ON public.messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()));

-- Function to append a user ID to the deleted_for array on a message
CREATE OR REPLACE FUNCTION append_to_deleted_for(message_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET deleted_for = array_append(deleted_for, user_id)
  WHERE id = message_id AND NOT (user_id = ANY(deleted_for));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realtime Setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
