/**
 * GOLDRIX Country & Phone Prefix Selector
 * - Curated Supported Countries: Arab Countries, Europe, Turkey, India, Australia, USA/Canada
 * - Two Distinct Modes:
 *   1. mode="dialCode": Compact phone prefix picker (+966, +213, etc.) for Login, Registration, and Phone Verification
 *   2. mode="kyc" / "country": Clean nationality/country selector for KYC WITHOUT phone dial codes or ISO code clutter
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ALL_COUNTRIES,
  CountryItem,
  getFlagImageUrl,
} from '../../data/countries.ts';
import {
  Search,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';

interface CountrySelectorProps {
  value: CountryItem;
  onChange: (country: CountryItem) => void;
  mode?: 'country' | 'dialCode' | 'kyc';
  isRtl?: boolean;
  disabled?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  mode = 'country',
  isRtl = true,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'ARAB' | 'EUROPE' | 'OTHER'>('ALL');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isDialMode = mode === 'dialCode';

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setRegionFilter('ALL');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_COUNTRIES.filter((c) => {
      if (regionFilter === 'ARAB' && c.region !== 'ARAB') return false;
      if (regionFilter === 'EUROPE' && c.region !== 'EUROPE') return false;
      if (
        regionFilter === 'OTHER' &&
        !['TURKEY', 'AMERICA', 'AUSTRALIA', 'INDIA'].includes(c.region)
      ) {
        return false;
      }

      if (!q) return true;
      return (
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        (isDialMode && c.dialCode.includes(q))
      );
    });
  }, [searchQuery, regionFilter, isDialMode]);

  return (
    <>
      {/* Trigger Button */}
      {isDialMode ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          dir="ltr"
          className="px-2.5 py-2.5 bg-neutral-950 border border-neutral-800 hover:border-emerald-500/60 focus:border-emerald-500 rounded-xl text-xs text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          title={`${value.nameEn} (${value.dialCode})`}
        >
          <img
            src={getFlagImageUrl(value.iso)}
            alt={value.nameEn}
            className="w-5 h-3.5 object-cover rounded-[2px] border border-white/10 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="font-mono font-bold text-white text-xs">{value.dialCode}</span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      ) : (
        /* Distinct KYC Country Selector Button — NO dial codes (+...) or ISO badges */
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 hover:border-emerald-500/60 focus:border-emerald-500 rounded-xl text-xs text-white flex items-center justify-between gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={getFlagImageUrl(value.iso)}
              alt={value.nameEn}
              className="w-5 h-3.5 object-cover rounded-[2px] border border-white/10 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-bold text-white truncate">
              {isRtl ? value.nameAr : value.nameEn}
            </span>
            <span className="text-[11px] text-neutral-400 truncate">
              ({isRtl ? value.nameEn : value.nameAr})
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
        </button>
      )}

      {/* Modal / Bottom Sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between gap-2 bg-neutral-900">
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {isDialMode
                  ? isRtl
                    ? 'اختر رمز الدولة للهاتف'
                    : 'Select Country Calling Code'
                  : isRtl
                  ? 'اختر الدولة / الجنسية'
                  : 'Select Country / Nationality'}
              </h3>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Region Filter Tabs + Search */}
            <div className="p-3 border-b border-neutral-800 bg-neutral-950 space-y-2">
              <div className="grid grid-cols-4 gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                {[
                  { id: 'ALL', labelAr: 'الكل', labelEn: 'All' },
                  { id: 'ARAB', labelAr: 'العربية', labelEn: 'Arab' },
                  { id: 'EUROPE', labelAr: 'أوروبا', labelEn: 'Europe' },
                  { id: 'OTHER', labelAr: 'دولية', labelEn: 'Global' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRegionFilter(tab.id as any)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      regionFilter === tab.id
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isRtl ? tab.labelAr : tab.labelEn}
                  </button>
                ))}
              </div>

              <div className="relative" dir="ltr">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isDialMode
                      ? isRtl
                        ? 'ابحث باسم الدولة أو المفتاح (+966)...'
                        : 'Search country or +code...'
                      : isRtl
                      ? 'ابحث باسم الدولة بالعربية أو الإنجليزية...'
                      : 'Search country name...'
                  }
                  className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Country List */}
            <div className="overflow-y-auto flex-1 divide-y divide-neutral-800/50">
              {filteredCountries.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  {isRtl ? 'لا توجد دولة مطابقة للبحث' : 'No matching country found'}
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = country.iso === value.iso;
                  return (
                    <button
                      key={country.iso}
                      type="button"
                      onClick={() => {
                        onChange(country);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'hover:bg-neutral-800/70 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getFlagImageUrl(country.iso)}
                          alt={country.nameEn}
                          loading="lazy"
                          className="w-6 h-4 object-cover rounded-[2px] border border-white/10 shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0 text-right rtl:text-right ltr:text-left">
                          <div className="text-xs font-bold text-white truncate">
                            {isRtl ? country.nameAr : country.nameEn}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            {isRtl ? country.nameEn : country.nameAr}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Only show dialCode in dialCode mode; hide completely in KYC mode */}
                        {isDialMode && (
                          <span
                            dir="ltr"
                            className="text-xs font-mono text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800"
                          >
                            {country.dialCode}
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
