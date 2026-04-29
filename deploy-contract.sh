#!/bin/bash

# =============================================================================
# TrustWork Smart Contract Deployment Script
# =============================================================================
# This script rebuilds and redeploys the fixed Soroban contract to Stellar testnet
#
# Prerequisites:
#   - Rust toolchain with wasm32-unknown-unknown target
#   - Stellar CLI installed (https://soroban.stellar.org/docs/getting-started/setup)
#   - Funded Stellar testnet account
#
# Usage:
#   chmod +x deploy-contract.sh
#   ./deploy-contract.sh
# =============================================================================

set -e  # Exit on any error

echo "🚀 TrustWork Contract Deployment"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v rustc &> /dev/null; then
    echo -e "${RED}❌ Rust not found. Install from https://rustup.rs${NC}"
    exit 1
fi

if ! command -v stellar &> /dev/null; then
    echo -e "${RED}❌ Stellar CLI not found. Install from https://soroban.stellar.org/docs/getting-started/setup${NC}"
    exit 1
fi

if ! rustc --print target-list | grep -q "wasm32-unknown-unknown"; then
    echo -e "${YELLOW}⚠️  Adding wasm32-unknown-unknown target...${NC}"
    rustup target add wasm32-unknown-unknown
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Step 1: Build the contract
echo -e "${BLUE}🔨 Step 1: Building smart contract...${NC}"
cd democontract

cargo build --target wasm32-unknown-unknown --release

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 2: Optimize WASM
echo -e "${BLUE}⚡ Step 2: Optimizing WASM binary...${NC}"

WASM_PATH="target/wasm32-unknown-unknown/release/trustwork_escrow.wasm"
OPTIMIZED_PATH="trustwork_escrow_optimized.wasm"

if [ ! -f "$WASM_PATH" ]; then
    echo -e "${RED}❌ WASM file not found at $WASM_PATH${NC}"
    exit 1
fi

stellar contract optimize \
  --wasm "$WASM_PATH" \
  --wasm-out "$OPTIMIZED_PATH"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Optimization failed${NC}"
    exit 1
fi

ORIGINAL_SIZE=$(wc -c < "$WASM_PATH")
OPTIMIZED_SIZE=$(wc -c < "$OPTIMIZED_PATH")
SAVINGS=$((ORIGINAL_SIZE - OPTIMIZED_SIZE))
PERCENT=$((SAVINGS * 100 / ORIGINAL_SIZE))

echo -e "${GREEN}✅ Optimization complete${NC}"
echo -e "   Original:  ${ORIGINAL_SIZE} bytes"
echo -e "   Optimized: ${OPTIMIZED_SIZE} bytes"
echo -e "   Saved:     ${SAVINGS} bytes (${PERCENT}%)"
echo ""

# Step 3: Deploy to testnet
echo -e "${BLUE}🌐 Step 3: Deploying to Stellar testnet...${NC}"
echo -e "${YELLOW}⚠️  This will prompt for your Stellar identity/secret key${NC}"
echo ""

# Check if identity exists
if ! stellar keys ls | grep -q "testnet"; then
    echo -e "${YELLOW}No 'testnet' identity found. Creating one...${NC}"
    echo -e "${YELLOW}You can also use: stellar keys generate testnet --network testnet${NC}"
    echo ""
fi

CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMIZED_PATH" \
  --source testnet \
  --network testnet 2>&1 | tee /dev/tty | grep -oE 'C[A-Z0-9]{55}' | head -1)

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${RED}❌ Deployment failed or contract ID not found${NC}"
    echo -e "${YELLOW}💡 Make sure you have:${NC}"
    echo -e "   1. A funded testnet account"
    echo -e "   2. Stellar identity configured: stellar keys generate testnet --network testnet"
    echo -e "   3. Testnet XLM: https://laboratory.stellar.org/#account-creator?network=test"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Contract deployed successfully!${NC}"
echo -e "${GREEN}📝 Contract ID: ${CONTRACT_ID}${NC}"
echo ""

# Step 4: Update .env file
echo -e "${BLUE}📝 Step 4: Updating .env file...${NC}"

cd ../trustwork-ui

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env not found, creating from .env.example${NC}"
    cp .env.example .env
fi

# Backup old .env
cp .env .env.backup
echo -e "${GREEN}✅ Backed up .env to .env.backup${NC}"

# Update CONTRACT_ID
if grep -q "VITE_CONTRACT_ID=" .env; then
    # Replace existing
    sed -i.bak "s|VITE_CONTRACT_ID=.*|VITE_CONTRACT_ID=${CONTRACT_ID}|" .env
    rm -f .env.bak
else
    # Add new
    echo "VITE_CONTRACT_ID=${CONTRACT_ID}" >> .env
fi

echo -e "${GREEN}✅ Updated VITE_CONTRACT_ID in .env${NC}"
echo ""

# Step 5: Verify deployment
echo -e "${BLUE}🔍 Step 5: Verifying deployment...${NC}"

EXPLORER_URL="https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}"
echo -e "${GREEN}✅ View on Stellar Expert:${NC}"
echo -e "   ${EXPLORER_URL}"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  🎉 DEPLOYMENT COMPLETE 🎉                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   Contract ID:  ${CONTRACT_ID}"
echo -e "   Network:      Stellar Testnet"
echo -e "   Explorer:     ${EXPLORER_URL}"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "   1. Restart your dev server: ${YELLOW}npm run dev${NC}"
echo -e "   2. Test contract creation in the UI"
echo -e "   3. Verify transactions on Stellar Explorer"
echo ""
echo -e "${GREEN}✨ All bugs should now be fixed!${NC}"
echo ""

# Optional: Start dev server
read -p "Start dev server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🚀 Starting dev server...${NC}"
    npm run dev
fi
