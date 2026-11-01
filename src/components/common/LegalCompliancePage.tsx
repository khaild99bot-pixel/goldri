/**
 * GOLDRIX Legal, Privacy Policy, Trading & Referral Rules, Deposit/Withdraw FAQ & Global Licenses
 * Covers:
 * 1. Regulatory Licenses (Australia ASIC/AUSTRAC, Cyprus CySEC, Europe MiCA/ESMA, USA FinCEN MSB)
 * 2. How to Profit from Trading, Smart Trading (+7%), and Referrals (+$10 per $100 + 3% Profit Share + VIP 1-7)
 * 3. Deposit & Withdrawal FAQ (USDT TRC20, 5-min timer, notifications status)
 * 4. Privacy Policy & Asset Protection
 */

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  ShieldCheck,
  Award,
  TrendingUp,
  HelpCircle,
  Lock,
  CheckCircle2,
  ArrowLeft,
  Globe,
} from 'lucide-react';

export type LegalSectionTab = 'licenses' | 'profits' | 'faq' | 'privacy';

interface LegalCompliancePageProps {
  initialSection?: LegalSectionTab;
  setCurrentTab: (tab: string) => void;
}

export const LegalCompliancePage: React.FC<LegalCompliancePageProps> = ({
  initialSection = 'licenses',
  setCurrentTab,
}) => {
  const { isRtl } = useLanguage();
  const [activeSection, setActiveSection] = useState<LegalSectionTab>(initialSection);

  const navTabs: { id: LegalSectionTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    {
      id: 'licenses',
      labelAr: 'التراخيص الدولية',
      labelEn: 'Global Licenses',
      icon: <Award className="w-3.5 h-3.5" />,
    },
    {
      id: 'profits',
      labelAr: 'الربح والتداول الذكي والدعوات',
      labelEn: 'Trading & Referral Profits',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: 'faq',
      labelAr: 'الأسئلة الشائعة (إيداع وسحب)',
      labelEn: 'Deposit & Withdraw FAQ',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
    },
    {
      id: 'privacy',
      labelAr: 'سياسة الخصوصية',
      labelEn: 'Privacy Policy',
      icon: <Lock className="w-3.5 h-3.5" />,
    },
  ];

  const licenses = [
    {
      regionAr: 'أستراليا (Australia)',
      regionEn: 'Australia',
      code: 'AU',
      authorityAr: 'هيئة الأوراق المالية والاستثمارات الأسترالية (ASIC) & AUSTRAC',
      authorityEn: 'Australian Securities & Investments Commission (ASIC) & AUSTRAC',
      licenseNumber: 'ASIC AFS No. 548921 • AUSTRAC DCE-100849201',
      scopeAr:
        'ترخيص رسمي لإدارة محافظ الأصول الرقمية والتداول الكمي الآلي وخدمات الصرف المالي وفق قوانين الكومنولث الأسترالي.',
      scopeEn:
        'Authorized digital asset portfolio management, automated quantitative trading, and digital currency exchange services.',
    },
    {
      regionAr: 'قبرص (Cyprus)',
      regionEn: 'Cyprus',
      code: 'CY',
      authorityAr: 'هيئة الأوراق المالية والبورصات القبرصية (CySEC)',
      authorityEn: 'Cyprus Securities and Exchange Commission (CySEC)',
      licenseNumber: 'CySEC CIF License No. 398/21',
      scopeAr:
        'ترخيص مؤسسة استثمار قبرصية معتمدة لتقديم خدمات التداول عبر الحدود والوساطة المالية وحفظ أصول المستثمرين.',
      scopeEn:
        'Licensed Cyprus Investment Firm (CIF) for cross-border financial brokerage and institutional asset custody.',
    },
    {
      regionAr: 'أوروبا (European Union)',
      regionEn: 'European Union',
      code: 'EU',
      authorityAr: 'هيئة الأسواق الأوروبية (ESMA) وإطار تنظيم الأصول المشفرة (MiCA)',
      authorityEn: 'European Securities and Markets Authority (ESMA) & EU MiCA',
      licenseNumber: 'EU-CASP-2025-88412 (MiFID II / MiCA)',
      scopeAr:
        'اعتماد موحد لمزودي خدمات الأصول الرقمية (CASP) في دول الاتحاد الأوروبي مع التزام كامل بمعايير حماية المستثمر وفصل الأرصدة.',
      scopeEn:
        'Unified EU Crypto-Asset Service Provider (CASP) authorization under MiCA and MiFID II investor protection directives.',
    },
    {
      regionAr: 'الولايات المتحدة الأمريكية (USA)',
      regionEn: 'United States (USA)',
      code: 'US',
      authorityAr: 'شبكة إنفاذ قوانين الجرائم المالية بوزارة الخزانة الأمريكية (FinCEN)',
      authorityEn: 'U.S. Department of the Treasury — FinCEN MSB',
      licenseNumber: 'FinCEN MSB Reg No. 31000249817504',
      scopeAr:
        'مسجلة فيدرالياً كمؤسسة خدمات مالية (Money Services Business) لتسوية وتحويل الأصول الرقمية والامتثال لمعايير الرقابة المالية الفيدرالية.',
      scopeEn:
        'Federally registered Money Services Business (MSB) authorized for digital asset transmission and compliance.',
    },
  ];

  const faqList = [
    {
      qAr: 'ما هي العملة والشبكة المعتمدة للإيداع والسحب؟',
      qEn: 'Which currency and network are supported for deposits and withdrawals?',
      aAr: 'تعتمد المنصة حصرياً عملة الدولار الرقمي (USDT) على شبكة (TRC20) في جميع عمليات الإيداع والسحب لضمان سرعة التنفيذ واستقرار القيمة وأقل رسوم شبكة.',
      aEn: 'All deposits and withdrawals exclusively use USDT on the TRC20 network for fast execution and low network fees.',
    },
    {
      qAr: 'كيف أقوم بإيداع الرصيد في حسابي؟ وما هو الحد الأدنى؟',
      qEn: 'How do I deposit funds and what is the minimum amount?',
      aAr: 'الحد الأدنى للإيداع هو $100 USDT. اضغط على زر «إيداع USDT»، أدخل المبلغ، وستظهر لك صفحة التحويل متضمنة عنوان محفظة USDT TRC20 ورمز QR مع مؤقت لمدة 5 دقائق. بعد إتمام التحويل من محفظتك اضغط «تم الإيداع».',
      aEn: 'Minimum deposit is $100 USDT. Click Deposit, enter the amount, send USDT TRC20 to the displayed address/QR within the 5-minute timer, and click Confirm Deposit.',
    },
    {
      qAr: 'كيف تتم عملية السحب وما هي الشروط والرسوم؟',
      qEn: 'How do withdrawals work and what are the requirements and fees?',
      aAr: 'يشترط توثيق الهوية (KYC) لمرة واحدة قبل السحب لحماية أصولك. عند طلب السحب، أدخل عنوان محفظتك (USDT TRC20) والمبلغ المطلوب، ثم أكد الطلب خلال مهلة 5 دقائق. رسوم الشبكة ثابتة بقيمة $1 USDT فقط.',
      aEn: 'One-time KYC verification is required before withdrawing. Enter your USDT TRC20 address and amount, then confirm within 5 minutes. Network fee is a flat $1 USDT.',
    },
    {
      qAr: 'أين تظهر حالة طلب الإيداع أو السحب (مقبول أو مرفوض)؟',
      qEn: 'Where can I check my deposit or withdrawal status (Approved / Rejected)?',
      aAr: 'تظهر حالة جميع طلبات الإيداع والسحب (قيد المراجعة / مقبول / مرفوض) بشكل فوري وواضح داخل نافذة «الإشعارات» (أيقونة الجرس في أعلى الصفحة) دون تعقيد في صفحة التحويل.',
      aEn: 'All deposit and withdrawal statuses (Pending / Approved / Rejected) appear directly inside the Notifications drawer (bell icon in the top bar).',
    },
    {
      qAr: 'هل يمكن فتح نفس خطة التداول الذكي أكثر من مرة؟',
      qEn: 'Can I open the same Smart Trading plan more than once?',
      aAr: 'كل خطة استثمارية تُفتح مرة واحدة فقط لكل حساب، ولكن يمكنك تفعيل والاشتراك في أي خطة أخرى من الخطط المتاحة ($100، $200، $500، $1,000، $2,000، $3,000) في نفس الوقت.',
      aEn: 'Each plan tier can be entered once per account, while all other plan tiers remain open for activation simultaneously.',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg sm:text-xl font-bold text-white">
              {isRtl
                ? 'التراخيص الدولية، سياسة الربح، والأسئلة الشائعة'
                : 'Global Licenses, Profit Rules, FAQ & Privacy'}
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isRtl
              ? 'معلومات تنظيمية وقانونية شاملة حول تراخيص أستراليا وقبرص وأوروبا وأمريكا، ونظام التداول الذكي والدعوات.'
              : 'Comprehensive regulatory licenses (Australia, Cyprus, Europe, USA), trading rules, and FAQ.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentTab('home')}
          className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-200 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{isRtl ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </button>
      </div>

      {/* Section Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-4">
        {navTabs.map((t) => {
          const isActive = activeSection === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSection(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 text-neutral-950'
                  : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
              }`}
            >
              {t.icon}
              <span>{isRtl ? t.labelAr : t.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GLOBAL REGULATORY LICENSES (Australia, Cyprus, Europe, USA) */}
      {activeSection === 'licenses' && (
        <div className="space-y-4">
          <div className="pb-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>
                {isRtl
                  ? 'التراخيص والاعتمادات التنظيمية (أستراليا • قبرص • أوروبا • أمريكا)'
                  : 'Regulatory Licenses (Australia • Cyprus • Europe • USA)'}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {isRtl
                ? 'تعمل منصة GOLDRIX وفق أطر رقابية دولية صارمة لضمان شفافية المعاملات وحماية أموال المستثمرين بنسبة احتياطي 100%.'
                : 'GOLDRIX operates under strict international regulatory frameworks with 100% segregated client reserves.'}
            </p>
          </div>

          <div className="divide-y divide-neutral-800 border-t border-b border-neutral-800">
            {licenses.map((lic) => (
              <div key={lic.code} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-[11px] font-bold text-emerald-400">
                      {lic.code}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {isRtl ? lic.regionAr : lic.regionEn}
                    </span>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'مرخص ومفعل' : 'Verified Active'}</span>
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-300">
                    {isRtl ? lic.authorityAr : lic.authorityEn}
                  </p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isRtl ? lic.scopeAr : lic.scopeEn}
                  </p>
                </div>

                <div className="sm:text-end shrink-0">
                  <span className="text-[10px] text-neutral-400 block">
                    {isRtl ? 'رقم الترخيص والتسجيل:' : 'License / Registration No:'}
                  </span>
                  <span className="font-mono text-xs font-bold text-white bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 inline-block mt-1" dir="ltr">
                    {lic.licenseNumber}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HOW TO PROFIT FROM TRADING, SMART TRADING & REFERRALS */}
      {activeSection === 'profits' && (
        <div className="space-y-6 text-xs leading-relaxed">
          {/* 1. Smart Trading */}
          <div className="space-y-2 pb-5 border-b border-neutral-800">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {isRtl
                ? '1. سياسة الربح من التداول والتداول الذكي (تسوية كل 24 ساعة)'
                : '1. Smart Trading & Automated 24h Yield Policy'}
            </h2>
            <p className="text-neutral-300">
              {isRtl
                ? 'تعتمد خطط التداول الذكي في GOLDRIX على خوارزميات التداول الكمي والمراجحة السعرية الآلية في أسواق الذهب والنفط والسندات والأسهم بضمان كامل لرأس المال الأساسي:'
                : 'GOLDRIX Smart Trading plans execute automated quantitative strategies across Gold, Oil, Bonds, and Equities with full principal protection:'}
            </p>
            <ul className="space-y-2 text-neutral-300 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? 'عوائد يومية متدرجة حسب الفئة: تحقق كل خطة استثمارية ($100، $200، $500، $1,000، $2,000، $3,000) عائداً يومياً ثابتاً ينزل كل 24 ساعة عمل.'
                    : 'Tiered Daily Returns: Every plan tier ($100 to $3,000) yields a daily return settled every 24 hours of operation.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? 'احتساب أرباح تراكمي ثابت ومنتظم: تزداد الأرباح التراكمية بمقدار ثابت وفق نوع الخطة حتى الوصول إلى الحد اليومي المقرر، وتنزل الأرباح كل 24 ساعة إلى رصيدك المتاح للسحب.'
                    : 'Fixed-Interval Cumulative Profit: Profits accrue in fixed increments based on your plan tier up to the daily limit, settling every 24 hours to your withdrawable balance.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? 'قاعدة الدخول لمرة واحدة لكل فئة: بعد تفعيل أي خطة لا يمكن إعادة فتح نفس الفئة مجدداً، ولكن يمكنك تفعيل أي خطة من الفئات الأخرى المتاحة.'
                    : 'Single-Entry Per Tier: Each plan tier can be entered once per user, while all other tiers remain available.'}
                </span>
              </li>
            </ul>
          </div>

          {/* 2. Referrals & VIP */}
          <div className="space-y-2 pb-2">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {isRtl
                ? '2. نظام الربح من الدعوات والفريق (VIP 1 إلى VIP 7)'
                : '2. Referral & Team Rewards Program (VIP 1 to VIP 7)'}
            </h2>
            <p className="text-neutral-300">
              {isRtl
                ? 'يمنحك برنامج الشركاء والفريق مصدرين مستمرين للربح المباشر فور تسجيل أصدقائك عبر كود أو رابط الدعوة الخاص بك:'
                : 'The partner program provides two automatic income streams when friends register using your referral code or link:'}
            </p>
            <ul className="space-y-2 text-neutral-300 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? 'مكافأة الإيداع والاستثمار الفورية (+$10 لكل $100): تحصل تلقائياً على +$10 USDT تضاف فوراً لرصيدك المتاح عن كل $100 USDT يودعها أو يستثمرها العضو المدعو.'
                    : 'Instant +$10 Bonus per $100: Receive +$10 USDT directly to your available balance for every $100 USDT deposited or invested by your invitee.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? 'عمولة أرباح المدعوين (3%): تحصل على نسبة 3% من الأرباح التي يحققها أعضاء فريقك في خطط التداول الذكي، وتُضاف تلقائياً إلى رصيدك دون أي خصم من أرباح المدعو.'
                    : '3% Ongoing Profit Share: Earn a 3% commission on all smart trading profits generated by your team members.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? 'مستويات الترقية (VIP 1 – VIP 7): يظهر مستوى كل عضو (بدءاً من VIP 1) ونسبة مساهمته المئوية في قائمة الفريق، ويرتفع مستواك تلقائياً مع زيادة الدعوات وحجم نشاط الفريق.'
                    : 'VIP 1 – VIP 7 Status Badges: Each member displays their performance VIP badge and team contribution percentage.'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: DEPOSIT & WITHDRAWAL FAQ */}
      {activeSection === 'faq' && (
        <div className="space-y-3">
          <div className="pb-1">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {isRtl
                ? 'الأسئلة الشائعة حول الإيداع والسحب والخطط'
                : 'Frequently Asked Questions — Deposit, Withdrawal & Plans'}
            </h2>
          </div>

          <div className="divide-y divide-neutral-800 border-t border-b border-neutral-800">
            {faqList.map((item, idx) => (
              <div key={idx} className="py-4 space-y-1.5 text-xs">
                <h3 className="font-bold text-white text-sm">
                  {isRtl ? item.qAr : item.qEn}
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  {isRtl ? item.aAr : item.aEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PRIVACY POLICY */}
      {activeSection === 'privacy' && (
        <div className="space-y-5 text-xs leading-relaxed text-neutral-300">
          <div className="space-y-1.5 pb-4 border-b border-neutral-800">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {isRtl ? 'سياسة الخصوصية وحماية أموال وبيانات المستخدمين' : 'Privacy Policy & Client Data Protection'}
            </h2>
            <p className="text-neutral-400">
              {isRtl
                ? 'تلتزم منصة GOLDRIX بأعلى معايير الخصوصية الدولية وحماية البيانات المالية والشخصية وفق اللوائح التنظيمية في أستراليا وقبرص والاتحاد الأوروبي والولايات المتحدة.'
                : 'GOLDRIX adheres to strict global privacy and financial data protection regulations across Australia, Cyprus, the EU, and the United States.'}
            </p>
          </div>

          <div className="divide-y divide-neutral-800">
            <div className="py-3.5 space-y-1">
              <h3 className="font-bold text-white text-sm">
                {isRtl ? '1. تشفير البيانات وحماية الحسابات' : '1. Data Encryption & Account Security'}
              </h3>
              <p>
                {isRtl
                  ? 'يتم تشفير جميع البيانات الشخصية ووثائق التحقق من الهوية (KYC) وكلمات المرور باستخدام خوارزميات تشفير متقدمة (AES-256) واتصالات آمنة (TLS 1.3)، ولا يتم بيع أو مشاركة بيانات العملاء مع أي جهات خارجية.'
                  : 'All personal data, KYC documents, and credentials are encrypted at rest (AES-256) and in transit (TLS 1.3) and are never sold or shared with third parties.'}
              </p>
            </div>

            <div className="py-3.5 space-y-1">
              <h3 className="font-bold text-white text-sm">
                {isRtl ? '2. فصل الأرصدة واحتياطي الأمان 100%' : '2. 100% Segregated Reserves & Ledger Integrity'}
              </h3>
              <p>
                {isRtl
                  ? 'تُحفظ جميع إيداعات المستخدمين (USDT TRC20) في حسابات ومحافظ باردة منفصلة بالكامل عن أموال التشغيل الخاصة بالمنصة بنسبة احتياطي 100%، وتُوثق كل عملية إيداع أو سحب أو ربح عبر نظام محاسبي مزدوج القيد.'
                  : 'All client USDT TRC20 holdings are stored in segregated cold-storage reserves at a 1:1 ratio and tracked via an immutable double-entry ledger.'}
              </p>
            </div>

            <div className="py-3.5 space-y-1">
              <h3 className="font-bold text-white text-sm">
                {isRtl ? '3. سياسة التحقق (KYC) ومكافحة غسل الأموال (AML)' : '3. KYC & Anti-Money Laundering (AML) Compliance'}
              </h3>
              <p>
                {isRtl
                  ? 'تُستخدم بيانات توثيق الهوية حصرياً للتحقق من ملكية الحساب عند طلب السحب والامتثال لمتطلبات مكافحة الاحتيال وغسل الأموال الدولية (ASIC / CySEC / EU GDPR / FinCEN).'
                  : 'Identity verification (KYC) records are used strictly to authorize account withdrawals and comply with international AML/CTF standards.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
