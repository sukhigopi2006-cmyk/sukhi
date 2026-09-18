// Firebase Configuration for Sukhi Fireworks E-Commerce
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCnF44y4V1HI___FBoOkPMlFSUawu27Fss",
  authDomain: "sukhifireworkes.firebaseapp.com",
  databaseURL: "https://sukhifireworkes-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sukhifireworkes",
  storageBucket: "sukhifireworkes.firebasestorage.app",
  messagingSenderId: "23623889504",
  appId: "1:23623889504:web:07c3d1519665cb41c68905",
  measurementId: "G-15BQL1V860"
};

// Initialize Firebase (compat mode for simpler multi-page usage)
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.storage = firebase.storage();
  if (firebase.database) {
    window.rtdb = firebase.database();
  }
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
}
