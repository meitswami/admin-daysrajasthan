-- Testing-mode conversation workflow traces (opt-in only)
CREATE TABLE IF NOT EXISTS chat_workflow_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  conversation_id TEXT,
  website_id TEXT,
  message_id TEXT,
  user_message TEXT NOT NULL,
  reply_preview TEXT,
  provider TEXT,
  model_id TEXT,
  intent TEXT,
  used_fallback BOOLEAN NOT NULL DEFAULT false,
  ai_mode TEXT,
  package_hit_count INT NOT NULL DEFAULT 0,
  total_hit_count INT NOT NULL DEFAULT 0,
  package_ids TEXT[] NOT NULL DEFAULT '{}',
  package_summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INT NOT NULL DEFAULT 0,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_workflow_traces_session
  ON chat_workflow_traces(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_workflow_traces_created
  ON chat_workflow_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_workflow_traces_conversation
  ON chat_workflow_traces(conversation_id, created_at DESC);

ALTER TABLE chat_workflow_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_workflow_traces" ON chat_workflow_traces;
CREATE POLICY "admins_all_workflow_traces" ON chat_workflow_traces
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_workflow_traces_testing" ON chat_workflow_traces;
CREATE POLICY "anon_insert_workflow_traces_testing" ON chat_workflow_traces
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_workflow_traces_testing" ON chat_workflow_traces;
CREATE POLICY "anon_select_workflow_traces_testing" ON chat_workflow_traces
  FOR SELECT TO anon USING (true);
