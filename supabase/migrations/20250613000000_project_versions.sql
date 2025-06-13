-- プロジェクトバージョン管理テーブルを作成
CREATE TABLE IF NOT EXISTS project_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- プロジェクトごとのバージョン番号の一意性を保証
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_versions_unique 
ON project_versions(project_id, version_number);

-- アクティブバージョンのインデックス
CREATE INDEX IF NOT EXISTS idx_project_versions_active 
ON project_versions(project_id, is_active) WHERE is_active = true;

-- フィードバックテーブルにversion_idカラムを追加
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES project_versions(id) ON DELETE CASCADE;

-- フィードバックのバージョンインデックス
CREATE INDEX IF NOT EXISTS idx_feedback_version 
ON feedback(version_id);

-- Row Level Security (RLS) の設定
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- プロジェクトのメンバーはバージョンを読み取り可能
CREATE POLICY "Users can view project versions" 
ON project_versions FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE user_id = auth.uid()
  )
);

-- プロジェクトの所有者はバージョンを作成・更新可能
CREATE POLICY "Project owners can manage versions" 
ON project_versions FOR ALL 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE user_id = auth.uid()
  )
);

-- プロジェクトテーブルにcurrent_version_idカラムを追加（オプション）
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES project_versions(id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_versions_updated_at 
BEFORE UPDATE ON project_versions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
