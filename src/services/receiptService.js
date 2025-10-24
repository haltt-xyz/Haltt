import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Receipt Service - Manages transaction receipts in Firestore
 * Collection: 'receipts'
 * Document structure:
 * {
 *   userId: "user@example.com",
 *   transactionSignature: "signature_hash",
 *   walletAddress: "sender_wallet_address",
 *   walletName: "Phantom",
 *   recipientAddress: "recipient_wallet_address",
 *   amount: 1.5,
 *   token: "SOL",
 *   timestamp: Timestamp,
 *   status: "success" | "failed",
 *   network: "mainnet-beta" | "devnet",
 *   type: "send" | "receive"
 * }
 */

/**
 * Save a transaction receipt
 * @param {Object} receiptData - Receipt information
 * @returns {Promise<string>} Receipt document ID
 */
export const saveReceipt = async (receiptData) => {
  try {
    const receipt = {
      userId: receiptData.userId,
      transactionSignature: receiptData.transactionSignature,
      walletAddress: receiptData.walletAddress,
      walletName: receiptData.walletName,
      recipientAddress: receiptData.recipientAddress,
      amount: receiptData.amount,
      token: receiptData.token || 'SOL',
      timestamp: serverTimestamp(),
      status: receiptData.status || 'success',
      network: receiptData.network || 'mainnet-beta',
      type: receiptData.type || 'send',
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'receipts'), receipt);
    console.log('✅ Receipt saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving receipt:', error);
    throw error;
  }
};

/**
 * Get all receipts for a user
 * @param {string} userId - User's email
 * @returns {Promise<Array>} Array of receipts
 */
export const getUserReceipts = async (userId) => {
  try {
    const receiptsRef = collection(db, 'receipts');
    const q = query(
      receiptsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const receipts = [];
    
    querySnapshot.forEach((doc) => {
      receipts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return receipts;
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return [];
  }
};

/**
 * Get receipts by wallet address
 * @param {string} userId - User's email
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Array>} Array of receipts
 */
export const getReceiptsByWallet = async (userId, walletAddress) => {
  try {
    const receiptsRef = collection(db, 'receipts');
    const q = query(
      receiptsRef,
      where('userId', '==', userId),
      where('walletAddress', '==', walletAddress),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const receipts = [];
    
    querySnapshot.forEach((doc) => {
      receipts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return receipts;
  } catch (error) {
    console.error('Error fetching receipts by wallet:', error);
    return [];
  }
};

/**
 * Get receipt by transaction signature
 * @param {string} userId - User's email
 * @param {string} signature - Transaction signature
 * @returns {Promise<Object|null>} Receipt or null
 */
export const getReceiptBySignature = async (userId, signature) => {
  try {
    const receiptsRef = collection(db, 'receipts');
    const q = query(
      receiptsRef,
      where('userId', '==', userId),
      where('transactionSignature', '==', signature)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error fetching receipt by signature:', error);
    return null;
  }
};
