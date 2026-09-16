// Firebase Configuration for Sukhi Fireworks E-Commerce
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyCnF44y4V1HI___FBoOkPMlFSUawu27Fss",
  authDomain: "sukhifireworkes.firebaseapp.com",
  projectId: "sukhifireworkes",
  storageBucket: "sukhifireworkes.firebasestorage.app",
  messagingSenderId: "23623889504",
  appId: "1:23623889504:web:07c3d1519665cb41c68905",
  measurementId: "G-15BQL1V860"
};

const firebaseConfigErrors = [];
if (window.location.protocol === 'file:') {
  firebaseConfigErrors.push('Open the site through a local web server or Firebase Hosting, not a file:// URL.');
}
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain || firebaseConfig.apiKey.includes('REPLACE') || firebaseConfig.apiKey.includes('___')) {
  firebaseConfigErrors.push('Replace public/js/firebase-config.js with the Web app configuration from the active Firebase project.');
}
if (typeof firebase === 'undefined') {
  firebaseConfigErrors.push('Firebase SDK files could not be loaded. Check the internet connection.');
}

window.firebaseConfigStatus = {
  ready: firebaseConfigErrors.length === 0,
  message: firebaseConfigErrors.join(' ')
};

// Initialize Firebase only when the page can use an authorized web origin.
if (window.firebaseConfigStatus.ready) {
  try {
    firebase.initializeApp(firebaseConfig);
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = firebase.storage();
  } catch (error) {
    window.firebaseConfigStatus = {
      ready: false,
      message: 'Firebase could not be initialized. Verify the Web app configuration in public/js/firebase-config.js.'
    };
    console.error('Firebase initialization failed:', error);
  }
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
}
