/**
 * Sukhi Fireworks E-Commerce - Core Application Logic
 * Handles Auth, Cart, Products, Wishlist, Orders
 */

// ============================================
// STATE
// ============================================
const AppState = {
  user: null,
  cart: [],
  wishlist: [],
  products: [],
  isAdmin: typeof window !== 'undefined' && window.location.pathname.includes('admin.html')
};

const ADMIN_EMAILS = ['admin@sukhi.com', 'owner@sukhi.com']; // Add your admin emails
const PRICE_MULTIPLIER = 2;

// ============================================
// LOCAL STORAGE HELPERS
// ============================================
const Storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// ============================================
// CART (works offline + syncs when logged in)
// ============================================
const Cart = {
  load() {
    AppState.cart = Storage.get('sukhi_cart', []);
    this.updateUI();
    return AppState.cart;
  },

  save() {
    Storage.set('sukhi_cart', AppState.cart);
    this.updateUI();
    if (AppState.user) this.syncToFirestore();
  },

  add(product, qty = 1) {
    const existing = AppState.cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      AppState.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || product.images?.[0] || '',
        qty
      });
    }
    this.save();
    showToast(`${product.name} added to cart`);
  },

  remove(productId) {
    AppState.cart = AppState.cart.filter(i => i.id !== productId);
    this.save();
  },

  updateQty(productId, qty) {
    const item = AppState.cart.find(i => i.id === productId);
    if (item) {
      item.qty = Math.max(1, qty);
      this.save();
    }
  },

  clear() {
    AppState.cart = [];
    this.save();
  },

  getTotal() {
    return AppState.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  },

  getCount() {
    return AppState.cart.reduce((sum, i) => sum + i.qty, 0);
  },

  updateUI() {
    const countEls = document.querySelectorAll('[data-cart-count]');
    const count = this.getCount();
    countEls.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  async syncToFirestore() {
    if (!AppState.user || !window.db) return;
    try {
      await db.collection('users').doc(AppState.user.uid).set({
        cart: AppState.cart,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Cart sync failed', e);
    }
  },

  async loadFromFirestore() {
    if (!AppState.user || !window.db) return;
    try {
      const doc = await db.collection('users').doc(AppState.user.uid).get();
      if (doc.exists && doc.data().cart) {
        AppState.cart = doc.data().cart;
        this.save();
      }
    } catch (e) {
      console.warn('Load cart failed', e);
    }
  }
};

// ============================================
// WISHLIST
// ============================================
const Wishlist = {
  load() {
    AppState.wishlist = Storage.get('sukhi_wishlist', []);
    this.updateUI();
    return AppState.wishlist;
  },

  save() {
    Storage.set('sukhi_wishlist', AppState.wishlist);
    this.updateUI();
    if (AppState.user) this.syncToFirestore();
  },

  toggle(product) {
    const idx = AppState.wishlist.findIndex(i => i.id === product.id);
    if (idx >= 0) {
      AppState.wishlist.splice(idx, 1);
      showToast('Removed from wishlist');
    } else {
      AppState.wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || product.images?.[0] || ''
      });
      showToast('Added to wishlist');
    }
    this.save();
    return idx < 0;
  },

  has(productId) {
    return AppState.wishlist.some(i => i.id === productId);
  },

  remove(productId) {
    AppState.wishlist = AppState.wishlist.filter(i => i.id !== productId);
    this.save();
  },

  updateUI() {
    const countEls = document.querySelectorAll('[data-wishlist-count]');
    countEls.forEach(el => {
      el.textContent = AppState.wishlist.length;
      el.style.display = AppState.wishlist.length > 0 ? 'flex' : 'none';
    });
  },

  async syncToFirestore() {
    if (!AppState.user || !window.db) return;
    try {
      await db.collection('users').doc(AppState.user.uid).set({
        wishlist: AppState.wishlist,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Wishlist sync failed', e);
    }
  }
};

// ============================================
// PRODUCTS
// ============================================
const Products = {
  async load() {
    let list = [];
    if (window.db) {
      try {
        const snap = await db.collection('products').where('active', '==', true).get();
        if (!snap.empty) {
          list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.warn('Firestore products load failed, using local/sample data', e);
      }
    }

    const custom = Storage.get('sukhi_custom_products', []);
    const deleted = Storage.get('sukhi_deleted_products', []);
    const samples = getSampleProducts();
    const hasCurrentPriceList = list.length > 0 && list.every(product => product.singlePieceRate != null);

    if (!list.length || !hasCurrentPriceList) {
      list = [...custom, ...samples];
    } else {
      const existingIds = new Set(list.map(p => p.id));
      custom.forEach(p => {
        if (!existingIds.has(p.id)) list.unshift(p);
      });
    }

    // Filter out deleted and inactive products
    AppState.products = list.filter(p => !deleted.includes(p.id) && p.active !== false);
    const currentPrices = new Map(AppState.products.map(product => [product.id, product]));
    AppState.cart = AppState.cart.map(item => {
      const product = currentPrices.get(item.id);
      return product ? { ...item, name: product.name, price: product.price, image: product.image || item.image } : item;
    });
    Storage.set('sukhi_cart', AppState.cart);
    return AppState.products;
  },

  getById(id) {
    return AppState.products.find(p => p.id === id);
  },

  getByCategory(cat) {
    if (!cat || cat === 'all') return AppState.products;
    return AppState.products.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase());
  }
};

function getSampleProducts() {
  return [
    {
      id: 'p1',
      name: '7" PENCIL SINGLE BOX',
      price: 67.5,
      category: 'Pencils',
      packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 70, ratePerUnit: 67.5, singlePieceRate: 0.96,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWx00X12Fmm_QPvB_J9Tluq3vf6rtzggOm_EKuLuelzTzoVVvmflkMr68b26FEaYEZX8cseX6WTS_HOEOoU6E3dCYFw1bl790Aty1dfmtc4sm7ILB37Rtrx1CQTxaNFELlpw5cNgHjNQTzFUNYsONsnWRnVwMKiJk3x8n-UxZfMZF62eR_7t9_Hs8n4I0K6J31CX7VVo8mz4esG684TDwcFTih5r1MixKm-sMrDfj5OULBRbWj_cx2qQ',
      description: '7 inch pencil firework, single box.', stock: 100, active: true, rating: 4.8, tags: ['pencil']
    },
    {
      id: 'p2',
      name: '7" PENCIL BIG BOX', price: 68.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 70, ratePerUnit: 68.5, singlePieceRate: 0.98,
      description: '7 inch pencil firework, big box.', stock: 100, active: true, rating: 4.8, tags: ['pencil']
    },
    { id: 'p3', name: '10" PENCIL', price: 127.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 40, ratePerUnit: 127.5, singlePieceRate: 3.19, description: '10 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p4', name: '10" PENCIL (U.V BOX)', price: 134.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 40, ratePerUnit: 134.5, singlePieceRate: 3.36, description: '10 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p5', name: '12" PENCIL', price: 167, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 26, ratePerUnit: 167, singlePieceRate: 6.42, description: '12 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p6', name: '12" PENCIL (U.V BOX)', price: 174, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 26, ratePerUnit: 174, singlePieceRate: 6.69, description: '12 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p7', name: '15" PENCIL', price: 260, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16.5, ratePerUnit: 260, singlePieceRate: 15.76, description: '15 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p8', name: '15" PENCIL (U.V BOX)', price: 270, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16.5, ratePerUnit: 270, singlePieceRate: 16.36, description: '15 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p9', name: '18" PENCIL', price: 310, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 12.5, ratePerUnit: 310, singlePieceRate: 24.8, description: '18 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p10', name: '18" PENCIL (U.V BOX)', price: 320, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 12.5, ratePerUnit: 320, singlePieceRate: 25.6, description: '18 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p11', name: 'GROUND CHAKKER BIG (U.V)', price: 92, category: 'Ground Chakker', packSize: '25 PCS UNIT', quantityPerCarton: 25, contents: 58, ratePerUnit: 92, singlePieceRate: 1.59, description: 'Big ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p12', name: 'GROUND CHAKKER BIG', price: 100, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 46, ratePerUnit: 100, singlePieceRate: 2.17, description: 'Big ground chakker.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p13', name: 'G.C SPECIAL (U.V)', price: 184, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 27, ratePerUnit: 184, singlePieceRate: 6.81, description: 'Special ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p14', name: 'GROUND CHAKKER DX (U.V)', price: 355, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16, ratePerUnit: 355, singlePieceRate: 22.19, description: 'Deluxe ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p15', name: 'FLOWER POTS SPECIAL (U.V)', price: 238, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 14, ratePerUnit: 238, singlePieceRate: 17, description: 'Special flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
    { id: 'p16', name: 'FLOWER POTS ASOKA (U.V)', price: 300, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 9, ratePerUnit: 300, singlePieceRate: 33.33, description: 'Asoka flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
    { id: 'p17', name: 'COLOUR KOTI (U.V)', price: 520, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 7, ratePerUnit: 520, singlePieceRate: 74.29, description: 'Colour Koti flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
    { id: 'p18', name: 'JIL JIL', price: 67, category: 'Twinkling Star', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 100, ratePerUnit: 67, singlePieceRate: 0.67, description: 'Twinkling star firework.', stock: 100, active: true, rating: 4.8, tags: ['twinkling star'] }
  ].map(product => ({
    ...product,
    priceVersion: 2,
    price: Number((product.price * PRICE_MULTIPLIER).toFixed(2)),
    ratePerUnit: product.ratePerUnit == null ? product.ratePerUnit : Number((product.ratePerUnit * PRICE_MULTIPLIER).toFixed(2)),
    singlePieceRate: product.singlePieceRate == null ? product.singlePieceRate : Number((product.singlePieceRate * PRICE_MULTIPLIER).toFixed(2)),
    originalPrice: product.originalPrice == null ? product.originalPrice : Number((product.originalPrice * PRICE_MULTIPLIER).toFixed(2))
  }));
}

const Offers = {
  defaults: [
    { id: 'offer-5-off', text: 'Flat 5% off on selected fireworks', active: true, image: '' }
  ],

  async getAll() {
    if (window.db) {
      try {
        const snap = await db.collection('offers').orderBy('createdAt', 'desc').get();
        if (!snap.empty) return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.warn('Offers load failed, using defaults:', error);
      }
    }
    return Storage.get('sukhi_offers', this.defaults);
  },

  async save(offer) {
    const saved = { ...offer, active: offer.active !== false, updatedAt: new Date().toISOString() };
    const local = Storage.get('sukhi_offers', this.defaults).filter(item => item.id !== saved.id);
    Storage.set('sukhi_offers', [saved, ...local]);
    if (window.db) {
      const ref = db.collection('offers').doc(saved.id || `offer-${Date.now()}`);
      await ref.set({ ...saved, createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      saved.id = ref.id;
    }
    return saved;
  },

  async remove(id) {
    Storage.set('sukhi_offers', Storage.get('sukhi_offers', this.defaults).filter(item => item.id !== id));
    if (window.db) await db.collection('offers').doc(id).delete();
  }
};

// ============================================
// AUTH
// ============================================
const Auth = {
  init() {
    Storage.remove('sukhi_admin_session');

    if (!window.auth) {
      this.updateUI();
      return;
    }

    try {
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          AppState.user = user;
          AppState.isAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || (typeof window !== 'undefined' && window.location.pathname.includes('admin.html'));
          if (AppState.isAdmin) {
            Storage.set('sukhi_admin_session', { email: user.email, displayName: user.displayName || 'Admin' });
          }
        } else {
          AppState.user = null;
          AppState.isAdmin = typeof window !== 'undefined' && window.location.pathname.includes('admin.html');
        }
        this.updateUI();
        if (typeof window.checkAdminAuthentication === 'function') window.checkAdminAuthentication();
        if (user) {
          await Cart.loadFromFirestore();
          await Wishlist.syncToFirestore();
        }
      });
    } catch (e) {
      console.warn('Auth init failed:', e);
      this.updateUI();
    }
  },

  async login(email, password) {
    if (!window.firebaseConfigStatus?.ready) throw new Error(window.firebaseConfigStatus?.message || 'Firebase customer login is not configured.');
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!window.auth) {
      throw new Error('Authentication service is unavailable.');
    }

    try {
      const cred = await auth.signInWithEmailAndPassword(normalizedEmail, password);
      AppState.user = cred.user;
      AppState.isAdmin = ADMIN_EMAILS.includes((cred.user.email || '').toLowerCase());
      if (AppState.isAdmin) {
        Storage.set('sukhi_admin_session', { email: cred.user.email, displayName: cred.user.displayName || 'Admin' });
      }
      this.updateUI();
      return cred.user;
    } catch (err) {
      throw err;
    }
  },

  async register(email, password, name) {
    if (!window.firebaseConfigStatus?.ready) throw new Error(window.firebaseConfigStatus?.message || 'Firebase customer login is not configured.');
    if (!window.auth) throw new Error('Firebase Auth not available');
    const normalizedEmail = email.trim().toLowerCase();
    const cred = await auth.createUserWithEmailAndPassword(normalizedEmail, password);
    await cred.user.updateProfile({ displayName: name.trim() || 'Customer' });
    if (window.db) {
      try {
        await db.collection('users').doc(cred.user.uid).set({
          email: normalizedEmail,
          name: name.trim() || 'Customer',
          role: 'customer',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          cart: [],
          wishlist: []
        });
      } catch (e) {
        console.warn('Firestore user save failed', e);
      }
    }
    return cred.user;
  },

  async sendPasswordReset(email) {
    if (!window.firebaseConfigStatus?.ready) throw new Error(window.firebaseConfigStatus?.message || 'Firebase customer login is not configured.');
    if (!window.auth) throw new Error('Authentication service is unavailable. Please try again later.');
    await auth.sendPasswordResetEmail(email.trim().toLowerCase());
  },

  async logout() {
    Storage.remove('sukhi_admin_session');
    if (window.auth) {
      try {
        await auth.signOut();
      } catch (e) {
        console.warn('Sign out error', e);
      }
    }
    AppState.user = null;
    AppState.isAdmin = typeof window !== 'undefined' && window.location.pathname.includes('admin.html');
    this.updateUI();
  },

  updateUI() {
    const loginBtns = document.querySelectorAll('[data-auth-login]');
    const userMenus = document.querySelectorAll('[data-auth-user]');
    const nameEls = document.querySelectorAll('[data-user-name]');
    const adminLinks = document.querySelectorAll('[data-admin-only]');

    if (AppState.user) {
      loginBtns.forEach(el => el.style.display = 'none');
      userMenus.forEach(el => el.style.display = 'flex');
      nameEls.forEach(el => el.textContent = AppState.user.displayName || AppState.user.email?.split('@')[0] || 'User');
      adminLinks.forEach(el => el.style.display = AppState.isAdmin ? 'block' : 'none');
    } else {
      loginBtns.forEach(el => el.style.display = 'flex');
      userMenus.forEach(el => el.style.display = 'none');
      adminLinks.forEach(el => el.style.display = 'none');
    }
  }
};

// ============================================
// ORDERS
// ============================================
const Orders = {
  async create(orderData) {
    if (!window.db) throw new Error('Database not ready');
    if (!AppState.user) throw new Error('Please sign in before placing an order.');

    const customer = await Customers.upsert(orderData.delivery || {});
    const order = {
      ...orderData,
      userId: AppState.user.uid,
      userEmail: AppState.user.email,
      customerId: customer.id,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      items: AppState.cart,
      total: Cart.getTotal(),
      itemCount: Cart.getCount()
    };
    const ref = await db.collection('orders').add(order);
    Cart.clear();
    return { id: ref.id, ...order };
  },

  async getUserOrders() {
    if (!AppState.user || !window.db) return [];
    const snap = await db.collection('orders')
      .where('userId', '==', AppState.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getAllOrders() {
    if (!window.db) return [];
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateStatus(orderId, status) {
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
};

// ============================================
// CUSTOMERS
// ============================================
const Customers = {
  /**
   * Create a customer data object and add it to Firestore collection using the add() method
   * @param {Object} details - Customer details (name, email, phone, address, etc.)
   * @returns {Promise<Object>} The added customer object with Firestore document ID
   */
  async add(details = {}) {
    // 1. Create a customer data object with the details
    const customerData = {
      name: details.name || 'Rajesh Sharma',
      email: details.email || 'rajesh.sharma@example.com',
      phone: details.phone || '+91 98765 43210',
      address: {
        street: details.street || details.address?.street || '42 MG Road, Gandhi Nagar',
        city: details.city || details.address?.city || 'Bengaluru',
        state: details.state || details.address?.state || 'Karnataka',
        pincode: details.pincode || details.address?.pincode || '560001',
        country: 'India'
      },
      status: details.status || 'active',
      totalOrders: details.totalOrders || 0,
      totalSpent: details.totalSpent || 0,
      createdAt: window.firebase ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
    };

    // 2. Add it to Firestore collection 'customers' using the add() method
    if (window.db) {
      try {
        const docRef = await db.collection('customers').add(customerData);
        console.log('Customer successfully added to Firestore! Document ID:', docRef.id);
        
        // Cache locally
        const localList = Storage.get('sukhi_customers', []);
        localList.unshift({ id: docRef.id, ...customerData });
        Storage.set('sukhi_customers', localList);

        return { id: docRef.id, ...customerData };
      } catch (error) {
        console.error('Error adding customer to Firestore:', error);
        throw error;
      }
    } else {
      const localId = 'cust_' + Date.now();
      const localList = Storage.get('sukhi_customers', []);
      localList.unshift({ id: localId, ...customerData });
      Storage.set('sukhi_customers', localList);
      return { id: localId, ...customerData };
    }
  },

  async upsert(details = {}) {
    if (!AppState.user || !window.db) throw new Error('A signed-in customer is required.');
    const customerData = {
      userId: AppState.user.uid,
      name: details.name || details['Full Name *'] || AppState.user.displayName || 'Customer',
      email: details.email || AppState.user.email,
      phone: details.phone || details['Phone Number *'] || '',
      address: {
        street: details.street || details['Street Address *'] || '',
        unit: details.unit || details['Door / Flat No. *'] || '',
        landmark: details.landmark || details.Landmark || '',
        city: details.city || details['City *'] || '',
        state: details.state || details['State / Province *'] || '',
        pincode: details.pincode || details['Pincode / Zip *'] || '',
        country: 'India'
      },
      status: 'active',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = db.collection('customers').doc(AppState.user.uid);
    const existing = await ref.get();
    if (!existing.exists) customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await ref.set(customerData, { merge: true });
    return { id: ref.id, ...customerData };
  },

  async getAll() {
    if (window.db) {
      try {
        const snap = await db.collection('customers').orderBy('createdAt', 'desc').get();
        if (!snap.empty) {
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn('Firestore customers fetch failed, using local list:', e);
      }
    }
    return Storage.get('sukhi_customers', []);
  }
};

// ============================================
// ADMIN PRODUCTS
// ============================================
const AdminProducts = {
  async add(product) {
    const newId = 'prod_' + Date.now();
    const newProduct = {
      id: newId,
      name: product.name || 'Firework Item',
      price: Number(product.price) || 0,
      priceVersion: 2,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : Math.round((Number(product.price) || 100) * 1.3),
      category: product.category || 'Crackers',
      image: product.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWx00X12Fmm_QPvB_J9Tluq3vf6rtzggOm_EKuLuelzTzoVVvmflkMr68b26FEaYEZX8cseX6WTS_HOEOoU6E3dCYFw1bl790Aty1dfmtc4sm7ILB37Rtrx1CQTxaNFELlpw5cNgHjNQTzFUNYsONsnWRnVwMKiJk3x8n-UxZfMZF62eR_7t9_Hs8n4I0K6J31CX7VVo8mz4esG684TDwcFTih5r1MixKm-sMrDfj5OULBRbWj_cx2qQ',
      description: product.description || 'Premium festive fireworks from Sukhi Fireworks.',
      stock: parseInt(product.stock) || 50,
      active: true,
      rating: 4.8,
      tags: product.tags || ['new', 'festive'],
      createdAt: new Date().toISOString()
    };

    // 1. Save to custom products storage
    const custom = Storage.get('sukhi_custom_products', []);
    custom.unshift(newProduct);
    Storage.set('sukhi_custom_products', custom);

    // 2. Also ensure not in deleted
    const deleted = Storage.get('sukhi_deleted_products', []);
    const filteredDeleted = deleted.filter(id => id !== newId);
    Storage.set('sukhi_deleted_products', filteredDeleted);

    // 3. Update active AppState
    if (!AppState.products.some(p => p.id === newProduct.id)) {
      AppState.products.unshift(newProduct);
    }

    // 4. Try Firestore sync if available
    if (window.db) {
      const ref = db.collection('products').doc(newId);
      await ref.set({ ...newProduct, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    return newProduct;
  },

  async update(id, data) {
    // Update local storage
    const custom = Storage.get('sukhi_custom_products', []);
    const idx = custom.findIndex(p => p.id === id);
    if (idx >= 0) {
      custom[idx] = { ...custom[idx], ...data };
      Storage.set('sukhi_custom_products', custom);
    }

    const stateProd = AppState.products.find(p => p.id === id);
    if (stateProd) {
      Object.assign(stateProd, data);
    }

    if (window.db) {
      await db.collection('products').doc(id).set({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  },

  async updateStock(id, newStock) {
    await this.update(id, { stock: Math.max(0, parseInt(newStock) || 0) });
  },

  async doubleAllPrices() {
    if (!window.db) throw new Error('Firestore is not available.');
    const snapshot = await db.collection('products').get();
    let batch = db.batch();
    let count = 0;
    for (const doc of snapshot.docs) {
      const product = doc.data();
      if (Number(product.priceVersion) >= 2) continue;
      const changes = {
        price: Number((Number(product.price || 0) * PRICE_MULTIPLIER).toFixed(2)),
        priceVersion: 2,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (product.originalPrice != null) changes.originalPrice = Number((Number(product.originalPrice) * PRICE_MULTIPLIER).toFixed(2));
      if (product.ratePerUnit != null) changes.ratePerUnit = Number((Number(product.ratePerUnit) * PRICE_MULTIPLIER).toFixed(2));
      if (product.singlePieceRate != null) changes.singlePieceRate = Number((Number(product.singlePieceRate) * PRICE_MULTIPLIER).toFixed(2));
      batch.update(doc.ref, changes);
      count++;
      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count) await batch.commit();
    Storage.remove('sukhi_custom_products');
    return snapshot.size;
  },

  async delete(id) {
    // Add to deleted products list
    const deleted = Storage.get('sukhi_deleted_products', []);
    if (!deleted.includes(id)) {
      deleted.push(id);
      Storage.set('sukhi_deleted_products', deleted);
    }

    // Remove from custom products
    let custom = Storage.get('sukhi_custom_products', []);
    custom = custom.filter(p => p.id !== id);
    Storage.set('sukhi_custom_products', custom);

    // Remove from AppState
    AppState.products = AppState.products.filter(p => p.id !== id);

    if (window.db) {
      await db.collection('products').doc(id).set({
        active: false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  },

  async getAll() {
    if (!AppState.products || !AppState.products.length) {
      await Products.load();
    }
    return AppState.products;
  },

  async replaceCatalog(products) {
    Storage.set('sukhi_custom_products', []);
    Storage.set('sukhi_deleted_products', []);
    AppState.products = products.map(product => ({ ...product }));

    if (!window.db) return;

    const snapshot = await db.collection('products').get();
    let batch = db.batch();
    let operationCount = 0;
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;
      if (operationCount === 400) {
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }
    for (const product of products) {
      const ref = db.collection('products').doc(product.id);
      batch.set(ref, {
        ...product,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      if (operationCount === 400) {
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }
    if (operationCount > 0) await batch.commit();
  }
};

// ============================================
// UI HELPERS
// ============================================
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-2';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm animate-slide-up ${
    type === 'error' ? 'bg-red-600' : type === 'info' ? 'bg-sky-600' : 'bg-emerald-600'
  }`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  Cart.load();
  Wishlist.load();
  Auth.init();

  // Global click handlers for cart/wishlist buttons
  document.body.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-cart]');
    if (addBtn) {
      const id = addBtn.dataset.addCart;
      const product = Products.getById(id) || {
        id,
        name: addBtn.dataset.name,
        price: Number(addBtn.dataset.price),
        image: addBtn.dataset.image
      };
      Cart.add(product);
    }

    const wishBtn = e.target.closest('[data-toggle-wishlist]');
    if (wishBtn) {
      const id = wishBtn.dataset.toggleWishlist;
      const product = Products.getById(id) || {
        id,
        name: wishBtn.dataset.name,
        price: Number(wishBtn.dataset.price),
        image: wishBtn.dataset.image
      };
      const added = Wishlist.toggle(product);
      const icon = wishBtn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.style.fontVariationSettings = added ? "'FILL' 1" : "'FILL' 0";
        icon.classList.toggle('text-primary', added);
      }
    }
  });
});

// Make available globally
window.AppState = AppState;
window.Cart = Cart;
window.Wishlist = Wishlist;
window.Products = Products;
window.Auth = Auth;
window.Orders = Orders;
window.Customers = Customers;
window.AdminProducts = AdminProducts;
window.showToast = showToast;
window.formatPrice = formatPrice;
window.getQueryParam = getQueryParam;
window.getSampleProducts = getSampleProducts;
window.Offers = Offers;
