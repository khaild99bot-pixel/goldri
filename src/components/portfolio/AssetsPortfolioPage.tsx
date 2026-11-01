/**
 * GOLDRIX Portfolio & Assets Page
 * Authoritative double-entry ledger totals: Available, Reserved, Invested,
 * Realized & Unrealized PnL, server-synchronized countdown timers, and full transaction history.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserInvestment, LedgerTransaction, AssetSymbol } from '../../types/index.ts';
import {
  Wallet,
  Lock,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AssetsPortfolioPageProps {
  setCurrentTab: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenWithdrawal: () => void;
}

export const AssetsPortfolioPage: React.FC<AssetsPortfolioPageProps> = ({
  setCurrentTab,
  onOpenDeposit,
  onOpenWithdrawal,
}) => {
  const { user, balances, refreshBalances } = useAuth();
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [filterAsset, setFilterAsset] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'investments' | 'history'>('investments');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  // Tick the clock every second for exact countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    try {
      await refreshBalances();
      const [invList, txList] = await Promise.all([
        api.getUserInvestments(),
        api.getTransactions(),
      ]);
      setInvestments(invList);
      setTransactions(txList);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
    }
  };

  const activeInvestments = useMemo(() => {
    return investments.filter((i) => i.status === 'ACTIVE');
  }, [investments]);

  const completedInvestments = useMemo(() => {
    return investments.filter((i) => i.status === 'COMPLETED' || i.status === 'CANCELLED');
  }, [investments]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (filterAsset !== 'ALL') {
      list = list.filter((t) => t.asset === filterAsset);
    }
    if (filterType !== 'ALL') {
      list = list.filter((t) => t.type === filterType);
    }
    return list;
  }, [transactions, filterAsset, filterType]);

  // Format countdown string
  const formatCountdown = (scheduledEndTimeIso: string) => {
    const endMs = new Date(scheduledEndTimeIso).getTime();
    const remainingMs = endMs - currentTimeMs;

    if (remainingMs <= 0) {
      return 'Maturing & Reconciling...';
    }

    const days = Math.floor(remainingMs / 86400000);
    const hours = Math.floor((remainingMs % 86400000) / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const getTransactionBadge = (type: LedgerTransaction['type']) => {
    switch (type) {
      case 'DEPOSIT':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'WITHDRAWAL_CONFIRM':
      case 'WITHDRAWAL_LOCK':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'WITHDRAWAL_REFUND':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'INVESTMENT_ALLOCATE':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'INVESTMENT_RETURN':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Portfolio &amp; Financial Ledger</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Authoritative double-entry balance breakdown &middot; Fixed-precision mathematical reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenDeposit}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/15"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit Funds</span>
          </button>
          <button
            type="button"
            onClick={onOpenWithdrawal}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Double-Entry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Value */}
        <div className="p-5 bg-neutral-900/80 rounded-2xl border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Total Account Value</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            ${balances ? Number(balances.totalEstimatedUSDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1">
            <span>Combined available, reserved &amp; active capital</span>
          </div>
        </div>

        {/* Available Balance */}
        <div className="p-5 bg-neutral-900/80 rounded-2xl border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Available Balance (USDT)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            ${balances ? Number(balances.available.USDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-neutral-500">
            Unencumbered capital available for trading or withdrawal
          </div>
        </div>

        {/* Invested Capital */}
        <div className="p-5 bg-neutral-900/80 rounded-2xl border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Active Invested Capital</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            ${balances ? Number(balances.totalInvestedUSDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-neutral-500">
            Locked in quantitative algorithmic plans
          </div>
        </div>

        {/* Unrealized PnL */}
        <div className="p-5 bg-neutral-900/80 rounded-2xl border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Accrued Yield (Unrealized P&amp;L)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            +${balances ? Number(balances.totalUnrealizedPnlUSDT).toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-neutral-500">
            Accruing progressively from active strategies
          </div>
        </div>

      </div>

      {/* Asset Allocations Breakdown Strip */}
      {balances && (
        <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-5 space-y-3">
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Supported Asset Vault Balances
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs tabular-nums">
            {(['USDT', 'BTC', 'ETH', 'SOL', 'PAXG', 'BNB'] as AssetSymbol[]).map((asset) => {
              const avail = Number(balances.available[asset] || 0);
              const inv = Number(balances.invested[asset] || 0);
              const total = avail + inv;
              return (
                <div key={asset} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-1">
                  <div className="flex justify-between items-center text-neutral-400 font-sans text-xs font-bold">
                    <span>{asset}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {asset === 'USDT' ? '$1.00' : 'Live'}
                    </span>
                  </div>
                  <div className="text-white font-bold text-sm">
                    {total.toFixed(asset === 'USDT' ? 2 : 4)}
                  </div>
                  <div className="text-[10px] text-neutral-500 flex justify-between">
                    <span>Avail: {avail.toFixed(asset === 'USDT' ? 2 : 3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Switcher: Active Investments vs Double-Entry Ledger History */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('investments')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'investments'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Active Strategies ({activeInvestments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Ledger Transactions ({transactions.length})
        </button>
      </div>

      {/* View 1: Active & Completed Investments */}
      {activeTab === 'investments' && (
        <div className="space-y-6">
          {activeInvestments.length === 0 ? (
            <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-12 text-center space-y-4">
              <Layers className="w-8 h-8 text-neutral-500 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">No Active Strategy Allocations</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Deploy available capital into automated market-neutral arbitrage or quantitative trend strategies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('plans')}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                Browse Investment Plans
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeInvestments.map((inv) => {
                const countdownStr = formatCountdown(inv.scheduledEndTime);
                const startMs = new Date(inv.startTime).getTime();
                const endMs = new Date(inv.scheduledEndTime).getTime();
                const totalDuration = endMs - startMs;
                const elapsed = Math.max(0, currentTimeMs - startMs);
                const progressPct = Math.min(100, Math.round((elapsed / totalDuration) * 100));

                return (
                  <div
                    key={inv.id}
                    className="bg-neutral-900/80 rounded-2xl border border-neutral-800 p-6 space-y-5 shadow-xl hover:border-neutral-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold uppercase">
                        ACTIVE STRATEGY
                      </span>
                      <span className="text-xs font-mono text-neutral-400">
                        {inv.asset} Settlement
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{inv.planName}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                        Activation APR: {inv.aprAtActivation}% &middot; {inv.durationDays} Days Duration
                      </p>
                    </div>

                    {/* Progress Bar & Countdown */}
                    <div className="space-y-1.5 p-3.5 bg-neutral-950 rounded-xl border border-neutral-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400 flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Countdown:</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">
                          {countdownStr}
                        </span>
                      </div>

                      <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                        <span>Started: {new Date(inv.startTime).toLocaleDateString()}</span>
                        <span>{progressPct}% elapsed</span>
                        <span>Matures: {new Date(inv.scheduledEndTime).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Financial Figures */}
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                      <div className="p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800/60">
                        <span className="text-neutral-500 text-[10px] block">LOCKED PRINCIPAL</span>
                        <span className="text-white font-bold text-sm">
                          {inv.initialAmount} {inv.asset}
                        </span>
                      </div>
                      <div className="p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800/60">
                        <span className="text-neutral-500 text-[10px] block">ACCRUED YIELD</span>
                        <span className="text-emerald-400 font-bold text-sm">
                          +{Number(inv.unrealizedPnl).toFixed(4)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800/60">
                        <span className="text-neutral-500 text-[10px] block">CURRENT VALUE</span>
                        <span className="text-white font-bold text-sm">
                          {inv.currentValuation}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed History section if any */}
          {completedInvestments.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-300">Completed &amp; Settled Investments</h3>
              <div className="space-y-3">
                {completedInvestments.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold text-white text-sm font-sans">{inv.planName}</span>
                      <div className="text-neutral-500 text-[11px] mt-0.5">
                        Completed on {new Date(inv.scheduledEndTime).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-neutral-500 text-[10px] block">PRINCIPAL</span>
                        <span className="text-white">{inv.initialAmount} {inv.asset}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[10px] block">REALIZED PROFIT</span>
                        <span className="text-emerald-400 font-bold">+{inv.realizedPnl} {inv.asset}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 2: Ledger Transaction History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-neutral-400">Filter Asset:</span>
              <select
                value={filterAsset}
                onChange={(e) => setFilterAsset(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
              >
                <option value="ALL">All Assets</option>
                <option value="USDT">USDT</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
                <option value="PAXG">PAXG</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Transaction Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAWAL_LOCK">Withdrawal Locks</option>
                <option value="WITHDRAWAL_CONFIRM">Withdrawals</option>
                <option value="INVESTMENT_ALLOCATE">Strategy Allocations</option>
                <option value="INVESTMENT_RETURN">Strategy Yields</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-medium text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Double-Entry Audit Entries</th>
                    <th className="py-3 px-4 text-right">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono tabular-nums">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500 font-sans">
                        No transactions recorded in the double-entry financial ledger matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${getTransactionBadge(tx.type)}`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans text-neutral-200 text-xs">
                          {tx.description}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white">
                          {tx.amount} {tx.asset}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-neutral-400">
                          <div className="space-y-0.5">
                            {tx.entries.map((entry) => (
                              <div key={entry.id} className="flex items-center gap-2">
                                <span className={entry.entryType === 'DEBIT' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                  {entry.entryType}:
                                </span>
                                <span className="text-neutral-500 text-[10px] truncate max-w-[150px]">
                                  {entry.accountId}
                                </span>
                                <span className="text-neutral-300">({entry.amount})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right text-neutral-500 text-[11px]">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
