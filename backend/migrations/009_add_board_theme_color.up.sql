ALTER TABLE boards ADD COLUMN IF NOT EXISTS theme_color TEXT;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON boards(workspace_id);
