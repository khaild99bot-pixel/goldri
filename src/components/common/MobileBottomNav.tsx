import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Home, TrendingUp, BarChart3, Users } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const { t } = useLanguage();

  const tabs = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'markets', label: t('markets'), icon: TrendingUp },
    { id: 'trading', label: t('smartTrading'), icon: BarChart3 },
    { id: 'team', label: t('team'), icon: Users },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950 border-t border-neutral-800/80 m-0 p-0 shadow-2xl">
      <div className="grid grid-cols-4 items-center h-13 w-full px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'stroke-[2.5] text-emerald-400' : 'stroke-2'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
