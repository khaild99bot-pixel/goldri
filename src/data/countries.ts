/**
 * GOLDRIX Curated Supported Countries Dataset
 * Includes:
 * - Arab Countries (الدول العربية)
 * - European Countries (دول أوروبا)
 * - Turkey (تركيا)
 * - India (الهند)
 * - Australia (أستراليا)
 * - United States & Canada (أمريكا وكندا)
 */

export interface CountryItem {
  iso: string;       // ISO 3166-1 alpha-2 (e.g. "SA")
  nameEn: string;    // English Name (e.g. "Saudi Arabia")
  nameAr: string;    // Arabic Name (e.g. "المملكة العربية السعودية")
  dialCode: string;  // Calling code (e.g. "+966")
  flag: string;      // Unicode flag emoji
  region: 'ARAB' | 'EUROPE' | 'TURKEY' | 'INDIA' | 'AUSTRALIA' | 'AMERICA';
}

export function getFlagImageUrl(iso: string): string {
  return `https://flagcdn.com/w40/${iso.toLowerCase()}.png`;
}

export const ALL_COUNTRIES: CountryItem[] = [
  // 1. Arab Countries (الدول العربية)
  { iso: 'SA', nameEn: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', dialCode: '+966', flag: '🇸🇦', region: 'ARAB' },
  { iso: 'AE', nameEn: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', dialCode: '+971', flag: '🇦🇪', region: 'ARAB' },
  { iso: 'KW', nameEn: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', flag: '🇰🇼', region: 'ARAB' },
  { iso: 'QA', nameEn: 'Qatar', nameAr: 'قطر', dialCode: '+974', flag: '🇶🇦', region: 'ARAB' },
  { iso: 'BH', nameEn: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', flag: '🇧🇭', region: 'ARAB' },
  { iso: 'OM', nameEn: 'Oman', nameAr: 'سلطنة عُمان', dialCode: '+968', flag: '🇴🇲', region: 'ARAB' },
  { iso: 'IQ', nameEn: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶', region: 'ARAB' },
  { iso: 'JO', nameEn: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴', region: 'ARAB' },
  { iso: 'LB', nameEn: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧', region: 'ARAB' },
  { iso: 'SY', nameEn: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾', region: 'ARAB' },
  { iso: 'PS', nameEn: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', flag: '🇵🇸', region: 'ARAB' },
  { iso: 'YE', nameEn: 'Yemen', nameAr: 'اليمن', dialCode: '+967', flag: '🇾🇪', region: 'ARAB' },
  { iso: 'EG', nameEn: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬', region: 'ARAB' },
  { iso: 'DZ', nameEn: 'Algeria', nameAr: 'الجزائر', dialCode: '+213', flag: '🇩🇿', region: 'ARAB' },
  { iso: 'MA', nameEn: 'Morocco', nameAr: 'المغرب', dialCode: '+212', flag: '🇲🇦', region: 'ARAB' },
  { iso: 'TN', nameEn: 'Tunisia', nameAr: 'تونس', dialCode: '+216', flag: '🇹🇳', region: 'ARAB' },
  { iso: 'LY', nameEn: 'Libya', nameAr: 'ليبيا', dialCode: '+218', flag: '🇱🇾', region: 'ARAB' },
  { iso: 'SD', nameEn: 'Sudan', nameAr: 'السودان', dialCode: '+249', flag: '🇸🇩', region: 'ARAB' },
  { iso: 'MR', nameEn: 'Mauritania', nameAr: 'موريتانيا', dialCode: '+222', flag: '🇲🇷', region: 'ARAB' },

  // 2. Turkey (تركيا)
  { iso: 'TR', nameEn: 'Turkey', nameAr: 'تركيا', dialCode: '+90', flag: '🇹🇷', region: 'TURKEY' },

  // 3. United States & Canada (أمريكا)
  { iso: 'US', nameEn: 'United States', nameAr: 'الولايات المتحدة الأمريكية', dialCode: '+1', flag: '🇺🇸', region: 'AMERICA' },
  { iso: 'CA', nameEn: 'Canada', nameAr: 'كندا', dialCode: '+1', flag: '🇨🇦', region: 'AMERICA' },

  // 4. Australia (أستراليا)
  { iso: 'AU', nameEn: 'Australia', nameAr: 'أستراليا', dialCode: '+61', flag: '🇦🇺', region: 'AUSTRALIA' },

  // 5. India (الهند)
  { iso: 'IN', nameEn: 'India', nameAr: 'الهند', dialCode: '+91', flag: '🇮🇳', region: 'INDIA' },

  // 6. Europe (أوروبا)
  { iso: 'GB', nameEn: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧', region: 'EUROPE' },
  { iso: 'DE', nameEn: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', flag: '🇩🇪', region: 'EUROPE' },
  { iso: 'FR', nameEn: 'France', nameAr: 'فرنسا', dialCode: '+33', flag: '🇫🇷', region: 'EUROPE' },
  { iso: 'IT', nameEn: 'Italy', nameAr: 'إيطاليا', dialCode: '+39', flag: '🇮🇹', region: 'EUROPE' },
  { iso: 'ES', nameEn: 'Spain', nameAr: 'إسبانيا', dialCode: '+34', flag: '🇪🇸', region: 'EUROPE' },
  { iso: 'NL', nameEn: 'Netherlands', nameAr: 'هولندا', dialCode: '+31', flag: '🇳🇱', region: 'EUROPE' },
  { iso: 'BE', nameEn: 'Belgium', nameAr: 'بلجيكا', dialCode: '+32', flag: '🇧🇪', region: 'EUROPE' },
  { iso: 'CH', nameEn: 'Switzerland', nameAr: 'سويسرا', dialCode: '+41', flag: '🇨🇭', region: 'EUROPE' },
  { iso: 'AT', nameEn: 'Austria', nameAr: 'النمسا', dialCode: '+43', flag: '🇦🇹', region: 'EUROPE' },
  { iso: 'SE', nameEn: 'Sweden', nameAr: 'السويد', dialCode: '+46', flag: '🇸🇪', region: 'EUROPE' },
  { iso: 'NO', nameEn: 'Norway', nameAr: 'النرويج', dialCode: '+47', flag: '🇳🇴', region: 'EUROPE' },
  { iso: 'DK', nameEn: 'Denmark', nameAr: 'الدنمارك', dialCode: '+45', flag: '🇩🇰', region: 'EUROPE' },
  { iso: 'FI', nameEn: 'Finland', nameAr: 'فنلندا', dialCode: '+358', flag: '🇫🇮', region: 'EUROPE' },
  { iso: 'IE', nameEn: 'Ireland', nameAr: 'أيرلندا', dialCode: '+353', flag: '🇮🇪', region: 'EUROPE' },
  { iso: 'PT', nameEn: 'Portugal', nameAr: 'البرتغال', dialCode: '+351', flag: '🇵🇹', region: 'EUROPE' },
  { iso: 'GR', nameEn: 'Greece', nameAr: 'اليونان', dialCode: '+30', flag: '🇬🇷', region: 'EUROPE' },
  { iso: 'PL', nameEn: 'Poland', nameAr: 'بولندا', dialCode: '+48', flag: '🇵🇱', region: 'EUROPE' },
  { iso: 'CZ', nameEn: 'Czech Republic', nameAr: 'التشيك', dialCode: '+420', flag: '🇨🇿', region: 'EUROPE' },
  { iso: 'RO', nameEn: 'Romania', nameAr: 'رومانيا', dialCode: '+40', flag: '🇷🇴', region: 'EUROPE' },
  { iso: 'CY', nameEn: 'Cyprus', nameAr: 'قبرص', dialCode: '+357', flag: '🇨🇾', region: 'EUROPE' },
];

const TIMEZONE_TO_ISO: Record<string, string> = {
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Muscat': 'OM',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Baghdad': 'IQ',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS',
  'Asia/Aden': 'YE',
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Tripoli': 'LY',
  'Africa/Khartoum': 'SD',
  'Africa/Nouakchott': 'MR',
  'Europe/Istanbul': 'TR',
  'Asia/Istanbul': 'TR',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Athens': 'GR',
  'Europe/Lisbon': 'PT',
  'Europe/Dublin': 'IE',
  'Europe/Bucharest': 'RO',
  'Asia/Nicosia': 'CY',
  'Europe/Nicosia': 'CY',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Brisbane': 'AU',
};

export function getCountryByIso(iso?: string): CountryItem | undefined {
  if (!iso) return undefined;
  const code = iso.trim().toUpperCase();
  return ALL_COUNTRIES.find((c) => c.iso === code);
}

export function getCountryByNameOrIso(value?: string): CountryItem | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return ALL_COUNTRIES.find(
    (c) =>
      c.iso.toLowerCase() === v ||
      c.nameEn.toLowerCase() === v ||
      c.nameAr === value.trim()
  );
}

export function getCountryByPhone(phone?: string): CountryItem | undefined {
  if (!phone) return undefined;
  const cleaned = phone.trim();
  if (!cleaned.startsWith('+')) return undefined;
  const sorted = [...ALL_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sorted.find((c) => cleaned.startsWith(c.dialCode));
}

export function detectUserCountrySync(): CountryItem {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_ISO[tz]) {
      const matched = getCountryByIso(TIMEZONE_TO_ISO[tz]);
      if (matched) return matched;
    }

    const langs =
      typeof navigator !== 'undefined'
        ? navigator.languages || [navigator.language]
        : [];
    for (const lang of langs) {
      if (!lang) continue;
      const parts = lang.replace('_', '-').split('-');
      if (parts.length >= 2) {
        const region = parts[parts.length - 1].toUpperCase();
        if (region.length === 2) {
          const matched = getCountryByIso(region);
          if (matched) return matched;
        }
      }
    }
  } catch {
    // Fallback to Saudi Arabia
  }

  return getCountryByIso('SA') || ALL_COUNTRIES[0];
}
