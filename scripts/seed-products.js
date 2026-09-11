/**
 * Seed sample products into Firestore
 * Usage: 
 *   1. npm install firebase
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS or use Firebase Admin
 *   3. node scripts/seed-products.js
 *
 * For browser-based seeding, use the admin portal or run this in browser console
 * after logging in as admin.
 */

const sampleProducts = [
  {
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

console.log('Sample products ready to seed:');
console.log(JSON.stringify(sampleProducts, null, 2));
console.log('\n--- To seed into Firestore ---');
console.log('1. Open the website and open browser console');
console.log('2. Paste this after Firebase is initialized:\n');
console.log(`
async function seedProducts() {
  const products = ${JSON.stringify(sampleProducts)};
  for (const p of products) {
    await db.collection('products').add({
      ...p,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Added:', p.name);
  }
  console.log('Done! Seeded', products.length, 'products');
}
seedProducts();
`);
