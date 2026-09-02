export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue';

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date';
  placeholder?: string;
  defaultValue?: string;
  enabled: boolean;
  section: 'header' | 'client' | 'item' | 'footer';
}

export interface BusinessDetails {
  companyName: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip?: string;
  taxNumber?: string; // GST / VAT / NTN
  logoUrl?: string;
  website?: string;
}

export interface SavedCustomer {
  id: string;
  name: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip?: string;
  taxNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientDetails {
  name: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip?: string;
  taxNumber?: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRatePercent?: number;
  amount: number; // calculated (qty * price - discount + tax)
  category?: string;
}

export interface TemplateStyling {
  themeColor: string; // Hex color (e.g., #2563eb)
  fontFamily: 'sans' | 'serif' | 'mono';
  headerLayout: 'modern' | 'classic' | 'minimal' | 'compact';
  showBorders: boolean;
  showWatermark: boolean;
  accentBackground: boolean;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'medical' | 'freelance' | 'retail' | 'custom';
  businessDetails: BusinessDetails;
  currency: {
    symbol: string;
    code: string;
    position: 'prefix' | 'suffix';
  };
  customFields: CustomFieldConfig[];
  styling: TemplateStyling;
  defaultTaxRate: number;
  defaultPaymentTerms: string;
  defaultNotes: string;
  paymentDetails: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  /** Optional user-authored HTML/CSS invoice template. Supports {{...}} placeholders. */
  customTemplateCode?: string;
  /** Visual spreadsheet editor state persisted with the template. */
  visualSheet?: unknown;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  templateId: string;
  templateName?: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  
  sender: BusinessDetails;
  recipient: RecipientDetails;
  
  items: InvoiceItem[];
  customFieldValues: Record<string, string>;
  
  currency: {
    symbol: string;
    code: string;
    position: 'prefix' | 'suffix';
  };
  
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  shippingFee: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  
  notes: string;
  paymentTerms: string;
  paymentDetails: string;
  
  // Google Drive integration metadata
  driveFileId?: string;
  driveWebViewLink?: string;
  drivePdfName?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  lastSyncedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveUploadedFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  createdTime?: string;
  size?: string;
}
