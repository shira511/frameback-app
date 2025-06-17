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
  },  // アクティブなバージョンを取得
  async getActiveVersion(projectId: string): Promise<ProjectVersion | null> {
    try {
      console.log('🔍 Getting active version for project:', projectId);
      
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active version:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Found active version:', data.version_number);
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
      }

      // アクティブなバージョンがない場合、他のバージョンが存在するかチェック
      console.log('⚠️ No active version found, checking for any versions...');
      
      const { data: anyVersions, error: anyVersionError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (anyVersionError) {
        console.error('Error checking for any versions:', anyVersionError);
        throw anyVersionError;
      }

      if (anyVersions && anyVersions.length > 0) {
        console.log('📋 Found existing version, activating it:', anyVersions[0].version_number);
        
        // 既存のバージョンをアクティブにする
        const { error: activateError } = await supabase
          .from('project_versions')
          .update({ is_active: true })
          .eq('id', anyVersions[0].id);

        if (activateError) {
          console.error('Error activating existing version:', activateError);
          throw activateError;
        }

        return {
          id: anyVersions[0].id,
          projectId: anyVersions[0].project_id,
          versionNumber: anyVersions[0].version_number,
          title: anyVersions[0].title,
          videoUrl: anyVersions[0].video_url,
          description: anyVersions[0].description,
          createdAt: anyVersions[0].created_at,
          userId: anyVersions[0].user_id,
          isActive: true
        };
      }

      // バージョンが全く存在しない場合のみ初期バージョンを作成
      // 並行処理を防ぐために、最初に再チェックしてから作成する
      console.log('🆕 No versions found, creating initial version for project:', projectId);
      
      // 再度確認（並行処理で他のプロセスが作成している可能性）
      const { data: recheckVersions, error: recheckError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .limit(1);

      if (!recheckError && recheckVersions && recheckVersions.length > 0) {
        console.log('🔄 Version was created by another process, using it:', recheckVersions[0].id);
        // 他のプロセスが既に作成していた場合、それを使用
        await supabase
          .from('project_versions')
          .update({ is_active: true })
          .eq('id', recheckVersions[0].id);

        return {
          id: recheckVersions[0].id,
          projectId: recheckVersions[0].project_id,
          versionNumber: recheckVersions[0].version_number,
          title: recheckVersions[0].title,
          videoUrl: recheckVersions[0].video_url,
          description: recheckVersions[0].description,
          createdAt: recheckVersions[0].created_at,
          userId: recheckVersions[0].user_id,
          isActive: true
        };
      }

      return await this.createInitialVersion(projectId);

    } catch (error) {
      console.error('❌ Error in getActiveVersion:', error);
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
      // トランザクション風にバージョン番号を安全に取得
      const { data: maxVersionData, error: maxVersionError } = await supabase
        .rpc('get_next_version_number', { p_project_id: projectId });

      let nextVersionNumber = 1;
      if (maxVersionError) {
        // RPCが存在しない場合のフォールバック
        const { data: versions } = await supabase
          .from('project_versions')
          .select('version_number')
          .eq('project_id', projectId)
          .order('version_number', { ascending: false })
          .limit(1);

        nextVersionNumber = versions && versions.length > 0 
          ? versions[0].version_number + 1 
          : 1;
      } else {
        nextVersionNumber = maxVersionData;
      }

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
  },  // 初期バージョンを作成（既存プロジェクトからの移行用）
  async createInitialVersion(projectId: string): Promise<ProjectVersion | null> {
    try {
      console.log('🔧 Creating initial version for project:', projectId);

      // 既存のプロジェクト情報を取得
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('❌ Error fetching project:', projectError);
        throw projectError;
      }

      console.log('📽️ Project found:', project.title);

      // バージョン作成前に最新状態を確認（より確実な並行処理対策）
      const { data: finalCheck, error: finalCheckError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!finalCheckError && finalCheck && finalCheck.length > 0) {
        console.log('🔄 Version found in final check, using existing:', finalCheck[0].id);
        
        // 既存のバージョンをアクティブにする
        await supabase
          .from('project_versions')
          .update({ is_active: true })
          .eq('id', finalCheck[0].id);

        return {
          id: finalCheck[0].id,
          projectId: finalCheck[0].project_id,
          versionNumber: finalCheck[0].version_number,
          title: finalCheck[0].title,
          videoUrl: finalCheck[0].video_url,
          description: finalCheck[0].description,
          createdAt: finalCheck[0].created_at,
          userId: finalCheck[0].user_id,
          isActive: true
        };
      }

      // バージョンを作成 - upsert を使用してより安全に処理
      const { data: newVersion, error: insertError } = await supabase
        .from('project_versions')
        .upsert({
          project_id: projectId,
          user_id: project.user_id,
          version_number: 1,
          title: 'Version 1',
          video_url: project.video_url,
          description: 'Initial version',
          is_active: true
        }, {
          onConflict: 'project_id,version_number',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting initial version:', insertError);
        
        // エラーが発生した場合でも、既存のバージョンを取得して使用
        console.log('🔄 Attempting to fetch existing version after error...');
        
        const { data: existingVersion, error: fetchError } = await supabase
          .from('project_versions')
          .select('*')
          .eq('project_id', projectId)
          .eq('version_number', 1)
          .single();

        if (!fetchError && existingVersion) {
          // 既存のバージョンをアクティブにする
          await supabase
            .from('project_versions')
            .update({ is_active: true })
            .eq('id', existingVersion.id);

          console.log('✅ Using existing version after error:', existingVersion.id);
          return {
            id: existingVersion.id,
            projectId: existingVersion.project_id,
            versionNumber: existingVersion.version_number,
            title: existingVersion.title,
            videoUrl: existingVersion.video_url,
            description: existingVersion.description,
            createdAt: existingVersion.created_at,
            userId: existingVersion.user_id,
            isActive: true
          };
        }
        
        return null;
      }

      console.log('✅ Successfully created initial version:', newVersion.id);

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
      console.error('❌ Error creating initial version:', error);
      
      // 最後の手段として既存のバージョンを取得
      try {
        const { data: fallbackVersion, error: fallbackError } = await supabase
          .from('project_versions')
          .select('*')
          .eq('project_id', projectId)
          .limit(1)
          .single();

        if (!fallbackError && fallbackVersion) {
          console.log('🔄 Using fallback existing version:', fallbackVersion.id);
          
          await supabase
            .from('project_versions')
            .update({ is_active: true })
            .eq('id', fallbackVersion.id);

          return {
            id: fallbackVersion.id,
            projectId: fallbackVersion.project_id,
            versionNumber: fallbackVersion.version_number,
            title: fallbackVersion.title,
            videoUrl: fallbackVersion.video_url,
            description: fallbackVersion.description,
            createdAt: fallbackVersion.created_at,
            userId: fallbackVersion.user_id,
            isActive: true
          };
        }
      } catch (fallbackError) {
        console.error('❌ Fallback version fetch failed:', fallbackError);
      }
      
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
