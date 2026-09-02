import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceItem, InvoiceData, SavedCustomer, BusinessDetails } from '../types';
import { InvoicePreview } from './InvoicePreview';
import { generateInvoicePdfBlob, downloadPdfBlob } from '../services/pdfGenerator';
import { 
  Plus, 
  Trash2, 
  Download, 
  CloudUpload, 
  ExternalLink, 
  Printer, 
  Save, 
  Layers, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  User, 
  Building, 
  CreditCard, 
  Eye, 
  RefreshCw,
  Sparkles,
  FilePlus2,
  Search,
  UserPlus,
  Upload,
  X,
  Building2,
  Image as ImageIcon
} from 'lucide-react';

export const InvoiceEditor: React.FC = () => {
  const {
    currentInvoice,
    setCurrentInvoice,
    templates,
    activeTemplate,
    setActiveTemplate,
    saveInvoice,
    syncInvoiceToDrive,
    isSyncingToDrive,
    user,
    signInWithGoogle,
    selectedDriveFolder,
    setActiveView,
    showToast,
    createNewInvoiceFromTemplate,
    businessProfile,
    saveBusinessProfile,
    customers,
    saveCustomer
  } = useApp();

  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [profileDraft, setProfileDraft] = useState<BusinessDetails>({ ...businessProfile });
  const [newCustomer, setNewCustomer] = useState<SavedCustomer>({
    id: '', name: '', contactPerson: '', email: '', phone: '', address: '', cityStateZip: '', taxNumber: '', notes: '', createdAt: '', updatedAt: ''
  });

  const filteredCustomers = customers.filter(c =>
    `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const applyCustomer = (customer: SavedCustomer) => {
    updateInvoiceState(prev => ({ ...prev, recipient: {
      name: customer.name, contactPerson: customer.contactPerson || '', email: customer.email, phone: customer.phone,
      address: customer.address, cityStateZip: customer.cityStateZip || '', taxNumber: customer.taxNumber || '', notes: customer.notes || ''
    }}));
    setCustomerSearch(customer.name);
    setShowCustomerForm(false);
    showToast('success', 'Customer Selected', `${customer.name} details filled into the invoice.`);
  };

  const handleSaveProfile = () => {
    saveBusinessProfile(profileDraft);
    setShowProfileEditor(false);
  };

  const handleSaveNewCustomer = () => {
    if (!newCustomer.name.trim()) {
      showToast('warning', 'Customer Name Required', 'Enter a customer name before saving.');
      return;
    }
    const now = new Date().toISOString();
    const saved = { ...newCustomer, id: newCustomer.id || `cust-${Date.now()}`, createdAt: newCustomer.createdAt || now, updatedAt: now };
    saveCustomer(saved);
    applyCustomer(saved);
    setNewCustomer({ id: '', name: '', contactPerson: '', email: '', phone: '', address: '', cityStateZip: '', taxNumber: '', notes: '', createdAt: '', updatedAt: '' });
  };


  // Recalculate totals whenever items or charges change
  const updateInvoiceState = (updater: (prev: InvoiceData) => InvoiceData) => {
    setCurrentInvoice(prev => {
      const next = updater(prev);
      
      // Calculate totals
      let sub = 0;
      let tax = 0;
      let disc = 0;

      next.items.forEach(it => {
        const raw = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
        const itemDisc = raw * ((Number(it.discountPercent) || 0) / 100);
        const itemTax = (raw - itemDisc) * ((Number(it.taxRatePercent) || 0) / 100);
        sub += raw;
        disc += itemDisc;
        tax += itemTax;
      });

      const grand = sub - disc + tax + (Number(next.shippingFee) || 0);
      const paid = Number(next.amountPaid) || 0;
      const due = Math.max(0, grand - paid);

      return {
        ...next,
        subtotal: sub,
        discountTotal: disc,
        taxTotal: tax,
        grandTotal: grand,
        balanceDue: due,
      };
    });
  };

  // Handle Template change
  const handleSelectTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setActiveTemplate(tpl);

    // Apply template properties to current invoice
    updateInvoiceState(prev => {
      const customValues = { ...prev.customFieldValues };
      tpl.customFields.forEach(cf => {
        if (!customValues[cf.id] && cf.defaultValue) {
          customValues[cf.id] = cf.defaultValue;
        }
      });

      return {
        ...prev,
        templateId: tpl.id,
        templateName: tpl.name,
        currency: { ...tpl.currency },
        sender: { ...tpl.businessDetails },
        notes: prev.notes || tpl.defaultNotes,
        paymentTerms: prev.paymentTerms || tpl.defaultPaymentTerms,
        paymentDetails: prev.paymentDetails || tpl.paymentDetails,
        customFieldValues: customValues,
      };
    });

    showToast('info', 'Template Applied', `Switched to "${tpl.name}"`);
  };

  // Line item handlers
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxRatePercent: activeTemplate?.defaultTaxRate || 0,
      amount: 0,
    };
    updateInvoiceState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    updateInvoiceState(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id === id) {
          const updated = { ...it, [field]: value };
          const raw = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
          const disc = raw * ((Number(updated.discountPercent) || 0) / 100);
          const tax = (raw - disc) * ((Number(updated.taxRatePercent) || 0) / 100);
          updated.amount = raw - disc + tax;
          return updated;
        }
        return it;
      }),
    }));
  };

  const handleRemoveItem = (id: string) => {
    updateInvoiceState(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== id),
    }));
  };

  // Custom field update
  const handleCustomFieldChange = (fieldId: string, val: string) => {
    updateInvoiceState(prev => ({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [fieldId]: val,
      },
    }));
  };

  // Save invoice locally
  const handleSaveLocally = () => {
    saveInvoice(currentInvoice);
    showToast('success', 'Invoice Saved', `Saved #${currentInvoice.invoiceNumber || 'Invoice'}`);
  };

  // Generate & Download PDF
  const handleDownloadPdf = async () => {
    if (!previewRef.current) {
      showToast('error', 'PDF Error', 'Preview element not ready. Please try again.');
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const fileName = `${currentInvoice.invoiceNumber || 'Invoice'}_${(currentInvoice.recipient.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}`;
      const { blob } = await generateInvoicePdfBlob(previewRef.current, fileName);
      downloadPdfBlob(blob, fileName);
      showToast('success', 'PDF Downloaded', `Saved ${fileName}.pdf`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Download Failed', 'Failed to render PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save & Sync to Google Drive
  const handleSyncToDrive = async () => {
    if (!user) {
      showToast('info', 'Connect Google Drive', 'Please sign in with Google to enable Drive sync.');
      await signInWithGoogle();
      return;
    }

    if (!previewRef.current) {
      showToast('error', 'Error', 'Cannot render invoice PDF for upload.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const fileName = `${currentInvoice.invoiceNumber || 'Invoice'}_${(currentInvoice.recipient.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}`;
      const { blob } = await generateInvoicePdfBlob(previewRef.current, fileName);
      await syncInvoiceToDrive(currentInvoice, blob);
    } catch (err: any) {
      console.error('Sync failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  const enabledCustomFields = (activeTemplate?.customFields || []).filter(f => f.enabled);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* TOP CONTROLS & TEMPLATE BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Template Chooser */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs sm:text-sm">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Template:</span>
          </div>

          <select
            id="select-invoice-template"
            value={activeTemplate?.id || ''}
            onChange={e => handleSelectTemplate(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 outline-hidden cursor-pointer"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.currency.symbol})
              </option>
            ))}
          </select>

          <button
            onClick={() => setActiveView('templates')}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customize / Create Template</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          
          {/* Drive Status info */}
          {currentInvoice.driveWebViewLink && (
            <a
              href={currentInvoice.driveWebViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              title="Open saved file in Google Drive"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>In Drive</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </a>
          )}

          {/* Save Draft Locally */}
          <button
            id="btn-save-invoice-draft"
            onClick={handleSaveLocally}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Save Draft</span>
          </button>

          {/* Download PDF */}
          <button
            id="btn-download-invoice-pdf"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download PDF</span>
          </button>

          {/* Print */}
          <button
            id="btn-print-invoice"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors hidden sm:flex"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>

          {/* Primary Action: Save & Sync to Google Drive */}
          <button
            id="btn-sync-google-drive"
            onClick={handleSyncToDrive}
            disabled={isSyncingToDrive || isGeneratingPdf}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {isSyncingToDrive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Drive...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>{user ? 'Sync to Drive' : 'Connect Drive'}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* MOBILE TAB TOGGLE (Between Edit Form & Live Preview) */}
      <div className="lg:hidden flex rounded-xl bg-slate-200/80 p-1 mb-4">
        <button
          onClick={() => setPreviewTab('editor')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all ${
            previewTab === 'editor' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ✏️ Edit Invoice
        </button>
        <button
          onClick={() => setPreviewTab('preview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all ${
            previewTab === 'preview' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          👁️ Live Preview & PDF
        </button>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: INVOICE FORM (6 cols on Desktop) */}
        <div className={`lg:col-span-6 space-y-6 ${previewTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          
          {/* Business Profile */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-600" /> Business Profile</h2>
                <p className="text-[11px] text-slate-500 mt-1">Saved details automatically appear on new invoices.</p>
              </div>
              <button onClick={() => { setProfileDraft({ ...businessProfile }); setShowProfileEditor(v => !v); }} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">{showProfileEditor ? 'Close' : 'Edit Profile'}</button>
            </div>
            {!showProfileEditor ? (
              <div className="mt-4 flex items-center gap-4">
                {businessProfile.logoUrl ? <img src={businessProfile.logoUrl} alt="Business logo" className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white" /> : <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-400" /></div>}
                <div className="min-w-0"><div className="font-bold text-sm truncate">{businessProfile.companyName || 'Your Company'}</div><div className="text-[11px] text-slate-500 truncate">{businessProfile.email || 'Add email'} · {businessProfile.phone || 'Add phone'}</div><div className="text-[11px] text-slate-500 truncate">{businessProfile.address || 'Add business address'}</div></div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([['companyName','Company Name'],['contactPerson','Contact Person'],['email','Email'],['phone','Phone'],['address','Address'],['cityStateZip','City / State / ZIP'],['taxNumber','Tax / GST / NTN'],['website','Website']] as const).map(([key,label]) => (
                  <div key={key}><label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label><input type="text" value={(profileDraft as any)[key] || ''} onChange={e => setProfileDraft(prev => ({ ...prev, [key]: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs" /></div>
                ))}
                <div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-700 mb-1">Business Logo</label><div className="flex items-center gap-3"><label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"><Upload className="w-4 h-4" /> Upload Logo<input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setProfileDraft(prev=>({ ...prev, logoUrl: String(r.result) })); r.readAsDataURL(f); }} /></label>{profileDraft.logoUrl && <img src={profileDraft.logoUrl} alt="Preview" className="h-10 w-20 object-contain border border-slate-200 rounded" />} </div></div>
                <div className="sm:col-span-2 flex justify-end"><button onClick={handleSaveProfile} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold">Save Business Profile</button></div>
              </div>
            )}
          </div>

          {/* Section 1: Header Meta (Invoice #, Dates, Status) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Invoice Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number</label>
                <input
                  id="input-invoice-number"
                  type="text"
                  value={currentInvoice.invoiceNumber}
                  onChange={e => updateInvoiceState(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                  placeholder="INV-2026-001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                <input
                  id="input-invoice-date"
                  type="date"
                  value={currentInvoice.date}
                  onChange={e => updateInvoiceState(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  id="input-invoice-due-date"
                  type="date"
                  value={currentInvoice.dueDate}
                  onChange={e => updateInvoiceState(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                <select
                  id="select-invoice-status"
                  value={currentInvoice.status}
                  onChange={e => updateInvoiceState(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-hidden"
                >
                  <option value="pending">⏳ Pending Payment</option>
                  <option value="paid">✅ Paid in Full</option>
                  <option value="overdue">⚠️ Overdue</option>
                  <option value="draft">📝 Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentInvoice.currency.symbol}
                    onChange={e => updateInvoiceState(prev => ({ ...prev, currency: { ...prev.currency, symbol: e.target.value } }))}
                    className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 text-center focus:bg-white outline-hidden"
                    placeholder="Rs. / $"
                  />
                  <input
                    type="text"
                    value={currentInvoice.currency.code}
                    onChange={e => updateInvoiceState(prev => ({ ...prev, currency: { ...prev.currency, code: e.target.value } }))}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white outline-hidden"
                    placeholder="PKR / USD"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Recipient / Client Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Client / Patient / Recipient Details</span>
              </span>
            </h2>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2 mb-2"><label className="text-xs font-bold text-slate-800">Search Customer</label><button type="button" onClick={() => setShowCustomerForm(v => !v)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold"><UserPlus className="w-3.5 h-3.5" /> New Customer</button></div>
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search saved customer..." className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs" /></div>
              {customerSearch && filteredCustomers.length > 0 && <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">{filteredCustomers.map(c => <button key={c.id} type="button" onClick={() => applyCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b last:border-0 border-slate-100"><div className="text-xs font-bold">{c.name}</div><div className="text-[10px] text-slate-500">{c.email || c.phone || c.address}</div></button>)}</div>}
              {customerSearch && filteredCustomers.length === 0 && <p className="mt-2 text-[11px] text-slate-500">No saved customer found. Click <b>New Customer</b> to add one.</p>}
            </div>

            {showCustomerForm && (
              <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold text-slate-900">Add New Customer</h3><button onClick={() => setShowCustomerForm(false)}><X className="w-4 h-4 text-slate-500" /></button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([['name','Name *'],['contactPerson','Contact Person'],['phone','Phone'],['email','Email'],['address','Address'],['cityStateZip','City / State / ZIP'],['taxNumber','Tax / GST']] as const).map(([key,label]) => <div key={key}><label className="block text-[11px] font-semibold text-slate-700 mb-1">{label}</label><input type="text" value={(newCustomer as any)[key] || ''} onChange={e => setNewCustomer(prev => ({ ...prev, [key]: e.target.value }))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs" /></div>)}
                </div>
                <div className="mt-3 flex justify-end"><button onClick={handleSaveNewCustomer} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold">Save & Use Customer</button></div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeTemplate?.category === 'medical' ? 'Patient / Client Name *' : 'Client / Company Name *'}
                </label>
                <input
                  id="input-client-name"
                  type="text"
                  value={currentInvoice.recipient.name}
                  onChange={e => updateInvoiceState(prev => ({
                    ...prev,
                    recipient: { ...prev.recipient, name: e.target.value },
                  }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                  placeholder="e.g. Muhammad Usman"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  id="input-client-phone"
                  type="text"
                  value={currentInvoice.recipient.phone}
                  onChange={e => updateInvoiceState(prev => ({
                    ...prev,
                    recipient: { ...prev.recipient, phone: e.target.value },
                  }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                  placeholder="+92 300 1234567"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  id="input-client-email"
                  type="email"
                  value={currentInvoice.recipient.email}
                  onChange={e => updateInvoiceState(prev => ({
                    ...prev,
                    recipient: { ...prev.recipient, email: e.target.value },
                  }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                  placeholder="client@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address / City</label>
                <input
                  id="input-client-address"
                  type="text"
                  value={currentInvoice.recipient.address}
                  onChange={e => updateInvoiceState(prev => ({
                    ...prev,
                    recipient: { ...prev.recipient, address: e.target.value },
                  }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                  placeholder="Address, City, Country"
                />
              </div>
            </div>

            {/* Custom Template Fields for Client/Header */}
            {enabledCustomFields.length > 0 && (
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-bold text-indigo-700 mb-2">Template Custom Fields:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enabledCustomFields.map(cf => (
                    <div key={cf.id}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{cf.label}</label>
                      <input
                        type="text"
                        value={currentInvoice.customFieldValues[cf.id] ?? cf.defaultValue ?? ''}
                        onChange={e => handleCustomFieldChange(cf.id, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                        placeholder={cf.placeholder || `Enter ${cf.label}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Line Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <span>Line Items & Services</span>
              </h2>
              <button
                id="btn-add-line-item"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentInvoice.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500 mt-2">{idx + 1}.</span>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                        placeholder="Service, consultation, or product description..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-hidden"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pl-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 text-center focus:border-indigo-600 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Price ({currentInvoice.currency.symbol})</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={e => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 text-right focus:border-indigo-600 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent || 0}
                        onChange={e => handleUpdateItem(item.id, 'discountPercent', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 text-right focus:border-indigo-600 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Total</label>
                      <div className="w-full bg-slate-200 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 text-right truncate">
                        {currentInvoice.currency.symbol} {((item.quantity * item.unitPrice) * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional financial fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shipping / Surcharge ({currentInvoice.currency.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentInvoice.shippingFee || 0}
                  onChange={e => updateInvoiceState(prev => ({ ...prev, shippingFee: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Paid ({currentInvoice.currency.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentInvoice.amountPaid || 0}
                  onChange={e => updateInvoiceState(prev => ({ ...prev, amountPaid: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 focus:bg-white focus:border-indigo-600 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Notes & Payment Instructions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Notes & Payment Details</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank / JazzCash / EasyPaisa / IBAN</label>
              <textarea
                rows={2}
                value={currentInvoice.paymentDetails}
                onChange={e => updateInvoiceState(prev => ({ ...prev, paymentDetails: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                placeholder="Bank Name, Account Title, Account Number / IBAN..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Notes / Advice</label>
              <textarea
                rows={2}
                value={currentInvoice.notes}
                onChange={e => updateInvoiceState(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                placeholder="Thank you note, follow-up advice, terms..."
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE HIGH-FIDELITY PREVIEW (6 cols on Desktop) */}
        <div className={`lg:col-span-6 sticky top-20 ${previewTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Live Document Preview</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200">
                A4 Printable
              </span>
            </div>

            {/* Actual Render Node */}
            <div className="max-h-[75vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-2 sm:p-3">
              <InvoicePreview
                ref={previewRef}
                invoice={currentInvoice}
                template={activeTemplate}
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
