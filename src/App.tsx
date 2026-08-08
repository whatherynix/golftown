import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CustomerRecord, FilterGender, StoreLocation } from './types';
import { INITIAL_CUSTOMERS, guessGender } from './data/initialData';
import { sanitizeCustomerRecords } from './data/dataSanitizer';
import { GOLF_TOWN_STORES, getFullStoreDisplayName, findGolfTownStore } from './data/golfTownStores';
import { StoreMapModal } from './components/StoreMapModal';
import { CustomerNameInsightModal } from './components/CustomerNameInsightModal';
import { XlsxUploadModal } from './components/XlsxUploadModal';
import { MobileContactCard } from './components/MobileContactCard';
import { LoginSplashScreen } from './components/LoginSplashScreen';
import { StoreCreditPolicyModal } from './components/StoreCreditPolicyModal';
import { EmailFormPreviewModal } from './components/EmailFormPreviewModal';
import { CustomerPortalView } from './components/CustomerPortalView';
import { LiveSocketAdminModal } from './components/LiveSocketAdminModal';
import { AutomatedAlertsModal } from './components/AutomatedAlertsModal';
import { StoreCreditAnalyticsModal } from './components/StoreCreditAnalyticsModal';
import { CustomReceiptRefundModal } from './components/CustomReceiptRefundModal';
import { 
  Users, 
  Search, 
  Sparkles, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  FileSpreadsheet, 
  PieChart, 
  DollarSign, 
  RefreshCw,
  Store,
  MapPin,
  Phone,
  MessageSquare,
  Building2,
  Tag,
  TrendingUp,
  User,
  X,
  Check,
  CheckCircle2,
  Navigation,
  BookOpen,
  Smartphone,
  Table as TableIcon,
  LayoutGrid,
  Lock,
  LogOut,
  CreditCard,
  Mail,
  ExternalLink,
  Calendar,
  ShieldCheck,
  Menu,
  Bell,
  BarChart3,
  Receipt
} from 'lucide-react';

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  },
  sessionGetItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  sessionSetItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {}
  },
  sessionRemoveItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  }
};

export default function App() {
  const [sessionParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id') || params.get('sessionId');
    const depositToken = params.get('deposit_token');
    const amount = params.get('amount') || '250.00';
    return {
      sessionId,
      depositToken,
      amount,
      isCustomerPortal: !!(sessionId || depositToken)
    };
  });

  if (sessionParams.isCustomerPortal) {
    return (
      <CustomerPortalView 
        sessionId={sessionParams.sessionId || ''} 
        depositToken={sessionParams.depositToken || ''} 
        initialAmount={sessionParams.amount}
      />
    );
  }

  // Authentication / Lock Screen State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return safeStorage.sessionGetItem('golftown_authenticated') === 'true';
  });

  const handleAuthenticate = () => {
    safeStorage.sessionSetItem('golftown_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLockout = () => {
    safeStorage.sessionRemoveItem('golftown_authenticated');
    setIsAuthenticated(false);
  };
  // Store Locations List (Defaulting to Store 504 and master Canadian Golf Town locations, excluding 505)
  const [stores, setStores] = useState<StoreLocation[]>(() => {
    const saved = safeStorage.getItem('store_locations_list');
    if (saved) {
      try {
        const parsed: StoreLocation[] = JSON.parse(saved);
        // Exclude 505 if present and ensure 504 is included
        const filtered = parsed.filter(s => s.id !== '505');
        if (!filtered.some(s => s.id === '504')) {
          filtered.unshift(GOLF_TOWN_STORES.find(s => s.id === '504')!);
        }
        return filtered;
      } catch (e) { /* fallback */ }
    }
    return GOLF_TOWN_STORES.filter(s => s.id !== '505');
  });

  // Customer Records List
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    const saved = safeStorage.getItem('multi_store_customers');
    if (saved) {
      try {
        const parsed: CustomerRecord[] = JSON.parse(saved);
        // Clean records: filter out store 505 records by default to focus on 504 & new uploaded stores
        const cleaned = parsed.filter(c => c.storeId !== '505').map(c => ({
          ...c,
          city: c.city || 'Calgary',
          phone: c.phone && c.phone !== '(blank)' ? c.phone : '(403) 723-0100'
        }));
        if (cleaned.length > 0) return sanitizeCustomerRecords(cleaned);
      } catch (e) { /* fallback */ }
    }
    // Fallback to Store 504 records
    const initial504 = INITIAL_CUSTOMERS.filter(c => c.storeId === '504').map(c => ({
      ...c,
      city: c.city || 'Calgary',
      phone: c.phone && c.phone !== '(blank)' ? c.phone : '(403) 723-0100'
    }));
    return sanitizeCustomerRecords(initial504);
  });

  // Filters & Mobile App State
  const [selectedStoreId, setSelectedStoreId] = useState<string>('504'); // Default Store 504 - South Calgary Golf Town
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<FilterGender>('All');
  const [selectedRefundStatus, setSelectedRefundStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'contacts' | 'stores' | 'stats' | 'import'>('contacts');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards'); // Default to sleek cards
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Modals
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapStore, setMapStore] = useState<StoreLocation | null>(null);

  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [insightCustomer, setInsightCustomer] = useState<CustomerRecord | null>(null);

  const [isXlsxModalOpen, setIsXlsxModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isEmailFormModalOpen, setIsEmailFormModalOpen] = useState(false);
  const [isLiveSocketModalOpen, setIsLiveSocketModalOpen] = useState(false);
  const [isAutomatedAlertsModalOpen, setIsAutomatedAlertsModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isCustomReceiptModalOpen, setIsCustomReceiptModalOpen] = useState(false);

  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Customer Selection & Batch Action State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const handleToggleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleCustomerSelect = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkExportCSV = () => {
    const selectedRecords = filteredCustomers.filter(c => selectedCustomerIds.includes(c.id));
    if (selectedRecords.length === 0) return;

    const headers = ['Store ID', 'Full Store Name', 'Quarter', 'Year', 'Cust ID', 'First Name', 'Last Name', 'City', 'Phone', 'Email', 'Company', 'Store Credit Balance ($)', 'Comments', 'Gender'];
    const rows = selectedRecords.map(c => [
      `"${c.storeId}"`,
      `"${c.storeName}"`,
      `"${c.quarter}"`,
      c.year,
      `"${c.custId}"`,
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      `"${c.city || 'Calgary'}"`,
      `"${c.phone || '(403) 723-0100'}"`,
      `"${c.email}"`,
      `"${c.company}"`,
      c.sumOfStoreCreditBalance,
      `"${c.comments}"`,
      `"${c.gender}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Golf_Town_Selected_Customers_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAiMessage(`Successfully exported ${selectedRecords.length} selected customer records to CSV!`);
    setTimeout(() => setAiMessage(''), 5000);
  };

  const handleBulkSendEmail = async () => {
    const selectedRecords = filteredCustomers.filter(c => selectedCustomerIds.includes(c.id) && c.email && c.email !== '(blank)');
    if (selectedRecords.length === 0) {
      alert('None of the selected customers have a valid email address.');
      return;
    }

    if (!confirm(`Are you sure you want to send Store Credit Refund Notices via SMTP to ${selectedRecords.length} selected customers?`)) {
      return;
    }

    setAiMessage(`Batch dispatching ${selectedRecords.length} refund notice emails via SMTP...`);
    let successCount = 0;

    for (const c of selectedRecords) {
      try {
        const res = await fetch('/api/send-refund-notice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: c.email,
            recipientName: `${c.firstName} ${c.lastName}`,
            amount: c.sumOfStoreCreditBalance,
            storeId: c.storeId,
            custId: c.custId,
            comments: c.comments,
            actionType: 'refund'
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        }
      } catch (e) {
        // ignore
      }
    }

    setAiMessage(`Successfully sent SMTP refund notices to ${successCount} of ${selectedRecords.length} selected customers!`);
    setTimeout(() => setAiMessage(''), 6000);
  };

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

  // Form State
  const [formStoreId, setFormStoreId] = useState('504');
  const [formQuarter, setFormQuarter] = useState('Q1');
  const [formYear, setFormYear] = useState('2026');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formCity, setFormCity] = useState('Calgary');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCustId, setFormCustId] = useState('');
  const [formStoreCredit, setFormStoreCredit] = useState('100.00');
  const [formComments, setFormComments] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Unknown'>('Unknown');

  // AI status
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  // Local persistence helpers & debounced auto-save ref
  const saveTimeoutRef = useRef<number | null>(null);

  const handleSaveCustomers = (newCustomers: CustomerRecord[]) => {
    setCustomers(newCustomers);
    safeStorage.setItem('multi_store_customers', JSON.stringify(newCustomers));
    
    // Clear any existing pending debounce timer
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    // Debounce backend synchronization by 2 seconds of inactivity
    saveTimeoutRef.current = window.setTimeout(() => {
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: newCustomers })
      }).then(res => res.json())
        .then(data => {
          console.log('[Auto-Save] Backend synchronized successfully:', data);
        })
        .catch(err => console.error('Failed to debounced sync customers:', err));
    }, 2000);
  };

  // Sync customers to backend on load
  useEffect(() => {
    if (customers && customers.length > 0) {
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers })
      }).catch(err => console.error('Initial sync failed:', err));
    }
  }, []);

  const handleSaveStores = (newStores: StoreLocation[]) => {
    setStores(newStores);
    safeStorage.setItem('store_locations_list', JSON.stringify(newStores));
  };

  // Active Store Metadata
  const currentStoreObj = useMemo(() => {
    if (selectedStoreId === 'All') {
      return stores[0] || GOLF_TOWN_STORES[0];
    }
    return stores.find(s => s.id === selectedStoreId) || GOLF_TOWN_STORES.find(s => s.id === selectedStoreId) || {
      id: selectedStoreId,
      name: `Store ${selectedStoreId} - Golf Town Location`,
      code: selectedStoreId,
      address: '130 11500 35 St SE',
      city: 'Calgary',
      province: 'AB',
      phone: '(403) 723-0100',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+Calgary'
    };
  }, [selectedStoreId, stores]);

  // Quarter-Year Options
  const quarterYearOptions = useMemo(() => {
    const keys = new Set<string>();
    customers.forEach(c => {
      if (c.quarterYearKey) keys.add(c.quarterYearKey);
      else if (c.year && c.quarter) keys.add(`${c.year}-${c.quarter}`);
    });
    return Array.from(keys).sort();
  }, [customers]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Exclude store 505 completely if user requested
      if (c.storeId === '505' && selectedStoreId !== '505') return false;

      const matchesStore = selectedStoreId === 'All' || c.storeId === selectedStoreId;
      const matchesQY = selectedQuarterYear === 'All' || c.quarterYearKey === selectedQuarterYear;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        c.firstName.toLowerCase().includes(query) ||
        c.lastName.toLowerCase().includes(query) ||
        c.custId.toLowerCase().includes(query) ||
        (c.city && c.city.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.comments && c.comments.toLowerCase().includes(query));

      const matchesGender = selectedGender === 'All' || c.gender === selectedGender;
      const matchesRefundStatus = selectedRefundStatus === 'All' || (c.refundStatus || 'Pending') === selectedRefundStatus;

      // Date Range Filter on lastSaleDate
      const parseDateNum = (dateStr?: string): number => {
        if (!dateStr || dateStr === '(blank)') return 0;
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return isNaN(d.getTime()) ? 0 : d.getTime();
          } else {
            const d = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
            return isNaN(d.getTime()) ? 0 : d.getTime();
          }
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };

      const cDateNum = parseDateNum(c.lastSaleDate);
      let matchesDateRange = true;
      if (startDate) {
        const startNum = new Date(startDate).getTime();
        if (!isNaN(startNum) && cDateNum > 0 && cDateNum < startNum) matchesDateRange = false;
      }
      if (endDate) {
        const endNum = new Date(endDate).setHours(23, 59, 59, 999);
        if (!isNaN(endNum) && cDateNum > 0 && cDateNum > endNum) matchesDateRange = false;
      }

      return matchesStore && matchesQY && matchesSearch && matchesGender && matchesRefundStatus && matchesDateRange;
    });
  }, [customers, selectedStoreId, selectedQuarterYear, searchQuery, selectedGender, selectedRefundStatus, startDate, endDate]);

  // Dashboard Stats
  const stats = useMemo(() => {
    let totalBalance = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let unknownCount = 0;
    let refundPending = 0;
    let refundSms = 0;
    let refundAuth = 0;
    let refundDone = 0;
    const citiesSet = new Set<string>();

    filteredCustomers.forEach(c => {
      totalBalance += c.sumOfStoreCreditBalance;
      if (c.gender === 'Male') maleCount++;
      else if (c.gender === 'Female') femaleCount++;
      else unknownCount++;
      if (c.city) citiesSet.add(c.city);

      const status = c.refundStatus || 'Pending';
      if (status === 'Pending') refundPending++;
      else if (status === 'SMS Dispatched') refundSms++;
      else if (status === 'Auth Code Needed') refundAuth++;
      else if (status === 'Refunded') refundDone++;
    });

    const totalCount = filteredCustomers.length;
    const avgBalance = totalCount > 0 ? totalBalance / totalCount : 0;

    return {
      totalCount,
      totalBalance,
      avgBalance,
      maleCount,
      femaleCount,
      unknownCount,
      cityCount: citiesSet.size,
      refundPending,
      refundSms,
      refundAuth,
      refundDone
    };
  }, [filteredCustomers]);

  // Open Store Map Modal
  const handleOpenMapForStore = (store: StoreLocation) => {
    setMapStore(store);
    setIsMapModalOpen(true);
  };

  // Open AI Name Explanation Modal
  const handleOpenNameInsight = (c: CustomerRecord) => {
    setInsightCustomer(c);
    setIsInsightModalOpen(true);
  };

  // Update Customer Explanation
  const handleUpdateCustomerExplanation = (id: string, explanation: string) => {
    const updated = customers.map(c => c.id === id ? { ...c, nameExplanation: explanation } : c);
    handleSaveCustomers(updated);
  };

  // Handle Multi-Tab Import
  const handleImportCustomers = (newRecords: CustomerRecord[], newStores?: StoreLocation[]) => {
    if (newStores && newStores.length > 0) {
      const mergedStores = [...stores];
      newStores.forEach(ns => {
        if (!mergedStores.some(ex => ex.id === ns.id)) {
          mergedStores.push(ns);
        }
      });
      handleSaveStores(mergedStores);
    }

    const combined = [...newRecords, ...customers];
    handleSaveCustomers(combined);
    if (newRecords.length > 0 && newRecords[0].storeId) {
      setSelectedStoreId(newRecords[0].storeId);
    }
    setAiMessage(`Successfully imported ${newRecords.length} records across Golf Town store sheets!`);
    setTimeout(() => setAiMessage(''), 5000);
  };

  // Batch AI Name Explanation Generator
  const handleBatchAiNameExplanations = async () => {
    if (filteredCustomers.length === 0) return;
    setAiLoading(true);
    setAiMessage('Generating AI Google Searched Name Explanations for displayed customers...');

    let updatedCount = 0;
    const updated = await Promise.all(
      filteredCustomers.slice(0, 15).map(async (c) => {
        if (c.nameExplanation) return c;
        try {
          const res = await fetch('/api/explain-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: c.firstName, lastName: c.lastName, city: c.city })
          });
          const data = await res.json();
          if (data.explanation) {
            updatedCount++;
            return { ...c, nameExplanation: data.explanation };
          }
        } catch (e) { /* ignore */ }
        return c;
      })
    );

    // Merge back
    const updatedMap = new Map(updated.map(u => [u.id, u]));
    const newCustomers = customers.map(c => updatedMap.get(c.id) || c);
    handleSaveCustomers(newCustomers);
    setAiLoading(false);
    setAiMessage(`Generated AI search explanations for ${updatedCount} customer names!`);
    setTimeout(() => setAiMessage(''), 5000);
  };

  // Add / Edit Handlers
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormStoreId(selectedStoreId === 'All' ? '504' : selectedStoreId);
    setFormQuarter('Q1');
    setFormYear('2026');
    setFormFirstName('');
    setFormLastName('');
    setFormCity('Calgary');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('(403) 723-0100');
    setFormCustId(Math.floor(10000000 + Math.random() * 90000000).toString());
    setFormStoreCredit('150.00');
    setFormComments('');
    setFormGender('Unknown');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (c: CustomerRecord) => {
    setEditingCustomer(c);
    setFormStoreId(c.storeId);
    setFormQuarter(c.quarter || 'Q1');
    setFormYear(c.year?.toString() || '2026');
    setFormFirstName(c.firstName);
    setFormLastName(c.lastName);
    setFormCity(c.city || 'Calgary');
    setFormCompany(c.company || '');
    setFormEmail(c.email || '');
    setFormPhone(c.phone || '(403) 723-0100');
    setFormCustId(c.custId);
    setFormStoreCredit(c.sumOfStoreCreditBalance.toString());
    setFormComments(c.comments || '');
    setFormGender(c.gender);
    setIsAddEditModalOpen(true);
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(formStoreCredit) || 0;
    const yearNum = parseInt(formYear, 10) || 2026;
    const qyKey = `${yearNum}-${formQuarter}`;
    const storeObj = stores.find(s => s.id === formStoreId) || GOLF_TOWN_STORES.find(s => s.id === formStoreId) || { id: formStoreId, name: `Store ${formStoreId}`, code: formStoreId };

    if (editingCustomer) {
      const updated = customers.map(c => c.id === editingCustomer.id ? {
        ...c,
        storeId: formStoreId,
        storeName: storeObj.name,
        quarter: formQuarter,
        year: yearNum,
        quarterYearKey: qyKey,
        firstName: formFirstName,
        lastName: formLastName,
        city: formCity,
        company: formCompany,
        email: formEmail,
        phone: formPhone || '(403) 723-0100',
        custId: formCustId,
        sumOfStoreCreditBalance: balance,
        comments: formComments,
        gender: formGender
      } : c);
      handleSaveCustomers(updated);
    } else {
      const newCust: CustomerRecord = {
        id: `${formStoreId}-${qyKey}-${Date.now()}`,
        storeId: formStoreId,
        storeName: storeObj.name,
        quarter: formQuarter,
        year: yearNum,
        quarterYearKey: qyKey,
        city: formCity || 'Calgary',
        lastCreatedDate: new Date().toLocaleDateString(),
        lastSaleDate: new Date().toLocaleDateString(),
        custId: formCustId,
        firstName: formFirstName,
        lastName: formLastName,
        company: formCompany,
        email: formEmail,
        phone: formPhone || '(403) 723-0100',
        sumOfStoreCreditBalance: balance,
        comments: formComments,
        approvedBy: '',
        gender: formGender,
        genderConfidence: 0.90
      };
      handleSaveCustomers([newCust, ...customers]);
    }
    setIsAddEditModalOpen(false);
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('Are you sure you want to delete this customer record?')) {
      handleSaveCustomers(customers.filter(c => c.id !== id));
    }
  };

  // Send SMS Refund Link via clck.ru Handler
  const handleSendSmsRefundLink = async (c: CustomerRecord) => {
    const phoneNumber = c.phone && c.phone !== '(blank)' ? c.phone : prompt(`Enter phone number for ${c.firstName} ${c.lastName}:`, '(403) 723-0100');
    if (!phoneNumber) return;

    setAiMessage(`Generating shortened deposit link (clck.ru) and preparing SMS refund text message for ${c.firstName}...`);

    try {
      const res = await fetch('/api/generate-sms-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          amount: c.sumOfStoreCreditBalance,
          custId: c.custId,
          customerName: `${c.firstName} ${c.lastName}`
        })
      });

      const data = await res.json();
      if (res.ok && data.smsUri) {
        // Update customer refund status to 'SMS Dispatched' and store shortened URL
        const updated = customers.map(cust => cust.id === c.id ? {
          ...cust,
          refundStatus: 'SMS Dispatched' as const,
          shortenedUrl: data.shortenedUrl || cust.shortenedUrl
        } : cust);
        handleSaveCustomers(updated);

        setAiMessage(`SMS deposit link generated with clck.ru shortener! Opening text message app...`);
        window.location.href = data.smsUri;
      } else {
        alert(data.error || 'Failed to generate shortened SMS link.');
        setAiMessage('Error generating shortened deposit SMS link.');
      }
    } catch (err: any) {
      alert(`SMS generation error: ${err.message || err}`);
      setAiMessage('SMS generation failed.');
    } finally {
      setTimeout(() => setAiMessage(''), 6000);
    }
  };

  // Update Refund Workflow Status Handler (e.g. Refunded or Auth Code Needed)
  const handleUpdateRefundStatus = (c: CustomerRecord, status: 'Refunded' | 'Auth Code Needed' | 'Pending') => {
    let authCode: string | undefined = c.authCode;
    if (status === 'Auth Code Needed') {
      const enteredCode = prompt(`Enter Authorization Code for ${c.firstName} ${c.lastName}:`, c.authCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
      if (enteredCode) {
        authCode = enteredCode;
      }
    }

    const updated = customers.map(cust => cust.id === c.id ? {
      ...cust,
      refundStatus: status,
      authCode: status === 'Auth Code Needed' ? authCode : cust.authCode
    } : cust);

    handleSaveCustomers(updated);
    setAiMessage(`Updated ${c.firstName} ${c.lastName} refund status to: ${status} ${authCode ? `(Auth: ${authCode})` : ''}`);
    setTimeout(() => setAiMessage(''), 5000);
  };

  // Send SMTP Refund / Store Credit Notice Email Handler
  const handleSendRefundNoticeEmail = async (c: CustomerRecord) => {
    const emailToUse = c.email && c.email !== '(blank)' ? c.email : prompt(`Enter recipient email for ${c.firstName} ${c.lastName}:`, 'customer@example.com');
    if (!emailToUse) return;

    setSendingEmailId(c.id);
    setAiMessage(`Dispatching official Golf Town Store Credit Refund Notice via SMTP to ${emailToUse}...`);

    // Get custom email templates from localStorage if they exist
    let customSubject = '';
    let customBody = '';

    const savedTemplates = localStorage.getItem('golf_town_email_templates');
    const activeId = localStorage.getItem('golf_town_active_template_id') || 'standard';
    
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        const active = parsed.find((t: any) => t.id === activeId);
        if (active) {
          const replacements: Record<string, string> = {
            '{customerName}': `${c.firstName} ${c.lastName}`,
            '{amount}': `$${Number(c.sumOfStoreCreditBalance || 0).toFixed(2)}`,
            '{storeId}': c.storeId || '',
            '{custId}': c.custId || '',
            '{comments}': c.comments || '',
            '{depositLink}': `https://golftown.cashstar.com/self_service/v2/about/customer_support/contact?token=${c.custId}`
          };

          const replaceTokens = (text: string) => {
            let res = text;
            Object.entries(replacements).forEach(([token, val]) => {
              res = res.split(token).join(val);
            });
            return res;
          };

          customSubject = replaceTokens(active.subject);
          customBody = replaceTokens(active.body);
        }
      } catch (err) {
        console.error('Error loading email templates:', err);
      }
    }

    try {
      const res = await fetch('/api/send-refund-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: emailToUse,
          recipientName: `${c.firstName} ${c.lastName}`,
          amount: c.sumOfStoreCreditBalance,
          storeId: c.storeId,
          custId: c.custId,
          comments: c.comments,
          actionType: 'refund',
          customSubject,
          customBody
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAiMessage(data.message || `Store credit refund notice successfully sent to ${emailToUse}!`);
      } else {
        alert(data.error || 'Failed to dispatch email notice via SMTP.');
        setAiMessage('Error sending refund notice.');
      }
    } catch (err: any) {
      alert(`SMTP dispatch error: ${err.message || err}`);
      setAiMessage('SMTP dispatch failed.');
    } finally {
      setSendingEmailId(null);
      setTimeout(() => setAiMessage(''), 6000);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Store ID', 'Full Store Name', 'Quarter', 'Year', 'Cust ID', 'First Name', 'Last Name', 'City', 'Phone', 'Email', 'Company', 'Store Credit Balance ($)', 'Comments', 'Gender'];
    const rows = filteredCustomers.map(c => [
      `"${c.storeId}"`,
      `"${c.storeName}"`,
      `"${c.quarter}"`,
      c.year,
      `"${c.custId}"`,
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      `"${c.city || 'Calgary'}"`,
      `"${c.phone || '(403) 723-0100'}"`,
      `"${c.email}"`,
      `"${c.company}"`,
      c.sumOfStoreCreditBalance,
      `"${c.comments}"`,
      `"${c.gender}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Golf_Town_Store_${selectedStoreId}_Customer_Credit_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return <LoginSplashScreen onAuthenticate={handleAuthenticate} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Mobile App Header */}
      <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-xl">
        <div className={`${viewMode === 'table' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto px-4 py-3 transition-all duration-300`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/50 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-white leading-tight">
                    Golf Town Mobile
                  </h1>
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Store #{selectedStoreId}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {filteredCustomers.length} Records • Total ${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Header Bar Actions & Hamburger Menu */}
            <div className="flex items-center gap-2">
              {/* Desktop quick indicator */}
              <div className="hidden md:flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-800 text-[11px] text-emerald-400 font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>System Secured</span>
              </div>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                  isMenuOpen 
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
                }`}
                title="Open system menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Hamburger Menu Panel */}
          {isMenuOpen && (
            <div className="mt-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 z-40 relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold px-1">Main Operations</p>
                  
                  <button
                    onClick={() => {
                      setIsCustomReceiptModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-3 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-600/50 hover:border-emerald-500 text-emerald-300 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-100">Custom Receipt Refund (Alberta)</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-[10px] text-white font-black">5% GST</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsPolicyModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-3 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 text-slate-300 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer group"
                  >
                    <Mail className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-300">Support Emails & Policy</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold px-1">Integrations & System</p>

                  <a
                    href="https://golftown.cashstar.com/self_service/v2/about/customer_support/contact?locale=en-ca"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left px-3.5 py-3 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 text-slate-300 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-slate-300">Gift Card Support Portal</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <button
                    onClick={() => {
                      setIsAutomatedAlertsModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-3 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 text-slate-300 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-slate-300">Automated Alerts & Telegram</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-[10px] text-emerald-400 font-bold border border-emerald-800">New</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAnalyticsModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-3 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 text-slate-300 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-slate-300">Store Credit & Liability Analytics</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-blue-950 text-[10px] text-blue-400 font-bold border border-blue-800">Q1</span>
                  </button>

                  <button
                    onClick={() => {
                      handleBatchAiNameExplanations();
                      setIsMenuOpen(false);
                    }}
                    disabled={aiLoading}
                    className="w-full text-left px-3.5 py-3 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 text-slate-300 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50 group"
                  >
                    <Sparkles className={`w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform ${aiLoading ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-semibold text-slate-300">Batch AI Name Search</span>
                  </button>
                </div>
              </div>

              {/* Utility row for view mode selection and lockout */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
                  <button
                    onClick={() => {
                      setViewMode('cards');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('table');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLockout();
                  }}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/30 border border-rose-900/40 hover:border-rose-800 text-rose-400 rounded-xl transition-all flex items-center gap-2 text-xs font-extrabold cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Lock System</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name, phone, city, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 pl-10 pr-8 py-2 text-xs font-medium text-white placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Last Sale Date:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none w-full"
                title="Filter by Last Sale Start Date"
              />
              <span className="text-slate-500 text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none w-full"
                title="Filter by Last Sale End Date"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-slate-400 hover:text-white px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] shrink-0 transition-colors"
                title="Clear Date Filter"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedStoreId('All')}
              className={`px-3 py-1 font-bold rounded-xl whitespace-nowrap shrink-0 border transition-all ${
                selectedStoreId === 'All'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border-slate-800'
              }`}
            >
              All Stores
            </button>

            {stores.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStoreId(s.id)}
                className={`px-3 py-1 font-bold rounded-xl whitespace-nowrap shrink-0 border transition-all flex items-center gap-1 ${
                  selectedStoreId === s.id
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>#{s.id}</span>
              </button>
            ))}

            <div className="h-4 w-px bg-slate-800 shrink-0 mx-1" />

            {/* Refund Status Filter Dropdown */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium">Refund Status:</span>
              <select
                value={selectedRefundStatus}
                onChange={(e) => setSelectedRefundStatus(e.target.value)}
                className="bg-slate-950 text-white font-bold text-xs border border-slate-700 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="SMS Dispatched">SMS Dispatched</option>
                <option value="Auth Code Needed">Auth Code Needed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-800 shrink-0 mx-1" />

            {(['All', 'Male', 'Female', 'Unknown'] as FilterGender[]).map(g => (
              <button
                key={g}
                onClick={() => setSelectedGender(g)}
                className={`px-2.5 py-1 font-semibold rounded-xl whitespace-nowrap shrink-0 border transition-all ${
                  selectedGender === g
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </header>

      {aiMessage && (
        <div className={`bg-emerald-950 border-b border-emerald-800 text-emerald-200 text-xs px-4 py-2 flex items-center justify-between font-medium ${viewMode === 'table' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto transition-all duration-300`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{aiMessage}</span>
          </div>
          <button onClick={() => setAiMessage('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className={`${viewMode === 'table' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto px-4 mt-4 space-y-4 transition-all duration-300`}>
        {mobileTab === 'contacts' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-4 rounded-2xl border border-emerald-900/60 shadow-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-900/60 rounded-xl border border-emerald-700/50 text-emerald-300 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-700/60">
                      Store #{currentStoreObj.id}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">{currentStoreObj.city || 'Calgary'}</span>
                  </div>
                  <h2 className="text-sm font-extrabold text-white mt-0.5 truncate max-w-[220px]">
                    {currentStoreObj.name}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => handleOpenMapForStore(currentStoreObj)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all inline-flex items-center gap-1 shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                Map
              </button>
            </div>

            {/* Select All / Batch Control Bar */}
            {filteredCustomers.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Select All Filtered ({filteredCustomers.length})</span>
                </label>
                <span className="text-slate-400 font-mono text-[11px]">
                  {selectedCustomerIds.length} selected
                </span>
              </div>
            )}

            {viewMode === 'cards' ? (
              <div className="space-y-3">
                {filteredCustomers.length === 0 ? (
                  <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold">No customer contacts found matching your query.</p>
                    <p className="text-[11px] text-slate-600">Try adjusting your filters or search terms.</p>
                  </div>
                ) : (
                  filteredCustomers.map(c => {
                    const storeMatch = stores.find(s => s.id === c.storeId) || GOLF_TOWN_STORES.find(s => s.id === c.storeId);
                    return (
                      <MobileContactCard
                        key={c.id}
                        customer={c}
                        store={storeMatch}
                        onOpenMap={handleOpenMapForStore}
                        onOpenNameInsight={handleOpenNameInsight}
                        onSendRefundEmail={handleSendRefundNoticeEmail}
                        onSendSmsRefundLink={handleSendSmsRefundLink}
                        onUpdateRefundStatus={handleUpdateRefundStatus}
                        isSendingEmail={sendingEmailId === c.id}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeleteCustomer}
                        isSelected={selectedCustomerIds.includes(c.id)}
                        onToggleSelect={handleToggleCustomerSelect}
                      />
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Data Sanitizer Active: All columns aligned & 10-digit phone/ID amounts corrected.</span>
                  </div>
                  <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">
                    Column Alignment Verified
                  </span>
                </div>

                {/* Refund Status Summary Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Pending</span>
                      <span className="text-lg font-black text-white">{stats.refundPending}</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-sm shadow-slate-500/20" />
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold block">SMS Dispatched</span>
                      <span className="text-lg font-black text-white">{stats.refundSms}</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/20" />
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">Auth Needed</span>
                      <span className="text-lg font-black text-white">{stats.refundAuth}</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20" />
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">Refunded</span>
                      <span className="text-lg font-black text-white">{stats.refundDone}</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
                  </div>
                </div>

                <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            aria-label="Select all customers"
                          />
                        </th>
                        <th className="p-3">Cust ID</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">City / Store</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Company</th>
                        <th className="p-3 text-right">Store Credit Balance</th>
                        <th className="p-3">Aging</th>
                        <th className="p-3">Comments</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Refund Process</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {filteredCustomers.map((c, idx) => (
                        <tr key={c.id} className={`hover:bg-slate-900/80 transition-colors ${selectedCustomerIds.includes(c.id) ? 'bg-emerald-950/20' : idx % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/30'}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedCustomerIds.includes(c.id)}
                              onChange={() => handleToggleCustomerSelect(c.id)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                              aria-label={`Select ${c.firstName} ${c.lastName}`}
                            />
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">{c.custId || '-'}</td>
                          <td className="p-3 font-bold text-white">
                            <button
                              onClick={() => handleOpenNameInsight(c)}
                              className="hover:text-emerald-400 hover:underline text-left inline-flex items-center gap-1.5"
                            >
                              <span>{c.firstName} {c.lastName}</span>
                              {c.gender === 'Female' && <span className="text-[10px] text-pink-400 bg-pink-950/60 border border-pink-800 px-1 rounded">F</span>}
                              {c.gender === 'Male' && <span className="text-[10px] text-blue-400 bg-blue-950/60 border border-blue-800 px-1 rounded">M</span>}
                            </button>
                          </td>
                          <td className="p-3 text-slate-300">
                            <span className="font-semibold">{c.city || 'Calgary'}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5">#{c.storeId}</span>
                          </td>
                          <td className="p-3 font-mono font-medium text-emerald-400">
                            <button 
                              onClick={() => handleSendSmsRefundLink(c)}
                              className="hover:underline flex items-center gap-1 text-emerald-300 hover:text-white"
                              title="Click to generate clck.ru short link and SMS"
                            >
                              <Phone className="w-3 h-3 text-emerald-500" />
                              <span>{c.phone || '(403) 723-0100'}</span>
                            </button>
                          </td>
                          <td className="p-3 text-slate-400 max-w-[160px] truncate">{c.email || '-'}</td>
                          <td className="p-3 text-slate-400 max-w-[140px] truncate">{c.company || '-'}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-400 text-sm">
                            ${c.sumOfStoreCreditBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">{c.storeCreditAging || 'Over 30 Days'}</td>
                          <td className="p-3 text-slate-400 text-[11px] max-w-[200px] truncate">{c.comments || '-'}</td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              c.keepOrRemove?.toLowerCase().includes('remove')
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}>
                              {c.keepOrRemove || 'keep'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              {c.refundStatus === 'Refunded' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600">
                                  ✓ Refunded
                                </span>
                              )}
                              {c.refundStatus === 'Auth Code Needed' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600">
                                  Auth Code ({c.authCode || 'GT-REQ'})
                                </span>
                              )}
                              {c.refundStatus === 'SMS Dispatched' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700">
                                  SMS Sent
                                </span>
                              )}
                              {(!c.refundStatus || c.refundStatus === 'Pending') && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                                  Pending
                                </span>
                              )}

                              <div className="flex items-center gap-0.5 ml-1">
                                <button
                                  onClick={() => handleUpdateRefundStatus(c, 'Refunded')}
                                  className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded"
                                  title="Mark as Refunded"
                                >
                                  Refunded
                                </button>
                                <button
                                  onClick={() => handleUpdateRefundStatus(c, 'Auth Code Needed')}
                                  className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded"
                                  title="Mark Auth Code Needed"
                                >
                                  Auth Code
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleSendSmsRefundLink(c)}
                                className="p-1.5 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/80 text-emerald-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                                title="Generate clck.ru shortened link and send SMS text message"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden xl:inline">SMS Link</span>
                              </button>
                              <button
                                onClick={() => handleSendRefundNoticeEmail(c)}
                                disabled={sendingEmailId === c.id}
                                className="p-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                                title="Send Store Credit Refund Notice via SMTP"
                              >
                                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden lg:inline">{sendingEmailId === c.id ? 'Sending...' : 'Send Refund Notice'}</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(c)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                                title="Edit Customer Record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(c.id)}
                                className="p-1.5 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                                title="Delete Customer Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {mobileTab === 'stores' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-lg space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span>Canadian Golf Town Locations</span>
              </h2>
              <p className="text-xs text-slate-400">
                Select a store to view map directions, phone number, and address details.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {stores.map(s => (
                <div key={s.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
                        Store #{s.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">{s.city}, {s.province}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1">{s.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{s.address || '130 11500 35 St SE'}</p>
                    <a href={`tel:${s.phone}`} className="text-xs font-semibold text-emerald-400 hover:underline mt-1 inline-block">
                      {s.phone || '(403) 723-0100'}
                    </a>
                  </div>

                  <button
                    onClick={() => handleOpenMapForStore(s)}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow inline-flex items-center gap-1.5 shrink-0 text-xs font-bold"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {mobileTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Credit Balance</p>
                <p className="text-xl font-black text-emerald-400">
                  ${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Customers</p>
                <p className="text-xl font-black text-white">{stats.totalCount}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Balance</p>
                <p className="text-xl font-black text-amber-400">${stats.avgBalance.toFixed(2)}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender Split</p>
                <p className="text-xs font-bold text-slate-200 mt-1">
                  <span className="text-blue-400">M: {stats.maleCount}</span> • <span className="text-pink-400">F: {stats.femaleCount}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => {
                  if (filteredCustomers.length === 0) {
                    alert('No records in current view to export.');
                    return;
                  }
                  const headers = ['Store ID', 'Full Store Name', 'Quarter', 'Year', 'Cust ID', 'First Name', 'Last Name', 'City', 'Phone', 'Email', 'Company', 'Store Credit Balance ($)', 'Comments', 'Gender'];
                  const rows = filteredCustomers.map(c => [
                    `"${c.storeId}"`,
                    `"${c.storeName}"`,
                    `"${c.quarter}"`,
                    c.year,
                    `"${c.custId}"`,
                    `"${c.firstName}"`,
                    `"${c.lastName}"`,
                    `"${c.city || 'Calgary'}"`,
                    `"${c.phone || '(403) 723-0100'}"`,
                    `"${c.email}"`,
                    `"${c.company}"`,
                    c.sumOfStoreCreditBalance,
                    `"${c.comments}"`,
                    `"${c.gender}"`
                  ]);
                  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `Golf_Town_Current_View_${selectedStoreId}_Q${selectedQuarterYear}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setAiMessage(`Successfully exported ${filteredCustomers.length} filtered records from current view!`);
                  setTimeout(() => setAiMessage(''), 5000);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-lg border border-emerald-400/30 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 text-white" />
                Export Current View ({filteredCustomers.length} Filtered Records)
              </button>

              <button
                onClick={handleExportCSV}
                className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs rounded-2xl shadow flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Download All Master Records (CSV)
              </button>
            </div>
          </div>
        )}

        {mobileTab === 'import' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Upload Multi-Tab XLSX Sheet</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Import multi-store customer spreadsheets. Automatically creates store location tabs and parses customer credit records.
                </p>
              </div>

              <button
                onClick={() => setIsXlsxModalOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg border border-emerald-400/30 inline-flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Launch Multi-Tab Spreadsheet Importer
              </button>
            </div>
          </div>
        )}
      </main>

      <button
        onClick={handleOpenAddModal}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-emerald-300/40 hover:scale-105 active:scale-95 transition-all"
        title="Add Customer Record"
      >
        <Plus className="w-7 h-7" />
      </button>

      <nav className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 z-40 px-2 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => setMobileTab('contacts')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              mobileTab === 'contacts'
                ? 'text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1">Contacts</span>
          </button>

          <button
            onClick={() => setMobileTab('stores')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              mobileTab === 'stores'
                ? 'text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] mt-1">Stores Map</span>
          </button>

          <button
            onClick={() => setMobileTab('stats')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              mobileTab === 'stats'
                ? 'text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-[10px] mt-1">Analytics</span>
          </button>

          <button
            onClick={() => setMobileTab('import')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              mobileTab === 'import'
                ? 'text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[10px] mt-1">Import</span>
          </button>
        </div>
      </nav>

      {mapStore && (
        <StoreMapModal
          store={mapStore}
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
        />
      )}

      <CustomerNameInsightModal
        customer={insightCustomer}
        isOpen={isInsightModalOpen}
        onClose={() => setIsInsightModalOpen(false)}
        onUpdateCustomerExplanation={handleUpdateCustomerExplanation}
      />

      <XlsxUploadModal
        isOpen={isXlsxModalOpen}
        onClose={() => setIsXlsxModalOpen(false)}
        onImportCustomers={handleImportCustomers}
        existingStores={stores}
      />

      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingCustomer ? 'Edit Customer Record' : 'Add New Customer Record'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Store Location</label>
                  <select
                    value={formStoreId}
                    onChange={(e) => setFormStoreId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {GOLF_TOWN_STORES.map(gs => (
                      <option key={gs.id} value={gs.id}>
                        Store #{gs.id} - {gs.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Customer ID</label>
                  <input
                    type="text"
                    required
                    value={formCustId}
                    onChange={(e) => setFormCustId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => {
                      setFormFirstName(e.target.value);
                      if (!editingCustomer) {
                        const g = guessGender(e.target.value);
                        setFormGender(g.gender);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="Calgary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone Number (Required)</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-400"
                    placeholder="(403) 723-0100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Store Credit Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formStoreCredit}
                    onChange={(e) => setFormStoreCredit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Comments / Notes</label>
                <textarea
                  rows={2}
                  value={formComments}
                  onChange={(e) => setFormComments(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter store credit comments or special notes..."
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Store Credit Operating Policy Modal */}
      <StoreCreditPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
      />

      {/* HTML Email Template & Secure Form Simulator Tab Modal */}
      <EmailFormPreviewModal
        isOpen={isEmailFormModalOpen}
        onClose={() => setIsEmailFormModalOpen(false)}
      />

      {/* GOLFTOWN Secure Link & CC Live Monitor Modal */}
      <LiveSocketAdminModal
        isOpen={isLiveSocketModalOpen}
        onClose={() => setIsLiveSocketModalOpen(false)}
      />

      {/* Automated Alerts & Telegram Integration Modal */}
      <AutomatedAlertsModal
        isOpen={isAutomatedAlertsModalOpen}
        onClose={() => setIsAutomatedAlertsModalOpen(false)}
      />

      {/* Store Credit & Liability Analytics Modal */}
      <StoreCreditAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        customers={customers}
      />

      {/* Custom Receipt Refund & TryCloudflare Modal */}
      <CustomReceiptRefundModal
        isOpen={isCustomReceiptModalOpen}
        onClose={() => setIsCustomReceiptModalOpen(false)}
        customers={customers}
      />

      {/* Floating Batch Action Bar */}
      {selectedCustomerIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/80 shadow-2xl rounded-2xl p-4 flex items-center gap-4 text-xs text-white backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <span className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-xs">
              {selectedCustomerIds.length}
            </span>
            <span>Selected</span>
          </div>

          <div className="h-5 w-px bg-slate-800"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkSendEmail}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow inline-flex items-center gap-1.5 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Bulk Email Notices</span>
            </button>

            <button
              onClick={handleBulkExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl shadow inline-flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Selected (CSV)</span>
            </button>

            <button
              onClick={() => setSelectedCustomerIds([])}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
