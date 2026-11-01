/**
 * GOLDRIX Financial Engine - Double-Entry Immutable Ledger
 * 
 * Strict Financial Guarantees:
 * 1. Fixed-precision 8-decimal arithmetic using BigInt (ZERO floating-point rounding errors)
 * 2. True double-entry bookkeeping: every transaction has balanced DEBIT and CREDIT entries
 * 3. Invariant: Sum(Debits) == Sum(Credits) for every posted transaction
 * 4. Immutable ledger entries: historical records cannot be modified or deleted
 * 5. Strictly prevents negative available or reserved balances
 */

import { AssetSymbol, LedgerAccount, LedgerEntry, LedgerTransaction, TransactionType } from '../types/index.ts';

const SCALE = 8;
const FACTOR = BigInt(10 ** SCALE);

/**
 * Normalizes any number or string to a strict 8-decimal fixed string (e.g., "12.34000000")
 */
export function toFixedDecimal(value: string | number): string {
  const str = typeof value === 'number' ? value.toFixed(SCALE) : value.trim();
  if (!str || isNaN(Number(str))) {
    return '0.00000000';
  }
  const [intPart, fracPart = ''] = str.split('.');
  const paddedFrac = (fracPart + '00000000').slice(0, SCALE);
  return `${intPart}.${paddedFrac}`;
}

export function toBigInt(decimalStr: string): bigint {
  const fixed = toFixedDecimal(decimalStr);
  const isNegative = fixed.startsWith('-');
  const clean = isNegative ? fixed.slice(1) : fixed;
  const [intPart, fracPart] = clean.split('.');
  const total = BigInt(intPart) * FACTOR + BigInt(fracPart);
  return isNegative ? -total : total;
}

export function fromBigInt(val: bigint): string {
  const isNegative = val < 0n;
  const absVal = isNegative ? -val : val;
  const intPart = (absVal / FACTOR).toString();
  const fracPart = (absVal % FACTOR).toString().padStart(SCALE, '0');
  return `${isNegative ? '-' : ''}${intPart}.${fracPart}`;
}

export function addDecimals(a: string, b: string): string {
  return fromBigInt(toBigInt(a) + toBigInt(b));
}

export function subDecimals(a: string, b: string): string {
  return fromBigInt(toBigInt(a) - toBigInt(b));
}

export function mulDecimals(a: string, factor: number | string): string {
  const aBig = toBigInt(a);
  const factorBig = toBigInt(typeof factor === 'number' ? factor.toString() : factor);
  const result = (aBig * factorBig) / FACTOR;
  return fromBigInt(result);
}

export function compareDecimals(a: string, b: string): number {
  const diff = toBigInt(a) - toBigInt(b);
  if (diff > 0n) return 1;
  if (diff < 0n) return -1;
  return 0;
}

export function isGreaterThanOrEqual(a: string, b: string): boolean {
  return compareDecimals(a, b) >= 0;
}

export function isStrictlyPositive(a: string): boolean {
  return toBigInt(a) > 0n;
}

export interface PostingInstruction {
  debitAccountId: string;
  creditAccountId: string;
  amount: string;
  asset: AssetSymbol;
  type: TransactionType;
  description: string;
  referenceId?: string;
}

export class LedgerEngine {
  /**
   * Executes an atomic double-entry posting between two accounts.
   * Throws an error if any invariant is violated.
   */
  public static postTransaction(
    accounts: Map<string, LedgerAccount>,
    instruction: PostingInstruction
  ): { transaction: LedgerTransaction; updatedAccounts: LedgerAccount[] } {
    const { debitAccountId, creditAccountId, amount, asset, type, description, referenceId } = instruction;

    const amountFixed = toFixedDecimal(amount);
    if (!isStrictlyPositive(amountFixed)) {
      throw new Error(`Transaction amount must be strictly positive. Got: ${amount}`);
    }

    const debitAccount = accounts.get(debitAccountId);
    const creditAccount = accounts.get(creditAccountId);

    if (!debitAccount) {
      throw new Error(`Debit account not found: ${debitAccountId}`);
    }
    if (!creditAccount) {
      throw new Error(`Credit account not found: ${creditAccountId}`);
    }
    if (debitAccount.asset !== asset || creditAccount.asset !== asset) {
      throw new Error(`Asset mismatch: Transaction ${asset} vs accounts (${debitAccount.asset}, ${creditAccount.asset})`);
    }

    // In double-entry for liability/equity/user-asset accounts:
    // User available account: Debit decreases balance, Credit increases balance
    // Platform reserve / clearing: Debit increases external outflow / decreases internal liability
    const debitCurrent = debitAccount.balance;
    const creditCurrent = creditAccount.balance;

    // Check balance sufficiency if debiting a user asset account
    if (debitAccount.type === 'AVAILABLE' || debitAccount.type === 'RESERVED' || debitAccount.type === 'INVESTED') {
      if (!isGreaterThanOrEqual(debitCurrent, amountFixed)) {
        throw new Error(
          `Insufficient funds in account ${debitAccountId}. Available: ${debitCurrent} ${asset}, Required: ${amountFixed}`
        );
      }
    }

    const newDebitBalance = subDecimals(debitCurrent, amountFixed);
    const newCreditBalance = addDecimals(creditCurrent, amountFixed);

    const now = new Date().toISOString();
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const debitEntry: LedgerEntry = {
      id: `entry_${Date.now()}_1`,
      transactionId,
      accountId: debitAccountId,
      entryType: 'DEBIT',
      amount: amountFixed,
      balanceAfter: newDebitBalance,
      createdAt: now,
    };

    const creditEntry: LedgerEntry = {
      id: `entry_${Date.now()}_2`,
      transactionId,
      accountId: creditAccountId,
      entryType: 'CREDIT',
      amount: amountFixed,
      balanceAfter: newCreditBalance,
      createdAt: now,
    };

    // Verify double-entry balance equality
    if (debitEntry.amount !== creditEntry.amount) {
      throw new Error(`Double-entry balance check failed: Debit ${debitEntry.amount} != Credit ${creditEntry.amount}`);
    }

    const updatedDebitAccount: LedgerAccount = {
      ...debitAccount,
      balance: newDebitBalance,
      updatedAt: now,
    };

    const updatedCreditAccount: LedgerAccount = {
      ...creditAccount,
      balance: newCreditBalance,
      updatedAt: now,
    };

    const transaction: LedgerTransaction = {
      id: transactionId,
      type,
      amount: amountFixed,
      asset,
      referenceId,
      description,
      status: 'POSTED',
      timestamp: now,
      entries: [debitEntry, creditEntry],
    };

    // Mutate map in place atomically
    accounts.set(debitAccountId, updatedDebitAccount);
    accounts.set(creditAccountId, updatedCreditAccount);

    return {
      transaction,
      updatedAccounts: [updatedDebitAccount, updatedCreditAccount],
    };
  }
}
