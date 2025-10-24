# HALTT - Comprehensive Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Setup & Installation](#setup--installation)
4. [Architecture](#architecture)
5. [Security Features](#security-features)
6. [User Guide](#user-guide)
7. [Developer Guide](#developer-guide)
8. [Troubleshooting](#troubleshooting)

---

## Project Overview

**HALTT** is a comprehensive Solana wallet security platform that provides fraud detection, transaction monitoring, and wallet management capabilities.

### Tech Stack
- **Frontend**: React.js
- **Backend**: Node.js + Express (Proxy Server)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google Sign-In)
- **Blockchain**: Solana Web3.js
- **APIs**: ChainAbuse API for fraud detection

---

## Features

### 1. Wallet Management
- Connect multiple Solana wallets (Phantom, Solflare, Backpack)
- View balances across all connected wallets
- Real-time balance updates
- Multi-wallet support with persistent storage

### 2. Transaction Management
- Send SOL with fraud detection
- Automatic receipt generation
- Transaction history tracking
- Real-time transaction monitoring

### 3. Security Features
- **Fraud Detection**: ChainAbuse API integration
- **Blocklist**: Block suspicious addresses
- **Trusted Contacts**: Save frequently used addresses
- **Risk Assessment**: Automatic security checks before sending
- **Audit Logs**: Complete activity tracking

### 4. Additional Features
- QR Code generation for payments
- Transaction receipts with full details
- Manual fraud reporting
- Audit log viewing
- Network switching (mainnet/devnet)

---

## Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Solana wallet extension (Phantom/Solflare/Backpack)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd haltt-project
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Configure Firebase**
   - Create a Firebase project
   - Enable Authentication (Google Sign-In)
   - Enable Firestore Database
   - Copy your Firebase config to `src/firebase.js`

4. **Configure API Keys**
   - Get ChainAbuse API key
   - Update in `server/proxy.js`

5. **Deploy Firestore Rules**
   - Copy rules from Firestore Rules section
   - Deploy in Firebase Console

6. **Start the application**
   ```bash
   # Terminal 1 - Start proxy server
   cd server
   npm start

   # Terminal 2 - Start React app
   npm start
   ```

---

## Architecture

### Frontend Structure
```
src/
├── components/
│   ├── Dashboard.js          # Main dashboard
│   └── tabs/
│       ├── AuditLogs.js      # Audit log viewer
│       ├── Receipts.js       # Transaction receipts
│       ├── ManageBlocklist.js
│       ├── ManageTrustedContacts.js
│       ├── ExportBarcode.js  # QR code generator
│       └── ManualFraudReporting.js
├── services/
│   ├── walletService.js      # Wallet operations
│   ├── auditLogService.js    # Audit logging
│   ├── receiptService.js     # Receipt management
│   ├── blocklistService.js   # Blocklist operations
│   ├── trustedContactsService.js
│   └── fraudDetectionService.js
└── firebase.js               # Firebase configuration
```

### Backend Structure
```
server/
├── proxy.js                  # Express proxy server
└── package.json
```

### Firestore Collections
- **users**: User data, wallets, blocklist, trusted contacts
- **auditLogs**: Activity logs
- **receipts**: Transaction receipts
- **reports**: Fraud reports

---

## Security Features

### 1. Fraud Detection
- Automatic address checking via ChainAbuse API
- Risk assessment before transactions
- Real-time threat detection

### 2. Blocklist Management
- Block suspicious addresses
- Prevent transactions to blocked addresses
- Add/remove addresses with reasons
- Persistent storage in Firestore

### 3. Trusted Contacts
- Save frequently used addresses
- Quick send functionality
- Block/unblock from trusted list
- Name and notes for each contact

### 4. Audit Logs
- Track all wallet connections/disconnections
- Log all transactions
- Record security events
- Immutable log entries

### 5. Transaction Receipts
- Automatic receipt generation
- Complete transaction details
- Blockchain verification links
- Search and filter capabilities

---

## User Guide

### Connecting Wallets
1. Click "Add Wallet" button
2. Select your wallet (Phantom/Solflare/Backpack)
3. Approve connection in wallet extension
4. Wallet appears in dashboard

### Sending Transactions
1. Click "Send" button
2. Enter recipient address
3. System performs security checks:
   - Blocklist verification
   - Fraud detection
4. Select wallet and enter amount
5. Confirm transaction
6. Receipt automatically saved

### Managing Trusted Contacts
1. Click "Contacts" button in dashboard
2. Add new contact with name and address
3. Use "Send" button for quick transactions
4. Block/unblock as needed

### Viewing Receipts
1. Navigate to "Receipts" tab
2. View all transaction history
3. Search by signature, recipient, or wallet
4. Copy signature or view on blockchain explorer

### Managing Blocklist
1. Navigate to "Manage Blocklist" tab
2. Add addresses with optional reason
3. Remove addresses to unblock
4. Blocked addresses cannot receive funds

---

## Developer Guide

### Adding New Features

#### 1. Create Service File
```javascript
// src/services/yourService.js
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export const yourFunction = async (data) => {
  // Implementation
};
```

#### 2. Create Component
```javascript
// src/components/tabs/YourComponent.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../firebase';

const YourComponent = () => {
  // Implementation
};

export default YourComponent;
```

#### 3. Add to Dashboard
```javascript
// Import component
import YourComponent from './tabs/YourComponent';

// Add navigation item
// Add route rendering
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                            request.auth.token.email == userId;
    }
    
    // Audit Logs collection
    match /auditLogs/{logId} {
      allow read: if request.auth != null && 
                     request.auth.token.email == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.token.email == request.resource.data.userId;
      allow update, delete: if false;
    }
    
    // Receipts collection
    match /receipts/{receiptId} {
      allow read: if request.auth != null && 
                     request.auth.token.email == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.token.email == request.resource.data.userId;
      allow update, delete: if false;
    }
    
    // Fraud Reports collection
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.resource.data.reporters.size() == 1
        && request.auth.token.email in request.resource.data.reporters;
      allow update: if request.auth != null
        && request.auth.token.email in request.resource.data.reporters
        && !(request.auth.token.email in resource.data.reporters);
    }
    
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Environment Variables
Create `.env` file:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

---

## Troubleshooting

### Common Issues

#### 1. Wallet Connection Fails
- Ensure wallet extension is installed
- Check if wallet is unlocked
- Try refreshing the page
- Clear browser cache

#### 2. Transaction Fails
- Check wallet balance
- Verify network connection
- Ensure correct network (mainnet/devnet)
- Check RPC endpoint status

#### 3. Firestore Permission Denied
- Verify Firebase rules are deployed
- Check user authentication
- Ensure correct email in rules

#### 4. Proxy Server Not Running
- Navigate to server directory
- Run `npm install`
- Run `npm start`
- Check port 3001 is available

#### 5. Receipt Not Saving
- Check Firestore rules
- Verify user authentication
- Check browser console for errors
- Ensure network connectivity

### Debug Mode
Enable debug logging:
```javascript
// In Dashboard.js or any component
console.log('Debug info:', data);
```

### Network Issues
If RPC endpoints fail:
1. Check internet connection
2. Try different RPC endpoint
3. Switch to devnet for testing
4. Check Solana network status

---

## API Integration

### ChainAbuse API
Used for fraud detection and address verification.

**Endpoint**: `https://api.chainabuse.com/v0/reports`

**Usage**: Automatic checks before transactions

### Solana RPC
Multiple endpoints configured for reliability:
- Helius (Premium)
- QuickNode
- Public Solana RPC
- Serum RPC
- Ankr RPC

---

## Best Practices

### Security
- Never share private keys
- Always verify recipient addresses
- Check transaction details before confirming
- Use trusted contacts for frequent recipients
- Review audit logs regularly

### Performance
- Limit concurrent RPC calls
- Cache wallet balances
- Debounce search inputs
- Lazy load components

### Code Quality
- Follow React best practices
- Use TypeScript for type safety (optional)
- Write meaningful commit messages
- Document complex functions
- Handle errors gracefully

---

## Support & Contribution

### Reporting Issues
- Check existing issues first
- Provide detailed description
- Include error messages
- Share reproduction steps

### Contributing
- Fork the repository
- Create feature branch
- Make changes
- Submit pull request

---

## License
[Your License Here]

## Contact
[Your Contact Information]

---

**Last Updated**: October 2025
**Version**: 1.0.0
