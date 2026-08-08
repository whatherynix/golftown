import React from 'react';
import { StoreLocation } from '../types';
import { MapPin, Phone, Navigation, X, ExternalLink, Building2 } from 'lucide-react';

interface StoreMapModalProps {
  store: StoreLocation;
  isOpen: boolean;
  onClose: () => void;
}

export const StoreMapModal: React.FC<StoreMapModalProps> = ({ store, isOpen, onClose }) => {
  if (!isOpen) return null;

  const addressQuery = encodeURIComponent(`${store.name} ${store.address || ''} ${store.city || ''} ${store.province || ''}`);
  const mapsSearchUrl = store.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${addressQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-700/50 rounded-xl border border-emerald-500/30 text-emerald-200">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-emerald-300 uppercase bg-emerald-900/80 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                Golf Town Location #{store.code || store.id}
              </span>
              <h3 className="text-xl font-bold mt-1 text-white">{store.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Store Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Street Address</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {store.address || 'Location Address'}<br />
                  {store.city && `${store.city}, `}{store.province && `${store.province} `}{store.postalCode && store.postalCode}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <Phone className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Store Contact</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {store.phone ? (
                    <a href={`tel:${store.phone}`} className="text-emerald-700 hover:underline">
                      {store.phone}
                    </a>
                  ) : (
                    'Not specified'
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">Direct Pro Shop & Customer Service</p>
              </div>
            </div>
          </div>

          {/* Interactive Embedded Google Map */}
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 h-64 relative">
            <iframe
              title={`Map of ${store.name}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={embedMapsUrl}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Golf Town Canada Store #{store.code || store.id}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors"
            >
              Close
            </button>
            <a
              href={mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-md transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Open in Google Maps
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
