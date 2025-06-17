import { useState } from 'react';
import { versionService } from '../services/versionService';
import type { ProjectVersion } from '../types';

export const useVersionManagement = (
  projectId: string | undefined,
  user: any,
  versions: ProjectVersion[],
  setCurrentVersion: (version: ProjectVersion) => void,
  fetchVersions: () => Promise<void>
) => {
  // Version management state
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // Create new version
  const handleCreateVersion = async (data: { title: string; videoUrl: string; description?: string }) => {
    if (!projectId || !user) return;

    try {
      setIsCreatingVersion(true);
      
      console.log('🔧 Creating new version with data:', data);
      
      // Create new version
      const newVersion = await versionService.createVersion(projectId, user.id, data);
      
      console.log('✅ New version created:', newVersion);
      
      // Refresh versions list
      await fetchVersions();
      
      // Switch to new version
      setCurrentVersion(newVersion);
      
      // Close modal
      setIsNewVersionModalOpen(false);
      
    } catch (error) {
      console.error('❌ Error creating version:', error);
      alert('Failed to create new version. Please try again.');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Open new version modal
  const openNewVersionModal = () => {
    setIsNewVersionModalOpen(true);
  };

  // Close new version modal
  const closeNewVersionModal = () => {
    setIsNewVersionModalOpen(false);
  };

  // Get next version number
  const getNextVersionNumber = () => {
    return versions.length > 0 ? Math.max(...versions.map(v => v.versionNumber)) + 1 : 1;
  };

  return {
    // State
    isNewVersionModalOpen,
    isCreatingVersion,
    
    // Actions
    handleCreateVersion,
    openNewVersionModal,
    closeNewVersionModal,
    setIsNewVersionModalOpen,
    
    // Computed values
    nextVersionNumber: getNextVersionNumber(),
  };
};
