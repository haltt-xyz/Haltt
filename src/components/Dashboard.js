import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, auth, signOut } from '../firebase';
import { LogOut, User, Mail, Home, Zap, Wallet, Plus, X, Send, Download, TrendingUp, History, AlertTriangle, Cloud, Users, Trash2, FileText, Receipt, Archive, QrCode, Shield, Flag, UserX, UsersRound, UserPlus, Menu, ChevronLeft, Copy, Check, ExternalLink, Clock, CheckCircle, XCircle, Link as LinkIcon, Search } from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { syncWalletsToFirestore, removeWalletFromUser, initializeUserDocument } from '../services/walletService';
import { logWalletConnection, logWalletDisconnection } from '../services/auditLogService';
import { testFirestoreConnection } from '../utils/testFirestore';
import QRCodeStyling from 'qr-code-styling';
import { assessWalletRisk } from '../services/fraudDetectionService';
import { isAddressBlocked, getBlocklistEntry } from '../services/blocklistService';
import { getTrustedContacts } from '../services/trustedContactsService';
import { saveReceipt } from '../services/receiptService';

// Import tab components
import AuditLogs from './tabs/AuditLogs';
import Receipts from './tabs/Receipts';
import StoreReceipts from './tabs/StoreReceipts';
import ExportBarcode from './tabs/ExportBarcode';
import ManualFraudReporting from './tabs/ManualFraudReporting';
import ManageBlocklist from './tabs/ManageBlocklist';
import ManageTrustedContacts from './tabs/ManageTrustedContacts';

// Wallet icon paths from public folder
const walletIconPaths = {
    Phantom: `${process.env.PUBLIC_URL}/phantom.png`,
    Solflare: `${process.env.PUBLIC_URL}/solflare.png`,
    Backpack: `${process.env.PUBLIC_URL}/backpack.png`,
    MetaMask: `${process.env.PUBLIC_URL}/metamask.png`,
};

const Dashboard = () => {
    const { user } = useAuth();
    
    // --- STATE ---
    const [network, setNetwork] = useState('mainnet-beta');
    const [activeTab, setActiveTab] = useState('balances');
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [selectedReceiveWallet, setSelectedReceiveWallet] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(null);
    const [activeView, setActiveView] = useState('dashboard'); // Track which view/tab is active
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
    const qrCodeRef = useRef(null);
    const qrCodeInstance = useRef(null);
    const [connectedWallets, setConnectedWallets] = useState([]);
    const [availableWallets, setAvailableWallets] = useState([]);
    const [totalBalanceUSD, setTotalBalanceUSD] = useState(0);
    const [walletBalances, setWalletBalances] = useState({}); 
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [solPrice, setSolPrice] = useState(0);
    const [loading, setLoading] = useState(false);
    const [profileImageError, setProfileImageError] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const [copiedSignature, setCopiedSignature] = useState(null);
    const [trustedContacts, setTrustedContacts] = useState([]);
    const [showContactsModal, setShowContactsModal] = useState(false);
    
    // --- SEND MODAL STATE ---
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendStep, setSendStep] = useState(1); // 1: Address, 2: Risk Check, 3: Amount/Token, 4: Confirm, 5: Success
    const [recipientAddress, setRecipientAddress] = useState('');
    const [riskAssessment, setRiskAssessment] = useState(null);
    const [checkingRisk, setCheckingRisk] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [selectedToken, setSelectedToken] = useState('SOL');
    const [selectedSendWallet, setSelectedSendWallet] = useState(null);
    const [sendingTransaction, setSendingTransaction] = useState(false);
    const [transactionSignature, setTransactionSignature] = useState(null);
    const [transactionError, setTransactionError] = useState(null);
    
    // --- RPC ENDPOINTS (Prioritize paid/premium endpoints) ---
    const rpcEndpoints = {
        'mainnet-beta': [
            'https://mainnet.helius-rpc.com/?api-key=277fd0d2-3b36-46a0-8ecc-24d7cac3a071', // Helius (PREMIUM - use first)
            'https://solitary-distinguished-uranium.solana-mainnet.quiknode.pro/QN_b089837dc0d445729831b789cc04a22c/', // QuickNode
            'https://api.mainnet-beta.solana.com', // Public Solana RPC (fallback)
            'https://solana-api.projectserum.com', // Serum RPC (fallback)
            'https://rpc.ankr.com/solana' // Ankr public RPC (fallback)
        ],
        'devnet': [
            'https://devnet.helius-rpc.com/?api-key=277fd0d2-3b36-46a0-8ecc-24d7cac3a071', // Helius Devnet
            'https://api.devnet.solana.com', // Public devnet (fallback)
            'https://rpc.ankr.com/solana_devnet' // Ankr devnet (fallback)
        ]
    };
    
    // --- AUTH HANDLER ---
    const handleSignOut = async () => {
      try {
        // Clear localStorage for this user
        if (user?.email) {
          localStorage.removeItem(`connectedWallets_${user.email}`);
        }
        await signOut(auth);
      } catch (error) {
        // Sign out error silenced
      }
    };

    // Function to test if image URL is accessible with different methods
    const testImageLoad = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        
        // Try without CORS first
        img.onload = () => resolve(true);
        img.onerror = () => {
          // If CORS fails, try with different crossOrigin settings
          const img2 = new Image();
          img2.crossOrigin = 'use-credentials';
          img2.onload = () => resolve(true);
          img2.onerror = () => {
            // Try with anonymous CORS
            const img3 = new Image();
            img3.crossOrigin = 'anonymous';
            img3.onload = () => resolve(true);
            img3.onerror = () => resolve(false);
            img3.src = url;
          };
          img2.src = url;
        };
        img.src = url;
      });
    };

    // Function to create a proxy URL for Google images
    const createProxyUrl = (googleUrl) => {
      // Try to modify the URL to remove size restrictions
      const modifiedUrl = googleUrl.replace(/=s\d+-c$/, '=s400-c');
      return modifiedUrl;
    };

    // Function to try different proxy services for Google images
    const tryProxyServices = (googleUrl) => {
      const proxies = [
        googleUrl, // Original URL
        googleUrl.replace(/=s\d+-c$/, '=s400-c'), // Modified size
        googleUrl.replace(/=s\d+-c$/, '=s200-c'), // Smaller size
        `https://images.weserv.nl/?url=${encodeURIComponent(googleUrl)}`, // Weserv proxy
        `https://cors-anywhere.herokuapp.com/${googleUrl}`, // CORS proxy
      ];
      return proxies;
    };

    // --- FETCH SOL PRICE ---
    const fetchSolPrice = async () => {
        if (network === 'devnet') {
            setSolPrice(0.00); 
            return;
        }
      try {
        console.log('Fetching SOL price from CoinGecko...');
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        console.log('CoinGecko response:', data);
        
        if (data?.solana?.usd) {
          setSolPrice(data.solana.usd);
          console.log('SOL Price set to:', data.solana.usd);
        } else {
          throw new Error('Invalid response from CoinGecko');
        }
      } catch (error) {
        console.error('CoinGecko API failed:', error);
        
        // Fallback to Binance API
        try {
          console.log('Trying fallback: Binance API...');
          const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
          const binanceData = await binanceResponse.json();
          console.log('Binance response:', binanceData);
          
          if (binanceData?.price) {
            const price = parseFloat(binanceData.price);
            setSolPrice(price);
            console.log('SOL Price set from Binance:', price);
          } else {
            throw new Error('Invalid response from Binance');
          }
        } catch (binanceError) {
          console.error('Binance API also failed:', binanceError);
          console.warn('Setting SOL price to 0 - all APIs failed');
          setSolPrice(0);
        }
      }
    };

    // --- FETCH BALANCE ---
    const fetchWalletBalance = async (publicKey) => {
      console.log(`Fetching balance for: ${publicKey.slice(0, 8)}...`);
      
      // FORCE USE PHANTOM'S CONNECTION - Create our own connection using Phantom's RPC
      if (window.solana && network === 'mainnet-beta') {
        try {
          console.log('Creating connection using Phantom provider...');
          // Create a connection using Phantom's internal RPC
          const connection = new Connection('https://api.mainnet-beta.solana.com', {
            commitment: 'confirmed',
            fetch: window.solana._rpcRequest ? window.solana._rpcRequest.bind(window.solana) : undefined
          });
          
          const balance = await connection.getBalance(new PublicKey(publicKey));
          const solBalance = balance / LAMPORTS_PER_SOL;
          console.log(`✅ Balance fetched via Phantom provider: ${solBalance} SOL (${balance} lamports)`);
          return solBalance;
        } catch (error) {
          console.log('Phantom provider method failed:', error.message);
        }
      }
      
      const endpoints = rpcEndpoints[network];
      console.log(`Using network: ${network}, endpoints:`, endpoints);
      
      for (let i = 0; i < endpoints.length; i++) {
        try {
          console.log(`Trying endpoint ${i + 1}/${endpoints.length}: ${endpoints[i]}`);
          const connection = new Connection(endpoints[i], 'confirmed'); 
          const balance = await connection.getBalance(new PublicKey(publicKey));
          const solBalance = balance / LAMPORTS_PER_SOL;
          console.log(`✅ Balance fetched: ${solBalance} SOL (${balance} lamports)`);
          return solBalance;
        } catch (error) {
          console.error(`❌ Endpoint ${i + 1} failed:`, error.message);
          if (i === endpoints.length - 1) {
            console.error('All endpoints failed, returning 0');
            return 0;
          }
        }
      }
      return 0;
    };

    // --- TRANSACTION FETCH AND PARSING ---
    const fetchRecentTransactions = async (publicKey) => {
        console.log(`🔍 Fetching transactions for: ${publicKey.slice(0, 8)}...`);
        
        if (connectedWallets.find(w => w.publicKey === publicKey)?.type !== 'solana') {
            console.log('Wallet is not Solana type, skipping');
            return [];
        }

        let signatureInfos = [];
        let connection = null;

        // Try using Phantom's connection first (same as balance fetching)
        if (window.solana && network === 'mainnet-beta') {
            try {
                console.log('🔮 Trying Phantom provider for transactions...');
                connection = new Connection('https://api.mainnet-beta.solana.com', {
                    commitment: 'finalized',
                    fetch: window.solana._rpcRequest ? window.solana._rpcRequest.bind(window.solana) : undefined
                });
                
                signatureInfos = await connection.getSignaturesForAddress(
                    new PublicKey(publicKey),
                    { limit: 20, commitment: 'finalized' }
                );
                
                console.log(`✅ Found ${signatureInfos.length} transactions via Phantom provider`);
                
                if (signatureInfos && signatureInfos.length > 0) {
                    // Successfully got transactions, continue to parse them
                } else {
                    console.log('⚠️ No transactions found for this wallet');
                    return [];
                }
            } catch (error) {
                console.log('Phantom provider failed for transactions:', error.message);
                console.log('Falling back to public RPCs...');
                connection = null;
            }
        }

        // Fallback to public RPCs if Phantom method didn't work
        if (!connection || signatureInfos.length === 0) {
            for (let i = 0; i < rpcEndpoints[network].length; i++) {
                const endpoint = rpcEndpoints[network][i];
                try {
                    console.log(`📡 Trying RPC endpoint ${i + 1}/${rpcEndpoints[network].length} for transactions: ${endpoint.slice(0, 50)}...`);
                    connection = new Connection(endpoint, 'finalized'); 
                    signatureInfos = await connection.getSignaturesForAddress(
                        new PublicKey(publicKey),
                        { limit: 20, commitment: 'finalized' }
                    );
                    
                    console.log(`Found ${signatureInfos.length} transaction signatures`);
                    
                    if (signatureInfos && signatureInfos.length > 0) {
                        console.log(`✅ Successfully fetched ${signatureInfos.length} transactions from endpoint ${i + 1}`);
                        break;
                    } else if (signatureInfos.length === 0) {
                        console.log('⚠️ No transactions found for this wallet');
                        return [];
                    }
                } catch (error) {
                    console.error(`❌ RPC endpoint ${i + 1} failed for transactions:`, error.message);
                    if (i === rpcEndpoints[network].length - 1) {
                        console.error('All RPC endpoints failed for transactions.');
                        return [];
                    }
                }
            }
        }

        if (signatureInfos.length === 0 || !connection) return [];
        
        // Map signature info to get basic data
        const signatures = signatureInfos.map(info => info.signature);
        
        try {
            console.log(`📥 Fetching full transaction data for ${signatures.length} signatures...`);
            const transactions = await connection.getParsedTransactions(
                signatures, 
                { maxSupportedTransactionVersion: 0, commitment: 'finalized' }
            );
            
            console.log(`✅ Successfully parsed ${transactions.filter(t => t !== null).length} transactions`);

            return transactions.map((tx, index) => {
                const sigInfo = signatureInfos[index];
                const txSignature = sigInfo.signature;

                if (!tx || !tx.meta) {
                    return {
                        signature: txSignature, 
                        slot: sigInfo.slot,
                        blockTime: sigInfo.blockTime, 
                        amount: 0,
                        direction: 'Unknown', 
                        success: !sigInfo.err, 
                        publicKey: publicKey,
                        type: 'RPC Data Gap'
                    };
                }
                
                let amount = 0;
                let direction = 'unknown';
                let type = 'Program Call';
                const isSuccessful = !tx.meta.err;

                const transferInstruction = tx.transaction.message.instructions.find(ix => 
                    ix.programId.toBase58() === SystemProgram.programId.toBase58() && 
                    ix.parsed && ix.parsed.type === 'transfer'
                );

                if (transferInstruction) {
                    const { info } = transferInstruction.parsed;
                    const sender = info.source;
                    const receiver = info.destination;
                    amount = info.lamports / LAMPORTS_PER_SOL;
                    type = 'SOL Transfer';

                    if (sender === publicKey) {
                        direction = 'sent';
                    } else if (receiver === publicKey) {
                        direction = 'received';
                    }
                } else {
                     const accountIndex = tx.transaction.message.accountKeys.findIndex(key => key.pubkey.toBase58() === publicKey);
                     
                     if (accountIndex !== -1 && tx.meta.postBalances[accountIndex] !== tx.meta.preBalances[accountIndex]) {
                        const lamportChange = tx.meta.postBalances[accountIndex] - tx.meta.preBalances[accountIndex];
                        amount = Math.abs(lamportChange) / LAMPORTS_PER_SOL;
                        direction = lamportChange > 0 ? 'received' : 'sent';
                        
                        const firstInstructionProgramId = tx.transaction.message.instructions[0]?.programId.toBase58();
                        
                        if (firstInstructionProgramId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                            type = 'Token Operation';
                        } else if (firstInstructionProgramId !== SystemProgram.programId.toBase58()) {
                            type = 'Program Interaction';
                        }
                     }
                }

                return {
                    signature: txSignature, slot: tx.slot, blockTime: tx.blockTime, amount: amount,
                    direction: direction, success: isSuccessful, publicKey: publicKey, type: type 
                };
            });

        } catch (error) {
            return [];
        }
    };

    // --- UPDATE CALLERS (useCallback) ---
    const updateWalletBalances = useCallback(async () => {
      if (connectedWallets.length === 0) return;
      
      console.log('=== Updating Wallet Balances ===');
      console.log('Current SOL Price:', solPrice);
      console.log('Network:', network);
      
      const newBalances = {};
      let totalSOL = 0;
      
      for (const wallet of connectedWallets) {
        const uniqueKey = wallet.publicKey || wallet.address;
        
        if (wallet.type === 'solana' && wallet.publicKey) {
          const balance = await fetchWalletBalance(wallet.publicKey);
          console.log(`Wallet ${wallet.name} (${uniqueKey.slice(0, 8)}...): ${balance} SOL`);
          newBalances[uniqueKey] = balance;
          totalSOL += balance;
        } else if (wallet.type === 'ethereum' && wallet.address) {
            newBalances[uniqueKey] = 0;
        }
      }
      
      console.log('Total SOL:', totalSOL);
      const calculatedUSD = network === 'mainnet-beta' ? totalSOL * solPrice : 0;
      console.log('Calculated USD:', calculatedUSD);
      
      setWalletBalances(newBalances);
      setTotalBalanceUSD(calculatedUSD);
    }, [connectedWallets, solPrice, network]);

    const updateRecentTransactions = useCallback(async () => {
      if (connectedWallets.length === 0) return;
      
      setLoading(true);
      const allTransactions = [];
      
      for (const wallet of connectedWallets) {
        if (wallet.type === 'solana' && wallet.publicKey) {
          const transactions = await fetchRecentTransactions(wallet.publicKey);
          allTransactions.push(...transactions);
        }
      }
      
      allTransactions.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));
      setRecentTransactions(allTransactions.slice(0, 50)); 
      setLoading(false);
    }, [connectedWallets, network]);

    // --- WALLET CONNECTION LOGIC ---
    const connectWallet = async (wallet) => {
      console.log('🔌 Connecting wallet:', wallet.name);
      try {
        if (wallet.type === 'solana') {
          // Solflare and Phantom use .connect()
          const response = await wallet.provider.connect();
          console.log('Wallet response:', response);
          
          let publicKeyString = response?.publicKey?.toString();
          
          // Fallback check for Solflare, which sometimes requires manual publicKey access
          if (!publicKeyString && wallet.name === 'Solflare' && window.solflare?.publicKey) {
              publicKeyString = window.solflare.publicKey.toString();
          }

          if (publicKeyString) {
          console.log('✅ Wallet connected with publicKey:', publicKeyString);
          const newWallet = {
            ...wallet,
                publicKey: publicKeyString,
            connected: true
          };
              if (!connectedWallets.some(w => w.publicKey === newWallet.publicKey)) {
          console.log('Adding wallet to connectedWallets');
          setConnectedWallets(prev => [...prev, newWallet]);
          
          // Sync to Firestore automatically
          if (user?.email) {
            try {
              await syncWalletsToFirestore(user.email, [newWallet]);
              // Log wallet connection to audit logs
              await logWalletConnection(user.email, newWallet);
            } catch (error) {
              // Firestore sync error silenced
            }
          }
              }
          }

        } else if (wallet.type === 'ethereum') {
          const accounts = await wallet.provider.request({ method: 'eth_requestAccounts' });
          const newWallet = {
            ...wallet,
            address: accounts[0],
                connected: true,
                publicKey: accounts[0]
          };
            if (!connectedWallets.some(w => w.address === newWallet.address)) {
          setConnectedWallets(prev => [...prev, newWallet]);
          
          // Sync to Firestore automatically
          if (user?.email) {
            try {
              await syncWalletsToFirestore(user.email, [newWallet]);
              // Log wallet connection to audit logs
              await logWalletConnection(user.email, newWallet);
            } catch (error) {
              // Firestore sync error silenced
            }
          }
            }
        }
      } catch (error) {
        // Wallet connection error silenced
      }
    };

    const disconnectWallet = async (uniqueKey) => {
      // Find wallet info before removing
      const walletToRemove = connectedWallets.find(w => (w.publicKey || w.address) === uniqueKey);
      
      const updatedWallets = connectedWallets.filter(w => (w.publicKey || w.address) !== uniqueKey);
      setConnectedWallets(updatedWallets);
      
      // Update localStorage
      if (user?.email) {
        if (updatedWallets.length === 0) {
          localStorage.removeItem(`connectedWallets_${user.email}`);
        } else {
          const walletData = updatedWallets.map(wallet => ({
            name: wallet.name,
            type: wallet.type,
            publicKey: wallet.publicKey,
            address: wallet.address,
            connected: wallet.connected
          }));
          localStorage.setItem(`connectedWallets_${user.email}`, JSON.stringify(walletData));
        }
      }
      
      // Remove from Firestore and log disconnection
      if (user?.email && walletToRemove) {
        try {
          await removeWalletFromUser(user.email, uniqueKey);
          // Log wallet disconnection to audit logs
          await logWalletDisconnection(
            user.email,
            uniqueKey,
            walletToRemove.name,
            walletToRemove.type
          );
        } catch (error) {
          // Firestore removal error silenced
        }
      }
    };

    // --- SEND MODAL HANDLERS ---
    const resetSendModal = () => {
      setSendStep(1);
      setRecipientAddress('');
      setRiskAssessment(null);
      setCheckingRisk(false);
      setSendAmount('');
      setSelectedToken('SOL');
      setSelectedSendWallet(null);
      setSendingTransaction(false);
      setTransactionSignature(null);
      setTransactionError(null);
    };

    // Handler for sending to trusted contact
    const handleSendToContact = (contact) => {
      // Pre-fill recipient address and open send modal
      const safeAddress = typeof contact?.address === 'string' ? contact.address.trim() : String(contact?.address || '').trim();
      setRecipientAddress(safeAddress);
      setShowSendModal(true);
      setSendStep(1);
      // Automatically trigger risk check with the contact address
      setTimeout(() => {
        handleCheckRecipient(safeAddress);
      }, 100);
    };

    // Normalize a user-provided address or Solana Pay URI into a base58 address
    const normalizeRecipientAddress = (input) => {
      const raw = String(input || '').trim();
      if (!raw) return '';
      // If it's a Solana Pay URI like solana:<address>?amount=...
      if (raw.toLowerCase().startsWith('solana:')) {
        try {
          const uri = new URL(raw.replace('solana:', 'https://solana.pay/'));
          // Pathname will be "/<address>"
          const path = uri.pathname || '';
          const addr = path.startsWith('/') ? path.slice(1) : path;
          return addr || '';
        } catch (_) {
          // Fallback simple parse if URL fails
          const noScheme = raw.slice(7); // remove 'solana:'
          const qIndex = noScheme.indexOf('?');
          return (qIndex >= 0 ? noScheme.slice(0, qIndex) : noScheme).trim();
        }
      }
      // If it's a full URL containing the address as last segment
      if (/^https?:\/\//i.test(raw)) {
        try {
          const u = new URL(raw);
          const segs = u.pathname.split('/').filter(Boolean);
          if (segs.length > 0) return segs[segs.length - 1];
        } catch (_) { /* ignore */ }
      }
      // Otherwise, attempt to sanitize to base58-only characters
      const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const sanitized = Array.from(raw).filter(ch => base58.includes(ch)).join('');
      return sanitized;
    };

    const handleCheckRecipient = async (addressToCheck = null) => {
      // Normalize provided address or fall back to state
      let raw = addressToCheck ?? recipientAddress;
      // If a click event was passed accidentally, ignore it and use state
      if (raw && (raw.preventDefault || raw.nativeEvent || (raw.target && raw.currentTarget))) {
        raw = recipientAddress;
      }
      if (raw && typeof raw === 'object' && 'address' in raw) {
        raw = raw.address;
      }
      const addressToValidate = normalizeRecipientAddress(raw);

      if (!addressToValidate || addressToValidate.length === 0) {
        setTransactionError('Please enter a valid Solana address');
        return;
      }

      // Validate Solana address format (basic check)
      try {
        new PublicKey(addressToValidate);
      } catch (error) {
        setTransactionError('Invalid Solana address format');
        return;
      }

      // Persist normalized address in state so subsequent steps use the correct value
      if (addressToValidate !== recipientAddress) {
        setRecipientAddress(addressToValidate);
      }

      setCheckingRisk(true);
      setTransactionError(null);

      try {
        // STEP 1: Check if address is in user's blocklist
        const blocked = await isAddressBlocked(user.email, addressToValidate);
        
        if (blocked) {
          const blocklistEntry = await getBlocklistEntry(user.email, addressToValidate);
          setRiskAssessment({
            safe: false,
            riskLevel: 'BLOCKED',
            riskScore: 100,
            reasons: ['This address is in your blocklist'],
            blocklistEntry: blocklistEntry,
            isBlocked: true
          });
          setSendStep(2);
          setCheckingRisk(false);
          return;
        }

        // STEP 2: Perform fraud risk assessment
        const assessment = await assessWalletRisk(addressToValidate);
        setRiskAssessment({
          ...assessment,
          isBlocked: false
        });
        
        if (assessment.safe) {
          setSendStep(2); // Move to success/safe step
        } else {
          setSendStep(2); // Show risk warning
        }
      } catch (error) {
        console.error('Risk assessment failed:', error);
        setTransactionError('Failed to assess wallet risk. Please try again.');
      } finally {
        setCheckingRisk(false);
      }
    };

    const handleProceedToTransaction = () => {
      if (riskAssessment && riskAssessment.safe) {
        setSendStep(3); // Move to amount/token selection
      }
    };

    const handleSendTransaction = async () => {
      if (!selectedSendWallet || !sendAmount || parseFloat(sendAmount) <= 0) {
        setTransactionError('Please fill in all required fields');
        return;
      }

      const amount = parseFloat(sendAmount);
      const walletBalance = walletBalances[selectedSendWallet.publicKey] || 0;

      if (amount > walletBalance) {
        setTransactionError(`Insufficient balance. Available: ${walletBalance.toFixed(5)} SOL`);
        return;
      }

      setSendingTransaction(true);
      setTransactionError(null);

      try {
        // Get the wallet provider
        const wallet = availableWallets.find(w => w.name === selectedSendWallet.name);
        
        if (!wallet || !wallet.provider) {
          throw new Error('Wallet provider not found');
        }

        // Ensure wallet is connected
        if (!wallet.provider.isConnected) {
          await wallet.provider.connect();
        }

        // Try multiple RPC endpoints until one works
        let connection = null;
        let blockhash = null;
        
        for (let i = 0; i < rpcEndpoints[network].length; i++) {
          try {
            console.log(`🔄 Trying RPC endpoint ${i + 1}/${rpcEndpoints[network].length}: ${rpcEndpoints[network][i].slice(0, 50)}...`);
            connection = new Connection(rpcEndpoints[network][i], 'confirmed');
            const result = await connection.getLatestBlockhash('confirmed');
            blockhash = result.blockhash;
            console.log('✅ Successfully got blockhash from RPC endpoint', i + 1);
            break;
          } catch (error) {
            console.error(`❌ RPC endpoint ${i + 1} failed:`, error.message);
            if (i === rpcEndpoints[network].length - 1) {
              throw new Error('All RPC endpoints failed. Please check your internet connection or try again later.');
            }
          }
        }

        if (!connection || !blockhash) {
          throw new Error('Failed to connect to Solana network. Please try again.');
        }

        // Create transfer instruction
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(selectedSendWallet.publicKey),
          toPubkey: new PublicKey(recipientAddress),
          lamports: amount * LAMPORTS_PER_SOL
        });

        // Create transaction
        const transaction = new Transaction().add(transferInstruction);
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(selectedSendWallet.publicKey);

        // Sign and send transaction using wallet provider
        const { signature } = await wallet.provider.signAndSendTransaction(transaction);

        console.log('Transaction sent:', signature);
        setTransactionSignature(signature);
        setSendStep(4); // Move to success step

        // Save receipt to Firestore
        try {
          await saveReceipt({
            userId: user.email,
            transactionSignature: signature,
            walletAddress: selectedSendWallet.publicKey,
            walletName: selectedSendWallet.name,
            recipientAddress: recipientAddress,
            amount: amount,
            token: selectedToken,
            status: 'success',
            network: network,
            type: 'send'
          });
          console.log('✅ Receipt saved successfully');
        } catch (receiptError) {
          console.error('Failed to save receipt:', receiptError);
          // Don't fail the transaction if receipt saving fails
        }

        // Refresh balances after transaction
        setTimeout(() => {
          updateWalletBalances();
          updateRecentTransactions();
        }, 2000);

      } catch (error) {
        console.error('Transaction failed:', error);
        setTransactionError(error.message || 'Transaction failed. Please try again.');
      } finally {
        setSendingTransaction(false);
      }
    };
    
    // --- FIXED WALLET DETECTION LOGIC ---
    const detectWallets = useCallback(() => {
        const wallets = [];
        
        // 1. Phantom
        if (window.solana && window.solana.isPhantom) {
          wallets.push({ name: 'Phantom', iconPath: walletIconPaths.Phantom, provider: window.solana, type: 'solana' });
        }
        
        // 2. Solflare (Robust check for window.solflare)
        if (window.solflare) {
            wallets.push({ name: 'Solflare', iconPath: walletIconPaths.Solflare, provider: window.solflare, type: 'solana' });
        }

        // 3. Backpack (Checking for both structures)
        if (window.backpack && (window.backpack.isBackpack || window.backpack.solana)) {
            const provider = window.backpack.solana || window.backpack;
            wallets.push({ name: 'Backpack', iconPath: walletIconPaths.Backpack, provider: provider, type: 'solana' });
        }
        
        // 4. MetaMask (Ethereum)
        if (window.ethereum && window.ethereum.isMetaMask) {
           wallets.push({ name: 'MetaMask', iconPath: walletIconPaths.MetaMask, provider: window.ethereum, type: 'ethereum' });
        }
        
        setAvailableWallets(wallets);
    }, []);
    
    // --- Effect for Wallet Detection with Delay ---
    useEffect(() => {
        const timeout = setTimeout(() => {
            detectWallets();
        }, 500);

        window.addEventListener('load', detectWallets);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('load', detectWallets);
        };
    }, [detectWallets]);
    
    // --- DATA FETCH EFFECTS ---
    useEffect(() => {
      // Fetch SOL price when network changes
      fetchSolPrice();
      
      // Reset balances when network changes
      setTotalBalanceUSD(0);
      setWalletBalances({});
      setRecentTransactions([]);
    }, [network]);

    // Initialize user document in Firestore when user signs in
    useEffect(() => {
      if (user?.email) {
        initializeUserDocument(user.email)
          .then(() => {
            // User document initialized
          })
          .catch(error => {
            // Initialization error silenced
          });
      }
    }, [user]);

    // Load trusted contacts when user signs in
    useEffect(() => {
      const loadContacts = async () => {
        if (user?.email) {
          try {
            const contacts = await getTrustedContacts(user.email);
            setTrustedContacts(contacts);
          } catch (error) {
            console.error('Error loading trusted contacts:', error);
          }
        }
      };
      loadContacts();
    }, [user]);

    // Save connected wallets to localStorage whenever they change
    useEffect(() => {
      if (user?.email && connectedWallets.length > 0) {
        const walletData = connectedWallets.map(wallet => ({
          name: wallet.name,
          type: wallet.type,
          publicKey: wallet.publicKey,
          address: wallet.address,
          connected: wallet.connected
        }));
        localStorage.setItem(`connectedWallets_${user.email}`, JSON.stringify(walletData));
      }
    }, [connectedWallets, user?.email]);

    // Restore connected wallets from localStorage on mount
    useEffect(() => {
      if (user?.email) {
        console.log('📂 Restoring wallets from localStorage for:', user.email);
        const savedWallets = localStorage.getItem(`connectedWallets_${user.email}`);
        if (savedWallets) {
          try {
            const walletData = JSON.parse(savedWallets);
            console.log('Restored wallet data:', walletData);
            if (walletData && walletData.length > 0) {
              setConnectedWallets(walletData);
              console.log('✅ Restored', walletData.length, 'wallet(s)');
            }
          } catch (error) {
            console.error('Failed to parse saved wallets:', error);
          }
        } else {
          console.log('No saved wallets found');
        }
      }
    }, [user?.email]);

    // Reset profile image error when user changes and test image load
    useEffect(() => {
      setProfileImageError(false);
      setProfileImageUrl(null);
      if (user?.photoURL) {
        const proxyUrls = tryProxyServices(user.photoURL);
        
        // Try each proxy URL in sequence
        const tryNextUrl = async (index) => {
          if (index >= proxyUrls.length) {
            setProfileImageError(true);
            return;
          }
          
          const url = proxyUrls[index];
          const canLoad = await testImageLoad(url);
          
          if (canLoad) {
            setProfileImageUrl(url);
          } else {
            tryNextUrl(index + 1);
          }
        };
        
        tryNextUrl(0);
      }
    }, [user]);

    useEffect(() => {
      if (connectedWallets.length > 0 && (solPrice > 0 || network === 'devnet')) {
        console.log('Triggering balance update - solPrice changed to:', solPrice);
        updateWalletBalances();
        updateRecentTransactions();
      }
    }, [solPrice, connectedWallets.length, network, updateWalletBalances, updateRecentTransactions]);

    useEffect(() => {
      if (activeTab === 'transactions') {
        updateRecentTransactions();
      }
    }, [activeTab, updateRecentTransactions]);

    useEffect(() => {
      const interval = setInterval(() => {
        if (connectedWallets.length > 0) {
          updateWalletBalances();
          updateRecentTransactions();
        }
        fetchSolPrice(); 
      }, 60000); // Refresh every 60 seconds to avoid rate limits 

      return () => clearInterval(interval);
    }, [connectedWallets, network, updateWalletBalances, updateRecentTransactions]);

    // Generate QR code when wallet is selected
    useEffect(() => {
      if (selectedReceiveWallet && qrCodeRef.current) {
        const address = selectedReceiveWallet.publicKey || selectedReceiveWallet.address;
        
        // Clear previous QR code
        qrCodeRef.current.innerHTML = '';

        // Create QR code
        qrCodeInstance.current = new QRCodeStyling({
          width: 280,
          height: 280,
          data: address,
          margin: 10,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'H'
          },
          dotsOptions: {
            type: 'square',
            color: '#06b6d4'
          },
          backgroundOptions: {
            color: '#ffffff'
          },
          cornersSquareOptions: {
            type: 'square',
            color: '#06b6d4'
          },
          cornersDotOptions: {
            type: 'square',
            color: '#06b6d4'
          }
        });

        qrCodeInstance.current.append(qrCodeRef.current);
      }
    }, [selectedReceiveWallet]);
  
    if (!user) {
      return null;
    }
 
    // --- UI COMPONENTS ---
    
    // Wallet Card Component 
    const WalletCard = ({ wallet }) => {
      const uniqueKey = wallet.publicKey || wallet.address;
      const balance = walletBalances[uniqueKey] || 0;
      const usdValue = balance * solPrice;
      
      // Get wallet icon or use fallback
      const walletIcon = walletIconPaths[wallet.name];
  
    return (
        <div className="flex items-center justify-between p-4 bg-gray-800/70 backdrop-blur-sm border-b border-gray-700 hover:bg-gray-800 transition duration-300 group">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border border-cyan-700/50 p-1.5">
                    {walletIcon ? (
                        <img src={walletIcon} alt={wallet.name} className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-full h-full rounded-md bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {wallet.name?.charAt(0) || 'W'}
                        </div>
                    )}
                </div>
                <div>
                    <p className="font-semibold text-white text-lg">{wallet.name}</p>
                    <p className="text-xs text-gray-400 font-mono">
                         {uniqueKey ? `${uniqueKey.slice(0, 4)}...${uniqueKey.slice(-4)}` : 'Disconnected'}
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="font-bold text-xl text-white font-mono">
                        {wallet.type === 'ethereum' ? 'N/A' : `${balance.toFixed(5)} SOL`}
                    </p>
                    {wallet.type === 'solana' && network !== 'devnet' && (
                        <p className="text-xs text-cyan-400 font-mono">${usdValue.toFixed(4)}</p>
                    )}
                </div>
                <button
                    onClick={() => disconnectWallet(uniqueKey)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove Wallet"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
      );
    };

    // Copy signature to clipboard
    const copySignature = async (signature) => {
        try {
            await navigator.clipboard.writeText(signature);
            setCopiedSignature(signature);
            setTimeout(() => setCopiedSignature(null), 2000);
        } catch (err) {
            console.error('Failed to copy signature:', err);
        }
    };

    // Format timestamp for transactions
    const formatTimestamp = (blockTime) => {
        if (!blockTime) return 'N/A';
        const date = new Date(blockTime * 1000);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Transaction Row Component - Enhanced
    const TransactionRow = ({ tx }) => (
        <div className="p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800 last:border-b-0">
            <div className="flex flex-col space-y-3">
                {/* Top Row: Status Badge and Timestamp */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {tx.success ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-900/30 text-green-400 border border-green-700/50">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Success
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-900/30 text-red-400 border border-red-700/50">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                            </span>
                        )}
                        <span className="text-gray-400 text-sm">{tx.type}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimestamp(tx.blockTime)}</span>
                    </div>
                </div>

                {/* Middle Row: Signature with Copy */}
                <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-800/70 rounded-lg px-3 py-2 border border-gray-700">
                        <div className="flex items-center justify-between">
                            <p className="text-white font-mono text-sm truncate mr-2">
                                {tx.signature}
                            </p>
                            <button
                                onClick={() => copySignature(tx.signature)}
                                className="flex-shrink-0 p-1.5 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                                title="Copy signature"
                            >
                                {copiedSignature === tx.signature ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Amount, Slot, and Explorer Link */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div>
                            <p className={`font-bold text-sm font-mono ${
                                !tx.success ? 'text-gray-500' :
                                tx.direction === 'sent' ? 'text-red-400' : 
                                tx.direction === 'received' ? 'text-green-400' : 'text-cyan-400'
                            }`}>
                                {tx.success && tx.amount > 0 
                                    ? `${tx.direction === 'sent' ? '-' : '+'}${tx.amount.toFixed(4)} SOL` 
                                    : (tx.success ? 'No SOL Change' : 'Failed')}
                            </p>
                        </div>
                        <div className="text-sm text-gray-400">
                            Slot: <span className="text-gray-300 font-mono">{tx.slot?.toLocaleString()}</span>
                        </div>
                    </div>
                    <a
                        href={`https://explorer.solana.com/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
                    >
                        <span>View on Explorer</span>
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    );
    
    // --- MAIN RENDER ---
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex">
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-cyan-600 text-white rounded-lg shadow-lg hover:bg-cyan-500 transition-all cursor-pointer"
        >
          {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Left Sidebar */}
        <div className={`
          fixed lg:sticky top-0 h-screen z-40 lg:z-20
          bg-gray-950 shadow-2xl border-r border-gray-800 
          flex flex-col p-4
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64 lg:w-64
        `}>
          
          {/* Header - Premium Branding */}
          <div className="pb-6 border-b border-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 tracking-tight premium-heading">
                    HALTT
                  </h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium -mt-1">Security Platform</p>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 mt-6 space-y-6 overflow-y-auto pr-2" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(21, 94, 117, 0.3) transparent'
          }}>
            
            {/* Dashboard */}
            <div 
              onClick={() => {
                setActiveView('dashboard');
                setSidebarOpen(false);
              }}
              className={`flex items-center px-4 py-3 rounded-lg font-semibold transition-all cursor-pointer ${
                activeView === 'dashboard' 
                  ? 'bg-cyan-900/40 text-cyan-400' 
                  : 'text-gray-400 hover:bg-cyan-900/20'
              }`}
            >
              <Home className="w-5 h-5 mr-3" />
              <span>Dashboard</span>
            </div>

            {/* Quick Actions Category */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-4">Quick Actions</h3>
              
              {/* QR Codes - FIRST */}
              <div 
                onClick={() => {
                  setActiveView('exportBarcode');
                  setSidebarOpen(false);
                }}
                className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeView === 'exportBarcode' 
                    ? 'bg-cyan-900/40 text-cyan-400' 
                    : 'text-gray-400 hover:bg-cyan-900/20'
                }`}
              >
                <QrCode className="w-4 h-4 mr-3" />
                <span>QR Codes</span>
              </div>
              
              {/* Receipts - 3rd */}
              <div 
                onClick={() => {
                  setActiveView('receipts');
                  setSidebarOpen(false);
                }}
                className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeView === 'receipts' 
                    ? 'bg-cyan-900/40 text-cyan-400' 
                    : 'text-gray-400 hover:bg-cyan-900/20'
                }`}
              >
                <Receipt className="w-4 h-4 mr-3" />
                <span>Receipts</span>
              </div>
              
              {/* Audit Logs - 4th */}
              <div 
                onClick={() => {
                  setActiveView('auditLogs');
                  setSidebarOpen(false);
                }}
                className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeView === 'auditLogs' 
                    ? 'bg-cyan-900/40 text-cyan-400' 
                    : 'text-gray-400 hover:bg-cyan-900/20'
                }`}
              >
                <FileText className="w-4 h-4 mr-3" />
                <span>Audit Logs</span>
              </div>
            </div>

            {/* Safety Center Category */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mt-4">Safety Center</h3>
              
              <div 
                onClick={() => {
                  setActiveView('manualFraudReporting');
                  setSidebarOpen(false);
                }}
                className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeView === 'manualFraudReporting' 
                    ? 'bg-cyan-900/40 text-cyan-400' 
                    : 'text-gray-400 hover:bg-cyan-900/20'
                }`}
              >
                <Flag className="w-4 h-4 mr-3" />
                <span>Manual Fraud Reporting</span>
              </div>
              
              <div 
                onClick={() => {
                  setActiveView('manageBlocklist');
                  setSidebarOpen(false);
                }}
                className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeView === 'manageBlocklist' 
                    ? 'bg-cyan-900/40 text-cyan-400' 
                    : 'text-gray-400 hover:bg-cyan-900/20'
                }`}
              >
                <UserX className="w-4 h-4 mr-3" />
                <span>Manage Blocklist</span>
              </div>
              
              <div 
                onClick={() => {
                  setActiveView('manageTrustedContacts');
                  setSidebarOpen(false);
                }}
                className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeView === 'manageTrustedContacts' 
                    ? 'bg-cyan-900/40 text-cyan-400' 
                    : 'text-gray-400 hover:bg-cyan-900/20'
                }`}
              >
                <UsersRound className="w-4 h-4 mr-3" />
                <span>Manage Trusted Contacts</span>
              </div>
            </div>
          </div>

          {/* Footer (User Profile & Network Selector) */}
          <div className="pt-6 border-t border-gray-800">
            
            {/* Google Profile Section (MATCHING PROVIDED IMAGE) */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">GOOGLE PROFILE</h3>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-xl">
                <div className="flex items-center space-x-3 mb-3">
                  {/* Profile Picture / Placeholder */}
                    <div className="relative">
                    {profileImageUrl && !profileImageError ? (
                      <img 
                        src={profileImageUrl} 
                        alt="Profile" 
                        className="w-12 h-12 rounded-full object-cover shadow-lg border border-red-500"
                        onError={(e) => {
                          setProfileImageError(true);
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white text-xl font-bold border border-red-500">
                        {(user.displayName ? user.displayName[0].toUpperCase() : 'U')}
                      </div>
                    )}
                    </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.displayName || 'Google User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {user.email}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center px-3 py-2 text-xs text-red-400 border border-red-500 rounded-lg hover:bg-red-500/10 hover:border-red-400 transition-all duration-300 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
            
             {/* Network Selector (Moved after Google Profile) */}
            <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full bg-cyan-900/50 text-cyan-400 text-base p-2 rounded-md border border-cyan-700/50 cursor-pointer focus:ring-cyan-500 focus:border-cyan-500"
            >
                <option value="mainnet-beta">Mainnet Beta</option>
                <option value="devnet">Devnet (Testing)</option>
            </select>
          </div>
        </div>

        {/* Main Content Area - Glassmorphism */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto lg:ml-0">

            {/* Render content based on active view */}
            {activeView !== 'dashboard' ? (
              // Render tab components
              <div key={activeView} className="tab-fade">
                {activeView === 'auditLogs' && <AuditLogs />}
                {activeView === 'receipts' && <Receipts />}
                {activeView === 'storeReceipts' && <StoreReceipts />}
                {activeView === 'exportBarcode' && <ExportBarcode connectedWallets={connectedWallets} />}
                {activeView === 'manualFraudReporting' && <ManualFraudReporting />}
                {activeView === 'manageBlocklist' && <ManageBlocklist />}
                {activeView === 'manageTrustedContacts' && <ManageTrustedContacts onSendToContact={handleSendToContact} />}
              </div>
            ) : connectedWallets.length === 0 ? (
                // --- Empty State ---
                <div className="flex items-center justify-center min-h-[80vh] bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-cyan-900/30">
                    <div className="text-center p-10">
                        <Wallet className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallets</h2>
                        <p className="text-gray-400 mb-8 max-w-sm">Connect your Phantom, Solflare, or Backpack wallets to begin monitoring your Solana assets.</p>
                <button
                  onClick={() => setShowWalletModal(true)}
                            className="bg-cyan-600 text-white px-8 py-3 rounded-lg font-semibold shadow-cyan hover:bg-cyan-500 transition-all cursor-pointer"
                >
                            <Plus className="w-5 h-5 mr-2 inline-block" /> Connect Wallet
                </button>
                    </div>
              </div>
            ) : (
                // --- Dashboard Content (Glassmorphism) ---
                <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-cyan-900/30 p-4 sm:p-6 md:p-8 shadow-2xl space-y-6 sm:space-y-8 md:space-y-10 tab-transition">
                    
                    {/* Top Section: Total Balance & Quick Actions */}
                    <div className="flex flex-col space-y-4 sm:space-y-6">
                        <p className="premium-label text-gray-400 tracking-wide text-xs sm:text-sm">Total Balance</p>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl premium-heading text-cyan-400 tracking-tighter">
                            {network === 'devnet' ? '---' : `$${totalBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}
                  </h2>
                        {network !== 'devnet' && <p className="premium-mono text-xs sm:text-sm text-gray-500">SOL Price: ${solPrice.toFixed(2)}</p>}

                        {/* Quick Actions (Matching Screenshot) */}
                        <div className="grid grid-cols-2 sm:flex sm:space-x-4 md:space-x-6 gap-4 sm:gap-0 pt-4 border-t border-gray-800">
                            <button 
                                onClick={() => {
                                  resetSendModal();
                                  setShowSendModal(true);
                                }}
                                className="flex flex-col items-center space-y-2 text-cyan-400 hover:text-cyan-300 transition-colors group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-full bg-cyan-700/20 flex items-center justify-center border border-cyan-700/40 group-hover:bg-cyan-700/30 transition-all"><Send className="w-5 h-5" /></div>
                                <span className="premium-label text-xs">Send</span>
                            </button>
                            <button 
                                onClick={() => setShowReceiveModal(true)}
                                className="flex flex-col items-center space-y-2 text-cyan-400 hover:text-cyan-300 transition-colors group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-full bg-cyan-700/20 flex items-center justify-center border border-cyan-700/40 group-hover:bg-cyan-700/30 transition-all"><Download className="w-5 h-5" /></div>
                                <span className="premium-label text-xs">Receive</span>
                            </button>
                            <button 
                                onClick={() => setShowContactsModal(true)}
                                className="flex flex-col items-center space-y-2 text-green-400 hover:text-green-300 transition-colors group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-full bg-green-700/20 flex items-center justify-center border border-green-700/40 group-hover:bg-green-700/30 transition-all"><UsersRound className="w-5 h-5" /></div>
                                <span className="premium-label text-xs">Contacts</span>
                            </button>
                            <button
                                onClick={() => setShowWalletModal(true)}
                                className="flex flex-col items-center space-y-2 text-red-400 hover:text-red-300 transition-colors group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-full bg-red-700/20 flex items-center justify-center border border-red-700/40 group-hover:bg-red-700/30 transition-all"><Plus className="w-5 h-5" /></div>
                                <span className="premium-label text-xs">Add Wallet</span>
                            </button>
                        </div>
                      </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-700">
                        <button 
                            className={`px-6 py-3 font-semibold text-lg transition-colors cursor-pointer ${
                                activeTab === 'balances' 
                                ? 'text-white border-b-2 border-cyan-400' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                            onClick={() => setActiveTab('balances')}
                        >
                            Per Wallet Balances
                        </button>
                      <button
                            className={`px-6 py-3 font-semibold text-lg transition-colors cursor-pointer ${
                                activeTab === 'transactions' 
                                ? 'text-white border-b-2 border-cyan-400' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                            onClick={() => setActiveTab('transactions')}
                        >
                            Recent Transactions
                      </button>
                        {loading && (
                             <div className="flex items-center ml-auto text-cyan-400">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400 mr-2"></div>
                                Updating...
                             </div>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        {activeTab === 'balances' && (
                            <div className="space-y-1">
                                {connectedWallets.map((wallet, index) => (
                                    <WalletCard key={index} wallet={wallet} />
                  ))}
                </div>
                        )}

                        {activeTab === 'transactions' && (
                            <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg border border-cyan-900/50 shadow-inner">
                                {recentTransactions.length > 0 ? (
                                    <div className="divide-y divide-gray-800">
                                        {recentTransactions.map((tx, index) => (
                                            <TransactionRow key={index} tx={tx} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <History className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-400 text-lg">
                                            No recent transactions found.
                                        </p>
                                        <p className="text-gray-500 text-sm mt-2">
                                            This may be due to wallet inactivity or public RPC indexing gaps.
                                        </p>
                                    </div>
                                )}
              </div>
            )}
          </div>

                </div>
            )}
        </div>

        {/* Wallet Connection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gray-900/90 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-cyan-900/50 backdrop-blur-xl animate-slideUp">
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
                  <h3 className="text-2xl font-bold text-white">Connect Wallet</h3>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-full hover:bg-gray-800 cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                    {network === 'devnet' && (
                        <div className="p-4 bg-red-900/30 text-red-300 border border-red-800 rounded-xl flex items-start space-x-3 mb-4">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">
                                **DEVNET WARNING**: Ensure your wallet is set to **Solana Devnet** before connecting to use test tokens.
                            </p>
                        </div>
                    )}

                  {availableWallets
                      .filter(wallet => !connectedWallets.some(connected => connected.name === wallet.name))
                      .map((wallet, index) => (
                        <button
                          key={index}
                        onClick={() => { connectWallet(wallet); setShowWalletModal(false); }}
                        className="w-full flex items-center p-4 bg-gray-800/70 rounded-xl hover:bg-gray-800 transition-all border border-cyan-900/50 cursor-pointer"
                      >
                        <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mr-4 p-2">
                          <img src={wallet.iconPath} alt={wallet.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-white text-lg">{wallet.name}</p>
                          <p className="text-sm text-gray-400">{wallet.type === 'ethereum' ? 'Ethereum (No SOL Balance)' : 'Solana Compatible'}</p>
                        </div>
                      </button>
                    ))}
                    
                    {availableWallets.length === 0 && (
                    <div className="text-center py-8">
                            <p className="text-gray-300 text-lg">No Wallets Detected</p>
                            <p className="text-sm text-gray-500 mt-2">Install a browser extension like Phantom, Solflare, or MetaMask.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receive Modal */}
        {showReceiveModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gray-900/95 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-900/50 backdrop-blur-xl animate-slideUp">
              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Receive Crypto</h3>
                    <p className="text-sm text-gray-400 mt-1">Select a wallet to receive funds</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowReceiveModal(false);
                      setSelectedReceiveWallet(null);
                      setShowQR(false);
                      setCopiedAddress(null);
                    }}
                    className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-full hover:bg-gray-800"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Wallet List */}
                {!selectedReceiveWallet ? (
                  <div className="space-y-3">
                    {connectedWallets.map((wallet, index) => {
                      const uniqueKey = wallet.publicKey || wallet.address;
                      const walletIcon = walletIconPaths[wallet.name];
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700 transition-all group"
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            {/* Wallet Icon */}
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border border-cyan-700/50 p-2">
                              {walletIcon ? (
                                <img src={walletIcon} alt={wallet.name} className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full rounded-md bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                  {wallet.name?.charAt(0) || 'W'}
                                </div>
                              )}
                            </div>

                            {/* Wallet Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-lg">{wallet.name}</p>
                              <p className="text-sm text-gray-400 font-mono truncate">
                                {uniqueKey?.slice(0, 8)}...{uniqueKey?.slice(-8)}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                            {/* Copy Button */}
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(uniqueKey);
                                  setCopiedAddress(uniqueKey);
                                  setTimeout(() => setCopiedAddress(null), 2000);
                                } catch (err) {
                                  // Copy failed
                                }
                              }}
                              className="p-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg transition-all border border-cyan-600/30 cursor-pointer"
                              title="Copy Address"
                            >
                              {copiedAddress === uniqueKey ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Copy className="w-5 h-5" />
                              )}
                            </button>

                            {/* QR Button */}
                            <button
                              onClick={() => {
                                setSelectedReceiveWallet(wallet);
                                setShowQR(true);
                              }}
                              className="p-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-all border border-purple-600/30 cursor-pointer"
                              title="Show QR Code"
                            >
                              <QrCode className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {connectedWallets.length === 0 && (
                      <div className="text-center py-12">
                        <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg font-medium">No Wallets Connected</p>
                        <p className="text-gray-500 text-sm mt-2">Connect a wallet first to receive funds</p>
                        <button
                          onClick={() => {
                            setShowReceiveModal(false);
                            setShowWalletModal(true);
                          }}
                          className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg transition-all cursor-pointer"
                        >
                          Connect Wallet
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* QR Code View */
                  <div className="space-y-6">
                    {/* Back Button */}
                    <button
                      onClick={() => {
                        setSelectedReceiveWallet(null);
                        setShowQR(false);
                      }}
                      className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 mr-1" />
                      Back to wallets
                    </button>

                    {/* Wallet Info */}
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border border-cyan-700/50 p-3">
                          {walletIconPaths[selectedReceiveWallet.name] ? (
                            <img 
                              src={walletIconPaths[selectedReceiveWallet.name]} 
                              alt={selectedReceiveWallet.name} 
                              className="w-full h-full object-contain" 
                            />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                              {selectedReceiveWallet.name?.charAt(0) || 'W'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{selectedReceiveWallet.name}</p>
                          <p className="text-sm text-gray-400">{selectedReceiveWallet.type === 'ethereum' ? 'Ethereum' : 'Solana'}</p>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex justify-center mb-6">
                        <div className="text-center">
                          <div 
                            ref={qrCodeRef}
                            className="inline-block"
                          />
                          <p className="text-gray-400 text-sm mt-4">
                            Scan to send {selectedReceiveWallet.type === 'ethereum' ? 'ETH' : 'SOL'}
                          </p>
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="text-gray-400 text-sm font-medium mb-2 block">Wallet Address</label>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-900/70 rounded-lg px-4 py-3 border border-gray-700">
                            <p className="text-white font-mono text-sm break-all">
                              {selectedReceiveWallet.publicKey || selectedReceiveWallet.address}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              const address = selectedReceiveWallet.publicKey || selectedReceiveWallet.address;
                              try {
                                await navigator.clipboard.writeText(address);
                                setCopiedAddress(address);
                                setTimeout(() => setCopiedAddress(null), 2000);
                              } catch (err) {
                                // Copy failed
                              }
                            }}
                            className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
                          >
                            {copiedAddress === (selectedReceiveWallet.publicKey || selectedReceiveWallet.address) ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Copy className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Warning */}
                      <div className="mt-6 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-yellow-400 text-sm font-semibold">Important</p>
                            <p className="text-yellow-300/80 text-xs mt-1">
                              Only send {selectedReceiveWallet.type === 'ethereum' ? 'Ethereum (ETH) and ERC-20 tokens' : 'Solana (SOL) and SPL tokens'} to this address. Sending other assets may result in permanent loss.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contacts Modal */}
        {showContactsModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gray-900/95 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-green-900/50 backdrop-blur-xl animate-slideUp">
              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-700/20 flex items-center justify-center border border-green-700/40">
                      <UsersRound className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Trusted Contacts</h3>
                      <p className="text-sm text-gray-400">Quick send to your saved contacts</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactsModal(false)}
                    className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-full hover:bg-gray-800 cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                {trustedContacts.length === 0 ? (
                  /* No Contacts - Navigate to Add */
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-green-700/20 flex items-center justify-center border border-green-700/40 mx-auto mb-6">
                      <UserPlus className="w-10 h-10 text-green-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-3">No Trusted Contacts Yet</h4>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Add trusted contacts to send funds quickly and securely without re-entering addresses.
                    </p>
                    <button
                      onClick={() => {
                        setShowContactsModal(false);
                        setActiveView('manageTrustedContacts');
                      }}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
                    >
                      <UserPlus className="w-5 h-5" />
                      Add Your First Contact
                    </button>
                  </div>
                ) : (
                  /* Display Contacts */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-gray-400 text-sm">
                        {trustedContacts.length} contact{trustedContacts.length !== 1 ? 's' : ''} saved
                      </p>
                      <button
                        onClick={() => {
                          setShowContactsModal(false);
                          setActiveView('manageTrustedContacts');
                        }}
                        className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                      >
                        Manage Contacts
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2" style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(34, 197, 94, 0.3) transparent'
                    }}>
                      {trustedContacts.map((contact, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-green-500/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <UsersRound className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <h4 className="text-white font-semibold truncate">{contact.name}</h4>
                              </div>
                              <code className="text-cyan-400 font-mono text-xs block truncate mb-2">
                                {contact.address}
                              </code>
                              {contact.notes && (
                                <p className="text-gray-400 text-xs truncate">
                                  {contact.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              handleSendToContact(contact);
                              setShowContactsModal(false);
                            }}
                            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <Send className="w-4 h-4" />
                            Send to {contact.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Send Modal */}
        {showSendModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gray-900/95 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-900/50 backdrop-blur-xl animate-slideUp">
              <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Send Crypto</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {sendStep === 1 && 'Enter recipient address'}
                      {sendStep === 2 && 'Security Check Results'}
                      {sendStep === 3 && 'Transaction Details'}
                      {sendStep === 4 && 'Transaction Successful'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSendModal(false);
                      resetSendModal();
                    }}
                    className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-full hover:bg-gray-800 cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Step 1: Enter Recipient Address */}
                {sendStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Recipient Solana Address
                      </label>
                      <input
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="Enter Solana wallet address..."
                        className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
                      />
                    </div>

                    {transactionError && (
                      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-300 text-sm">{transactionError}</p>
                      </div>
                    )}

                    <button
                      onClick={() => handleCheckRecipient()}
                      disabled={checkingRisk || !recipientAddress}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {checkingRisk ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Checking Security...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          <span>Check Address & Continue</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Step 2: Risk Assessment Results */}
                {sendStep === 2 && riskAssessment && (
                  <div className="space-y-6">
                    {/* Blocklist Warning Banner */}
                    {riskAssessment.isBlocked && (
                      <div className="bg-red-900/40 border-2 border-red-700/70 rounded-xl p-5">
                        <div className="flex items-start space-x-3">
                          <UserX className="w-7 h-7 text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-red-400 font-bold text-lg mb-2">🚫 Address Blocked</p>
                            <p className="text-red-300 text-sm mb-3">
                              This address is in your blocklist. You cannot send funds to this address.
                            </p>
                            {riskAssessment.blocklistEntry && riskAssessment.blocklistEntry.reason && (
                              <div className="bg-red-950/50 rounded-lg p-3 border border-red-800">
                                <p className="text-red-300 text-xs font-semibold mb-1">Reason for blocking:</p>
                                <p className="text-red-200 text-xs">{riskAssessment.blocklistEntry.reason}</p>
                              </div>
                            )}
                            <p className="text-red-300/80 text-xs mt-3">
                              To send to this address, you must first remove it from your blocklist in the <strong>Manage Blocklist</strong> tab.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Warning Banner if verification failed */}
                    {!riskAssessment.isBlocked && riskAssessment.chainAbuseResult && !riskAssessment.chainAbuseResult.checked && (
                      <div className="bg-yellow-900/30 border-2 border-yellow-700/50 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-yellow-400 font-bold text-sm mb-1">⚠️ Verification Service Unavailable</p>
                            <p className="text-yellow-300/90 text-xs">
                              {riskAssessment.chainAbuseResult.warning || 'Unable to verify this address against fraud databases due to API restrictions. Please verify the recipient address manually before proceeding.'}
                            </p>
                            <p className="text-yellow-300/70 text-xs mt-2">
                              <strong>Recommendation:</strong> Only send to addresses you trust and have verified independently.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Risk Score Display */}
                    <div className={`rounded-xl p-6 border-2 ${
                      riskAssessment.safe 
                        ? 'bg-green-900/20 border-green-700/50' 
                        : 'bg-red-900/30 border-red-700/50'
                    }`}>
                      <div className="flex items-center space-x-4 mb-4">
                        {riskAssessment.safe ? (
                          <div className="w-16 h-16 rounded-full bg-green-600/30 flex items-center justify-center border-2 border-green-500">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-red-600/30 flex items-center justify-center border-2 border-red-500">
                            <XCircle className="w-8 h-8 text-red-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className={`text-2xl font-bold ${
                            riskAssessment.safe ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {riskAssessment.safe ? 'Wallet Looks Safe' : 'High Risk Detected'}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            riskAssessment.safe ? 'text-green-300/80' : 'text-red-300/80'
                          }`}>
                            Risk Score: {riskAssessment.riskScore}/100 ({riskAssessment.riskLevel})
                          </p>
                        </div>
                      </div>

                      {/* Risk Factors */}
                      {riskAssessment.riskFactors && riskAssessment.riskFactors.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <p className="text-sm font-semibold text-gray-300">Risk Factors:</p>
                          {riskAssessment.riskFactors.map((factor, index) => (
                            <div key={index} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                  factor.severity === 'critical' ? 'text-red-400' :
                                  factor.severity === 'high' ? 'text-orange-400' :
                                  factor.severity === 'medium' ? 'text-yellow-400' : 'text-gray-400'
                                }`} />
                                <div>
                                  <p className="text-sm font-semibold text-white">{factor.reason}</p>
                                  {factor.details && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {typeof factor.details === 'string' ? factor.details : JSON.stringify(factor.details)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ChainAbuse Reports */}
                      {riskAssessment.chainAbuseResult && riskAssessment.chainAbuseResult.reports && riskAssessment.chainAbuseResult.reports.length > 0 && (
                        <div className="mt-4 bg-red-950/50 rounded-lg p-4 border border-red-800">
                          <p className="text-red-400 font-bold text-sm mb-2">⚠️ Fraud Reports Found:</p>
                          {riskAssessment.chainAbuseResult.reports.slice(0, 3).map((report, index) => (
                            <div key={index} className="text-xs text-red-300 mb-1">
                              • Category: {report.category || 'Unknown'} | Reporter: {report.reporter || 'Anonymous'}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Helius Analysis */}
                      {riskAssessment.heliusResult && (
                        <div className="mt-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                          <p className="text-gray-300 font-semibold text-sm mb-2">Blockchain Analysis:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-gray-400">Balance: <span className="text-white">{riskAssessment.heliusResult.balance?.toFixed(4) || 0} SOL</span></div>
                            <div className="text-gray-400">Transactions: <span className="text-white">{riskAssessment.heliusResult.transactionCount || 0}</span></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setSendStep(1)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer"
                      >
                        Back
                      </button>
                      {riskAssessment.isBlocked ? (
                        <button
                          disabled
                          className="flex-1 bg-red-900/50 text-red-300 px-6 py-3 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <UserX className="w-5 h-5" />
                          Address Blocked
                        </button>
                      ) : riskAssessment.safe ? (
                        <button
                          onClick={handleProceedToTransaction}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer"
                        >
                          Proceed to Send
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 bg-red-900/50 text-red-300 px-6 py-3 rounded-lg font-semibold cursor-not-allowed"
                        >
                          Transaction Blocked
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Transaction Setup */}
                {sendStep === 3 && (
                  <div className="space-y-6">
                    {/* Recipient Summary */}
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Sending to:</p>
                      <p className="text-sm text-white font-mono truncate">{recipientAddress}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <p className="text-xs text-green-400">Verified Safe</p>
                      </div>
                    </div>

                    {/* Select Wallet */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        From Wallet
                      </label>
                      <select
                        value={selectedSendWallet ? selectedSendWallet.publicKey : ''}
                        onChange={(e) => {
                          const wallet = connectedWallets.find(w => w.publicKey === e.target.value);
                          setSelectedSendWallet(wallet);
                        }}
                        className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                      >
                        <option value="">Select a wallet...</option>
                        {connectedWallets.filter(w => w.type === 'solana').map((wallet, index) => {
                          const balance = walletBalances[wallet.publicKey] || 0;
                          return (
                            <option key={index} value={wallet.publicKey}>
                              {wallet.name} - {balance.toFixed(5)} SOL
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Amount (SOL)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.000001"
                          min="0"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                        {selectedSendWallet && (
                          <button
                            onClick={() => {
                              const balance = walletBalances[selectedSendWallet.publicKey] || 0;
                              setSendAmount((balance * 0.99).toFixed(6)); // Leave some for fees
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      {selectedSendWallet && (
                        <p className="text-xs text-gray-400 mt-1">
                          Available: {(walletBalances[selectedSendWallet.publicKey] || 0).toFixed(5)} SOL
                        </p>
                      )}
                    </div>

                    {/* Token Selection (Currently only SOL) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Token
                      </label>
                      <div className="bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3 text-white">
                        SOL (Solana)
                      </div>
                      <p className="text-xs text-gray-400 mt-1">SPL token support coming soon</p>
                    </div>

                    {transactionError && (
                      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-300 text-sm">{transactionError}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setSendStep(2)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSendTransaction}
                        disabled={sendingTransaction || !selectedSendWallet || !sendAmount || parseFloat(sendAmount) <= 0}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {sendingTransaction ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span>Send Transaction</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Success */}
                {sendStep === 4 && transactionSignature && (
                  <div className="space-y-6">
                    {/* Success Animation */}
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-24 h-24 rounded-full bg-green-600/30 flex items-center justify-center border-4 border-green-500 mb-6 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-green-400" />
                      </div>
                      <h4 className="text-3xl font-bold text-green-400 mb-2">Transaction Sent!</h4>
                      <p className="text-gray-400 text-center">Your transaction has been successfully submitted to the network</p>
                    </div>

                    {/* Transaction Details */}
                    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Transaction Signature</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-white font-mono truncate flex-1">{transactionSignature}</p>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(transactionSignature);
                              } catch (err) {
                                console.error('Copy failed');
                              }
                            }}
                            className="p-2 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                          >
                            <Copy className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Amount</p>
                          <p className="text-sm text-white font-semibold">{sendAmount} SOL</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">To</p>
                          <p className="text-sm text-white font-mono truncate">{recipientAddress.slice(0, 8)}...{recipientAddress.slice(-8)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Explorer Link */}
                    <a
                      href={`https://explorer.solana.com/tx/${transactionSignature}${network === 'devnet' ? '?cluster=devnet' : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span>View on Solana Explorer</span>
                    </a>

                    {/* Close Button */}
                    <button
                      onClick={() => {
                        setShowSendModal(false);
                        resetSendModal();
                      }}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default Dashboard;