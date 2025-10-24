import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Test function to verify Firestore connection
 * Call this from browser console: window.testFirestore()
 */
export const testFirestoreConnection = async (userEmail) => {
  try {
    console.log('🧪 Testing Firestore connection...');
    console.log('📧 User email:', userEmail);
    
    if (!userEmail) {
      console.error('❌ No user email provided');
      return;
    }

    const testDocRef = doc(db, 'users', userEmail);
    
    const testData = {
      email: userEmail,
      wallets: [],
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      testField: 'This is a test document'
    };

    console.log('📝 Attempting to write to Firestore...');
    await setDoc(testDocRef, testData);
    
    console.log('✅ SUCCESS! Document written to Firestore');
    console.log('✅ Check Firebase Console now - users collection should appear');
    
    return true;
  } catch (error) {
    console.error('❌ FIRESTORE ERROR:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('🔒 PERMISSION DENIED - Check your Firestore Rules!');
      console.error('📋 Required rules:');
      console.error(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{email} {
      allow read, write: if request.auth != null && request.auth.token.email == email;
    }
  }
}
      `);
    }
    
    return false;
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  window.testFirestore = testFirestoreConnection;
}
