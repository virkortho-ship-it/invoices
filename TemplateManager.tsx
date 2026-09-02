import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceTemplate, CustomFieldConfig } from '../types';
import { InvoicePreview } from './InvoicePreview';
import { createBlankInvoice } from '../context/AppContext';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Palette, 
  Building2, 
  Sliders, 
  Coins, 
  Check, 
  Layers, 
  Sparkles,
  ArrowRight,
  Eye,
  FileText,
  FilePlus,
  CreditCard,
  Code2,
  Upload,
  X
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Medical Sky', hex: '#0284c7' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Indigo Brand', hex: '#4f46e5' },
  { name: 'Dark Slate', hex: '#334155' },
  { name: 'Purple Luxe', hex: '#7c3aed' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Amber Gold', hex: '#d97706' },
];

const QUICK_FIELD_PRESETS = [
  { label: 'Patient MR #', section: 'client', placeholder: 'MR-98421' },
  { label: 'Attending Doctor', section: 'header', placeholder: 'Dr. M. Virk' },
  { label: 'Purchase Order (PO #)', section: 'header', placeholder: 'PO-2026-89' },
  { label: 'Vehicle / Model', section: 'client', placeholder: 'Toyota Corolla' },
  { label: 'Payment Method', section: 'footer', placeholder: 'Bank Transfer / Cash' },
];

export const TemplateManager: React.FC = () => {
  const { 
    templates, 
    activeTemplate, 
    setActiveTemplate, 
    saveTemplate, 
    deleteTemplate, 
    duplicateTemplate,
    createNewInvoiceFromTemplate,
    showToast
  } = useApp();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(activeTemplate?.id || templates[0]?.id);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate>(() => {
    return activeTemplate || templates[0];
  });

  const [activeTab, setActiveTab] = useState<'business' | 'fields' | 'styling' | 'defaults' | 'code'>('business');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'edit' | 'view'>('edit');

  // Switch template
  const handleSelectTemplate = (tpl: InvoiceTemplate, mode: 'edit' | 'view' = 'edit') => {
    setSelectedTemplateId(tpl.id);
    setEditingTemplate(tpl);
    setEditorMode(mode);
    setIsEditorOpen(true);
  };

  // Add new field
  const handleAddCustomField = (customLabel?: string, customSection: 'header' | 'client' | 'footer' = 'header', customPlaceholder?: string) => {
    const newField: CustomFieldConfig = {
      id: `cf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: customLabel || 'New Custom Field',
      type: 'text',
      placeholder: customPlaceholder || 'e.g. Value / Reference',
      defaultValue: '',
      enabled: true,
      section: customSection,
    };

    setEditingTemplate(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField],
    }));
  };

  // Update field
  const handleUpdateCustomField = (id: string, updates: Partial<CustomFieldConfig>) => {
    setEditingTemplate(prev => ({
      ...prev,
      customFields: prev.customFields.map(cf => (cf.id === id ? { ...cf, ...updates } : cf)),
    }));
  };

  // Remove field
  const handleRemoveCustomField = (id: string) => {
    setEditingTemplate(prev => ({
      ...prev,
      customFields: prev.customFields.filter(cf => cf.id !== id),
    }));
  };

  // Upload a custom HTML/CSS template file. The code remains editable in the editor below.
  const handleTemplateCodeUpload = async (file?: File) => {
    if (!file) return;
    if (!/\.(html?|txt)$/i.test(file.name)) {
      showToast('error', 'Unsupported file', 'Please upload an HTML, HTM, or TXT template file.');
      return;
    }
    try {
      const code = await file.text();
      setEditingTemplate(prev => ({ ...prev, customTemplateCode: code }));
      showToast('success', 'Template Code Loaded', `${file.name} is ready to edit. Click Save to keep it.`);
    } catch (error) {
      console.error(error);
      showToast('error', 'Upload Failed', 'Could not read the template file.');
    }
  };

  const handleClearTemplateCode = () => {
    setEditingTemplate(prev => ({ ...prev, customTemplateCode: '' }));
    showToast('info', 'Custom Code Removed', 'The built-in invoice layout will be used after you save.');
  };

  const handleDeleteCurrentTemplate = () => {
    if (templates.length <= 1) {
      deleteTemplate(editingTemplate.id);
      return;
    }
    const nextTemplate = templates.find(t => t.id !== editingTemplate.id) || templates[0];
    deleteTemplate(editingTemplate.id);
    setSelectedTemplateId(nextTemplate.id);
    setEditingTemplate(nextTemplate);
  };

  // Save template changes
  const handleSave = () => {
    saveTemplate(editingTemplate);
    showToast('success', 'Template Saved', `"${editingTemplate.name}" is updated and ready to use.`);
  };

  // Create brand new template
  const handleCreateNewTemplate = () => {
    const newTpl: InvoiceTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: 'My New Custom Template',
      description: 'Custom tailored invoice layout with my business info & style.',
      category: 'custom',
      businessDetails: {
        companyName: 'My Clinic / Business Name',
        contactPerson: 'Manager / Doctor',
        email: 'info@mybusiness.com',
        phone: '+92 300 1234567',
        address: 'Main Commercial Plaza, Office #4',
        cityStateZip: 'Lahore, Pakistan',
        taxNumber: 'NTN: 1234567-8',
        website: '',
      },
      currency: {
        symbol: 'Rs.',
        code: 'PKR',
        position: 'prefix',
      },
      customFields: [
        {
          id: `cf-ref-${Date.now()}`,
          label: 'Reference #',
          type: 'text',
          placeholder: 'REF-001',
          defaultValue: '',
          enabled: true,
          section: 'header',
        },
      ],
      styling: {
        themeColor: '#2563eb',
        fontFamily: 'sans',
        headerLayout: 'modern',
        showBorders: true,
        showWatermark: false,
        accentBackground: true,
      },
      defaultTaxRate: 0,
      defaultPaymentTerms: 'Payment due on receipt.',
      defaultNotes: 'Thank you for your business!',
      paymentDetails: 'Bank Account: Habib Bank Limited | Title: My Business | Account/IBAN: PK...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveTemplate(newTpl);
    setSelectedTemplateId(newTpl.id);
    setEditingTemplate(newTpl);
    setEditorMode('edit');
    setIsEditorOpen(true);
    showToast('success', 'Template Created', 'Start filling in your business details and styling.');
  };

  const handleCreateCustomTemplate = () => {
    const now = new Date().toISOString();
    const newTpl: InvoiceTemplate = {
      id: `tpl-custom-code-${Date.now()}`,
      name: 'My Custom Template',
      description: 'User-created HTML/CSS invoice template.',
      category: 'custom',
      businessDetails: { companyName: 'My Business', contactPerson: '', email: '', phone: '', address: '', cityStateZip: '', taxNumber: '', website: '' },
      currency: { symbol: 'Rs.', code: 'PKR', position: 'prefix' },
      customFields: [],
      styling: { themeColor: '#2563eb', fontFamily: 'sans', headerLayout: 'modern', showBorders: true, showWatermark: false, accentBackground: true },
      defaultTaxRate: 0,
      defaultPaymentTerms: 'Payment due on receipt.',
      defaultNotes: 'Thank you for your business!',
      paymentDetails: '',
      createdAt: now, updatedAt: now,
      customTemplateCode: '<div style=\"padding:40px;font-family:Arial;background:#fff\"><h1 style=\"color:{{themeColor}}\">INVOICE</h1><h2>{{companyName}}</h2><p>Invoice # {{invoiceNumber}} | {{date}}</p><p>Bill To: {{clientName}}</p>{{itemsTable}}<h2 style=\"text-align:right\">{{grandTotal}}</h2></div>'
    };
    saveTemplate(newTpl);
    setSelectedTemplateId(newTpl.id);
    setEditingTemplate(newTpl);
    setEditorMode('edit');
    setIsEditorOpen(true);
  };

  // Sample preview invoice based on current editing template
  const previewInvoiceData = createBlankInvoice(editingTemplate);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Invoice Template Builder</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Build and customize your own invoice templates with your business details, colors, currency, and custom fields.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button id="btn-create-new-template" onClick={handleCreateNewTemplate} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Create New Template
          </button>
          <button id="btn-create-custom-template" onClick={handleCreateCustomTemplate} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all active:scale-95">
            <Code2 className="w-4 h-4" /> Custom Template
          </button>
        </div>
      </div>

      {/* TEMPLATE PICKER CARDS */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Your Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {templates.map(tpl => {
            const isSelected = tpl.id === editingTemplate.id;
            return (
              <div
                key={tpl.id}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white relative ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: tpl.styling.themeColor || '#2563eb' }}
                    />
                    <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                      {tpl.businessDetails.companyName || 'Custom'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {tpl.currency.symbol}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 truncate">{tpl.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 mb-2.5">{tpl.description}</p>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <span className="text-[10px] text-slate-500">{tpl.customFields.length} fields</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleSelectTemplate(tpl, 'view')} className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"><Eye className="w-3 h-3 inline mr-1"/>View</button>
                    <button onClick={() => handleSelectTemplate(tpl, 'edit')} className="px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold"><FileText className="w-3 h-3 inline mr-1"/>Edit</button>
                    {!tpl.isDefault && <button onClick={() => { if (confirm(`Delete \"${tpl.name}\"?`)) deleteTemplate(tpl.id); }} className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULL-SCREEN TEMPLATE EDITOR MODAL */}
      {isEditorOpen && (
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-2 sm:p-5 overflow-y-auto">
        <div className="max-w-[1500px] mx-auto min-h-full bg-slate-100 rounded-2xl shadow-2xl">
          <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between rounded-t-2xl">
            <div><h2 className="font-bold text-slate-900">{editorMode === 'view' ? 'View Template' : 'Edit Template'}</h2><p className="text-xs text-slate-500">{editingTemplate.name}</p></div>
            <button onClick={() => setIsEditorOpen(false)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"><X className="w-5 h-5"/></button>
          </div>
          <div className={editorMode === 'view' ? 'pointer-events-none opacity-95' : ''}>
      {/* MAIN EDITOR & LIVE PREVIEW WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start p-4 sm:p-6">
        
        {/* LEFT COLUMN: TEMPLATE CONFIGURATION TABS (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            
            {/* Top Template Title Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 mb-5">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Template Name</span>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full block text-base font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-hidden mt-0.5 py-0.5"
                  placeholder="Template Name"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => duplicateTemplate(editingTemplate.id)}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Duplicate Template"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {templates.length > 1 && (
                  <button
                    onClick={handleDeleteCurrentTemplate}
                    className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="btn-save-template"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('business')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'business' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 Business Info
              </button>
              <button
                onClick={() => setActiveTab('fields')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'fields' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Custom Fields ({editingTemplate.customFields.length})
              </button>
              <button
                onClick={() => setActiveTab('styling')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'styling' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎨 Color & Currency
              </button>
              <button
                onClick={() => setActiveTab('defaults')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'defaults' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📝 Notes & Terms
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'code' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 inline mr-1" /> Code Template
              </button>
            </div>

            {/* TAB 1: Business Details */}
            {activeTab === 'business' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Clinic / Business Name *</label>
                    <input
                      type="text"
                      value={editingTemplate.businessDetails.companyName}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, companyName: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      placeholder="e.g. Virk Orthopedic & Medical Center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor / Manager Name</label>
                    <input
                      type="text"
                      value={editingTemplate.businessDetails.contactPerson || ''}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, contactPerson: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      placeholder="e.g. Dr. M. Virk"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editingTemplate.businessDetails.phone}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, phone: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      placeholder="+92 300 1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingTemplate.businessDetails.email}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, email: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      placeholder="info@clinic.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tax ID / NTN / VAT Number</label>
                    <input
                      type="text"
                      value={editingTemplate.businessDetails.taxNumber || ''}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, taxNumber: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      placeholder="NTN: 8492019-4"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Street</label>
                    <input
                      type="text"
                      value={editingTemplate.businessDetails.address}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, address: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      placeholder="Commercial Complex, Main Blvd"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City, State / Country</label>
                    <input
                      type="text"
                      value={editingTemplate.businessDetails.cityStateZip || ''}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, cityStateZip: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      placeholder="Lahore, Pakistan"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Custom Fields */}
            {activeTab === 'fields' && (
              <div className="space-y-4">
                
                {/* Quick Add Presets */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 mb-2">Quick Add Common Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_FIELD_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleAddCustomField(preset.label, preset.section as any, preset.placeholder)}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all shadow-2xs"
                      >
                        + {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddCustomField()}
                      className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                    >
                      + Custom Field
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {editingTemplate.customFields.map((cf, idx) => (
                    <div
                      key={cf.id}
                      className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cf.enabled}
                            onChange={e => handleUpdateCustomField(cf.id, { enabled: e.target.checked })}
                            className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800">Field #{idx + 1}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={cf.section}
                            onChange={e => handleUpdateCustomField(cf.id, { section: e.target.value as any })}
                            className="bg-white border border-slate-300 text-[11px] font-medium text-slate-700 rounded-md px-2 py-1"
                          >
                            <option value="header">Header Section</option>
                            <option value="client">Client / Patient Section</option>
                            <option value="footer">Footer Section</option>
                          </select>

                          <button
                            onClick={() => handleRemoveCustomField(cf.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Field Name / Label</label>
                          <input
                            type="text"
                            value={cf.label}
                            onChange={e => handleUpdateCustomField(cf.id, { label: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-hidden"
                            placeholder="e.g. Patient MR# / Doctor Name"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Default Value (Optional)</label>
                          <input
                            type="text"
                            value={cf.defaultValue || ''}
                            onChange={e => handleUpdateCustomField(cf.id, { defaultValue: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-hidden"
                            placeholder="Default value or placeholder"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {editingTemplate.customFields.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      No custom fields added yet. Use the buttons above to add fields like Patient MR# or Doctor Name.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Styling & Colors */}
            {activeTab === 'styling' && (
              <div className="space-y-5">
                {/* Accent Colors */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">Theme Accent Color</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {COLOR_PRESETS.map(c => {
                      const isColorSelected = editingTemplate.styling.themeColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setEditingTemplate(prev => ({
                            ...prev,
                            styling: { ...prev.styling, themeColor: c.hex }
                          }))}
                          className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                            isColorSelected ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105 shadow-xs' : 'hover:scale-105 opacity-90 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {isColorSelected && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Currency Symbol & Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">Currency Settings</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Currency Symbol</label>
                      <input
                        type="text"
                        value={editingTemplate.currency.symbol}
                        onChange={e => setEditingTemplate(prev => ({
                          ...prev,
                          currency: { ...prev.currency, symbol: e.target.value }
                        }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                        placeholder="Rs. / $ / € / £ / AED"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Currency Code</label>
                      <input
                        type="text"
                        value={editingTemplate.currency.code}
                        onChange={e => setEditingTemplate(prev => ({
                          ...prev,
                          currency: { ...prev.currency, code: e.target.value }
                        }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                        placeholder="PKR / USD / GBP"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Symbol Position</label>
                      <select
                        value={editingTemplate.currency.position}
                        onChange={e => setEditingTemplate(prev => ({
                          ...prev,
                          currency: { ...prev.currency, position: e.target.value as any }
                        }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                      >
                        <option value="prefix">Prefix (Rs. 5,000)</option>
                        <option value="suffix">Suffix (5,000 AED)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Typography & Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Font Typography</label>
                    <select
                      value={editingTemplate.styling.fontFamily}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        styling: { ...prev.styling, fontFamily: e.target.value as any }
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                    >
                      <option value="sans">Modern Clean (Sans-Serif)</option>
                      <option value="serif">Classic Formal (Serif)</option>
                      <option value="mono">Technical / Monospace</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Category</label>
                    <select
                      value={editingTemplate.category}
                      onChange={e => setEditingTemplate(prev => ({
                        ...prev,
                        category: e.target.value as any
                      }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 capitalize focus:bg-white focus:border-indigo-600 outline-hidden"
                    >
                      <option value="medical">Medical / Clinic</option>
                      <option value="general">Commercial / Corporate</option>
                      <option value="freelance">Freelance / Consulting</option>
                      <option value="retail">Retail / Wholesale</option>
                      <option value="custom">Custom Business</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Default Terms & Notes */}
            {activeTab === 'defaults' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingTemplate.defaultTaxRate}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, defaultTaxRate: Number(e.target.value) }))}
                    className="w-32 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Payment Terms</label>
                  <input
                    type="text"
                    value={editingTemplate.defaultPaymentTerms}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, defaultPaymentTerms: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                    placeholder="e.g. Payment due upon receipt"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank / JazzCash / EasyPaisa / IBAN Details</label>
                  <textarea
                    rows={2}
                    value={editingTemplate.paymentDetails}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, paymentDetails: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                    placeholder="Bank Name, Account Title, Account Number / IBAN, EasyPaisa..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Notes & Instructions</label>
                  <textarea
                    rows={2}
                    value={editingTemplate.defaultNotes}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, defaultNotes: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 outline-hidden"
                    placeholder="Thank you for choosing us, warranty note, doctor advice..."
                  />
                </div>
              </div>
            )}

            {/* TAB 5: Custom HTML/CSS Code Template */}
            {activeTab === 'code' && (
              <div className="space-y-5">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <Code2 className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Custom Template Code</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">Paste HTML/CSS or upload a template file. Your code can use invoice placeholders so data fills automatically.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                    <Upload className="w-4 h-4" /> Upload HTML / TXT
                    <input type="file" accept=".html,.htm,.txt,text/html,text/plain" className="hidden" onChange={e => { handleTemplateCodeUpload(e.target.files?.[0]); e.currentTarget.value = ''; }} />
                  </label>
                  <button type="button" onClick={handleClearTemplateCode} disabled={!editingTemplate.customTemplateCode} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                    <X className="w-4 h-4" /> Remove Custom Code
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">HTML / CSS Code</label>
                    <span className="text-[10px] text-slate-500">{(editingTemplate.customTemplateCode || '').length.toLocaleString()} characters</span>
                  </div>
                  <textarea value={editingTemplate.customTemplateCode || ''} onChange={e => setEditingTemplate(prev => ({ ...prev, customTemplateCode: e.target.value }))} spellCheck={false} className="w-full min-h-[420px] bg-slate-950 text-slate-100 border border-slate-700 rounded-xl p-4 font-mono text-[11px] leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 resize-y" placeholder={`<div class="invoice">
  <h1>INVOICE</h1>
  <p>{{companyName}}</p>
  <p>{{invoiceNumber}} · {{date}}</p>
  {{itemsTable}}
  <strong>{{grandTotal}}</strong>
</div>
<style>/* your CSS */</style>`} />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Available placeholders</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-600">
                    {['{{companyName}}','{{contactPerson}}','{{email}}','{{phone}}','{{address}}','{{invoiceNumber}}','{{date}}','{{dueDate}}','{{status}}','{{clientName}}','{{clientPhone}}','{{clientEmail}}','{{clientAddress}}','{{itemsTable}}','{{subtotal}}','{{discountTotal}}','{{taxTotal}}','{{shippingFee}}','{{grandTotal}}','{{amountPaid}}','{{balanceDue}}','{{paymentTerms}}','{{paymentDetails}}','{{notes}}','{{customFields}}'].map(token => <code key={token} className="px-2 py-1 rounded bg-white border border-slate-200 truncate">{token}</code>)}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500"><strong>How it works:</strong> upload/paste code → edit it here → click <b>Save</b>. The custom design becomes the invoice preview and is included in PDF generation.</div>
              </div>
            )}

            {/* Bottom Quick Action: Use this template */}
            <div className="pt-4 mt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">Ready to issue an invoice?</span>
              <button
                id="btn-use-template-for-invoice"
                onClick={() => createNewInvoiceFromTemplate(editingTemplate)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                <span>Use This Template for New Invoice</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: LIVE SAMPLE PREVIEW (6 cols) */}
        <div className="lg:col-span-6 sticky top-20">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Live Template Preview</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200">
                {editingTemplate.name}
              </span>
            </div>

            <div className="max-h-[75vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-2 sm:p-3">
              <InvoicePreview
                invoice={previewInvoiceData}
                template={editingTemplate}
              />
            </div>
          </div>
        </div>

      </div>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};
