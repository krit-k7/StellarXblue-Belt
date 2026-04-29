# 🚀 Quick Start - Fix & Deploy TrustWork

## What Was Fixed?

The smart contract had a critical bug in token transfers causing "UnreachableCodeReached" errors. **It's now fixed in the code**, but you need to redeploy it to Stellar testnet.

**The Fix:** Changed token transfer methods in `democontract/escrow.rs` to use correct Soroban token interface:
- `transfer_from()` for pulling tokens from users (requires allowance)
- `transfer()` for sending tokens from contract

---

## ⚡ Fast Track Deployment

```bash
# 1. Build contract
cd democontract
cargo build --target wasm32-unknown-unknown --release

# 2. Optimize
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/trustwork_escrow.wasm \
  --wasm-out trustwork_escrow_optimized.wasm

# 3. Deploy
stellar contract deploy \
  --wasm trustwork_escrow_optimized.wasm \
  --source testnet \
  --network testnet

# 4. Copy the contract ID (starts with C...)

# 5. Update .env
cd ../trustwork-ui
# Edit .env and paste the new contract ID:
# VITE_CONTRACT_ID=C...

# 6. Start UI
npm run dev

# 7. Test at http://localhost:5173
```

**OR use automated script:**
```bash
./deploy-contract.sh  # Linux/Mac
.\deploy-contract.ps1  # Windows
```

---

## 📋 Step-by-Step (For First-Time Users)

### Prerequisites Check

Before starting, make sure you have:

- [ ] **Rust installed** - Check with `rustc --version`
  - If not: Install from https://rustup.rs
  
- [ ] **Stellar CLI installed** - Check with `stellar --version`
  - If not: Follow https://soroban.stellar.org/docs/getting-started/setup
  
- [ ] **wasm32 target** - Check with `rustc --print target-list | grep wasm32`
  - If not: Run `rustup target add wasm32-unknown-unknown`
  
- [ ] **Stellar testnet identity** - Check with `stellar keys ls`
  - If not: Run `stellar keys generate testnet --network testnet`
  
- [ ] **Testnet XLM** - Check balance with `stellar account balance --address <YOUR_ADDRESS> --network testnet`
  - If not: Get free testnet XLM from https://laboratory.stellar.org/#account-creator?network=test

---

### Step 1: Build the Fixed Contract (2 minutes)

Open your terminal in the project root:

```bash
cd democontract
cargo build --target wasm32-unknown-unknown --release
```

**Expected output:**
```
   Compiling trustwork-escrow v0.1.0
    Finished release [optimized] target(s) in 1m 23s
```

**If you see errors:**
- Make sure you're in the `democontract` folder
- Check that Rust is installed: `rustc --version`
- Try `cargo clean` then rebuild

---

### Step 2: Optimize the WASM (30 seconds)

Still in the `democontract` folder:

```bash
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/trustwork_escrow.wasm \
  --wasm-out trustwork_escrow_optimized.wasm
```

**Expected output:**
```
Optimized WASM binary written to trustwork_escrow_optimized.wasm
Original size: 123456 bytes
Optimized size: 54321 bytes
```

---

### Step 3: Deploy to Stellar Testnet (1 minute)

```bash
stellar contract deploy \
  --wasm trustwork_escrow_optimized.wasm \
  --source testnet \
  --network testnet
```

**Expected output:**
```
Contract deployed successfully!
Contract ID: CNEWCONTRACTID123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ
```

**⚠️ IMPORTANT:** Copy this contract ID! You'll need it in the next step.

**If you see errors:**

- **"Identity not found"** → Run `stellar keys generate testnet --network testnet`
- **"Insufficient balance"** → Get testnet XLM from https://laboratory.stellar.org/#account-creator?network=test
- **"Network error"** → Check your internet connection

---

### Step 4: Update Environment Variables (10 seconds)

```bash
cd ../trustwork-ui
```

Open `.env` file in your editor and update the contract ID:

```env
VITE_CONTRACT_ID=CNEWCONTRACTID123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ
```

Replace `CNEWCONTRACTID...` with the actual contract ID from Step 3.

**Tip:** Keep a backup of the old .env:
```bash
cp .env .env.backup
```

---

### Step 5: Start the UI (10 seconds)

```bash
npm run dev
```

**Expected output:**
```
  VITE v8.0.3  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Step 6: Test in Browser (5 minutes)

1. **Open** http://localhost:5173

2. **Connect Wallet:**
   - Click "Connect Wallet"
   - Approve in Freighter popup
   - You should see your wallet address in the navbar

3. **Create a Test Contract:**
   - Click "New Contract"
   - Select any template
   - Fill in:
     - Title: "Test Contract"
     - Freelancer: Any valid Stellar address (or use `GFREELANCER7KPQSTELLAR56789ABCDEF12` for testing)
     - Amount: 10 XLM
   - Click through the steps
   - Click "Deploy & Fund Escrow"

4. **Sign Transactions:**
   - Freighter will pop up **3 times**:
     1. Create escrow
     2. Approve token spend
     3. Deposit funds
   - Approve all three

5. **Verify Success:**
   - You should see a success screen
   - Contract appears in dashboard with "ACTIVE" status
   - Click the contract to see details

**🎉 If you see this, everything is working!**

---

## 🐛 Troubleshooting

### "UnreachableCodeReached" still appears
→ Update `.env` with NEW contract ID and restart dev server

### Freighter doesn't pop up
→ Check Freighter is installed, unlocked, and on Testnet network

### "Insufficient balance"
→ Get testnet XLM from https://laboratory.stellar.org/#account-creator?network=test

### Build fails with "target not found"
→ Run `rustup target add wasm32-unknown-unknown`

### Stellar CLI not found
→ Install from https://soroban.stellar.org/docs/getting-started/setup

---

## ✅ Success Checklist

You're done when:
- [x] Contract builds without errors
- [x] Contract deploys to testnet
- [x] New contract ID in `.env`
- [x] UI starts without errors
- [x] Can connect wallet
- [x] Can create contract without "UnreachableCodeReached" error
- [x] Contract appears in dashboard
- [x] Transactions visible on Stellar Explorer

---

**Need help?** Check the console (F12) for errors or verify transactions on [Stellar Explorer](https://stellar.expert/explorer/testnet).
