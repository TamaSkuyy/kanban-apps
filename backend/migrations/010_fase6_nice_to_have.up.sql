ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'id-jakarta-1';

CREATE TABLE IF NOT EXISTS workspace_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON workspace_api_keys(workspace_id);

CREATE TABLE IF NOT EXISTS workspace_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT NOT NULL DEFAULT 'task.created,task.moved,task.deleted,board.created',
    secret TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_workspace_id ON workspace_webhooks(workspace_id);

-- Ensure activities can log workspace events (board_id nullable, add workspace_id)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON activities(workspace_id);
