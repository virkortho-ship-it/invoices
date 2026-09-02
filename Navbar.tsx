import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  Layers, 
  FolderSync, 
  HardDrive, 
  CheckCircle, 
  PlusCircle, 
  LogOut,
  Sparkles
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    user, 
    isAuthLoading, 
    signInWithGoogle, 
    signOutUser, 
    activeView, 
    setActiveView,
    invoices,
    templates,
    selectedDriveFolder
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('create')}
              className="flex items-center gap-3 text-left group focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-[#315f9b] flex items-center justify-center text-white shadow-sm group-hover:bg-[#244a7c] transition-all">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-900 tracking-tight">InvoicePro</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                    Smart Invoices
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal hidden sm:block">Easy Invoicing & PDF Templates</p>
              </div>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 bg-slate-50 rounded-lg border border-slate-200">
            <button
              id="nav-create-invoice"
              onClick={() => setActiveView('create')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'create'
                  ? 'bg-white text-[#315f9b] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-[#315f9b]" />
              <span>Create Invoice</span>
            </button>

            <button
              id="nav-invoices-list"
              onClick={() => setActiveView('invoices')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'invoices'
                  ? 'bg-white text-[#315f9b] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Invoices</span>
              {invoices.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-blue-50 text-[#315f9b] font-bold">
                  {invoices.length}
                </span>
              )}
            </button>

            <button
              id="nav-templates-manager"
              onClick={() => setActiveView('templates')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'templates'
                  ? 'bg-white text-[#315f9b] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Template Builder</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-slate-200 text-slate-700 font-bold hidden sm:inline-block">
                {templates.length}
              </span>
            </button>

            <button
              id="nav-drive-settings"
              onClick={() => setActiveView('drive-settings')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'drive-settings'
                  ? 'bg-white text-[#315f9b] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FolderSync className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">Google Drive</span>
              <span className="md:hidden">Drive</span>
              {user && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </nav>

          {/* User & Google Drive Auth button */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2.5 pr-1.5 py-1 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[110px]">
                      {selectedDriveFolder ? `📁 ${selectedDriveFolder.name}` : 'Connected'}
                    </span>
                  </div>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-lg border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#315f9b] text-white text-xs font-bold flex items-center justify-center">
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={signOutUser}
                  title="Disconnect Google Account"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-200/60 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-google-drive-connect-header"
                onClick={signInWithGoogle}
                disabled={isAuthLoading}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all focus:outline-hidden disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Connect Drive</span>
                <span className="sm:hidden">Drive</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
