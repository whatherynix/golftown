export interface CustomerRecord {
  id: string;
  storeId: string; // e.g. "504"
  storeName: string; // e.g. "Store 504 - South Calgary Golf Town"
  quarter: string; // e.g. "Q1" or "Quarter 1 (2024)"
  year: number; // e.g. 2024
  quarterYearKey: string; // e.g. "2024-Q1"
  city?: string; // e.g. "Calgary", "Edmonton", "Okotoks", "Ottawa", "Toronto"
  lastCreatedDate: string;
  lastSaleDate: string;
  custId: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string; // Always shown
  sumOfStoreCreditBalance: number;
  comments: string;
  approvedBy: string;
  gender: 'Male' | 'Female' | 'Unknown';
  genderConfidence?: number;
  nameExplanation?: string;
  
  // Legacy / optional fields
  storeCreditAging?: string;
  keepOrRemove?: string;
  
  // Real-time Refund Workflow tracking
  refundStatus?: 'Pending' | 'SMS Dispatched' | 'Refunded' | 'Auth Code Needed';
  authCode?: string;
  shortenedUrl?: string;
}

export type FilterGender = 'All' | 'Male' | 'Female' | 'Unknown';

export interface StoreLocation {
  id: string; // Store number e.g. "504"
  name: string; // e.g. "Golf Town South Calgary"
  code: string; // "504"
  address?: string; // e.g. "130 11500 35 St SE"
  city?: string; // "Calgary"
  province?: string; // "AB"
  postalCode?: string; // "T2Z 3W4"
  phone?: string; // "(403) 723-0100"
  googleMapsUrl?: string; // Direct maps search or directions link
  lat?: number;
  lng?: number;
}
