/**
 * GOLDRIX Multi-Language Context (i18n)
 * Supports 8 Global Languages with full platform coverage:
 * - Arabic (ar - العربية - RTL)
 * - English (en - English - LTR)
 * - Turkish (tr - Türkçe - LTR)
 * - French (fr - Français - LTR)
 * - Spanish (es - Español - LTR)
 * - German (de - Deutsch - LTR)
 * - Russian (ru - Русский - LTR)
 * - Chinese (zh - 中文 - LTR)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'ar' | 'en' | 'tr' | 'fr' | 'es' | 'de' | 'ru' | 'zh';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  shortLabel: string;
  dir: 'rtl' | 'ltr';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', shortLabel: 'AR', dir: 'rtl' },
  { code: 'en', name: 'English', nativeName: 'English', shortLabel: 'EN', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', shortLabel: 'TR', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', shortLabel: 'FR', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', shortLabel: 'ES', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', shortLabel: 'DE', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', shortLabel: 'RU', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', shortLabel: 'ZH', dir: 'ltr' },
];

type TranslationRecord = Record<Language, string>;

const translations: Record<string, TranslationRecord> = {
  // Navigation
  home: {
    ar: 'الرئيسية',
    en: 'Home',
    tr: 'Ana Sayfa',
    fr: 'Accueil',
    es: 'Inicio',
    de: 'Startseite',
    ru: 'Главная',
    zh: '首页',
  },
  markets: {
    ar: 'الأسواق',
    en: 'Markets',
    tr: 'Piyasalar',
    fr: 'Marchés',
    es: 'Mercados',
    de: 'Märkte',
    ru: 'Рынки',
    zh: '市场',
  },
  smartTrading: {
    ar: 'التداول الذكي',
    en: 'Smart Trading',
    tr: 'Akıllı Ticaret',
    fr: 'Trading Intelligent',
    es: 'Trading Inteligente',
    de: 'Smart Trading',
    ru: 'Умная торговля',
    zh: '智能交易',
  },
  team: {
    ar: 'الفريق',
    en: 'Team',
    tr: 'Ekip ve Davet',
    fr: 'Équipe',
    es: 'Equipo',
    de: 'Team',
    ru: 'Команда',
    zh: '团队',
  },
  profile: {
    ar: 'ملفي',
    en: 'Profile',
    tr: 'Profilim',
    fr: 'Profil',
    es: 'Perfil',
    de: 'Profil',
    ru: 'Профиль',
    zh: '我的',
  },
  login: {
    ar: 'تسجيل الدخول',
    en: 'Sign In',
    tr: 'Giriş Yap',
    fr: 'Connexion',
    es: 'Iniciar Sesión',
    de: 'Anmelden',
    ru: 'Войти',
    zh: '登录',
  },
  register: {
    ar: 'إنشاء حساب',
    en: 'Register',
    tr: 'Kayıt Ol',
    fr: "S'inscrire",
    es: 'Registrarse',
    de: 'Registrieren',
    ru: 'Регистрация',
    zh: '注册',
  },
  logout: {
    ar: 'تسجيل الخروج من الحساب',
    en: 'Sign Out of Account',
    tr: 'Hesaptan Çıkış Yap',
    fr: 'Se déconnecter du compte',
    es: 'Cerrar sesión de la cuenta',
    de: 'Vom Konto abmelden',
    ru: 'Выйти из аккаунта',
    zh: '退出当前账户',
  },

  // Home Page
  totalWalletBalance: {
    ar: 'إجمالي رصيد المحفظة',
    en: 'Total Wallet Balance',
    tr: 'Toplam Cüzdan Bakiyesi',
    fr: 'Solde Total du Portefeuille',
    es: 'Saldo Total de la Billetera',
    de: 'Gesamtes Wallet-Guthaben',
    ru: 'Общий баланс кошелька',
    zh: '钱包总资产',
  },
  depositUsdt: {
    ar: 'إيداع USDT',
    en: 'Deposit USDT',
    tr: 'USDT Yatır',
    fr: 'Dépôt USDT',
    es: 'Depositar USDT',
    de: 'USDT Einzahlen',
    ru: 'Пополнить USDT',
    zh: '充值 USDT',
  },
  withdrawUsdt: {
    ar: 'سحب USDT',
    en: 'Withdraw USDT',
    tr: 'USDT Çek',
    fr: 'Retrait USDT',
    es: 'Retirar USDT',
    de: 'USDT Auszahlen',
    ru: 'Вывести USDT',
    zh: '提现 USDT',
  },
  availableToWithdraw: {
    ar: 'الرصيد المتاح للسحب',
    en: 'Available to Withdraw',
    tr: 'Çekilebilir Bakiye',
    fr: 'Disponible au Retrait',
    es: 'Disponible para Retirar',
    de: 'Verfügbar zur Auszahlung',
    ru: 'Доступно для вывода',
    zh: '可提现余额',
  },
  investedInPlans: {
    ar: 'المستثمر في الخطط',
    en: 'Invested in Plans',
    tr: 'Planlardaki Yatırım',
    fr: 'Investi dans les Plans',
    es: 'Invertido en Planes',
    de: 'In Plänen investiert',
    ru: 'Инвестировано в планы',
    zh: '计划投资总额',
  },
  accruedPlanProfits: {
    ar: 'الأرباح التلقائية الجارية',
    en: 'Accrued Plan Profits',
    tr: 'Biriken Otomatik Kâr',
    fr: 'Profits Automatiques Cumulés',
    es: 'Ganancias Automáticas Acumuladas',
    de: 'Aufgelaufene Plangewinne',
    ru: 'Накопленная прибыль',
    zh: '累计自动收益',
  },
  teamRewards: {
    ar: 'مكافآت وعمولات الفريق',
    en: 'Team Rewards',
    tr: 'Ekip Ödülleri ve Komisyon',
    fr: "Récompenses d'Équipe",
    es: 'Recompensas de Equipo',
    de: 'Team-Belohnungen',
    ru: 'Награды команды',
    zh: '团队奖励与佣金',
  },
  activeSmartPlansTitle: {
    ar: 'خطط التداول الذكي النشطة والأرباح التلقائية',
    en: 'Active Smart Trading & Auto Profits',
    tr: 'Aktif Akıllı Ticaret Planları ve Otomatik Kârlar',
    fr: 'Plans de Trading Actifs & Profits Automatiques',
    es: 'Planes de Trading Activos y Ganancias Automáticas',
    de: 'Aktive Smart-Trading-Pläne & Auto-Gewinne',
    ru: 'Активные планы умной торговли и авто-прибыль',
    zh: '进行中的智能交易计划与自动收益',
  },
  viewPlans: {
    ar: 'عرض الخطط',
    en: 'View Plans',
    tr: 'Planları Gör',
    fr: 'Voir les Plans',
    es: 'Ver Planes',
    de: 'Pläne ansehen',
    ru: 'Все планы',
    zh: '查看计划',
  },
  noActivePlansDesc: {
    ar: 'لا توجد لديك خطط تداول مفعلة حالياً. يمكنك اختيار خطة من قسم التداول الذكي لبدء احتساب الأرباح تلقائياً.',
    en: 'You have no active smart trading plans right now. Select a plan to start earning automatic yield.',
    tr: 'Şu anda aktif bir akıllı ticaret planınız yok. Otomatik kazanç elde etmeye başlamak için bir plan seçin.',
    fr: "Vous n'avez aucun plan actif pour le moment. Choisissez un plan pour générer des profits automatiques.",
    es: 'No tienes planes activos en este momento. Selecciona un plan para comenzar a generar ganancias automáticas.',
    de: 'Sie haben derzeit keine aktiven Smart-Trading-Pläne. Wählen Sie einen Plan, um automatische Renditen zu erzielen.',
    ru: 'У вас пока нет активных планов. Выберите план в разделе умной торговли для автоматического дохода.',
    zh: '您当前没有进行中的智能交易计划。前往智能交易选择计划即可开始自动赚取收益。',
  },
  explorePlans: {
    ar: 'انتقل إلى الخطط',
    en: 'Explore Plans',
    tr: 'Planları Keşfet',
    fr: 'Explorer les Plans',
    es: 'Explorar Planes',
    de: 'Zu den Plänen',
    ru: 'Перейти к планам',
    zh: '前往交易计划',
  },
  liveMarketPrices: {
    ar: 'أسعار الأسواق المباشرة',
    en: 'Live Market Prices',
    tr: 'Canlı Piyasa Fiyatları',
    fr: 'Prix du Marché en Direct',
    es: 'Precios del Mercado en Vivo',
    de: 'Live-Marktpreise',
    ru: 'Котировки рынков онлайн',
    zh: '实时市场行情',
  },
  allMarkets: {
    ar: 'كل الأسواق',
    en: 'All Markets',
    tr: 'Tüm Piyasalar',
    fr: 'Tous les Marchés',
    es: 'Todos los Mercados',
    de: 'Alle Märkte',
    ru: 'Все рынки',
    zh: '全部市场',
  },
  recentTransactions: {
    ar: 'سجل العمليات الأخيرة',
    en: 'Recent Transactions',
    tr: 'Son İşlem Geçmişi',
    fr: 'Transactions Récentes',
    es: 'Transacciones Recientes',
    de: 'Letzte Transaktionen',
    ru: 'Последние операции',
    zh: '最近交易记录',
  },
  noTransactionsYet: {
    ar: 'لا توجد عمليات مالية مسجلة حتى الآن.',
    en: 'No transactions recorded yet.',
    tr: 'Henüz kayıtlı bir finansal işlem bulunmuyor.',
    fr: 'Aucune transaction enregistrée pour le moment.',
    es: 'Aún no hay transacciones registradas.',
    de: 'Noch keine Transaktionen verzeichnet.',
    ru: 'Финансовых операций пока нет.',
    zh: '暂无交易记录。',
  },

  // Markets Page
  catAll: {
    ar: 'الكل',
    en: 'All',
    tr: 'Tümü',
    fr: 'Tout',
    es: 'Todos',
    de: 'Alle',
    ru: 'Все',
    zh: '全部',
  },
  catCrypto: {
    ar: 'عملات مشفرة',
    en: 'Crypto',
    tr: 'Kripto Paralar',
    fr: 'Crypto',
    es: 'Cripto',
    de: 'Krypto',
    ru: 'Криптовалюты',
    zh: '加密货币',
  },
  catMetals: {
    ar: 'معادن',
    en: 'Metals',
    tr: 'Değerli Metaller',
    fr: 'Métaux',
    es: 'Metales',
    de: 'Edelmetalle',
    ru: 'Металлы',
    zh: '贵金属',
  },
  catForex: {
    ar: 'فوركس',
    en: 'Forex',
    tr: 'Foreks (Döviz)',
    fr: 'Forex',
    es: 'Forex',
    de: 'Devisen',
    ru: 'Форекс',
    zh: '外汇',
  },
  catStocks: {
    ar: 'أسهم',
    en: 'Stocks',
    tr: 'Hisse Senetleri',
    fr: 'Actions',
    es: 'Acciones',
    de: 'Aktien',
    ru: 'Акции',
    zh: '股票',
  },
  watchlist: {
    ar: 'المفضلة',
    en: 'Watchlist',
    tr: 'Favoriler',
    fr: 'Favoris',
    es: 'Favoritos',
    de: 'Favoriten',
    ru: 'Избранное',
    zh: '自选',
  },
  searchPlaceholder: {
    ar: 'بحث...',
    en: 'Search...',
    tr: 'Ara...',
    fr: 'Rechercher...',
    es: 'Buscar...',
    de: 'Suchen...',
    ru: 'Поиск...',
    zh: '搜索币种...',
  },
  pair: {
    ar: 'الزوج',
    en: 'Pair',
    tr: 'Parite',
    fr: 'Paire',
    es: 'Par',
    de: 'Paar',
    ru: 'Пара',
    zh: '交易对',
  },
  price: {
    ar: 'السعر',
    en: 'Price',
    tr: 'Fiyat',
    fr: 'Prix',
    es: 'Precio',
    de: 'Preis',
    ru: 'Цена',
    zh: '最新价',
  },
  change24h: {
    ar: 'التغير 24س',
    en: '24h Change',
    tr: '24s Değişim',
    fr: 'Var. 24h',
    es: 'Cambio 24h',
    de: '24h Änd.',
    ru: 'Изм. 24ч',
    zh: '24h涨跌',
  },
  highLow24h: {
    ar: 'أعلى / أدنى',
    en: '24h High / Low',
    tr: '24s Yüksek / Düşük',
    fr: 'Haut / Bas 24h',
    es: 'Alto / Bajo 24h',
    de: '24h Hoch / Tief',
    ru: 'Макс / Мин 24ч',
    zh: '24h最高/最低',
  },
  tradeBtn: {
    ar: 'تداول',
    en: 'Trade',
    tr: 'İşlem Yap',
    fr: 'Trader',
    es: 'Operar',
    de: 'Handeln',
    ru: 'Торговать',
    zh: '去交易',
  },
};

/**
 * Dictionary of English & Arabic UI strings to automatically translate any phrase
 * across all components into the active language (tr, fr, es, de, ru, zh, en, ar).
 */
const PHRASE_DICTIONARY: Array<{
  en: string;
  ar: string;
  tr: string;
  fr: string;
  es: string;
  de: string;
  ru: string;
  zh: string;
}> = [
  // Header & Nav
  {
    en: 'Home',
    ar: 'الرئيسية',
    tr: 'Ana Sayfa',
    fr: 'Accueil',
    es: 'Inicio',
    de: 'Startseite',
    ru: 'Главная',
    zh: '首页',
  },
  {
    en: 'Markets',
    ar: 'الأسواق',
    tr: 'Piyasalar',
    fr: 'Marchés',
    es: 'Mercados',
    de: 'Märkte',
    ru: 'Рынки',
    zh: '市场',
  },
  {
    en: 'Smart Trading',
    ar: 'التداول الذكي',
    tr: 'Akıllı Ticaret',
    fr: 'Trading Intelligent',
    es: 'Trading Inteligente',
    de: 'Smart Trading',
    ru: 'Умная торговля',
    zh: '智能交易',
  },
  {
    en: 'Trading',
    ar: 'التداول',
    tr: 'Ticaret',
    fr: 'Trading',
    es: 'Trading',
    de: 'Handel',
    ru: 'Торговля',
    zh: '交易',
  },
  {
    en: 'Team',
    ar: 'الفريق',
    tr: 'Ekip',
    fr: 'Équipe',
    es: 'Equipo',
    de: 'Team',
    ru: 'Команда',
    zh: '团队',
  },
  {
    en: 'Profile',
    ar: 'ملفي',
    tr: 'Profilim',
    fr: 'Profil',
    es: 'Perfil',
    de: 'Profil',
    ru: 'Профиль',
    zh: '我的',
  },
  // Home
  {
    en: 'Total Wallet Balance',
    ar: 'إجمالي رصيد المحفظة',
    tr: 'Toplam Cüzdan Bakiyesi',
    fr: 'Solde Total du Portefeuille',
    es: 'Saldo Total de la Billetera',
    de: 'Gesamtes Wallet-Guthaben',
    ru: 'Общий баланс кошелька',
    zh: '钱包总资产',
  },
  {
    en: 'Deposit USDT',
    ar: 'إيداع USDT',
    tr: 'USDT Yatır',
    fr: 'Dépôt USDT',
    es: 'Depositar USDT',
    de: 'USDT Einzahlen',
    ru: 'Пополнить USDT',
    zh: '充值 USDT',
  },
  {
    en: 'Withdraw USDT',
    ar: 'سحب USDT',
    tr: 'USDT Çek',
    fr: 'Retrait USDT',
    es: 'Retirar USDT',
    de: 'USDT Auszahlen',
    ru: 'Вывести USDT',
    zh: '提现 USDT',
  },
  {
    en: 'Available to Withdraw',
    ar: 'الرصيد المتاح للسحب',
    tr: 'Çekilebilir Bakiye',
    fr: 'Disponible au Retrait',
    es: 'Disponible para Retirar',
    de: 'Verfügbar zur Auszahlung',
    ru: 'Доступно к выводу',
    zh: '可提现余额',
  },
  {
    en: 'Invested in Plans',
    ar: 'المستثمر في الخطط',
    tr: 'Planlardaki Yatırım',
    fr: 'Investi dans les Plans',
    es: 'Invertido en Planes',
    de: 'In Plänen investiert',
    ru: 'Инвестировано в планы',
    zh: '计划投资额',
  },
  {
    en: 'Accrued Plan Profits',
    ar: 'الأرباح التلقائية الجارية',
    tr: 'Biriken Otomatik Kâr',
    fr: 'Profits Automatiques Cumulés',
    es: 'Ganancias Automáticas Acumuladas',
    de: 'Aufgelaufene Plangewinne',
    ru: 'Накопленная прибыль',
    zh: '累计自动收益',
  },
  {
    en: 'Team Rewards',
    ar: 'مكافآت وعمولات الفريق',
    tr: 'Ekip Ödülleri',
    fr: "Récompenses d'Équipe",
    es: 'Recompensas de Equipo',
    de: 'Team-Belohnungen',
    ru: 'Награды команды',
    zh: '团队奖励',
  },
  {
    en: 'Active Smart Trading & Auto Profits',
    ar: 'خطط التداول الذكي النشطة والأرباح التلقائية',
    tr: 'Aktif Akıllı Ticaret Planları ve Otomatik Kârlar',
    fr: 'Plans de Trading Actifs & Profits Automatiques',
    es: 'Planes de Trading Activos y Ganancias Automáticas',
    de: 'Aktive Smart-Trading-Pläne & Auto-Gewinne',
    ru: 'Активные планы умной торговли и авто-прибыль',
    zh: '进行中的智能交易计划与自动收益',
  },
  {
    en: 'View Plans',
    ar: 'عرض الخطط',
    tr: 'Planları Gör',
    fr: 'Voir les Plans',
    es: 'Ver Planes',
    de: 'Pläne ansehen',
    ru: 'Все планы',
    zh: '查看计划',
  },
  {
    en: 'You have no active smart trading plans right now. Select a plan to start earning automatic yield.',
    ar: 'لا توجد لديك خطط تداول مفعلة حالياً. يمكنك اختيار خطة من قسم التداول الذكي لبدء احتساب الأرباح تلقائياً.',
    tr: 'Şu anda aktif bir akıllı ticaret planınız yok. Otomatik kazanç elde etmeye başlamak için bir plan seçin.',
    fr: "Vous n'avez aucun plan actif pour le moment. Choisissez un plan pour générer des profits automatiques.",
    es: 'No tienes planes activos en este momento. Selecciona un plan para comenzar a generar ganancias automáticas.',
    de: 'Sie haben derzeit keine aktiven Smart-Trading-Pläne. Wählen Sie einen Plan, um automatische Renditen zu erzielen.',
    ru: 'У вас пока нет активных планов. Выберите план в разделе умной торговли для автоматического дохода.',
    zh: '您当前没有进行中的智能交易计划。选择计划即可开始自动赚取收益。',
  },
  {
    en: 'Explore Plans',
    ar: 'انتقل إلى الخطط',
    tr: 'Planlara Git',
    fr: 'Explorer les Plans',
    es: 'Explorar Planes',
    de: 'Zu den Plänen',
    ru: 'Перейти к планам',
    zh: '前往计划',
  },
  {
    en: 'Live Market Prices',
    ar: 'أسعار الأسواق المباشرة',
    tr: 'Canlı Piyasa Fiyatları',
    fr: 'Prix du Marché en Direct',
    es: 'Precios del Mercado en Vivo',
    de: 'Live-Marktpreise',
    ru: 'Котировки рынков онлайн',
    zh: '实时市场行情',
  },
  {
    en: 'All Markets',
    ar: 'كل الأسواق',
    tr: 'Tüm Piyasalar',
    fr: 'Tous les Marchés',
    es: 'Todos los Mercados',
    de: 'Alle Märkte',
    ru: 'Все рынки',
    zh: '全部市场',
  },
  {
    en: 'Recent Transactions',
    ar: 'سجل العمليات الأخيرة',
    tr: 'Son İşlem Geçmişi',
    fr: 'Transactions Récentes',
    es: 'Transacciones Recientes',
    de: 'Letzte Transaktionen',
    ru: 'Последние операции',
    zh: '最近交易记录',
  },
  {
    en: 'No transactions recorded yet.',
    ar: 'لا توجد عمليات مالية مسجلة حتى الآن.',
    tr: 'Henüz kayıtlı bir işlem bulunmuyor.',
    fr: 'Aucune transaction enregistrée.',
    es: 'Aún no hay transacciones registradas.',
    de: 'Noch keine Transaktionen vorhanden.',
    ru: 'Операций пока нет.',
    zh: '暂无交易记录。',
  },
  // Smart Trading Page
  {
    en: 'Automated Smart Investment Plans',
    ar: 'خطط التداول الذكي الآلي',
    tr: 'Otomatik Akıllı Yatırım Planları',
    fr: "Plans d'Investissement Intelligents Automatisés",
    es: 'Planes de Inversión Inteligente Automatizados',
    de: 'Automatisierte Smart-Investment-Pläne',
    ru: 'Автоматические инвестиционные планы',
    zh: '全自动智能投资计划',
  },
  {
    en: 'Investment Plans',
    ar: 'خطط الاستثمار المباشرة',
    tr: 'Doğrudan Yatırım Planları',
    fr: "Plans d'Investissement",
    es: 'Planes de Inversión',
    de: 'Investitionspläne',
    ru: 'Инвестиционные планы',
    zh: '直接投资计划',
  },
  {
    en: 'Six fixed-amount plans with +7% cycle yield and live countdown timer. Each plan can be opened once while other plans remain open.',
    ar: 'ست خطط استثمارية بمبالغ محددة وعائد صافي +7% لكل دورة مع مؤقت تنازلي مباشر. كل خطة تُفتح مرة واحدة فقط، ويمكنك فتح أي خطة أخرى متاحة.',
    tr: '+%7 net döngü getirisi ve canlı geri sayım sayacına sahip 6 sabit tutarlı yatırım planı. Her plan bir kez açılabilir, diğer planları istediğiniz zaman açabilirsiniz.',
    fr: 'Six plans à montant fixe avec un rendement net de +7% par cycle et compte à rebours en direct.',
    es: 'Seis planes de monto fijo con +7% de rendimiento neto por ciclo y temporizador en vivo.',
    de: 'Sechs Festbetragspläne mit +7% Netto-Rendite pro Zyklus und Live-Countdown.',
    ru: 'Шесть фиксированных планов с чистой доходностью +7% за цикл и таймером обратного отсчета.',
    zh: '六个固定金额投资计划，每周期净收益 +7%，配备实时倒计时。',
  },
  {
    en: 'Available Balance:',
    ar: 'رصيدك المتاح:',
    tr: 'Kullanılabilir Bakiye:',
    fr: 'Solde Disponible :',
    es: 'Saldo Disponible:',
    de: 'Verfügbares Guthaben:',
    ru: 'Доступный баланс:',
    zh: '可用余额：',
  },
  {
    en: 'Active Plans:',
    ar: 'الخطط النشطة:',
    tr: 'Aktif Planlar:',
    fr: 'Plans Actifs :',
    es: 'Planes Activos:',
    de: 'Aktive Pläne:',
    ru: 'Активные планы:',
    zh: '进行中计划：',
  },
  {
    en: 'Investment:',
    ar: 'مبلغ الاستثمار:',
    tr: 'Yatırım Tutarı:',
    fr: 'Investissement :',
    es: 'Inversión:',
    de: 'Investition:',
    ru: 'Сумма инвестиции:',
    zh: '投资金额：',
  },
  {
    en: 'Return Rate:',
    ar: 'نسبة الربح:',
    tr: 'Kâr Oranı:',
    fr: 'Taux de Profit :',
    es: 'Tasa de Ganancia:',
    de: 'Rendite:',
    ru: 'Доходность:',
    zh: '收益率：',
  },
  {
    en: 'Net Profit:',
    ar: 'الربح الصافي:',
    tr: 'Net Kâr:',
    fr: 'Profit Net :',
    es: 'Ganancia Neta:',
    de: 'Reingewinn:',
    ru: 'Чистая прибыль:',
    zh: '净利润：',
  },
  {
    en: 'Total Payout:',
    ar: 'إجمالي الاستلام:',
    tr: 'Toplam Ödeme:',
    fr: 'Total Reçu :',
    es: 'Pago Total:',
    de: 'Gesamtauszahlung:',
    ru: 'Итого к выплате:',
    zh: '到期总返还：',
  },
  {
    en: 'Confirm Plan Activation',
    ar: 'تأكيد تفعيل الخطة',
    tr: 'Plan Aktivasyonunu Onayla',
    fr: "Confirmer l'Activation du Plan",
    es: 'Confirmar Activación del Plan',
    de: 'Planaktivierung bestätigen',
    ru: 'Подтверждение активации плана',
    zh: '确认激活投资计划',
  },
  {
    en: 'Cancel',
    ar: 'إلغاء',
    tr: 'İptal',
    fr: 'Annuler',
    es: 'Cancelar',
    de: 'Abbrechen',
    ru: 'Отмена',
    zh: '取消',
  },
  {
    en: 'Confirm',
    ar: 'تأكيد التفعيل',
    tr: 'Onayla',
    fr: 'Confirmer',
    es: 'Confirmar',
    de: 'Bestätigen',
    ru: 'Подтвердить',
    zh: '确认',
  },
  // Referrals / Team Page
  {
    en: 'Team, Invitations & Invitees Profits',
    ar: 'الفريق والدعوات وأرباح المدعوين',
    tr: 'Ekip, Davetler ve Davetli Kârları',
    fr: 'Équipe, Invitations et Profits des Filleuls',
    es: 'Equipo, Invitaciones y Ganancias de Invitados',
    de: 'Team, Einladungen & Gewinne der Eingeladenen',
    ru: 'Команда, приглашения и доходы рефералов',
    zh: '团队、邀请与下级收益',
  },
  {
    en: 'Earn +$10 automatically per $100 deposited/invested by your invitee (10%), plus 3% of invitees profits.',
    ar: 'تربح +$10 تلقائياً عن كل $100 يودعها أو يستثمرها المدعو (10%)، بالإضافة إلى نسبة ربح مستمرة 3% من أرباح المدعوين.',
    tr: 'Davetlinizin yatırdığı her $100 için otomatik +$10 (%10) ve davetli kârlarından sürekli %3 komisyon kazanın.',
    fr: 'Gagnez +10$ automatiquement pour chaque 100$ déposé/investi par votre filleul (10%), plus 3% sur ses profits.',
    es: 'Gana +$10 automáticamente por cada $100 depositados/invertidos por tu invitado (10%), más el 3% de sus ganancias.',
    de: 'Verdienen Sie automatisch +$10 pro $100 Einzahlung/Investition Ihres Eingeladenen (10%) plus 3% seiner Gewinne.',
    ru: 'Получайте +$10 за каждые $100 депозита/инвестиций приглашенного (10%), плюс 3% от его прибыли.',
    zh: '受邀好友每充值/投资 $100 您自动立得 +$10 (10%)，并享好友收益 3% 持续分润。',
  },
  {
    en: 'Current VIP & Rate:',
    ar: 'مستوى الفريق ونسبة الربح:',
    tr: 'Mevcut VIP ve Kâr Oranı:',
    fr: 'Niveau VIP & Taux :',
    es: 'Nivel VIP y Tasa:',
    de: 'Aktuelles VIP & Rate:',
    ru: 'Текущий VIP и ставка:',
    zh: '当前 VIP 等级与比例：',
  },
  {
    en: 'VIP Level & Rate',
    ar: 'المستوى ونسبة الربح',
    tr: 'VIP Seviyesi ve Oran',
    fr: 'Niveau VIP & Taux',
    es: 'Nivel VIP y Tasa',
    de: 'VIP-Stufe & Rate',
    ru: 'Уровень VIP и %',
    zh: 'VIP 等级与分润',
  },
  {
    en: 'Total Invitations',
    ar: 'عدد الدعوات (كم شخص)',
    tr: 'Toplam Davet Sayısı (Kişi)',
    fr: 'Total des Invitations',
    es: 'Total de Invitaciones',
    de: 'Einladungen Gesamt',
    ru: 'Всего приглашено',
    zh: '已邀请总人数',
  },
  {
    en: 'Invitees Profit (3% Share)',
    ar: 'أرباح المدعوين (عمولة 3%)',
    tr: 'Davetli Kârı (%3 Pay)',
    fr: 'Profits Filleuls (3%)',
    es: 'Ganancia Invitados (3%)',
    de: 'Gewinnanteil (3%)',
    ru: 'Доход от прибыли (3%)',
    zh: '下级收益分润 (3%)',
  },
  {
    en: 'Direct Invite Bonus',
    ar: 'مكافآت الدعوة (+$10 لكل $100)',
    tr: 'Doğrudan Davet Bonusu',
    fr: "Bonus d'Invitation Direct",
    es: 'Bono Directo de Invitación',
    de: 'Direkter Einladungsbonus',
    ru: 'Прямой бонус приглашения',
    zh: '直接邀请奖励',
  },
  {
    en: 'Team VIP Tiers (People Count & Profit %):',
    ar: 'مستويات ترقية الفريق (تبدأ من VIP 1 — عدد الأشخاص ونسبة الربح):',
    tr: 'Ekip VIP Seviyeleri (Kişi Sayısı ve Kâr Oranı %):',
    fr: "Niveaux VIP d'Équipe (Personnes & % Profit) :",
    es: 'Niveles VIP del Equipo (Personas y % Ganancia):',
    de: 'Team-VIP-Stufen (Personenanzahl & Gewinn %):',
    ru: 'Уровни VIP команды (кол-во людей и % прибыли):',
    zh: '团队 VIP 晋升等级（邀请人数与收益比例）：',
  },
  {
    en: 'Your Referral Code:',
    ar: 'كود الدعوة الخاص بك:',
    tr: 'Davet Kodunuz:',
    fr: 'Votre Code de Parrainage :',
    es: 'Tu Código de Invitación:',
    de: 'Ihr Empfehlungscode:',
    ru: 'Ваш реферальный код:',
    zh: '您的专属邀请码：',
  },
  {
    en: 'Direct Invite Link:',
    ar: 'رابط الدعوة المباشر:',
    tr: 'Doğrudan Davet Bağlantısı:',
    fr: "Lien d'Invitation Direct :",
    es: 'Enlace de Invitación Directo:',
    de: 'Direkter Einladungslink:',
    ru: 'Прямая ссылка приглашения:',
    zh: '专属邀请链接：',
  },
  {
    en: 'Copy',
    ar: 'نسخ الرابط',
    tr: 'Kopyala',
    fr: 'Copier',
    es: 'Copiar',
    de: 'Kopieren',
    ru: 'Копировать',
    zh: '复制',
  },
  {
    en: 'Copied',
    ar: 'تم النسخ',
    tr: 'Kopyalandı',
    fr: 'Copié',
    es: 'Copiado',
    de: 'Kopiert',
    ru: 'Скопировано',
    zh: '已复制',
  },
  {
    en: 'Invitations & Invitees Profits',
    ar: 'سجل الدعوات وأرباح المدعوين',
    tr: 'Davet Kayıtları ve Davetli Kârları',
    fr: 'Historique des Invitations et Profits',
    es: 'Registro de Invitaciones y Ganancias',
    de: 'Einladungsverlauf & Gewinne',
    ru: 'История приглашений и прибыль рефералов',
    zh: '邀请记录与好友收益明细',
  },
  // Profile & Settings
  {
    en: 'Verified ID',
    ar: 'حساب موثق بالهوية',
    tr: 'Kimliği Doğrulanmış Hesap',
    fr: 'Identité Vérifiée',
    es: 'Identidad Verificada',
    de: 'Verifiziertes Konto',
    ru: 'Подтвержденный аккаунт',
    zh: '已实名认证账户',
  },
  {
    en: 'Change Photo',
    ar: 'تغيير الصورة الشخصية',
    tr: 'Profil Fotoğrafını Değiştir',
    fr: 'Changer la Photo',
    es: 'Cambiar Foto',
    de: 'Foto ändern',
    ru: 'Изменить фото',
    zh: '更换头像',
  },
  {
    en: 'Add Photo',
    ar: 'إضافة صورة شخصية',
    tr: 'Profil Fotoğrafı Ekle',
    fr: 'Ajouter une Photo',
    es: 'Añadir Foto',
    de: 'Foto hinzufügen',
    ru: 'Добавить фото',
    zh: '添加头像',
  },
  {
    en: 'Account Settings',
    ar: 'إعدادات الحساب',
    tr: 'Hesap Ayarları',
    fr: 'Paramètres du Compte',
    es: 'Configuración de la Cuenta',
    de: 'Kontoeinstellungen',
    ru: 'Настройки аккаунта',
    zh: '账户设置',
  },
  {
    en: 'Profile Photo, Full Name, Email & Phone Number',
    ar: 'الصورة الشخصية، الاسم الكامل، البريد الإلكتروني، ورقم الهاتف',
    tr: 'Profil Fotoğrafı, Ad Soyad, E-posta, Telefon ve Dil Ayarları',
    fr: 'Photo de profil, Nom complet, Email et Téléphone',
    es: 'Foto de perfil, Nombre completo, Correo y Teléfono',
    de: 'Profilbild, Vollständiger Name, E-Mail & Telefonnummer',
    ru: 'Фото профиля, ФИО, Email, телефон и язык',
    zh: '个人头像、姓名、电子邮箱与手机号码',
  },
  {
    en: 'Profile Picture',
    ar: 'الصورة الشخصية للحساب',
    tr: 'Hesap Profil Fotoğrafı',
    fr: 'Photo de Profil du Compte',
    es: 'Foto de Perfil de la Cuenta',
    de: 'Konto-Profilbild',
    ru: 'Фотография профиля',
    zh: '账户个人头像',
  },
  {
    en: 'Auto-approved immediately',
    ar: 'تُعتمد وتُحفظ فوراً تلقائياً بدون موافقة إدارة',
    tr: 'Yönetici onayı gerekmeden anında otomatik onaylanır',
    fr: 'Approuvée et enregistrée instantanément',
    es: 'Aprobada y guardada al instante automáticamente',
    de: 'Sofort automatisch ohne Admin-Prüfung genehmigt',
    ru: 'Одобряется и сохраняется мгновенно без проверки',
    zh: '即时自动审核通过并保存',
  },
  {
    en: 'Upload',
    ar: 'اختيار صورة',
    tr: 'Fotoğraf Seç',
    fr: 'Choisir',
    es: 'Subir',
    de: 'Hochladen',
    ru: 'Загрузить',
    zh: '上传图片',
  },
  {
    en: 'Full Name:',
    ar: 'الاسم الكامل:',
    tr: 'Ad Soyad:',
    fr: 'Nom Complet :',
    es: 'Nombre Completo:',
    de: 'Vollständiger Name:',
    ru: 'Полное имя:',
    zh: '姓名：',
  },
  {
    en: 'Email Address:',
    ar: 'البريد الإلكتروني:',
    tr: 'E-posta Adresi:',
    fr: 'Adresse Email :',
    es: 'Correo Electrónico:',
    de: 'E-Mail-Adresse:',
    ru: 'Электронная почта:',
    zh: '电子邮箱：',
  },
  {
    en: 'Phone Number:',
    ar: 'رقم الهاتف:',
    tr: 'Telefon Numarası:',
    fr: 'Numéro de Téléphone :',
    es: 'Número de Teléfono:',
    de: 'Telefonnummer:',
    ru: 'Номер телефона:',
    zh: '手机号码：',
  },
  {
    en: 'Edit',
    ar: 'تعديل',
    tr: 'Düzenle',
    fr: 'Modifier',
    es: 'Editar',
    de: 'Bearbeiten',
    ru: 'Изменить',
    zh: '修改',
  },
  {
    en: 'KYC Verification:',
    ar: 'توثيق الهوية الرسمية (KYC):',
    tr: 'Resmi Kimlik Doğrulama (KYC):',
    fr: "Vérification d'Identité (KYC) :",
    es: 'Verificación de Identidad (KYC):',
    de: 'KYC-Identitätsprüfung:',
    ru: 'Верификация личности (KYC):',
    zh: '实名身份认证 (KYC)：',
  },
  {
    en: 'Verified',
    ar: 'موثق بالكامل',
    tr: 'Tamamen Doğrulandı',
    fr: 'Vérifié',
    es: 'Verificado',
    de: 'Verifiziert',
    ru: 'Подтверждено',
    zh: '已完全认证',
  },
  {
    en: 'Verify ID',
    ar: 'توثيق الهوية',
    tr: 'Kimliği Doğrula',
    fr: "Vérifier l'ID",
    es: 'Verificar ID',
    de: 'ID verifizieren',
    ru: 'Подтвердить ID',
    zh: '立即认证',
  },
  {
    en: 'Language:',
    ar: 'اللغة:',
    tr: 'Dil Seçimi:',
    fr: 'Langue :',
    es: 'Idioma:',
    de: 'Sprache:',
    ru: 'Язык:',
    zh: '语言：',
  },
  {
    en: 'Light Mode',
    ar: 'المظهر النهاري',
    tr: 'Gündüz Modu',
    fr: 'Mode Clair',
    es: 'Modo Claro',
    de: 'Heller Modus',
    ru: 'Светлая тема',
    zh: '浅色模式',
  },
  {
    en: 'Dark Mode',
    ar: 'المظهر الليلي',
    tr: 'Gece Modu',
    fr: 'Mode Sombre',
    es: 'Modo Oscuro',
    de: 'Dunkler Modus',
    ru: 'Темная тема',
    zh: '深色模式',
  },
  {
    en: 'Smart AI Assistant',
    ar: 'المساعد الذكي (خبير الذكاء الاصطناعي)',
    tr: 'Akıllı Yapay Zeka Asistanı',
    fr: 'Assistant IA Intelligent',
    es: 'Asistente Inteligente IA',
    de: 'Intelligenter KI-Assistent',
    ru: 'Умный ИИ-ассистент',
    zh: 'AI 智能专家助手',
  },
  {
    en: 'Ask any question and get an instant direct answer',
    ar: 'اسأل الذكاء الاصطناعي أي سؤال وسيجيبك بشكل منفصل وفوري',
    tr: 'Yapay zekaya istediğiniz soruyu sorun, anında ayrıntılı yanıt alın',
    fr: 'Posez toute question et obtenez une réponse directe instantanée',
    es: 'Haz cualquier pregunta y obtén una respuesta directa al instante',
    de: 'Stellen Sie jede Frage und erhalten Sie sofort eine direkte Antwort',
    ru: 'Задайте любой вопрос и получите мгновенный точный ответ',
    zh: '随时向 AI 提问，立即获得独立精准解答',
  },
  {
    en: 'Open AI Bot',
    ar: 'فتح المساعد الذكي',
    tr: 'Yapay Zeka Asistanını Aç',
    fr: "Ouvrir l'Assistant IA",
    es: 'Abrir Asistente IA',
    de: 'KI-Assistent öffnen',
    ru: 'Открыть ИИ-помощник',
    zh: '打开智能助手',
  },
  {
    en: 'Privacy Policy',
    ar: 'سياسة الخصوصية',
    tr: 'Gizlilik Politikası',
    fr: 'Politique de Confidentialité',
    es: 'Política de Privacidad',
    de: 'Datenschutzrichtlinie',
    ru: 'Политика конфиденциальности',
    zh: '隐私政策',
  },
  {
    en: 'Data encryption & 100% reserve protection',
    ar: 'حماية البيانات وتأمين أصول ومحافظ العملاء',
    tr: 'Veri şifreleme ve %100 müşteri varlık koruma politikası',
    fr: 'Chiffrement des données et protection des actifs à 100%',
    es: 'Cifrado de datos y protección de reservas al 100%',
    de: 'Datenverschlüsselung & 100% Reservenschutz',
    ru: 'Шифрование данных и 100% защита резервов клиентов',
    zh: '数据加密与 100% 客户资产储备保障',
  },
  {
    en: 'Frequently Asked Questions',
    ar: 'الأسئلة الشائعة',
    tr: 'Sıkça Sorulan Sorular (SSS)',
    fr: 'Questions Fréquentes (FAQ)',
    es: 'Preguntas Frecuentes (FAQ)',
    de: 'Häufig gestellte Fragen (FAQ)',
    ru: 'Часто задаваемые вопросы (FAQ)',
    zh: '常见问题解答 (FAQ)',
  },
  {
    en: 'Answers about deposits, withdrawals, smart trading & referrals',
    ar: 'إجابات مفصلة حول الإيداع، السحب، التداول الذكي، والدعوات',
    tr: 'Yatırma, çekme, akıllı ticaret ve davetler hakkında detaylı yanıtlar',
    fr: 'Réponses sur les dépôts, retraits, trading et parrainages',
    es: 'Respuestas sobre depósitos, retiros, trading e invitaciones',
    de: 'Antworten zu Einzahlungen, Auszahlungen, Trading & Empfehlungen',
    ru: 'Ответы о пополнении, выводе, умной торговле и рефералах',
    zh: '关于充值、提现、智能交易与邀请奖励的详细解答',
  },
  {
    en: 'About Us & International Licenses',
    ar: 'من نحن والتراخيص الدولية',
    tr: 'Hakkımızda ve Uluslararası Lisanslar',
    fr: 'À Propos & Licences Internationales',
    es: 'Sobre Nosotros y Licencias Internacionales',
    de: 'Über uns & Internationale Lizenzen',
    ru: 'О нас и международные лицензии',
    zh: '关于我们与国际监管牌照',
  },
  {
    en: 'Licensed in Australia, Cyprus, Europe & USA',
    ar: 'نبذة عن المنصة والتراخيص في أستراليا وقبرص وأوروبا وأمريكا',
    tr: 'Avustralya, Kıbrıs, Avrupa ve ABD resmi lisans bilgileri',
    fr: 'Agréé en Australie, Chypre, Europe et États-Unis',
    es: 'Licenciado en Australia, Chipre, Europa y EE. UU.',
    de: 'Lizenziert in Australien, Zypern, Europa & USA',
    ru: 'Лицензии в Австралии, на Кипре, в Европе и США',
    zh: '澳大利亚、塞浦路斯、欧盟及美国合规监管牌照',
  },
  {
    en: 'Support Ticket',
    ar: 'تذكرة دعم فني',
    tr: 'Teknik Destek Talebi',
    fr: 'Ticket de Support Technique',
    es: 'Ticket de Soporte Técnico',
    de: 'Support-Ticket',
    ru: 'Тикет техподдержки',
    zh: '技术支持工单',
  },
  {
    en: 'Open a support ticket with the customer care team',
    ar: 'فتح محادثة أو تذكرة دعم مباشر مع فريق خدمة العملاء',
    tr: 'Müşteri hizmetleri ekibiyle doğrudan destek talebi başlatın',
    fr: 'Ouvrir un ticket de support avec le service client',
    es: 'Abrir un ticket de soporte con atención al cliente',
    de: 'Support-Ticket beim Kundenservice eröffnen',
    ru: 'Создать обращение в службу поддержки клиентов',
    zh: '与客户服务团队提交或查看支持工单',
  },
  {
    en: 'Open Ticket',
    ar: 'فتح تذكرة',
    tr: 'Talep Aç',
    fr: 'Ouvrir un Ticket',
    es: 'Abrir Ticket',
    de: 'Ticket öffnen',
    ru: 'Открыть тикет',
    zh: '提交工单',
  },
  {
    en: 'Change Password',
    ar: 'تغيير كلمة المرور',
    tr: 'Şifre Değiştir',
    fr: 'Changer le Mot de Passe',
    es: 'Cambiar Contraseña',
    de: 'Passwort ändern',
    ru: 'Изменить пароль',
    zh: '修改登录密码',
  },
  {
    en: 'Update Password',
    ar: 'تحديث كلمة المرور',
    tr: 'Şifreyi Güncelle',
    fr: 'Mettre à jour le mot de passe',
    es: 'Actualizar Contraseña',
    de: 'Passwort aktualisieren',
    ru: 'Обновить пароль',
    zh: '更新密码',
  },
  {
    en: 'My Investment Plans Record',
    ar: 'سجل خططي الاستثمارية',
    tr: 'Yatırım Planlarım Geçmişi',
    fr: "Historique de Mes Plans d'Investissement",
    es: 'Historial de Mis Planes de Inversión',
    de: 'Meine Investitionspläne',
    ru: 'История моих инвестиционных планов',
    zh: '我的投资计划记录',
  },
  {
    en: 'No plans matching this filter.',
    ar: 'لا توجد خطط مطابقة لهذا التصنيف.',
    tr: 'Bu filtreye uygun yatırım planı bulunamadı.',
    fr: 'Aucun plan ne correspond à ce filtre.',
    es: 'No hay planes que coincidan con este filtro.',
    de: 'Keine passenden Pläne gefunden.',
    ru: 'Нет планов по выбранному фильтру.',
    zh: '暂无符合该筛选条件的计划。',
  },
  {
    en: 'Sign Out of Account',
    ar: 'تسجيل الخروج من الحساب',
    tr: 'Hesaptan Çıkış Yap',
    fr: 'Se Déconnecter du Compte',
    es: 'Cerrar Sesión de la Cuenta',
    de: 'Vom Konto abmelden',
    ru: 'Выйти из аккаунта',
    zh: '退出当前账户',
  },
];

// Build fast lookup maps from English and Arabic to any target language
const lookupByEn = new Map<string, (typeof PHRASE_DICTIONARY)[number]>();
const lookupByAr = new Map<string, (typeof PHRASE_DICTIONARY)[number]>();
for (const entry of PHRASE_DICTIONARY) {
  lookupByEn.set(entry.en.trim(), entry);
  lookupByAr.set(entry.ar.trim(), entry);
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tx: (arText: string, enText: string, custom?: Partial<Record<Language, string>>) => string;
  isRtl: boolean;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('goldrix_lang') as Language;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    return 'ar';
  });

  const isRtl = language === 'ar';

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('goldrix_lang', lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const record = translations[key];
      if (record) {
        return record[language] || record.en || record.ar || key;
      }
      const byEn = lookupByEn.get(key.trim());
      if (byEn) return byEn[language] || byEn.en;
      const byAr = lookupByAr.get(key.trim());
      if (byAr) return byAr[language] || byAr.en;
      return key;
    },
    [language]
  );

  const tx = useCallback(
    (arText: string, enText: string, custom?: Partial<Record<Language, string>>): string => {
      if (custom && custom[language]) {
        return custom[language]!;
      }
      if (language === 'ar') return arText;
      if (language === 'en') return enText;

      const entry = lookupByEn.get(enText.trim()) || lookupByAr.get(arText.trim());
      if (entry && entry[language]) {
        return entry[language];
      }
      return enText;
    },
    [language]
  );

  useEffect(() => {
    localStorage.setItem('goldrix_lang', language);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
    if (document.body) {
      document.body.setAttribute('translate', 'no');
      document.body.classList.add('notranslate');
    }
  }, [language, isRtl]);

  // Automatic DOM text-node translation pass for non-ar/non-en languages (tr, fr, es, de, ru, zh)
  useEffect(() => {
    if (language === 'ar' || language === 'en') return;

    const translateTextNodes = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Text | null = walker.nextNode() as Text | null;
      while (node) {
        const raw = node.nodeValue;
        if (raw) {
          const trimmed = raw.trim();
          if (trimmed.length > 1) {
            const match = lookupByEn.get(trimmed) || lookupByAr.get(trimmed);
            if (match && match[language] && match[language] !== trimmed) {
              node.nodeValue = raw.replace(trimmed, match[language]);
            }
          }
        }
        node = walker.nextNode() as Text | null;
      }
    };

    translateTextNodes();
    const observer = new MutationObserver(() => {
      translateTextNodes();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tx,
        isRtl,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
