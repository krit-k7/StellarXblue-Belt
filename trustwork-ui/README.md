# TrustWork UI - Frontend Application

React-based frontend for the TrustWork decentralized freelance escrow platform.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://trust-work26.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)](https://vitejs.dev)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- [Freighter Wallet](https://freighter.app/) browser extension
- Funded Stellar testnet account

### Setup
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables
```env
# Smart contract configuration
VITE_CONTRACT_ID=<your-soroban-contract-id>
VITE_STELLAR_NETWORK=testnet
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Optional: Supabase for real-time chat
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 19 with Vite 8
- **Styling**: Plain CSS with CSS custom properties
- **Blockchain**: Stellar SDK v14 with Soroban integration
- **Wallet**: Freighter API v6
- **Storage**: IPFS for files, Supabase for chat (optional)
- **State**: React hooks with localStorage persistence

### Key Components
- **Pages**: Contract creation, dashboard, contract details
- **Components**: Action panels, chat interface, file uploaders
- **Hooks**: Wallet connection, chat management
- **Utils**: Stellar integration, contract state management

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ActionPanel.jsx  # Contract action buttons
│   ├── ContractCard.jsx # Contract list item
│   ├── ContractChat.jsx # Private chat interface
│   ├── ContractForm.jsx # Contract creation form
│   ├── FileUploader.jsx # IPFS file upload
│   ├── Navbar.jsx       # Navigation header
│   ├── TxModal.jsx      # Transaction status modal
│   └── WalletModal.jsx  # Wallet connection modal
├── pages/               # Page components
│   ├── Arbitration.jsx  # Arbitrator dashboard
│   ├── ContractDetail.jsx # Individual contract view
│   ├── CreateContract.jsx # Contract creation
│   ├── Dashboard.jsx    # User dashboard
│   └── Home.jsx         # Landing page
├── hooks/               # React hooks
│   ├── useChat.js       # Chat functionality
│   └── useWallet.js     # Wallet connection
├── utils/               # Utility functions
│   ├── contract.js      # Contract state management
│   ├── contractTemplates.js # Contract templates
│   └── stellar.js       # Blockchain integration
├── lib/                 # External integrations
│   └── supabase.js      # Supabase client
├── assets/              # Static assets
└── index.css            # Global styles
```

## 🔧 Key Features

### Smart Contract Integration
- **Soroban SDK**: Full integration with Stellar smart contracts
- **Freighter Wallet**: Seamless transaction signing
- **Error Handling**: User-friendly error messages with retry logic
- **State Sync**: Real-time contract state synchronization

### User Interface
- **Responsive Design**: Mobile-first approach with no horizontal scroll
- **Dark/Light Theme**: CSS custom properties for theming
- **Zero-Error UX**: Comprehensive input validation and error handling
- **Loading States**: Clear feedback for all async operations

### File Management
- **IPFS Upload**: Permanent file storage with content addressing
- **Drag & Drop**: Intuitive file upload interface
- **File Preview**: In-browser preview for common file types
- **Progress Tracking**: Upload progress with error recovery

### Chat System
- **Real-time Messaging**: WebSocket-based chat (with Supabase)
- **File Attachments**: Share files directly in chat
- **System Events**: Automated messages for contract state changes
- **Private Rooms**: Wallet-based access control

## 🎯 User Workflows

### Contract Creation
1. Connect Freighter wallet
2. Fill contract form with freelancer details
3. Deploy smart contract to Stellar
4. Deposit funds into escrow
5. Share contract with freelancer

### Work Submission
1. Freelancer uploads deliverables
2. Add links and references
3. Submit work via chat or actions panel
4. Client receives notification

### Payment Release
1. Client reviews deliverables
2. Approve work in chat or actions panel
3. Smart contract releases funds automatically
4. Transaction confirmed on blockchain

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test             # Run tests
```

### Code Style
- **ESLint**: Configured for React best practices
- **Prettier**: Automatic code formatting
- **CSS**: BEM methodology with custom properties
- **Components**: Functional components with hooks

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual Build
```bash
# Build for production
npm run build

# Serve static files
npx serve dist
```

### Environment Setup
1. Set environment variables in deployment platform
2. Ensure contract is deployed to target network
3. Configure CORS for API endpoints
4. Test wallet connectivity

## 🔐 Security Considerations

- **Wallet Security**: Never store private keys in frontend
- **Input Validation**: All user inputs validated client and server-side
- **XSS Protection**: Sanitized HTML rendering
- **HTTPS Only**: All network requests over secure connections
- **Content Security Policy**: Configured for production deployment

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Failed**
- Ensure Freighter extension is installed and unlocked
- Check network configuration (testnet vs mainnet)
- Verify account has sufficient XLM balance

**Contract Deployment Failed**
- Verify contract ID in `.env` file
- Check RPC endpoint connectivity
- Ensure account is funded on correct network

**File Upload Failed**
- Check IPFS gateway connectivity
- Verify file size limits
- Ensure browser supports required APIs

### Debug Mode
```bash
# Enable debug logging
VITE_DEBUG=true npm run dev
```

## 📄 License

MIT © 2026 TrustWork