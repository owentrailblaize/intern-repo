-- MESSAGES SCHEMA - Workspace messaging with real-time support
-- Run this in your Supabase SQL Editor

-- Conversations table (supports 1:1 and group chats)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255), -- NULL for 1:1 chats, set for group chats
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants (who is in each conversation)
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, employee_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, system
  metadata JSONB DEFAULT '{}', -- For file URLs, reactions, etc.
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message read receipts (who has read each message)
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, employee_id)
);

-- Typing indicators (ephemeral, handled via Supabase Realtime Presence)
-- No table needed - use Realtime Presence API

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_employee ON conversation_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts(message_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Conversations: Users can only see conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN employees e ON e.id = cp.employee_id
      WHERE cp.conversation_id = conversations.id
      AND e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
    )
  );

-- Conversation Participants: Users can see participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN employees e ON e.id = cp.employee_id
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations they created"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN employees e ON e.id = c.created_by
      WHERE c.id = conversation_id
      AND e.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_id
      AND e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = conversation_participants.employee_id
      AND e.auth_user_id = auth.uid()
    )
  );

-- Messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN employees e ON e.id = cp.employee_id
      WHERE cp.conversation_id = messages.conversation_id
      AND e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN employees e ON e.id = cp.employee_id
      WHERE cp.conversation_id = conversation_id
      AND e.auth_user_id = auth.uid()
      AND e.id = sender_id
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = messages.sender_id
      AND e.auth_user_id = auth.uid()
    )
  );

-- Message Read Receipts
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      JOIN employees e ON e.id = cp.employee_id
      WHERE m.id = message_read_receipts.message_id
      AND e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_read_receipts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_id
      AND e.auth_user_id = auth.uid()
    )
  );

-- Function to get or create a 1:1 conversation between two employees
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_employee_1 UUID,
  p_employee_2 UUID
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Look for existing 1:1 conversation between these two employees
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.is_group = false
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.employee_id = p_employee_1
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.employee_id = p_employee_2
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;

  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (is_group, created_by)
    VALUES (false, p_employee_1)
    RETURNING id INTO v_conversation_id;

    INSERT INTO conversation_participants (conversation_id, employee_id)
    VALUES 
      (v_conversation_id, p_employee_1),
      (v_conversation_id, p_employee_2);
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_count(p_employee_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.conversation_id,
    COUNT(m.id) AS unread_count
  FROM conversation_participants cp
  JOIN messages m ON m.conversation_id = cp.conversation_id
  LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.employee_id = p_employee_id
  WHERE cp.employee_id = p_employee_id
  AND m.sender_id != p_employee_id
  AND mrr.id IS NULL
  AND m.created_at > cp.joined_at
  GROUP BY cp.conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count TO authenticated;
