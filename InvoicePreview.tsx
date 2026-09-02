import React, { forwardRef } from 'react';
import { InvoiceData, InvoiceTemplate } from '../types';
import { Building2, Phone, Mail, MapPin, Globe, CheckCircle2 } from 'lucide-react';

interface InvoicePreviewProps {
  invoice: InvoiceData;
  template?: InvoiceTemplate;
  isPrintMode?: boolean;
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sanitizeCustomTemplate = (code: string) => code
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
  .replace(/<object[\s\S]*?<\/object>/gi, '')
  .replace(/<embed[^>]*>/gi, '')
  .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
  .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
  .replace(/javascript\s*:/gi, '');

const renderCustomTemplate = (code: string, invoice: InvoiceData, template?: InvoiceTemplate) => {
  const currency = invoice.currency || { symbol: 'Rs.', code: 'PKR', position: 'prefix' };
  const money = (amount: number) => {
    const n = (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency.position === 'prefix' ? `${currency.symbol} ${n}` : `${n} ${currency.symbol}`;
  };

  const enabledFields = (template?.customFields || []).filter(field => field.enabled);
  const customFields = enabledFields.map(field => {
    const value = invoice.customFieldValues?.[field.id] || field.defaultValue || '';
    return `<div class="custom-field"><span>${escapeHtml(field.label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }).join('');

  const itemsTable = `
    <table class="invoice-items-table" style="width:100%;border-collapse:collapse">
      <thead><tr><th>#</th><th>Item &amp; Description</th><th>Qty</th><th>Rate</th><th>Disc %</th><th>Amount</th></tr></thead>
      <tbody>
        ${invoice.items.map((item, index) => {
          const base = item.quantity * item.unitPrice;
          const discount = base * (item.discountPercent || 0) / 100;
          const amount = base - discount;
          return `<tr><td>${index + 1}</td><td>${escapeHtml(item.description || 'Item / Service')}</td><td>${item.quantity}</td><td>${escapeHtml(money(item.unitPrice))}</td><td>${item.discountPercent ? `${item.discountPercent}%` : '—'}</td><td>${escapeHtml(money(amount))}</td></tr>`;
        }).join('')}
      </tbody>
    </table>`;

  const values: Record<string, string> = {
    companyName: escapeHtml(invoice.sender.companyName || 'Business Name'),
    contactPerson: escapeHtml(invoice.sender.contactPerson || ''),
    email: escapeHtml(invoice.sender.email || ''),
    phone: escapeHtml(invoice.sender.phone || ''),
    address: escapeHtml([invoice.sender.address, invoice.sender.cityStateZip].filter(Boolean).join(', ')),
    taxNumber: escapeHtml(invoice.sender.taxNumber || ''),
    website: escapeHtml(invoice.sender.website || ''),
    logoUrl: escapeHtml(invoice.sender.logoUrl || ''),
    logo: invoice.sender.logoUrl ? `<img src="${escapeHtml(invoice.sender.logoUrl)}" alt="${escapeHtml(invoice.sender.companyName || 'Logo')}" style="max-width:180px;max-height:90px;object-fit:contain" />` : '',
    invoiceNumber: escapeHtml(invoice.invoiceNumber),
    date: escapeHtml(invoice.date),
    dueDate: escapeHtml(invoice.dueDate),
    status: escapeHtml(invoice.status),
    clientName: escapeHtml(invoice.recipient.name || ''),
    clientPhone: escapeHtml(invoice.recipient.phone || ''),
    clientEmail: escapeHtml(invoice.recipient.email || ''),
    clientAddress: escapeHtml([invoice.recipient.address, invoice.recipient.cityStateZip].filter(Boolean).join(', ')),
    clientTaxNumber: escapeHtml(invoice.recipient.taxNumber || ''),
    itemsTable,
    subtotal: escapeHtml(money(invoice.subtotal)),
    discountTotal: escapeHtml(money(invoice.discountTotal)),
    taxTotal: escapeHtml(money(invoice.taxTotal)),
    shippingFee: escapeHtml(money(invoice.shippingFee)),
    grandTotal: escapeHtml(money(invoice.grandTotal)),
    amountPaid: escapeHtml(money(invoice.amountPaid)),
    balanceDue: escapeHtml(money(invoice.balanceDue)),
    paymentTerms: escapeHtml(invoice.paymentTerms || ''),
    paymentDetails: escapeHtml(invoice.paymentDetails || ''),
    notes: escapeHtml(invoice.notes || ''),
    customFields,
    currency: escapeHtml(currency.code),
    currencySymbol: escapeHtml(currency.symbol),
    themeColor: escapeHtml(template?.styling.themeColor || '#2563eb'),
  };

  const processed = sanitizeCustomTemplate(code).replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => values[key] ?? '');
  return processed;
};

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ invoice, template, isPrintMode = false }, ref) => {
    const styling = template?.styling || {
      themeColor: '#2563eb',
      fontFamily: 'sans',
      headerLayout: 'modern',
      showBorders: true,
      showWatermark: false,
      accentBackground: true,
    };

    const themeColor = styling.themeColor || '#2563eb';
    const currency = invoice.currency || { symbol: 'Rs.', code: 'PKR', position: 'prefix' };

    // If the user supplied HTML/CSS, render that design instead of the built-in layout.
    if (template?.customTemplateCode?.trim()) {
      return (
        <div
          ref={ref}
          id="invoice-document-render"
          data-invoice-preview="true"
          className="bg-white text-slate-800 rounded-xl shadow-md print:shadow-none print:m-0 print:p-0 print:border-none max-w-3xl mx-auto border border-slate-200 relative overflow-hidden"
          style={{ fontFamily: styling.fontFamily === 'serif' ? 'Georgia, serif' : styling.fontFamily === 'mono' ? 'monospace' : 'system-ui, sans-serif' }}
        >
          <div className="invoice-custom-template" dangerouslySetInnerHTML={{ __html: renderCustomTemplate(template.customTemplateCode, invoice, template) }} />
        </div>
      );
    }

    const formatMoney = (amount: number) => {
      const numStr = (amount || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return currency.position === 'prefix' ? `${currency.symbol} ${numStr}` : `${numStr} ${currency.symbol}`;
    };

    // Filter enabled custom fields
    const enabledCustomFields = (template?.customFields || []).filter(cf => cf.enabled);
    const headerFields = enabledCustomFields.filter(cf => cf.section === 'header');
    const clientFields = enabledCustomFields.filter(cf => cf.section === 'client');
    const footerFields = enabledCustomFields.filter(cf => cf.section === 'footer');

    return (
      <div
        ref={ref}
        id="invoice-document-render"
        data-invoice-preview="true"
        className={`bg-white text-slate-800 rounded-xl transition-all shadow-md print:shadow-none print:m-0 print:p-0 print:border-none print:w-full ${
          isPrintMode ? 'p-10' : 'p-6 sm:p-8 md:p-10'
        } max-w-3xl mx-auto border border-slate-200 relative overflow-hidden`}
        style={{
          fontFamily: styling.fontFamily === 'serif' ? 'Georgia, serif' : styling.fontFamily === 'mono' ? 'monospace' : 'system-ui, sans-serif'
        }}
      >
        {/* Top Accent Color Bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-2.5" 
          style={{ backgroundColor: themeColor }}
        />

        {/* Status Watermark */}
        {invoice.status === 'paid' && (
          <div className="absolute right-12 top-28 pointer-events-none opacity-15 rotate-[-25deg] select-none">
            <div className="border-4 border-emerald-600 text-emerald-600 font-extrabold text-5xl px-6 py-2 rounded-xl tracking-widest uppercase">
              PAID
            </div>
          </div>
        )}
        {invoice.status === 'overdue' && (
          <div className="absolute right-12 top-28 pointer-events-none opacity-15 rotate-[-25deg] select-none">
            <div className="border-4 border-rose-600 text-rose-600 font-extrabold text-5xl px-6 py-2 rounded-xl tracking-widest uppercase">
              OVERDUE
            </div>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200">
          
          {/* Sender / Business Profile */}
          <div className="flex items-start gap-4">
            {invoice.sender.logoUrl ? (
              <img
                src={invoice.sender.logoUrl}
                alt={invoice.sender.companyName}
                className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0"
                style={{ backgroundColor: themeColor }}
              >
                {(invoice.sender.companyName || 'B')[0].toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {invoice.sender.companyName || 'Business Name'}
              </h1>
              {invoice.sender.contactPerson && (
                <p className="text-sm font-semibold text-slate-700">{invoice.sender.contactPerson}</p>
              )}
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                {invoice.sender.address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{invoice.sender.address}{invoice.sender.cityStateZip ? `, ${invoice.sender.cityStateZip}` : ''}</span>
                  </p>
                )}
                {invoice.sender.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{invoice.sender.email}</span>
                  </p>
                )}
                {invoice.sender.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{invoice.sender.phone}</span>
                  </p>
                )}
                {invoice.sender.taxNumber && (
                  <p className="text-[11px] font-medium text-slate-600 pt-0.5">
                    {invoice.sender.taxNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Document Title & Numbers */}
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div
              className="text-2xl sm:text-3xl font-black uppercase tracking-wider mb-2"
              style={{ color: themeColor }}
            >
              INVOICE
            </div>
            
            <div className="inline-block bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 text-left sm:text-right">
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-500 font-medium">Invoice No:</span>
                <span className="font-bold text-slate-900 font-mono">{invoice.invoiceNumber || 'INV-001'}</span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="font-semibold text-slate-800">{invoice.date || 'N/A'}</span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-500 font-medium">Due Date:</span>
                <span className="font-semibold text-slate-800">{invoice.dueDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3 items-center pt-0.5">
                <span className="text-slate-500 font-medium">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    invoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : invoice.status === 'overdue'
                      ? 'bg-rose-100 text-rose-800'
                      : invoice.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* CLIENT & CUSTOM FIELDS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-sm">
          
          {/* Bill To */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Bill To / Recipient
            </h2>
            <p className="font-bold text-base text-slate-900">{invoice.recipient.name || 'Client / Patient Name'}</p>
            {invoice.recipient.contactPerson && (
              <p className="text-xs text-slate-600 font-medium">{invoice.recipient.contactPerson}</p>
            )}
            <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
              {invoice.recipient.address && (
                <p>{invoice.recipient.address}{invoice.recipient.cityStateZip ? `, ${invoice.recipient.cityStateZip}` : ''}</p>
              )}
              {invoice.recipient.phone && <p>Phone: {invoice.recipient.phone}</p>}
              {invoice.recipient.email && <p>Email: {invoice.recipient.email}</p>}
              {invoice.recipient.taxNumber && <p>Tax ID: {invoice.recipient.taxNumber}</p>}
            </div>

            {/* Custom Client Fields */}
            {clientFields.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1">
                {clientFields.map(cf => (
                  <div key={cf.id} className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">{cf.label}:</span>
                    <span className="font-semibold text-slate-800">
                      {invoice.customFieldValues[cf.id] || cf.defaultValue || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reference / Header Custom Fields */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Order & Billing Details
              </h2>
              <div className="space-y-1.5 text-xs">
                {headerFields.length > 0 ? (
                  headerFields.map(cf => (
                    <div key={cf.id} className="flex justify-between items-center py-0.5 border-b border-slate-200/50 last:border-none">
                      <span className="text-slate-500 font-medium">{cf.label}:</span>
                      <span className="font-semibold text-slate-900 text-right">
                        {invoice.customFieldValues[cf.id] || cf.defaultValue || '—'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-xs">Standard Billing Terms</p>
                )}
              </div>
            </div>

            {template?.name && (
              <div className="pt-2 mt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px] text-slate-400">
                <span>Template:</span>
                <span className="font-medium text-slate-600">{template.name}</span>
              </div>
            )}
          </div>

        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-x-auto my-6">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr
                className="text-white text-xs uppercase tracking-wider font-semibold rounded-t-lg"
                style={{ backgroundColor: themeColor }}
              >
                <th className="py-2.5 px-3 rounded-tl-lg">#</th>
                <th className="py-2.5 px-3">Item & Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Disc %</th>
                <th className="py-2.5 px-3 text-right rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b border-slate-200">
              {invoice.items.map((item, idx) => {
                const lineDiscount = (item.quantity * item.unitPrice * (item.discountPercent || 0)) / 100;
                const lineAmount = item.quantity * item.unitPrice - lineDiscount;

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      <div>{item.description || 'Service or Item'}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 font-medium">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{formatMoney(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      {item.discountPercent ? `${item.discountPercent}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatMoney(lineAmount)}
                    </td>
                  </tr>
                );
              })}
              {invoice.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    No items added yet. Add line items to your invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TOTALS & PAYMENT INFO SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 my-6 pt-2">
          
          {/* Notes & Bank details (Left 7 cols) */}
          <div className="sm:col-span-7 space-y-4 text-xs">
            {invoice.paymentDetails && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                  Payment Instructions / Bank Details:
                </h3>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{invoice.paymentDetails}</p>
              </div>
            )}

            {invoice.notes && (
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                  Notes & Special Instructions:
                </h3>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
              </div>
            )}

            {invoice.paymentTerms && (
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                  Terms & Conditions:
                </h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">{invoice.paymentTerms}</p>
              </div>
            )}

            {footerFields.map(cf => (
              <div key={cf.id} className="pt-1 flex gap-2 text-xs">
                <span className="font-bold text-slate-700">{cf.label}:</span>
                <span className="text-slate-600">{invoice.customFieldValues[cf.id] || cf.defaultValue || '—'}</span>
              </div>
            ))}
          </div>

          {/* Calculations Box (Right 5 cols) */}
          <div className="sm:col-span-5 bg-slate-50/90 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatMoney(invoice.subtotal)}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-semibold">-{formatMoney(invoice.discountTotal)}</span>
              </div>
            )}

            {invoice.taxTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax / GST:</span>
                <span className="font-semibold text-slate-800">+{formatMoney(invoice.taxTotal)}</span>
              </div>
            )}

            {invoice.shippingFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Shipping / Additional Fee:</span>
                <span className="font-semibold text-slate-800">+{formatMoney(invoice.shippingFee)}</span>
              </div>
            )}

            <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
              <span className="text-sm font-black text-slate-900">Grand Total:</span>
              <span
                className="text-base sm:text-lg font-black"
                style={{ color: themeColor }}
              >
                {formatMoney(invoice.grandTotal)}
              </span>
            </div>

            {invoice.amountPaid > 0 && (
              <div className="flex justify-between text-emerald-700 pt-1 border-t border-slate-200">
                <span>Amount Paid:</span>
                <span className="font-semibold">{formatMoney(invoice.amountPaid)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 font-bold text-slate-900 border-t border-slate-200">
              <span>Balance Due:</span>
              <span className="text-sm font-bold text-rose-600">
                {formatMoney(invoice.balanceDue)}
              </span>
            </div>
          </div>

        </div>

        {/* FOOTER SIGNATURE & BRAND */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-4 text-xs text-slate-400">
          <div>
            <p className="font-medium text-slate-500">Thank you for your trust and business!</p>
            {invoice.sender.website && (
              <p className="text-[11px] text-blue-600">{invoice.sender.website}</p>
            )}
          </div>

          <div className="text-center sm:text-right w-full sm:w-44">
            <div className="border-b border-slate-300 h-10 mb-1"></div>
            <p className="text-[11px] font-semibold text-slate-600">Authorized Signature</p>
          </div>
        </div>

      </div>
    );
  }
);
