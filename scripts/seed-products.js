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

const PRICE_MULTIPLIER = 2;

const sampleProducts = [
  {
    name: '7" PENCIL SINGLE BOX', price: 67.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 70, ratePerUnit: 67.5, singlePieceRate: 0.96,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWx00X12Fmm_QPvB_J9Tluq3vf6rtzggOm_EKuLuelzTzoVVvmflkMr68b26FEaYEZX8cseX6WTS_HOEOoU6E3dCYFw1bl790Aty1dfmtc4sm7ILB37Rtrx1CQTxaNFELlpw5cNgHjNQTzFUNYsONsnWRnVwMKiJk3x8n-UxZfMZF62eR_7t9_Hs8n4I0K6J31CX7VVo8mz4esG684TDwcFTih5r1MixKm-sMrDfj5OULBRbWj_cx2qQ',
    description: '7 inch pencil firework, single box.', stock: 100, active: true, rating: 4.8, tags: ['pencil']
  },
  { name: '7" PENCIL BIG BOX', price: 68.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 70, ratePerUnit: 68.5, singlePieceRate: 0.98, description: '7 inch pencil firework, big box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '10" PENCIL', price: 127.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 40, ratePerUnit: 127.5, singlePieceRate: 3.19, description: '10 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '10" PENCIL (U.V BOX)', price: 134.5, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 40, ratePerUnit: 134.5, singlePieceRate: 3.36, description: '10 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '12" PENCIL', price: 167, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 26, ratePerUnit: 167, singlePieceRate: 6.42, description: '12 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '12" PENCIL (U.V BOX)', price: 174, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 26, ratePerUnit: 174, singlePieceRate: 6.69, description: '12 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '15" PENCIL', price: 260, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16.5, ratePerUnit: 260, singlePieceRate: 15.76, description: '15 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '15" PENCIL (U.V BOX)', price: 270, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16.5, ratePerUnit: 270, singlePieceRate: 16.36, description: '15 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '18" PENCIL', price: 310, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 12.5, ratePerUnit: 310, singlePieceRate: 24.8, description: '18 inch pencil firework.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: '18" PENCIL (U.V BOX)', price: 320, category: 'Pencils', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 12.5, ratePerUnit: 320, singlePieceRate: 25.6, description: '18 inch pencil firework in UV box.', stock: 100, active: true, rating: 4.8, tags: ['pencil'] },
  { name: 'GROUND CHAKKER BIG (U.V)', price: 92, category: 'Ground Chakker', packSize: '25 PCS UNIT', quantityPerCarton: 25, contents: 58, ratePerUnit: 92, singlePieceRate: 1.59, description: 'Big ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
  { name: 'GROUND CHAKKER BIG', price: 100, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 46, ratePerUnit: 100, singlePieceRate: 2.17, description: 'Big ground chakker.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
  { name: 'G.C SPECIAL (U.V)', price: 184, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 27, ratePerUnit: 184, singlePieceRate: 6.81, description: 'Special ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
  { name: 'GROUND CHAKKER DX (U.V)', price: 355, category: 'Ground Chakker', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 16, ratePerUnit: 355, singlePieceRate: 22.19, description: 'Deluxe ground chakker in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['ground chakker'] },
  { name: 'FLOWER POTS SPECIAL (U.V)', price: 238, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 14, ratePerUnit: 238, singlePieceRate: 17, description: 'Special flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
  { name: 'FLOWER POTS ASOKA (U.V)', price: 300, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 9, ratePerUnit: 300, singlePieceRate: 33.33, description: 'Asoka flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
  { name: 'COLOUR KOTI (U.V)', price: 520, category: 'Flower Pots', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 7, ratePerUnit: 520, singlePieceRate: 74.29, description: 'Colour Koti flower pot in UV pack.', stock: 100, active: true, rating: 4.8, tags: ['flower pots'] },
  { name: 'JIL JIL', price: 67, category: 'Twinkling Star', packSize: '10 PCS UNIT', quantityPerCarton: 10, contents: 100, ratePerUnit: 67, singlePieceRate: 0.67, description: 'Twinkling star firework.', stock: 100, active: true, rating: 4.8, tags: ['twinkling star'] }
].map(product => ({
  ...product,
  priceVersion: 2,
  price: Number((product.price * PRICE_MULTIPLIER).toFixed(2)),
  ratePerUnit: product.ratePerUnit == null ? product.ratePerUnit : Number((product.ratePerUnit * PRICE_MULTIPLIER).toFixed(2)),
  singlePieceRate: product.singlePieceRate == null ? product.singlePieceRate : Number((product.singlePieceRate * PRICE_MULTIPLIER).toFixed(2))
}));

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
