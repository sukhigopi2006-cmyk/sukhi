# Sukhi Fireworks E-Commerce

**Complete Frontend + Backend** in one package — Firebase-powered festive fireworks store with the Light/White UI design system.

## ✨ Features

- **10 Pages**: Home, Shop, Product Details, Cart, Checkout, Payment, Order Success, Wishlist, Login/Register, Admin Portal
- **Firebase Auth**: Email/password login & registration; Firebase hashes passwords server-side
- **Firestore**: Products, Customers, Orders, Users, carts & wishlists
- **Cart & Wishlist**: Works offline (localStorage) and syncs when logged in
- **Admin Portal**: Strict Firebase email/password login, product CRUD, stock/pricing updates, and order management
- **Responsive**: Mobile bottom-nav + desktop header
- **Demo mode**: Works even without Firebase configured (uses sample products + local cart)

## 📁 Project Structure

```
sukhi-fireworks-ecommerce/
├── public/                    # Frontend pages (host this)
│   ├── index.html             # Home
│   ├── shop.html              # Product listing + filters
│   ├── product.html           # Product details (?id=)
│   ├── cart.html              # Shopping cart
│   ├── checkout.html          # Delivery details
│   ├── payment.html           # Payment / place order
│   ├── order-success.html     # Confirmation
│   ├── wishlist.html          # Favorites
│   ├── login.html             # Login / Register
│   └── admin.html             # Admin portal
├── src/js/
│   ├── firebase-config.js     # Your Firebase config
│   ├── app.js                 # Auth, Cart, Products, Orders, Wishlist
│   └── firebase-scripts.html  # Snippet to include SDKs
├── scripts/seed-products.js   # Seed sample products
├── database/schema.sql        # Relational presentation/deployment schema
├── festive_radiance/DESIGN.md # Design system
├── firestore.rules            # Security rules
├── firebase.json              # Hosting config
├── package.json
└── README.md
```

## 🚀 Quick Start (Local)

1. **Unzip** and open a terminal in the project folder.
2. Serve the `public` folder:
   ```bash
   npx serve public -p 3000
   ```
   Or open `public/index.html` directly in a browser (some features need a local server).
3. Browse: http://localhost:3000

## 🔐 Authentication and Security

1. Go to [Firebase Console](https://console.firebase.google.com/) → project **sukhifireworkes** (or create one).
2. Enable **Authentication** → Email/Password only. Google OAuth is not used.
3. Create **Firestore** database (start in test mode, then deploy rules).
4. Config is already in `src/js/firebase-config.js`:
   ```js
   apiKey: "AIzaSyCnF44y4V1HI___FBoOkPMlFSUawu27Fss",
   authDomain: "sukhifireworkes.firebaseapp.com",
   projectId: "sukhifireworkes",
   ...
   ```
5. Deploy rules:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use sukhifireworkes
   firebase deploy --only firestore:rules
   ```
6. Deploy hosting:
   ```bash
   firebase deploy --only hosting
   ```

## 🌱 Seed Products

Open the site → browser console → paste the seed snippet from `scripts/seed-products.js` (or run the printed commands).

Admin access is granted only after Firebase successfully authenticates the supplied email and password. The UI then checks the authenticated email against `ADMIN_EMAILS`; local storage cannot create or restore an admin session. Firestore rules repeat the admin check server-side.

Firebase Authentication hashes passwords server-side. The current login identifier is an email address; username aliases should be mapped through a trusted server endpoint rather than storing or checking password hashes in browser code.

## 👤 Admin Access

Edit `ADMIN_EMAILS` in `src/js/app.js`:
```js
const ADMIN_EMAILS = ['admin@sukhi.com', 'owner@sukhi.com'];
```
Create this account in Firebase Authentication, then sign in through `admin.html` with its real password. The demo-fill button only fills the admin email; it never grants access.

## 🗃️ Data Model and Demo Flow

The live Firestore collections are:

- `users/{uid}`: authenticated profile, role, cart, and wishlist.
- `customers/{uid}`: one customer record per user with contact and shipping address.
- `products/{productId}`: catalog, price, stock, and active status.
- `orders/{orderId}`: authenticated `userId`, linked `customerId`, delivery snapshot, line items, total, payment method, and status.

The relational equivalent, including `order_items`, is documented in [database/schema.sql](database/schema.sql).

For a project demo: the customer signs in, checkout upserts the customer record, order creation stores both IDs and item snapshots, and the admin updates product CRUD or order status. Firestore rules enforce ownership and admin privileges even if someone bypasses the UI.

## 🛒 User Flow

1. Browse Home / Shop  
2. Add to Cart or Wishlist  
3. Login (required before placing an order)  
4. Checkout → Delivery → Payment → Order Success  

Cart persists in localStorage and syncs to Firestore when the user is logged in.

## 🎨 Design

Light/White color scheme with primary accent `#ff6a00`. See `festive_radiance/DESIGN.md`.

## ⚠️ Notes

- Signed-in checkout is required so every order is linked to a customer record.
- Payment page records an order after the selected payment action (integrate Razorpay/Stripe for live payment capture).
- Sample products load automatically if Firestore is empty or offline.
- Update `firestore.rules` admin emails to match your accounts.

---

**Built for Sukhi Festive Fireworks** · Celebrate safely ✨
