import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, where, serverTimestamp } from 'firebase/firestore';

/**
 * Audit Log Service - Manages wallet activity logs in Firestore
 * Collection: 'auditLogs'
 * Document structure:
 * {
 *   userId: "user@example.com",
 *   walletAddress: "wallet_address_here",
 *   walletName: "Phantom" | "Solflare" | etc,
 *   walletType: "solana" | "ethereum",
 *   action: "connected" | "disconnected",
 *   timestamp: Timestamp,
 *   metadata: { ... additional info }
 * }
 */

/**
 * Log a wallet connection event
 * @param {string} userId - User's email
 * @param {Object} walletData - Wallet information
 * @returns {Promise<string>} Document ID of created log
 */
export const logWalletConnection = async (userId, walletData) => {
  try {
    const logEntry = {
      userId: userId,
      walletAddress: walletData.publicKey || walletData.address,
      walletName: walletData.name,
      walletType: walletData.type,
      action: 'connected',
      timestamp: serverTimestamp(),
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    };

    const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * Log a wallet disconnection event
 * @param {string} userId - User's email
 * @param {string} walletAddress - Wallet address
 * @param {string} walletName - Wallet name
 * @param {string} walletType - Wallet type
 * @returns {Promise<string>} Document ID of created log
 */
export const logWalletDisconnection = async (userId, walletAddress, walletName, walletType) => {
  try {
    const logEntry = {
      userId: userId,
      walletAddress: walletAddress,
      walletName: walletName,
      walletType: walletType,
      action: 'disconnected',
      timestamp: serverTimestamp(),
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    };

    const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * Get audit logs for a specific user
 * @param {string} userId - User's email
 * @param {number} maxLogs - Maximum number of logs to retrieve (default: 100)
 * @returns {Promise<Array>} Array of audit log entries
 */
export const getUserAuditLogs = async (userId, maxLogs = 100) => {
  try {
    // Try with index first
    const logsQuery = query(
      collection(db, 'auditLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );

    const querySnapshot = await getDocs(logsQuery);
    const logs = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return logs;
  } catch (error) {
    // If index doesn't exist, try without orderBy (will be slower but works)
    try {
      const fallbackQuery = query(
        collection(db, 'auditLogs'),
        where('userId', '==', userId),
        limit(maxLogs)
      );

      const querySnapshot = await getDocs(fallbackQuery);
      const logs = [];

      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort manually by timestamp
      logs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });

      return logs;
    } catch (fallbackError) {
      // Return empty array if both fail
      return [];
    }
  }
};

/**
 * Get audit logs for a specific wallet
 * @param {string} userId - User's email
 * @param {string} walletAddress - Wallet address
 * @param {number} maxLogs - Maximum number of logs to retrieve
 * @returns {Promise<Array>} Array of audit log entries for the wallet
 */
export const getWalletAuditLogs = async (userId, walletAddress, maxLogs = 50) => {
  try {
    const logsQuery = query(
      collection(db, 'auditLogs'),
      where('userId', '==', userId),
      where('walletAddress', '==', walletAddress),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );

    const querySnapshot = await getDocs(logsQuery);
    const logs = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return logs;
  } catch (error) {
    throw error;
  }
};
