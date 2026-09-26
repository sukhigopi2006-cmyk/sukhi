/**
 * Sukhi Fireworks E-Commerce - Core Application Logic
 * Handles Auth, Cart, Products, Wishlist, Orders
 */

// ============================================
// EMAILJS BACKGROUND EMAIL SENDER
// ============================================
const EmailService = {
  // EmailJS public key and service/template IDs
  PUBLIC_KEY: 'YOUR_EMAILJS_PUBLIC_KEY',    // Replace with your EmailJS public key
  SERVICE_ID: 'service_sukhi',              // Replace with your EmailJS service ID
  TEMPLATE_ID: 'template_order_notify',     // Replace with your EmailJS template ID
  ADMIN_EMAIL: 'sukhigopi2006@gmail.com',
  _initialized: false,

  async init() {
    if (this._initialized || typeof emailjs === 'undefined') return;
    try {
      emailjs.init(this.PUBLIC_KEY);
      this._initialized = true;
    } catch (e) {
      console.warn('EmailJS init failed:', e);
    }
  },

  /**
   * Send order notification silently to admin via EmailJS.
   * No mail client popup - runs entirely in the background.
   */
  async sendOrderNotification(order) {
    await this.init();
    if (typeof emailjs === 'undefined') {
      console.warn('EmailJS not loaded - skipping background email');
      return { success: false, reason: 'emailjs_not_loaded' };
    }
    const delivery = order.delivery || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsSummary = items.map(i => `${i.name} x${i.qty || 1} @ ₹${Number(i.price || 0).toFixed(2)}`).join(' | ');
    const templateParams = {
      to_email: this.ADMIN_EMAIL,
      order_id: order.id || 'N/A',
      customer_name: delivery.name || 'Customer',
      customer_email: delivery.email || order.customerEmail || 'N/A',
      customer_phone: delivery.phone || 'N/A',
      shipping_address: [
        delivery.unit, delivery.street || delivery.address,
        delivery.city, delivery.district, delivery.state, delivery.pincode
      ].filter(Boolean).join(', '),
      items_summary: itemsSummary || 'No items',
      order_total: '₹' + Number(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      order_status: order.status || 'Pending',
      order_date: order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')
    };
    try {
      const result = await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, templateParams);
      console.log('Admin email sent via EmailJS:', result.status);
      return { success: true, status: result.status };
    } catch (err) {
      console.warn('EmailJS send failed:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Send order status update notification.
   */
  async sendStatusUpdate(order, newStatus) {
    await this.init();
    if (typeof emailjs === 'undefined') return { success: false };
    const delivery = order.delivery || {};
    const STATUS_TEMPLATE_ID = 'template_status_update'; // Replace with your EmailJS status template ID
    const templateParams = {
      to_email: this.ADMIN_EMAIL,
      order_id: order.id || 'N/A',
      customer_name: delivery.name || 'Customer',
      new_status: newStatus,
      order_total: '₹' + Number(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    };
  },

  /**
   * Send order notification or invoice directly to customer.
   */
  async sendCustomerOrderNotification(order, options = {}) {
    await this.init();
    const delivery = order.delivery || {};
    const targetEmail = (options.targetEmail || order.customerEmail || delivery.email || '').trim();
    if (!targetEmail) return { success: false, reason: 'missing_customer_email' };

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsSummary = items.map(i => `${i.name} x${i.qty || 1} @ ₹${Number(i.price || 0).toFixed(2)}`).join(' | ');
    const templateParams = {
      to_email: targetEmail,
      order_id: order.id || 'N/A',
      customer_name: delivery.name || 'Valued Customer',
      customer_email: targetEmail,
      customer_phone: delivery.phone || 'N/A',
      shipping_address: [
        delivery.unit, delivery.street || delivery.address,
        delivery.city, delivery.district, delivery.state, delivery.pincode
      ].filter(Boolean).join(', '),
      items_summary: itemsSummary || 'No items',
      order_total: '₹' + Number(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      order_status: order.status || 'Pending',
      custom_note: options.note || '',
      subject: options.subject || `Order Confirmation & Invoice #${order.id} - Sukhi Fireworks`,
      admin_cc: options.ccAdmin ? this.ADMIN_EMAIL : ''
    };
    if (typeof emailjs === 'undefined') {
      return { success: false, reason: 'emailjs_not_loaded' };
    }
    try {
      const result = await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, templateParams);
      console.log('Customer email sent via EmailJS:', result.status);
      return { success: true, status: result.status, targetEmail };
    } catch (err) {
      console.warn('EmailJS customer send failed:', err);
      return { success: false, error: err };
    }
  }
};
window.EmailService = EmailService;


// ============================================
// STATE
// ============================================
const AppState = {
  user: null,
  cart: [],
  wishlist: [],
  products: [],
  isAdmin: typeof window !== 'undefined' && (
    window.location.pathname.includes('admin.html') ||
    !!(localStorage.getItem('sukhi_admin_session'))
  )
};

const FIXED_ADMIN_CREDENTIALS = {
  usernames: ['sukhigopi', 'sukhigopi2006@gmail.com', 'admin'],
  passwords: ['chikko']
};

const ADMIN_EMAILS = ['sukhigopi2006@gmail.com', 'admin@sukhi.com', 'owner@sukhi.com'];
const PRICE_MULTIPLIER = 2;

function formatProductImageUrl(path, fallback = 'pics/pencil_trademark_transparent.png') {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!trimmed) return fallback;

  // External URL or data URI
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Remove leading slash if present
  const normalized = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;

  // Check if already prefixed with known directory path
  if (normalized.startsWith('uploads/') ||
      normalized.startsWith('assets/') ||
      normalized.startsWith('images/') ||
      normalized.startsWith('pics/')) {
    return normalized;
  }

  // Bare filename -> prepend uploads/
  return `uploads/${normalized}`;
}
window.formatProductImageUrl = formatProductImageUrl;

const PRODUCT_IMAGE_MAP = {
  p1: 'uploads/p2.jpeg',
  p2: 'uploads/p2.jpeg',
  p3: 'uploads/p4.jpeg',
  p4: 'uploads/p4.jpeg',
  p5: 'uploads/p6.jpeg',
  p6: 'uploads/p6.jpeg',
  p7: 'uploads/p8.jpeg',
  p8: 'uploads/p8.jpeg',
  p9: 'uploads/p10.jpeg',
  p10: 'uploads/p10.jpeg',
  p11: 'uploads/p11.jpeg',
  p12: 'uploads/p11.jpeg',
  p13: 'uploads/p13.jpeg',
  p14: 'uploads/p14.jpeg',
  p15: 'uploads/p15.jpeg',
  p16: 'uploads/p16.jpeg',
  p17: 'uploads/p17.jpeg',
  p18: 'uploads/p18.jpeg'
};

function getProductImageUrl(productId, fallback = '') {
  const safeId = String(productId || '').trim().toLowerCase();
  if (PRODUCT_IMAGE_MAP[safeId]) {
    return PRODUCT_IMAGE_MAP[safeId];
  }
  if (fallback && typeof fallback === 'string' && fallback.trim()) {
    return formatProductImageUrl(fallback);
  }
  if (!safeId) return 'pics/pencil_trademark_transparent.png';

  const normalized = safeId.replace(/^id\s+/, '').replace(/^prod_/, '');
  if (PRODUCT_IMAGE_MAP[normalized]) {
    return PRODUCT_IMAGE_MAP[normalized];
  }
  return `uploads/${safeId.startsWith('p') ? safeId : normalized}.jpeg`;
}
window.getProductImageUrl = getProductImageUrl;

function handleImageError(img) {
  if (!img || img.__fallbackHandled) return;
  const currentSrc = img.getAttribute('src') || img.src || '';
  const attempts = parseInt(img.dataset.imgAttempts || '0', 10);
  img.dataset.imgAttempts = String(attempts + 1);

  const cleanPath = currentSrc.split('?')[0].split('#')[0];
  const filename = cleanPath.split('/').pop();

  if (!filename || filename === 'pencil_trademark_transparent.png') {
    img.__fallbackHandled = true;
    img.src = 'pics/pencil_trademark_transparent.png';
    return;
  }

  if (attempts === 0) {
    img.src = 'uploads/' + filename;
  } else if (attempts === 1) {
    img.src = 'assets/' + filename;
  } else if (attempts === 2) {
    img.src = 'images/' + filename;
  } else if (attempts === 3) {
    img.src = 'pics/' + filename;
  } else {
    img.__fallbackHandled = true;
    img.src = 'pics/pencil_trademark_transparent.png';
  }
}
window.handleImageError = handleImageError;

if (typeof window !== 'undefined') {
  window.addEventListener('error', function (event) {
    if (event.target && event.target.tagName === 'IMG') {
      handleImageError(event.target);
    }
  }, true);
}

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
    const pId = String(product.id || '').trim();
    const existing = AppState.cart.find(i => String(i.id).trim() === pId);
    const numPrice = Number(product.price) || 0;
    const numQty = parseInt(qty) || 1;
    const imgUrl = formatProductImageUrl(product.image || product.images?.[0] || getProductImageUrl(pId));
    if (existing) {
      existing.qty += numQty;
    } else {
      AppState.cart.push({
        id: pId,
        name: product.name || 'Firework Item',
        price: numPrice,
        image: imgUrl,
        qty: numQty
      });
    }
    this.save();
    showToast(`${product.name || 'Product'} added to cart`);
  },

  remove(productId) {
    const pId = String(productId || '').trim();
    AppState.cart = AppState.cart.filter(i => String(i.id).trim() !== pId);
    this.save();
  },

  updateQty(productId, qty) {
    const pId = String(productId || '').trim();
    const item = AppState.cart.find(i => String(i.id).trim() === pId);
    if (item) {
      item.qty = Math.max(1, parseInt(qty) || 1);
      this.save();
    }
  },

  clear() {
    AppState.cart = [];
    this.save();
  },

  getTotal() {
    return AppState.cart.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.qty) || 1)), 0);
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
        image: formatProductImageUrl(product.image || product.images?.[0] || getProductImageUrl(product.id))
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
          list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (err) {
        console.warn('Firestore products load failed, using local/cached catalog:', err);
      }
    }

    const custom = Storage.get('sukhi_custom_products', []);
    const deleted = Storage.get('sukhi_deleted_products', []);
    const samples = getSampleProducts();
    const merged = new Map();

    // Merge: samples -> list (Firestore) -> custom (local additions)
    const sources = [...samples, ...list, ...custom];

    sources.forEach(product => {
      if (!product || !product.id || deleted.includes(product.id) || product.active === false) return;
      const nextProduct = {
        ...product,
        price: Number(product.price) || 0,
        originalPrice: product.originalPrice != null ? Number(product.originalPrice) : Math.round((Number(product.price) || 100) * 1.25),
        stock: product.stock != null ? Number(product.stock) : 50,
        image: formatProductImageUrl(product.image || getProductImageUrl(product.id, ''))
      };
      merged.set(product.id, nextProduct);
    });

    AppState.products = Array.from(merged.values());
    const currentProducts = new Map(AppState.products.map(product => [product.id, product]));
    AppState.cart = AppState.cart.map(item => {
      const product = currentProducts.get(item.id);
      return product ? { ...item, name: product.name, price: Number(product.price) || item.price, image: product.image || item.image } : item;
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
  },

  getCategories() {
    const defaultCats = ['Pencils', 'Ground Chakker', 'Flower Pots', 'Twinkling Star', 'Rockets', 'Sparklers'];
    const customCats = Storage.get('sukhi_custom_categories', []);
    const prodCats = (AppState.products || []).map(p => p.category).filter(Boolean);
    const seen = new Set();
    const result = [];
    [...defaultCats, ...customCats, ...prodCats].forEach(c => {
      const trimmed = (c || '').trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    });
    return result;
  },

  addCategory(name) {
    if (!name || !name.trim()) return false;
    const cat = name.trim();
    const customCats = Storage.get('sukhi_custom_categories', []);
    if (!customCats.some(c => c.toLowerCase() === cat.toLowerCase())) {
      customCats.push(cat);
      Storage.set('sukhi_custom_categories', customCats);
    }
    return cat;
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
      image: getProductImageUrl('p1'),
      description: '7 inch pencil firework, single box.', stock: 100, active: true, rating: 4.8, tags: ['pencil']
    },
    {
      id: 'p2',
      name: '7" PENCIL BIG BOX', price: 68.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 70, ratePerUnit: 68.5, singlePieceRate: 0.98,
      image: getProductImageUrl('p2'),
      description: '7 inch pencil firework, big box.', stock: 100, active: true, rating: 4.8, tags: ['pencil']
    },
    { id: 'p3', name: '10" PENCIL', price: 127.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 40, ratePerUnit: 127.5, singlePieceRate: 3.19, image: getProductImageUrl('p3'), description: '10 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p4', name: '10" PENCIL (U.V BOX)', price: 134.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 40, ratePerUnit: 134.5, singlePieceRate: 3.36, image: getProductImageUrl('p4'), description: '10 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p5', name: '12" PENCIL', price: 167, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 26, ratePerUnit: 167, singlePieceRate: 6.42, image: getProductImageUrl('p5'), description: '12 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p6', name: '12" PENCIL (U.V BOX)', price: 174, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 26, ratePerUnit: 174, singlePieceRate: 6.69, image: getProductImageUrl('p6'), description: '12 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p7', name: '15" PENCIL', price: 260, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16.5, ratePerUnit: 260, singlePieceRate: 15.76, image: getProductImageUrl('p7'), description: '15 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p8', name: '15" PENCIL (U.V BOX)', price: 270, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16.5, ratePerUnit: 270, singlePieceRate: 16.36, image: getProductImageUrl('p8'), description: '15 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p9', name: '18" PENCIL', price: 310, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 12.5, ratePerUnit: 310, singlePieceRate: 24.8, image: getProductImageUrl('p9'), description: '18 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p10', name: '18" PENCIL (U.V BOX)', price: 320, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 12.5, ratePerUnit: 320, singlePieceRate: 25.6, image: getProductImageUrl('p10'), description: '18 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
    { id: 'p11', name: 'GROUND CHAKKER BIG (U.V)', price: 92, category: 'Ground Chakker', packSize: '25 PCS UNIT', quantityPerCarton: 25, contents: 58, ratePerUnit: 92, singlePieceRate: 1.59, image: getProductImageUrl('p11'), description: 'Big ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p12', name: 'GROUND CHAKKER BIG', price: 100, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 46, ratePerUnit: 100, singlePieceRate: 2.17, image: getProductImageUrl('p12'), description: 'Big ground chakker.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p13', name: 'G.C SPECIAL (U.V)', price: 184, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 27, ratePerUnit: 184, singlePieceRate: 6.81, image: getProductImageUrl('p13'), description: 'Special ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p14', name: 'GROUND CHAKKER DX (U.V)', price: 355, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16, ratePerUnit: 355, singlePieceRate: 22.19, image: getProductImageUrl('p14'), description: 'Deluxe ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
    { id: 'p15', name: 'FLOWER POTS SPECIAL (U.V)', price: 238, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 14, ratePerUnit: 238, singlePieceRate: 17, image: getProductImageUrl('p15'), description: 'Special flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
    { id: 'p16', name: 'FLOWER POTS ASOKA (U.V)', price: 300, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 9, ratePerUnit: 300, singlePieceRate: 33.33, image: getProductImageUrl('p16'), description: 'Asoka flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
    { id: 'p17', name: 'COLOUR KOTI (U.V)', price: 520, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 7, ratePerUnit: 520, singlePieceRate: 74.29, image: getProductImageUrl('p17'), description: 'Colour Koti flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
    { id: 'p18', name: 'JIL JIL', price: 67, category: 'Twinkling Star', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 100, ratePerUnit: 67, singlePieceRate: 0.67, image: getProductImageUrl('p18'), description: 'Twinkling star firework.', stock: 100, active: true, rating: 4.8, tags: ['twinkling star'] }
  ].map(product => ({
    ...product,
    image: formatProductImageUrl(product.image || getProductImageUrl(product.id, '')),
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
    const adminSession = Storage.get('sukhi_admin_session');
    if (adminSession && adminSession.loggedInAt) {
      AppState.isAdmin = true;
      if (!AppState.user) {
        AppState.user = {
          uid: 'admin_local',
          email: adminSession.email || 'sukhigopi2006@gmail.com',
          displayName: adminSession.displayName || 'Store Administrator'
        };
      }
    }

    if (!window.auth) {
      this.updateUI();
      return;
    }

    try {
      auth.onAuthStateChanged(async (user) => {
        const hasAdminSession = !!Storage.get('sukhi_admin_session');
        if (user) {
          AppState.user = user;
          AppState.isAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || hasAdminSession || (typeof window !== 'undefined' && window.location.pathname.includes('admin.html'));
          if (AppState.isAdmin && !hasAdminSession) {
            Storage.set('sukhi_admin_session', { email: user.email, displayName: user.displayName || 'Admin', loggedInAt: Date.now() });
          }
        } else {
          // If no Firebase user, do not wipe admin session if local admin session exists!
          if (!hasAdminSession) {
            AppState.user = null;
            AppState.isAdmin = typeof window !== 'undefined' && window.location.pathname.includes('admin.html');
          } else {
            AppState.isAdmin = true;
          }
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
    const normalizedUser = (email || '').trim().toLowerCase();
    const normalizedPass = (password || '').trim().toLowerCase();
    const isFixedAdmin = FIXED_ADMIN_CREDENTIALS.usernames.includes(normalizedUser) &&
                         FIXED_ADMIN_CREDENTIALS.passwords.includes(normalizedPass);

    if (isFixedAdmin) {
      const adminUser = {
        uid: 'admin_local',
        email: 'sukhigopi2006@gmail.com',
        displayName: 'Store Administrator',
        role: 'admin'
      };
      AppState.user = adminUser;
      AppState.isAdmin = true;
      Storage.set('sukhi_admin_session', { ...adminUser, loggedInAt: Date.now() });
      this.updateUI();
      return adminUser;
    }

    if (!window.firebaseConfigStatus?.ready) throw new Error(window.firebaseConfigStatus?.message || 'Firebase customer login is not configured.');

    if (!window.auth) {
      throw new Error('Authentication service is unavailable.');
    }

    try {
      const cred = await auth.signInWithEmailAndPassword(normalizedUser, password);
      AppState.user = cred.user;
      AppState.isAdmin = ADMIN_EMAILS.includes((cred.user.email || '').toLowerCase()) || !!Storage.get('sukhi_admin_session');
      if (AppState.isAdmin) {
        Storage.set('sukhi_admin_session', { email: cred.user.email, displayName: cred.user.displayName || 'Admin', loggedInAt: Date.now() });
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
    AppState.isAdmin = false;
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
function requireSignedIn(message = 'Please sign in to continue.') {
  if (AppState.user) return true;
  showToast(message, 'info');
  const redirect = encodeURIComponent((window.location.pathname || 'index.html') + window.location.search);
  window.location.href = `login.html?redirect=${redirect}`;
  return false;
}

const Orders = {
  async createOrderRequest(orderData = {}) {
    const items = (orderData.items && orderData.items.length) ? orderData.items : AppState.cart;
    if (!items.length) throw new Error('Your cart is empty. Please add fireworks first.');

    const delivery = orderData.delivery || {};
    const subtotal = items.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.qty) || 1)), 0);
    const state = (delivery.state || 'Tamil Nadu').trim();
    const isTN = state.toLowerCase() === 'tamil nadu';
    const cgst = isTN ? (subtotal * 0.09) : 0;
    const sgst = isTN ? (subtotal * 0.09) : 0;
    const igst = isTN ? 0 : (subtotal * 0.18);
    const taxTotal = cgst + sgst + igst;
    const grandTotal = subtotal + taxTotal;
    const orderId = 'SK-REQ-' + Date.now().toString(36).toUpperCase();

    const orderPayload = {
      id: orderId,
      orderNumber: orderId,
      createdAt: new Date().toISOString(),
      status: 'Pending',
      items: items.map(i => ({
        id: String(i.id || '').trim(),
        name: i.name || 'Firework Item',
        price: Number(i.price) || 0,
        qty: Number(i.qty) || 1,
        image: i.image || ''
      })),
      subtotal,
      taxes: {
        type: isTN ? 'intra-state' : 'inter-state',
        cgst,
        sgst,
        igst,
        taxTotal
      },
      total: grandTotal,
      itemCount: items.reduce((s, i) => s + (Number(i.qty) || 1), 0),
      delivery: {
        name: delivery.name || 'Valued Customer',
        email: delivery.email || AppState.user?.email || '',
        phone: delivery.phone || '',
        alternatePhone: delivery.alternatePhone || '',
        unit: delivery.unit || '',
        street: delivery.street || '',
        address: delivery.address || '',
        city: delivery.city || '',
        district: delivery.district || '',
        state: state,
        pincode: delivery.pincode || '',
        landmark: delivery.landmark || ''
      },
      adminNotificationEmail: 'sukhigopi2006@gmail.com',
      customerEmail: delivery.email || AppState.user?.email || '',
      userId: AppState.user ? AppState.user.uid : null,
      type: 'order_request'
    };

    let remoteSaved = false;
    if (window.functions) {
      try {
        const submitOrderRequest = window.functions.httpsCallable('submitOrderRequest');
        const result = await submitOrderRequest({ delivery: orderPayload.delivery, items: orderPayload.items });
        const savedOrder = result.data?.order;
        if (savedOrder?.id) {
          Object.assign(orderPayload, savedOrder);
          remoteSaved = true;
        }
      } catch (e) {
        console.warn('Firebase Cloud Function order request failed, falling back to local/Firestore:', e);
      }
    }

    if (!remoteSaved && window.db) {
      try {
        const ref = await db.collection('orders').add({
          ...orderPayload,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        orderPayload.id = ref.id;
        remoteSaved = true;
      } catch (e) {
        console.warn('Firestore direct order save failed, persisting locally:', e);
      }
    }

    if (!orderPayload.id) {
      orderPayload.id = 'SK-ORD-' + Date.now().toString().slice(-6);
    }
    orderPayload.adminNotificationEmail = 'sukhigopi2006@gmail.com';
    orderPayload.customerEmail = orderPayload.customerEmail || orderPayload.delivery.email;

    // Keep a local copy for the confirmation page, My Account, and Admin Dashboard
    const localOrders = Storage.get('sukhi_orders', []);
    localOrders.unshift(orderPayload);
    Storage.set('sukhi_orders', localOrders);

    // Decrement in local AppState.products immediately
    items.forEach(orderedItem => {
      const p = AppState.products.find(prod => String(prod.id).trim() === String(orderedItem.id).trim());
      if (p && p.stock != null) {
        p.stock = Math.max(0, Number(p.stock) - Number(orderedItem.qty || 1));
      }
    });

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('sukhi_last_order', JSON.stringify(orderPayload));
    }

    // Send silent background email to admin via EmailJS (no mail client popup)
    EmailService.sendOrderNotification(orderPayload).catch(e => console.warn('Background email error:', e));

    return orderPayload;
  },

  async create(orderData) {
    return await this.createOrderRequest(orderData);
  },

  async getUserOrders() {
    let remoteOrders = [];
    if (AppState.user && window.db) {
      try {
        const snap = await db.collection('orders')
          .where('userId', '==', AppState.user.uid)
          .orderBy('createdAt', 'desc')
          .get();
        remoteOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Error fetching user orders from Firestore:', err);
      }
    }
    const localOrders = Storage.get('sukhi_orders', []);
    const userEmail = (AppState.user?.email || '').toLowerCase();
    const userLocal = localOrders.filter(o => {
      const ordEmail = (o.customerEmail || o.delivery?.email || '').toLowerCase();
      return !userEmail || ordEmail === userEmail || (AppState.user?.uid && o.userId === AppState.user.uid);
    });
    const map = new Map();
    remoteOrders.forEach(o => map.set(o.id, o));
    userLocal.forEach(o => { if (!map.has(o.id)) map.set(o.id, o); });
    return Array.from(map.values());
  },

  async getAllOrders() {
    let remote = [];
    if (window.db) {
      try {
        const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
        if (!snap.empty) {
          remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.warn('Failed to load orders from Firestore:', e);
      }
    }
    const local = Storage.get('sukhi_orders', []);
    const map = new Map();
    remote.forEach(o => map.set(o.id, o));
    local.forEach(o => { if (!map.has(o.id)) map.set(o.id, o); });
    return Array.from(map.values());
  },

  listenOrders(callback) {
    const notifyCombined = (remoteOrders = []) => {
      const local = Storage.get('sukhi_orders', []);
      const map = new Map();
      remoteOrders.forEach(o => map.set(o.id, o));
      local.forEach(o => { if (!map.has(o.id)) map.set(o.id, o); });
      callback(Array.from(map.values()));
    };

    if (!window.db) {
      notifyCombined([]);
      return () => {};
    }
    try {
      return db.collection('orders').orderBy('createdAt', 'desc').limit(100)
        .onSnapshot(snap => {
          const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          notifyCombined(orders);
        }, err => {
          console.warn('Orders onSnapshot error:', err);
          notifyCombined([]);
        });
    } catch (err) {
      console.warn('listenOrders setup error:', err);
      notifyCombined([]);
      return () => {};
    }
  },

  async updateStatus(orderId, status) {
    if (window.db) {
      try {
        await db.collection('orders').doc(orderId).update({
          status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore order status update skipped:', e);
      }
    }
    const localOrders = Storage.get('sukhi_orders', []);
    const ord = localOrders.find(o => o.id === orderId);
    if (ord) {
      ord.status = status;
      Storage.set('sukhi_orders', localOrders);
    }
    return true;
  },

  async delete(orderId) {
    // Delete from Firestore (authoritative source)
    if (window.db) {
      try {
        await db.collection('orders').doc(orderId).delete();
      } catch (e) {
        console.warn('Firestore order delete failed:', e);
      }
    }
    // Remove from local storage
    const localOrders = Storage.get('sukhi_orders', []);
    Storage.set('sukhi_orders', localOrders.filter(o => o.id !== orderId));
    return true;
  },

  async recordEmailSent(orderId, sentToEmail) {
    const timestampStr = new Date().toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    if (window.db) {
      try {
        await db.collection('orders').doc(orderId).update({
          lastEmailSentAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastEmailSentTo: sentToEmail,
          lastEmailSentDisplay: timestampStr,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore recordEmailSent skipped:', e);
      }
    }
    const localOrders = Storage.get('sukhi_orders', []);
    const ord = localOrders.find(o => o.id === orderId);
    if (ord) {
      ord.lastEmailSentTo = sentToEmail;
      ord.lastEmailSentDisplay = timestampStr;
      ord.lastEmailSentAt = new Date().toISOString();
      Storage.set('sukhi_orders', localOrders);
    }
    return true;
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
    const newId = product.id || ('prod_' + Date.now());
    const formattedImg = formatProductImageUrl(product.image || 'pics/pencil_trademark_transparent.png');
    const newProduct = {
      id: newId,
      name: product.name || 'Firework Item',
      price: Number(product.price) || 0,
      priceVersion: 2,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : Math.round((Number(product.price) || 100) * 1.25),
      category: product.category || 'Pencils',
      image: formattedImg,
      description: product.description || 'Premium festive fireworks from Sukhi Fireworks.',
      stock: parseInt(product.stock, 10) || 50,
      active: product.active !== false,
      rating: Number(product.rating) || 4.8,
      tags: product.tags || [String(product.category || 'festive').toLowerCase().replace(/\s+/g, '-'), 'festive'],
      createdAt: product.createdAt || new Date().toISOString()
    };

    if (window.db) {
      try {
        await db.collection('products').doc(newId).set({
          ...newProduct,
          createdAt: (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore AdminProducts.add skipped/failed, saved locally:', err);
      }
    }

    // 1. Save to custom products storage
    const custom = Storage.get('sukhi_custom_products', []);
    const filteredCustom = custom.filter(p => p.id !== newId);
    filteredCustom.unshift(newProduct);
    Storage.set('sukhi_custom_products', filteredCustom);

    // 2. Remove from deleted if previously deleted
    const deleted = Storage.get('sukhi_deleted_products', []);
    Storage.set('sukhi_deleted_products', deleted.filter(id => id !== newId));

    // 3. Update active AppState
    const existingIndex = AppState.products.findIndex(p => p.id === newProduct.id);
    if (existingIndex >= 0) {
      AppState.products[existingIndex] = newProduct;
    } else {
      AppState.products.unshift(newProduct);
    }

    return newProduct;
  },

  async update(id, data) {
    const cleanData = { ...data };
    if (cleanData.price != null) cleanData.price = Number(cleanData.price) || 0;
    if (cleanData.originalPrice != null) cleanData.originalPrice = Number(cleanData.originalPrice) || 0;
    if (cleanData.stock != null) cleanData.stock = Math.max(0, parseInt(cleanData.stock, 10) || 0);
    if (cleanData.image) cleanData.image = formatProductImageUrl(cleanData.image);

    if (window.db) {
      try {
        await db.collection('products').doc(id).set({
          ...cleanData,
          updatedAt: (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore AdminProducts.update skipped/failed, saved locally:', err);
      }
    }

    // Update local storage cache
    const custom = Storage.get('sukhi_custom_products', []);
    const idx = custom.findIndex(p => p.id === id);
    if (idx >= 0) {
      custom[idx] = { ...custom[idx], ...cleanData };
      Storage.set('sukhi_custom_products', custom);
    } else {
      custom.push({ id, ...cleanData });
      Storage.set('sukhi_custom_products', custom);
    }

    const stateProd = AppState.products.find(p => p.id === id);
    if (stateProd) {
      Object.assign(stateProd, cleanData);
    }
  },

  async updateStock(id, newStock) {
    await this.update(id, { stock: Math.max(0, parseInt(newStock, 10) || 0) });
  },

  async doubleAllPrices() {
    if (window.db) {
      try {
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
          batch.update(doc.ref, changes);
          count++;
          if (count === 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
          }
        }
        if (count) await batch.commit();
      } catch (err) {
        console.warn('Firestore price double failed:', err);
      }
    }

    const custom = Storage.get('sukhi_custom_products', []);
    const updatedCustom = custom.map(p => ({
      ...p,
      price: Number((Number(p.price || 0) * PRICE_MULTIPLIER).toFixed(2)),
      originalPrice: p.originalPrice != null ? Number((Number(p.originalPrice) * PRICE_MULTIPLIER).toFixed(2)) : undefined
    }));
    Storage.set('sukhi_custom_products', updatedCustom);

    AppState.products = AppState.products.map(p => ({
      ...p,
      price: Number((Number(p.price || 0) * PRICE_MULTIPLIER).toFixed(2)),
      originalPrice: p.originalPrice != null ? Number((Number(p.originalPrice) * PRICE_MULTIPLIER).toFixed(2)) : undefined
    }));

    return AppState.products.length;
  },

  async delete(id) {
    let firestoreDeleted = false;
    if (window.db) {
      try {
        await db.collection('products').doc(id).delete();
        firestoreDeleted = true;
      } catch (err) {
        console.warn('Firestore delete failed, attempting active:false', err);
        try {
          await db.collection('products').doc(id).set({
            active: false,
            deleted: true,
            deletedAt: (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
              ? firebase.firestore.FieldValue.serverTimestamp()
              : new Date().toISOString()
          }, { merge: true });
          firestoreDeleted = true;
        } catch (_) {}
      }
    }

    // Add to deleted products list (persists across page reloads)
    const deleted = Storage.get('sukhi_deleted_products', []);
    if (!deleted.includes(id)) {
      deleted.push(id);
      Storage.set('sukhi_deleted_products', deleted);
    }

    // Remove from custom products
    let custom = Storage.get('sukhi_custom_products', []);
    custom = custom.filter(p => p.id !== id);
    Storage.set('sukhi_custom_products', custom);

    // Remove from AppState immediately (live update)
    AppState.products = AppState.products.filter(p => p.id !== id);

    return firestoreDeleted;
  },

  async getAll() {
    return await Products.load();
  },

  async replaceCatalog(products) {
    Storage.set('sukhi_custom_products', []);
    Storage.set('sukhi_deleted_products', []);
    AppState.products = products.map(product => ({ ...product, image: formatProductImageUrl(product.image) }));

    if (window.db) {
      try {
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
      } catch (err) {
        console.warn('Firestore replaceCatalog batch failed:', err);
      }
    }
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
  // Accept numbers, numeric strings, or already formatted strings like "₹1,234.00"
  if (typeof n === 'string') {
    // Strip out any non‑numeric characters except the decimal point
    const cleaned = n.replace(/[^0-9.]+/g, '');
    const parsed = Number(cleaned);
    if (!isNaN(parsed)) {
      n = parsed;
    }
  }
  const num = Number(n);
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  document.body.addEventListener('click', (e) => {
    const cartLink = e.target.closest('a[href="cart.html"]');
    if (cartLink && !AppState.user) {
      e.preventDefault();
      requireSignedIn('Please sign in to view your cart.');
      return;
    }

    const wishlistLink = e.target.closest('a[href="wishlist.html"]');
    if (wishlistLink && !AppState.user) {
      e.preventDefault();
      requireSignedIn('Please sign in to view your wishlist.');
      return;
    }

    const addBtn = e.target.closest('[data-add-cart]');
    if (addBtn) {
      if (!requireSignedIn('Please sign in to add products to the cart.')) return;
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
      if (!requireSignedIn('Please sign in to save products to your wishlist.')) return;
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
window.EmailService = EmailService;
window.showToast = showToast;
window.formatPrice = formatPrice;
window.getQueryParam = getQueryParam;
window.getSampleProducts = getSampleProducts;
window.Offers = Offers;
window.Storage = Storage;
window.formatProductImageUrl = formatProductImageUrl;
window.getProductImageUrl = getProductImageUrl;
window.handleImageError = handleImageError;
