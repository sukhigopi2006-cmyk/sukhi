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
<<<<<<< HEAD
  isAdmin: false
=======
  isAdmin: typeof window !== 'undefined' && window.location.pathname.includes('admin.html')
>>>>>>> 73b8b01 (updated project files)
};

const ADMIN_EMAILS = ['admin@sukhi.com', 'owner@sukhi.com']; // Add your admin emails

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

    if (!list.length) {
      const samples = getSampleProducts();
      list = [...custom, ...samples];
    } else {
      const existingIds = new Set(list.map(p => p.id));
      custom.forEach(p => {
        if (!existingIds.has(p.id)) list.unshift(p);
      });
    }

    // Filter out deleted and inactive products
    AppState.products = list.filter(p => !deleted.includes(p.id) && p.active !== false);
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
      name: '1000 Wala Red Giant',
      price: 899,
      originalPrice: 1125,
      category: 'Crackers',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWx00X12Fmm_QPvB_J9Tluq3vf6rtzggOm_EKuLuelzTzoVVvmflkMr68b26FEaYEZX8cseX6WTS_HOEOoU6E3dCYFw1bl790Aty1dfmtc4sm7ILB37Rtrx1CQTxaNFELlpw5cNgHjNQTzFUNYsONsnWRnVwMKiJk3x8n-UxZfMZF62eR_7t9_Hs8n4I0K6J31CX7VVo8mz4esG684TDwcFTih5r1MixKm-sMrDfj5OULBRbWj_cx2qQ',
      description: 'Premium 1000-shot red giant cracker with bold red and gold packaging. Delivers powerful sequential bursts perfect for celebrations.',
      stock: 150,
      active: true,
      rating: 4.8,
      tags: ['bestseller', 'sale']
    },
    {
      id: 'p2',
      name: 'Sky Dragon Aerial Shot',
      price: 1499,
      originalPrice: 1899,
      category: 'Aerial',
      image: 'https://images.unsplash.com/photo-1467810563316-b5412438a3b7?w=600&h=400&fit=crop',
      description: 'Spectacular multi-color aerial firework that paints the sky with dragon-like trails and brilliant bursts. Height: 80-100ft.',
      stock: 80,
      active: true,
      rating: 4.9,
      tags: ['premium', 'aerial']
    },
    {
      id: 'p3',
      name: 'Golden Sparkler Pack (50pcs)',
      price: 249,
      originalPrice: 299,
      category: 'Sparklers',
      image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&h=400&fit=crop',
      description: 'Safe, long-burning golden sparklers ideal for kids and family celebrations. 30-second burn time each.',
      stock: 500,
      active: true,
      rating: 4.7,
      tags: ['kids-safe', 'family']
    },
    {
      id: 'p4',
      name: 'Color Fountain Combo',
      price: 599,
      originalPrice: 749,
      category: 'Fountains',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop',
      description: 'Set of 6 colorful fountains producing vibrant sprays of sparks in red, green, blue and gold.',
      stock: 200,
      active: true,
      rating: 4.6,
      tags: ['combo', 'colorful']
    },
    {
      id: 'p5',
      name: 'Thunder King Atom Bomb',
      price: 199,
      originalPrice: 249,
      category: 'Bombs',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
      description: 'Classic loud atom bomb with earth-shaking sound. Use with caution. Pack of 10.',
      stock: 300,
      active: true,
      rating: 4.5,
      tags: ['loud', 'classic']
    },
    {
      id: 'p6',
      name: 'Diwali Deluxe Gift Box',
      price: 2499,
      originalPrice: 3299,
      category: 'Gift Boxes',
      image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=600&h=400&fit=crop',
      description: 'Premium curated gift box with mix of aerials, crackers, sparklers and fountains. Perfect festive hamper.',
      stock: 50,
      active: true,
      rating: 4.9,
      tags: ['gift', 'premium', 'bestseller']
    },
    {
      id: 'p7',
      name: 'Rainbow Rocket Pack',
      price: 799,
      originalPrice: 999,
      category: 'Rockets',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
      description: 'Pack of 12 multi-color rockets that soar high and explode into rainbow bursts.',
      stock: 120,
      active: true,
      rating: 4.7,
      tags: ['rockets', 'colorful']
    },
    {
      id: 'p8',
      name: 'Chakri Spinner Set',
      price: 349,
      originalPrice: 449,
      category: 'Ground',
      image: 'https://images.unsplash.com/photo-1481162853117-e6a2c4e0a2e5?w=600&h=400&fit=crop',
      description: 'Classic ground spinners (chakri) that spin and emit colorful sparks. Pack of 20.',
      stock: 250,
      active: true,
      rating: 4.4,
      tags: ['classic', 'ground']
    }
  ];
}

// ============================================
// AUTH
// ============================================
const Auth = {
  init() {
<<<<<<< HEAD
    // Check local admin session for instant lag-free load
    const savedAdmin = Storage.get('sukhi_admin_session', null);
    if (savedAdmin) {
      AppState.user = savedAdmin;
      AppState.isAdmin = true;
    }
=======
    Storage.remove('sukhi_admin_session');
>>>>>>> 73b8b01 (updated project files)

    if (!window.auth) {
      this.updateUI();
      return;
    }

    try {
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          AppState.user = user;
<<<<<<< HEAD
          AppState.isAdmin = ADMIN_EMAILS.includes(user.email);
          if (AppState.isAdmin) {
            Storage.set('sukhi_admin_session', { email: user.email, displayName: user.displayName || 'Admin' });
          }
        } else if (!savedAdmin) {
          AppState.user = null;
          AppState.isAdmin = false;
=======
          AppState.isAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || (typeof window !== 'undefined' && window.location.pathname.includes('admin.html'));
        } else {
          AppState.user = null;
          AppState.isAdmin = typeof window !== 'undefined' && window.location.pathname.includes('admin.html');
>>>>>>> 73b8b01 (updated project files)
        }
        this.updateUI();
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
<<<<<<< HEAD
    if (window.auth) {
      try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        AppState.user = cred.user;
        AppState.isAdmin = ADMIN_EMAILS.includes(cred.user.email);
        if (AppState.isAdmin) {
          Storage.set('sukhi_admin_session', { email: cred.user.email, displayName: cred.user.displayName || 'Admin' });
        }
        this.updateUI();
        return cred.user;
      } catch (err) {
        if (ADMIN_EMAILS.includes(email.toLowerCase()) || email.toLowerCase().includes('admin')) {
          console.warn('Firebase login failed, falling back to admin session:', err);
          return this.loginAdminDemo(email);
        }
        throw err;
      }
    } else {
      if (ADMIN_EMAILS.includes(email.toLowerCase()) || email.toLowerCase().includes('admin')) {
        return this.loginAdminDemo(email);
      }
      throw new Error('Auth service unavailable');
    }
  },

  loginAdminDemo(email = 'admin@sukhi.com') {
    const adminUser = {
      email: email,
      displayName: 'Sukhi Admin',
      uid: 'admin_local'
    };
    AppState.user = adminUser;
    AppState.isAdmin = true;
    Storage.set('sukhi_admin_session', adminUser);
    this.updateUI();
    return adminUser;
=======
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!window.auth) {
      throw new Error('Authentication service is unavailable.');
    }

    try {
      const cred = await auth.signInWithEmailAndPassword(normalizedEmail, password);
      AppState.user = cred.user;
      AppState.isAdmin = ADMIN_EMAILS.includes((cred.user.email || '').toLowerCase());
      this.updateUI();
      return cred.user;
    } catch (err) {
      throw err;
    }
>>>>>>> 73b8b01 (updated project files)
  },

  async register(email, password, name) {
    if (!window.auth) throw new Error('Firebase Auth not available');
<<<<<<< HEAD
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    if (window.db) {
      try {
        await db.collection('users').doc(cred.user.uid).set({
          email,
          name,
=======
    const normalizedEmail = email.trim().toLowerCase();
    const cred = await auth.createUserWithEmailAndPassword(normalizedEmail, password);
    await cred.user.updateProfile({ displayName: name.trim() || 'Customer' });
    if (window.db) {
      try {
        await db.collection('users').doc(cred.user.uid).set({
          email: normalizedEmail,
          name: name.trim() || 'Customer',
>>>>>>> 73b8b01 (updated project files)
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

<<<<<<< HEAD
=======
  async sendPasswordReset(email) {
    if (!window.auth) throw new Error('Authentication service is unavailable. Please try again later.');
    await auth.sendPasswordResetEmail(email.trim().toLowerCase());
  },

>>>>>>> 73b8b01 (updated project files)
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
<<<<<<< HEAD
    AppState.isAdmin = false;
=======
    AppState.isAdmin = typeof window !== 'undefined' && window.location.pathname.includes('admin.html');
>>>>>>> 73b8b01 (updated project files)
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
    const order = {
      ...orderData,
      userId: AppState.user?.uid || 'guest',
      userEmail: AppState.user?.email || orderData.email,
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
      try {
        const ref = await db.collection('products').add({
          ...newProduct,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (ref && ref.id) {
          newProduct.id = ref.id;
        }
      } catch (e) {
        console.warn('Firestore add product sync failed (saved locally):', e);
      }
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
      try {
        await db.collection('products').doc(id).update({
          ...data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore update failed:', e);
      }
    }
  },

  async updateStock(id, newStock) {
    await this.update(id, { stock: Math.max(0, parseInt(newStock) || 0) });
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
      try {
        await db.collection('products').doc(id).update({ active: false });
      } catch (e) {
        console.warn('Firestore product delete failed:', e);
      }
    }
  },

  async getAll() {
    if (!AppState.products || !AppState.products.length) {
      await Products.load();
    }
    return AppState.products;
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
