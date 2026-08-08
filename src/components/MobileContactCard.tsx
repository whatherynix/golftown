import React, { useState } from 'react';
import { CustomerRecord, StoreLocation } from '../types';
import { 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  DollarSign, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Edit3, 
  Trash2, 
  Navigation, 
  Building2, 
  Calendar, 
  Tag, 
  MessageSquare,
  Copy,
  Check,
  Share2,
  Send,
  CheckCircle2,
  ShieldAlert,
  Link2,
  KeyRound
} from 'lucide-react';

interface MobileContactCardProps {
  customer: CustomerRecord;
  store?: StoreLocation;
  onOpenMap: (store: StoreLocation) => void;
  onOpenNameInsight: (customer: CustomerRecord) => void;
  onSendRefundEmail?: (customer: CustomerRecord) => void;
  onSendSmsRefundLink?: (customer: CustomerRecord) => void;
  onUpdateRefundStatus?: (customer: CustomerRecord, status: 'Refunded' | 'Auth Code Needed' | 'Pending') => void;
  isSendingEmail?: boolean;
  onEdit: (customer: CustomerRecord) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const MobileContactCard: React.FC<MobileContactCardProps> = ({
  customer,
  store,
  onOpenMap,
  onOpenNameInsight,
  onSendRefundEmail,
  onSendSmsRefundLink,
  onUpdateRefundStatus,
  isSendingEmail = false,
  onEdit,
  onDelete,
  isSelected = false,
  onToggleSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayStoreName = store 
    ? store.name 
    : customer.storeName || `Store #${customer.storeId}`;
  
  const displayCity = customer.city || store?.city || 'Calgary';
  const displayPhone = customer.phone || store?.phone || '(403) 723-0100';
  const displayEmail = customer.email && customer.email !== '(blank)' ? customer.email : 'No email listed';

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(displayPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStatus = customer.refundStatus || 'Pending';

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden shadow-lg ${
        isSelected
          ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/40'
          : isExpanded 
            ? 'bg-slate-900 border-emerald-500/80 ring-2 ring-emerald-500/30' 
            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* 
        COLLAPSED VIEW ORDER (STRICTLY REQUIRED BY USER):
        1. LOCATION
        2. PHONE NUMBER (Triggers SMS Deposit Link via clck.ru)
        3. NAME
        4. EMAIL
        5. AMOUNT
      */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* 1. LOCATION */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                if (onToggleSelect) onToggleSelect(customer.id);
              }}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              aria-label={`Select ${customer.firstName} ${customer.lastName}`}
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 text-emerald-300 rounded-full border border-emerald-800/60 text-xs font-bold">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[200px]">{displayCity} • #{customer.storeId} ({displayStoreName})</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden sm:inline">
              {isExpanded ? 'Tap to close' : 'Tap for details'}
            </span>
            <div className={`p-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-emerald-950 border-emerald-700 text-emerald-300' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Real-time Refund Processing Badge */}
        <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status:</span>
            {currentStatus === 'SMS Dispatched' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm animate-pulse">
                <Send className="w-3 h-3 text-emerald-400" />
                SMS Dispatched (clck.ru)
              </span>
            )}
            {currentStatus === 'Refunded' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-600">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ✓ REFUNDED
              </span>
            )}
            {currentStatus === 'Auth Code Needed' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-600">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                Auth Code Needed ({customer.authCode || 'GT-REQ'})
              </span>
            )}
            {currentStatus === 'Pending' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                Pending Action
              </span>
            )}
          </div>

          {customer.shortenedUrl && (
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              <Link2 className="w-3 h-3" />
              <span>{customer.shortenedUrl}</span>
            </div>
          )}
        </div>

        {/* 2. PHONE NUMBER - CLICKS GENERATE PRE-TYPED SMS LINK WITH clck.ru SHORTENED DEPOSIT URL */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSendSmsRefundLink) onSendSmsRefundLink(customer);
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 px-3.5 py-2 rounded-xl border border-emerald-800 transition-all shadow-md group"
            title="Click phone number to generate clck.ru shortened deposit URL and open pre-typed text message"
          >
            <Phone className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            <span>{displayPhone}</span>
            <span className="text-[10px] bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded font-mono ml-1">SMS Deposit</span>
          </button>

          <button
            onClick={handleCopyPhone}
            title="Copy Phone Number"
            className="p-2 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors inline-flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* 3. NAME */}
        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>{customer.firstName} {customer.lastName}</span>
            {customer.gender && (
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                customer.gender === 'Male' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                customer.gender === 'Female' ? 'bg-pink-950 text-pink-300 border border-pink-800' :
                'bg-slate-800 text-slate-400'
              }`}>
                {customer.gender}
              </span>
            )}
          </h3>
          {customer.company && customer.company !== '(blank)' && (
            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-500" />
              {customer.company}
            </p>
          )}
        </div>

        {/* 4. EMAIL */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <a
            href={customer.email && customer.email !== '(blank)' ? `mailto:${customer.email}` : undefined}
            onClick={(e) => e.stopPropagation()}
            className={`truncate max-w-full ${customer.email && customer.email !== '(blank)' ? 'hover:text-indigo-300 hover:underline' : 'text-slate-500 italic'}`}
          >
            {displayEmail}
          </a>
        </div>

        {/* 5. AMOUNT */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Store Credit Balance</span>
          <div className="inline-flex items-center gap-1 bg-emerald-950/90 text-emerald-300 px-3 py-1.5 rounded-xl font-black text-base border border-emerald-800 shadow-md">
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>${customer.sumOfStoreCreditBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Quick Processing Actions Toolbar */}
        {onUpdateRefundStatus && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onSendSmsRefundLink && onSendSmsRefundLink(customer)}
              className="flex-1 px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow"
              title="Generate clck.ru short link and open text message"
            >
              <Send className="w-3 h-3 text-emerald-400" />
              <span>SMS Link</span>
            </button>

            <button
              onClick={() => onUpdateRefundStatus(customer, 'Refunded')}
              className={`flex-1 px-2.5 py-1.5 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow border transition-colors ${
                currentStatus === 'Refunded' 
                  ? 'bg-emerald-600 text-white border-emerald-500' 
                  : 'bg-slate-900 hover:bg-emerald-950/80 text-slate-300 hover:text-emerald-300 border-slate-800 hover:border-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Refunded</span>
            </button>

            <button
              onClick={() => onUpdateRefundStatus(customer, 'Auth Code Needed')}
              className={`flex-1 px-2.5 py-1.5 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow border transition-colors ${
                currentStatus === 'Auth Code Needed' 
                  ? 'bg-amber-600 text-white border-amber-500' 
                  : 'bg-slate-900 hover:bg-amber-950/80 text-slate-300 hover:text-amber-300 border-slate-800 hover:border-amber-700'
              }`}
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Auth Code</span>
            </button>
          </div>
        )}
      </div>

      {/* 
        EXPANDED VIEW (WHEN CARD IS CLICKED - SHOW ALL INFO & DO BETTER)
      */}
      {isExpanded && (
        <div 
          className="border-t border-slate-800 bg-slate-950/95 p-4 sm:p-5 space-y-4 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer Details</span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
                ID: {customer.custId || 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Quarter & Year</span>
                <span className="font-semibold text-slate-200">{customer.quarter || 'Q1'} ({customer.year || 2026})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Last Active</span>
                <span className="font-semibold text-slate-200">{customer.lastSaleDate || '2026'}</span>
              </div>
            </div>
          </div>

          {/* AI Name Explanation / Etymology */}
          <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Name Background & Etymology</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNameInsight(customer);
                }}
                className="text-[11px] font-bold text-amber-300 hover:underline bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-700/60"
              >
                Expand Search
              </button>
            </div>
            <p className="text-xs text-indigo-200/90 italic leading-relaxed">
              {customer.nameExplanation || `AI analysis indicates "${customer.firstName}" is a classic name prominent in North American demographics.`}
            </p>
          </div>

          {/* Comments / Notes */}
          {customer.comments && (
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Comments & Store Credit Notes
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {customer.comments}
              </p>
            </div>
          )}

          {/* Store Location Map Direct Trigger */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">{displayStoreName}</span>
              <span className="text-[11px] text-slate-400 block">{store?.address || '130 11500 35 St SE, Calgary'}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (store) onOpenMap(store);
                else onOpenMap({
                  id: customer.storeId,
                  name: displayStoreName,
                  code: customer.storeId,
                  address: '130 11500 35 St SE',
                  city: displayCity
                });
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-1.5 shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" />
              View Map
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSendSmsRefundLink) onSendSmsRefundLink(customer);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Text clck.ru Link</span>
              </button>
              {onSendRefundEmail && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendRefundEmail(customer);
                  }}
                  disabled={isSendingEmail}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow"
                  title="Send Store Credit Refund Notice Email via SMTP"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isSendingEmail ? 'Sending Notice...' : 'Email Notice'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(customer);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 inline-flex items-center gap-1 text-xs font-semibold"
                title="Edit Customer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(customer.id);
                }}
                className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl border border-rose-800 inline-flex items-center gap-1 text-xs font-semibold"
                title="Delete Customer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
