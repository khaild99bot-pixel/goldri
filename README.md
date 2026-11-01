# GOLDRIX — Digital Asset Investment & Smart Trading Platform

GOLDRIX is an institutional-grade, full-stack digital asset investment and algorithmic smart trading platform. Engineered with a double-entry immutable financial ledger, deterministic risk-controlled quantitative strategies, real-time Japanese candlestick charting, and multi-tier KYC compliance pipelines.

---

## 1. Core Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Node.js, TypeScript, Express REST API, Vite development middleware.
- **Financial Accounting**: True double-entry bookkeeping engine (`Sum(Debits) == Sum(Credits)`) using 8-decimal fixed-precision BigInt arithmetic to eliminate floating-point rounding errors.
- **Database & Persistence**: ACID transaction coordinator with atomic locks, persistent state storage (`data/goldrix_store.json`), and periodic background reconciler for live yields and strategy countdowns.
- **Market Data Engine**: Real-time ticker discovery and geometric Brownian motion OHLCV candlestick generation with 20/50 period Moving Averages.
- **Internationalization (i18n)**: English (LTR), Arabic (RTL with native layout flipping and Arabic typography), and Turkish (LTR).
- **Mobile Ergonomics**: Responsive desktop dashboard with full-width layout and dedicated thumb-zone mobile navigation bar ($<768\text{px}$).

---

## 2. Default Seed Personas & Credentials

The platform initializes with pre-configured development roles:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Tier-2 Verified Investor** | `investor@goldrix.io` | `GoldrixInvestor2026!` | Elena Rostova ($20k+ capital, active BTC and USDT plans) |
| **Platform Administrator** | `admin@goldrix.io` | `GoldrixAdmin2026!` | Marcus Vance (Full system oversight, plan deployment) |
| **AML Compliance Officer** | `compliance@goldrix.io` | `GoldrixCompliance2026!` | Sarah Chen (KYC review, withdrawal queue approvals) |

*A one-click persona switcher is accessible from the top-right profile menu and sign-in modal for testing.*

---

## 3. Implemented Modules & Features

1. **Public Homepage**:
   - Institutional branding with hero section: *"Smarter Strategies. Clearer Insights."*
   - Live ticker ribbon of supported assets (BTC, ETH, SOL, PAXG, BNB).
   - Embedded interactive Japanese candlestick chart preview.
   - Algorithmic strategy highlights and cryptographic vault security overview.
   - Step-by-step onboarding explanation and regulatory FAQ accordion.
2. **Markets Explorer**:
   - Real-time price discovery, 24h high/low, and turnover turnover.
   - Live search filter, column sorting, and custom star watchlist.
   - One-click navigation into Smart Trading.
3. **Smart Trading Terminal**:
   - Interactive Japanese Candlestick Chart (1H, 4H, 1D, 1W) with crosshair OHLC tooltip.
   - SMA 20 & SMA 50 overlays and volume histogram.
   - Real-time orderbook depth simulation (bids and asks).
   - Algorithmic technical indicators (RSI 14, MACD, Bollinger Bands, VWAP).
   - Order placement with automated double-entry ledger balance checks.
4. **Investment Strategy Plans**:
   - Curated quantitative strategies: BTC Momentum Alpha, USDT Arbitrage (Delta Neutral), AI High-Frequency Scalper, Digital Gold (PAXG) Yield Harvester, and Ethereum MEV Engine.
   - Fixed and variable capital allocation with server-side validation.
   - Atomic fund transfer from `AVAILABLE` to `INVESTED` balance.
   - Synchronized countdown timers calculated from server UTC timestamps.
5. **Assets & Portfolio Ledgers**:
   - Authoritative double-entry ledger totals: Available, Reserved, and Invested Capital.
   - Realized and unrealized P&L calculations.
   - Active strategy cards with live progress bars and second-by-second countdown.
   - Detailed ledger transaction history showing debits, credits, and account IDs.
6. **Deposit & Withdrawal Pipelines**:
   - TRON (TRC20 for zero-loss low gas USDT), Bitcoin Native SegWit, Ethereum ERC20, and Solana.
   - Dedicated QR code visual, address generation, and network safety notices.
   - Idempotent testnet deposit adapter for sandbox testing.
   - Withdrawal request flow with atomic balance reservation to prevent double spending.
7. **KYC & Identity Verification**:
   - Multi-tier AML/KYC submission wizard (Passport, National ID, Driver's License).
   - Document upload preview and verification queue tracking.
8. **Administrative Control Portal (RBAC Enforced)**:
   - Overview KPI cards (Users, AUM, pending queues).
   - User Management with account suspension/restoration and audit logs.
   - KYC review queue with document inspection and approval/rejection notes.
   - Withdrawal review queue with approval (blockchain payout settlement) or rejection (automatic ledger refund).
   - Strategy Plan deployment and configuration editor.
   - Immutable audit trail recording all administrative actions.

---

## 4. REST API Endpoints & Health Check

- `GET /api/health` — Platform health check, ledger integrity, and uptime.
- `GET /api/v1/docs` — OpenAPI 3.0 specification.
- `POST /api/v1/auth/login` — Session authentication.
- `POST /api/v1/auth/register` — Investor registration with automatic 5,000 USDT sandbox capital.
- `GET /api/v1/markets` — Supported cryptocurrency ticker feed.
- `GET /api/v1/markets/:symbol/candles` — Historical OHLCV candle array.
- `GET /api/v1/investment-plans` — Available quantitative strategy plans.
- `POST /api/v1/investments/activate` — Atomic strategy allocation.
- `GET /api/v1/assets/summary` — Authoritative double-entry balance breakdown.
- `POST /api/v1/deposits/generate-address` — Address generation.
- `POST /api/v1/withdrawals/request` — Payout submission with fund reservation.
- `GET /api/v1/admin/overview` — Administrative control metrics (Requires `ADMIN` or `COMPLIANCE` role).

---

## 5. Verification & Testing

To run the automated financial ledger and invariant tests:
```bash
npm test
```
This executes:
- Decimal BigInt arithmetic precision (zero float errors).
- Double-entry balance preservation (`Sum(Debits) == Sum(Credits)`).
- Overdraft & negative balance blocking.
- Withdrawal reservation, ledger audit trail, and automatic refund on decline.
- Deposit idempotency and duplicate transaction hash replay prevention.

---

## 6. Development & Production Deployment

To start the local development server:
```bash
npm run dev
```

To build and run in production:
```bash
npm run build
npm start
```
