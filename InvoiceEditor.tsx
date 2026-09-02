import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessDetails, InvoiceData, InvoiceItem, RecipientDetails } from '../types';
import { InvoicePreview } from './InvoicePreview';
import { downloadPdfBlob, generateInvoicePdfBlob } from '../services/pdfGenerator';
import {
  Plus, Trash2, Download, CloudUpload, Printer, Save, Layers, Calendar,
  User, Building2, ChevronDown, Search, UserPlus, X, Check, ImagePlus,
  FilePlus2, RefreshCw, MoreVertical, ExternalLink
} from 'lucide-react';

const BUSINESS_PROFILE_KEY = 'invoicemaker_business_profile_v2';
const CUSTOMERS_KEY = 'invoicemaker_customers_v2';

const blankBusiness = (): BusinessDetails => ({
  companyName: '', contactPerson: '', email: '', phone: '', address: '', cityStateZip: '', taxNumber: '', logoUrl: '', website: ''
});

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('Storage write failed', e); }
};

const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 700;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/webp', 0.86));
    };
    img.onerror = reject;
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

const customerKey = (c: RecipientDetails) => `${c.name}|${c.email}|${c.phone}`.toLowerCase();

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
  } = useApp();

  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);
  const [business, setBusiness] = useState<BusinessDetails>(() => ({
    ...blankBusiness(),
    ...readJson<BusinessDetails>(BUSINESS_PROFILE_KEY, {} as BusinessDetails),
  }));
  const [customers, setCustomers] = useState<RecipientDetails[]>(() => readJson<RecipientDetails[]>(CUSTOMERS_KEY, []));
  const [newCustomer, setNewCustomer] = useState<RecipientDetails>({
    name: '', contactPerson: '', email: '', phone: '', address: '', cityStateZip: '', taxNumber: '', notes: ''
  });
  const [logoBusy, setLogoBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep the saved business profile current without requiring the user to re-enter it on every invoice.
    const saved = readJson<BusinessDetails | null>(BUSINESS_PROFILE_KEY, null);
    if (saved && saved.companyName) {
      setBusiness(prev => ({ ...prev, ...saved }));
    }
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 12);
    return customers.filter(c => [c.name, c.contactPerson, c.email, c.phone, c.address].some(v => String(v || '').toLowerCase().includes(q))).slice(0, 12);
  }, [customers, customerSearch]);

  const updateInvoiceState = (updater: (prev: InvoiceData) => InvoiceData) => {
    setCurrentInvoice(prev => {
      const next = updater(prev);
      let sub = 0, tax = 0, disc = 0;
      next.items.forEach(it => {
        const raw = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
        const d = raw * ((Number(it.discountPercent) || 0) / 100);
        const t = (raw - d) * ((Number(it.taxRatePercent) || 0) / 100);
        sub += raw; disc += d; tax += t;
      });
      const grand = sub - disc + tax + (Number(next.shippingFee) || 0);
      const paid = Number(next.amountPaid) || 0;
      return { ...next, subtotal: sub, discountTotal: disc, taxTotal: tax, grandTotal: grand, balanceDue: Math.max(0, grand - paid) };
    });
  };

  const saveBusinessProfile = (next = business) => {
    writeJson(BUSINESS_PROFILE_KEY, next);
    setBusiness(next);
    updateInvoiceState(prev => ({ ...prev, sender: { ...prev.sender, ...next } }));
    if (activeTemplate) {
      setActiveTemplate({ ...activeTemplate, businessDetails: { ...activeTemplate.businessDetails, ...next }, updatedAt: new Date().toISOString() });
    }
    showToast('success', 'Business Profile Saved', 'Your company details and logo will be reused for new invoices.');
  };

  const handleLogo = async (file?: File) => {
    if (!file) return;
    try {
      setLogoBusy(true);
      const dataUrl = await compressImage(file);
      const next = { ...business, logoUrl: dataUrl };
      saveBusinessProfile(next);
    } catch (e) {
      console.error(e);
      showToast('error', 'Logo Upload Failed', 'Please choose a valid image file.');
    } finally { setLogoBusy(false); }
  };

  const applyCustomer = (customer: RecipientDetails) => {
    updateInvoiceState(prev => ({ ...prev, recipient: { ...customer } }));
    setCustomerSearch(customer.name);
    setCustomerOpen(false);
    showToast('success', 'Customer Selected', `${customer.name} was added to this invoice.`);
  };

  const addCustomer = () => {
    if (!newCustomer.name.trim()) {
      showToast('warning', 'Customer Name Required', 'Please enter a customer name.');
      return;
    }
    const next = [...customers];
    const key = customerKey(newCustomer);
    const index = next.findIndex(c => customerKey(c) === key);
    if (index >= 0) next[index] = { ...next[index], ...newCustomer };
    else next.unshift({ ...newCustomer });
    setCustomers(next);
    writeJson(CUSTOMERS_KEY, next);
    applyCustomer(newCustomer);
    setNewCustomer({ name: '', contactPerson: '', email: '', phone: '', address: '', cityStateZip: '', taxNumber: '', notes: '' });
    setShowAddCustomer(false);
  };

  const handleSelectTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setActiveTemplate(tpl);
    updateInvoiceState(prev => ({
      ...prev,
      templateId: tpl.id,
      templateName: tpl.name,
      currency: { ...tpl.currency },
      sender: { ...prev.sender, ...tpl.businessDetails, ...business },
      notes: prev.notes || tpl.defaultNotes,
      paymentTerms: prev.paymentTerms || tpl.defaultPaymentTerms,
      paymentDetails: prev.paymentDetails || tpl.paymentDetails,
    }));
    showToast('info', 'Template Applied', `Switched to "${tpl.name}"`);
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = { id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRatePercent: activeTemplate?.defaultTaxRate || 0, amount: 0 };
    updateInvoiceState(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    updateInvoiceState(prev => ({ ...prev, items: prev.items.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value } as InvoiceItem;
      const raw = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
      const disc = raw * ((Number(updated.discountPercent) || 0) / 100);
      const tax = (raw - disc) * ((Number(updated.taxRatePercent) || 0) / 100);
      updated.amount = raw - disc + tax;
      return updated;
    }) }));
  };

  const handleRemoveItem = (id: string) => updateInvoiceState(prev => ({ ...prev, items: prev.items.filter(it => it.id !== id) }));

  const handleSaveLocally = () => saveInvoice(currentInvoice);

  const renderPdf = async () => {
    if (!previewRef.current) throw new Error('Preview not ready');
    const fileName = `${currentInvoice.invoiceNumber || 'Invoice'}_${(currentInvoice.recipient.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}`;
    return generateInvoicePdfBlob(previewRef.current, fileName);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const fileName = `${currentInvoice.invoiceNumber || 'Invoice'}_${(currentInvoice.recipient.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}`;
      const { blob } = await renderPdf();
      downloadPdfBlob(blob, fileName);
      saveInvoice(currentInvoice);
      showToast('success', 'PDF Ready', 'Invoice downloaded and saved.');
    } catch (err) { console.error(err); showToast('error', 'PDF Error', 'Failed to create the PDF.'); }
    finally { setIsGeneratingPdf(false); }
  };

  const handlePrint = () => window.print();

  const handleSyncToDrive = async () => {
    if (!user) {
      showToast('info', 'Connect Google Drive', 'Please sign in with Google first.');
      await signInWithGoogle();
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const { blob } = await renderPdf();
      const result = await syncInvoiceToDrive(currentInvoice, blob);
      if (result?.webViewLink) window.open(result.webViewLink, '_blank', 'noopener,noreferrer');
    } catch (err) { console.error(err); showToast('error', 'Drive Save Failed', 'Could not save the invoice to Google Drive.'); }
    finally { setIsGeneratingPdf(false); }
  };

  const startNewInvoice = () => {
    createNewInvoiceFromTemplate(activeTemplate);
    setCustomerSearch('');
    showToast('success', 'New Invoice', 'Started a fresh invoice using your saved business profile.');
  };

  const enabledCustomFields = (activeTemplate?.customFields || []).filter(f => f.enabled);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* HEADER / ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
          <p className="text-sm text-slate-500">Your company details, logo and saved customers are reused automatically.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={activeTemplate?.id || ''} onChange={e => handleSelectTemplate(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium">
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={startNewInvoice} className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold flex items-center gap-2"><FilePlus2 className="w-4 h-4" /> New</button>
          <button onClick={handleSaveLocally} className="h-10 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="h-10 px-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2 text-sm"><MoreVertical className="w-4 h-4" /> Actions <ChevronDown className="w-3.5 h-3.5" /></button>
            {menuOpen && <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 shadow-xl rounded-xl p-1 z-30">
              <button onClick={handleDownloadPdf} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg flex items-center gap-2"><Download className="w-4 h-4" /> Download PDF</button>
              <button onClick={handlePrint} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
              <button onClick={handleSyncToDrive} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg flex items-center gap-2"><CloudUpload className="w-4 h-4" /> Save to Google Drive</button>
            </div>}
          </div>
        </div>
      </div>

      {/* RESPONSIVE PREVIEW SWITCH */}
      <div className="lg:hidden flex p-1 bg-slate-100 rounded-xl mb-4">
        <button onClick={() => setPreviewTab('editor')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${previewTab === 'editor' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600'}`}>Edit</button>
        <button onClick={() => setPreviewTab('preview')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${previewTab === 'preview' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600'}`}>Invoice Preview</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(470px,0.86fr)] gap-5 items-start">
        {/* FORM */}
        <div className={`${previewTab === 'preview' ? 'hidden lg:block' : ''} space-y-4`}>
          {/* BUSINESS PROFILE */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setBusinessOpen(v => !v)} className="w-full p-5 flex items-center justify-between text-left">
              <div><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-600" /> Business Profile</h2><p className="text-xs text-slate-500 mt-1">Save this once — it will appear automatically on new invoices.</p></div>
              <ChevronDown className={`w-5 h-5 transition-transform ${businessOpen ? 'rotate-180' : ''}`} />
            </button>
            {businessOpen && <div className="px-5 pb-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {business.logoUrl ? <img src={business.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" /> : <ImagePlus className="w-7 h-7 text-slate-400" />}
                </div>
                <div><button disabled={logoBusy} onClick={() => logoInputRef.current?.click()} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold">{logoBusy ? 'Uploading…' : 'Upload Logo'}</button><input ref={logoInputRef} type="file" accept="image/*" hidden onChange={e => handleLogo(e.target.files?.[0])} /><p className="text-xs text-slate-500 mt-1">Logo is resized and saved for future invoices.</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['companyName','Company name'],['contactPerson','Contact person'],['email','Email'],['phone','Phone'],['address','Address'],['cityStateZip','City / State / ZIP'],['taxNumber','GST / VAT / NTN'],['website','Website']
                ] as const).map(([key, label]) => <label key={key} className="block"><span className="text-xs font-semibold text-slate-600">{label}</span><input value={business[key] || ''} onChange={e => setBusiness(prev => ({ ...prev, [key]: e.target.value }))} onBlur={() => saveBusinessProfile({ ...business, [key]: business[key] || '' })} className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label>)}
              </div>
              <div className="flex items-center justify-end gap-2"><button onClick={() => setBusiness(blankBusiness())} className="px-3 py-2 text-sm text-slate-600">Clear</button><button onClick={() => saveBusinessProfile()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold"><Check className="inline w-4 h-4 mr-1" /> Save business profile</button></div>
            </div>}
          </section>

          {/* CUSTOMER */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="text-lg font-bold text-slate-900">Customer</h2><p className="text-xs text-slate-500 mt-1">Search a saved customer or add a new one.</p></div><button onClick={() => setShowAddCustomer(true)} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add customer</button></div>
            <div className="relative">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={customerSearch || currentInvoice.recipient.name || ''} onFocus={() => setCustomerOpen(true)} onChange={e => { setCustomerSearch(e.target.value); setCustomerOpen(true); }} placeholder="Select or search customer…" className="w-full h-11 pl-9 pr-9 rounded-lg border border-slate-200 text-sm"/><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /></div>
              {customerOpen && <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {filteredCustomers.length > 0 ? filteredCustomers.map((c, i) => <button key={`${c.email}-${i}`} onClick={() => applyCustomer(c)} className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b last:border-0"><span><span className="block text-sm font-semibold text-slate-900">{c.name}</span><span className="block text-xs text-slate-500">{c.email || c.phone || c.address}</span></span><User className="w-4 h-4 text-slate-400" /></button>) : <div className="px-4 py-4 text-sm text-slate-500">No saved customers found.</div>}
                <button onClick={() => { setShowAddCustomer(true); setCustomerOpen(false); }} className="w-full px-4 py-3 text-left text-sm font-semibold text-indigo-700 bg-indigo-50/60 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add “{customerSearch || 'new customer'}”</button>
              </div>}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><span className="text-xs text-slate-500">Selected customer</span><div className="font-semibold">{currentInvoice.recipient.name || 'None'}</div></div><div><span className="text-xs text-slate-500">Contact</span><div className="font-semibold">{currentInvoice.recipient.email || currentInvoice.recipient.phone || '—'}</div></div></div>
          </section>

          {/* INVOICE DETAILS */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label><span className="field-label">Invoice number</span><input className="field-input" value={currentInvoice.invoiceNumber} onChange={e => updateInvoiceState(p => ({ ...p, invoiceNumber: e.target.value }))} /></label>
              <label><span className="field-label">Issue date</span><input type="date" className="field-input" value={currentInvoice.date} onChange={e => updateInvoiceState(p => ({ ...p, date: e.target.value }))} /></label>
              <label><span className="field-label">Due date</span><input type="date" className="field-input" value={currentInvoice.dueDate} onChange={e => updateInvoiceState(p => ({ ...p, dueDate: e.target.value }))} /></label>
              <label><span className="field-label">Currency</span><select className="field-input" value={currentInvoice.currency.code} onChange={e => { const t = e.target.value === 'USD' ? { symbol: '$', code: 'USD', position: 'prefix' as const } : e.target.value === 'EUR' ? { symbol: '€', code: 'EUR', position: 'prefix' as const } : { symbol: 'Rs.', code: 'PKR', position: 'prefix' as const }; updateInvoiceState(p => ({ ...p, currency: t })); }}><option value="PKR">PKR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label>
            </div>
          </section>

          {/* LINE ITEMS */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Line Items</h2><button onClick={handleAddItem} className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add item</button></div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Item</th><th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Description</th><th className="px-3 py-2 text-right text-xs font-bold text-slate-500">Qty</th><th className="px-3 py-2 text-right text-xs font-bold text-slate-500">Rate</th><th className="px-3 py-2 text-right text-xs font-bold text-slate-500">Amount</th><th className="w-10"></th></tr></thead>
                <tbody>{currentInvoice.items.map((it, idx) => <tr key={it.id} className="border-t border-slate-200"><td className="px-3 py-2 w-[25%]"><input className="field-input" value={it.description} placeholder="Item" onChange={e => handleUpdateItem(it.id, 'description', e.target.value)} /></td><td className="px-3 py-2 w-[35%]"><input className="field-input" value={it.category || ''} placeholder="Description" onChange={e => handleUpdateItem(it.id, 'category', e.target.value)} /></td><td className="px-3 py-2 w-20"><input type="number" min="0" className="field-input text-right" value={it.quantity} onChange={e => handleUpdateItem(it.id, 'quantity', Number(e.target.value))} /></td><td className="px-3 py-2 w-28"><input type="number" min="0" step="0.01" className="field-input text-right" value={it.unitPrice} onChange={e => handleUpdateItem(it.id, 'unitPrice', Number(e.target.value))} /></td><td className="px-3 py-2 text-right font-semibold">{currentInvoice.currency.symbol}{it.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td className="px-3"><button onClick={() => handleRemoveItem(it.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody></table>
            </div>
            <div className="flex justify-end mt-4"><div className="w-full sm:w-72 rounded-lg border border-slate-200 overflow-hidden"><div className="tot-row"><span>Subtotal</span><b>{currentInvoice.currency.symbol}{currentInvoice.subtotal.toFixed(2)}</b></div><div className="tot-row"><span>Tax</span><b>{currentInvoice.currency.symbol}{currentInvoice.taxTotal.toFixed(2)}</b></div><div className="tot-row"><span>Discount</span><b>{currentInvoice.currency.symbol}{currentInvoice.discountTotal.toFixed(2)}</b></div><div className="tot-row total"><span>Total</span><b>{currentInvoice.currency.symbol}{currentInvoice.grandTotal.toFixed(2)}</b></div></div></div>
          </section>

          {/* NOTES */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><h2 className="text-lg font-bold text-slate-900 mb-3">Notes</h2><textarea value={currentInvoice.notes} onChange={e => updateInvoiceState(p => ({ ...p, notes: e.target.value }))} placeholder="Add a note or payment instructions…" className="w-full min-h-28 rounded-lg border border-slate-200 p-3 text-sm resize-y" /></section>

          {/* EXTRA FIELDS */}
          {enabledCustomFields.length > 0 && <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><h2 className="text-lg font-bold text-slate-900 mb-3">Additional Information</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{enabledCustomFields.map(f => <label key={f.id}><span className="field-label">{f.label}</span><input className="field-input" value={currentInvoice.customFieldValues[f.id] || ''} onChange={e => updateInvoiceState(p => ({ ...p, customFieldValues: { ...p.customFieldValues, [f.id]: e.target.value } }))} placeholder={f.placeholder} /></label>)}</div></section>}
        </div>

        {/* PREVIEW */}
        <div className={`${previewTab === 'editor' ? 'hidden lg:block' : ''} lg:sticky lg:top-24`}>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
            <div className="px-2 py-2 flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">Invoice Preview</h2><p className="text-xs text-slate-500">Live preview of the invoice you can print, download or send to Drive.</p></div><button onClick={handlePrint} className="p-2 rounded-lg hover:bg-slate-100" title="Print"><Printer className="w-4 h-4" /></button></div>
            <div className="border border-slate-200 rounded-lg bg-slate-50 p-3 max-h-[calc(100vh-185px)] overflow-auto"><InvoicePreview ref={previewRef} invoice={currentInvoice} template={activeTemplate} /></div>
            <div className="grid grid-cols-3 gap-2 p-2 pt-3"><button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="h-10 rounded-lg bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" /> {isGeneratingPdf ? 'Preparing…' : 'PDF'}</button><button onClick={handlePrint} className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print</button><button onClick={handleSyncToDrive} disabled={isSyncingToDrive || isGeneratingPdf} className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><CloudUpload className="w-4 h-4" /> Drive</button></div>
            {selectedDriveFolder && <div className="mx-2 mb-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs">Drive folder: <b>{selectedDriveFolder.name}</b></div>}
          </div>
        </div>
      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomer && <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4" onClick={() => setShowAddCustomer(false)}><div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}><div className="p-5 border-b flex items-center justify-between"><div><h3 className="text-lg font-bold">Add New Customer</h3><p className="text-xs text-slate-500 mt-1">This customer will be saved for future invoices.</p></div><button onClick={() => setShowAddCustomer(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">{([
        ['name','Customer name'],['contactPerson','Contact person'],['email','Email'],['phone','Phone'],['address','Address'],['cityStateZip','City / State / ZIP'],['taxNumber','GST / VAT / NTN']
      ] as const).map(([key,label]) => <label key={key}><span className="field-label">{label}</span><input className="field-input" value={newCustomer[key] || ''} onChange={e => setNewCustomer(p => ({ ...p, [key]: e.target.value }))} /></label>)}<label className="sm:col-span-2"><span className="field-label">Notes</span><textarea className="field-input min-h-20" value={newCustomer.notes || ''} onChange={e => setNewCustomer(p => ({ ...p, notes: e.target.value }))} /></label></div><div className="p-5 border-t flex justify-end gap-2"><button onClick={() => setShowAddCustomer(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button><button onClick={addCustomer} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2"><Check className="w-4 h-4" /> Save customer</button></div></div></div>}

      <style>{`
        .field-label{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px}
        .field-input{width:100%;height:38px;padding:0 10px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:13px;outline:none}
        .field-input:focus{border-color:#a5b4fc;box-shadow:0 0 0 3px rgba(99,102,241,.08)}
        .tot-row{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}
        .tot-row.total{background:#eff6ff;color:#1d4ed8;font-size:15px;border-bottom:0}
        @media print{body{background:#fff}.no-print{display:none!important}}
      `}</style>
    </div>
  );
};
