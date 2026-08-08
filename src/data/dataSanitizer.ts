import { CustomerRecord } from '../types';

/**
 * Checks if a row array represents a table header row in a spreadsheet.
 */
export function isHeaderRow(row: any[]): boolean {
  if (!row || row.length === 0) return false;
  const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
  const headerKeywords = ['cust', 'first', 'last', 'balance', 'credit', 'phone', 'email', 'aging', 'sale', 'created'];
  let matches = 0;
  for (const kw of headerKeywords) {
    if (rowStr.includes(kw)) matches++;
  }
  return matches >= 2;
}

/**
 * Extracts column index mappings from a header row.
 */
export function extractColIndexes(row: any[]): Record<string, number> {
  const colIndexes: Record<string, number> = {};
  row.forEach((cell: any, cIdx: number) => {
    const str = String(cell || '').toLowerCase().trim();
    if (str.includes('cust_id') || str.includes('cust id') || str.includes('customer id')) {
      colIndexes['custId'] = cIdx;
    } else if (str.includes('first') || str.includes('f_name')) {
      colIndexes['firstName'] = cIdx;
    } else if (str.includes('last') || str.includes('l_name')) {
      colIndexes['lastName'] = cIdx;
    } else if (str.includes('company')) {
      colIndexes['company'] = cIdx;
    } else if (str.includes('email')) {
      colIndexes['email'] = cIdx;
    } else if (str.includes('phone') || str.includes('tel')) {
      colIndexes['phone'] = cIdx;
    } else if (str.includes('city') || str.includes('town')) {
      colIndexes['city'] = cIdx;
    } else if (str.includes('balance') || str.includes('credit') || str.includes('sum of store credit')) {
      colIndexes['balance'] = cIdx;
    } else if (str.includes('comment') || str.includes('notes')) {
      colIndexes['comments'] = cIdx;
    } else if (str.includes('keep or remove') || str.includes('keep')) {
      colIndexes['keepOrRemove'] = cIdx;
    } else if (str.includes('created')) {
      colIndexes['createdDate'] = cIdx;
    } else if (str.includes('sale')) {
      colIndexes['saleDate'] = cIdx;
    } else if (str.includes('aging')) {
      colIndexes['aging'] = cIdx;
    }
  });
  return colIndexes;
}

/**
 * Cleans individual CustomerRecord to ensure no phone numbers or Cust IDs are mistaken for balance.
 */
export function sanitizeCustomerRecord(record: CustomerRecord): CustomerRecord {
  let balance = record.sumOfStoreCreditBalance;
  let phone = record.phone || '';
  let custId = record.custId || '';

  // If balance is in the millions (> $50,000), it's almost certainly a phone number or customer ID!
  if (balance > 50000 || (balance > 10000 && Number.isInteger(balance))) {
    const balIntStr = String(Math.round(balance));

    // Case A: 10-digit Phone Number (e.g. 5878999094 or 4038759458)
    if (balIntStr.length === 10) {
      if (!phone || phone === '(403) 723-0100' || phone === '(blank)' || !/\d/.test(phone)) {
        phone = `(${balIntStr.slice(0, 3)}) ${balIntStr.slice(3, 6)}-${balIntStr.slice(6)}`;
      }
      balance = 0;
    }
    // Case B: 7-9 digit Customer ID (e.g. 904029437 or 888032820)
    else if (balIntStr.length >= 7 && balIntStr.length <= 9) {
      if (!custId || custId.startsWith('CUST-')) {
        custId = balIntStr;
      }
      balance = 0;
    } else {
      // General safety fallback for extreme values
      balance = 0;
    }

    // Try to recover real balance from comments if mentioned (e.g., "$251.99")
    if (record.comments) {
      const match = record.comments.match(/\$?\s*(\d{1,5}(?:\.\d{2})?)/);
      if (match && match[1]) {
        const recovered = parseFloat(match[1]);
        if (!isNaN(recovered) && recovered < 50000) {
          balance = recovered;
        }
      }
    }
  }

  // Ensure clean phone formatting
  if (phone === '(blank)' || !phone) {
    phone = '(403) 723-0100';
  }

  return {
    ...record,
    sumOfStoreCreditBalance: balance,
    phone,
    custId
  };
}

/**
 * Batch cleans customer records.
 */
export function sanitizeCustomerRecords(records: CustomerRecord[]): CustomerRecord[] {
  return records.map(sanitizeCustomerRecord);
}

/**
 * Smart row parser for array data (e.g. Excel / CSV rows) with automatic cell classification
 */
export function parseRowWithSmartAlignment(
  row: any[],
  activeColIndexes: Record<string, number>,
  defaultCity: string = 'Calgary'
): {
  parsedFields?: {
    rawCustId: string;
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phone: string;
    city: string;
    balanceNum: number;
    comments: string;
    keepOrRemove: string;
    createdDate: string;
    saleDate: string;
    aging: string;
  };
  newColIndexes?: Record<string, number>;
  isHeader: boolean;
} {
  if (!row || row.length === 0) return { isHeader: false };

  // Check if this row is a header row
  if (isHeaderRow(row)) {
    const newColIndexes = extractColIndexes(row);
    return { isHeader: true, newColIndexes };
  }

  // Extract fields using current column indexes
  let rawCustId = activeColIndexes['custId'] !== undefined ? String(row[activeColIndexes['custId']] || '') : '';
  let firstName = activeColIndexes['firstName'] !== undefined ? String(row[activeColIndexes['firstName']] || '') : '';
  let lastName = activeColIndexes['lastName'] !== undefined ? String(row[activeColIndexes['lastName']] || '') : '';
  let company = activeColIndexes['company'] !== undefined ? String(row[activeColIndexes['company']] || '') : '';
  let email = activeColIndexes['email'] !== undefined ? String(row[activeColIndexes['email']] || '') : '';
  let phone = activeColIndexes['phone'] !== undefined ? String(row[activeColIndexes['phone']] || '') : '';
  let city = activeColIndexes['city'] !== undefined ? String(row[activeColIndexes['city']] || '') : defaultCity;
  let rawBalStr = activeColIndexes['balance'] !== undefined ? String(row[activeColIndexes['balance']] || '0') : '0';
  let comments = activeColIndexes['comments'] !== undefined ? String(row[activeColIndexes['comments']] || '') : '';
  let keepOrRemove = activeColIndexes['keepOrRemove'] !== undefined ? String(row[activeColIndexes['keepOrRemove']] || '') : '';
  let createdDate = activeColIndexes['createdDate'] !== undefined ? String(row[activeColIndexes['createdDate']] || '') : '';
  let saleDate = activeColIndexes['saleDate'] !== undefined ? String(row[activeColIndexes['saleDate']] || '') : '';
  let aging = activeColIndexes['aging'] !== undefined ? String(row[activeColIndexes['aging']] || '') : '';

  // Clean company & email blanks
  if (company === '(blank)') company = '';
  if (email === '(blank)') email = '';
  if (phone === '(blank)') phone = '';

  // Calculate parsed balance
  let cleanBal = rawBalStr.replace(/[$,]/g, '').trim();
  let balanceNum = parseFloat(cleanBal) || 0;

  // SAFETY CATCH: Detect if balance is in millions (> $50,000) or looks like a 7-10 digit integer
  const isBadBalance = balanceNum > 50000 || (/^\d{7,10}$/.test(cleanBal) && balanceNum > 10000);

  if (isBadBalance) {
    // If cleanBal is a 10-digit phone number
    if (/^\d{10}$/.test(cleanBal) && !phone) {
      phone = `(${cleanBal.slice(0, 3)}) ${cleanBal.slice(3, 6)}-${cleanBal.slice(6)}`;
    }
    // If cleanBal is a 7-9 digit Customer ID
    else if (/^\d{7,9}$/.test(cleanBal) && !rawCustId) {
      rawCustId = cleanBal;
    }

    // Rescue real store credit balance from other cells in row
    let rescuedBalance = 0;
    let foundRescue = false;

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (!cellVal || cellVal === '(blank)' || cellVal === '-') continue;

      // Skip dates, emails, names, phone numbers, customer IDs, aging strings, keep/remove
      if (cellVal.includes('/') || (cellVal.includes('-') && cellVal.length > 5)) continue;
      if (cellVal.includes('@')) continue;
      if (/^(keep|remove|n\/a|processed|over 30|to be cleaned)/i.test(cellVal)) continue;

      const num = parseFloat(cellVal.replace(/[$,]/g, ''));
      if (!isNaN(num) && num < 50000 && num >= -50000) {
        // Ensure it's not a phone/ID integer
        const digits = cellVal.replace(/[$,.]/g, '');
        if (!/^\d{7,10}$/.test(digits)) {
          rescuedBalance = num;
          foundRescue = true;
          break;
        }
      }
    }

    balanceNum = foundRescue ? rescuedBalance : 0;
  }

  // CELL SCAN: Rescue missing phone, email, customer ID if columns were shifted
  for (let c = 0; c < row.length; c++) {
    const val = String(row[c] || '').trim();
    if (!val || val === '(blank)') continue;

    // Rescue Phone if missing
    if (!phone || phone === '(403) 723-0100') {
      const phoneDigits = val.replace(/\D/g, '');
      if (phoneDigits.length === 10) {
        phone = `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
      }
    }

    // Rescue Email if missing
    if (!email && val.includes('@') && !val.includes(' ')) {
      email = val;
    }

    // Rescue Cust ID if missing
    if (!rawCustId) {
      const idDigits = val.replace(/\D/g, '');
      if (idDigits.length >= 7 && idDigits.length <= 9 && !val.includes('/') && !val.includes('@')) {
        rawCustId = val;
      }
    }
  }

  // Fallback for names if empty but available in early columns
  if (!firstName && !lastName) {
    if (row[0] && typeof row[0] === 'string' && !row[0].includes('Over') && !row[0].includes('Quarter')) {
      firstName = String(row[0]).trim();
    }
    if (row[1] && typeof row[1] === 'string' && !row[1].includes('/') && !/\d/.test(row[1])) {
      lastName = String(row[1]).trim();
    }
  }

  return {
    isHeader: false,
    parsedFields: {
      rawCustId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim() || defaultCity,
      balanceNum,
      comments: comments.trim(),
      keepOrRemove: keepOrRemove.trim(),
      createdDate: createdDate.trim(),
      saleDate: saleDate.trim(),
      aging: aging.trim()
    }
  };
}
