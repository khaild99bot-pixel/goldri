/**
 * GOLDRIX Financial Platform - Core Type Definitions
 */

export type UserRole = 'USER' | 'ADMIN' | 'COMPLIANCE';

export type KYCStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';

export interface User {
  id: string;
  email: string;
  phone?: string;
  country?: string;
  countryCode?: string;
  dialCode?: string;
  fullName: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  kycStatus: KYCStatus;
  createdAt: string;
  lastLoginAt: string;
  twoFactorEnabled: boolean;
  language: 'en' | 'ar' | 'tr' | 'fr' | 'es' | 'de' | 'ru' | 'zh';
  isEmailVerified?: boolean;
  emailVerifiedAt?: string;
  isPhoneVerified?: boolean;
  phoneVerifiedAt?: string;
  vipTier?: number;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralEarningsUSDT?: string;
  referralProfitShareUSDT?: string;
  avatarUrl?: string;
  firebaseUid?: string;
  resendNotifyEmail?: string;
  kycAutoApproveAt?: string;
}

export type AssetSymbol = 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'PAXG' | 'BNB' | 'XRP' | 'XAU' | string;

export type AccountType = 'AVAILABLE' | 'RESERVED' | 'INVESTED' | 'FEE' | 'PLATFORM_RESERVE';

export interface LedgerAccount {
  id: string;
  userId: string;
  type: AccountType;
  asset: AssetSymbol;
  balance: string; // Fixed precision 8-decimal string
  updatedAt: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL_LOCK'
  | 'WITHDRAWAL_CONFIRM'
  | 'WITHDRAWAL_REFUND'
  | 'INVESTMENT_ALLOCATE'
  | 'INVESTMENT_RETURN'
  | 'FEE_PAYMENT'
  | 'ADMIN_ADJUSTMENT'
  | 'REFERRAL_BONUS'
  | 'REFERRAL_PROFIT_SHARE'
  | 'SWAP';

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: string; // Fixed-precision string
  balanceAfter: string;
  createdAt: string;
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  amount: string;
  asset: AssetSymbol;
  referenceId?: string;
  description: string;
  status: 'POSTED' | 'FAILED' | 'REVERSED';
  timestamp: string;
  entries: LedgerEntry[];
}

export type RiskClassification = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HIGH_VOLATILITY';

export type PlanStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT';

export interface InvestmentPlan {
  id: string;
  name: string;
  description: string;
  asset: AssetSymbol;
  strategyType: 'MOMENTUM_ALPHA' | 'ARBITRAGE_NEUTRAL' | 'QUANT_TREND' | 'YIELD_HARVEST' | 'AI_HIGH_FREQUENCY';
  riskLevel: RiskClassification;
  minAmount: string;
  maxAmount: string;
  isFixedAmount: boolean;
  fixedAmount: string;
  durationDays: number;
  estimatedAprMin: number;
  estimatedAprMax: number;
  managementFeePercent: number;
  performanceFeePercent: number;
  status: PlanStatus;
  historicalWinRate: number;
  totalInvestors: number;
  totalAUM: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface UserInvestment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  asset: AssetSymbol;
  initialAmount: string;
  currentValuation: string;
  realizedPnl: string;
  unrealizedPnl: string;
  claimedPnl?: string;
  dailyProfitUSDT?: string;
  startTime: string; // ISO UTC
  scheduledEndTime: string; // ISO UTC
  durationDays: number;
  status: InvestmentStatus;
  lastReconciledAt: string;
  aprAtActivation: number;
}

export type DepositStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'FAILED';

export interface Deposit {
  id: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  userPhone?: string;
  asset: AssetSymbol;
  network: string; // e.g., 'TRON (TRC20)', 'Ethereum (ERC20)', 'Solana (SPL)'
  depositAddress: string;
  amount: string;
  txHash?: string;
  confirmations: number;
  requiredConfirmations: number;
  status: DepositStatus;
  createdAt: string;
  confirmedAt?: string;
}

export type WithdrawalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED';

export interface Withdrawal {
  id: string;
  userId: string;
  asset: AssetSymbol;
  network: string;
  destinationAddress: string;
  amount: string;
  feePercent?: number;
  feeAmount: string;
  netAmount: string;
  status: WithdrawalStatus;
  txHash?: string;
  reviewReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type KYCDocumentType = 'PASSPORT' | 'NATIONAL_ID' | 'RESIDENCE_PERMIT' | 'DRIVERS_LICENSE' | 'UTILITY_BILL';

export interface KYCFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: KYCDocumentType;
  side?: 'FRONT' | 'BACK';
  fileDataUrl?: string;
  uploadedAt: string;
}

export interface KYCSubmission {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  documentType: 'PASSPORT' | 'NATIONAL_ID' | 'RESIDENCE_PERMIT' | 'DRIVERS_LICENSE';
  documentNumber: string;
  country: string;
  dateOfBirth: string;
  frontFileDataUrl?: string;
  backFileDataUrl?: string;
  files: KYCFile[];
  status: KYCStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  autoApproveAt?: string;
  processingDurationSeconds?: number;
}

export interface Candle {
  time: number; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketTicker {
  symbol: string; // e.g. "BTC/USDT"
  baseAsset: AssetSymbol;
  quoteAsset: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: string;
  candles: Candle[];
}

export interface UserBalances {
  available: Record<AssetSymbol, string>;
  reserved: Record<AssetSymbol, string>;
  invested: Record<AssetSymbol, string>;
  totalEstimatedUSDT: string;
  totalInvestedUSDT: string;
  totalRealizedPnlUSDT: string;
  totalUnrealizedPnlUSDT: string;
  withdrawableUSDT?: string;
  frozenDepositUSDT?: string;
  totalFrozenCapitalUSDT?: string;
  dailyProfitRateUSDT?: string;
  firstWithdrawalUnlockAt?: string;
  isFirstWithdrawalLocked?: boolean;
  firstWithdrawalRemainingSeconds?: number;
  hasPreviousWithdrawal?: boolean;
}

export interface SupportMessage {
  id: string;
  sender: 'USER' | 'STAFF';
  senderName: string;
  content: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  category: 'BILLING' | 'ACCOUNT' | 'INVESTMENT' | 'KYC' | 'SECURITY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'SECURITY' | 'DEPOSIT' | 'WITHDRAWAL' | 'INVESTMENT' | 'KYC' | 'SYSTEM';
  read: boolean;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'USER' | 'INVESTMENT_PLAN' | 'WITHDRAWAL' | 'DEPOSIT' | 'KYC' | 'SYSTEM';
  targetId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface VerificationCodeRecord {
  id: string;
  target: string; // normalized email or phone number
  channel: 'EMAIL' | 'PHONE';
  code: string;
  userId?: string;
  attempts: number;
  maxAttempts: number;
  sendCount: number;
  maxSends: number;
  lastSentAt: number;
  deliveredVia: string;
  verified?: boolean;
  verifiedAt?: string;
  createdAt: string;
  expiresAt: number;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  simulationMode: boolean;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
  marketDataLive: boolean;
  smsGatewayConfigured: boolean;
  emailGatewayConfigured: boolean;
  blockchainGatewayConfigured: boolean;
  platformReserveUSDT: string;
  usdtDepositAddress?: string;
  usdtErc20DepositAddress?: string;
  usdtBep20DepositAddress?: string;
  btcDepositAddress?: string;
  ethDepositAddress?: string;
  bnbDepositAddress?: string;
  // Real Email Gateway Config (SMTP / Resend / Brevo)
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  resendApiKey?: string;
  resendNotifyEmail?: string;
  brevoApiKey?: string;
  // Real SMS Gateway Config (Twilio / Custom HTTP SMS)
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  twilioVerifySid?: string;
  smsApiUrl?: string;
  smsApiKey?: string;
}

export interface EmailMessageRecord {
  id: string;
  to: string;
  from: string;
  subject: string;
  category: 'OTP' | 'DEPOSIT' | 'WITHDRAWAL' | 'ACCOUNT' | 'SUPPORT' | 'TEST' | 'INBOUND';
  bodyText: string;
  bodyHtml?: string;
  provider: string;
  delivered: boolean;
  userId?: string;
  createdAt: string;
  error?: string;
}

export interface TradingBot {
  id: string;
  name: string;
  strategy: string;
  pair: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  runtimeHours: number;
  totalTrades: number;
  winRate: number;
  profitUSDT: number;
  currentProfitPct: number;
  allocatedUSDT: number;
  startedAt: string;
  countdownSeconds: number;
  candles: Candle[];
  indicators: {
    rsi: number;
    macd: string;
    trend: string;
  };
}

