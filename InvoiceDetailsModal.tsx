import React, { useState, useRef } from 'react';
import { InvoiceData, InvoiceTemplate, InvoiceStatus } from '../types';
import { InvoicePreview } from './InvoicePreview';
import { 
  X, 
  Download, 
  Printer, 
  Edit3, 
  Copy, 
  Trash2, 
  HardDrive, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  User, 
  Building2, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard,
  Hash,
  ShieldCheck,
  Share2
} from 'lucide-react';

interface InvoiceDetailsModalProps {
  invoice: InvoiceData;
  template?: InvoiceTemplate;
  onClose: () => void;
  onEdit: (invoice: InvoiceData) => void;
  onDelete: (invoiceId: string) => void;
  onDuplicate: (invoiceId: string) => void;
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void;
  onDownloadPdf: (invoice: InvoiceData, previewElement: HTMLDivElement | null) => Promise<void>;
  onSyncDrive: (invoice: InvoiceData, previewElement: HTMLDivElement | null) => Promise<void>;
  isSyncing: boolean;
  isExportingPdf: boolean;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  template,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  onDownloadPdf,
  onSyncDrive,
  isSyncing,
  isExportingPdf,
  onNavigateNext,
  onNavigatePrev,
  currentIndex,
  totalCount,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'breakdown'>('preview');
  const previewRef = useRef<HTMLDivElement>(null);
  const symbol = invoice.currency?.symbol || 'Rs.';

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid in Full
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Overdue
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Payment Due
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3.5 h-3.5" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 my-auto">
        
        {/* MODAL TOP HEADER */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Invoice {invoice.invoiceNumber}
                </h2>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Issued for <span className="font-semibold text-slate-800">{invoice.recipient.name}</span> on {invoice.date}
              </p>
            </div>
          </div>

          {/* Quick Status Selector & Navigation Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            
            {/* Pagination between invoices */}
            {typeof currentIndex === 'number' && typeof totalCount === 'number' && totalCount > 1 && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-slate-700 text-xs">
                <button
                  onClick={onNavigatePrev}
                  disabled={currentIndex === 0}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Previous Invoice"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-[11px] text-slate-500">
                  {currentIndex + 1} / {totalCount}
                </span>
                <button
                  onClick={onNavigateNext}
                  disabled={currentIndex === totalCount - 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Next Invoice"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Status Dropdown */}
            <select
              value={invoice.status}
              onChange={e => onStatusChange(invoice.id, e.target.value as InvoiceStatus)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 outline-hidden cursor-pointer"
            >
              <option value="paid">✅ Mark Paid</option>
              <option value="pending">⏳ Mark Pending</option>
              <option value="overdue">⚠️ Mark Overdue</option>
              <option value="draft">📝 Mark Draft</option>
            </select>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              title="Close Details Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* MODAL ACTION TOOLBAR */}
        <div className="px-5 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Left View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === 'preview' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 A4 Document Preview
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === 'breakdown' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 Financial Breakdown
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onEdit(invoice)}
              className="flex items-center gap-1 px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => onDuplicate(invoice.id)}
              className="flex items-center gap-1 px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors hidden sm:flex"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={() => onDownloadPdf(invoice, previewRef.current)}
              disabled={isExportingPdf}
              className="flex items-center gap-1 px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
            </button>

            <button
              onClick={() => onSyncDrive(invoice, previewRef.current)}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3.5 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Syncing...' : 'Sync to Drive'}</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this invoice?')) {
                  onDelete(invoice.id);
                  onClose();
                }
              }}
              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Delete Invoice"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* PREVIEW TAB */}
          <div className={activeTab === 'preview' ? 'block' : 'hidden'}>
            <div className="max-w-3xl mx-auto rounded-xl shadow-md border border-slate-200 overflow-hidden bg-white p-2 sm:p-4">
              <InvoicePreview
                ref={previewRef}
                invoice={invoice}
                template={template}
              />
            </div>
          </div>

          {/* BREAKDOWN TAB */}
          {activeTab === 'breakdown' && (
            <div className="max-w-4xl mx-auto space-y-5">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Grand Total</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {symbol} {(invoice.grandTotal || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Amount Paid</span>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {symbol} {(invoice.amountPaid || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Balance Due</span>
                  <p className="text-xl font-bold text-amber-700 mt-1">
                    {symbol} {(invoice.balanceDue || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Google Drive</span>
                  <div className="mt-1">
                    {invoice.driveWebViewLink ? (
                      <a
                        href={invoice.driveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved in Cloud</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Not uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Line Items</h3>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="p-3">#</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-medium text-slate-800">{it.description}</td>
                        <td className="p-3 text-center text-slate-600">{it.quantity}</td>
                        <td className="p-3 text-right text-slate-600">{symbol} {Number(it.unitPrice).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-600">{it.discountPercent ? `${it.discountPercent}%` : '-'}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{symbol} {Number(it.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes & Bank Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 mb-1">Payment Instructions</h4>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.paymentDetails || 'None specified'}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 mb-1">Notes & Terms</h4>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.notes || invoice.paymentTerms || 'None'}</p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
