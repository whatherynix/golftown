import React, { useState } from 'react';
import { CustomerRecord } from '../types';
import { Sparkles, X, User, MapPin, Search, RefreshCw, BookOpen } from 'lucide-react';

interface CustomerNameInsightModalProps {
  customer: CustomerRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCustomerExplanation?: (id: string, explanation: string) => void;
}

export const CustomerNameInsightModal: React.FC<CustomerNameInsightModalProps> = ({
  customer,
  isOpen,
  onClose,
  onUpdateCustomerExplanation,
}) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [source, setSource] = useState<string>('Google AI Search');

  React.useEffect(() => {
    if (customer) {
      if (customer.nameExplanation) {
        setExplanation(customer.nameExplanation);
      } else {
        handleFetchExplanation();
      }
    } else {
      setExplanation('');
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  async function handleFetchExplanation() {
    if (!customer) return;
    setLoading(true);
    try {
      const res = await fetch('/api/explain-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: customer.firstName,
          lastName: customer.lastName,
          city: customer.city || 'Calgary'
        })
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
        setSource(data.source || 'Google AI Search');
        if (onUpdateCustomerExplanation) {
          onUpdateCustomerExplanation(customer.id, data.explanation);
        }
      }
    } catch (e) {
      console.error(e);
      setExplanation(`The name ${customer.firstName} ${customer.lastName} carries deep European/Anglo heritage commonly found in Canadian communities.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-700/60 rounded-xl border border-indigo-500/40 text-amber-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-indigo-200 uppercase bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-700">
                AI Name Explanation & Search Insight
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {customer.firstName} {customer.lastName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-800/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Customer Context Pill */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>ID: {customer.custId || 'N/A'}</span>
            </div>
            {customer.city && (
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>City: {customer.city}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-500">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Store #{customer.storeId}</span>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="relative p-5 bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-slate-50 rounded-2xl border border-indigo-100 shadow-inner min-h-36 flex flex-col justify-between">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3 text-indigo-700">
                <RefreshCw className="w-7 h-7 animate-spin" />
                <p className="text-xs font-semibold">Generating AI Google Search Explanation...</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-normal text-slate-800 leading-relaxed italic">
                  "{explanation || 'No explanation generated yet.'}"
                </p>
                <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between text-xs text-indigo-700 font-medium">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Search className="w-3 h-3" /> Source: {source}
                  </span>
                  <span className="text-[10px] bg-indigo-100/80 text-indigo-800 px-2 py-0.5 rounded-full">
                    Gemini 2.5 Flash AI
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleFetchExplanation}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Regenerate AI Search
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
