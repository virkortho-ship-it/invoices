import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceData, InvoiceStatus } from '../types';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { InvoicePreview } from './InvoicePreview';
import { generateInvoicePdfBlob, downloadPdfBlob } from '../services/pdfGenerator';
import { 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  Download, 
  Trash2, 
  Edit3, 
  Eye, 
  HardDrive, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  Calendar,
  X,
  Copy,
  LayoutGrid,
  Table as TableIcon,
  FileSpreadsheet,
  Layers,
  Building2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'this_quarter' | 'this_year';
type SortField = 'date' | 'dueDate' | 'invoiceNumber' | 'clientName' | 'grandTotal' | 'balanceDue';
type SortOrder = 'asc' | 'desc';

export const InvoiceList: React.FC = () => {
  const { 
    invoices, 
    templates, 
    editInvoice, 
    deleteInvoice, 
    updateInvoiceStatus,
    duplicateInvoice,
    createNewInvoiceFromTemplate,
    user,
    signInWithGoogle,
    syncInvoiceToDrive,
    isSyncingToDrive,
    showToast
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'due' | 'pending' | 'overdue' | 'draft'>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  
  // Date Preset State
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  // Sorting & View
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Selection for batch actions
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Detailed Modal State
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<InvoiceData | null>(null);
  const [isExportingModalPdf, setIsExportingModalPdf] = useState(false);

  // Hidden Render for list-level PDF/Drive generation
  const [invoiceForHiddenRender, setInvoiceForHiddenRender] = useState<InvoiceData | null>(null);
  const hiddenRenderRef = useRef<HTMLDivElement>(null);

  // Filter & Sort Invoices
  const filteredAndSortedInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const clientMatch = inv.recipient.name?.toLowerCase().includes(query) || false;
        const emailMatch = inv.recipient.email?.toLowerCase().includes(query) || false;
        const phoneMatch = inv.recipient.phone?.toLowerCase().includes(query) || false;
        const numberMatch = inv.invoiceNumber?.toLowerCase().includes(query) || false;
        const itemsMatch = inv.items.some(it => it.description?.toLowerCase().includes(query));
        const senderMatch = inv.sender?.companyName?.toLowerCase().includes(query) || false;

        if (!clientMatch && !emailMatch && !phoneMatch && !numberMatch && !itemsMatch && !senderMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'due') {
          if ((inv.balanceDue || 0) <= 0 || inv.status === 'paid') return false;
        } else if (inv.status !== statusFilter) {
          return false;
        }
      }

      // 3. Template Filter
      if (templateFilter !== 'all' && inv.templateId !== templateFilter) {
        return false;
      }

      // 4. Date Filter
      if (datePreset !== 'all') {
        const targetDate = new Date(inv.date);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (datePreset === 'today') {
          if (targetDate < todayStart) return false;
        } else if (datePreset === 'this_week') {
          const weekStart = new Date(todayStart);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          if (targetDate < weekStart) return false;
        } else if (datePreset === 'this_month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (targetDate < monthStart) return false;
        } else if (datePreset === 'last_30_days') {
          const d30 = new Date(todayStart);
          d30.setDate(d30.getDate() - 30);
          if (targetDate < d30) return false;
        } else if (datePreset === 'this_year') {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          if (targetDate < yearStart) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'dueDate') {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortField === 'invoiceNumber') {
        comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (sortField === 'clientName') {
        comparison = a.recipient.name.localeCompare(b.recipient.name);
      } else if (sortField === 'grandTotal') {
        comparison = (a.grandTotal || 0) - (b.grandTotal || 0);
      } else if (sortField === 'balanceDue') {
        comparison = (a.balanceDue || 0) - (b.balanceDue || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [invoices, searchQuery, statusFilter, templateFilter, datePreset, sortField, sortOrder]);

  // Executive Summary Stats
  const stats = useMemo(() => {
    const totalCount = invoices.length;
    const totalPaidAmount = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
    const totalDueAmount = invoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);
    const overdueInvoices = invoices.filter(i => i.status === 'overdue' || (i.balanceDue > 0 && new Date(i.dueDate) < new Date()));
    const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);
    const driveSyncedCount = invoices.filter(i => !!i.driveFileId || !!i.driveWebViewLink).length;

    return {
      totalCount,
      totalPaidAmount,
      totalDueAmount,
      overdueCount: overdueInvoices.length,
      totalOverdueAmount,
      driveSyncedCount
    };
  }, [invoices]);

  // Modal navigation
  const currentModalIndex = selectedInvoiceForModal
    ? filteredAndSortedInvoices.findIndex(inv => inv.id === selectedInvoiceForModal.id)
    : -1;

  const handleModalNext = () => {
    if (currentModalIndex >= 0 && currentModalIndex < filteredAndSortedInvoices.length - 1) {
      setSelectedInvoiceForModal(filteredAndSortedInvoices[currentModalIndex + 1]);
    }
  };

  const handleModalPrev = () => {
    if (currentModalIndex > 0) {
      setSelectedInvoiceForModal(filteredAndSortedInvoices[currentModalIndex - 1]);
    }
  };

  // Helper to ensure an HTML render node is available
  const resolvePreviewElement = async (inv: InvoiceData, previewNode?: HTMLDivElement | null): Promise<HTMLElement> => {
    if (previewNode) return previewNode;
    setInvoiceForHiddenRender(inv);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (hiddenRenderRef.current) {
      return hiddenRenderRef.current;
    }
    throw new Error('Preview element not ready');
  };

  // PDF Download Handler
  const handleDownloadSinglePdf = async (inv: InvoiceData, previewNode?: HTMLDivElement | null) => {
    try {
      setIsExportingModalPdf(true);
      const element = await resolvePreviewElement(inv, previewNode);
      const fileName = `${inv.invoiceNumber || 'Invoice'}_${(inv.recipient.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}`;
      const { blob } = await generateInvoicePdfBlob(element, fileName);
      downloadPdfBlob(blob, fileName);
      showToast('success', 'PDF Downloaded', `Saved ${fileName}.pdf`);
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Download Failed', e.message || 'Could not render PDF.');
    } finally {
      setIsExportingModalPdf(false);
      setInvoiceForHiddenRender(null);
    }
  };

  // Google Drive Sync Handler
  const handleSyncSingleInvoice = async (inv: InvoiceData, previewNode?: HTMLDivElement | null) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    try {
      const element = await resolvePreviewElement(inv, previewNode);
      const fileName = `${inv.invoiceNumber || 'Invoice'}_${(inv.recipient.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}`;
      const { blob } = await generateInvoicePdfBlob(element, fileName);
      await syncInvoiceToDrive(inv, blob);
    } catch (e: any) {
      console.error('Sync failed:', e);
      showToast('error', 'Sync Failed', e.message || 'Failed to sync to Google Drive');
    } finally {
      setInvoiceForHiddenRender(null);
    }
  };

  // Batch Selection
  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === filteredAndSortedInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredAndSortedInvoices.map(i => i.id));
    }
  };

  const toggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Batch Status Update
  const handleBatchMarkPaid = () => {
    selectedInvoiceIds.forEach(id => {
      updateInvoiceStatus(id, 'paid');
    });
    setSelectedInvoiceIds([]);
    showToast('success', 'Batch Updated', `Marked ${selectedInvoiceIds.length} invoices as Paid.`);
  };

  // Batch Delete
  const handleBatchDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedInvoiceIds.length} selected invoices?`)) {
      selectedInvoiceIds.forEach(id => {
        deleteInvoice(id);
      });
      setSelectedInvoiceIds([]);
    }
  };

  // Export CSV Summary Report
  const handleExportCsv = () => {
    if (filteredAndSortedInvoices.length === 0) {
      showToast('warning', 'No Invoices', 'No invoices match current filters.');
      return;
    }

    const headers = ['Invoice Number', 'Client Name', 'Client Email', 'Client Phone', 'Issue Date', 'Due Date', 'Status', 'Grand Total', 'Amount Paid', 'Balance Due', 'Currency', 'Template'];
    const rows = filteredAndSortedInvoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.recipient.name.replace(/"/g, '""')}"`,
      `"${inv.recipient.email || ''}"`,
      `"${inv.recipient.phone || ''}"`,
      `"${inv.date}"`,
      `"${inv.dueDate}"`,
      `"${inv.status}"`,
      inv.grandTotal || 0,
      inv.amountPaid || 0,
      inv.balanceDue || 0,
      `"${inv.currency?.code || 'PKR'}"`,
      `"${inv.templateName || 'Standard'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'CSV Exported', `Exported ${filteredAndSortedInvoices.length} invoices.`);
  };

  const currencySymbol = invoices[0]?.currency?.symbol || 'Rs.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* 1. TOP HEADER & MAIN ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              <span>Invoices</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {invoices.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track invoices, download PDFs, view status, and sync to Google Drive.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-all"
            title="Export CSV spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-create-invoice-header"
            onClick={() => createNewInvoiceFromTemplate()}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all active:scale-95 ml-auto md:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Invoices */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Invoices</span>
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">{filteredAndSortedInvoices.length} matching filter</p>
        </div>

        {/* Collected Revenue */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Collected / Paid</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-700">
            {currencySymbol} {stats.totalPaidAmount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Paid in full</p>
        </div>

        {/* Outstanding Due */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Outstanding Due</span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-700">
            {currencySymbol} {stats.totalDueAmount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.overdueCount > 0 ? (
              <span className="text-rose-600 font-semibold">{stats.overdueCount} overdue</span>
            ) : (
              'All on schedule'
            )}
          </p>
        </div>

        {/* Google Drive Sync */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Google Drive Sync</span>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.driveSyncedCount} / {stats.totalCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Backed up in cloud</p>
        </div>

      </div>

      {/* 3. SEARCH, FILTERS & VIEW BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, client name, email, phone, or service item..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-9 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle (Table / Grid) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Status & Date Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
            {[
              { key: 'all', label: 'All' },
              { key: 'paid', label: 'Paid' },
              { key: 'due', label: 'Due Balance' },
              { key: 'pending', label: 'Pending' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'draft', label: 'Draft' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === tab.key
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Date:</span>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 focus:border-indigo-600 outline-hidden"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

        </div>
      </div>

      {/* 4. BATCH ACTIONS BAR (When items are selected) */}
      {selectedInvoiceIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-indigo-950">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold">
              {selectedInvoiceIds.length}
            </span>
            <span>invoices selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchMarkPaid}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-colors"
            >
              Mark Paid
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-bold transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 5. INVOICES DATA DISPLAY */}
      {filteredAndSortedInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Invoices Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try changing your search keywords or resetting filters.'
              : 'Create your first invoice by clicking the button below.'}
          </p>
          <button
            onClick={() => createNewInvoiceFromTemplate()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedInvoiceIds.length === filteredAndSortedInvoices.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-indigo-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Client / Patient</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Total</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5 text-center">Drive</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedInvoices.map(inv => {
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  const symbol = inv.currency?.symbol || 'Rs.';

                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectInvoice(inv.id)}
                          className="rounded accent-indigo-600 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5 font-bold font-mono text-slate-900">
                        <button
                          onClick={() => setSelectedInvoiceForModal(inv)}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>

                      <td className="p-3.5 font-medium text-slate-800">
                        <div className="truncate max-w-[180px]">{inv.recipient.name}</div>
                        {inv.recipient.phone && (
                          <span className="text-[10px] text-slate-400 block">{inv.recipient.phone}</span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        {inv.date}
                      </td>

                      <td className="p-3.5">
                        {inv.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid
                          </span>
                        ) : inv.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Overdue
                          </span>
                        ) : inv.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {symbol} {(inv.grandTotal || 0).toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-semibold whitespace-nowrap">
                        {(inv.balanceDue || 0) > 0 ? (
                          <span className="text-amber-700">
                            {symbol} {(inv.balanceDue || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        {inv.driveWebViewLink ? (
                          <a
                            href={inv.driveWebViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 text-emerald-600 hover:text-emerald-700"
                            title="View in Google Drive"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </a>
                        ) : (
                          <button
                            onClick={() => handleSyncSingleInvoice(inv)}
                            className="inline-flex p-1 text-slate-400 hover:text-indigo-600"
                            title="Upload to Google Drive"
                          >
                            <HardDrive className="w-4 h-4" />
                          </button>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedInvoiceForModal(inv)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                            title="View Details & PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => editInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadSinglePdf(inv)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete invoice ${inv.invoiceNumber}?`)) {
                                deleteInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedInvoices.map(inv => {
            const isSelected = selectedInvoiceIds.includes(inv.id);
            const symbol = inv.currency?.symbol || 'Rs.';

            return (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                  isSelected ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-indigo-600">
                      {inv.invoiceNumber}
                    </span>
                    {inv.status === 'paid' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid
                      </span>
                    ) : inv.status === 'overdue' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Overdue
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 truncate">{inv.recipient.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{inv.date} · Due: {inv.dueDate}</p>

                  <div className="my-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Grand Total</span>
                      <span className="text-base font-bold text-slate-900">
                        {symbol} {(inv.grandTotal || 0).toLocaleString()}
                      </span>
                    </div>

                    {(inv.balanceDue || 0) > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Balance Due</span>
                        <span className="text-xs font-bold text-amber-700">
                          {symbol} {(inv.balanceDue || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedInvoiceForModal(inv)}
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View Details
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => editInvoice(inv)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownloadSinglePdf(inv)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                      title="PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteInvoice(inv.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HIDDEN OFF-SCREEN RENDER NODE */}
      {invoiceForHiddenRender && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '794px', zIndex: -100 }}>
          <InvoicePreview
            ref={hiddenRenderRef}
            invoice={invoiceForHiddenRender}
            template={templates.find(t => t.id === invoiceForHiddenRender.templateId) || templates[0]}
          />
        </div>
      )}

      {/* DETAIL MODAL POPUP */}
      {selectedInvoiceForModal && (
        <InvoiceDetailsModal
          invoice={selectedInvoiceForModal}
          template={templates.find(t => t.id === selectedInvoiceForModal.templateId) || templates[0]}
          onClose={() => setSelectedInvoiceForModal(null)}
          onEdit={(inv) => {
            setSelectedInvoiceForModal(null);
            editInvoice(inv);
          }}
          onDelete={(id) => {
            deleteInvoice(id);
            setSelectedInvoiceForModal(null);
          }}
          onDuplicate={(id) => {
            duplicateInvoice(id);
            setSelectedInvoiceForModal(null);
          }}
          onStatusChange={(id, status) => {
            updateInvoiceStatus(id, status);
            setSelectedInvoiceForModal(prev => prev ? { ...prev, status } : null);
          }}
          onDownloadPdf={handleDownloadSinglePdf}
          onSyncDrive={handleSyncSingleInvoice}
          isSyncing={isSyncingToDrive}
          isExportingPdf={isExportingModalPdf}
          onNavigateNext={handleModalNext}
          onNavigatePrev={handleModalPrev}
          currentIndex={currentModalIndex}
          totalCount={filteredAndSortedInvoices.length}
        />
      )}

    </div>
  );
};
