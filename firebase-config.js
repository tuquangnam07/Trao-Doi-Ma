// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCCPZvTZd1RKGaZxpKJWiCQb4JvqjA7l-U",
    authDomain: "bao-code-accounts.firebaseapp.com",
    projectId: "bao-code-accounts",
    storageBucket: "bao-code-accounts.firebasestorage.app",
    messagingSenderId: "195898289743",
    appId: "1:195898289743:web:696a5646367dc08ad5443a",
    measurementId: "G-ED38789Q9R"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true })
    .catch(err => console.warn('Firebase persistence:', err));