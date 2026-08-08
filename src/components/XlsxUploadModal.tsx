import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { CustomerRecord, StoreLocation } from '../types';
import { GOLF_TOWN_STORES, findGolfTownStore } from '../data/golfTownStores';
import { guessGender } from '../data/initialData';
import { parseRowWithSmartAlignment, sanitizeCustomerRecord } from '../data/dataSanitizer';
import { Upload, FileSpreadsheet, Check, MapPin, Store, AlertCircle, X, ChevronRight, Sparkles } from 'lucide-react';

interface SheetParsedData {
  sheetName: string;
  detectedStoreId: string;
  detectedStoreName: string;
  records: CustomerRecord[];
  selected: boolean;
  totalBalance: number;
}

interface XlsxUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCustomers: (newRecords: CustomerRecord[], newStores?: StoreLocation[]) => void;
  existingStores: StoreLocation[];
}

export const XlsxUploadModal: React.FC<XlsxUploadModalProps> = ({
  isOpen,
  onClose,
  onImportCustomers,
  existingStores,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedSheets, setParsedSheets] = useState<SheetParsedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    await processWorkbook(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      await processWorkbook(selectedFile);
    }
  };

  const processWorkbook = async (fileToProcess: File) => {
    setLoading(true);
    try {
      const arrayBuffer = await fileToProcess.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheetResults: SheetParsedData[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) continue;

        // Auto-detect store from sheet name or text in first 10 rows
        let matchedStore = findGolfTownStore(sheetName);
        if (!matchedStore) {
          const topText = rows.slice(0, 10).flatMap(r => r).join(' ');
          matchedStore = findGolfTownStore(topText);
        }

        const storeId = matchedStore ? matchedStore.id : '504';
        const storeName = matchedStore ? matchedStore.name : `Store ${storeId} - Golf Town Location`;
        const storeCity = matchedStore ? matchedStore.city : 'Calgary';

        // Parse customer rows dynamically across all sections of the sheet
        const records: CustomerRecord[] = [];
        let currentColIndexes: Record<string, number> = {};

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const parsed = parseRowWithSmartAlignment(row, currentColIndexes, storeCity);

          if (parsed.isHeader && parsed.newColIndexes) {
            currentColIndexes = parsed.newColIndexes;
            continue;
          }

          if (!parsed.parsedFields) continue;

          const {
            rawCustId,
            firstName,
            lastName,
            company,
            email,
            phone,
            city,
            balanceNum,
            comments,
            createdDate,
            saleDate
          } = parsed.parsedFields;

          if (!firstName && !lastName && !rawCustId) continue;

          const genderData = guessGender(firstName);

          const uncleanedRecord: CustomerRecord = {
            id: `import-${storeId}-${records.length + 1}-${Math.random().toString(36).substr(2, 5)}`,
            storeId,
            storeName,
            quarter: 'Q1',
            year: 2026,
            quarterYearKey: '2026-Q1',
            city: city || storeCity || 'Calgary',
            lastCreatedDate: createdDate || new Date().toLocaleDateString(),
            lastSaleDate: saleDate || new Date().toLocaleDateString(),
            custId: rawCustId || `CUST-${Math.floor(10000000 + Math.random() * 90000000)}`,
            firstName,
            lastName,
            company,
            email,
            phone: phone || '(403) 723-0100',
            sumOfStoreCreditBalance: balanceNum,
            comments,
            approvedBy: '',
            gender: genderData.gender,
            genderConfidence: genderData.confidence
          };

          const cleanRecord = sanitizeCustomerRecord(uncleanedRecord);
          records.push(cleanRecord);
        }

        const totalBalance = records.reduce((sum, r) => sum + r.sumOfStoreCreditBalance, 0);

        sheetResults.push({
          sheetName,
          detectedStoreId: storeId,
          detectedStoreName: storeName,
          records,
          selected: true,
          totalBalance
        });
      }

      setParsedSheets(sheetResults);
      setActiveTabIdx(0);
    } catch (err) {
      console.error('Error parsing XLSX workbook:', err);
      alert('Failed to parse multi-tab XLSX file. Please verify the file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChangeForSheet = (sheetIndex: number, newStoreId: string) => {
    const store = GOLF_TOWN_STORES.find(s => s.id === newStoreId);
    if (!store) return;

    setParsedSheets(prev => prev.map((sheet, idx) => {
      if (idx !== sheetIndex) return sheet;
      const updatedRecords = sheet.records.map(r => ({
        ...r,
        storeId: store.id,
        storeName: store.name,
        city: store.city || r.city
      }));
      return {
        ...sheet,
        detectedStoreId: store.id,
        detectedStoreName: store.name,
        records: updatedRecords
      };
    }));
  };

  const toggleSheetSelected = (sheetIndex: number) => {
    setParsedSheets(prev => prev.map((s, idx) => idx === sheetIndex ? { ...s, selected: !s.selected } : s));
  };

  const handleConfirmImport = () => {
    const selectedSheets = parsedSheets.filter(s => s.selected);
    const allRecordsToImport = selectedSheets.flatMap(s => s.records);

    if (allRecordsToImport.length === 0) {
      alert('No records selected for import.');
      return;
    }

    // Collect stores that might need adding
    const newStoresToAdd: StoreLocation[] = [];
    selectedSheets.forEach(s => {
      const match = GOLF_TOWN_STORES.find(gs => gs.id === s.detectedStoreId);
      if (match && !existingStores.some(ex => ex.id === match.id)) {
        newStoresToAdd.push(match);
      }
    });

    onImportCustomers(allRecordsToImport, newStoresToAdd);
    onClose();
  };

  const activeSheet = parsedSheets[activeTabIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-700/50 rounded-xl border border-emerald-500/30 text-emerald-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-emerald-300 uppercase bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700">
                Multi-Tab XLSX Store Import
              </span>
              <h3 className="text-xl font-bold mt-1 text-white">Import Golf Town Excel Workbook</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* File Upload Zone */}
          {!file || parsedSheets.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4"
            >
              <div className="p-4 bg-emerald-100/80 text-emerald-800 rounded-2xl shadow-sm">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">
                  Drag & Drop Multi-Tab XLSX or Click to Browse
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .xlsx, .xls, .csv files containing multiple Golf Town store tabs
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="xlsx-file-input"
              />
              <label
                htmlFor="xlsx-file-input"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                Select Excel File
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      Found {parsedSheets.length} sheet tabs • {parsedSheets.reduce((sum, s) => sum + s.records.length, 0)} total records
                    </p>
                  </div>
                </div>
                <label
                  htmlFor="xlsx-file-input-change"
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Change File
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="xlsx-file-input-change"
                  />
                </label>
              </div>

              {/* Sheet Tabs Navigation */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                {parsedSheets.map((s, idx) => (
                  <button
                    key={s.sheetName}
                    onClick={() => setActiveTabIdx(idx)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all border whitespace-nowrap ${
                      activeTabIdx === idx
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSheetSelected(idx);
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{s.sheetName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200/80 text-slate-800 font-bold">
                      {s.records.length} recs
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Sheet Details & Store Assignment */}
              {activeSheet && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-emerald-800" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                          Auto-Detected Store Location for "{activeSheet.sheetName}"
                        </p>
                        <p className="text-sm font-bold text-emerald-950 mt-0.5">
                          {activeSheet.detectedStoreName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600">Assign Store Number:</label>
                      <select
                        value={activeSheet.detectedStoreId}
                        onChange={(e) => handleStoreChangeForSheet(activeTabIdx, e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {GOLF_TOWN_STORES.map(gs => (
                          <option key={gs.id} value={gs.id}>
                            Store #{gs.id} - {gs.name} ({gs.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Customer Record Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Previewing {activeSheet.records.length} Customer Records
                      </span>
                      <span className="text-xs font-semibold text-emerald-800">
                        Total Balance: ${activeSheet.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="p-2.5">Cust ID</th>
                            <th className="p-2.5">Name</th>
                            <th className="p-2.5">City</th>
                            <th className="p-2.5">Phone</th>
                            <th className="p-2.5">Email / Company</th>
                            <th className="p-2.5 text-right">Credit Balance</th>
                            <th className="p-2.5">Comments</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {activeSheet.records.slice(0, 50).map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/80">
                              <td className="p-2.5 font-mono text-slate-600">{r.custId}</td>
                              <td className="p-2.5 font-semibold">{r.firstName} {r.lastName}</td>
                              <td className="p-2.5 text-slate-600">{r.city || 'Calgary'}</td>
                              <td className="p-2.5 font-medium text-emerald-800">{r.phone || '(403) 723-0100'}</td>
                              <td className="p-2.5 text-slate-500">{r.email || r.company || '-'}</td>
                              <td className="p-2.5 text-right font-bold text-slate-900">
                                ${r.sumOfStoreCreditBalance.toFixed(2)}
                              </td>
                              <td className="p-2.5 text-slate-500 max-w-xs truncate">{r.comments || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {parsedSheets.filter(s => s.selected).length} sheets selected for import
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedSheets.length === 0 || !parsedSheets.some(s => s.selected)}
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Import All Selected Tabs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
