/* ============================================================
   FIREBASE CONFIG – firebase-config.js
   Firebase initialization: App, Firestore, and Auth.
   Note: Client API keys are public and restricted via 
   Firestore and Storage security rules.
   ============================================================ */

// Firebase SDK is loaded via CDN in index.html
// (firebase-app-compat, firebase-firestore-compat, firebase-auth-compat)

const firebaseConfig = {
  apiKey: "AIzaSyCInwnbjqzlu3b64j-DoZUY5OBob7kYHcY",
  authDomain: "taskflow-a81e4.firebaseapp.com",
  projectId: "taskflow-a81e4",
  storageBucket: "taskflow-a81e4.firebasestorage.app",
  messagingSenderId: "289707045673",
  appId: "1:289707045673:web:de7810d7540879dca7fd38"
};

// ── Initialize Firebase Services ──
let app = null;  // Firebase App instance
let db = null;  // Firestore instance
let auth = null;  // Auth instance

try {
  app = firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();

  // Enable Firestore offline persistence for better UX
  db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Firestore persistence unavailable: multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Firestore persistence not supported in this browser.');
    }
  });


} catch (error) {
  console.warn('⚠️ Firebase initialization failed. Running in offline/demo mode.');
  console.warn('   See firebase-config.js for setup instructions.');
  console.warn('   Error:', error.message);
}

/**
 * Check if Firebase is properly configured and connected.
 * @returns {boolean}
 */
function isFirebaseReady() {
  return db !== null;
}
