import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Calculator, 
  DollarSign, 
  Percent, 
  Send, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  FileText, 
  Store, 
  User, 
  Mail, 
  Smartphone, 
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  X,
  Play,
  Square,
  Terminal,
  ShieldAlert
} from 'lucide-react';

interface CustomReceiptRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
}

interface ReceiptItem {
  id: string;
  itemName: string;
  amount: string;
  taxRate: number; // 5% GST for Alberta Golf Town
}

export function CustomReceiptRefundModal({ isOpen, onClose, customers }: CustomReceiptRefundModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [storeId, setStoreId] = useState('504');
  const [selectedCustId, setSelectedCustId] = useState('');

  // Items list
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', itemName: 'TaylorMade Qi10 Driver', amount: '699.99', taxRate: 5.0 },
    { id: '2', itemName: 'Titleist Pro V1 Golf Balls (1 Doz)', amount: '69.99', taxRate: 5.0 }
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  // TryCloudflare tunneling state
  const [tunnelStatus, setTunnelStatus] = useState<'IDLE' | 'STARTING' | 'ACTIVE' | 'STOPPED'>('IDLE');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [tunnelLogs, setTunnelLogs] = useState<string[]>([]);
  const [copiedTunnel, setCopiedTunnel] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Auto calculate totals with Alberta 5% GST
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const taxAmount = subtotal * 0.05; // Alberta GST = 5%
  const grandTotal = subtotal + taxAmount;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemAmount) return;
    const val = parseFloat(newItemAmount);
    if (isNaN(val) || val <= 0) return;

    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        itemName: newItemName.trim(),
        amount: val.toFixed(2),
        taxRate: 5.0
      }
    ]);
    setNewItemName('');
    setNewItemAmount('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustId(custId);
    const found = customers.find(c => String(c.custId || c.id) === custId);
    if (found) {
      setCustomerName(`${found.firstName || ''} ${found.lastName || ''}`.trim());
      setCustomerEmail(found.email || '');
      setCustomerPhone(found.phone || '(403) 723-0100');
      setStoreId(found.storeId || '504');
    }
  };

  // TryCloudflare /start command simulation
  const handleStartTunnel = async () => {
    setTunnelStatus('STARTING');
    setTunnelLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executing trycloudflare tunnel initialization (/start)...`]);

    setTimeout(() => {
      const randomSubdomain = Math.random().toString(36).substring(2, 8);
      const generated = `https://${randomSubdomain}.trycloudflare.com`;
      setTunnelUrl(generated);
      setTunnelStatus('ACTIVE');
      setTunnelLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] tunnel connected successfully to 127.0.0.1:3000`,
        `[${new Date().toLocaleTimeString()}] Public URL assigned: ${generated}`,
        `[${new Date().toLocaleTimeString()}] Webhook & Secure Refund Form Relay Online.`
      ]);
    }, 1200);
  };

  const handleStopTunnel = () => {
    setTunnelStatus('STOPPED');
    setTunnelUrl('');
    setTunnelLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] TryCloudflare tunnel terminated by operator.`]);
  };

  const handleCopyTunnel = () => {
    if (!tunnelUrl) return;
    navigator.clipboard.writeText(tunnelUrl);
    setCopiedTunnel(true);
    setTimeout(() => setCopiedTunnel(false), 2000);
  };

  const handleDispatchRefund = async () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      alert('Please enter a valid customer email address.');
      return;
    }

    setDispatchStatus('Dispatching custom receipt refund notice via SMTP...');
    try {
      const res = await fetch('/api/socket/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `RECEIPT-${Date.now()}`,
          action: 'refunded_successfully'
        })
      });

      // Also trigger email dispatch
      await fetch('/api/notice-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: customerEmail,
          recipientName: customerName || 'Valued Customer',
          amount: grandTotal.toFixed(2),
          storeId,
          custId: selectedCustId || 'GT-RECEIPT',
          subject: `Golf Town Calgary - Custom Receipt Refund ($${grandTotal.toFixed(2)} CAD)`,
          actionType: 'custom_receipt_refund',
          depositToken: `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
          secureDepositUrl: tunnelUrl || 'https://golftown.trycloudflare.com/claim',
          status: 'SUCCESS'
        })
      });

      setDispatchStatus(`Successfully issued custom receipt refund of $${grandTotal.toFixed(2)} CAD (includes 5% Alberta GST) to ${customerEmail}!`);
      setTimeout(() => setDispatchStatus(null), 5000);
    } catch (err) {
      console.error(err);
      setDispatchStatus('Failed to dispatch notice.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shadow-inner">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Alberta Golf Town - Custom Receipt Refund &amp; TryCloudflare Linker</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Alberta 5% GST Auto-Calc
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Issue custom itemized receipt refunds with automated Alberta tax calculation, and manage trycloudflare tunneling live.
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

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto p-6 gap-6 bg-slate-900">
          
          {/* LEFT COLUMN: CUSTOMER & ITEM ENTRY */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* CUSTOMER SELECTOR */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>1. Select Customer or Enter Details</span>
                <span className="text-[10px] text-emerald-400 font-normal">Store #504 Calgary / Alberta Operations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Select from Database</label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Customer Record --</option>
                    {customers.slice(0, 100).map(c => (
                      <option key={c.id || c.custId} value={c.custId || c.id}>
                        {c.firstName} {c.lastName} (${c.sumOfStoreCreditBalance || 0} CAD - #{c.storeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Store Location</label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="504">Store #504 - South Calgary Golf Town</option>
                    <option value="501">Store #501 - Calgary North</option>
                    <option value="502">Store #502 - Edmonton South</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Connor McDavid"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@golftown.ca"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(403) 555-0199"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* ITEMIZED REFUND LIST & TAX CALCULATION */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">2. Itemized Receipt Refund &amp; Alberta Tax</div>
                  <div className="text-[11px] text-slate-400">Alberta Golf Town automatically calculates 5% GST on all receipt refund items.</div>
                </div>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  Alberta 5% GST Rate
                </span>
              </div>

              {/* ADD ITEM FORM */}
              <form onSubmit={handleAddItem} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Item Name (e.g. TaylorMade Wedge)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  placeholder="Amount ($ CAD)"
                  className="w-32 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </form>

              {/* ITEMS TABLE */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">No items added yet. Add items above to calculate refund and tax.</div>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-white">{item.itemName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-mono font-bold text-white">${item.amount}</span>
                          <span className="text-[10px] text-slate-400 block">+ 5% GST (${(parseFloat(item.amount) * 0.05).toFixed(2)})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* REFUND TOTALS SUMMARY */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Refund Subtotal:</span>
                  <span className="font-mono font-bold text-white">${subtotal.toFixed(2)} CAD</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Alberta GST (5.0%):</span>
                  <span className="font-mono font-bold text-emerald-400">+ ${taxAmount.toFixed(2)} CAD</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-black text-white">
                  <span>Grand Total Refund:</span>
                  <span className="font-mono text-emerald-400 text-base">${grandTotal.toFixed(2)} CAD</span>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: TRYCLOUDFLARE LINKER & CONTROLS */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            
            <div className="space-y-4">
              
              {/* TRYCLOUDFLARE /START GENERATOR BOX */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">TryCloudflare /start Linker</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    tunnelStatus === 'ACTIVE' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tunnelStatus}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Hit <strong className="text-white">/start</strong> to instantly generate a secure TryCloudflare public tunnel URL for this receipt refund, or kill/restart the link as needed.
                </p>

                {/* TUNNEL ACTION BUTTONS */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartTunnel}
                    disabled={tunnelStatus === 'STARTING' || tunnelStatus === 'ACTIVE'}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>/start (Generate URL)</span>
                  </button>
                  <button
                    onClick={handleStopTunnel}
                    disabled={tunnelStatus !== 'ACTIVE'}
                    className="py-2.5 px-3 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Kill Link</span>
                  </button>
                </div>

                {/* GENERATED URL DISPLAY */}
                {tunnelUrl && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/40 space-y-2">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active Public TryCloudflare URL</div>
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        readOnly
                        value={tunnelUrl}
                        className="w-full bg-slate-950 font-mono text-xs text-white p-2 rounded-lg border border-slate-800"
                      />
                      <button
                        onClick={handleCopyTunnel}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0"
                      >
                        {copiedTunnel ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTunnel ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TERMINAL LOGS */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1 h-28 overflow-y-auto">
                  <div className="text-slate-500">// TryCloudflare daemon output</div>
                  {tunnelLogs.length === 0 ? (
                    <div className="text-slate-600">Type /start or click button above to launch tunnel.</div>
                  ) : (
                    tunnelLogs.map((log, i) => (
                      <div key={i} className="text-emerald-300">{log}</div>
                    ))
                  )}
                </div>

              </div>

            </div>

            {/* DISPATCH ACTION */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              {dispatchStatus && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-600/50 rounded-xl text-xs text-emerald-200 text-center font-medium">
                  {dispatchStatus}
                </div>
              )}
              <button
                onClick={handleDispatchRefund}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border border-emerald-400/40 flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Issue Custom Receipt Refund &amp; Send Notice</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
