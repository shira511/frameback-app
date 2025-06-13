import { supabase } from './supabase';
import type { ProjectVersion } from '../types';

export const versionService = {
  // プロジェクトの全バージョンを取得
  async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return data.map(version => ({
        id: version.id,
        projectId: version.project_id,
        versionNumber: version.version_number,
        title: version.title,
        videoUrl: version.video_url,
        description: version.description,
        createdAt: version.created_at,
        userId: version.user_id,
        isActive: version.is_active
      }));
    } catch (error) {
      console.error('Error fetching project versions:', error);
      throw error;
    }
  },

  // アクティブなバージョンを取得
  async getActiveVersion(projectId: string): Promise<ProjectVersion | null> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single();

      if (error) {
        // アクティブなバージョンがない場合は最初のバージョンを作成
        if (error.code === 'PGRST116') {
          return await this.createInitialVersion(projectId);
        }
        throw error;
      }

      return {
        id: data.id,
        projectId: data.project_id,
        versionNumber: data.version_number,
        title: data.title,
        videoUrl: data.video_url,
        description: data.description,
        createdAt: data.created_at,
        userId: data.user_id,
        isActive: data.is_active
      };
    } catch (error) {
      console.error('Error fetching active version:', error);
      throw error;
    }
  },

  // 新しいバージョンを作成
  async createVersion(
    projectId: string,
    userId: string,
    data: {
      title: string;
      videoUrl: string;
      description?: string;
    }
  ): Promise<ProjectVersion> {
    try {
      // 次のバージョン番号を取得
      const { data: versions } = await supabase
        .from('project_versions')
        .select('version_number')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersionNumber = versions && versions.length > 0 
        ? versions[0].version_number + 1 
        : 1;

      // 既存のアクティブバージョンを非アクティブにする
      await supabase
        .from('project_versions')
        .update({ is_active: false })
        .eq('project_id', projectId);

      // 新しいバージョンを作成
      const { data: newVersion, error } = await supabase
        .from('project_versions')
        .insert({
          project_id: projectId,
          user_id: userId,
          version_number: nextVersionNumber,
          title: data.title,
          video_url: data.videoUrl,
          description: data.description || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: newVersion.id,
        projectId: newVersion.project_id,
        versionNumber: newVersion.version_number,
        title: newVersion.title,
        videoUrl: newVersion.video_url,
        description: newVersion.description,
        createdAt: newVersion.created_at,
        userId: newVersion.user_id,
        isActive: newVersion.is_active
      };
    } catch (error) {
      console.error('Error creating version:', error);
      throw error;
    }
  },

  // バージョンを切り替え（アクティブにする）
  async switchToVersion(projectId: string, versionId: string): Promise<void> {
    try {
      // 全てのバージョンを非アクティブにする
      await supabase
        .from('project_versions')
        .update({ is_active: false })
        .eq('project_id', projectId);

      // 指定されたバージョンをアクティブにする
      const { error } = await supabase
        .from('project_versions')
        .update({ is_active: true })
        .eq('id', versionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error switching version:', error);
      throw error;
    }
  },

  // 初期バージョンを作成（既存プロジェクトからの移行用）
  async createInitialVersion(projectId: string): Promise<ProjectVersion | null> {
    try {
      // 既存のプロジェクト情報を取得
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Version 1を作成
      const newVersion = await this.createVersion(projectId, project.user_id, {
        title: 'Version 1',
        videoUrl: project.video_url,
        description: 'Initial version'
      });

      return newVersion;
    } catch (error) {
      console.error('Error creating initial version:', error);
      return null;
    }
  },

  // YouTubeのビデオIDを抽出
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
};

export default versionService;
