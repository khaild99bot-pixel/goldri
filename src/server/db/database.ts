/**
 * GOLDRIX In-Memory & Persistent Storage Engine
 * Features:
 * - Thread-safe atomic updates
 * - Full double-entry ledger integration
 * - Realistic crypto market data generator with live OHLCV candlestick historical arrays
 * - Complete seed data for Admin, Investor, Plans, KYC, and Transactions
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import type {
  AdminAuditLog,
  AppNotification,
  AssetSymbol,
  Deposit,
  InvestmentPlan,
  KYCSubmission,
  LedgerAccount,
  LedgerTransaction,
  MarketTicker,
  SupportTicket,
  SystemSettings,
  User,
  UserInvestment,
  VerificationCodeRecord,
  Withdrawal,
} from '../../types/index.ts';
import {
  addDecimals,
  LedgerEngine,
  subDecimals,
  toFixedDecimal,
} from '../ledger.ts';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'goldrix_store.json');

export function hashPassword(password: string, salt: string = 'goldrix_salt_2026'): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
}

export interface DatabaseState {
  users: Record<string, User & { passwordHash: string; salt: string }>;
  accounts: Record<string, LedgerAccount>;
  transactions: LedgerTransaction[];
  investmentPlans: Record<string, InvestmentPlan>;
  investments: Record<string, UserInvestment>;
  deposits: Record<string, Deposit>;
  withdrawals: Record<string, Withdrawal>;
  kycSubmissions: Record<string, KYCSubmission>;
  supportTickets: Record<string, SupportTicket>;
  notifications: AppNotification[];
  auditLogs: AdminAuditLog[];
  systemSettings: SystemSettings;
  marketData: Record<string, MarketTicker>;
  bots: Record<string, import('../../types/index.ts').TradingBot>;
  verificationCodes: Record<string, VerificationCodeRecord>;
  emailMessages?: import('../../types/index.ts').EmailMessageRecord[];
}

export class Database {
  private static instance: Database;
  private state: DatabaseState;
  private isSaving: boolean = false;
  private pgPool: pg.Pool | null = null;
  private pgConnected: boolean = false;

  private lastBrevoSyncMs: number = 0;
  private isBrevoSyncing: boolean = false;

  private constructor() {
    this.state = this.loadOrSeedDatabase();
    this.saveToDisk();
    this.startBackgroundReconciler();
    setTimeout(() => {
      this.syncMembersFromBrevoArchive(true).catch(() => {});
    }, 1500);
    setInterval(() => {
      this.triggerNonBlockingBrevoSync();
    }, 20000);
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public isPostgresConnected(): boolean {
    return this.pgConnected;
  }

  public triggerNonBlockingBrevoSync(): void {
    if (this.isBrevoSyncing) return;
    if (Date.now() - this.lastBrevoSyncMs < 12000) return;
    this.syncMembersFromBrevoArchive(false).catch(() => {});
  }

  public async syncMembersFromBrevoArchive(forceAll: boolean = false): Promise<{
    recoveredUsersCount: number;
    recoveredDepositsCount: number;
    recoveredWithdrawalsCount: number;
    totalMembersCount: number;
  }> {
    if (this.isBrevoSyncing && !forceAll) {
      return {
        recoveredUsersCount: 0,
        recoveredDepositsCount: 0,
        recoveredWithdrawalsCount: 0,
        totalMembersCount: Object.values(this.state.users).filter((u) => u.role === 'USER').length,
      };
    }
    this.isBrevoSyncing = true;
    this.lastBrevoSyncMs = Date.now();

    let recoveredUsersCount = 0;
    let recoveredDepositsCount = 0;
    let recoveredWithdrawalsCount = 0;
    const brevoKey = (
      process.env.BREVO_API_KEY ||
      this.state.systemSettings?.brevoApiKey ||
      ''
    ).trim();

    if (brevoKey) {
      try {
        const res = await fetch(
          'https://api.brevo.com/v3/smtp/emails?email=hha253ee%40gmail.com&limit=100',
          {
            headers: {
              'api-key': brevoKey,
              accept: 'application/json',
            },
          }
        );
        if (res.ok) {
          const json = (await res.json()) as any;
          const items: any[] = json?.transactionalEmails || [];
          const assets: AssetSymbol[] = ['USDT', 'BTC', 'ETH', 'SOL', 'PAXG', 'BNB'];
          const archiveSalt = 'goldrix_restored_archive';
          const archiveDefaultHash = hashPassword('RestoredMember2026!', archiveSalt);

          const chronologicalItems = items.slice().reverse();
          for (const item of chronologicalItems) {
            const subj = String(item?.subject || '');
            if (subj.includes('رمز التحقق') || subj.includes('رمز استعادة')) continue;

            const createdIso = item.date
              ? new Date(item.date).toISOString()
              : new Date().toISOString();

            // 1. Fast-path: Replay Admin Ledger Sync events directly from subject line (0 extra API calls)
            if (subj.includes('GOLDRIX_SYNC|')) {
              this.applyAdminSyncSubject(subj, createdIso);
              continue;
            }

            // 2. Fast-path: Parse embedded metadata [UID:...|NAME:...|NET:...] from deposit/withdrawal subjects
            const metaUid = subj.match(/\[UID:([^|\]]+)/)?.[1]?.trim();
            const metaName = subj.match(/\|NAME:([^|\]]+)/)?.[1]?.trim();
            const metaNet = subj.match(/\|NET:([^|\]]+)/)?.[1]?.trim();
            const metaAddr = subj.match(/\|ADDR:([^|\]]+)/)?.[1]?.trim();

            const idMatch = subj.match(/\(ID:\s*([^)]+)\)/);
            const ordMatch = subj.match(/\(ORD-(\d+)\)/);
            const wthSubjMatch = subj.match(/\((wth_[a-zA-Z0-9_]+|WDR-\d+)\)/);

            if (ordMatch && metaUid && !this.state.deposits[`ORD-${ordMatch[1]}`]) {
              const depId = `ORD-${ordMatch[1]}`;
              const amtMatch = subj.match(/\$([0-9.]+)/);
              const amount = amtMatch ? Number(amtMatch[1]).toFixed(2) : '500.00';
              const resolvedUid = metaUid === '100001' ? 'usr_admin_chief' : metaUid;
              const u = this.getUserById(resolvedUid) || this.state.users[resolvedUid];
              const netStr = metaNet || 'USDT (TRON TRC20)';
              this.state.deposits[depId] = {
                id: depId,
                userId: u?.id || resolvedUid,
                userFullName: u?.fullName || metaName || 'عضو مسجل',
                userPhone: u?.phone || '',
                userEmail: u?.email || '',
                asset: 'USDT',
                network: netStr,
                depositAddress: netStr.includes('ERC20')
                  ? '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a'
                  : 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
                amount,
                txHash: `0x${ordMatch[1].toLowerCase()}a9f8c2e1b4d058`,
                confirmations: 1,
                requiredConfirmations: 12,
                status: 'PENDING_REVIEW',
                createdAt: createdIso,
              } as any;
              recoveredDepositsCount++;
              continue;
            }

            if (wthSubjMatch && metaUid && !this.state.withdrawals[wthSubjMatch[1]]) {
              const wthId = wthSubjMatch[1];
              const amtMatch = subj.match(/\$([0-9.]+)/);
              const amtNum = amtMatch ? Number(amtMatch[1]) : 100;
              const resolvedUid = metaUid === '100001' ? 'usr_admin_chief' : metaUid;
              const u = this.getUserById(resolvedUid) || this.state.users[resolvedUid];
              const feeRate = amtNum >= 500 ? 0.03 : amtNum >= 300 ? 0.04 : amtNum >= 100 ? 0.05 : amtNum >= 50 ? 0.07 : 0.08;
              const feePercent = Math.round(feeRate * 100);
              const feeNum = Number((amtNum * feeRate).toFixed(2));
              const netNum = Math.max(0, Number((amtNum - feeNum).toFixed(2)));
              this.state.withdrawals[wthId] = {
                id: wthId,
                userId: u?.id || resolvedUid,
                userFullName: u?.fullName || metaName || 'عضو مسجل',
                userEmail: u?.email || '',
                asset: 'USDT',
                network: metaNet || 'USDT (TRON TRC20)',
                destinationAddress: metaAddr || 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
                amount: toFixedDecimal(amtNum),
                feePercent,
                feeAmount: toFixedDecimal(feeNum),
                netAmount: toFixedDecimal(netNum),
                status: 'PENDING_REVIEW',
                createdAt: createdIso,
              } as any;
              recoveredWithdrawalsCount++;
              continue;
            }

            if (idMatch && this.state.users[idMatch[1].trim()] && !ordMatch && !wthSubjMatch) continue;
            if (ordMatch && this.state.deposits[`ORD-${ordMatch[1]}`]) continue;
            if (wthSubjMatch && this.state.withdrawals[wthSubjMatch[1]]) continue;

            try {
              await new Promise((r) => setTimeout(r, 120));
              const detRes = await fetch(
                `https://api.brevo.com/v3/smtp/emails/${item.uuid}`,
                {
                  headers: {
                    'api-key': brevoKey,
                    accept: 'application/json',
                  },
                }
              );

              let clean = '';
              if (detRes.ok) {
                const rawTxt = await detRes.text();
                if (rawTxt && rawTxt.trim().startsWith('{')) {
                  const det = JSON.parse(rawTxt);
                  clean = String(det?.body || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                }
              }

              const accMatch = clean.match(
                /الاسم:\s*(.+?)\s+أيدي العميل:\s*(\d+)\s+البريد الإلكتروني:\s*([^\s]+)/
              );
              if (accMatch) {
                const [, fullName, uid, email] = accMatch;
                if (!this.state.users[uid]) {
                  this.state.users[uid] = {
                    id: uid,
                    email: email.trim().toLowerCase(),
                    fullName: fullName.trim(),
                    country: 'Saudi Arabia',
                    countryCode: 'SA',
                    dialCode: '+966',
                    isEmailVerified: true,
                    emailVerifiedAt: createdIso,
                    isPhoneVerified: false,
                    role: 'USER',
                    status: 'ACTIVE',
                    kycStatus: 'NOT_SUBMITTED',
                    createdAt: createdIso,
                    lastLoginAt: createdIso,
                    twoFactorEnabled: false,
                    language: 'ar',
                    passwordHash: archiveDefaultHash,
                    salt: archiveSalt,
                    referralCode: 'GOLD' + uid.slice(-4),
                    referralCount: 0,
                    referralEarningsUSDT: '0.00',
                    referralProfitShareUSDT: '0.00',
                  };
                  for (const asset of assets) {
                    const availId = `acc_${uid}_${asset}_AVAILABLE`;
                    const resId = `acc_${uid}_${asset}_RESERVED`;
                    const invId = `acc_${uid}_${asset}_INVESTED`;
                    if (!this.state.accounts[availId]) {
                      this.state.accounts[availId] = {
                        id: availId,
                        userId: uid,
                        type: 'AVAILABLE',
                        asset,
                        balance: '0.00000000',
                        updatedAt: createdIso,
                      };
                    }
                    if (!this.state.accounts[resId]) {
                      this.state.accounts[resId] = {
                        id: resId,
                        userId: uid,
                        type: 'RESERVED',
                        asset,
                        balance: '0.00000000',
                        updatedAt: createdIso,
                      };
                    }
                    if (!this.state.accounts[invId]) {
                      this.state.accounts[invId] = {
                        id: invId,
                        userId: uid,
                        type: 'INVESTED',
                        asset,
                        balance: '0.00000000',
                        updatedAt: createdIso,
                      };
                    }
                  }
                  recoveredUsersCount++;
                }
              }

              const depMatch = clean.match(
                /العميل:\s*(.+?)\s*\(ID:\s*([^)]+)\)\s*رقم الطلب:\s*(ORD-\d+)\s*المبلغ:\s*\$([0-9.]+)\s*([A-Z]+)\s*الشبكة:\s*(.+?)\s*تم الإرسال/
              );
              if (depMatch) {
                const [, fullName, rawUserId, depId, amount, asset, network] = depMatch;
                const cleanUid = rawUserId.trim() === '100001' ? 'usr_admin_chief' : rawUserId.trim();
                if (!this.state.deposits[depId]) {
                  const u = this.getUserById(cleanUid) || this.state.users[cleanUid];
                  this.state.deposits[depId] = {
                    id: depId,
                    userId: u?.id || cleanUid,
                    userFullName: u?.fullName || fullName.trim(),
                    userPhone: u?.phone || '',
                    userEmail: u?.email || '',
                    asset: (asset.trim() as AssetSymbol) || 'USDT',
                    network: network.trim(),
                    depositAddress: network.includes('ERC20')
                      ? '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a'
                      : 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
                    amount: Number(amount).toFixed(2),
                    txHash: `0x${depId.replace('ORD-', '').toLowerCase()}a9f8c2e1b4d058`,
                    confirmations: 1,
                    requiredConfirmations: 12,
                    status: 'PENDING_REVIEW',
                    createdAt: createdIso,
                  } as any;
                  recoveredDepositsCount++;
                }
              } else if (ordMatch && !this.state.deposits[`ORD-${ordMatch[1]}`]) {
                const depId = `ORD-${ordMatch[1]}`;
                const amtMatch = subj.match(/\$([0-9.]+)/);
                const amount = amtMatch ? Number(amtMatch[1]).toFixed(2) : '500.00';
                this.state.deposits[depId] = {
                  id: depId,
                  userId: 'usr_admin_chief',
                  userFullName: 'عضو مسجل',
                  userPhone: '',
                  userEmail: '',
                  asset: 'USDT',
                  network: 'USDT (TRON TRC20)',
                  depositAddress: 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
                  amount,
                  txHash: `0x${ordMatch[1].toLowerCase()}a9f8c2e1b4d058`,
                  confirmations: 1,
                  requiredConfirmations: 12,
                  status: 'PENDING_REVIEW',
                  createdAt: createdIso,
                } as any;
                recoveredDepositsCount++;
              }

              // Recover Withdrawal Requests from Brevo emails
              const wthMatch = clean.match(
                /العميل:\s*(.+?)\s*\(ID:\s*([^)]+)\)\s*المبلغ:\s*\$([0-9.]+)\s*([A-Z]+)\s*الشبكة:\s*(.+?)\s*العنوان:\s*([^\s]+)\s*تم الإرسال/
              );
              if (wthMatch && wthSubjMatch) {
                const [, fullName, rawUserId, amountStr, asset, network, destAddr] = wthMatch;
                const wthId = wthSubjMatch[1];
                const cleanUid = rawUserId.trim() === '100001' ? 'usr_admin_chief' : rawUserId.trim();
                if (!this.state.withdrawals[wthId]) {
                  const u = this.getUserById(cleanUid) || this.state.users[cleanUid];
                  const amtNum = Number(amountStr) || 0;
                  const feeRate = amtNum >= 500 ? 0.03 : amtNum >= 300 ? 0.04 : amtNum >= 100 ? 0.05 : amtNum >= 50 ? 0.07 : 0.08;
                  const feePercent = Math.round(feeRate * 100);
                  const feeNum = Number((amtNum * feeRate).toFixed(2));
                  const netNum = Math.max(0, Number((amtNum - feeNum).toFixed(2)));
                  this.state.withdrawals[wthId] = {
                    id: wthId,
                    userId: u?.id || cleanUid,
                    userFullName: u?.fullName || fullName.trim(),
                    userEmail: u?.email || '',
                    asset: (asset.trim() as AssetSymbol) || 'USDT',
                    network: network.trim(),
                    destinationAddress: destAddr.trim(),
                    amount: toFixedDecimal(amtNum),
                    feePercent,
                    feeAmount: toFixedDecimal(feeNum),
                    netAmount: toFixedDecimal(netNum),
                    status: 'PENDING_REVIEW',
                    createdAt: createdIso,
                  } as any;
                  recoveredWithdrawalsCount++;
                }
              }
            } catch {
              // ignore individual email fetch failure
            }
          }
        }
      } catch (err) {
        console.warn('[DB] Brevo archive sync warning:', err);
      }
    }

    this.ensureChiefAdminAndReferrals(this.state);
    this.saveToDisk();
    this.isBrevoSyncing = false;

    const totalMembersCount = Object.values(this.state.users).filter(
      (u) => u.role === 'USER'
    ).length;

    return {
      recoveredUsersCount,
      recoveredDepositsCount,
      recoveredWithdrawalsCount,
      totalMembersCount,
    };
  }

  public async initPostgres(): Promise<void> {
    const connStr = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
    if (!connStr) {
      console.log('[DB] No DATABASE_URL detected — running with persistent local file store.');
      return;
    }

    try {
      const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1');
      this.pgPool = new pg.Pool({
        connectionString: connStr,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS goldrix_store (
          id TEXT PRIMARY KEY,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS otp_verifications (
          target_key TEXT PRIMARY KEY,
          id TEXT NOT NULL,
          target TEXT NOT NULL,
          channel TEXT NOT NULL,
          code TEXT NOT NULL,
          user_id TEXT,
          attempts INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 5,
          send_count INTEGER NOT NULL DEFAULT 1,
          max_sends INTEGER NOT NULL DEFAULT 3,
          last_sent_at BIGINT NOT NULL,
          delivered_via TEXT NOT NULL,
          verified BOOLEAN NOT NULL DEFAULT FALSE,
          verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_verification_status (
          user_id TEXT PRIMARY KEY,
          email TEXT,
          phone TEXT,
          is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          email_verified_at TIMESTAMPTZ,
          is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
          phone_verified_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      const res = await this.pgPool.query(
        `SELECT state FROM goldrix_store WHERE id = 'main_state' LIMIT 1;`
      );

      if (res.rows.length > 0 && res.rows[0].state && res.rows[0].state.users) {
        const loadedState = res.rows[0].state as DatabaseState;
        this.ensureChiefAdminAndReferrals(loadedState);
        this.state = loadedState;
        this.pgConnected = true;
        console.log('[DB] Connected to PostgreSQL (Render DB) and loaded existing platform state.');
      } else {
        await this.pgPool.query(
          `INSERT INTO goldrix_store (id, state, updated_at)
           VALUES ('main_state', $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW();`,
          [JSON.stringify(this.state)]
        );
        this.pgConnected = true;
        console.log('[DB] Connected to PostgreSQL (Render DB) and initialized schema with seed state.');
      }

      // Sync active OTP records from PostgreSQL table into memory
      const otpRows = await this.pgPool.query(
        `SELECT * FROM otp_verifications WHERE expires_at > $1;`,
        [Date.now()]
      );
      if (!this.state.verificationCodes) {
        this.state.verificationCodes = {};
      }
      for (const row of otpRows.rows) {
        this.state.verificationCodes[row.target_key] = {
          id: row.id,
          target: row.target,
          channel: row.channel as 'EMAIL' | 'PHONE',
          code: row.code,
          userId: row.user_id || undefined,
          attempts: Number(row.attempts || 0),
          maxAttempts: Number(row.max_attempts || 5),
          sendCount: Number(row.send_count || 1),
          maxSends: Number(row.max_sends || 3),
          lastSentAt: Number(row.last_sent_at || Date.now()),
          deliveredVia: row.delivered_via,
          verified: Boolean(row.verified),
          verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          expiresAt: Number(row.expires_at),
        };
      }
    } catch (err: any) {
      console.error('[DB] PostgreSQL connection warning (falling back to file store):', err?.message || err);
      this.pgConnected = false;
    }
  }

  public applyAdminSyncSubject(subj: string, createdIso: string = new Date().toISOString()): void {
    // Format: GOLDRIX_SYNC|ACTION|TARGET_ID|USER_ID|AMOUNT|EXTRA (may be prefixed with [إشعار إدارة GOLDRIX])
    const idx = subj.indexOf('GOLDRIX_SYNC|');
    if (idx === -1) return;
    const syncPart = subj.slice(idx);
    const parts = syncPart.split('|').map((s) => s.trim());
    const [, action, targetId, rawUserId, amountStr, extra] = parts;
    if (!action || !targetId) return;
    const userId = rawUserId === '100001' ? 'usr_admin_chief' : (rawUserId || 'usr_admin_chief');

    try {
      if (action === 'APPROVE_DEPOSIT') {
        const existing = this.state.deposits[targetId];
        if (existing && existing.status === 'CONFIRMED') return;
        const amt = Number(amountStr || existing?.amount || 0).toFixed(2);
        const asset = ((extra || existing?.asset || 'USDT') as AssetSymbol);
        const net = existing?.network || 'USDT (TRON TRC20)';
        const uid = existing?.userId || userId;
        this.confirmDeposit(uid, asset, net, amt, existing?.txHash, targetId);
      } else if (action === 'REJECT_DEPOSIT') {
        const existing = this.state.deposits[targetId];
        if (existing && existing.status !== 'CONFIRMED') {
          existing.status = 'FAILED';
        }
      } else if (action === 'ADJUST_BALANCE') {
        const alreadyApplied = (this.state.auditLogs || []).some(
          (l) => l.targetId === targetId || (l.details && l.details.includes(targetId))
        );
        if (alreadyApplied) return;
        const mode = (extra === 'DEBIT' || extra === 'RESET' ? extra : 'CREDIT') as 'CREDIT' | 'DEBIT' | 'RESET';
        this.adjustUserBalance(userId, 'usr_admin_chief', mode, amountStr || '0', `Sync ${targetId}`);
      } else if (action === 'APPROVE_WITHDRAWAL') {
        const wth = this.state.withdrawals[targetId];
        if (wth && wth.status === 'PENDING_REVIEW') {
          this.approveWithdrawal(targetId, 'usr_admin_chief');
        }
      } else if (action === 'REJECT_WITHDRAWAL') {
        const wth = this.state.withdrawals[targetId];
        if (wth && wth.status === 'PENDING_REVIEW') {
          this.rejectWithdrawal(targetId, 'usr_admin_chief', extra || 'مرفوض من الإدارة');
        }
      }
    } catch (err) {
      console.warn('[DB] Admin sync replay warning:', err);
    }
  }

  private savePending: boolean = false;

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(DB_FILE, serialized, 'utf-8');

      if (this.pgPool && this.pgConnected) {
        this.pgPool
          .query(
            `INSERT INTO goldrix_store (id, state, updated_at)
             VALUES ('main_state', $1::jsonb, NOW())
             ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW();`,
            [serialized]
          )
          .catch((pgErr) => {
            console.error('[DB] PostgreSQL async sync warning:', pgErr?.message || pgErr);
          });
      }
    } catch (err) {
      console.error('[DB] Failed to persist data to disk:', err);
    }
  }

  private loadOrSeedDatabase(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.accounts && parsed.investmentPlans && parsed.investmentPlans.plan_100 && parsed.bots) {
          console.log('[DB] Loaded existing persistent store from disk.');
          this.ensureChiefAdminAndReferrals(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[DB] Could not load existing DB file, seeding fresh database:', e);
    }

    console.log('[DB] Seeding new GOLDRIX database with production-grade data...');
    return this.createSeedState();
  }

  private ensureChiefAdminAndReferrals(state: DatabaseState): void {
    const salt = 'goldrix_secure_2026';
    const chiefEmail = 'hha253ee@gmail.com';
    let chief = Object.values(state.users).find((u) => u.email.toLowerCase() === chiefEmail.toLowerCase());

    if (!chief) {
      chief = {
        id: 'usr_admin_chief',
        email: chiefEmail,
        phone: '+966 50 123 4567',
        fullName: 'مدير المنصة (Chief Director)',
        role: 'ADMIN',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
        lastLoginAt: new Date().toISOString(),
        twoFactorEnabled: true,
        language: 'ar',
        passwordHash: hashPassword('Admin@2026!', salt),
        salt,
        referralCode: 'GOLD777',
        referralCount: 0,
        referralEarningsUSDT: '0.00',
        referralProfitShareUSDT: '0.00',
      };
      state.users[chief.id] = chief;
    } else {
      chief.role = 'ADMIN';
      chief.kycStatus = 'APPROVED';
      if (!chief.salt) chief.salt = salt;
      if (!chief.passwordHash) chief.passwordHash = hashPassword('Admin@2026!', chief.salt);
      if (!chief.referralCode) chief.referralCode = 'GOLD777';
    }

    // Ensure accounts for chief AND platform reserve/fee accounts
    const assets: AssetSymbol[] = ['USDT', 'BTC', 'ETH', 'SOL', 'PAXG', 'BNB'];
    const nowIso = new Date().toISOString();
    for (const asset of assets) {
      const reserveId = `acc_platform_reserve_${asset}`;
      const feeId = `acc_platform_fee_${asset}`;
      if (!state.accounts[reserveId] || Number(state.accounts[reserveId].balance || 0) < 10000000) {
        state.accounts[reserveId] = {
          id: reserveId,
          userId: 'SYSTEM',
          type: 'SYSTEM_RESERVE',
          asset,
          balance: '1000000000.00000000',
          updatedAt: nowIso,
        };
      }
      if (!state.accounts[feeId]) {
        state.accounts[feeId] = {
          id: feeId,
          userId: 'SYSTEM',
          type: 'FEE_COLLECTION',
          asset,
          balance: '0.00000000',
          updatedAt: nowIso,
        };
      }

      const availId = `acc_${chief.id}_${asset}_AVAILABLE`;
      const resId = `acc_${chief.id}_${asset}_RESERVED`;
      const invId = `acc_${chief.id}_${asset}_INVESTED`;

      if (!state.accounts[availId]) {
        state.accounts[availId] = {
          id: availId,
          userId: chief.id,
          type: 'AVAILABLE',
          asset,
          balance: '0.00000000',
          updatedAt: nowIso,
        };
      }
      if (!state.accounts[resId]) {
        state.accounts[resId] = {
          id: resId,
          userId: chief.id,
          type: 'RESERVED',
          asset,
          balance: '0.00000000',
          updatedAt: nowIso,
        };
      }
      if (!state.accounts[invId]) {
        state.accounts[invId] = {
          id: invId,
          userId: chief.id,
          type: 'INVESTED',
          asset,
          balance: '0.00000000',
          updatedAt: nowIso,
        };
      }
    }

    // Clean up any fake welcome or seed transactions and simulated users
    state.transactions = (state.transactions || []).filter(
      (tx) =>
        !tx.id.startsWith('tx_welcome_') &&
        !tx.id.startsWith('tx_seed_') &&
        !JSON.stringify(tx.entries || []).includes('usr_investor_01') &&
        !JSON.stringify(tx.entries || []).includes('usr_inv_')
    );

    if (state.deposits) {
      delete state.deposits['dep_01'];
      delete state.deposits['dep_02'];
      for (const [depId, dep] of Object.entries(state.deposits)) {
        if (dep.userId === 'usr_investor_01' || dep.userId?.startsWith('usr_inv_')) {
          delete state.deposits[depId];
        }
      }
    }
    if (state.withdrawals) {
      delete state.withdrawals['wth_01'];
      for (const [wthId, wth] of Object.entries(state.withdrawals)) {
        if (wth.userId === 'usr_investor_01' || wth.userId?.startsWith('usr_inv_')) {
          delete state.withdrawals[wthId];
        }
      }
    }
    if (state.notifications) {
      state.notifications = state.notifications.filter(
        (n) => n.userId !== 'usr_investor_01' && !n.userId?.startsWith('usr_inv_')
      );
    }
    if (state.investments) {
      delete state.investments['inv_01'];
      delete state.investments['inv_02'];
      for (const [invId, inv] of Object.entries(state.investments)) {
        if (inv.userId === 'usr_investor_01' || inv.userId?.startsWith('usr_inv_')) {
          delete state.investments[invId];
        }
      }
    }
    if (state.kycSubmissions) {
      delete state.kycSubmissions['kyc_elena'];
      delete state.kycSubmissions['kyc_pending_user'];
      for (const [, sub] of Object.entries(state.kycSubmissions)) {
        const sAny = sub as any;
        // Deduplicate base64 strings inside files array to keep payload fast and lightweight
        if (Array.isArray(sAny.files)) {
          for (const f of sAny.files) {
            if (f && f.fileDataUrl) {
              if (!sAny.frontFileDataUrl && f.side !== 'BACK') {
                sAny.frontFileDataUrl = f.fileDataUrl;
              } else if (!sAny.backFileDataUrl && f.side === 'BACK') {
                sAny.backFileDataUrl = f.fileDataUrl;
              }
              delete f.fileDataUrl;
            }
          }
        }
        if (sAny.fileDataUrl && sAny.frontFileDataUrl) {
          delete sAny.fileDataUrl;
        }
        delete sAny.autoApproveAt;
        delete sAny.processingDurationSeconds;
        // If a submission was auto-approved without manual Admin review, set to PENDING for manual review
        if (
          sub.status === 'APPROVED' &&
          (!sub.reviewedBy || sub.reviewedBy === 'Automated Identity Verification')
        ) {
          sub.status = 'PENDING';
          delete sub.reviewedAt;
          delete sub.reviewedBy;
        }
        const member = state.users[sub.userId];
        if (member && member.email?.toLowerCase() !== chiefEmail.toLowerCase()) {
          member.kycStatus = sub.status;
          delete (member as any).kycAutoApproveAt;
        }
      }
    }

    // Restore previously registered real members and their deposit requests from Cloud/Brevo archive
    const recoveredArchiveMembers: Array<{
      id: string;
      fullName: string;
      email: string;
      createdAt: string;
    }> = [
      { id: '119194', fullName: 'Ammar AlHassan', email: 'cvszku28@gmail.com', createdAt: '2026-10-31T16:14:09.573Z' },
      { id: '258960', fullName: 'طارق خلف', email: 'dd490213@gmail.com', createdAt: '2026-10-31T16:13:08.559Z' },
      { id: '271810', fullName: 'سمندر الخضر', email: 'fttftyu946@gmail.com', createdAt: '2026-10-31T16:38:39.767Z' },
      { id: '369243', fullName: 'CASIM ELHAVVAŞ', email: 'gasemalhwash1972@gmail.com', createdAt: '2026-10-31T19:20:35.562Z' },
      { id: '392548', fullName: 'حسين العلي الشيخ', email: 'hoseenale5@gmail.com', createdAt: '2026-10-31T18:55:47.548Z' },
      { id: '397056', fullName: 'عبدالله', email: 'am6984192@gmail.com', createdAt: '2026-10-31T19:32:25.800Z' },
      { id: '400086', fullName: 'هلال', email: 'hsanmydw299@gmail.com', createdAt: '2026-10-31T17:32:46.883Z' },
      { id: '422282', fullName: 'Mohammad barakat', email: 'mhmdbarakat998@gmail.com', createdAt: '2026-10-31T19:34:07.346Z' },
      { id: '438018', fullName: 'sobhi', email: 'godiwik902@topexample.com', createdAt: '2026-10-31T19:21:01.790Z' },
      { id: '438467', fullName: 'معتز الصفراني', email: 'cchhhfggg@gmail.com', createdAt: '2026-10-31T19:30:15.753Z' },
      { id: '513109', fullName: 'HAMiT ŞEHADE', email: 'hmed1999hmed1@gmail.com', createdAt: '2026-10-31T23:37:09.480Z' },
      { id: '550628', fullName: 'kggfh', email: 'trd111t@gmail.com', createdAt: '2026-10-31T14:17:16.342Z' },
      { id: '562375', fullName: 'خالد', email: 'khalidhndaoiy0246@gmail.com', createdAt: '2026-10-31T19:45:55.769Z' },
      { id: '563790', fullName: 'khshkj', email: 'khaild99bot@gmail.com', createdAt: '2026-11-01T07:48:52.806Z' },
      { id: '575032', fullName: 'ءممؤ', email: '05318352256cc@gmail.com', createdAt: '2026-10-31T21:06:15.658Z' },
      { id: '627187', fullName: 'احمد عبد', email: 'zxxczxxxc5@gmail.com', createdAt: '2026-10-31T19:18:16.117Z' },
      { id: '631206', fullName: 'اسماعيل', email: 'aaattthhb@gmail.com', createdAt: '2026-10-31T19:17:59.391Z' },
      { id: '641005', fullName: 'dkk', email: 'investfor94@gmail.com', createdAt: '2026-11-01T13:35:00.000Z' },
      { id: '665064', fullName: 'Emad', email: 'amyalrkawy@gmail.com', createdAt: '2026-10-31T19:18:26.690Z' },
      { id: '677172', fullName: 'Jamil Albrahim', email: 'jmylabwharth44@gmail.com', createdAt: '2026-10-31T15:50:02.897Z' },
      { id: '716500', fullName: 'khaghi', email: 'khaild1mbot@gmail.com', createdAt: '2026-10-31T15:39:53.243Z' },
      { id: '735625', fullName: 'NİZAR BEKAR', email: 'gfffs21242gfgf@gmail.com', createdAt: '2026-10-31T19:32:34.363Z' },
      { id: '839483', fullName: 'kfdfbnv', email: 'khaildbot33@gmail.com', createdAt: '2026-11-01T10:26:00.000Z' },
      { id: '850644', fullName: 'عمك السوري', email: 'maxsyria92@gmail.com', createdAt: '2026-10-31T23:56:21.394Z' },
      { id: '851417', fullName: 'Asaad', email: 'aaddpp777@gmail.com', createdAt: '2026-10-31T19:44:33.183Z' },
      { id: '868578', fullName: 'khgffhj', email: 'khaild99bot@gmail.com', createdAt: '2026-10-31T16:26:35.226Z' },
      { id: '951953', fullName: 'بلال', email: 'zyntalhsn741@gmail.com', createdAt: '2026-10-31T23:56:06.075Z' },
      { id: '973977', fullName: 'Hasan', email: 'hasanmohemeid@gmail.com', createdAt: '2026-10-31T22:05:43.067Z' },
      { id: '980296', fullName: 'ابو خطاب', email: 'mhmmoad202@gmail.com', createdAt: '2026-10-31T23:30:42.706Z' },
      { id: '982638', fullName: 'ahmed ahmed', email: 'khaildbot55@gmail.com', createdAt: '2026-10-31T17:11:48.009Z' },
    ];

    const archiveSalt = 'goldrix_restored_archive';
    const archiveDefaultHash = hashPassword('RestoredMember2026!', archiveSalt);

    for (const rec of recoveredArchiveMembers) {
      if (!state.users[rec.id]) {
        state.users[rec.id] = {
          id: rec.id,
          email: rec.email.toLowerCase(),
          fullName: rec.fullName,
          country: 'Saudi Arabia',
          countryCode: 'SA',
          dialCode: '+966',
          isEmailVerified: true,
          emailVerifiedAt: rec.createdAt,
          isPhoneVerified: false,
          role: 'USER',
          status: 'ACTIVE',
          kycStatus: 'NOT_SUBMITTED',
          createdAt: rec.createdAt,
          lastLoginAt: rec.createdAt,
          twoFactorEnabled: false,
          language: 'ar',
          passwordHash: archiveDefaultHash,
          salt: archiveSalt,
          referralCode: 'GOLD' + rec.id.slice(-4),
          referralCount: 0,
          referralEarningsUSDT: '0.00',
          referralProfitShareUSDT: '0.00',
        };
      }
      for (const asset of assets) {
        const availId = `acc_${rec.id}_${asset}_AVAILABLE`;
        const resId = `acc_${rec.id}_${asset}_RESERVED`;
        const invId = `acc_${rec.id}_${asset}_INVESTED`;
        if (!state.accounts[availId]) {
          state.accounts[availId] = {
            id: availId,
            userId: rec.id,
            type: 'AVAILABLE',
            asset,
            balance: '0.00000000',
            updatedAt: rec.createdAt,
          };
        }
        if (!state.accounts[resId]) {
          state.accounts[resId] = {
            id: resId,
            userId: rec.id,
            type: 'RESERVED',
            asset,
            balance: '0.00000000',
            updatedAt: rec.createdAt,
          };
        }
        if (!state.accounts[invId]) {
          state.accounts[invId] = {
            id: invId,
            userId: rec.id,
            type: 'INVESTED',
            asset,
            balance: '0.00000000',
            updatedAt: rec.createdAt,
          };
        }
      }
    }

    const recoveredArchiveDeposits: Array<{
      id: string;
      userId: string;
      userFullName: string;
      amount: string;
      asset: AssetSymbol;
      network: string;
      createdAt: string;
    }> = [
      { id: 'ORD-493963', userId: '641005', userFullName: 'dkk', amount: '1000.00', asset: 'USDT', network: 'USDT (Ethereum ERC20)', createdAt: '2026-11-01T13:36:24.599Z' },
      { id: 'ORD-826069', userId: 'usr_admin_chief', userFullName: 'مدير المنصة (Chief Director)', amount: '1000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T13:27:29.600Z' },
      { id: 'ORD-384751', userId: '677172', userFullName: 'Jamil Albrahim', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T13:26:53.977Z' },
      { id: 'ORD-745039', userId: '677172', userFullName: 'Jamil Albrahim', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T13:20:26.247Z' },
      { id: 'ORD-516878', userId: '677172', userFullName: 'Jamil Albrahim', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:43:37.165Z' },
      { id: 'ORD-633645', userId: '839483', userFullName: 'kfdfbnv', amount: '1000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:28:30.052Z' },
      { id: 'ORD-969162', userId: '839483', userFullName: 'kfdfbnv', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:27:22.959Z' },
      { id: 'ORD-991328', userId: '563790', userFullName: 'khshkj', amount: '1000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:25:06.598Z' },
      { id: 'ORD-999457', userId: '677172', userFullName: 'Jamil Albrahim', amount: '1000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:23:59.522Z' },
      { id: 'ORD-632036', userId: '677172', userFullName: 'Jamil Albrahim', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:17:37.130Z' },
      { id: 'ORD-382101', userId: '677172', userFullName: 'Jamil Albrahim', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:17:04.472Z' },
      { id: 'ORD-387892', userId: '677172', userFullName: 'Jamil Albrahim', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T10:11:36.966Z' },
      { id: 'ORD-963802', userId: '677172', userFullName: 'Jamil Albrahim', amount: '2000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T09:39:32.775Z' },
      { id: 'ORD-569479', userId: '119194', userFullName: 'Ammar AlHassan', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T09:38:38.650Z' },
      { id: 'ORD-329886', userId: '119194', userFullName: 'Ammar AlHassan', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T09:35:02.890Z' },
      { id: 'ORD-488675', userId: 'usr_admin_chief', userFullName: 'مدير المنصة (Chief Director)', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T08:25:33.096Z' },
      { id: 'ORD-505503', userId: '563790', userFullName: 'khshkj', amount: '1000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-11-01T08:11:38.714Z' },
      { id: 'ORD-444185', userId: '850644', userFullName: 'عمك السوري', amount: '5000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T23:56:41.559Z' },
      { id: 'ORD-940248', userId: '951953', userFullName: 'بلال', amount: '1500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T23:56:15.495Z' },
      { id: 'ORD-968383', userId: '980296', userFullName: 'ابو خطاب', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T23:30:43.233Z' },
      { id: 'ORD-555308', userId: '868578', userFullName: 'khgffhj', amount: '200.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T22:05:38.113Z' },
      { id: 'ORD-684167', userId: '851417', userFullName: 'Asaad', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T19:54:05.961Z' },
      { id: 'ORD-420613', userId: '851417', userFullName: 'Asaad', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T19:53:46.267Z' },
      { id: 'ORD-263814', userId: '735625', userFullName: 'NİZAR BEKAR', amount: '100.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T19:34:55.599Z' },
      { id: 'ORD-839944', userId: '735625', userFullName: 'NİZAR BEKAR', amount: '200.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T19:34:00.153Z' },
      { id: 'ORD-367497', userId: '627187', userFullName: 'احمد عبد', amount: '100.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T19:18:38.062Z' },
      { id: 'ORD-921621', userId: '677172', userFullName: 'Jamil Albrahim', amount: '2000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T17:18:09.116Z' },
      { id: 'ORD-527983', userId: '868578', userFullName: 'khgffhj', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T17:17:58.760Z' },
      { id: 'ORD-158244', userId: '982638', userFullName: 'ahmed ahmed', amount: '500.00', asset: 'USDT', network: 'USDT (Ethereum ERC20)', createdAt: '2026-10-31T17:13:08.964Z' },
      { id: 'ORD-337068', userId: '677172', userFullName: 'Jamil Albrahim', amount: '2000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T17:07:32.856Z' },
      { id: 'ORD-393679', userId: '868578', userFullName: 'khgffhj', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T16:57:00.213Z' },
      { id: 'ORD-637811', userId: '868578', userFullName: 'khgffhj', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T16:26:39.642Z' },
      { id: 'ORD-109244', userId: '119194', userFullName: 'Ammar AlHassan', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T16:16:06.263Z' },
      { id: 'ORD-528463', userId: '677172', userFullName: 'Jamil Albrahim', amount: '2000.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T15:51:04.965Z' },
      { id: 'ORD-493817', userId: '716500', userFullName: 'khaghi', amount: '200.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T15:42:09.359Z' },
      { id: 'ORD-342320', userId: '550628', userFullName: 'kggfh', amount: '500.00', asset: 'USDT', network: 'USDT (TRON TRC20)', createdAt: '2026-10-31T14:17:30.117Z' },
    ];

    if (!state.deposits) {
      state.deposits = {};
    }
    if (!state.withdrawals) {
      state.withdrawals = {};
    }
    for (const dep of recoveredArchiveDeposits) {
      if (!state.deposits[dep.id]) {
        const u = state.users[dep.userId];
        state.deposits[dep.id] = {
          id: dep.id,
          userId: dep.userId,
          userFullName: u?.fullName || dep.userFullName,
          userPhone: u?.phone || '',
          userEmail: u?.email || '',
          asset: dep.asset,
          network: dep.network,
          depositAddress: dep.network.includes('ERC20')
            ? '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a'
            : 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
          amount: dep.amount,
          txHash: `0x${dep.id.replace('ORD-', '').toLowerCase()}a9f8c2e1b4d058`,
          confirmations: 1,
          requiredConfirmations: 12,
          status: 'PENDING_REVIEW',
          createdAt: dep.createdAt,
        } as any;
      }
    }

    // Reconcile any deposit or withdrawal records stored inside state.emailMessages
    for (const msg of state.emailMessages || []) {
      const subj = msg.subject || '';
      const body = msg.bodyPreview || '';
      if (subj.includes('طلب إيداع جديد')) {
        const ordM = subj.match(/\(?(ORD-\d+)\)?/);
        const amtM = subj.match(/بقيمة\s*\$([0-9.]+)/) || body.match(/\$([0-9.]+)/);
        const uidM = body.match(/\(ID:\s*([^)]+)\)/);
        const ordId = ordM?.[1];
        if (ordId && !state.deposits[ordId]) {
          const uid = (uidM?.[1] || msg.userId || 'usr_admin_chief').trim();
          const u = state.users[uid];
          state.deposits[ordId] = {
            id: ordId,
            userId: uid,
            userFullName: u?.fullName || 'عضو المنصة',
            userPhone: u?.phone || '',
            userEmail: u?.email || msg.to || '',
            asset: 'USDT',
            network: 'USDT (TRON TRC20)',
            depositAddress: 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
            amount: Number(amtM?.[1] || 0).toFixed(2),
            txHash: `0x${ordId.replace('ORD-', '').toLowerCase()}a9f8c2e1b4d058`,
            confirmations: 1,
            requiredConfirmations: 12,
            status: 'PENDING_REVIEW',
            createdAt: msg.sentAt || nowIso,
          } as any;
        }
      } else if (subj.includes('طلب سحب جديد')) {
        const wthM = subj.match(/\(([^)]+)\)/);
        const amtM = subj.match(/بقيمة\s*\$([0-9.]+)/) || body.match(/\$([0-9.]+)/);
        const uidM = body.match(/\(ID:\s*([^)]+)\)/);
        const wthId = wthM?.[1];
        if (wthId && !state.withdrawals[wthId]) {
          const uid = (uidM?.[1] || msg.userId || 'usr_admin_chief').trim();
          const amtNum = Number(amtM?.[1] || 0);
          const feeRate = amtNum >= 500 ? 0.03 : amtNum >= 300 ? 0.04 : amtNum >= 100 ? 0.05 : amtNum >= 50 ? 0.07 : 0.08;
          const feeNum = Number((amtNum * feeRate).toFixed(2));
          state.withdrawals[wthId] = {
            id: wthId,
            userId: uid,
            asset: 'USDT',
            network: 'USDT (TRON TRC20)',
            destinationAddress: 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
            amount: amtNum.toFixed(2),
            feePercent: Math.round(feeRate * 100),
            feeAmount: feeNum.toFixed(2),
            netAmount: Math.max(0, amtNum - feeNum).toFixed(2),
            status: 'PENDING_REVIEW',
            createdAt: msg.sentAt || nowIso,
          };
        }
      }
    }

    // Remove simulated / demo users and strictly enforce that ONLY Chief Admin has ADMIN privileges
    for (const [uid, u] of Object.entries(state.users)) {
      if (
        uid.startsWith('usr_inv_') ||
        uid === 'usr_investor_01' ||
        uid === 'usr_admin_01' ||
        uid === 'usr_compliance_01' ||
        (u.email && u.email.endsWith('@investor.test'))
      ) {
        delete state.users[uid];
        for (const asset of assets) {
          delete state.accounts[`acc_${uid}_${asset}_AVAILABLE`];
          delete state.accounts[`acc_${uid}_${asset}_RESERVED`];
          delete state.accounts[`acc_${uid}_${asset}_INVESTED`];
        }
        continue;
      }

      if (u.email?.toLowerCase() !== chiefEmail.toLowerCase()) {
        u.role = 'USER';
        delete (u as any).kycAutoApproveAt;
        const userSub = Object.values(state.kycSubmissions || {}).find((s) => s.userId === u.id);
        if (userSub) {
          u.kycStatus = userSub.status;
        } else if (u.kycStatus === 'APPROVED' || u.kycStatus === 'PENDING') {
          u.kycStatus = 'NOT_SUBMITTED';
        }
      }
    }

    // Remove any leftover fake/seed deposits (e.g. dep_... or usr_investor_01) and normalize Chief Admin ID
    for (const [depId, dep] of Object.entries(state.deposits || {})) {
      if (
        depId.startsWith('dep_') ||
        dep.userId === 'usr_investor_01' ||
        dep.userId?.startsWith('usr_inv_')
      ) {
        delete state.deposits[depId];
        continue;
      }
      if (dep.userId === '100001') {
        dep.userId = 'usr_admin_chief';
      }
    }

    for (const [wthId, wth] of Object.entries(state.withdrawals || {})) {
      if (wth.userId === 'usr_investor_01' || wth.userId?.startsWith('usr_inv_')) {
        delete state.withdrawals[wthId];
        continue;
      }
      if (wth.userId === '100001') {
        wth.userId = 'usr_admin_chief';
      }
    }

    // Ensure verificationCodes store exists
    if (!state.verificationCodes) {
      state.verificationCodes = {};
    }

    // Ensure Admin-configurable deposit addresses exist in systemSettings
    if (state.systemSettings) {
      const defaultTrc20Addr = 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh';
      const defaultEvmAddr = '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
      const defaultBtcAddr = 'bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9';

      if (
        !state.systemSettings.usdtDepositAddress ||
        state.systemSettings.usdtDepositAddress === 'TYx7jQ9W28xL9zR3sZgY6Q1mVp7v2K8bL9' ||
        state.systemSettings.usdtDepositAddress === 'TGoldrixVault99xTRC20InstitutionalAddress88A' ||
        state.systemSettings.usdtDepositAddress === defaultEvmAddr
      ) {
        state.systemSettings.usdtDepositAddress = defaultTrc20Addr;
      }
      if (!state.systemSettings.usdtErc20DepositAddress) {
        state.systemSettings.usdtErc20DepositAddress = defaultEvmAddr;
      }
      if (!state.systemSettings.usdtBep20DepositAddress) {
        state.systemSettings.usdtBep20DepositAddress = defaultEvmAddr;
      }
      if (
        !state.systemSettings.btcDepositAddress ||
        state.systemSettings.btcDepositAddress === 'bc1q8x9l24yq8k9m03z7v65h2s3f8t4r7j2x5l4k7w' ||
        state.systemSettings.btcDepositAddress === 'bc1qgoldrixvault99xinstitutionalbtcaddress88a'
      ) {
        state.systemSettings.btcDepositAddress = defaultBtcAddr;
      }
      if (!state.systemSettings.ethDepositAddress) {
        state.systemSettings.ethDepositAddress = defaultEvmAddr;
      }
      if (!state.systemSettings.bnbDepositAddress) {
        state.systemSettings.bnbDepositAddress = defaultEvmAddr;
      }
    }

    // Recalculate true referral counts & strictly compute referral earnings ONLY from invitees with CONFIRMED deposits
    for (const u of Object.values(state.users)) {
      if (u.email && u.email.endsWith('@phone.goldrix.io')) {
        u.email = '';
      }
      if (!u.referralCode) {
        u.referralCode = 'REF' + u.id.replace('usr_', '').substring(0, 5).toUpperCase();
      }
      const isChief = u.id === 'usr_admin_chief' || (u.email && u.email.toLowerCase() === 'hha253ee@gmail.com');
      const userRefCode = (u.referralCode || '').toLowerCase();
      const realInvitees = Object.values(state.users).filter(
        (other) =>
          other.id !== u.id &&
          other.referredBy &&
          (other.referredBy.toLowerCase() === userRefCode ||
            other.referredBy === u.id ||
            (isChief && other.referredBy === '100001'))
      );
      u.referralCount = realInvitees.length;

      let confirmedTeamDirectBonus = 0;
      let confirmedTeamProfitShare = 0;

      for (const inv of realInvitees) {
        const invConfirmedDeposits = Object.values(state.deposits || {}).filter(
          (d) => d.userId === inv.id && d.status === 'CONFIRMED'
        );
        const invDepositedUSDT = invConfirmedDeposits.reduce((s, d) => s + Number(d.amount || 0), 0);
        if (invDepositedUSDT > 0) {
          confirmedTeamDirectBonus += Math.floor(invDepositedUSDT / 100) * 10;
          const invInvestments = Object.values(state.investments || {}).filter((i) => i.userId === inv.id);
          const invProfit = invInvestments.reduce(
            (s, i) => s + Number(i.realizedPnl || 0) + Number(i.unrealizedPnl || 0),
            0
          );
          confirmedTeamProfitShare += Number((invProfit * 0.03).toFixed(2));
        }
      }

      u.referralEarningsUSDT = confirmedTeamDirectBonus.toFixed(2);
      u.referralProfitShareUSDT = confirmedTeamProfitShare.toFixed(2);
    }

    // Ensure investment plan names, descriptions, and daily rates reflect the calculated tier structure:
    // $100 => 3% ($3/d), $200 => 3% ($6/d), $500 => 5% ($25/d), $1000 => 6% ($60/d), $2000 => 6.5% ($130/d), $3000 => 7% ($210/d)
    if (state.investmentPlans) {
      if (state.investmentPlans.plan_100) {
        state.investmentPlans.plan_100.name = 'استثمار في الذهب والسبائك';
        state.investmentPlans.plan_100.description = 'عقود الذهب الفوري والسبائك المعتمدة بدورة 7 أيام وعائد يومي +3% كل 24 ساعة عمل.';
        state.investmentPlans.plan_100.estimatedAprMin = 3.0;
        state.investmentPlans.plan_100.estimatedAprMax = 3.0;
      }
      if (state.investmentPlans.plan_200) {
        state.investmentPlans.plan_200.name = 'استثمار في النفط والطاقة';
        state.investmentPlans.plan_200.description = 'عقود خام برنت وغرب تكساس الآجلة بدورة 14 يوماً وعائد يومي +3% كل 24 ساعة عمل.';
        state.investmentPlans.plan_200.estimatedAprMin = 3.0;
        state.investmentPlans.plan_200.estimatedAprMax = 3.0;
      }
      if (state.investmentPlans.plan_500) {
        state.investmentPlans.plan_500.name = 'سندات الخزانة الأمريكية';
        state.investmentPlans.plan_500.description = 'سندات وأذون الخزانة الفيدرالية الأمريكية بدورة 21 يوماً وعائد يومي +5% كل 24 ساعة عمل.';
        state.investmentPlans.plan_500.estimatedAprMin = 5.0;
        state.investmentPlans.plan_500.estimatedAprMax = 5.0;
      }
      if (state.investmentPlans.plan_1000) {
        state.investmentPlans.plan_1000.name = 'الأسهم العالمية الكبرى';
        state.investmentPlans.plan_1000.description = 'أسهم شركات التكنولوجيا ومؤشر S&P 500 بدورة 30 يوماً وعائد يومي +6% كل 24 ساعة عمل.';
        state.investmentPlans.plan_1000.estimatedAprMin = 6.0;
        state.investmentPlans.plan_1000.estimatedAprMax = 6.0;
      }
      if (state.investmentPlans.plan_2000) {
        state.investmentPlans.plan_2000.name = 'صناديق الاستثمار المتداولة';
        state.investmentPlans.plan_2000.description = 'صناديق التحوط والمؤشرات المالية المركبة بدورة 45 يوماً وعائد يومي +6.5% كل 24 ساعة عمل.';
        state.investmentPlans.plan_2000.estimatedAprMin = 6.5;
        state.investmentPlans.plan_2000.estimatedAprMax = 6.5;
      }
      if (state.investmentPlans.plan_3000) {
        state.investmentPlans.plan_3000.name = 'الصناديق السيادية والمؤسسية';
        state.investmentPlans.plan_3000.description = 'محفظة سيادية مجمعة للذهب والسندات والأسهم بدورة 60 يوماً وعائد يومي +7% كل 24 ساعة عمل.';
        state.investmentPlans.plan_3000.estimatedAprMin = 7.0;
        state.investmentPlans.plan_3000.estimatedAprMax = 7.0;
      }
    }

    // Sync any existing investments with their plan's updated daily rate
    if (state.investments && state.investmentPlans) {
      for (const inv of Object.values(state.investments)) {
        const plan = state.investmentPlans[inv.planId];
        if (plan) {
          inv.aprAtActivation = plan.estimatedAprMin;
          inv.dailyProfitUSDT = toFixedDecimal(Number(inv.initialAmount || 0) * (plan.estimatedAprMin / 100));
        }
      }
    }
  }

  private createSeedState(): DatabaseState {
    const salt = 'goldrix_secure_2026';
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Users
    const chiefAdminUser: User & { passwordHash: string; salt: string } = {
      id: 'usr_admin_chief',
      email: 'hha253ee@gmail.com',
      phone: '+966 50 123 4567',
      fullName: 'مدير المنصة (Chief Director)',
      role: 'ADMIN',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
      lastLoginAt: nowIso,
      twoFactorEnabled: true,
      language: 'ar',
      passwordHash: hashPassword('Admin@2026!', salt),
      salt,
      referralCode: 'GOLD777',
      referralCount: 0,
      referralEarningsUSDT: '0.00',
      referralProfitShareUSDT: '0.00',
    };

    const adminUser: User & { passwordHash: string; salt: string } = {
      id: 'usr_admin_01',
      email: 'admin@goldrix.io',
      phone: '+44 20 7946 0912',
      fullName: 'Marcus Vance (Chief Administrator)',
      role: 'ADMIN',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      lastLoginAt: nowIso,
      twoFactorEnabled: true,
      language: 'en',
      passwordHash: hashPassword('GoldrixAdmin2026!', salt),
      salt,
      referralCode: 'GOLD888',
      referralCount: 5,
      referralEarningsUSDT: '50.00',
      referralProfitShareUSDT: '15.00',
    };

    const investorUser: User & { passwordHash: string; salt: string } = {
      id: 'usr_investor_01',
      email: 'investor@goldrix.io',
      phone: '+1 415 555 2671',
      fullName: 'Elena Rostova',
      role: 'USER',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      lastLoginAt: nowIso,
      twoFactorEnabled: true,
      language: 'en',
      passwordHash: hashPassword('GoldrixInvestor2026!', salt),
      salt,
      referralCode: 'INV992',
      referredBy: 'GOLD777',
      referralCount: 4,
      referralEarningsUSDT: '40.00',
      referralProfitShareUSDT: '12.40',
    };

    const complianceUser: User & { passwordHash: string; salt: string } = {
      id: 'usr_compliance_01',
      email: 'compliance@goldrix.io',
      phone: '+44 20 7946 0888',
      fullName: 'Sarah Chen (Lead AML Officer)',
      role: 'COMPLIANCE',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      lastLoginAt: nowIso,
      twoFactorEnabled: true,
      language: 'en',
      passwordHash: hashPassword('GoldrixCompliance2026!', salt),
      salt,
      referralCode: 'CMP101',
      referralCount: 0,
      referralEarningsUSDT: '0.00',
      referralProfitShareUSDT: '0.00',
    };

    const users: Record<string, User & { passwordHash: string; salt: string }> = {
      [chiefAdminUser.id]: chiefAdminUser,
      [adminUser.id]: adminUser,
      [investorUser.id]: investorUser,
      [complianceUser.id]: complianceUser,
    };

    // 2. Ledger Accounts
    const accounts: Record<string, LedgerAccount> = {};

    const assets: AssetSymbol[] = ['USDT', 'BTC', 'ETH', 'SOL', 'PAXG', 'BNB'];

    // Platform reserve accounts
    for (const asset of assets) {
      const reserveAccId = `acc_platform_reserve_${asset}`;
      accounts[reserveAccId] = {
        id: reserveAccId,
        userId: 'SYSTEM_PLATFORM',
        type: 'PLATFORM_RESERVE',
        asset,
        balance: asset === 'USDT' ? '10000000.00000000' : '500.00000000',
        updatedAt: nowIso,
      };

      const feeAccId = `acc_platform_fee_${asset}`;
      accounts[feeAccId] = {
        id: feeAccId,
        userId: 'SYSTEM_PLATFORM',
        type: 'FEE',
        asset,
        balance: '0.00000000',
        updatedAt: nowIso,
      };
    }

    // Investor accounts with initial working capital
    const initialBalances: Record<AssetSymbol, { available: string; reserved: string; invested: string }> = {
      USDT: { available: '14250.00000000', reserved: '1000.00000000', invested: '1000.00000000' },
      BTC: { available: '0.45000000', reserved: '0.00000000', invested: '0.25000000' },
      ETH: { available: '4.20000000', reserved: '0.00000000', invested: '0.00000000' },
      SOL: { available: '35.00000000', reserved: '0.00000000', invested: '0.00000000' },
      PAXG: { available: '1.50000000', reserved: '0.00000000', invested: '0.00000000' },
      BNB: { available: '5.00000000', reserved: '0.00000000', invested: '0.00000000' },
    };

    for (const asset of assets) {
      const b = initialBalances[asset];
      accounts[`acc_usr_investor_01_${asset}_AVAILABLE`] = {
        id: `acc_usr_investor_01_${asset}_AVAILABLE`,
        userId: investorUser.id,
        type: 'AVAILABLE',
        asset,
        balance: b.available,
        updatedAt: nowIso,
      };
      accounts[`acc_usr_investor_01_${asset}_RESERVED`] = {
        id: `acc_usr_investor_01_${asset}_RESERVED`,
        userId: investorUser.id,
        type: 'RESERVED',
        asset,
        balance: b.reserved,
        updatedAt: nowIso,
      };
      accounts[`acc_usr_investor_01_${asset}_INVESTED`] = {
        id: `acc_usr_investor_01_${asset}_INVESTED`,
        userId: investorUser.id,
        type: 'INVESTED',
        asset,
        balance: b.invested,
        updatedAt: nowIso,
      };
    }

    // Chief Admin accounts (50,000 USDT test capital)
    for (const asset of assets) {
      accounts[`acc_usr_admin_chief_${asset}_AVAILABLE`] = {
        id: `acc_usr_admin_chief_${asset}_AVAILABLE`,
        userId: chiefAdminUser.id,
        type: 'AVAILABLE',
        asset,
        balance: asset === 'USDT' ? '50000.00000000' : '2.50000000',
        updatedAt: nowIso,
      };
      accounts[`acc_usr_admin_chief_${asset}_RESERVED`] = {
        id: `acc_usr_admin_chief_${asset}_RESERVED`,
        userId: chiefAdminUser.id,
        type: 'RESERVED',
        asset,
        balance: '0.00000000',
        updatedAt: nowIso,
      };
      accounts[`acc_usr_admin_chief_${asset}_INVESTED`] = {
        id: `acc_usr_admin_chief_${asset}_INVESTED`,
        userId: chiefAdminUser.id,
        type: 'INVESTED',
        asset,
        balance: '0.00000000',
        updatedAt: nowIso,
      };
    }

    // 3. The 6 Fixed Investment Plans (100, 200, 500, 1000, 2000, 3000 USDT)
    // Tiered daily yields every 24h: $100 (3%), $200 (3%), $500 (5%), $1000 (6%), $2000 (6.5%), $3000 (7%)
    const investmentPlans: Record<string, InvestmentPlan> = {
      plan_100: {
        id: 'plan_100',
        name: 'استثمار في الذهب والسبائك',
        description: 'عقود الذهب الفوري والسبائك المعتمدة بدورة 7 أيام وعائد يومي +3% كل 24 ساعة عمل.',
        asset: 'USDT',
        strategyType: 'ARBITRAGE_NEUTRAL',
        riskLevel: 'CONSERVATIVE',
        minAmount: '100.00000000',
        maxAmount: '100.00000000',
        isFixedAmount: true,
        fixedAmount: '100.00000000',
        durationDays: 7,
        estimatedAprMin: 3.0,
        estimatedAprMax: 3.0,
        managementFeePercent: 0.0,
        performanceFeePercent: 5.0,
        status: 'ACTIVE',
        historicalWinRate: 88.5,
        totalInvestors: 842,
        totalAUM: '84200.00000000',
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        updatedAt: nowIso,
      },
      plan_200: {
        id: 'plan_200',
        name: 'استثمار في النفط والطاقة',
        description: 'عقود خام برنت وغرب تكساس الآجلة بدورة 14 يوماً وعائد يومي +3% كل 24 ساعة عمل.',
        asset: 'USDT',
        strategyType: 'MOMENTUM_ALPHA',
        riskLevel: 'CONSERVATIVE',
        minAmount: '200.00000000',
        maxAmount: '200.00000000',
        isFixedAmount: true,
        fixedAmount: '200.00000000',
        durationDays: 14,
        estimatedAprMin: 3.0,
        estimatedAprMax: 3.0,
        managementFeePercent: 0.0,
        performanceFeePercent: 5.0,
        status: 'ACTIVE',
        historicalWinRate: 86.4,
        totalInvestors: 620,
        totalAUM: '124000.00000000',
        createdAt: new Date(Date.now() - 75 * 86400000).toISOString(),
        updatedAt: nowIso,
      },
      plan_500: {
        id: 'plan_500',
        name: 'سندات الخزانة الأمريكية',
        description: 'سندات وأذون الخزانة الفيدرالية الأمريكية بدورة 21 يوماً وعائد يومي +5% كل 24 ساعة عمل.',
        asset: 'USDT',
        strategyType: 'QUANT_TREND',
        riskLevel: 'MODERATE',
        minAmount: '500.00000000',
        maxAmount: '500.00000000',
        isFixedAmount: true,
        fixedAmount: '500.00000000',
        durationDays: 21,
        estimatedAprMin: 5.0,
        estimatedAprMax: 5.0,
        managementFeePercent: 0.5,
        performanceFeePercent: 6.0,
        status: 'ACTIVE',
        historicalWinRate: 85.1,
        totalInvestors: 412,
        totalAUM: '206000.00000000',
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: nowIso,
      },
      plan_1000: {
        id: 'plan_1000',
        name: 'الأسهم العالمية الكبرى',
        description: 'أسهم شركات التكنولوجيا ومؤشر S&P 500 بدورة 30 يوماً وعائد يومي +6% كل 24 ساعة عمل.',
        asset: 'USDT',
        strategyType: 'AI_HIGH_FREQUENCY',
        riskLevel: 'MODERATE',
        minAmount: '1000.00000000',
        maxAmount: '1000.00000000',
        isFixedAmount: true,
        fixedAmount: '1000.00000000',
        durationDays: 30,
        estimatedAprMin: 6.0,
        estimatedAprMax: 6.0,
        managementFeePercent: 0.5,
        performanceFeePercent: 8.0,
        status: 'ACTIVE',
        historicalWinRate: 89.4,
        totalInvestors: 315,
        totalAUM: '315000.00000000',
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
        updatedAt: nowIso,
      },
      plan_2000: {
        id: 'plan_2000',
        name: 'صناديق الاستثمار المتداولة',
        description: 'صناديق التحوط والمؤشرات المالية المركبة بدورة 45 يوماً وعائد يومي +6.5% كل 24 ساعة عمل.',
        asset: 'USDT',
        strategyType: 'YIELD_HARVEST',
        riskLevel: 'AGGRESSIVE',
        minAmount: '2000.00000000',
        maxAmount: '2000.00000000',
        isFixedAmount: true,
        fixedAmount: '2000.00000000',
        durationDays: 45,
        estimatedAprMin: 6.5,
        estimatedAprMax: 6.5,
        managementFeePercent: 1.0,
        performanceFeePercent: 10.0,
        status: 'ACTIVE',
        historicalWinRate: 91.8,
        totalInvestors: 194,
        totalAUM: '388000.00000000',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: nowIso,
      },
      plan_3000: {
        id: 'plan_3000',
        name: 'الصناديق السيادية والمؤسسية',
        description: 'محفظة سيادية مجمعة للذهب والسندات والأسهم بدورة 60 يوماً وعائد يومي +7% كل 24 ساعة عمل.',
        asset: 'USDT',
        strategyType: 'AI_HIGH_FREQUENCY',
        riskLevel: 'AGGRESSIVE',
        minAmount: '3000.00000000',
        maxAmount: '3000.00000000',
        isFixedAmount: true,
        fixedAmount: '3000.00000000',
        durationDays: 60,
        estimatedAprMin: 7.0,
        estimatedAprMax: 7.0,
        managementFeePercent: 1.0,
        performanceFeePercent: 10.0,
        status: 'ACTIVE',
        historicalWinRate: 94.2,
        totalInvestors: 128,
        totalAUM: '384000.00000000',
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: nowIso,
      },
    };

    // 4. User Investments (Elena's active portfolio)
    const inv1StartTime = new Date(Date.now() - 10 * 86400000);
    const inv1EndTime = new Date(inv1StartTime.getTime() + 30 * 86400000); // 20 days left

    const investments: Record<string, UserInvestment> = {
      inv_01: {
        id: 'inv_01',
        userId: investorUser.id,
        planId: 'plan_1000',
        planName: 'Elite Scalper 1,000 USDT',
        asset: 'USDT',
        initialAmount: '1000.00000000',
        currentValuation: '1023.33000000',
        realizedPnl: '0.00000000',
        unrealizedPnl: '23.33000000',
        startTime: inv1StartTime.toISOString(),
        scheduledEndTime: inv1EndTime.toISOString(),
        durationDays: 30,
        status: 'ACTIVE',
        lastReconciledAt: nowIso,
        aprAtActivation: 7.0,
      },
      inv_02: {
        id: 'inv_02',
        userId: investorUser.id,
        planId: 'plan_01',
        planName: 'BTC Momentum Alpha Strategy',
        asset: 'BTC',
        initialAmount: '0.25000000',
        currentValuation: '0.25820000',
        realizedPnl: '0.00000000',
        unrealizedPnl: '0.00820000',
        startTime: new Date(Date.now() - 25 * 86400000).toISOString(),
        scheduledEndTime: new Date(Date.now() + 35 * 86400000).toISOString(),
        durationDays: 60,
        status: 'ACTIVE',
        lastReconciledAt: nowIso,
        aprAtActivation: 16.0,
      },
    };

    // 5. Deposits
    const deposits: Record<string, Deposit> = {
      dep_01: {
        id: 'dep_01',
        userId: investorUser.id,
        asset: 'USDT',
        network: 'TRON (TRC20)',
        depositAddress: 'TYx7jQ9W28xL9zR3sZgY6Q1mVp7v2K8bL9',
        amount: '15000.00000000',
        txHash: 'e6a8e52a4f47c8d9c1029384756b1029384756a1b2c3d4e5f60718293a4b5c6d',
        confirmations: 24,
        requiredConfirmations: 20,
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        confirmedAt: new Date(Date.now() - 40 * 86400000 + 420000).toISOString(),
      },
      dep_02: {
        id: 'dep_02',
        userId: investorUser.id,
        asset: 'BTC',
        network: 'Bitcoin Native (SegWit)',
        depositAddress: 'bc1q8x9l24yq8k9m03z7v65h2s3f8t4r7j2x5l4k7w',
        amount: '0.70000000',
        txHash: '0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
        confirmations: 6,
        requiredConfirmations: 3,
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        confirmedAt: new Date(Date.now() - 30 * 86400000 + 1800000).toISOString(),
      },
    };

    // 6. Withdrawals (One pending review for Elena so the admin approval flow is testable)
    const withdrawals: Record<string, Withdrawal> = {
      wth_01: {
        id: 'wth_01',
        userId: investorUser.id,
        asset: 'USDT',
        network: 'TRON (TRC20)',
        destinationAddress: 'TMu8dF92kLP2x9s7Y6zT4W1nVq8k7L3mN4',
        amount: '1000.00000000',
        feeAmount: '1.00000000',
        netAmount: '999.00000000',
        status: 'PENDING_REVIEW',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
    };

    // 7. KYC Submissions
    const kycSubmissions: Record<string, KYCSubmission> = {
      kyc_elena: {
        id: 'kyc_elena',
        userId: investorUser.id,
        userEmail: investorUser.email,
        userFullName: investorUser.fullName,
        documentType: 'PASSPORT',
        documentNumber: 'P89204128',
        country: 'Germany',
        dateOfBirth: '1991-06-14',
        files: [
          {
            id: 'file_01',
            fileName: 'passport_biometric_page.pdf',
            fileType: 'application/pdf',
            fileSize: 2450000,
            documentType: 'PASSPORT',
            uploadedAt: new Date(Date.now() - 44 * 86400000).toISOString(),
          },
          {
            id: 'file_02',
            fileName: 'utility_bill_residence.pdf',
            fileType: 'application/pdf',
            fileSize: 1180000,
            documentType: 'UTILITY_BILL',
            uploadedAt: new Date(Date.now() - 44 * 86400000).toISOString(),
          },
        ],
        status: 'APPROVED',
        adminNotes: 'Automated AML check passed. Sanctions list clear.',
        reviewedBy: complianceUser.fullName,
        reviewedAt: new Date(Date.now() - 43 * 86400000).toISOString(),
        submittedAt: new Date(Date.now() - 44 * 86400000).toISOString(),
      },
      kyc_pending_user: {
        id: 'kyc_pending_user',
        userId: 'usr_new_trader',
        userEmail: 'alex.novak@example.com',
        userFullName: 'Alex Novak',
        documentType: 'NATIONAL_ID',
        documentNumber: 'ID-9938210',
        country: 'Switzerland',
        dateOfBirth: '1988-11-20',
        files: [
          {
            id: 'file_03',
            fileName: 'national_id_front.jpg',
            fileType: 'image/jpeg',
            fileSize: 3200000,
            documentType: 'NATIONAL_ID',
            uploadedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
        ],
        status: 'PENDING',
        submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    };

    // 8. Support Tickets
    const supportTickets: Record<string, SupportTicket> = {
      tkt_01: {
        id: 'tkt_01',
        userId: investorUser.id,
        userEmail: investorUser.email,
        subject: 'Institutional API Access and Sub-account Whitelisting',
        category: 'ACCOUNT',
        priority: 'MEDIUM',
        status: 'OPEN',
        messages: [
          {
            id: 'msg_01',
            sender: 'USER',
            senderName: investorUser.fullName,
            content: 'Hello GOLDRIX desk, I would like to inquire about automated order webhook endpoints for delta-neutral rebalancing on my private vault.',
            timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
          },
          {
            id: 'msg_02',
            sender: 'STAFF',
            senderName: 'GOLDRIX Institutional Ops',
            content: 'Hello Elena, thank you for reaching out. Webhook signing and private API keys can be authorized once your Tier-2 volume threshold is reached.',
            timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
    };

    // 9. Notifications
    const notifications: AppNotification[] = [
      {
        id: 'notif_01',
        userId: investorUser.id,
        title: 'Strategy Yield Reconciled',
        message: 'Your USDT Cross-Exchange Arbitrage plan earned +94.25 USDT in daily yield.',
        type: 'INVESTMENT',
        read: false,
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
      {
        id: 'notif_02',
        userId: investorUser.id,
        title: 'Withdrawal Request Received',
        message: 'Withdrawal of 1,000 USDT to TRON TRC20 address TMu8dF... is currently under compliance review.',
        type: 'WITHDRAWAL',
        read: false,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: 'notif_03',
        userId: investorUser.id,
        title: 'KYC Tier-2 Approved',
        message: 'Your biometric verification has been completed. Full withdrawal limits are unlocked.',
        type: 'KYC',
        read: true,
        createdAt: new Date(Date.now() - 43 * 86400000).toISOString(),
      },
    ];

    // 10. Audit Logs
    const auditLogs: AdminAuditLog[] = [
      {
        id: 'log_01',
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        action: 'UPDATE_SYSTEM_SETTINGS',
        targetType: 'SYSTEM',
        targetId: 'CONFIG',
        details: 'Enabled TRON TRC20 multi-signature hot wallet deposit reconciler.',
        ipAddress: '194.230.14.88',
        timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'log_02',
        adminId: complianceUser.id,
        adminEmail: complianceUser.email,
        action: 'APPROVE_KYC',
        targetType: 'KYC',
        targetId: 'kyc_elena',
        details: 'Verified European passport and confirmed proof of address.',
        ipAddress: '185.191.171.1',
        timestamp: new Date(Date.now() - 43 * 86400000).toISOString(),
      },
    ];

    // 11. System Settings
    const systemSettings: SystemSettings = {
      maintenanceMode: false,
      simulationMode: false,
      depositEnabled: true,
      withdrawalEnabled: true,
      marketDataLive: true,
      smsGatewayConfigured: true,
      emailGatewayConfigured: true,
      blockchainGatewayConfigured: true,
      platformReserveUSDT: '10000000.00000000',
      usdtDepositAddress: 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh',
      usdtErc20DepositAddress: '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a',
      usdtBep20DepositAddress: '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a',
      btcDepositAddress: 'bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9',
      ethDepositAddress: '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a',
      bnbDepositAddress: '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a',
    };

    // 12. Market Data & Candlestick History
    const marketData = this.generateRealisticMarketData();

    // 13. Transactions Ledger
    const transactions: LedgerTransaction[] = [
      {
        id: 'tx_seed_01',
        type: 'DEPOSIT',
        amount: '15000.00000000',
        asset: 'USDT',
        referenceId: 'dep_01',
        description: 'Confirmed TRON TRC20 blockchain deposit',
        status: 'POSTED',
        timestamp: new Date(Date.now() - 40 * 86400000).toISOString(),
        entries: [
          {
            id: 'ent_01_deb',
            transactionId: 'tx_seed_01',
            accountId: 'acc_platform_reserve_USDT',
            entryType: 'DEBIT',
            amount: '15000.00000000',
            balanceAfter: '9985000.00000000',
            createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          },
          {
            id: 'ent_01_crd',
            transactionId: 'tx_seed_01',
            accountId: `acc_usr_investor_01_USDT_AVAILABLE`,
            entryType: 'CREDIT',
            amount: '15000.00000000',
            balanceAfter: '15000.00000000',
            createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          },
        ],
      },
      {
        id: 'tx_seed_02',
        type: 'INVESTMENT_ALLOCATE',
        amount: '1000.00000000',
        asset: 'USDT',
        referenceId: 'inv_01',
        description: 'Allocated to Elite Scalper 1,000 USDT (30D)',
        status: 'POSTED',
        timestamp: inv1StartTime.toISOString(),
        entries: [
          {
            id: 'ent_02_deb',
            transactionId: 'tx_seed_02',
            accountId: `acc_usr_investor_01_USDT_AVAILABLE`,
            entryType: 'DEBIT',
            amount: '1000.00000000',
            balanceAfter: '14000.00000000',
            createdAt: inv1StartTime.toISOString(),
          },
          {
            id: 'ent_02_crd',
            transactionId: 'tx_seed_02',
            accountId: `acc_usr_investor_01_USDT_INVESTED`,
            entryType: 'CREDIT',
            amount: '1000.00000000',
            balanceAfter: '1000.00000000',
            createdAt: inv1StartTime.toISOString(),
          },
        ],
      },
      {
        id: 'tx_seed_03',
        type: 'WITHDRAWAL_LOCK',
        amount: '1000.00000000',
        asset: 'USDT',
        referenceId: 'wth_01',
        description: 'Locked 1000 USDT for pending withdrawal review',
        status: 'POSTED',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        entries: [
          {
            id: 'ent_03_deb',
            transactionId: 'tx_seed_03',
            accountId: `acc_usr_investor_01_USDT_AVAILABLE`,
            entryType: 'DEBIT',
            amount: '1000.00000000',
            balanceAfter: '14250.00000000',
            createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
          {
            id: 'ent_03_crd',
            transactionId: 'tx_seed_03',
            accountId: `acc_usr_investor_01_USDT_RESERVED`,
            entryType: 'CREDIT',
            amount: '1000.00000000',
            balanceAfter: '1000.00000000',
            createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
        ],
      },
    ];

    // 14. Smart Trading Bots (Active, simulated ticks, real state control)
    const btcCandles = marketData['BTC/USDT']?.candles || [];
    const ethCandles = marketData['ETH/USDT']?.candles || [];
    const solCandles = marketData['SOL/USDT']?.candles || [];

    const bots: Record<string, import('../../types/index.ts').TradingBot> = {
      bot_01: {
        id: 'bot_01',
        name: 'Smart Trader',
        strategy: 'Grid & Mean Reversion',
        pair: 'BTC/USDT',
        status: 'ACTIVE',
        runtimeHours: 48,
        totalTrades: 132,
        winRate: 84.5,
        profitUSDT: 342.5,
        currentProfitPct: 6.85,
        allocatedUSDT: 5000,
        startedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        countdownSeconds: 14400,
        indicators: {
          rsi: 54.2,
          macd: 'Bullish Divergence',
          trend: 'صاعد إيجابي (Bullish)',
        },
        candles: btcCandles.slice(-18),
      },
      bot_02: {
        id: 'bot_02',
        name: 'Trend Master',
        strategy: 'EMA Ribbon + SuperTrend',
        pair: 'ETH/USDT',
        status: 'ACTIVE',
        runtimeHours: 36,
        totalTrades: 98,
        winRate: 81.2,
        profitUSDT: 218.4,
        currentProfitPct: 7.28,
        allocatedUSDT: 3000,
        startedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
        countdownSeconds: 21600,
        indicators: {
          rsi: 62.8,
          macd: 'MACD Golden Cross',
          trend: 'قوي إيجابي (Strong Trend)',
        },
        candles: ethCandles.slice(-18),
      },
      bot_03: {
        id: 'bot_03',
        name: 'AI Strategy',
        strategy: 'Multi-Factor Neural Momentum',
        pair: 'SOL/USDT',
        status: 'ACTIVE',
        runtimeHours: 72,
        totalTrades: 215,
        winRate: 88.0,
        profitUSDT: 580.9,
        currentProfitPct: 8.3,
        allocatedUSDT: 7000,
        startedAt: new Date(Date.now() - 72 * 3600000).toISOString(),
        countdownSeconds: 7200,
        indicators: {
          rsi: 48.6,
          macd: 'Neutral Reversal',
          trend: 'تجميع إيجابي (Accumulation)',
        },
        candles: solCandles.slice(-18),
      },
    };

    const state: DatabaseState = {
      users,
      accounts,
      transactions,
      investmentPlans,
      investments,
      deposits,
      withdrawals,
      kycSubmissions,
      supportTickets,
      notifications,
      auditLogs,
      systemSettings,
      marketData,
      bots,
      verificationCodes: {},
      emailMessages: [],
    };

    this.ensureChiefAdminAndReferrals(state);
    return state;
  }

  public generateRealisticMarketData(): Record<string, MarketTicker> {
    const pairs: {
      symbol: string;
      baseAsset: AssetSymbol;
      quoteAsset: string;
      basePrice: number;
      volatility: number;
    }[] = [
      { symbol: 'BTC/USDT', baseAsset: 'BTC', quoteAsset: 'USDT', basePrice: 68420.5, volatility: 0.02 },
      { symbol: 'ETH/USDT', baseAsset: 'ETH', quoteAsset: 'USDT', basePrice: 3512.8, volatility: 0.025 },
      { symbol: 'SOL/USDT', baseAsset: 'SOL', quoteAsset: 'USDT', basePrice: 178.45, volatility: 0.035 },
      { symbol: 'PAXG/USDT', baseAsset: 'PAXG', quoteAsset: 'USDT', basePrice: 2742.1, volatility: 0.008 },
      { symbol: 'BNB/USDT', baseAsset: 'BNB', quoteAsset: 'USDT', basePrice: 598.6, volatility: 0.018 },
    ];

    const marketData: Record<string, MarketTicker> = {};
    const now = Math.floor(Date.now() / 1000);
    const candleCount = 48; // 48 hours of 1-hour candles
    const intervalSec = 3600;

    for (const p of pairs) {
      let currentPrice = p.basePrice;
      const candles: MarketTicker['candles'] = [];

      // Generate realistic geometric Brownian motion series
      for (let i = candleCount; i >= 0; i--) {
        const time = now - i * intervalSec;
        const drift = 0.0004 * (Math.random() - 0.48);
        const change = currentPrice * (drift + (Math.random() - 0.49) * p.volatility);
        const open = currentPrice;
        const close = Math.max(1, open + change);
        const high = Math.max(open, close) + Math.random() * (open * 0.006);
        const low = Math.min(open, close) - Math.random() * (open * 0.006);
        const volume = Math.floor((open * 15 + Math.random() * open * 40) / 10);

        candles.push({
          time,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume,
        });

        currentPrice = close;
      }

      const open24h = candles[candles.length - 25]?.open || p.basePrice;
      const lastCandle = candles[candles.length - 1];
      const change24h = Number((((lastCandle.close - open24h) / open24h) * 100).toFixed(2));
      const highs24h = candles.slice(-24).map((c) => c.high);
      const lows24h = candles.slice(-24).map((c) => c.low);
      const volumes24h = candles.slice(-24).reduce((sum, c) => sum + c.volume, 0);

      marketData[p.symbol] = {
        symbol: p.symbol,
        baseAsset: p.baseAsset,
        quoteAsset: p.quoteAsset,
        price: lastCandle.close,
        change24h,
        high24h: Math.max(...highs24h),
        low24h: Math.min(...lows24h),
        volume24h: volumes24h,
        lastUpdated: new Date().toISOString(),
        candles,
      };
    }

    return marketData;
  }

  // Periodic simulated price ticks and strategy yield calculations
  private startBackgroundReconciler() {
    setInterval(() => {
      try {
        // 1. Tick market prices slightly
        for (const symbol in this.state.marketData) {
          const ticker = this.state.marketData[symbol];
          const delta = (Math.random() - 0.495) * 0.002 * ticker.price;
          const newPrice = Number((ticker.price + delta).toFixed(2));
          ticker.price = newPrice;
          ticker.lastUpdated = new Date().toISOString();
          const lastCandle = ticker.candles[ticker.candles.length - 1];
          if (lastCandle) {
            lastCandle.close = newPrice;
            lastCandle.high = Math.max(lastCandle.high, newPrice);
            lastCandle.low = Math.min(lastCandle.low, newPrice);
          }
        }

        // 2. Reconcile active investments countdown & credit daily profits automatically
        this.reconcileAndCreditDailyProfits();

        // 3. Reconcile active trading bots
        if (this.state.bots) {
          for (const botId in this.state.bots) {
            const bot = this.state.bots[botId];
            if (bot.status === 'ACTIVE') {
              if (bot.countdownSeconds > 5) {
                bot.countdownSeconds -= 5;
              } else {
                bot.countdownSeconds = Math.floor(10800 + Math.random() * 7200);
                bot.totalTrades += 1;
                const incrementalProfit = Number((Math.random() * 2.5 + 0.5).toFixed(2));
                bot.profitUSDT = Number((bot.profitUSDT + incrementalProfit).toFixed(2));
                bot.currentProfitPct = Number(((bot.profitUSDT / bot.allocatedUSDT) * 100).toFixed(2));
              }
              const market = this.state.marketData[bot.pair];
              if (market && market.candles) {
                bot.candles = market.candles.slice(-18);
              }
            }
          }
        }
      } catch (e) {
        console.error('[Reconciler] Background tick error:', e);
      }
    }, 4000);
  }

  /**
   * Credits daily earned profits from active investment plans directly to the user's
   * withdrawable balance so daily profits can be withdrawn every day while principal stays frozen.
   */
  public reconcileAndCreditDailyProfits(targetUserId?: string): void {
    const nowMs = Date.now();
    let changed = false;
    const accountsMap = new Map<string, LedgerAccount>(Object.entries(this.state.accounts));

    for (const invId in this.state.investments) {
      const inv = this.state.investments[invId];
      if (!inv || inv.status !== 'ACTIVE') continue;
      if (targetUserId && inv.userId !== targetUserId) continue;

      const startMs = new Date(inv.startTime).getTime();
      const endMs = new Date(inv.scheduledEndTime).getTime();
      const elapsedMs = Math.max(0, nowMs - startMs);
      const durationDays = Math.max(1, inv.durationDays || 7);
      const apr = inv.aprAtActivation || 7;
      // 7% every 24 hours: dailyProfit = principal * (apr / 100), totalCycleYield = dailyProfit * durationDays
      const dailyProfit = Number(inv.initialAmount) * (apr / 100);
      const totalCycleYield = dailyProfit * durationDays;
      inv.dailyProfitUSDT = toFixedDecimal(dailyProfit);

      if (nowMs >= endMs) {
        inv.status = 'COMPLETED';
        inv.unrealizedPnl = '0.00000000';
        inv.currentValuation = toFixedDecimal(Number(inv.initialAmount) + totalCycleYield);
        try {
          this.completeInvestment(inv.id);
          changed = true;
        } catch (err) {
          console.error(`[Reconciler] Auto-completion error for ${inv.id}:`, err);
        }
        continue;
      }

      // Daily profit accrual: First withdrawal & first daily profit unlock after 24 hours (86,400,000 ms),
      // and each subsequent 24-hour cycle unlocks another daily installment.
      const daysElapsed = Math.min(durationDays, Math.floor(elapsedMs / 86400000));
      const earnedToDate = Math.min(totalCycleYield, dailyProfit * daysElapsed);
      const alreadyClaimed = Number(inv.claimedPnl || 0);
      const unclaimedDelta = Number((earnedToDate - alreadyClaimed).toFixed(8));

      if (unclaimedDelta >= 0.01) {
        const availableAccId = `acc_${inv.userId}_${inv.asset}_AVAILABLE`;
        const platformReserveAccId = `acc_platform_reserve_${inv.asset}`;
        if (accountsMap.has(availableAccId) && accountsMap.has(platformReserveAccId)) {
          try {
            const deltaFixed = toFixedDecimal(unclaimedDelta);
            const { transaction: txDaily } = LedgerEngine.postTransaction(accountsMap, {
              debitAccountId: platformReserveAccId,
              creditAccountId: availableAccId,
              amount: deltaFixed,
              asset: inv.asset,
              type: 'INVESTMENT_RETURN',
              description: `ربح يومي قابل للسحب من ${inv.planName}`,
              referenceId: `daily_${inv.id}_${Date.now()}`,
            });
            this.state.transactions.push(txDaily);
            inv.claimedPnl = toFixedDecimal(alreadyClaimed + unclaimedDelta);
            inv.realizedPnl = inv.claimedPnl;
            changed = true;

            // 3% profit share for referrer on daily profit (ONLY if invitee has a confirmed deposit)
            const user = this.state.users[inv.userId];
            const inviteeHasConfirmedDeposit = Object.values(this.state.deposits || {}).some(
              (d) => d.userId === inv.userId && d.status === 'CONFIRMED' && Number(d.amount || 0) > 0
            );
            if (user && user.referredBy && inviteeHasConfirmedDeposit) {
              const refCodeLower = user.referredBy.toLowerCase();
              const referrer = Object.values(this.state.users).find(
                (u) =>
                  u.id !== user.id &&
                  ((u.referralCode && u.referralCode.toLowerCase() === refCodeLower) ||
                    u.id === user.referredBy ||
                    (u.id === 'usr_admin_chief' && user.referredBy === '100001'))
              );
              if (referrer && referrer.id !== user.id) {
                const shareNum = unclaimedDelta * 0.03;
                if (shareNum >= 0.0001) {
                  const shareStr = toFixedDecimal(shareNum);
                  const refAvailId = `acc_${referrer.id}_${inv.asset}_AVAILABLE`;
                  if (accountsMap.has(refAvailId)) {
                    const { transaction: txShare } = LedgerEngine.postTransaction(accountsMap, {
                      debitAccountId: platformReserveAccId,
                      creditAccountId: refAvailId,
                      amount: shareStr,
                      asset: inv.asset,
                      type: 'REFERRAL_PROFIT_SHARE',
                      description: `عمولة 3% من الربح اليومي للمدعو (${user.fullName})`,
                      referenceId: `ref_daily_${inv.id}`,
                    });
                    this.state.transactions.push(txShare);
                    referrer.referralProfitShareUSDT = addDecimals(
                      referrer.referralProfitShareUSDT || '0.00000000',
                      shareStr
                    );
                  }
                }
              }
            }
          } catch (e) {
            console.warn('[DailyProfit] Credit warning:', e);
          }
        }
      }

      const currentClaimed = Number(inv.claimedPnl || 0);
      inv.realizedPnl = toFixedDecimal(currentClaimed);
      inv.unrealizedPnl = toFixedDecimal(Math.max(0, totalCycleYield - currentClaimed));
      inv.currentValuation = toFixedDecimal(Number(inv.initialAmount) + currentClaimed);
      inv.lastReconciledAt = new Date().toISOString();
    }

    if (changed) {
      for (const [id, acc] of accountsMap.entries()) {
        this.state.accounts[id] = acc;
      }
      this.saveToDisk();
    }
  }

  // Double-entry investment completion
  public completeInvestment(investmentId: string): void {
    const inv = this.state.investments[investmentId];
    if (!inv || inv.status !== 'COMPLETED') return;

    const user = this.state.users[inv.userId];
    if (!user) return;

    const investedAccId = `acc_${inv.userId}_${inv.asset}_INVESTED`;
    const availableAccId = `acc_${inv.userId}_${inv.asset}_AVAILABLE`;
    const platformReserveAccId = `acc_platform_reserve_${inv.asset}`;

    const accountsMap = new Map<string, LedgerAccount>(Object.entries(this.state.accounts));

    // Return principal: INVESTED -> AVAILABLE
    const { transaction: txPrincipal } = LedgerEngine.postTransaction(accountsMap, {
      debitAccountId: investedAccId,
      creditAccountId: availableAccId,
      amount: inv.initialAmount,
      asset: inv.asset,
      type: 'INVESTMENT_RETURN',
      description: `Return principal from ${inv.planName}`,
      referenceId: inv.id,
    });
    this.state.transactions.push(txPrincipal);

    const durationDays = Math.max(1, inv.durationDays || 7);
    const dailyProfit = Number(inv.initialAmount) * ((inv.aprAtActivation || 7) / 100);
    const totalFinalYield = dailyProfit * durationDays;
    const alreadyClaimed = Number(inv.claimedPnl || 0);
    const remainingYield = Math.max(0, Number((totalFinalYield - alreadyClaimed).toFixed(8)));

    // Credit any remaining unpaid profit: PLATFORM_RESERVE -> AVAILABLE
    if (remainingYield >= 0.0001) {
      const remFixed = toFixedDecimal(remainingYield);
      const { transaction: txProfit } = LedgerEngine.postTransaction(accountsMap, {
        debitAccountId: platformReserveAccId,
        creditAccountId: availableAccId,
        amount: remFixed,
        asset: inv.asset,
        type: 'INVESTMENT_RETURN',
        description: `Final yield payout from ${inv.planName}`,
        referenceId: inv.id,
      });
      this.state.transactions.push(txProfit);
    }

    inv.claimedPnl = toFixedDecimal(totalFinalYield);
    inv.realizedPnl = toFixedDecimal(totalFinalYield);
    inv.unrealizedPnl = '0.00000000';

    // Write back accounts
    for (const [id, acc] of accountsMap.entries()) {
      this.state.accounts[id] = acc;
    }

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: inv.userId,
      title: 'اكتملت خطة الاستثمار',
      message: `اكتملت خطة ${inv.planName} بنجاح وتم تحرير رأس المال مع الأرباح.`,
      type: 'INVESTMENT',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.saveToDisk();
  }

  // Database Accessors & Mutators
  public getState(): DatabaseState {
    return this.state;
  }

  public getBots(): Record<string, import('../../types/index.ts').TradingBot> {
    return this.state.bots || {};
  }

  public updateBotStatus(
    id: string,
    status: 'ACTIVE' | 'PAUSED' | 'STOPPED'
  ): import('../../types/index.ts').TradingBot {
    if (!this.state.bots) this.state.bots = {};
    const bot = this.state.bots[id];
    if (!bot) throw new Error(`Bot ${id} not found`);
    bot.status = status;
    this.saveToDisk();
    return bot;
  }

  public getUserByEmail(email: string): (User & { passwordHash: string; salt: string }) | undefined {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return undefined;
    return Object.values(this.state.users).find((u) => u.email && u.email.toLowerCase() === clean);
  }

  public getUserByEmailOrPhone(identifier: string): (User & { passwordHash: string; salt: string }) | undefined {
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return undefined;
    const phoneClean = identifier.trim().replace(/[\s\-\(\)\+]/g, '');
    return Object.values(this.state.users).find((u) => {
      if (u.email && u.email.trim() && u.email.toLowerCase() === clean) return true;
      if (u.phone) {
        const uPhoneClean = u.phone.replace(/[\s\-\(\)\+]/g, '');
        if (uPhoneClean && (uPhoneClean === phoneClean || u.phone.trim() === identifier.trim())) return true;
      }
      return false;
    });
  }

  public getReferralSummary(userId: string) {
    const user = this.state.users[userId];
    if (!user) throw new Error('User not found');

    const referralCode = user.referralCode || 'GOLD777';
    const isChief = user.id === 'usr_admin_chief' || (user.email && user.email.toLowerCase() === 'hha253ee@gmail.com');
    const invitees = Object.values(this.state.users).filter(
      (u) =>
        u.id !== user.id &&
        u.referredBy &&
        (u.referredBy.toLowerCase() === referralCode.toLowerCase() ||
          u.referredBy === user.id ||
          (isChief && u.referredBy === '100001'))
    );

    // Collect all referral bonus and profit share ledger transactions for this user
    const referralTransactions = this.state.transactions
      .filter((t) => t.type === 'REFERRAL_BONUS' || t.type === 'REFERRAL_PROFIT_SHARE')
      .filter((t) =>
        t.entries.some((e) => e.accountId === `acc_${userId}_USDT_AVAILABLE` && e.entryType === 'CREDIT')
      )
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        asset: t.asset,
        description: t.description,
        timestamp: t.timestamp,
        status: t.status,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const getVipName = (count: number, volumeUSDT: number = 0) => {
      if (count >= 50 || volumeUSDT >= 10000) return 'VIP 7';
      if (count >= 35 || volumeUSDT >= 5000) return 'VIP 6';
      if (count >= 20 || volumeUSDT >= 3000) return 'VIP 5';
      if (count >= 10 || volumeUSDT >= 1500) return 'VIP 4';
      if (count >= 5 || volumeUSDT >= 600) return 'VIP 3';
      if (count >= 3 || volumeUSDT >= 200) return 'VIP 2';
      return 'VIP 1';
    };

    const rawInvitees = invitees.map((inv) => {
      const invInvestments = Object.values(this.state.investments).filter((i) => i.userId === inv.id);
      const invDeposits = Object.values(this.state.deposits).filter(
        (d) => d.userId === inv.id && d.status === 'CONFIRMED'
      );
      const totalDepositedUSDT = invDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const hasConfirmedDeposit = totalDepositedUSDT > 0;

      const totalRealizedPnlUSDT = hasConfirmedDeposit
        ? invInvestments.reduce(
            (sum, i) => sum + (i.asset === 'USDT' ? Number(i.realizedPnl || 0) : 0),
            0
          )
        : 0;
      const totalUnrealizedPnlUSDT = hasConfirmedDeposit
        ? invInvestments.reduce(
            (sum, i) => sum + (i.asset === 'USDT' ? Number(i.unrealizedPnl || 0) : 0),
            0
          )
        : 0;
      const inviteeProfitUSDT = hasConfirmedDeposit ? totalRealizedPnlUSDT + totalUnrealizedPnlUSDT : 0;

      const invSubCount = Object.values(this.state.users).filter(
        (u) => u.referredBy === inv.referralCode || u.referredBy === inv.id
      ).length;

      // Strictly ZERO referral bonus until the invited member makes a confirmed deposit
      const effectiveVolume = hasConfirmedDeposit ? totalDepositedUSDT : 0;
      const directBonusUSDT = hasConfirmedDeposit ? Math.floor(totalDepositedUSDT / 100) * 10 : 0;
      // 3% commission on their earnings (only after confirmed deposit)
      const profitShareUSDT = hasConfirmedDeposit ? Number((inviteeProfitUSDT * 0.03).toFixed(2)) : 0;
      const totalMemberReward = directBonusUSDT + profitShareUSDT;

      return {
        id: inv.id,
        name: inv.fullName,
        vipLevel: getVipName(invSubCount, effectiveVolume),
        maskedEmail: inv.email
          ? inv.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
          : (inv.phone ? inv.phone.slice(0, 4) + '***' + inv.phone.slice(-3) : 'User-' + inv.id.slice(-4)),
        phone: inv.phone,
        joinedAt: inv.createdAt,
        status: inv.status,
        hasConfirmedDeposit,
        effectiveVolume,
        totalMemberReward,
        totalDepositedUSDT: totalDepositedUSDT.toFixed(2),
        totalInvestedUSDT: effectiveVolume.toFixed(2),
        totalRealizedPnlUSDT: totalRealizedPnlUSDT.toFixed(2),
        inviteeProfitUSDT: inviteeProfitUSDT.toFixed(2),
        directBonusUSDT: directBonusUSDT.toFixed(2),
        profitShareUSDT: profitShareUSDT.toFixed(2),
        totalRewardUSDT: totalMemberReward.toFixed(2),
        activeInvestmentsCount: hasConfirmedDeposit ? invInvestments.filter((i) => i.status === 'ACTIVE').length : 0,
      };
    });

    const totalTeamVolume = rawInvitees.reduce((s, i) => s + i.effectiveVolume, 0);
    const totalTeamRewards = rawInvitees.reduce((s, i) => s + i.totalMemberReward, 0);

    const inviteesWithMetrics = rawInvitees
      .sort((a, b) => b.totalMemberReward - a.totalMemberReward || b.effectiveVolume - a.effectiveVolume)
      .map((item) => {
        let contributionPct = 0;
        if (totalTeamRewards > 0) {
          contributionPct = (item.totalMemberReward / totalTeamRewards) * 100;
        } else if (totalTeamVolume > 0) {
          contributionPct = (item.effectiveVolume / totalTeamVolume) * 100;
        } else if (rawInvitees.length > 0) {
          contributionPct = 100 / rawInvitees.length;
        }

        return {
          ...item,
          contributionPercent: Number(contributionPct.toFixed(1)),
          commissionRatePercent: 3,
        };
      });

    // Strictly sync user referral earnings to actual confirmed deposits of invitees
    const totalEarnings = inviteesWithMetrics.reduce((s, i) => s + Number(i.directBonusUSDT || 0), 0);
    const totalProfitShare = inviteesWithMetrics.reduce((s, i) => s + Number(i.profitShareUSDT || 0), 0);
    const totalInviteesProfit = inviteesWithMetrics.reduce((s, i) => s + Number(i.inviteeProfitUSDT || 0), 0);
    const totalCombinedUSDT = (totalEarnings + totalProfitShare).toFixed(2);

    user.referralCount = invitees.length;
    user.referralEarningsUSDT = totalEarnings.toFixed(2);
    user.referralProfitShareUSDT = totalProfitShare.toFixed(2);

    return {
      referralCode,
      referralLink: `https://goldrix.exchange/?ref=${referralCode}`,
      vipLevel: getVipName(invitees.length, totalTeamVolume),
      ruleDepositBonusUSDT: 10,
      ruleMinDepositUSDT: 100,
      ruleProfitSharePercent: 3,
      totalInvited: invitees.length,
      referralCount: invitees.length,
      totalEarningsUSDT: totalEarnings.toFixed(2),
      totalProfitShareUSDT: totalProfitShare.toFixed(2),
      totalInviteesProfitUSDT: totalInviteesProfit.toFixed(2),
      totalCombinedUSDT,
      invitees: inviteesWithMetrics,
      bonusHistory: totalEarnings + totalProfitShare > 0 ? referralTransactions : [],
    };
  }

  public simulateReferralInvestment(referrerId: string, planAmount: number = 100): {
    bonusAwardedUSDT: string;
    commissionAwardedUSDT: string;
    inviteeName: string;
    summary: any;
  } {
    const referrer = this.state.users[referrerId];
    if (!referrer) throw new Error('Referrer user not found');

    const names = ['طارق الشمري', 'سارة العتيبي', 'عمر المحمود', 'فاطمة الكعبي', 'خالد الزهراني', 'نورة الدوسري'];
    const randomName = names[Math.floor(Math.random() * names.length)] + ` (${Math.floor(100 + Math.random() * 900)})`;
    const mockEmail = `invitee_${Date.now()}@investor.test`;
    const mockId = `usr_inv_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newUser: User & { passwordHash: string; salt: string } = {
      id: mockId,
      fullName: randomName,
      email: mockEmail,
      role: 'USER',
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      twoFactorEnabled: false,
      referralCode: `REF_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      referredBy: referrer.referralCode || referrer.id,
      createdAt: nowIso,
      lastLoginAt: nowIso,
      language: 'ar',
      passwordHash: 'mock',
      salt: 'mock',
    };
    this.state.users[mockId] = newUser;

    const assets: AssetSymbol[] = ['USDT', 'BTC', 'ETH', 'SOL', 'PAXG', 'BNB'];
    for (const a of assets) {
      this.state.accounts[`acc_${mockId}_${a}_AVAILABLE`] = {
        id: `acc_${mockId}_${a}_AVAILABLE`,
        userId: mockId,
        type: 'AVAILABLE',
        asset: a,
        balance: a === 'USDT' ? '10000.00000000' : '0.00000000',
        updatedAt: nowIso,
      };
      this.state.accounts[`acc_${mockId}_${a}_RESERVED`] = {
        id: `acc_${mockId}_${a}_RESERVED`,
        userId: mockId,
        type: 'RESERVED',
        asset: a,
        balance: '0.00000000',
        updatedAt: nowIso,
      };
      this.state.accounts[`acc_${mockId}_${a}_INVESTED`] = {
        id: `acc_${mockId}_${a}_INVESTED`,
        userId: mockId,
        type: 'INVESTED',
        asset: a,
        balance: '0.00000000',
        updatedAt: nowIso,
      };
    }

    const planKey = Object.keys(this.state.investmentPlans).find((k) => {
      const p = this.state.investmentPlans[k];
      return p.asset === 'USDT' && Number(p.fixedAmount) === planAmount;
    }) || Object.keys(this.state.investmentPlans)[0];

    const { investment } = this.activateInvestment(mockId, planKey, planAmount.toString());

    referrer.referralCount = (referrer.referralCount || 0) + 1;

    // Simulate matured earnings of ~10% to also test the 3% commission on investment earnings!
    const simulatedProfitNum = Number((planAmount * 0.10).toFixed(2));
    investment.realizedPnl = toFixedDecimal(simulatedProfitNum);
    investment.status = 'COMPLETED';
    this.completeInvestment(investment.id);

    this.saveToDisk();

    const hundreds = Math.floor(planAmount / 100);
    const bonusNum = hundreds * 10;
    const commissionNum = Number((simulatedProfitNum * 0.03).toFixed(2));

    const summary = this.getReferralSummary(referrerId);
    return {
      bonusAwardedUSDT: bonusNum.toFixed(2),
      commissionAwardedUSDT: commissionNum.toFixed(2),
      inviteeName: randomName,
      summary,
    };
  }

  public getUserById(id: string): (User & { passwordHash: string; salt: string }) | undefined {
    if (!id) return undefined;
    if (this.state.users[id]) return this.state.users[id];
    // Also support lookup by 6-digit numeric Client ID
    const cleanId = id.trim();
    if (cleanId === '100001') return this.state.users['usr_admin_chief'];
    if (cleanId === '100002') return this.state.users['usr_admin_01'];
    if (cleanId === '100003') return this.state.users['usr_compliance_01'];
    if (cleanId === '100240') return this.state.users['usr_investor_01'];
    return Object.values(this.state.users).find((u) => {
      let hash = 0;
      for (let i = 0; i < u.id.length; i++) {
        hash = (hash * 31 + u.id.charCodeAt(i)) % 900000;
      }
      const derived = String(Math.abs(hash) + 100000).slice(0, 6);
      return derived === cleanId;
    });
  }

  public createUser(user: User & { passwordHash: string; salt: string }): void {
    this.state.users[user.id] = user;

    // Increment inviter's referralCount if referredBy matches an existing user (NO bonus is added until deposit)
    if (user.referredBy) {
      const refClean = user.referredBy.trim();
      const referrer =
        this.getUserById(refClean) ||
        Object.values(this.state.users).find(
          (u) =>
            u.id !== user.id &&
            ((u.referralCode && u.referralCode.toLowerCase() === refClean.toLowerCase()) ||
              u.id === refClean)
        );
      if (referrer && referrer.id !== user.id) {
        user.referredBy = referrer.referralCode || referrer.id;
        referrer.referralCount = (referrer.referralCount || 0) + 1;
      }
    }

    // Create default ledger accounts for all supported assets starting strictly at 0.00000000
    const assets: AssetSymbol[] = ['USDT', 'BTC', 'ETH', 'SOL', 'PAXG', 'BNB'];
    const nowIso = new Date().toISOString();

    for (const asset of assets) {
      const availId = `acc_${user.id}_${asset}_AVAILABLE`;
      const resId = `acc_${user.id}_${asset}_RESERVED`;
      const invId = `acc_${user.id}_${asset}_INVESTED`;

      this.state.accounts[availId] = {
        id: availId,
        userId: user.id,
        type: 'AVAILABLE',
        asset,
        balance: '0.00000000',
        updatedAt: nowIso,
      };

      this.state.accounts[resId] = {
        id: resId,
        userId: user.id,
        type: 'RESERVED',
        asset,
        balance: '0.00000000',
        updatedAt: nowIso,
      };

      this.state.accounts[invId] = {
        id: invId,
        userId: user.id,
        type: 'INVESTED',
        asset,
        balance: '0.00000000',
        updatedAt: nowIso,
      };
    }

    this.syncUserVerificationToPostgres(user);
    this.saveToDisk();
  }

  public updateUser(user: User & { passwordHash: string; salt: string }): void {
    this.state.users[user.id] = user;
    this.syncUserVerificationToPostgres(user);
    this.saveToDisk();
  }

  public syncUserVerificationToPostgres(user: User): void {
    if (!this.pgPool || !this.pgConnected) return;
    this.pgPool
      .query(
        `INSERT INTO user_verification_status (
          user_id, email, phone, is_email_verified, email_verified_at, is_phone_verified, phone_verified_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          is_email_verified = EXCLUDED.is_email_verified,
          email_verified_at = EXCLUDED.email_verified_at,
          is_phone_verified = EXCLUDED.is_phone_verified,
          phone_verified_at = EXCLUDED.phone_verified_at,
          updated_at = NOW();`,
        [
          user.id,
          user.email || null,
          user.phone || null,
          Boolean(user.isEmailVerified),
          user.emailVerifiedAt || null,
          Boolean(user.isPhoneVerified),
          user.phoneVerifiedAt || null,
        ]
      )
      .catch((err) => {
        console.warn('[DB] PostgreSQL user_verification_status sync warning:', err?.message || err);
      });
  }

  public upsertOtpRecord(key: string, record: VerificationCodeRecord): void {
    if (!this.state.verificationCodes) {
      this.state.verificationCodes = {};
    }
    this.state.verificationCodes[key] = record;
    this.saveToDisk();

    if (this.pgPool && this.pgConnected) {
      this.pgPool
        .query(
          `INSERT INTO otp_verifications (
            target_key, id, target, channel, code, user_id, attempts, max_attempts,
            send_count, max_sends, last_sent_at, delivered_via, verified, verified_at, created_at, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (target_key) DO UPDATE SET
            id = EXCLUDED.id,
            code = EXCLUDED.code,
            user_id = EXCLUDED.user_id,
            attempts = EXCLUDED.attempts,
            max_attempts = EXCLUDED.max_attempts,
            send_count = EXCLUDED.send_count,
            max_sends = EXCLUDED.max_sends,
            last_sent_at = EXCLUDED.last_sent_at,
            delivered_via = EXCLUDED.delivered_via,
            verified = EXCLUDED.verified,
            verified_at = EXCLUDED.verified_at,
            created_at = EXCLUDED.created_at,
            expires_at = EXCLUDED.expires_at;`,
          [
            key,
            record.id,
            record.target,
            record.channel,
            record.code,
            record.userId || null,
            record.attempts,
            record.maxAttempts,
            record.sendCount,
            record.maxSends,
            record.lastSentAt,
            record.deliveredVia,
            Boolean(record.verified),
            record.verifiedAt || null,
            record.createdAt,
            record.expiresAt,
          ]
        )
        .catch((err) => {
          console.warn('[DB] PostgreSQL otp_verifications upsert warning:', err?.message || err);
        });
    }
  }

  public deleteOtpRecord(key: string): void {
    if (this.state.verificationCodes && this.state.verificationCodes[key]) {
      delete this.state.verificationCodes[key];
      this.saveToDisk();
    }
    if (this.pgPool && this.pgConnected) {
      this.pgPool
        .query(`DELETE FROM otp_verifications WHERE target_key = $1;`, [key])
        .catch((err) => {
          console.warn('[DB] PostgreSQL otp_verifications delete warning:', err?.message || err);
        });
    }
  }

  public getUserBalances(userId: string): {
    available: Record<AssetSymbol, string>;
    reserved: Record<AssetSymbol, string>;
    invested: Record<AssetSymbol, string>;
    totalEstimatedUSDT: string;
    totalInvestedUSDT: string;
    totalRealizedPnlUSDT: string;
    totalUnrealizedPnlUSDT: string;
    withdrawableUSDT: string;
    frozenDepositUSDT: string;
    totalFrozenCapitalUSDT: string;
    dailyProfitRateUSDT: string;
    firstWithdrawalUnlockAt: string;
    isFirstWithdrawalLocked: boolean;
    firstWithdrawalRemainingSeconds: number;
    hasPreviousWithdrawal: boolean;
  } {
    // Ensure any daily profits from active plans are credited to available balance
    this.reconcileAndCreditDailyProfits(userId);

    const assets: AssetSymbol[] = ['USDT', 'BTC', 'ETH', 'SOL', 'PAXG', 'BNB'];
    const available = {} as Record<AssetSymbol, string>;
    const reserved = {} as Record<AssetSymbol, string>;
    const invested = {} as Record<AssetSymbol, string>;

    for (const asset of assets) {
      available[asset] = this.state.accounts[`acc_${userId}_${asset}_AVAILABLE`]?.balance || '0.00000000';
      reserved[asset] = this.state.accounts[`acc_${userId}_${asset}_RESERVED`]?.balance || '0.00000000';
      invested[asset] = this.state.accounts[`acc_${userId}_${asset}_INVESTED`]?.balance || '0.00000000';
    }

    // Calculate total USDT value using current ticker prices
    let totalEstimatedUSDT = Number(available['USDT']) + Number(reserved['USDT']) + Number(invested['USDT']);
    let totalInvestedUSDT = Number(invested['USDT']);

    for (const asset of assets) {
      if (asset !== 'USDT') {
        const symbol = `${asset}/USDT`;
        const price = this.state.marketData[symbol]?.price || 1;
        const totalAssetHolding = Number(available[asset]) + Number(reserved[asset]) + Number(invested[asset]);
        totalEstimatedUSDT += totalAssetHolding * price;
        totalInvestedUSDT += Number(invested[asset]) * price;
      }
    }

    // PnL & Daily profit rate from investments
    const userInvestments = Object.values(this.state.investments).filter((i) => i.userId === userId);
    let totalRealizedPnlUSDT = 0;
    let totalUnrealizedPnlUSDT = 0;
    let dailyProfitRateUSDT = 0;
    let totalAllocatedToPlansUSDT = 0;
    let completedPrincipalUSDT = 0;

    for (const inv of userInvestments) {
      const price = inv.asset === 'USDT' ? 1 : this.state.marketData[`${inv.asset}/USDT`]?.price || 1;
      const planRate = inv.aprAtActivation || this.state.investmentPlans[inv.planId]?.estimatedAprMin || 3;
      totalRealizedPnlUSDT += Number(inv.claimedPnl ?? inv.realizedPnl ?? 0) * price;
      totalUnrealizedPnlUSDT += Number(inv.unrealizedPnl || 0) * price;
      if (inv.asset === 'USDT') {
        totalAllocatedToPlansUSDT += Number(inv.initialAmount || 0);
        if (inv.status === 'COMPLETED') {
          completedPrincipalUSDT += Number(inv.initialAmount || 0);
        }
      }
      if (inv.status === 'ACTIVE') {
        const dailyRate = Number(inv.initialAmount || 0) * (planRate / 100);
        dailyProfitRateUSDT += dailyRate * price;
      }
    }

    // Confirmed referral rewards
    const userObj = this.state.users[userId];
    const confirmedReferralUSDT =
      Number(userObj?.referralEarningsUSDT || 0) + Number(userObj?.referralProfitShareUSDT || 0);

    // Already withdrawn or locked withdrawals
    const userWithdrawals = Object.values(this.state.withdrawals || {}).filter(
      (w) => w.userId === userId && w.status !== 'REJECTED' && w.status !== 'FAILED'
    );
    const totalWithdrawnOrLockedUSDT = userWithdrawals.reduce(
      (sum, w) => sum + Number(w.amount || 0),
      0
    );

    const availableUsdtNum = Number(available['USDT'] || 0);

    const earnedWithdrawableCap = Math.max(
      availableUsdtNum,
      totalRealizedPnlUSDT + completedPrincipalUSDT + confirmedReferralUSDT - totalWithdrawnOrLockedUSDT
    );
    const withdrawableNum = Math.min(availableUsdtNum, earnedWithdrawableCap);
    const frozenDepositNum = Math.max(0, availableUsdtNum - withdrawableNum);
    const totalFrozenCapitalNum = frozenDepositNum + totalInvestedUSDT;

    const hasPreviousWithdrawal = userWithdrawals.length > 0;
    const nowMs = Date.now();

    const firstWithdrawalUnlockAtMs = nowMs;
    const firstWithdrawalRemainingSeconds = 0;
    const isFirstWithdrawalLocked = false;

    const firstWithdrawalUnlockAt = new Date(firstWithdrawalUnlockAtMs).toISOString();

    return {
      available,
      reserved,
      invested,
      totalEstimatedUSDT: toFixedDecimal(totalEstimatedUSDT),
      totalInvestedUSDT: toFixedDecimal(totalInvestedUSDT),
      totalRealizedPnlUSDT: toFixedDecimal(totalRealizedPnlUSDT),
      totalUnrealizedPnlUSDT: toFixedDecimal(totalUnrealizedPnlUSDT),
      withdrawableUSDT: toFixedDecimal(withdrawableNum),
      frozenDepositUSDT: toFixedDecimal(frozenDepositNum),
      totalFrozenCapitalUSDT: toFixedDecimal(totalFrozenCapitalNum),
      dailyProfitRateUSDT: toFixedDecimal(dailyProfitRateUSDT),
      firstWithdrawalUnlockAt,
      isFirstWithdrawalLocked,
      firstWithdrawalRemainingSeconds,
      hasPreviousWithdrawal,
    };
  }

  /**
   * Activates an investment plan for a user atomically with double-entry ledger lock.
   */
  public activateInvestment(
    userId: string,
    planId: string,
    amountStr: string
  ): { investment: UserInvestment; transaction: LedgerTransaction } {
    const user = this.state.users[userId];
    if (!user) throw new Error('User not found');
    if (user.status !== 'ACTIVE') throw new Error('Account is suspended');
    if (user.kycStatus === 'REJECTED') throw new Error('KYC verification rejected. Please update documents with compliance.');

    const plan = this.state.investmentPlans[planId];
    if (!plan || plan.status !== 'ACTIVE') throw new Error('Investment plan is not currently open for activation');

    const alreadyEnteredSamePlan = Object.values(this.state.investments).some(
      (inv) => inv.userId === userId && inv.planId === planId
    );
    if (alreadyEnteredSamePlan) {
      throw new Error('لا يمكن فتح نفس الخطة مجدداً، يمكنك اختيار خطة أخرى');
    }

    const amountFixed = toFixedDecimal(amountStr);
    const amountNum = Number(amountFixed);

    if (plan.isFixedAmount) {
      if (amountFixed !== toFixedDecimal(plan.fixedAmount)) {
        throw new Error(`This strategy requires fixed allocation of ${plan.fixedAmount} ${plan.asset}`);
      }
    } else {
      if (amountNum < Number(plan.minAmount) || amountNum > Number(plan.maxAmount)) {
        throw new Error(`Amount must be between ${plan.minAmount} and ${plan.maxAmount} ${plan.asset}`);
      }
    }

    const availableAccId = `acc_${userId}_${plan.asset}_AVAILABLE`;
    const investedAccId = `acc_${userId}_${plan.asset}_INVESTED`;

    const accountsMap = new Map<string, LedgerAccount>(Object.entries(this.state.accounts));

    // Post double entry: debit AVAILABLE, credit INVESTED
    const { transaction } = LedgerEngine.postTransaction(accountsMap, {
      debitAccountId: availableAccId,
      creditAccountId: investedAccId,
      amount: amountFixed,
      asset: plan.asset,
      type: 'INVESTMENT_ALLOCATE',
      description: `Allocated to ${plan.name} (${plan.durationDays}D)`,
      referenceId: plan.id,
    });

    const investmentId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Note: Direct referral bonus (+$10 per $100) is awarded upon confirmed deposit in confirmDeposit().
    // Write back accounts
    for (const [id, acc] of accountsMap.entries()) {
      this.state.accounts[id] = acc;
    }
    this.state.transactions.push(transaction);

    const now = new Date();
    const scheduledEndTime = new Date(now.getTime() + plan.durationDays * 86400000);
    const calculatedApr = Number((plan.estimatedAprMin + Math.random() * (plan.estimatedAprMax - plan.estimatedAprMin)).toFixed(2));
    // 7% every 24 hours
    const dailyProfitNum = Number(amountFixed) * (calculatedApr / 100);

    const investment: UserInvestment = {
      id: investmentId,
      userId,
      planId: plan.id,
      planName: plan.name,
      asset: plan.asset,
      initialAmount: amountFixed,
      currentValuation: amountFixed,
      realizedPnl: '0.00000000',
      unrealizedPnl: '0.00000000',
      claimedPnl: '0.00000000',
      dailyProfitUSDT: toFixedDecimal(dailyProfitNum),
      startTime: now.toISOString(),
      scheduledEndTime: scheduledEndTime.toISOString(),
      durationDays: plan.durationDays,
      status: 'ACTIVE',
      lastReconciledAt: now.toISOString(),
      aprAtActivation: calculatedApr,
    };

    this.state.investments[investment.id] = investment;
    plan.totalInvestors += 1;
    plan.totalAUM = addDecimals(plan.totalAUM, amountFixed);

    // Reconcile daily profits (first daily profit & first withdrawal unlock after 24 hours)
    this.reconcileAndCreditDailyProfits(userId);

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId,
      title: 'تم تفعيل الخطة بنجاح',
      message: `تم تفعيل ${plan.name} بمبلغ $${Number(amountFixed)} ${plan.asset}. ينزل الربح اليومي (+$${dailyProfitNum.toFixed(2)} USDT) ويُتاح أول سحب بعد 24 ساعة.`,
      type: 'INVESTMENT',
      read: false,
      createdAt: now.toISOString(),
    });

    this.saveToDisk();
    return { investment, transaction };
  }

  /**
   * Request withdrawal and record it in the Admin review queue (PENDING_REVIEW).
   */
  public requestWithdrawal(
    userId: string,
    asset: AssetSymbol,
    network: string,
    destinationAddress: string,
    amountStr: string
  ): { withdrawal: Withdrawal; transaction: LedgerTransaction } {
    const user = this.state.users[userId];
    if (!user) throw new Error('User not found');

    // Credit any accrued daily profits before checking balance
    this.reconcileAndCreditDailyProfits(userId);

    const amountFixed = toFixedDecimal(amountStr);
    const amountNum = Number(amountFixed);

    if (amountNum <= 0) throw new Error('Withdrawal amount must be greater than zero');

    // Balanced tiered withdrawal fee:
    // < $50 => 8% | $50 to < $100 => 7% | $100 to < $300 => 5% | $300 to < $500 => 4% | >= $500 => 3%
    const feeRate =
      amountNum >= 500
        ? 0.03
        : amountNum >= 300
        ? 0.04
        : amountNum >= 100
        ? 0.05
        : amountNum >= 50
        ? 0.07
        : 0.08;
    const feePercent = Math.round(feeRate * 100);
    const feeNum = Number((amountNum * feeRate).toFixed(8));
    const feeAmount = toFixedDecimal(feeNum);
    const netAmount = subDecimals(amountFixed, feeAmount);

    const ledgerAsset: AssetSymbol = 'USDT';
    const availableAccId = `acc_${userId}_${ledgerAsset}_AVAILABLE`;
    const reservedAccId = `acc_${userId}_${ledgerAsset}_RESERVED`;

    const availAcc = this.state.accounts[availableAccId];
    const availBalNum = Number(availAcc?.balance || 0);

    let transaction: LedgerTransaction;
    if (availBalNum >= amountNum) {
      const accountsMap = new Map<string, LedgerAccount>(Object.entries(this.state.accounts));
      const posted = LedgerEngine.postTransaction(accountsMap, {
        debitAccountId: availableAccId,
        creditAccountId: reservedAccId,
        amount: amountFixed,
        asset: ledgerAsset,
        type: 'WITHDRAWAL_LOCK',
        description: `Lock ${amountFixed} USDT (${network} - Fee ${feePercent}%: ${Number(feeAmount).toFixed(2)}, Net: ${Number(netAmount).toFixed(2)}) for withdrawal to ${destinationAddress}`,
      });
      transaction = posted.transaction;
      for (const [id, acc] of accountsMap.entries()) {
        this.state.accounts[id] = acc;
      }
      this.state.transactions.push(transaction);
    } else {
      transaction = {
        id: `tx_wth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'WITHDRAWAL_LOCK',
        asset: ledgerAsset,
        amount: amountFixed,
        status: 'COMPLETED',
        description: `Withdrawal request ${amountFixed} USDT (${network}) to ${destinationAddress} pending Admin review`,
        entries: [],
        createdAt: new Date().toISOString(),
      };
      this.state.transactions.push(transaction);
    }

    const withdrawal: Withdrawal = {
      id: `WDR-${Math.floor(100000 + Math.random() * 900000)}`,
      userId,
      asset,
      network,
      destinationAddress,
      amount: amountFixed,
      feePercent,
      feeAmount,
      netAmount,
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
    };

    this.state.withdrawals[withdrawal.id] = withdrawal;

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId,
      title: `طلب سحب ${network} (قيد المراجعة)`,
      message: `تم تقديم طلب سحب بمبلغ $${Number(amountFixed).toFixed(2)} عبر ${network} (رسوم السحب ${feePercent}%: $${Number(feeAmount).toFixed(2)} • الصافي المستلم: $${Number(netAmount).toFixed(2)}).`,
      type: 'WITHDRAWAL',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.recordAuditLog(
      userId,
      'REQUEST_WITHDRAWAL',
      'WITHDRAWAL',
      withdrawal.id,
      `Member ${user.fullName} (ID: ${user.id}) requested withdrawal of $${Number(amountFixed).toFixed(2)} ${asset} (${network}) to ${destinationAddress}`
    );

    this.saveToDisk();
    return { withdrawal, transaction };
  }

  /**
   * Admin approves withdrawal -> settles ledger and releases reserved funds to external address.
   */
  public approveWithdrawal(
    withdrawalId: string,
    adminId: string,
    txHash?: string
  ): { withdrawal: Withdrawal; transaction: LedgerTransaction } {
    const wth = this.state.withdrawals[withdrawalId];
    if (!wth) throw new Error('Withdrawal record not found');
    if (wth.status !== 'PENDING_REVIEW') throw new Error(`Cannot approve withdrawal in status: ${wth.status}`);

    const admin = this.state.users[adminId];
    const assetReservedAcc = this.state.accounts[`acc_${wth.userId}_${wth.asset}_RESERVED`];
    const ledgerAsset: AssetSymbol =
      assetReservedAcc && Number(assetReservedAcc.balance) >= Number(wth.amount)
        ? wth.asset
        : 'USDT';

    const reservedAccId = `acc_${wth.userId}_${ledgerAsset}_RESERVED`;
    const availableAccId = `acc_${wth.userId}_${ledgerAsset}_AVAILABLE`;
    const platformReserveAccId = `acc_platform_reserve_${ledgerAsset}`;
    const feeAccId = `acc_platform_fee_${ledgerAsset}`;

    const hash = txHash || `0x${crypto.randomBytes(32).toString('hex')}`;
    const resBal = Number(this.state.accounts[reservedAccId]?.balance || 0);
    const availBal = Number(this.state.accounts[availableAccId]?.balance || 0);

    let transaction: LedgerTransaction;
    if (resBal >= Number(wth.amount) || availBal >= Number(wth.amount)) {
      const accountsMap = new Map<string, LedgerAccount>(Object.entries(this.state.accounts));
      const debitFrom = resBal >= Number(wth.amount) ? reservedAccId : availableAccId;
      const posted = LedgerEngine.postTransaction(accountsMap, {
        debitAccountId: debitFrom,
        creditAccountId: platformReserveAccId,
        amount: wth.amount,
        asset: ledgerAsset,
        type: 'WITHDRAWAL_CONFIRM',
        description: `Settled withdrawal payout (${wth.network}) to ${wth.destinationAddress} (Tx: ${hash.slice(0, 16)}...)`,
        referenceId: wth.id,
      });
      transaction = posted.transaction;

      if (Number(wth.feeAmount) > 0) {
        try {
          const { transaction: txFee } = LedgerEngine.postTransaction(accountsMap, {
            debitAccountId: platformReserveAccId,
            creditAccountId: feeAccId,
            amount: wth.feeAmount,
            asset: ledgerAsset,
            type: 'FEE_PAYMENT',
            description: `Network gas fee retained for withdrawal ${wth.id}`,
            referenceId: wth.id,
          });
          this.state.transactions.push(txFee);
        } catch (e) {
          console.warn('[Fee] Fee post error:', e);
        }
      }

      for (const [id, acc] of accountsMap.entries()) {
        this.state.accounts[id] = acc;
      }
      this.state.transactions.push(transaction);
    } else {
      transaction = {
        id: `tx_wth_approve_${Date.now()}`,
        type: 'WITHDRAWAL_CONFIRM',
        asset: ledgerAsset,
        amount: wth.amount,
        status: 'COMPLETED',
        description: `Approved withdrawal payout (${wth.network}) to ${wth.destinationAddress}`,
        entries: [],
        createdAt: new Date().toISOString(),
        referenceId: wth.id,
      };
      this.state.transactions.push(transaction);
    }

    wth.status = 'COMPLETED';
    wth.txHash = hash;
    wth.reviewedBy = admin?.fullName || 'Administrator';
    wth.reviewedAt = new Date().toISOString();

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: wth.userId,
      title: `طلب سحب ${wth.network} (مقبول)`,
      message: `تمت الموافقة على سحب $${Number(wth.netAmount).toFixed(2)} عبر ${wth.network}.`,
      type: 'WITHDRAWAL',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.recordAuditLog(
      adminId,
      'APPROVE_WITHDRAWAL',
      'WITHDRAWAL',
      wth.id,
      `Approved withdrawal of $${Number(wth.amount).toFixed(2)} (${wth.network}) to ${wth.destinationAddress}`
    );

    this.saveToDisk();
    return { withdrawal: wth, transaction };
  }

  /**
   * Admin rejects withdrawal -> releases reserved funds back to available balance.
   */
  public rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string
  ): { withdrawal: Withdrawal; transaction: LedgerTransaction } {
    const wth = this.state.withdrawals[withdrawalId];
    if (!wth) throw new Error('Withdrawal record not found');
    if (wth.status !== 'PENDING_REVIEW') throw new Error(`Cannot reject withdrawal in status: ${wth.status}`);

    const admin = this.state.users[adminId];
    const assetReservedAcc = this.state.accounts[`acc_${wth.userId}_${wth.asset}_RESERVED`];
    const ledgerAsset: AssetSymbol =
      assetReservedAcc && Number(assetReservedAcc.balance) >= Number(wth.amount)
        ? wth.asset
        : 'USDT';

    const reservedAccId = `acc_${wth.userId}_${ledgerAsset}_RESERVED`;
    const availableAccId = `acc_${wth.userId}_${ledgerAsset}_AVAILABLE`;
    const resBal = Number(this.state.accounts[reservedAccId]?.balance || 0);

    let transaction: LedgerTransaction;
    if (resBal >= Number(wth.amount)) {
      const accountsMap = new Map<string, LedgerAccount>(Object.entries(this.state.accounts));
      const posted = LedgerEngine.postTransaction(accountsMap, {
        debitAccountId: reservedAccId,
        creditAccountId: availableAccId,
        amount: wth.amount,
        asset: ledgerAsset,
        type: 'WITHDRAWAL_REFUND',
        description: `Refunded rejected withdrawal ${wth.id}: ${reason}`,
        referenceId: wth.id,
      });
      transaction = posted.transaction;
      for (const [id, acc] of accountsMap.entries()) {
        this.state.accounts[id] = acc;
      }
      this.state.transactions.push(transaction);
    } else {
      transaction = {
        id: `tx_wth_reject_${Date.now()}`,
        type: 'WITHDRAWAL_REFUND',
        asset: ledgerAsset,
        amount: wth.amount,
        status: 'COMPLETED',
        description: `Rejected withdrawal ${wth.id}: ${reason}`,
        entries: [],
        createdAt: new Date().toISOString(),
        referenceId: wth.id,
      };
      this.state.transactions.push(transaction);
    }

    wth.status = 'REJECTED';
    wth.reviewReason = reason;
    wth.reviewedBy = admin?.fullName || 'Administrator';
    wth.reviewedAt = new Date().toISOString();

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: wth.userId,
      title: `طلب سحب ${wth.network} (مرفوض)`,
      message: `تم رفض طلب سحب $${Number(wth.amount).toFixed(2)} عبر ${wth.network}. السبب: ${reason}`,
      type: 'WITHDRAWAL',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.recordAuditLog(adminId, 'REJECT_WITHDRAWAL', 'WITHDRAWAL', wth.id, `Declined withdrawal: ${reason}`);

    this.saveToDisk();
    return { withdrawal: wth, transaction };
  }

  /**
   * Generates or reconciles a deposit address & credits verified blockchain deposits.
   */
  public confirmDeposit(
    userId: string,
    asset: AssetSymbol,
    network: string,
    amountStr: string,
    txHash?: string,
    existingDepositId?: string
  ): { deposit: Deposit; transaction: LedgerTransaction } {
    const normalizedUid = userId === '100001' ? 'usr_admin_chief' : userId;
    const existingPending = existingDepositId ? this.state.deposits[existingDepositId] : undefined;

    // Idempotency: if this deposit is already CONFIRMED, return it directly
    if (existingPending && existingPending.status === 'CONFIRMED') {
      const existingTx =
        this.state.transactions.find((t) => t.referenceId === existingDepositId) ||
        this.state.transactions[this.state.transactions.length - 1];
      return { deposit: existingPending, transaction: existingTx };
    }

    let user = this.getUserById(normalizedUid) || this.state.users[normalizedUid];
    if (!user) {
      const nowIso = new Date().toISOString();
      const salt = 'goldrix_restored_archive';
      user = {
        id: normalizedUid,
        email: existingPending?.userEmail || `member.${normalizedUid}@goldrix.io`,
        phone: existingPending?.userPhone || '',
        fullName: existingPending?.userFullName || `عضو المنصة (${normalizedUid})`,
        role: 'USER',
        status: 'ACTIVE',
        kycStatus: 'NOT_SUBMITTED',
        createdAt: existingPending?.createdAt || nowIso,
        lastLoginAt: nowIso,
        twoFactorEnabled: false,
        language: 'ar',
        passwordHash: hashPassword('RestoredMember2026!', salt),
        salt,
        referralCode: 'GOLD' + normalizedUid.slice(-4),
        referralCount: 0,
        referralEarningsUSDT: '0.00',
        referralProfitShareUSDT: '0.00',
      };
      this.state.users[normalizedUid] = user;
    }
    const resolvedUserId = user.id;

    const amountFixed = toFixedDecimal(amountStr);
    const now = new Date();
    let hash = txHash || `0x${crypto.randomBytes(32).toString('hex')}`;

    // Ensure unique hash if another confirmed deposit used the same hash
    const existingWithSameHash = Object.values(this.state.deposits).find(
      (d) => d.txHash === hash && d.status === 'CONFIRMED' && d.id !== existingDepositId
    );
    if (existingWithSameHash) {
      hash = `${hash}_${Date.now().toString(36)}`;
    }

    // Credit unified USDT platform balance so any crypto deposit ($100+) is immediately usable for plans
    const ledgerAsset: AssetSymbol = 'USDT';
    const availableAccId = `acc_${resolvedUserId}_${ledgerAsset}_AVAILABLE`;
    const platformReserveAccId = `acc_platform_reserve_${ledgerAsset}`;

    if (
      !this.state.accounts[platformReserveAccId] ||
      Number(this.state.accounts[platformReserveAccId].balance || 0) < Number(amountFixed) + 1000000
    ) {
      this.state.accounts[platformReserveAccId] = {
        id: platformReserveAccId,
        userId: 'SYSTEM',
        type: 'SYSTEM_RESERVE',
        asset: ledgerAsset,
        balance: '1000000000.00000000',
        updatedAt: now.toISOString(),
      };
    }

    if (!this.state.accounts[availableAccId]) {
      this.state.accounts[availableAccId] = {
        id: availableAccId,
        userId: resolvedUserId,
        type: 'AVAILABLE',
        asset: ledgerAsset,
        balance: '0.00000000',
        updatedAt: now.toISOString(),
      };
    }

    const accountsMap = new Map<string, LedgerAccount>(Object.entries(this.state.accounts));

    const { transaction } = LedgerEngine.postTransaction(accountsMap, {
      debitAccountId: platformReserveAccId,
      creditAccountId: availableAccId,
      amount: amountFixed,
      asset: ledgerAsset,
      type: 'DEPOSIT',
      description: `Verified ${network} deposit (Tx: ${hash.slice(0, 16)}...)`,
      referenceId: existingDepositId,
    });

    for (const [id, acc] of accountsMap.entries()) {
      this.state.accounts[id] = acc;
    }
    this.state.transactions.push(transaction);

    const settings = this.state.systemSettings;
    let resolvedAddr = settings.usdtDepositAddress || 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh';
    if (asset === 'BTC' || network.toUpperCase().includes('BTC') || network.toUpperCase().includes('BITCOIN')) {
      resolvedAddr = settings.btcDepositAddress || 'bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9';
    } else if (asset === 'ETH') {
      resolvedAddr = settings.ethDepositAddress || '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
    } else if (asset === 'BNB') {
      resolvedAddr = settings.bnbDepositAddress || '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
    } else if (network.toUpperCase().includes('BNB') || network.toUpperCase().includes('BEP20')) {
      resolvedAddr = settings.usdtBep20DepositAddress || '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
    } else if (network.toUpperCase().includes('ERC20') || network.toUpperCase().includes('ETHEREUM')) {
      resolvedAddr = settings.usdtErc20DepositAddress || '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
    }

    const depositId = existingDepositId || `ORD-${Math.floor(100000 + Math.random() * 899999)}`;

    const deposit: Deposit & { userFullName?: string; userEmail?: string; userPhone?: string } = {
      id: depositId,
      userId: resolvedUserId,
      userFullName: existingPending?.userFullName || user.fullName,
      userEmail: existingPending?.userEmail || user.email || '',
      userPhone: existingPending?.userPhone || user.phone || '',
      asset,
      network,
      depositAddress: existingPending?.depositAddress || resolvedAddr,
      amount: Number(amountFixed).toFixed(2),
      txHash: hash,
      confirmations: 20,
      requiredConfirmations: 20,
      status: 'CONFIRMED',
      createdAt: existingPending?.createdAt || now.toISOString(),
      confirmedAt: now.toISOString(),
    };

    // Calculate and reward inviter ONLY upon confirmed deposit ($10 per $100 deposited)
    if (user.referredBy) {
      const hundredsDeposited = Math.floor(Number(amountFixed) / 100);
      const referralBonusNum = hundredsDeposited * 10;
      if (referralBonusNum > 0) {
        const bonusStr = toFixedDecimal(referralBonusNum);
        const refClean = user.referredBy.trim();
        const referrer =
          this.getUserById(refClean) ||
          Object.values(this.state.users).find(
            (u) =>
              u.id !== userId &&
              ((u.referralCode && u.referralCode.toLowerCase() === refClean.toLowerCase()) ||
                u.id === refClean)
          );
        if (referrer && referrer.id !== userId) {
          const referrerAvailId = `acc_${referrer.id}_USDT_AVAILABLE`;
          if (accountsMap.has(referrerAvailId)) {
            try {
              const { transaction: txBonus } = LedgerEngine.postTransaction(accountsMap, {
                debitAccountId: platformReserveAccId,
                creditAccountId: referrerAvailId,
                amount: bonusStr,
                asset: 'USDT',
                type: 'REFERRAL_BONUS',
                description: `Referral reward: +${referralBonusNum} USDT from ${user.fullName} deposit`,
                referenceId: `ref_dep_bonus_${deposit.id}`,
              });
              for (const [id, acc] of accountsMap.entries()) {
                this.state.accounts[id] = acc;
              }
              this.state.transactions.push(txBonus);
              referrer.referralEarningsUSDT = addDecimals(referrer.referralEarningsUSDT || '0.00000000', bonusStr);
              this.state.notifications.unshift({
                id: `notif_${Date.now()}_refdep`,
                userId: referrer.id,
                title: `مكافأة إيداع إحالة +${referralBonusNum} USDT`,
                message: `قام صديقك المدعو ${user.fullName} بإيداع $${Number(amountFixed)}! تمت إضافة ${referralBonusNum} USDT فورياً إلى رصيدك المتاح ($10 لكل 100$).`,
                type: 'DEPOSIT',
                read: false,
                createdAt: new Date().toISOString(),
              });
            } catch (refErr) {
              console.warn('[Referral] Deposit bonus credit warning:', refErr);
            }
          }
        }
      }
    }

    this.state.deposits[deposit.id] = deposit;

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId,
      title: `طلب إيداع ${network} (مقبول)`,
      message: `تمت الموافقة على إيداع $${Number(amountFixed).toFixed(2)} (${network}) وإضافته لرصيدك المتاح.`,
      type: 'DEPOSIT',
      read: false,
      createdAt: now.toISOString(),
    });

    this.saveToDisk();
    return { deposit, transaction };
  }

  /**
   * Admin rejects a pending deposit notification (no funds credited).
   */
  public rejectDeposit(depositId: string, adminId: string, reason: string): Deposit {
    const dep = this.state.deposits[depositId];
    if (!dep) throw new Error('Deposit record not found');
    if (dep.status === 'CONFIRMED') {
      throw new Error('Cannot reject an already confirmed deposit');
    }

    dep.status = 'FAILED';

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: dep.userId,
      title: 'تم رفض إشعار الإيداع',
      message: `تم رفض طلب الإيداع رقم (${dep.id}) بقيمة $${Number(dep.amount).toFixed(2)}: ${reason || 'لم يتم التحقق من وصول الحوالة على الشبكة'}.`,
      type: 'DEPOSIT',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.recordAuditLog(
      adminId,
      'REJECT_DEPOSIT',
      'DEPOSIT',
      depositId,
      `Rejected unverified deposit ${dep.amount} ${dep.asset} for user ${dep.userId}: ${reason}`
    );

    this.saveToDisk();
    return dep;
  }

  /**
   * Admin safely adjusts or resets a user's USDT balance (CREDIT, DEBIT, or RESET to 0.00).
   */
  public adjustUserBalance(
    userId: string,
    adminId: string,
    mode: 'CREDIT' | 'DEBIT' | 'RESET',
    amountStr: string,
    reason: string
  ): { newBalanceUSDT: string } {
    const user = this.getUserById(userId);
    if (!user) throw new Error('لم يتم العثور على العضو');

    const availAccId = `acc_${user.id}_USDT_AVAILABLE`;
    const resAccId = `acc_${user.id}_USDT_RESERVED`;
    const invAccId = `acc_${user.id}_USDT_INVESTED`;
    const nowIso = new Date().toISOString();

    if (!this.state.accounts[availAccId]) {
      this.state.accounts[availAccId] = {
        id: availAccId,
        userId: user.id,
        type: 'AVAILABLE',
        asset: 'USDT',
        balance: '0.00000000',
        updatedAt: nowIso,
      };
    }

    const currentAvail = Number(this.state.accounts[availAccId].balance || 0);

    if (mode === 'RESET') {
      this.state.accounts[availAccId].balance = '0.00000000';
      this.state.accounts[availAccId].updatedAt = nowIso;
      if (this.state.accounts[resAccId]) this.state.accounts[resAccId].balance = '0.00000000';
      if (this.state.accounts[invAccId]) this.state.accounts[invAccId].balance = '0.00000000';

      // Mark any confirmed deposits for this user as FAILED rather than deleting keys so archive sync doesn't re-add them
      for (const dep of Object.values(this.state.deposits)) {
        if (dep.userId === user.id && dep.status === 'CONFIRMED') {
          dep.status = 'FAILED';
        }
      }
      for (const [iId, inv] of Object.entries(this.state.investments)) {
        if (inv.userId === user.id) delete this.state.investments[iId];
      }

      this.recordAuditLog(
        adminId,
        'RESET_USER_BALANCE',
        'USER',
        user.id,
        `Admin reset balance of user ${user.id} (${user.fullName}) from $${currentAvail.toFixed(2)} to $0.00. Reason: ${reason}`
      );
      this.saveToDisk();
      return { newBalanceUSDT: '0.00' };
    }

    const delta = Number(amountStr);
    if (!Number.isFinite(delta) || delta <= 0) {
      throw new Error('يرجى إدخال مبلغ صحيح أكبر من صفر');
    }

    if (mode === 'DEBIT') {
      const nextBal = Math.max(0, currentAvail - delta);
      this.state.accounts[availAccId].balance = toFixedDecimal(nextBal);
      this.state.accounts[availAccId].updatedAt = nowIso;

      this.recordAuditLog(
        adminId,
        'DEBIT_USER_BALANCE',
        'USER',
        user.id,
        `Admin deducted $${delta.toFixed(2)} USDT from user ${user.id} (${user.fullName}). New balance: $${nextBal.toFixed(2)}. Reason: ${reason}`
      );
      this.saveToDisk();
      return { newBalanceUSDT: nextBal.toFixed(2) };
    }

    // CREDIT mode uses confirmDeposit so ledger and deposit records remain consistent
    this.confirmDeposit(user.id, 'USDT', 'TRON (TRC20)', delta.toFixed(2), `ADMIN_CREDIT_${Date.now()}`);
    const updatedBal = Number(this.state.accounts[availAccId].balance || 0);
    return { newBalanceUSDT: updatedBal.toFixed(2) };
  }

  public recordAuditLog(
    adminId: string,
    action: string,
    targetType: AdminAuditLog['targetType'],
    targetId: string,
    details: string,
    ipAddress: string = '127.0.0.1'
  ): void {
    const admin = this.state.users[adminId];
    this.state.auditLogs.unshift({
      id: `log_${Date.now()}`,
      adminId,
      adminEmail: admin?.email || 'system',
      action,
      targetType,
      targetId,
      details,
      ipAddress,
      timestamp: new Date().toISOString(),
    });
    this.saveToDisk();
  }

  public save(): void {
    this.saveToDisk();
  }
}
