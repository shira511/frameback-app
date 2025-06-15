import React, { useState } from 'react';
import { ProjectVersion } from '../types';
import { Plus, Play, ChevronDown } from 'lucide-react';

interface VersionManagerProps {
  versions: ProjectVersion[];
  currentVersion: ProjectVersion;
  onVersionChange: (versionId: string) => void;
  onCreateNewVersion: () => void;
  isOwner: boolean;
}

const VersionManager: React.FC<VersionManagerProps> = ({
  versions,
  currentVersion,
  onVersionChange,
  onCreateNewVersion,
  isOwner
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors border border-slate-600 text-sm"
        >
          <Play size={14} className="text-primary-400" />
          <span className="font-medium text-white">
            Version {currentVersion.versionNumber}
          </span>
          <span className="text-slate-400 text-xs">
            {currentVersion.title}
          </span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {sortedVersions.map((version) => (
              <button
                key={version.id}
                onClick={() => {
                  onVersionChange(version.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left p-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0 ${
                  version.id === currentVersion.id ? 'bg-slate-700' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Play size={14} className="text-primary-400" />
                  <span className="font-medium text-white text-sm">
                    Version {version.versionNumber}
                  </span>
                  {version.id === currentVersion.id && (
                    <span className="px-2 py-0.5 bg-green-500 bg-opacity-20 text-green-400 text-xs rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <div className="text-white text-sm">{version.title}</div>
                  {version.description && (
                    <div className="text-slate-400 text-xs mt-1">
                      {version.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <button
          onClick={onCreateNewVersion}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
        >
          <Plus size={14} />
          New Version
        </button>
      )}

      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default VersionManager;
  isOwner: boolean;
}

const VersionManager: React.FC<VersionManagerProps> = ({
  versions,
  currentVersion,
  onVersionChange,
  onCreateNewVersion,
  isOwner
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sort versions by version number (latest first)
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    <div className="bg-slate-800 rounded-lg p-3 mb-3 border border-slate-700">
      <div className="flex items-center justify-between gap-3">
        {/* Current Version Display - Compact */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors border border-slate-600 text-sm"
            >              <Play size={14} className="text-primary-400" />
              <span className="font-medium text-white">
                Version {currentVersion.versionNumber}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

        {/* Version Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg border border-slate-600 shadow-lg z-10 max-h-64 overflow-y-auto">
            {sortedVersions.map((version) => (
              <button
                key={version.id}
                onClick={() => {
                  onVersionChange(version.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full p-3 flex items-center justify-between hover:bg-slate-600 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  version.id === currentVersion.id ? 'bg-slate-600' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Play size={14} className="text-primary-400" />
                    <span className="font-medium text-white text-sm">
                      Version {version.versionNumber}
                    </span>
                    {version.isActive && (
                      <span className="px-1.5 py-0.5 bg-green-500 bg-opacity-20 text-green-400 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-slate-300 text-sm">
                    {version.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar size={12} />
                  {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Version Details */}
      <div className="mt-3 p-3 bg-slate-750 rounded-lg">
        <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>Created {formatDistanceToNow(new Date(currentVersion.createdAt), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-1">
            <User size={14} />
            <span>By {currentVersion.userId}</span>
          </div>
        </div>
        {currentVersion.description && (
          <p className="text-slate-300 text-sm">{currentVersion.description}</p>
        )}
      </div>

      {/* Version Statistics */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span>{versions.length} version{versions.length !== 1 ? 's' : ''} total</span>
        <span>•</span>
        <span>Latest: Version {Math.max(...versions.map(v => v.versionNumber))}</span>
      </div>
    </div>
  );
};

export default VersionManager;
