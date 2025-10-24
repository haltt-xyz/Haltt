import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

/**
 * Wallet Service - Manages user wallet data in Firestore
 * Collection: 'users'
 * Document structure:
 * {
 *   email: "user@example.com",
 *   wallets: [
 *     {
 *       address: "wallet_address_here",
 *       type: "solana" | "ethereum",
 *       name: "Phantom" | "MetaMask" | etc,
 *       connectedAt: Timestamp
 *     }
 *   ],
 *   createdAt: Timestamp,
 *   lastUpdated: Timestamp
 * }
 */

/**
 * Initialize or get user document in Firestore
 * @param {string} email - User's email from Google Auth
 * @returns {Promise<Object>} User document data
 */
export const initializeUserDocument = async (email) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user document
      const newUserData = {
        email: email,
        wallets: [],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      await setDoc(userDocRef, newUserData);
      return newUserData;
    } else {
      return userDoc.data();
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Add a new wallet to user's wallet list
 * @param {string} email - User's email
 * @param {Object} walletData - Wallet information
 * @param {string} walletData.address - Wallet address/public key
 * @param {string} walletData.type - Wallet type (solana/ethereum)
 * @param {string} walletData.name - Wallet name (Phantom, MetaMask, etc)
 * @returns {Promise<void>}
 */
export const addWalletToUser = async (email, walletData) => {
  try {
    const userDocRef = doc(db, 'users', email);
    let userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await initializeUserDocument(email);
      userDoc = await getDoc(userDocRef);
    }

    const userData = userDoc.data();
    
    const walletExists = userData?.wallets?.some(
      w => w.address === walletData.address
    );

    if (walletExists) {
      return;
    }

    // Add wallet with timestamp (using Date instead of serverTimestamp for arrayUnion compatibility)
    const walletEntry = {
      address: walletData.address,
      type: walletData.type,
      name: walletData.name,
      connectedAt: new Date().toISOString()
    };

    await updateDoc(userDocRef, {
      wallets: arrayUnion(walletEntry),
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a wallet from user's wallet list
 * @param {string} email - User's email
 * @param {string} walletAddress - Wallet address to remove
 * @returns {Promise<void>}
 */
export const removeWalletFromUser = async (email, walletAddress) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return;
    }

    const userData = userDoc.data();
    const updatedWallets = userData.wallets.filter(
      w => w.address !== walletAddress
    );

    await updateDoc(userDocRef, {
      wallets: updatedWallets,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get all wallets for a user
 * @param {string} email - User's email
 * @returns {Promise<Array>} Array of wallet objects
 */
export const getUserWallets = async (email) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    return userData.wallets || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Sync connected wallets with Firestore
 * This function ensures all currently connected wallets are stored
 * @param {string} email - User's email
 * @param {Array} connectedWallets - Array of currently connected wallet objects
 * @returns {Promise<void>}
 */
export const syncWalletsToFirestore = async (email, connectedWallets) => {
  try {
    if (!email || !connectedWallets || connectedWallets.length === 0) {
      return;
    }

    // Add each connected wallet
    for (const wallet of connectedWallets) {
      const walletData = {
        address: wallet.publicKey || wallet.address,
        type: wallet.type,
        name: wallet.name
      };
      
      try {
        await addWalletToUser(email, walletData);
      } catch (walletError) {
        throw walletError;
      }
    }
  } catch (error) {
    throw error;
  }
};
