import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

/**
 * Trusted Contacts Service - Manages user trusted contacts data in Firestore
 * Collection: 'users'
 * Document structure includes:
 * {
 *   email: "user@example.com",
 *   trustedContacts: [
 *     {
 *       address: "wallet_address",
 *       name: "Contact Name",
 *       addedAt: "ISO timestamp",
 *       notes: "Optional notes"
 *     }
 *   ]
 * }
 */

/**
 * Add a contact to user's trusted contacts list
 * @param {string} email - User's email
 * @param {string} address - Wallet address
 * @param {string} name - Contact name
 * @param {string} notes - Optional notes
 * @returns {Promise<void>}
 */
export const addTrustedContact = async (email, address, name, notes = '') => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create user document with trusted contact
      const newUserData = {
        email: email,
        trustedContacts: [{
          address: address,
          name: name,
          notes: notes,
          addedAt: new Date().toISOString()
        }],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      await setDoc(userDocRef, newUserData);
      return;
    }

    const userData = userDoc.data();
    
    // Check if address already exists in trusted contacts
    const exists = userData?.trustedContacts?.some(
      contact => contact.address === address
    );

    if (exists) {
      throw new Error('Address already exists in trusted contacts');
    }

    // Add to trusted contacts
    const contactEntry = {
      address: address,
      name: name,
      notes: notes,
      addedAt: new Date().toISOString()
    };

    await updateDoc(userDocRef, {
      trustedContacts: arrayUnion(contactEntry),
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a contact from user's trusted contacts list
 * @param {string} email - User's email
 * @param {string} address - Wallet address to remove
 * @returns {Promise<void>}
 */
export const removeTrustedContact = async (email, address) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return;
    }

    const userData = userDoc.data();
    
    // Filter out the contact
    const updatedContacts = (userData.trustedContacts || []).filter(
      contact => contact.address !== address
    );

    await updateDoc(userDocRef, {
      trustedContacts: updatedContacts,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update a trusted contact's information
 * @param {string} email - User's email
 * @param {string} address - Wallet address
 * @param {Object} updates - Fields to update (name, notes)
 * @returns {Promise<void>}
 */
export const updateTrustedContact = async (email, address, updates) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return;
    }

    const userData = userDoc.data();
    
    // Update the contact
    const updatedContacts = (userData.trustedContacts || []).map(contact => {
      if (contact.address === address) {
        return {
          ...contact,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return contact;
    });

    await updateDoc(userDocRef, {
      trustedContacts: updatedContacts,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's trusted contacts list
 * @param {string} email - User's email
 * @returns {Promise<Array>} Array of trusted contacts
 */
export const getTrustedContacts = async (email) => {
  try {
    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    return userData.trustedContacts || [];
  } catch (error) {
    console.error('Error fetching trusted contacts:', error);
    return [];
  }
};

/**
 * Check if an address is in trusted contacts
 * @param {string} email - User's email
 * @param {string} address - Wallet address to check
 * @returns {Promise<boolean>} True if address is trusted
 */
export const isAddressTrusted = async (email, address) => {
  try {
    const contacts = await getTrustedContacts(email);
    return contacts.some(contact => contact.address === address);
  } catch (error) {
    console.error('Error checking trusted contacts:', error);
    return false;
  }
};

/**
 * Get trusted contact details
 * @param {string} email - User's email
 * @param {string} address - Wallet address
 * @returns {Promise<Object|null>} Contact details or null
 */
export const getTrustedContact = async (email, address) => {
  try {
    const contacts = await getTrustedContacts(email);
    return contacts.find(contact => contact.address === address) || null;
  } catch (error) {
    console.error('Error fetching trusted contact:', error);
    return null;
  }
};
