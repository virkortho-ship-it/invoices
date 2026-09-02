import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  InvoiceTemplate, 
  InvoiceData, 
  DriveFolder, 
  InvoiceItem, 
  InvoiceStatus 
} from '../types';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { INITIAL_SEED_INVOICES } from '../data/seedInvoices';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getCachedAccessToken, 
  setCachedAccessToken 
} from '../services/auth';
import { 
  listDriveFolders, 
  createDriveFolder, 
  uploadPdfToDrive, 
  listDriveFiles 
} from '../services/drive';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  // Auth state
  user: User | null;
  accessToken: string | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  
  // Views
  activeView: 'create' | 'invoices' | 'templates' | 'drive-settings';
  setActiveView: (view: 'create' | 'invoices' | 'templates' | 'drive-settings') => void;
  
  // Templates
  templates: InvoiceTemplate[];
  activeTemplate: InvoiceTemplate;
  setActiveTemplate: (template: InvoiceTemplate) => void;
  saveTemplate: (template: InvoiceTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string) => void;
  
  // Invoices
  invoices: InvoiceData[];
  currentInvoice: InvoiceData;
  setCurrentInvoice: React.Dispatch<React.SetStateAction<InvoiceData>>;
  saveInvoice: (invoice: InvoiceData) => void;
  deleteInvoice: (invoiceId: string) => void;
  editInvoice: (invoice: InvoiceData) => void;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  duplicateInvoice: (invoiceId: string) => void;
  createNewInvoiceFromTemplate: (template?: InvoiceTemplate) => void;
  
  // Google Drive
  driveFolders: DriveFolder[];
  selectedDriveFolder: DriveFolder | null;
  setSelectedDriveFolder: (folder: DriveFolder | null) => void;
  isLoadingDriveFolders: boolean;
  refreshDriveFolders: () => Promise<void>;
  createNewDriveFolder: (folderName: string) => Promise<DriveFolder>;
  isSyncingToDrive: boolean;
  syncInvoiceToDrive: (invoice: InvoiceData, pdfBlob: Blob) => Promise<{ fileId: string; webViewLink: string }>;
  
  // Toasts
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TEMPLATES_STORAGE_KEY = 'invoicemaker_custom_templates_v1';
const INVOICES_STORAGE_KEY = 'invoicemaker_saved_invoices_v1';
const DRIVE_FOLDER_STORAGE_KEY = 'invoicemaker_selected_drive_folder_v1';
const BUSINESS_PROFILE_STORAGE_KEY = 'invoicemaker_business_profile_v2';

const loadSavedBusinessProfile = () => {
  try {
    const raw = localStorage.getItem(BUSINESS_PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export function createBlankInvoice(template: InvoiceTemplate): InvoiceData {
  const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const savedBusiness = loadSavedBusinessProfile();
  const sender = { ...template.businessDetails, ...savedBusiness };
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Default custom field values
  const customValues: Record<string, string> = {};
  template.customFields.forEach(cf => {
    if (cf.defaultValue) {
      customValues[cf.id] = cf.defaultValue;
    }
  });

  // Starter sample items matching category
  let defaultItems: InvoiceItem[] = [];
  if (template.category === 'medical') {
    defaultItems = [
      {
        id: 'item-1',
        description: 'Comprehensive Orthopedic Specialist Consultation & Examination',
        quantity: 1,
        unitPrice: 3500,
        discountPercent: 0,
        taxRatePercent: 0,
        amount: 3500,
      },
      {
        id: 'item-2',
        description: 'Digital X-Ray / Knee Joint Bilateral & Assessment',
        quantity: 1,
        unitPrice: 2200,
        discountPercent: 0,
        taxRatePercent: 0,
        amount: 2200,
      },
      {
        id: 'item-3',
        description: 'Intra-articular Injection Procedure & Post-care Support',
        quantity: 1,
        unitPrice: 4500,
        discountPercent: 0,
        taxRatePercent: 0,
        amount: 4500,
      },
    ];
  } else if (template.category === 'freelance') {
    defaultItems = [
      {
        id: 'item-1',
        description: 'UI/UX Interactive System Design & Prototype Sprint',
        quantity: 40,
        unitPrice: 65,
        discountPercent: 0,
        taxRatePercent: 0,
        amount: 2600,
      },
      {
        id: 'item-2',
        description: 'Frontend Architecture & Production Integration (React/TS)',
        quantity: 25,
        unitPrice: 80,
        discountPercent: 5,
        taxRatePercent: 0,
        amount: 1900,
      },
    ];
  } else if (template.category === 'retail') {
    defaultItems = [
      {
        id: 'item-1',
        description: 'Heavy Duty Ergonomic Office Task Chairs (Model X-90)',
        quantity: 6,
        unitPrice: 450,
        discountPercent: 10,
        taxRatePercent: 5,
        amount: 2565,
      },
      {
        id: 'item-2',
        description: 'Motorized Dual-Motor Height Adjustable Desk Frame',
        quantity: 3,
        unitPrice: 850,
        discountPercent: 0,
        taxRatePercent: 5,
        amount: 2677.5,
      },
    ];
  } else {
    defaultItems = [
      {
        id: 'item-1',
        description: 'Professional Enterprise Consulting & System Assessment',
        quantity: 1,
        unitPrice: 1200,
        discountPercent: 0,
        taxRatePercent: template.defaultTaxRate,
        amount: 1200 * (1 + template.defaultTaxRate / 100),
      },
      {
        id: 'item-2',
        description: 'Technical Documentation, Workflow Setup & Training',
        quantity: 1,
        unitPrice: 600,
        discountPercent: 0,
        taxRatePercent: template.defaultTaxRate,
        amount: 600 * (1 + template.defaultTaxRate / 100),
      },
    ];
  }

  // Calculate totals
  let sub = 0;
  let tax = 0;
  let disc = 0;
  defaultItems.forEach(it => {
    const raw = it.quantity * it.unitPrice;
    const itemDisc = raw * ((it.discountPercent || 0) / 100);
    const itemTax = (raw - itemDisc) * ((it.taxRatePercent || 0) / 100);
    sub += raw;
    disc += itemDisc;
    tax += itemTax;
  });

  const grand = sub - disc + tax;

  return {
    id: `inv-${Date.now()}`,
    invoiceNumber: invoiceNum,
    templateId: template.id,
    templateName: template.name,
    date: today,
    dueDate: due,
    status: 'pending',
    sender,
    recipient: {
      name: template.category === 'medical' ? 'Muhammad Usman' : 'Acme Corporation',
      contactPerson: template.category === 'medical' ? 'Patient' : 'John Doe (Procurement Manager)',
      email: template.category === 'medical' ? 'usman.patient@gmail.com' : 'finance@acmecorp.com',
      phone: '+92 321 9876543',
      address: 'House # 18, Block B, Model Town',
      cityStateZip: 'Lahore, Pakistan',
      taxNumber: '',
      notes: '',
    },
    items: defaultItems,
    customFieldValues: customValues,
    currency: { ...template.currency },
    subtotal: sub,
    taxTotal: tax,
    discountTotal: disc,
    shippingFee: 0,
    grandTotal: grand,
    amountPaid: 0,
    balanceDue: grand,
    notes: template.defaultNotes,
    paymentTerms: template.defaultPaymentTerms,
    paymentDetails: template.paymentDetails,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // View state
  const [activeView, setActiveView] = useState<'create' | 'invoices' | 'templates' | 'drive-settings'>('create');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Templates state
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep user-created templates, while automatically adding any new built-in templates.
          const existingIds = new Set(parsed.map((t: InvoiceTemplate) => t.id));
          const missingDefaults = DEFAULT_TEMPLATES.filter(t => !existingIds.has(t.id));
          return [...parsed, ...missingDefaults];
        }
      }
    } catch (e) {
      console.error('Error loading stored templates:', e);
    }
    return DEFAULT_TEMPLATES;
  });

  const [activeTemplate, setActiveTemplateState] = useState<InvoiceTemplate>(() => {
    return templates[0] || DEFAULT_TEMPLATES[0];
  });

  const setActiveTemplate = (template: InvoiceTemplate) => {
    setActiveTemplateState(template);
  };

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceData[]>(() => {
    try {
      const stored = localStorage.getItem(INVOICES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored invoices:', e);
    }
    return INITIAL_SEED_INVOICES;
  });

  // Current active invoice in editor
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData>(() => {
    return createBlankInvoice(templates[0] || DEFAULT_TEMPLATES[0]);
  });

  // Google Drive state
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [selectedDriveFolder, setSelectedDriveFolderState] = useState<DriveFolder | null>(() => {
    try {
      const stored = localStorage.getItem(DRIVE_FOLDER_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading drive folder:', e);
    }
    return null;
  });

  const setSelectedDriveFolder = (folder: DriveFolder | null) => {
    setSelectedDriveFolderState(folder);
    if (folder) {
      localStorage.setItem(DRIVE_FOLDER_STORAGE_KEY, JSON.stringify(folder));
    } else {
      localStorage.removeItem(DRIVE_FOLDER_STORAGE_KEY);
    }
  };

  const [isLoadingDriveFolders, setIsLoadingDriveFolders] = useState(false);
  const [isSyncingToDrive, setIsSyncingToDrive] = useState(false);

  // Sync templates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('Error saving templates:', e);
    }
  }, [templates]);

  // Sync invoices to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
    } catch (e) {
      console.error('Error saving invoices:', e);
    }
  }, [invoices]);

  // Init Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setAccessToken(token);
        }
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch Drive folders when access token is available
  const refreshDriveFolders = async () => {
    const token = accessToken || getCachedAccessToken();
    if (!token) return;

    try {
      setIsLoadingDriveFolders(true);
      const folders = await listDriveFolders(token);
      setDriveFolders(folders);

      // Auto create or select "My Invoices" if none is selected
      if (!selectedDriveFolder && folders.length > 0) {
        const found = folders.find(f => f.name.toLowerCase().includes('invoice'));
        if (found) {
          setSelectedDriveFolder(found);
        }
      }
    } catch (err: any) {
      console.warn('Could not list drive folders:', err);
    } finally {
      setIsLoadingDriveFolders(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      refreshDriveFolders();
    }
  }, [accessToken]);

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      setIsAuthLoading(true);
      const result = await googleSignIn();
      setUser(result.user);
      setAccessToken(result.accessToken);
      showToast('success', 'Google Drive Connected', `Signed in as ${result.user.email}`);
    } catch (error: any) {
      console.error('Sign in failed:', error);
      showToast('error', 'Google Sign-In Failed', error.message || 'Could not connect to Google Drive');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Sign out
  const signOutUser = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      showToast('info', 'Disconnected', 'Google Account disconnected');
    } catch (error: any) {
      console.error('Sign out failed:', error);
    }
  };

  // Save template
  const saveTemplate = (template: InvoiceTemplate) => {
    const updated = {
      ...template,
      updatedAt: new Date().toISOString(),
    };

    setTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      if (exists) {
        return prev.map(t => (t.id === template.id ? updated : t));
      } else {
        return [updated, ...prev];
      }
    });

    if (activeTemplate.id === template.id) {
      setActiveTemplate(updated);
    }

    showToast('success', 'Template Saved', `Template "${template.name}" has been saved.`);
  };

  // Delete template
  const deleteTemplate = (templateId: string) => {
    if (templates.length <= 1) {
      showToast('warning', 'Cannot Delete', 'You must have at least one invoice template.');
      return;
    }

    const tpl = templates.find(t => t.id === templateId);
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    
    if (activeTemplate.id === templateId) {
      const remaining = templates.filter(t => t.id !== templateId);
      setActiveTemplate(remaining[0] || DEFAULT_TEMPLATES[0]);
    }

    showToast('info', 'Template Removed', `Template "${tpl?.name || templateId}" deleted.`);
  };

  // Duplicate template
  const duplicateTemplate = (templateId: string) => {
    const original = templates.find(t => t.id === templateId);
    if (!original) return;

    const copy: InvoiceTemplate = {
      ...original,
      id: `tpl-custom-${Date.now()}`,
      name: `${original.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTemplates(prev => [copy, ...prev]);
    setActiveTemplate(copy);
    showToast('success', 'Template Duplicated', `Created copy of "${original.name}".`);
  };

  // Save invoice
  const saveInvoice = (invoice: InvoiceData) => {
    const updated = {
      ...invoice,
      updatedAt: new Date().toISOString(),
    };

    setInvoices(prev => {
      const exists = prev.some(inv => inv.id === invoice.id);
      if (exists) {
        return prev.map(inv => (inv.id === invoice.id ? updated : inv));
      } else {
        return [updated, ...prev];
      }
    });

    setCurrentInvoice(updated);
    showToast('success', 'Invoice Saved', `Invoice ${invoice.invoiceNumber} saved successfully.`);
  };

  // Delete invoice
  const deleteInvoice = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    setInvoices(prev => prev.filter(i => i.id !== invoiceId));
    showToast('info', 'Invoice Deleted', `Invoice ${inv?.invoiceNumber || invoiceId} removed from records.`);
  };

  // Update invoice status quickly
  const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus) => {
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id === invoiceId) {
          let updatedPaid = inv.amountPaid;
          let updatedDue = inv.balanceDue;
          if (status === 'paid') {
            updatedPaid = inv.grandTotal;
            updatedDue = 0;
          } else if (status === 'pending' || status === 'overdue') {
            if (updatedPaid === inv.grandTotal) {
              updatedPaid = 0;
              updatedDue = inv.grandTotal;
            }
          }
          return {
            ...inv,
            status,
            amountPaid: updatedPaid,
            balanceDue: updatedDue,
            updatedAt: new Date().toISOString(),
          };
        }
        return inv;
      })
    );
    showToast('success', 'Status Updated', `Invoice status changed to ${status.toUpperCase()}`);
  };

  // Duplicate an existing invoice
  const duplicateInvoice = (invoiceId: string) => {
    const original = invoices.find(i => i.id === invoiceId);
    if (!original) return;

    const copyNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const copy: InvoiceData = {
      ...original,
      id: `inv-copy-${Date.now()}`,
      invoiceNumber: copyNum,
      status: 'draft',
      driveFileId: undefined,
      driveWebViewLink: undefined,
      drivePdfName: undefined,
      driveFolderId: undefined,
      driveFolderName: undefined,
      lastSyncedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices(prev => [copy, ...prev]);
    showToast('success', 'Invoice Duplicated', `Created new draft ${copyNum}`);
  };

  // Edit past invoice
  const editInvoice = (invoice: InvoiceData) => {
    setCurrentInvoice(invoice);
    const matchedTemplate = templates.find(t => t.id === invoice.templateId);
    if (matchedTemplate) {
      setActiveTemplate(matchedTemplate);
    }
    setActiveView('create');
  };

  // Create new blank invoice
  const createNewInvoiceFromTemplate = (template?: InvoiceTemplate) => {
    const tpl = template || activeTemplate || templates[0] || DEFAULT_TEMPLATES[0];
    const newInv = createBlankInvoice(tpl);
    setCurrentInvoice(newInv);
    setActiveTemplate(tpl);
    setActiveView('create');
    showToast('info', 'New Invoice Started', `Using template: ${tpl.name}`);
  };

  // Create new drive folder
  const createNewDriveFolder = async (folderName: string): Promise<DriveFolder> => {
    const token = accessToken || getCachedAccessToken();
    if (!token) {
      throw new Error('Google Drive access token missing. Please sign in with Google first.');
    }

    const folder = await createDriveFolder(token, folderName);
    setDriveFolders(prev => [folder, ...prev]);
    setSelectedDriveFolder(folder);
    showToast('success', 'Folder Created in Google Drive', `Designated folder: ${folder.name}`);
    return folder;
  };

  // Sync / Upload Invoice PDF to Google Drive
  const syncInvoiceToDrive = async (
    invoice: InvoiceData, 
    pdfBlob: Blob
  ): Promise<{ fileId: string; webViewLink: string }> => {
    const token = accessToken || getCachedAccessToken();
    if (!token) {
      throw new Error('Please connect your Google Drive account first using the Sign In button.');
    }

    try {
      setIsSyncingToDrive(true);
      let targetFolderId = selectedDriveFolder?.id;

      // If no folder selected yet, create or find "My Invoices"
      if (!targetFolderId) {
        const folders = await listDriveFolders(token);
        let found = folders.find(f => f.name.toLowerCase() === 'my invoices' || f.name.toLowerCase() === 'invoices');
        if (!found) {
          found = await createDriveFolder(token, 'My Invoices');
        }
        setSelectedDriveFolder(found);
        targetFolderId = found.id;
      }

      const fileName = `${invoice.invoiceNumber || 'Invoice'}_${invoice.recipient.name.replace(/[^a-zA-Z0-9]/g, '_')}_${invoice.date}`;
      const uploadedFile = await uploadPdfToDrive(token, pdfBlob, fileName, targetFolderId);

      const updatedInvoice: InvoiceData = {
        ...invoice,
        driveFileId: uploadedFile.id,
        driveWebViewLink: uploadedFile.webViewLink,
        drivePdfName: uploadedFile.name,
        driveFolderId: targetFolderId,
        driveFolderName: selectedDriveFolder?.name || 'My Invoices',
        lastSyncedAt: new Date().toISOString(),
      };

      saveInvoice(updatedInvoice);
      showToast('success', 'Saved to Google Drive', `Invoice ${invoice.invoiceNumber} uploaded to Google Drive folder.`);

      return {
        fileId: uploadedFile.id,
        webViewLink: uploadedFile.webViewLink,
      };
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      showToast('error', 'Google Drive Upload Failed', err.message || 'Check your internet connection or Google authorization.');
      throw err;
    } finally {
      setIsSyncingToDrive(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        accessToken,
        isAuthLoading,
        signInWithGoogle,
        signOutUser,
        activeView,
        setActiveView,
        templates,
        activeTemplate,
        setActiveTemplate,
        saveTemplate,
        deleteTemplate,
        duplicateTemplate,
        invoices,
        currentInvoice,
        setCurrentInvoice,
        saveInvoice,
        deleteInvoice,
        editInvoice,
        updateInvoiceStatus,
        duplicateInvoice,
        createNewInvoiceFromTemplate,
        driveFolders,
        selectedDriveFolder,
        setSelectedDriveFolder,
        isLoadingDriveFolders,
        refreshDriveFolders,
        createNewDriveFolder,
        isSyncingToDrive,
        syncInvoiceToDrive,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
