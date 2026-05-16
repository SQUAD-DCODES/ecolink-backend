# EcoLink — Intelligent Informal Economy OS

> **Squad API Hackathon 2025** · Challenge 02 · Backend API

EcoLink is an intelligent economic platform built to solve one of Nigeria's most persistent challenges — the disconnect between 80 million+ informal workers, unemployed youth, and the financial systems that could empower them. Every naira that moves on EcoLink flows through **Squad API**.

---

## The Problem We Solve

| Challenge | EcoLink's Answer |
|---|---|
| `PORT` | Server port (default: 5000) |
| `SQUAD_SECRET_KEY` | From Squad dashboard (sandbox or live) |
| `SQUAD_BASE_URL` | `https://sandbox-api-d.squadco.com` (test) or `https://api-d.squadco.com` (live) |
| `SQUAD_MERCHANT_ID` | Your Squad merchant ID — required for transfer references |
| `FRONTEND_URL` | Next.js frontend URL for CORS |
| `GROK_API_KEY` | Grok API key for voice-vouch analysis |

---

## Judging Criteria Alignment

### Auth (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Start registration with phone number (OTP issued) |
| POST | `/verify-otp` | Verify OTP and issue token |
| POST | `/resend-otp` | Resend OTP |
| POST | `/login` | Login with phone + PIN |
| POST | `/setup-pin` | Set 4-digit PIN (requires auth) |
| GET | `/me` | Get current user (requires auth) |

### Health
```
GET /health
```

---

## What Makes EcoLink Different

### 1. Ajo Engine — Digitised Rotating Savings
Nigeria's Ajo/Esusu groups manage an estimated ₦300B+ annually — completely invisible to banks. EcoLink digitises them: contributions are collected via Squad, the pot sits in a Squad virtual account, and disbursement is programmatic on the payout date. No organiser can disappear with the money.

### 2. Vocal Reputation — Community Trust as Credit Signal
Traditional credit bureaus have zero data on informal workers. But their community does. EcoLink lets community members record 30-second voice vouches in Pidgin, Yoruba, Igbo, or Hausa. AI extracts trust signals (reliability, honesty, work ethic) and feeds them into the user's credit profile — giving people a meaningful score on day one, before their first Squad transaction.

### 3. AI Job Matching — Skills + Location + Language
Not just a job board. Every job listing is scored against the user's skill profile and location. A welder in Oshodi gets matched to welding jobs in Oshodi first. The match score is computed server-side and returned with every job listing.

### 4. Daily Hustle Check-in — Activity Signal
Every morning, users tap one button: Good / Okay / Slow. Each check-in is a data point that feeds the credit model — consistent activity signals reliability even on days with no Squad transactions. Three consecutive "Slow" days triggers proactive job suggestions and loan options.

### 5. Trade Circle — Live Marketplace
A structured notice board where traders post what they have and buyers post what they need. Every transaction that closes goes through Squad, adding to both parties' financial records.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22 |
| Framework | Express.js v5 |
| Database | MongoDB (Mongoose v9) |
| Payments | Squad API (all financial operations) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Security | Helmet, CORS, express-rate-limit |
| Dev server | Nodemon |

---

## Squad API Integration — Full Map

| EcoLink Feature | Squad Endpoint | How it's used |
|---|---|---|
| User onboarding | `POST /virtual-account` | Every registered user gets a Squad NUBAN — their permanent financial identity |
| Business/trader onboarding | `POST /virtual-account/business` | Traders get a business virtual account |
| Receive Ajo contributions | Virtual Account + Webhooks | Squad holds the pot, webhook fires on every contribution |
| Auto-disburse savings pot | `POST /payout/transfer` | Programmatic payout to beneficiary on cycle completion |
| Gig worker payment | `POST /payout/transfer` | Employer releases escrow, Squad pays worker instantly |
| Micro-loan disbursement | `POST /payout/transfer` | Approved loans go directly to borrower's Squad wallet |
| Feature-phone payments | `POST /transaction/initiate/process-payment` (USSD) | Zero-data users pay via USSD — critical for informal economy |
| Card payments | Direct Card API (charge + authorize) | Marketplace purchases, loan repayments |
| Payment links | `POST /payment-link/create` | Traders share payment links with buyers — no app required |
| Verify account before transfer | `POST /payout/account/lookup` | Always verified before any payout |
| Credit signal source | Transaction history via Webhooks | Every Squad payment updates the user's credit profile in real time |
| Webhook validation | HMAC-SHA512 (v1, v2, v3) | All incoming Squad webhooks validated before processing |
| Missed webhook recovery | `GET /virtual-account/webhook/logs` | Missed payments retrieved and processed automatically |
| Balance management | `GET /merchant/balance` | Platform liquidity monitoring |
| Sandbox testing | `POST /virtual-account/simulate/payment` | End-to-end payment simulation without real money |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   ACCESS LAYER                      │
│  Phone + PIN login · USSD · WhatsApp · Agent POS   │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│               INTELLIGENCE LAYER                    │
│  AI Job Matcher · Ajo Engine · Credit Scorer        │
│  Vocal Reputation · Daily Check-in · Trade Graph   │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                 CORE PLATFORM                       │
│  JWT Auth · User Profiles · Job Marketplace         │
│  Savings Groups · Loan Management · Vouch System    │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              SQUAD API — TRANSACTIONAL BACKBONE     │
│  Virtual Accounts · Webhooks · Transfers · USSD     │
│  Card Payments · Payment Links · Balance API        │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                   MONGODB                           │
│  Users · Transactions · Jobs · AjoGroups            │
│  Loans · CreditProfiles · Vouches                   │
└─────────────────────────────────────────────────────┘
```

---

### Vouch (`/api/vouch`) — requires auth

| Method | Path | Description |
|---|---|---|
| POST | `/` | Submit a vocal vouch |
| GET | `/received` | Vouches received by current user |
| GET | `/given` | Vouches given by current user |
| GET | `/user/:userId` | Vouches for a specific user |

**Submit Vouch**
```json
POST /api/vouch
{
  "recipientPhone": "08099999999",
  "audioUrl": "https://example.com/audio.mp3",
  "durationSeconds": 42,
  "language": "english",
  "transcript": "He always pays back on time and is reliable in the market."
}
```

---

### Reputation (`/api/reputation`) — requires auth

| Method | Path | Description |
|---|---|---|
| GET | `/me` | Reputation summary for current user |
| GET | `/:userId` | Reputation summary for a user |

---

## Squad API Integration Map

| EcoLink Feature | Squad API Used |
|---|---|
| User onboarding | Virtual Account (Customer Model) |
| Trader onboarding | Virtual Account (Business Model) |
| Receive Ajo contributions | Virtual Account + Webhooks |
| Disburse micro-loans | Transfer API |
| Pay gig workers | Transfer API |
| Feature-phone payments | USSD Direct API |
| Card payments | Direct Card API |
| Credit score signals | Transaction history from Virtual Account API |
| Balance management | Ledger Balance API |

---

## Project Structure

```
ecolink-backend/
├── server.js                        # Entry point — DB connect then server start
├── src/
│   ├── app.js                       # Express app, middleware, all routes
│   ├── config/
│   │   ├── index.js                 # Environment variables
│   │   └── database.js              # MongoDB connection
│   ├── services/
│   │   ├── grok.service.js    # Grok AI vouch analysis
│   │   ├── reputation.service.js
│   │   └── squad.service.js   # All Squad API calls (single source of truth)
│   ├── controllers/
│   │   ├── accounts.controller.js
│   │   ├── auth.controller.js
│   │   ├── payments.controller.js
│   │   ├── reputation.controller.js
│   │   ├── transfers.controller.js
│   │   ├── vouch.controller.js
│   │   └── webhooks.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── wallet.routes.js
│   │   ├── accounts.routes.js
│   │   ├── auth.routes.js
│   │   ├── payments.routes.js
│   │   ├── reputation.routes.js
│   │   ├── transfers.routes.js
│   │   ├── vouch.routes.js
│   │   └── webhooks.routes.js
│   ├── models/
│   │   ├── User.js                  # Phone auth, skills, KYC, credit tier
│   │   ├── Transaction.js           # Every Squad payment, indexed for credit scoring
│   │   ├── AjoGroup.js              # Members, contributions, payout rotation
│   │   ├── Job.js                   # Listings, applications, escrow status
│   │   ├── Loan.js                  # Applications, disbursements, repayments
│   │   ├── CreditProfile.js         # 5-factor score, tier, max loan eligibility
│   │   └── Vouch.js                 # Voice notes, AI-extracted trust signals
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT validation
│   │   ├── errorHandler.js          # Global error handling
│   │   └── webhookValidator.js      # Squad HMAC signature validation (v1/v2/v3)
│   └── utils/
│       └── helpers.js               # Response formatter, kobo/naira converter, ID generator
└── .env.example
```

---

## MongoDB Collections

| Collection | Purpose | Credit Signal? |
|---|---|---|
| `users` | Profiles, phone auth, PIN, KYC status, credit tier | No |
| `transactions` | Every Squad payment — raw fuel for credit engine | ✅ Primary signal |
| `creditprofiles` | Live score per user, 5-factor breakdown, score history | — (output) |
| `ajogroups` | Savings circles, members, contributions, cycle state | ✅ Savings consistency |
| `jobs` | Gig listings, applications, escrow, payment status | ✅ Gig completion rate |
| `loans` | Loan records, disbursement refs, repayment history | ✅ Repayment reliability |
| `vouches` | Voice notes, AI trust signals, voucher credibility | ✅ Vocal reputation |

---

## Complete API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register with phone number — sends OTP |
| POST | `/api/auth/verify-otp` | None | Verify OTP — returns JWT token |
| POST | `/api/auth/resend-otp` | None | Resend OTP |
| POST | `/api/auth/setup-pin` | Bearer | Set 4-digit PIN + skills during onboarding |
| POST | `/api/auth/login` | None | Phone + PIN login |
| GET | `/api/auth/me` | Bearer | Get logged-in user profile |

### Wallet

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/wallet/create` | Bearer | Create Squad virtual account (NUBAN) |
| GET | `/api/wallet/balance` | Bearer | Get wallet balance (calculated from transactions) |
| GET | `/api/wallet/transactions` | Bearer | Transaction history — powers dashboard |
| POST | `/api/wallet/lookup` | Bearer | Verify recipient account before sending |
| POST | `/api/wallet/send` | Bearer | Send money via Squad transfer |
| POST | `/api/wallet/payment-link` | Bearer | Generate shareable payment link |
| POST | `/api/wallet/ussd` | Bearer | Initiate USSD payment (zero-data users) |

### Jobs & Gigs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs` | Bearer | AI-matched job listings with match score |
| POST | `/api/jobs` | Bearer | Post a job (with optional escrow) |
| GET | `/api/jobs/:id` | Bearer | Full job detail |
| POST | `/api/jobs/:id/apply` | Bearer | Apply for a job |
| PATCH | `/api/jobs/:id/hire/:applicantId` | Bearer | Hire an applicant |
| PATCH | `/api/jobs/:id/complete` | Bearer | Mark complete + release Squad payment |
| GET | `/api/jobs/mine/posted` | Bearer | Employer's posted jobs |
| GET | `/api/jobs/mine/applied` | Bearer | Worker's applied jobs |

### Savings (Ajo / Esusu)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/savings` | Bearer | List user's Ajo groups |
| POST | `/api/savings` | Bearer | Create new group |
| GET | `/api/savings/:groupId` | Bearer | Group detail + member contributions |
| POST | `/api/savings/:groupId/join` | Bearer | Join an existing group |
| POST | `/api/savings/:groupId/contribute` | Bearer | Make contribution via Squad |
| POST | `/api/savings/:groupId/disburse` | Bearer | Disburse pot to beneficiary via Squad |

### Credit

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/credit/score` | Bearer | 5-factor credit score breakdown |
| GET | `/api/credit/offers` | Bearer | Loan offers based on credit tier |
| GET | `/api/credit/loans` | Bearer | User's loan history |
| POST | `/api/credit/apply` | Bearer | Apply for micro-loan |
| POST | `/api/credit/loans/:id/disburse` | Bearer | Disburse loan to Squad wallet |

### Profile & Reputation

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/profile` | Bearer | Full profile + credit profile |
| PATCH | `/api/profile` | Bearer | Update name, bio, skills, location |
| POST | `/api/profile/kyc` | Bearer | Submit KYC document |
| POST | `/api/profile/checkin` | Bearer | Daily Hustle Check-in (Good/Okay/Slow) |

### Vocal Reputation

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/vouch` | Bearer | Submit voice vouch for another user |
| GET | `/api/vouch/received` | Bearer | Vouches received by logged-in user |
| GET | `/api/vouch/given` | Bearer | Vouches given by logged-in user |
| GET | `/api/vouch/user/:userId` | Bearer | All vouches for a specific user |

### Webhooks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/webhooks/squad` | HMAC | Squad payment notifications — saves transactions + updates credit |
| GET | `/api/webhooks/errors` | Bearer | Retrieve missed webhook notifications |
| DELETE | `/api/webhooks/errors/:ref` | Bearer | Clear processed webhook error |

### Health

```
GET /health
```

---

## Credit Scoring Model

Scores range from 0 to 850 — same scale as traditional credit bureaus.

| Factor | Weight | Signal Source |
|---|---|---|
| Payment Reliability | 35% | On-time loan repayments via Squad |
| Vocal Reputation | 25% | AI-processed voice vouches from community |
| Savings Consistency | 20% | Ajo group contribution rate |
| Gig Completion | 10% | Jobs completed with Squad payment released |
| Identity Verified | 10% | KYC document + selfie |

| Tier | Score Range | Max Loan |
|---|---|---|
| Unscored | 0 | — |
| Bronze | 1–299 | ₦5,000 |
| Silver | 300–499 | ₦50,000 |
| Gold | 500–699 | ₦150,000 |
| Platinum | 700–850 | ₦500,000 |

Score updates automatically on every Squad webhook event — no batch job required.

---

## Setup & Running

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- Squad account — [dashboard.squadco.com](https://dashboard.squadco.com)

### Installation

```bash
# Clone and install
git clone <repo>
cd ecolink-backend
npm install

# Configure environment
cp .env.example .env
```

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Squad API — get from sandbox.squadco.com > Merchant Settings > API & Webhook
SQUAD_SECRET_KEY=your_secret_key_here
SQUAD_BASE_URL=https://api-d.squadco.com
SQUAD_MERCHANT_ID=YOUR_MERCHANT_ID

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=Cluster0

# App
JWT_SECRET=your_64_char_random_string
FRONTEND_URL=http://localhost:3000
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Run

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000`. You will see:
```
[MongoDB] Connected: cluster0.mongodb.net
EcoLink Backend running on http://localhost:5000
```

---

## Testing the Integration

### 1. Register a test user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Amaka","lastName":"Obi","phone":"2348012345678","businessType":"trader","state":"Lagos"}'
```

OTP is printed in backend terminal (dev mode).

### 2. Verify OTP + get token
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"2348012345678","otp":"PRINTED_OTP"}'
```

### 3. Set PIN + skills
```bash
curl -X POST http://localhost:5000/api/auth/setup-pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","skills":["Sales & trading","Customer service"]}'
```

### 4. Post a job (no Squad required)
```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Market assistant","description":"Help needed at Bodija market","skills":["Sales & trading"],"state":"Oyo","jobType":"gig","category":"trade","payAmount":5000,"payFrequency":"per_job","escrowEnabled":false}'
```

### 5. Simulate a Squad payment (sandbox)
```bash
curl -X POST http://localhost:5000/api/accounts/simulate-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"virtualAccountNumber":"YOUR_NUBAN","amount":500000}'
```

This triggers the full webhook flow: payment saved → credit score updated → tier recalculated.

---

## Webhook Setup (for Squad to notify your server)

Use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 5000
```

Register the webhook URL on your Squad sandbox dashboard:
```
Merchant Settings → API & Webhook → Webhook URL
https://YOUR_NGROK_URL.ngrok-free.app/api/webhooks/squad
```

Webhook validation supports Squad v1, v2, and v3 signature formats automatically.

---

## Going Live

# Deployment Status 
1. EcoLink runs on Squad's **live API** (`api-d.squadco.com`). All transactions, virtual accounts, and webhooks are real.
2. Complete Squad KYC on the live dashboard
3. Update `FRONTEND_URL` to your production frontend URL
4. Register your production webhook URL on Squad dashboard

---

## Business Model

| Revenue Stream | Mechanism |
|---|---|
| Transaction fees | Small percentage on every Squad payment processed |
| Loan origination | Commission from lending partners (NIRSAL, MFBs) on facilitated loans |
| Premium analytics | Anonymised market intelligence sold to government, CBN, institutional lenders |
| Escrow float | Interest on funds held in escrow during active gigs |

### Scale Path

| Phase | Users | Strategy |
|---|---|---|
| Pilot | 10,000 | One market cluster — Bodija, Oshodi, or Alaba |
| City | 100,000 | Partner with market associations + telcos for agent onboarding |
| National | 1M+ | Government digital ID integration (NIN), CBN financial inclusion mandate |
| Pan-African | 10M+ | Same model, new languages — Swahili, Amharic, Wolof |

---

## Impact Numbers

- **80M+** informal workers in Nigeria addressable on day one
- **₦300B+** cycling through Ajo groups annually — now secured and digitised
- **33M** unemployed youth with no structured job matching system
- **Zero** of them have a formal credit history — EcoLink creates one from scratch
- Every Squad transaction is a data point. Every data point improves the model. Every improved model unlocks more access.

---

*EcoLink · Squad API Hackathon 2026 · Node.js · Express · MongoDB · Squad API*