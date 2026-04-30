# TrustWork — Decentralized Freelance Escrow on Stellar

> A blockchain-based escrow platform where clients and freelancers transact trustlessly using Soroban smart contracts on the Stellar network.

[![Live App](https://img.shields.io/badge/Live_App-trust--work26.vercel.app-success?style=flat-square)](https://trust-work26.vercel.app)
[![Network](https://img.shields.io/badge/Network-Stellar_Testnet-blue?style=flat-square)](https://stellar.org)
[![Contract](https://img.shields.io/badge/Soroban-Deployed-purple?style=flat-square)](https://soroban.stellar.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 🌐 Live Application

**[https://trust-work26.vercel.app](https://trust-work26.vercel.app)**

## 📹 Demo Video

[Download Demo Video](https://github.com/krit-k7/StellarXblue-Belt/raw/main/ScreenRecording/demo.mp4)

---

## 📌 What is TrustWork?

TrustWork eliminates payment disputes in freelancing by locking funds in a Soroban smart contract. The client deposits payment upfront — the freelancer gets paid only when work is approved. No middlemen, no chargebacks, fully on-chain.

**Core workflow:**
1. Client creates a contract and locks XLM in escrow
2. Freelancer completes the work and submits it
3. Client reviews and approves → funds released to freelancer
4. If disputed → arbitrator resolves on-chain

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, CSS |
| Blockchain | Stellar Testnet, Soroban Smart Contracts |
| Smart Contract | Rust (Soroban SDK) |
| Wallet | Freighter Browser Extension |
| Real-time Chat | Supabase |
| Deployment | Vercel |

---

## ✨ Features

- **Escrow Contract** — Funds locked on-chain until work is approved
- **Milestone Payments** — Split a project into multiple escrow instances
- **Dispute Resolution** — Optional arbitrator with on-chain enforcement
- **Auto-Release** — Freelancer can claim after deadline if client is inactive
- **Real-time Chat** — Private workspace per contract with file sharing
- **Freighter Wallet** — Seamless Stellar wallet integration
- **Zero-Error UX** — All blockchain errors translated to user-friendly messages

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Freighter Wallet](https://www.freighter.app/) browser extension
- Stellar testnet account (funded via [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test))

### Local Setup

```bash
# Clone the repository
git clone https://github.com/Vedang24-hash/TrustWork26.git
cd TrustWork26/trustwork-ui

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your contract ID and Supabase keys

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_CONTRACT_ID=CBEUUVKJD2FM5CL57COXJV55HXYSEDW7VXRBJFWKDNZZRSHBMWQZUNQS
VITE_STELLAR_NETWORK=testnet
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Deploy Smart Contract

```bash
# From project root
./deploy-contract.sh
```

---

## 📁 Project Structure

```
TrustWork26/
├── democontract/          # Soroban smart contract (Rust)
│   ├── escrow.rs          # Core escrow logic
│   ├── factory.rs         # Contract factory
│   ├── storage.rs         # On-chain storage
│   ├── types.rs           # Data types
│   └── lib.rs             # Contract interface
├── trustwork-ui/          # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # App pages
│   │   ├── hooks/         # useWallet, useChat
│   │   ├── utils/         # stellar.js, contract.js
│   │   └── lib/           # Supabase client
│   └── vercel.json        # Deployment config
├── deploy-contract.sh     # Contract deployment script
└── QUICK_START.md         # Quick setup guide
```

---

## 📊 User Feedback — 30+ Real Responses

We collected feedback from **30+ real users** who tested TrustWork on Stellar Testnet.

**→ [View Full Feedback Spreadsheet](https://docs.google.com/spreadsheets/d/10T2ffMEWhxmX97yFe9HG5z5gC-0IqlprxsF2_YdVZj4/edit?usp=sharing)**

---

### 👥 Table 1 — Test Users

| User Name | User Email | User Wallet Address |
|-----------|------------|---------------------|
| Tushar Naik | naiktusha91@gmail.com | `GDAHV3UEBVSKMEJP5OFD4BUEQSEBX73FOOPHY7IOM3X5BQJ44OHSAPGMN` |
| Vedant Pathak | vedantpathak002@gmail.com | `GBYW6GYZWPATOJDL7XYM4WPUFWQWHHI6D6XOAITGZS4DKU26UF5LJDYL` |
| Sagar Shinde | Sagar.shinde@techbeansystems.com | `GDYH4ZTTH3ISXY254KYGNHOXCMID2Y6WDIYNVTOWY7N7EXOTVZFCDQBEn` |
| Pralhad Naik | Naik.Pralhad@gmail.com | `GBTD3RMD5U2PLGY7KFFXYQP7V5JU5DXHUCSYTL5A5J7ZU2TUBVWKPQ7W` |
| Amit Suryawanshi | amitsurya2411@gmail.com | `GC46W2ZJLS5BVTAD2JIJYGX43ZDORWEKMBJVFON7Y53VVPOJXDKRCACf` |

---

### 🔄 Table 2 — User Feedback Implementation

| User Name | User Email | User Wallet Address | User Feedback | Commit ID |
|-----------|------------|---------------------|---------------|-----------|
| Kunal Sathe | kunalsathe18@gmail.com | `GAOFS35LNKWZBY7RJKBJVHYDTL3SX2NKVDP5HTCPUEFC6L3Q4YLJLWPA` | "Transaction fails with Freighter showing 'Signing not possible' error on testnet" | [`31cd075`](https://github.com/Vedang24-hash/TrustWork26/commit/31cd075) |
| Nisha Bahirat | bahirat.nisha@gmail.com | `GBTT2S5AYMJ26RAMZNMWJR6M3HL6DTJCFQQMTRFNVL3F6Q7AGVWBBJQn` | "Freighter is installed but app still shows 'Install Freighter' screen" | [`ebcbdb9`](https://github.com/Vedang24-hash/TrustWork26/commit/ebcbdb9) |
| Omkar Jagtap | omkarjagtap2105@gmail.com | `GAF57COCDLHE273YGSB6YUIDHWU53SJUJ522CLEDVH4SFPAWRR2WTAFZ` | "Fake demo contracts appear on dashboard when connecting wallet for the first time" | [`7f94b28`](https://github.com/Vedang24-hash/TrustWork26/commit/7f94b28) |
| Aniket Bhilare | bhilareaniket2424@gmail.com | `GDRTJRMXK43GQL5EE25QGULXYRVLJ646E5SCXRX376VMSLSSKSLWONM7` | "Contract creation fails with 'InvalidInput' error when milestone titles have special characters" | [`fb429d6`](https://github.com/Vedang24-hash/TrustWork26/commit/fb429d6) |
| Pranali Bahirat | bahirat.prananli22@gmail.com | `GAWOMT3S7OHVZRJMS4VND2HKSBNMBEWKBQSSELPPFL7SH4D63E2WGAK` | "Both client and freelancer see approve/reject buttons after work submission — only client should see them" | [`fb15bb3`](https://github.com/Vedang24-hash/TrustWork26/commit/fb15bb3) |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      User Browser                        │
│                                                          │
│   ┌──────────────┐        ┌─────────────────────────┐   │
│   │   React SPA  │◀──────▶│  Freighter Wallet Ext.  │   │
│   │  (Vercel)    │        │  (Signs transactions)   │   │
│   └──────┬───────┘        └─────────────────────────┘   │
└──────────┼──────────────────────────────────────────────┘
           │
           │  HTTPS / Soroban RPC
           ▼
┌─────────────────────────┐      ┌──────────────────────┐
│   Stellar Testnet RPC   │      │   Supabase           │
│   soroban-testnet.      │      │   (Real-time chat,   │
│   stellar.org           │      │    message storage)  │
└──────────┬──────────────┘      └──────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│              Soroban Smart Contract (Rust)               │
│         CBEUUVKJD2FM5CL57COXJV55HXYSEDW7VXR...         │
│                                                          │
│   create_escrow → deposit → submit_work →               │
│   approve_and_release / refund / raise_dispute          │
└─────────────────────────────────────────────────────────┘
```

### How the Components Interact

| Component | Role | Talks To |
|-----------|------|----------|
| **React Frontend** | UI, state management, routing | Stellar RPC, Supabase, Freighter |
| **Freighter Wallet** | Signs every blockchain transaction | Stellar Network |
| **Soroban Smart Contract** | Holds funds, enforces escrow rules | Stellar Ledger |
| **Stellar RPC** | Submits & queries transactions | Smart Contract |
| **Supabase** | Real-time chat messages between parties | Frontend only |
| **Vercel** | Hosts and serves the React app | — |
| **GitHub Actions** | Builds and deploys on every push | Vercel |

### Contract State Machine

```
  create_escrow()
        │
        ▼
 AwaitingDeposit
        │
   deposit()
        │
        ▼
    Funded ──────────────────────────────────┐
        │                                    │
  submit_work()                          refund()
        │                                    │
        ▼                                    ▼
 WorkSubmitted                           Refunded
        │
   ┌────┴────┐
   │         │
approve()  raise_dispute()
   │         │
   ▼         ▼
Completed  Disputed
               │
         resolve_dispute()
               │
        ┌──────┴──────┐
        ▼             ▼
   Completed       Refunded
  (to seller)    (to buyer)
```

### Frontend Structure

```
src/
├── pages/
│   ├── Home.jsx           # Landing page
│   ├── Dashboard.jsx      # Contract list + stats
│   ├── CreateContract.jsx # Multi-step contract builder
│   ├── ContractDetail.jsx # Contract view + actions
│   └── Arbitration.jsx    # Dispute resolution panel
├── components/
│   ├── ContractForm.jsx   # 4-step form (template → parties → terms → review)
│   ├── ContractChat.jsx   # Real-time chat per contract
│   ├── ActionPanel.jsx    # On-chain action buttons (deposit, approve, etc.)
│   ├── Navbar.jsx         # Navigation
│   ├── WalletModal.jsx    # Freighter connection flow
│   └── TxModal.jsx        # Transaction signing status
├── hooks/
│   ├── useWallet.js       # Freighter detection, connect, session restore
│   └── useChat.js         # Supabase real-time chat
└── utils/
    ├── stellar.js         # All Soroban contract calls
    └── contract.js        # Local state, localStorage, validation
```



- **Network:** Stellar Testnet
- **Contract ID:** `CBEUUVKJD2FM5CL57COXJV55HXYSEDW7VXRBJFWKDNZZRSHBMWQZUNQS`
- **Explorer:** [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBEUUVKJD2FM5CL57COXJV55HXYSEDW7VXRBJFWKDNZZRSHBMWQZUNQS)

### Contract Functions

| Function | Description |
|----------|-------------|
| `create_escrow` | Creates a new escrow instance |
| `deposit` | Client locks funds into escrow |
| `submit_work` | Freelancer marks work as submitted |
| `approve_and_release` | Client approves and releases payment |
| `refund` | Client reclaims funds before submission |
| `raise_dispute` | Either party raises a dispute |
| `resolve_dispute` | Arbitrator resolves with split or full award |
| `claim_after_deadline` | Freelancer claims if client is inactive past deadline |
| `get_escrow` | Read escrow state |

---

## 🚢 Deployment & CI/CD

### Live Deployment
The app is live at **[https://trust-work26.vercel.app](https://trust-work26.vercel.app)** — deployed on Vercel.

### CI/CD Pipeline
Automated via **GitHub Actions** (`.github/workflows/deploy.yml`):

| Step | What it does |
|------|-------------|
| **Trigger** | Runs on every push to `master` |
| **Lint** | Checks code quality with ESLint |
| **Build** | Runs `npm run build` with production env vars |
| **Artifact** | Uploads built `dist/` folder (retained 7 days) |
| **Deploy** | Auto-deploys to Vercel production on successful build |

```
Push to master
     │
     ▼
┌─────────────┐     ┌──────────────┐
│  Lint &     │────▶│  Deploy to   │
│  Build      │     │  Vercel Prod │
└─────────────┘     └──────────────┘
```

### Manual Deploy

```bash
cd trustwork-ui
npm run build
vercel --prod
```

### Deploy Smart Contract

```bash
# From project root
./deploy-contract.sh
```

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">

[🌐 Live App](https://trust-work26.vercel.app) &nbsp;•&nbsp; [📹 Demo Video](https://github.com/krit-k7/StellarXblue-Belt/raw/main/ScreenRecording/demo.mp4) &nbsp;•&nbsp; [📊 User Feedback](https://docs.google.com/spreadsheets/d/10T2ffMEWhxmX97yFe9HG5z5gC-0IqlprxsF2_YdVZj4/edit?usp=sharing) &nbsp;•&nbsp; [🐛 Issues](https://github.com/Vedang24-hash/TrustWork26/issues)

Built with ❤️ on Stellar

</div>
