import { StoreLocation } from '../types';

export const GOLF_TOWN_STORES: StoreLocation[] = [
  {
    id: '504',
    name: 'Store 504 - South Calgary Golf Town',
    code: '504',
    address: '130 11500 35 St SE',
    city: 'Calgary',
    province: 'AB',
    postalCode: 'T2Z 3W4',
    phone: '(403) 723-0100',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+130+11500+35+St+SE+Calgary+AB+T2Z+3W4',
    lat: 50.9472,
    lng: -113.9845
  },
  {
    id: '501',
    name: 'Store 501 - Calgary North Golf Town',
    code: '501',
    address: '1130 Country Hills Blvd NE #100',
    city: 'Calgary',
    province: 'AB',
    postalCode: 'T3K 6E2',
    phone: '(403) 226-6200',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+1130+Country+Hills+Blvd+NE+Calgary+AB',
    lat: 51.1558,
    lng: -114.0321
  },
  {
    id: '502',
    name: 'Store 502 - West Edmonton Golf Town',
    code: '502',
    address: '10012 170 St NW',
    city: 'Edmonton',
    province: 'AB',
    postalCode: 'T5P 4M9',
    phone: '(780) 489-4653',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+10012+170+St+NW+Edmonton+AB',
    lat: 53.5398,
    lng: -113.6150
  },
  {
    id: '505',
    name: 'Store 505 - South Side Edmonton Golf Town',
    code: '505',
    address: '3383 Calgary Trail NW',
    city: 'Edmonton',
    province: 'AB',
    postalCode: 'T6J 6RS',
    phone: '(780) 431-2999',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+3383+Calgary+Trail+NW+Edmonton+AB',
    lat: 53.4682,
    lng: -113.4938
  },
  {
    id: '510',
    name: 'Store 510 - Mississauga Golf Town',
    code: '510',
    address: '3105 Winston Churchill Blvd',
    city: 'Mississauga',
    province: 'ON',
    postalCode: 'L5L 5S3',
    phone: '(905) 820-2228',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+3105+Winston+Churchill+Blvd+Mississauga+ON',
    lat: 43.5328,
    lng: -79.6892
  },
  {
    id: '512',
    name: 'Store 512 - Ottawa West Merivale Golf Town',
    code: '512',
    address: '1900 Merivale Rd',
    city: 'Nepean',
    province: 'ON',
    postalCode: 'K2G 1E8',
    phone: '(613) 224-8696',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+1900+Merivale+Rd+Nepean+Ottawa+ON',
    lat: 45.3421,
    lng: -75.7335
  },
  {
    id: '515',
    name: 'Store 515 - Toronto Leaside Golf Town',
    code: '515',
    address: '80 Laird Dr',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M4G 3V1',
    phone: '(416) 467-9300',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+80+Laird+Dr+Toronto+ON',
    lat: 43.7082,
    lng: -79.3621
  },
  {
    id: '518',
    name: 'Store 518 - Winnipeg South Kenaston Golf Town',
    code: '518',
    address: '1570 Kenaston Blvd',
    city: 'Winnipeg',
    province: 'MB',
    postalCode: 'R3P 0Y7',
    phone: '(204) 488-8250',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+1570+Kenaston+Blvd+Winnipeg+MB',
    lat: 49.8390,
    lng: -97.2021
  },
  {
    id: '520',
    name: 'Store 520 - Vancouver Marine Drive Golf Town',
    code: '520',
    address: '1200 SW Marine Dr',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6P 5Z2',
    phone: '(604) 263-1200',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+1200+SW+Marine+Dr+Vancouver+BC',
    lat: 49.2081,
    lng: -123.1328
  },
  {
    id: '525',
    name: 'Store 525 - Richmond Golf Town',
    code: '525',
    address: '4000 No 3 Rd',
    city: 'Richmond',
    province: 'BC',
    postalCode: 'V6X 2C2',
    phone: '(604) 279-9900',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Golf+Town+4000+No+3+Rd+Richmond+BC',
    lat: 49.1824,
    lng: -123.1362
  }
];

export function findGolfTownStore(query: string): StoreLocation | undefined {
  if (!query) return undefined;
  const clean = query.trim().toLowerCase();
  
  // 1. Try exact store ID match
  const storeById = GOLF_TOWN_STORES.find(s => s.id === clean || s.code === clean);
  if (storeById) return storeById;

  // 2. Try store ID inside text (e.g. "504", "Store 504")
  const idMatch = clean.match(/\b(5\d{2})\b/);
  if (idMatch) {
    const found = GOLF_TOWN_STORES.find(s => s.id === idMatch[1]);
    if (found) return found;
  }

  // 3. Try name or city matching
  return GOLF_TOWN_STORES.find(s => 
    s.name.toLowerCase().includes(clean) ||
    (s.city && clean.includes(s.city.toLowerCase())) ||
    (s.address && clean.includes(s.address.toLowerCase()))
  );
}

export function getFullStoreDisplayName(storeId: string, storeName?: string): string {
  const found = GOLF_TOWN_STORES.find(s => s.id === storeId);
  if (found) {
    return `${found.name} (${found.address}, ${found.city}, ${found.province})`;
  }
  return storeName || `Store ${storeId} - Golf Town Location`;
}
