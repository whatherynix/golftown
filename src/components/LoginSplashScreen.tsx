import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, User, ArrowRight, AlertTriangle, Sparkles, Store } from 'lucide-react';

interface LoginSplashScreenProps {
  onAuthenticate: () => void;
}

export function LoginSplashScreen({ onAuthenticate }: LoginSplashScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    setTimeout(() => {
      // Validate credentials case-insensitive for username, exact or lower for convenience
      const validUser = username.trim().toLowerCase() === 'golftown';
      const validPass = password === 'Covid-19';

      if (validUser && validPass) {
        onAuthenticate();
      } else {
        setError('Invalid username or password. Please verify your credentials.');
        setIsSubmitting(false);
      }
    }, 400);
  };



  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 text-slate-100 backdrop-blur-xl">
        {/* Golf Town Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-inner">
            <Store className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
              Golf Town Canada
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-2">
            Store Credit Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Protected Enterprise Audit System • Authorized Personnel Only
          </p>
        </div>

        {/* Security Banner */}
        <div className="mb-6 p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-3 text-xs text-slate-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-slate-200">Restricted Access System</p>
            <p className="text-[11px] text-slate-400">Please enter your store credentials to continue.</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{isSubmitting ? 'Authenticating...' : 'Unlock Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>



        <div className="mt-6 text-center text-[10px] text-slate-500">
          Golf Town Store Credit Reconciliation & Alignment Engine • Confidential
        </div>
      </div>
    </div>
  );
}
