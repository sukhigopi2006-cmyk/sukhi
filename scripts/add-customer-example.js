/**
 * Add a Customer Data Object to Cloud Firestore using the add() method
 * Project: Sukhi Fireworks E-Commerce
 *
 * You can run this directly in your browser Console on any page of the store,
 * or use window.Customers.add(details) from app.js!
 */

// 1. Define the Customer Data Object with complete details
const customerData = {
  name: "Rajesh Sharma",
  email: "rajesh.sharma@example.com",
  phone: "+91 98765 43210",
  address: {
    street: "42 MG Road, Gandhi Nagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    country: "India"
  },
  status: "active",
  totalOrders: 1,
  totalSpent: 2499,
  favoriteCategory: "Crackers",
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

// 2. Function to add the customer object to Firestore collection 'customers' using the add() method
async function addCustomerToFirestore(data) {
  try {
    // db is the initialized Firestore instance (window.db)
    const docRef = await db.collection('customers').add(data);
    
    console.log("✅ Customer successfully added to Firestore!");
    console.log("📄 Generated Document ID:", docRef.id);
    console.log("🔗 View in Firebase Console: https://console.firebase.google.com/project/sukhifireworkes/firestore/data/~2Fcustomers~2F" + docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error("❌ Error adding customer to Firestore:", error);
    throw error;
  }
}

// Execute function
addCustomerToFirestore(customerData);
