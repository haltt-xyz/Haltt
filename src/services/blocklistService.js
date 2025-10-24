import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';

/**
 * Blocklist Service - Manages user blocklist data in Firestore
 * Collection: 'users'
 * Document structure includes:
 * {
 *   email: "user@example.com",
 *   blocklist: [
 *     {
 *       address: "blocked_wallet_address",
 *       reason: "User provided reason",
 *       blockedAt: "ISO timestamp",
 *       addedBy: "manual" | "auto"
 *     }
 *   ]
 * }
 */

/**
 * Add an address to user's blocklist
 * @param {string} email - User's email
 * @param {string} address - Wallet address to block
 * @param {string} reason - Reason for blocking (optional)
 * @returns {Promise<void>}
 */
export const addToBlocklist = async (email, address, reason = '') => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create user document with blocklist
      const newUserData = {
        email: email,
        blocklist: [{
          address: address,
          reason: reason,
          blockedAt: new Date().toISOString(),
          addedBy: 'manual'
        }],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      await setDoc(userDocRef, newUserData);
      return;
    }

    const userData = userDoc.data();
    
    // Check if address is already blocked
    const isBlocked = userData?.blocklist?.some(
      item => item.address === address
    );

    if (isBlocked) {
      throw new Error('Address is already in blocklist');
    }

    // Add to blocklist
    const blocklistEntry = {
      address: address,
      reason: reason,
      blockedAt: new Date().toISOString(),
      addedBy: 'manual'
    };

    await updateDoc(userDocRef, {
      blocklist: arrayUnion(blocklistEntry),
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Remove an address from user's blocklist
 * @param {string} email - User's email
 * @param {string} address - Wallet address to unblock
 * @returns {Promise<void>}
 */
export const removeFromBlocklist = async (email, address) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return;
    }

    const userData = userDoc.data();
    
    // Find and remove the blocklist entry
    const updatedBlocklist = (userData.blocklist || []).filter(
      item => item.address !== address
    );

    await updateDoc(userDocRef, {
      blocklist: updatedBlocklist,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's blocklist
 * @param {string} email - User's email
 * @returns {Promise<Array>} Array of blocked addresses
 */
export const getBlocklist = async (email) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    return userData.blocklist || [];
  } catch (error) {
    console.error('Error fetching blocklist:', error);
    return [];
  }
};

/**
 * Check if an address is blocked
 * @param {string} email - User's email
 * @param {string} address - Wallet address to check
 * @returns {Promise<boolean>} True if address is blocked
 */
export const isAddressBlocked = async (email, address) => {
  try {
    const blocklist = await getBlocklist(email);
    return blocklist.some(item => item.address === address);
  } catch (error) {
    console.error('Error checking blocklist:', error);
    return false;
  }
};

/**
 * Get blocklist entry details
 * @param {string} email - User's email
 * @param {string} address - Wallet address
 * @returns {Promise<Object|null>} Blocklist entry or null
 */
export const getBlocklistEntry = async (email, address) => {
  try {
    const blocklist = await getBlocklist(email);
    return blocklist.find(item => item.address === address) || null;
  } catch (error) {
    console.error('Error fetching blocklist entry:', error);
    return null;
  }
};
