import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  HardDrive, 
  FolderPlus, 
  FolderCheck, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  Folder, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  FileText,
  AlertCircle,
  LogOut,
  UserCheck
} from 'lucide-react';

export const DriveSettings: React.FC = () => {
  const {
    user,
    signInWithGoogle,
    signOutUser,
    isAuthLoading,
    driveFolders,
    selectedDriveFolder,
    setSelectedDriveFolder,
    createNewDriveFolder,
    refreshDriveFolders,
    isLoadingDriveFolders,
    invoices,
    showToast
  } = useApp();

  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setIsCreatingFolder(true);
      await createNewDriveFolder(newFolderName.trim());
      setNewFolderName('');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const syncedInvoicesCount = invoices.filter(i => !!i.driveFileId || !!i.driveWebViewLink).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Google Drive Cloud Storage
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Securely back up generated invoice PDFs directly to your Google Drive account.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: AUTHENTICATION STATUS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Google Drive Account</h2>
                {user ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Not Connected
                  </span>
                )}
              </div>

              {user ? (
                <p className="text-xs text-slate-600 mt-0.5">
                  Signed in as <span className="font-semibold text-indigo-700">{user.email}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect your Google Account to authorize saving and viewing invoices in Google Drive.
                </p>
              )}
            </div>
          </div>

          <div>
            {user ? (
              <button
                id="btn-disconnect-google"
                onClick={signOutUser}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                id="btn-connect-google-drive-main"
                onClick={signInWithGoogle}
                disabled={isAuthLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* STEP 2: DESIGNATED FOLDER SELECTOR & CREATOR */}
      {user && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Folder className="w-4 h-4 text-indigo-600" />
                <span>Designated Save Location in Google Drive</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose an existing folder or create a new one where your invoice PDFs will be stored.
              </p>
            </div>

            <button
              onClick={refreshDriveFolders}
              disabled={isLoadingDriveFolders}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFolders ? 'animate-spin' : ''}`} />
              <span>Refresh Folders</span>
            </button>
          </div>

          {/* Create New Folder Form */}
          <form onSubmit={handleCreateFolder} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Create New Folder</label>
              <input
                id="input-new-drive-folder"
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g. My Invoices / Clinic Invoices 2026"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingFolder || !newFolderName.trim()}
              className="w-full sm:w-auto mt-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{isCreatingFolder ? 'Creating...' : 'Create Folder'}</span>
            </button>
          </form>

          {/* Choose from existing folders list */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2">
              Available Google Drive Folders:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {driveFolders.map(folder => {
                const isSelected = selectedDriveFolder?.id === folder.id;
                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setSelectedDriveFolder(folder);
                      showToast('success', 'Save Location Set', `Invoices will save to "${folder.name}"`);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderCheck className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{folder.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {isSelected ? '✓ Selected Destination' : 'Click to select'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {driveFolders.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  {isLoadingDriveFolders ? 'Scanning Google Drive folders...' : 'No folders found. Create one above to get started.'}
                </div>
              )}
            </div>
          </div>

          {/* Storage Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span><strong>{syncedInvoicesCount}</strong> invoices synced to Google Drive.</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
