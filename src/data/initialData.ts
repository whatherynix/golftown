import { CustomerRecord, StoreLocation } from '../types';
import { STORE_504_CUSTOMERS } from './store504Data';
import { parseRowWithSmartAlignment, sanitizeCustomerRecords } from './dataSanitizer';

export const INITIAL_STORES: StoreLocation[] = [
  { id: '505', name: 'Store 505 - South Side Golf Town', code: '505' },
  { id: '504', name: 'Store 504 - South Calgary Golf Town', code: '504' },
];

export function guessGender(firstName: string): { gender: 'Male' | 'Female' | 'Unknown'; confidence: number } {
  if (!firstName) return { gender: 'Unknown', confidence: 0.5 };
  const clean = firstName.trim().toLowerCase();
  
  const femaleNames = [
    'carina', 'sandy', 'mary', 'jennifer', 'lisa', 'sarah', 'jessica', 'emily',
    'amanda', 'elizabeth', 'taylor', 'ashley', 'michelle', 'karen', 'linda',
    'patricia', 'barbara', 'susan', 'jess', 'rachel', 'ash', 'nicole', 'stephanie',
    'lauren', 'rebecca', 'kelly', 'kim', 'amy', 'angela', 'brenda', 'emma', 'donna',
    'ursula', 'agatha', 'kristen', 'colleen', 'janet', 'samantha', 'michelle', 'sylvia',
    'christene', 'judy', 'alyssa', 'sadie', 'jennifer', 'mareli', 'mary', 'donna',
    'roby', 'robyn', 'mijung', 'hollie', 'oriana', 'lana', 'melonie', 'jenna'
  ];

  const maleNames = [
    'mark', 'robert', 'aaron', 'rod', 'jim', 'peter', 'kevin', 'gurmeet',
    'ben', 'markus', 'michael', 'clay', 'chris', 'cam', 'grady', 'jack',
    'douglas', 'glen', 'bryce', 'raoul', 'eddie', 'ross', 'nguyen', 'john',
    'david', 'james', 'william', 'richard', 'thomas', 'charles', 'joseph',
    'daniel', 'paul', 'brian', 'ronald', 'anthony', 'jason', 'jeffrey',
    'ryan', 'gary', 'nicholas', 'eric', 'stephen', 'andrew', 'joshua', 'kenneth',
    'mervin', 'egbert', 'dexter', 'jeff', 'sam', 'angelo', 'jerry', 'josh',
    'brandan', 'ian', 'dean', 'greg', 'jance', 'scott', 'sean', 'alex', 'zack',
    'darcy', 'bryan', 'ming', 'jordan', 'manny', 'dan', 'ralph', 'derek',
    'darren', 'stan', 'randy', 'brent', 'phil', 'vernon', 'rolan', 'rick',
    'matt', 'devin', 'jamie', 'colleen', 'hyo', 'jacques', 'jimmy', 'kyoung',
    'cole', 'darin', 'sung', 'leo', 'john', 'darrell', 'kieran', 'marvin',
    'shan', 'emilio', 'casper', 'trevor', 'jae', 'navjit', 'lloyd', 'graydon',
    'rafe', 'steven', 'sandeep', 'linden', 'noah', 'bruce', 'darwin', 'graham',
    'mike', 'sejun', 'craig', 'wade', 'bernie', 'gordon', 'artie', 'doug',
    'brydon', 'steve', 'ken', 'tyler', 'wolf', 'luc', 'kelly', 'neil', 'brandon',
    'connor', 'shawn', 'blair', 'dale', 'herb', 'herb', 'travis', 'matthew',
    'taeryong', 'colby', 'toshi', 'colin', 'chad', 'terry', 'grant', 'seungwon',
    'jarrett', 'horace', 'logan', 'justin', 'brad', 'jacob', 'chris', 'raphael',
    'forest', 'jermey', 'josh', 'michel', 'tony', 'gord', 'parker', 'dulcie',
    'raj', 'jin', 'fabien', 'dave', 'robin', 'james', 'eli', 'jarred', 'nathan',
    'christian', 'stephane', 'thomas', 'amer', 'nelson', 'mike', 'kyle', 'harry'
  ];

  if (femaleNames.includes(clean)) {
    return { gender: 'Female', confidence: 0.95 };
  }
  if (maleNames.includes(clean)) {
    return { gender: 'Male', confidence: 0.95 };
  }

  if (['a', 'i', 'ine', 'elle', 'ia'].some(suffix => clean.endsWith(suffix)) && clean.length > 3) {
    if (['luca', 'elija', 'ezra', 'micah', 'dakota', 'mervin'].includes(clean)) {
      return { gender: 'Male', confidence: 0.70 };
    }
    return { gender: 'Female', confidence: 0.65 };
  }

  return { gender: 'Unknown', confidence: 0.40 };
}

// Raw store 505 dataset parsed across quarters
export const STORE_505_CUSTOMERS: CustomerRecord[] = [
  // --- 2026 Q2 ---
  { id: '505-2026-q2-1', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '1/1/2026', lastSaleDate: '1/1/2026', custId: '905014716', firstName: 'James', lastName: 'Mcdade', company: '', email: 'jamesrobertmcdade@gmail.com', phone: '7809352417', sumOfStoreCreditBalance: 209.98, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-2', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '1/17/2026', lastSaleDate: '1/17/2026', custId: '888033566', firstName: 'Douglas', lastName: 'Chonko', company: '', email: 'DCHONKO@SHAW.CA', phone: '7806372255', sumOfStoreCreditBalance: 15.57, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-3', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '2/9/2025', lastSaleDate: '2/9/2025', custId: '923004497', firstName: 'Chris', lastName: 'Lakusta', company: 'Alberta Honda', email: '', phone: '7804748595', sumOfStoreCreditBalance: 210.00, keepOrRemove: 'keep - corp', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.90 },
  { id: '505-2026-q2-4', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/20/2026', lastSaleDate: '3/20/2026', custId: '5109371', firstName: 'Robert', lastName: 'Sharpe', company: '', email: 'rsharpe2260@icloud.com', phone: '7806225646', sumOfStoreCreditBalance: 142.80, keepOrRemove: 'remove', comments: 'processed', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-5', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/25/2026', lastSaleDate: '3/25/2026', custId: '905007266', firstName: 'Matt', lastName: 'Adams', company: '', email: '', phone: '7808069329', sumOfStoreCreditBalance: 222.59, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-6', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '4/14/2026', lastSaleDate: '4/14/2026', custId: '888161466', firstName: 'Jim', lastName: 'Toller', company: '', email: 'JMTOLLER@SHAW.CA', phone: '7802351357', sumOfStoreCreditBalance: 73.50, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-7', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '4/25/2026', lastSaleDate: '4/25/2026', custId: '905011392', firstName: 'Mitchell', lastName: 'Adams', company: '', email: 'mitchelladams@me.com', phone: '7809919922', sumOfStoreCreditBalance: 2028.14, keepOrRemove: 'keep - corp', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-8', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '5/7/2026', lastSaleDate: '5/7/2026', custId: '905013912', firstName: 'Alyssa', lastName: 'Mahoney', company: '', email: 'alyssamariemahoney@icloud.com', phone: '7807772052', sumOfStoreCreditBalance: 1404.95, keepOrRemove: 'keep', comments: 'father gave 5k as gift', approvedBy: '', gender: 'Female', genderConfidence: 0.95 },
  { id: '505-2026-q2-9', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '5/13/2026', lastSaleDate: '5/13/2026', custId: '5107510', firstName: 'Taeryong', lastName: 'Park', company: '', email: 'PARKTAERYONG@GMAIL.COM', phone: '7807928806', sumOfStoreCreditBalance: 1003.66, keepOrRemove: 'keep - corp', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.90 },
  { id: '505-2026-q2-10', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '6/9/2026', lastSaleDate: '6/9/2026', custId: '18255014', firstName: 'Mike', lastName: 'Verhoski', company: '', email: 'mverhoski@morguard.com', phone: '7804241642', sumOfStoreCreditBalance: 5184.37, keepOrRemove: 'keep - corp', comments: 'most used', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-11', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '6/21/2026', lastSaleDate: '6/21/2026', custId: '505000681', firstName: 'Leo', lastName: 'Provencher', company: '', email: 'leo@titanhauling.com', phone: '7809919200', sumOfStoreCreditBalance: 44.11, keepOrRemove: 'keep - corp', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2026-q2-12', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '6/22/2026', lastSaleDate: '6/22/2026', custId: '905033460', firstName: 'Jin', lastName: 'Kim', company: '', email: 'jinbeom@ualberta.ca', phone: '7807818239', sumOfStoreCreditBalance: 157.58, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.90 },
  { id: '505-2026-q2-13', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q2', year: 2026, quarterYearKey: '2026-Q2', storeCreditAging: 'Over 30 Days', lastCreatedDate: '7/7/2026', lastSaleDate: '7/7/2026', custId: '905012216', firstName: 'Matthew', lastName: 'Leclaire', company: '', email: 'southedmonton@golftown.com', phone: '7808870557', sumOfStoreCreditBalance: 127.05, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },

  // --- 2024 Q1 (LO's initial provided block) ---
  { id: '505-2024-q1-1', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/9/2018', lastSaleDate: '4/12/2024', custId: '888817759', firstName: 'Mark', lastName: 'Edwards', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 799.99, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-2', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '1/28/2022', lastSaleDate: '3/2/2024', custId: '5109371', firstName: 'Robert', lastName: 'Sharpe', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 142.80, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-3', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/22/2022', lastSaleDate: '4/11/2024', custId: '541008587', firstName: 'Aaron', lastName: 'Gill', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 194.25, keepOrRemove: 'keep', comments: 'has not arrived', approvedBy: '', gender: 'Male', genderConfidence: 0.98 },
  { id: '505-2024-q1-4', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '4/20/2022', lastSaleDate: '4/17/2024', custId: '905008243', firstName: 'rod', lastName: 'silva', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 2320.42, keepOrRemove: 'keep', comments: '$209.99 remaining', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2024-q1-5', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/23/2023', lastSaleDate: '4/11/2024', custId: '23377696', firstName: 'Sandy', lastName: 'MACLELLAN', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 936.59, keepOrRemove: 'keep', comments: 'has not arrived', approvedBy: '', gender: 'Male', genderConfidence: 0.80 },
  { id: '505-2024-q1-6', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '7/2/2023', lastSaleDate: '1/20/2024', custId: '5090030', firstName: 'Jim', lastName: 'Nicholson', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 62.99, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-7', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '7/2/2023', lastSaleDate: '4/12/2024', custId: '905016893', firstName: 'Peter', lastName: 'Cho', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 737.21, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-8', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '7/7/2023', lastSaleDate: '4/14/2024', custId: '505001116', firstName: 'Kevin', lastName: 'Kennedy', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 680.27, keepOrRemove: 'keep', comments: 'has not arrived', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-9', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '8/21/2023', lastSaleDate: '4/3/2024', custId: '23378826', firstName: 'NGUYEN', lastName: 'PHAM', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 214.20, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Unknown', genderConfidence: 0.50 },
  { id: '505-2024-q1-10', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '11/2/2023', lastSaleDate: '4/4/2024', custId: '905022048', firstName: 'Gurmeet', lastName: 'Gurm', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 708.75, keepOrRemove: 'keep', comments: 'corp', approvedBy: '', gender: 'Male', genderConfidence: 0.85 },
  { id: '505-2024-q1-11', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '12/9/2023', lastSaleDate: '4/17/2024', custId: '905016658', firstName: 'Ben', lastName: 'Seinen', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 243.59, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-12', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '12/28/2023', lastSaleDate: '12/28/2023', custId: '905011670', firstName: 'Markus', lastName: 'Breitkreuz', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 1561.82, keepOrRemove: 'keep', comments: 'delay from callaway', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-13', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '2/12/2024', lastSaleDate: '4/15/2024', custId: '905028231', firstName: 'Michael', lastName: 'bottcher', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 1652.96, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-14', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '2/22/2024', lastSaleDate: '2/22/2024', custId: '553003409', firstName: 'Carina', lastName: 'Chan', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 1165.50, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Female', genderConfidence: 0.99 },
  { id: '505-2024-q1-15', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/5/2024', lastSaleDate: '3/5/2024', custId: '905021907', firstName: 'Clay', lastName: 'Subanovich', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 12.60, keepOrRemove: 'keep', comments: 'customer has credit from previous order', approvedBy: '', gender: 'Male', genderConfidence: 0.95 },
  { id: '505-2024-q1-16', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/9/2024', lastSaleDate: '3/9/2024', custId: '960008686', firstName: 'Mark', lastName: 'Klopoushak', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 629.99, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-17', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/13/2024', lastSaleDate: '3/13/2024', custId: '5103717', firstName: 'Chris', lastName: 'ible', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 839.99, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Male', genderConfidence: 0.85 },
  { id: '505-2024-q1-18', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/19/2024', lastSaleDate: '3/19/2024', custId: '905029277', firstName: 'Cam', lastName: 'Penner', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 413.16, keepOrRemove: 'no credit', comments: 'redeemed', approvedBy: '', gender: 'Male', genderConfidence: 0.90 },
  { id: '505-2024-q1-19', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/20/2024', lastSaleDate: '4/2/2024', custId: '888144955', firstName: 'GRADY', lastName: 'WALLACE', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 1094.60, keepOrRemove: 'keep', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-20', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'Over 30 Days', lastCreatedDate: '3/22/2024', lastSaleDate: '3/22/2024', custId: '905029739', firstName: 'jack', lastName: 'Born', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 1498.86, keepOrRemove: 'keep', comments: 'has not arrived', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-21', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'To be cleaned up', lastCreatedDate: '1/4/2023', lastSaleDate: '4/5/2024', custId: '888033566', firstName: 'Douglas', lastName: 'Chonko', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 0.01, keepOrRemove: 'TO BE REMOVED-PC', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-22', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'To be cleaned up', lastCreatedDate: '2/7/2024', lastSaleDate: '2/21/2024', custId: '905018330', firstName: 'Glen', lastName: 'Anderson', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 0.01, keepOrRemove: 'TO BE REMOVED-PC', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-23', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'To be cleaned up', lastCreatedDate: '2/12/2024', lastSaleDate: '3/20/2024', custId: '23382354', firstName: 'Bryce', lastName: 'pinto', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 0.01, keepOrRemove: 'TO BE REMOVED-PC', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-24', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'To be cleaned up', lastCreatedDate: '2/23/2024', lastSaleDate: '3/15/2024', custId: '50001066', firstName: 'Raoul', lastName: 'Bhardwaj', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 0.32, keepOrRemove: 'TO BE REMOVED-PC', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-25', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'To be cleaned up', lastCreatedDate: '2/29/2024', lastSaleDate: '2/29/2024', custId: '5078201', firstName: 'Eddie', lastName: 'Ronquillo', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 0.03, keepOrRemove: 'TO BE REMOVED-PC', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
  { id: '505-2024-q1-26', storeId: '505', storeName: 'Store 505 - South Side Golf Town', quarter: 'Q1', year: 2024, quarterYearKey: '2024-Q1', storeCreditAging: 'To be cleaned up', lastCreatedDate: '3/4/2024', lastSaleDate: '3/14/2024', custId: '905016830', firstName: 'Ross', lastName: 'Ridsdale', company: '(blank)', email: '(blank)', phone: '(blank)', sumOfStoreCreditBalance: 0.02, keepOrRemove: 'TO BE REMOVED-PC', comments: '', approvedBy: '', gender: 'Male', genderConfidence: 0.99 },
];

export const INITIAL_CUSTOMERS: CustomerRecord[] = sanitizeCustomerRecords([...STORE_505_CUSTOMERS, ...STORE_504_CUSTOMERS]);

// Helper to parse uploaded CSV for any store location
export function parseCSVData(csvText: string, defaultStoreId: string = '505', defaultStoreName: string = 'Store 505 - South Side Golf Town'): CustomerRecord[] {
  const lines = csvText.split('\n');
  const records: CustomerRecord[] = [];
  
  let currentQuarter = 'Q1';
  let currentYear = 2024;
  let currentQuarterYearKey = '2024-Q1';
  let colMap: Record<string, number> = {};

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Detect quarter section headers e.g. "Quarter 1 (2024)", "Quarter 2", "Quarter 3 (2025)"
    const quarterMatch = rawLine.match(/Quarter\s*(\d)\s*\(?(\d{4})?\)?/i);
    if (quarterMatch) {
      currentQuarter = `Q${quarterMatch[1]}`;
      if (quarterMatch[2]) {
        currentYear = parseInt(quarterMatch[2], 10);
      }
      currentQuarterYearKey = `${currentYear}-${currentQuarter}`;
      colMap = {};
      continue;
    }

    // Parse CSV line handling quotes
    const cols = parseCSVRow(rawLine);
    const parsed = parseRowWithSmartAlignment(cols, colMap, 'Calgary');

    if (parsed.isHeader && parsed.newColIndexes) {
      colMap = parsed.newColIndexes;
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
      keepOrRemove,
      createdDate,
      saleDate,
      aging
    } = parsed.parsedFields;

    if (!firstName && !lastName && !rawCustId) continue;

    const guessed = guessGender(firstName);

    records.push({
      id: `${defaultStoreId}-${currentQuarterYearKey}-${records.length + 1}-${Math.random().toString(36).substr(2, 4)}`,
      storeId: defaultStoreId,
      storeName: defaultStoreName,
      quarter: currentQuarter,
      year: currentYear,
      quarterYearKey: currentQuarterYearKey,
      city: city || 'Calgary',
      storeCreditAging: aging || 'Over 30 Days',
      lastCreatedDate: createdDate,
      lastSaleDate: saleDate,
      custId: rawCustId,
      firstName,
      lastName,
      company: company || '',
      email: email || '',
      phone: phone || '(403) 723-0100',
      sumOfStoreCreditBalance: balanceNum,
      keepOrRemove: keepOrRemove || 'keep',
      comments: comments || '',
      approvedBy: '',
      gender: guessed.gender,
      genderConfidence: guessed.confidence
    });
  }

  return sanitizeCustomerRecords(records);
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
