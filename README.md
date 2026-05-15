# EcoLink Backend API

Node.js + Express backend for the EcoLink platform. Squad API is the core transactional layer for every money movement.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your Squad API keys and merchant ID

# 3. Run in development
node server.js

# 4. Run in production
npm start
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `SQUAD_SECRET_KEY` | From Squad dashboard (sandbox or live) |
| `SQUAD_BASE_URL` | `https://sandbox-api-d.squadco.com` (test) or `https://api-d.squadco.com` (live) |
| `SQUAD_MERCHANT_ID` | Your Squad merchant ID — required for transfer references |
| `FRONTEND_URL` | Next.js frontend URL for CORS |
| `GROK_API_KEY` | Grok API key for voice-vouch analysis |

---

## API Reference

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

### Virtual Accounts (`/api/accounts`)

| Method | Path | Description |
|---|---|---|
| POST | `/individual` | Onboard an individual (trader or job seeker) |
| POST | `/business` | Onboard a business/trader |
| GET | `/` | List all merchant virtual accounts |
| GET | `/:customerIdentifier` | Get user by EcoLink ID |
| GET | `/virtual/:virtualAccountNumber` | Get user by NUBAN |
| GET | `/:customerIdentifier/transactions` | Get user transaction history (feeds credit model) |
| POST | `/simulate-payment` | Simulate payment — sandbox only |

**Create Individual Account**
```json
POST /api/accounts/individual
{
  "firstName": "Amaka",
  "lastName": "Okonkwo",
  "mobileNum": "08123456789",
  "email": "amaka@example.com",
  "bvn": "22343211654",
  "dob": "07/19/1990",
  "address": "22 Alaba Market, Lagos",
  "gender": "female",
  "beneficiaryAccount": "4920299492"
}
```

---

### Payments (`/api/payments`)

| Method | Path | Description |
|---|---|---|
| POST | `/card` | Charge a card directly |
| POST | `/authorize` | Submit PIN or OTP for card authorization |
| POST | `/ussd` | Initiate USSD payment (feature phones) |
| POST | `/bank` | Direct GTBank account debit |
| POST | `/bank/validate` | Validate bank debit with OTP |

**USSD Payment (key for EcoLink's informal users)**
```json
POST /api/payments/ussd
{
  "amount": 5000,
  "bankCode": "058",
  "customer": { "name": "Emeka Eze", "email": "emeka@example.com" },
  "webhookUrl": "https://your-domain.com/api/webhooks/squad"
}
```

**USSD Supported Banks:** GTB (058), Zenith (057), First Bank (011), UBA (033), Access (044), and 15+ more.

---

### Transfers (`/api/transfers`)

| Method | Path | Description |
|---|---|---|
| POST | `/lookup` | Verify account name before sending |
| POST | `/send` | Disburse funds (loans, gig pay, Ajo withdrawals) |
| POST | `/requery` | Check final status of a transfer |
| GET | `/` | List all outgoing transfers |
| GET | `/balance` | Get Squad wallet balance |

> ⚠️ Always call `/lookup` before `/send`. Always call `/requery` if `/send` returns a 424.

**Send Transfer**
```json
POST /api/transfers/send
{
  "bankCode": "000013",
  "accountNumber": "0123456789",
  "accountName": "Chiamaka Nwosu",
  "amount": 15000,
  "remark": "Micro-loan disbursement"
}
```

---

### Webhooks (`/api/webhooks`)

| Method | Path | Description |
|---|---|---|
| POST | `/squad` | Squad posts here on every successful transaction |
| GET | `/errors` | Retrieve missed webhook notifications |
| DELETE | `/errors/:transactionRef` | Clear a processed error entry |

**Webhook Security:** All incoming webhook requests are validated against an HMAC-SHA512 signature before processing. Supports Squad webhook v1, v2, and v3.

**Register this URL on your Squad dashboard:**
```
https://your-domain.com/api/webhooks/squad
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
├── server.js                  # Entry point
├── src/
│   ├── app.js                 # Express app, middleware, routes
│   ├── config/index.js        # Environment config
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
│   │   ├── accounts.routes.js
│   │   ├── auth.routes.js
│   │   ├── payments.routes.js
│   │   ├── reputation.routes.js
│   │   ├── transfers.routes.js
│   │   ├── vouch.routes.js
│   │   └── webhooks.routes.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── webhookValidator.js
│   └── utils/
│       └── helpers.js         # Response formatter, ID generator, kobo converter
└── .env.example
```

## Going Live

1. Change `SQUAD_BASE_URL` to `https://api-d.squadco.com`
2. Replace sandbox keys with live keys from Squad dashboard
3. Complete Squad KYC
4. Register your production webhook URL on the Squad dashboard
