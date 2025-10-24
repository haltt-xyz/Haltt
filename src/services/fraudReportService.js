import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, arrayUnion, serverTimestamp, increment } from 'firebase/firestore';

/**
 * Fraud Report Service - Manages fraud reports in Firestore
 * Collection: 'reports'
 * Document structure:
 * {
 *   walletAddress: "wallet_address_here",
 *   categories: ["Phishing", "Scam", ...],
 *   reporters: ["user1@example.com", "user2@example.com", ...],
 *   frequency: 2,
 *   notes: [
 *     { email: "user1@example.com", note: "...", timestamp: Timestamp },
 *     { email: "user2@example.com", note: "...", timestamp: Timestamp }
 *   ],
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */

/**
 * Submit a fraud report for a wallet address
 * @param {string} walletAddress - The wallet address being reported
 * @param {string} category - Category of fraud (Phishing, Scam, Fraud, Others)
 * @param {string} note - Optional explanation/note
 * @param {string} userEmail - Reporter's email
 * @returns {Promise<Object>} Result object with success status and message
 */
export const submitFraudReport = async (walletAddress, category, note, userEmail) => {
  try {
    // Check if wallet address already exists in reports
    const reportsQuery = query(
      collection(db, 'reports'),
      where('walletAddress', '==', walletAddress)
    );

    const querySnapshot = await getDocs(reportsQuery);

    if (!querySnapshot.empty) {
      // Wallet already reported - update existing document
      const existingDoc = querySnapshot.docs[0];
      const existingData = existingDoc.data();
      
      // Check if user already reported this wallet
      if (existingData.reporters && existingData.reporters.includes(userEmail)) {
        return {
          success: false,
          message: 'You have already reported this wallet address.',
          alreadyReported: true
        };
      }

      // Prepare updates
      const updates = {
        frequency: increment(1),
        reporters: arrayUnion(userEmail),
        updatedAt: serverTimestamp()
      };

      // Add category if it doesn't exist
      if (!existingData.categories.includes(category)) {
        updates.categories = arrayUnion(category);
      }

      // Add note if provided
      if (note && note.trim()) {
        updates.notes = arrayUnion({
          email: userEmail,
          note: note.trim(),
          timestamp: new Date().toISOString()
        });
      }

      // Update the document
      await updateDoc(doc(db, 'reports', existingDoc.id), updates);

      return {
        success: true,
        message: `Report updated successfully. This wallet has been reported by ${existingData.frequency + 1} users.`,
        frequency: existingData.frequency + 1
      };
    } else {
      // New wallet report - create document
      const newReport = {
        walletAddress: walletAddress,
        categories: [category],
        reporters: [userEmail],
        frequency: 1,
        notes: note && note.trim() ? [{
          email: userEmail,
          note: note.trim(),
          timestamp: new Date().toISOString()
        }] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reports'), newReport);

      return {
        success: true,
        message: 'Report submitted successfully. Thank you for helping keep the network safe.',
        frequency: 1
      };
    }
  } catch (error) {
    console.error('Error submitting fraud report:', error);
    throw error;
  }
};

/**
 * Get all fraud reports (admin function)
 * @param {number} maxReports - Maximum number of reports to retrieve
 * @returns {Promise<Array>} Array of fraud reports
 */
export const getAllFraudReports = async (maxReports = 100) => {
  try {
    const reportsQuery = query(
      collection(db, 'reports')
    );

    const querySnapshot = await getDocs(reportsQuery);
    const reports = [];

    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by frequency (most reported first)
    reports.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

    return reports.slice(0, maxReports);
  } catch (error) {
    console.error('Error fetching fraud reports:', error);
    throw error;
  }
};

/**
 * Check if a wallet address has been reported
 * @param {string} walletAddress - The wallet address to check
 * @returns {Promise<Object|null>} Report data if exists, null otherwise
 */
export const checkWalletReport = async (walletAddress) => {
  try {
    const reportsQuery = query(
      collection(db, 'reports'),
      where('walletAddress', '==', walletAddress)
    );

    const querySnapshot = await getDocs(reportsQuery);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking wallet report:', error);
    throw error;
  }
};
