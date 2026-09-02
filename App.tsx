import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { InvoiceEditor } from './components/InvoiceEditor';
import { TemplateManager } from './components/TemplateManager';
import { InvoiceList } from './components/InvoiceList';
import { DriveSettings } from './components/DriveSettings';
import { ToastContainer } from './components/ToastContainer';

const MainContent: React.FC = () => {
  const { activeView } = useApp();

  return (
    <main className="min-h-[calc(100vh-4rem)] pb-16">
      {activeView === 'create' && <InvoiceEditor />}
      {activeView === 'invoices' && <InvoiceList />}
      {activeView === 'templates' && <TemplateManager />}
      {activeView === 'drive-settings' && <DriveSettings />}
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
        <Navbar />
        <div className="flex-1">
          <MainContent />
        </div>
        <ToastContainer />
      </div>
    </AppProvider>
  );
}
