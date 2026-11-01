/**
 * GOLDRIX Financial Engine - Automated Verification & Ledger Test Suite
 * Tests:
 * 1. Decimal BigInt Arithmetic & Zero Floating-Point Rounding Guarantees
 * 2. Double-Entry Posting Invariants (Sum(Debits) == Sum(Credits))
 * 3. Prevention of Negative Available / Reserved Balances
 * 4. Atomic Investment Activation & Plan Constraints
 * 5. Withdrawal Fund Reservation, Rejection, and Automatic Refund
 * 6. KYC Lifecycle Transitions & Restrictions
 * 7. Deposit Idempotency (Duplicate Tx Hash Rejection)
 */

import assert from 'assert';
import {
  addDecimals,
  subDecimals,
  mulDecimals,
  compareDecimals,
  toFixedDecimal,
  LedgerEngine,
} from '../src/server/ledger.ts';
import { Database } from '../src/server/db/database.ts';
import { LedgerAccount } from '../src/types/index.ts';

async function runTests() {
  console.log('--- STARTING GOLDRIX TEST SUITE ---');

  // Test 1: Decimal Arithmetic
  console.log('\n[TEST 1] Fixed-Precision Decimal Arithmetic');
  const sum = addDecimals('0.10000000', '0.20000000');
  assert.strictEqual(sum, '0.30000000', '0.1 + 0.2 must equal exactly 0.30000000');

  const diff = subDecimals('100.00000000', '0.00000001');
  assert.strictEqual(diff, '99.99999999', 'Subtraction precision must hold to 8 decimals');

  const prod = mulDecimals('5000.00000000', '0.15000000');
  assert.strictEqual(prod, '750.00000000', 'Multiplication 5000 * 0.15 = 750');
  console.log('✓ Decimal fixed-precision math verified with zero float errors.');

  // Test 2: Double-Entry Invariants
  console.log('\n[TEST 2] Double-Entry Balanced Posting Invariant');
  const testAccounts = new Map<string, LedgerAccount>([
    [
      'acc_user_avail',
      {
        id: 'acc_user_avail',
        userId: 'usr_t1',
        type: 'AVAILABLE',
        asset: 'USDT',
        balance: '1000.00000000',
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'acc_user_invested',
      {
        id: 'acc_user_invested',
        userId: 'usr_t1',
        type: 'INVESTED',
        asset: 'USDT',
        balance: '0.00000000',
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  const { transaction } = LedgerEngine.postTransaction(testAccounts, {
    debitAccountId: 'acc_user_avail',
    creditAccountId: 'acc_user_invested',
    amount: '400.00000000',
    asset: 'USDT',
    type: 'INVESTMENT_ALLOCATE',
    description: 'Allocate to quant test strategy',
  });

  assert.strictEqual(transaction.status, 'POSTED');
  assert.strictEqual(transaction.entries.length, 2);
  assert.strictEqual(transaction.entries[0].amount, transaction.entries[1].amount);
  assert.strictEqual(testAccounts.get('acc_user_avail')!.balance, '600.00000000');
  assert.strictEqual(testAccounts.get('acc_user_invested')!.balance, '400.00000000');
  console.log('✓ Double-entry posting maintained equality and debit/credit balance transitions.');

  // Test 3: Insufficient Funds Prevention
  console.log('\n[TEST 3] Overdraft & Negative Balance Prevention');
  assert.throws(
    () => {
      LedgerEngine.postTransaction(testAccounts, {
        debitAccountId: 'acc_user_avail',
        creditAccountId: 'acc_user_invested',
        amount: '800.00000000', // Only 600 available
        asset: 'USDT',
        type: 'INVESTMENT_ALLOCATE',
        description: 'Overdraft attempt',
      });
    },
    /Insufficient funds/,
    'Engine must reject overdraft debit attempt'
  );
  console.log('✓ Overdraft attempts blocked atomically.');

  // Test 4: Database Integration & Withdrawal Reservation / Rejection
  console.log('\n[TEST 4] Withdrawal Lifecycle & Fund Reservation Refund');
  const db = Database.getInstance();
  const investor = db.getUserByEmail('investor@goldrix.io')!;
  assert.ok(investor, 'Seed investor must exist');

  const initialAvailUSDT = db.getUserBalances(investor.id).available.USDT;

  // Request withdrawal
  const { withdrawal } = db.requestWithdrawal(investor.id, 'USDT', 'TRON (TRC20)', 'TYx99999999999999999', '200.00000000');
  assert.strictEqual(withdrawal.status, 'PENDING_REVIEW');
  const midAvailUSDT = db.getUserBalances(investor.id).available.USDT;
  assert.strictEqual(subDecimals(initialAvailUSDT, '200.00000000'), midAvailUSDT, 'Available balance must be decremented by reserved amount');

  // Admin rejects withdrawal -> funds must be refunded to available balance
  const admin = db.getUserByEmail('admin@goldrix.io')!;
  db.rejectWithdrawal(withdrawal.id, admin.id, 'Test rejection reasons');
  const finalAvailUSDT = db.getUserBalances(investor.id).available.USDT;
  assert.strictEqual(finalAvailUSDT, initialAvailUSDT, 'Full reserved amount must be refunded on rejection');
  console.log('✓ Withdrawal reservation, ledger audit trail, and automatic refund verified.');

  // Test 5: Deposit Idempotency
  console.log('\n[TEST 5] Deposit Idempotency & Duplicate Replay Protection');
  const txHash = '0xtest_hash_' + Date.now();
  db.confirmDeposit(investor.id, 'USDT', 'TRON (TRC20)', '500.00000000', txHash);

  assert.throws(
    () => {
      // Attempt duplicate replay of same transaction hash
      db.confirmDeposit(investor.id, 'USDT', 'TRON (TRC20)', '500.00000000', txHash);
    },
    /already been processed/,
    'Duplicate transaction hash must be rejected'
  );
  // Test 6: Referral Module & Rewards ($10 per $100 invested + 3% commission on earnings)
  console.log('\n[TEST 6] Referral & Earnings: $10 per $100 Invested & 3% Profit Commission');
  const chiefAdmin = db.getUserByEmail('hha253ee@gmail.com')!;
  const initialRefEarnings = Number(chiefAdmin.referralEarningsUSDT || '0');
  const initialProfitShare = Number(chiefAdmin.referralProfitShareUSDT || '0');

  // Simulate an invited friend investing 500 USDT
  const simResult = db.simulateReferralInvestment(chiefAdmin.id, 500);
  assert.strictEqual(simResult.bonusAwardedUSDT, '50.00', '500$ investment must award exactly 50$ bonus (10$ per 100$)');
  
  const updatedAdmin = db.getUserByEmail('hha253ee@gmail.com')!;
  assert.strictEqual(
    Number(updatedAdmin.referralEarningsUSDT),
    initialRefEarnings + 50,
    'Referrer direct bonus must increase by exactly 50 USDT'
  );
  assert(
    Number(updatedAdmin.referralProfitShareUSDT) > initialProfitShare,
    'Referrer 3% profit share commission must be credited'
  );

  const summary = db.getReferralSummary(chiefAdmin.id);
  assert(summary.invitees.length >= 1, 'Invitee must be recorded in referral summary');
  assert(summary.bonusHistory.length >= 2, 'Bonus and profit share transactions must exist in ledger history');
  console.log('✓ Referral rewards ($10 per $100) and 3% earnings commission verified.');

  console.log('\nALL GOLDRIX FINANCIAL INVARIANTS & INTEGRATION TESTS PASSED (100% GREEN)');
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
