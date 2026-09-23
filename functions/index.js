const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();
const ADMIN_EMAIL = 'sukhigopi2006@gmail.com';
const smtpHost = defineSecret('SMTP_HOST');
const smtpPort = defineSecret('SMTP_PORT');
const smtpUser = defineSecret('SMTP_USER');
const smtpPassword = defineSecret('SMTP_PASSWORD');
const smtpFrom = defineSecret('SMTP_FROM');

function cleanDelivery(delivery = {}, user) {
  return {
    name: String(delivery.name || user.displayName || 'Customer').trim(),
    email: String(user.email || delivery.email || '').trim().toLowerCase(),
    phone: String(delivery.phone || '').trim(),
    alternatePhone: String(delivery.alternatePhone || '').trim(),
    unit: String(delivery.unit || '').trim(),
    street: String(delivery.street || '').trim(),
    address: String(delivery.address || '').trim(),
    city: String(delivery.city || '').trim(),
    district: String(delivery.district || '').trim(),
    state: String(delivery.state || 'Tamil Nadu').trim(),
    pincode: String(delivery.pincode || '').trim(),
    landmark: String(delivery.landmark || '').trim()
  };
}

exports.submitOrderRequest = onCall(async request => {
  if (!request.auth?.uid || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Sign in before submitting an order request.');
  }
  const inputItems = Array.isArray(request.data?.items) ? request.data.items : [];
  if (!inputItems.length) throw new HttpsError('invalid-argument', 'The order must contain at least one product.');

  const quantities = new Map();
  for (const item of inputItems) {
    const id = String(item.id || '').trim();
    const qty = Number(item.qty || 0);
    if (!id || !Number.isInteger(qty) || qty < 1) throw new HttpsError('invalid-argument', 'Each item must have a valid quantity.');
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }

  const delivery = cleanDelivery(request.data.delivery, request.auth.token);
  if (!delivery.email) throw new HttpsError('invalid-argument', 'A customer email is required.');
  const orderId = `SK-REQ-${Date.now().toString(36).toUpperCase()}`;
  const orderRef = db.collection('orders').doc(orderId);
  let order;

  await db.runTransaction(async transaction => {
    const refs = [...quantities.keys()].map(id => db.collection('products').doc(id));
    const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
    const products = new Map();
    snapshots.forEach((snapshot, index) => products.set(refs[index].id, snapshot));

    const items = [...quantities.entries()].map(([id, qty]) => {
      const snapshot = products.get(id);
      if (!snapshot.exists || snapshot.data().active === false) throw new HttpsError('failed-precondition', 'A product is no longer available.');
      const product = snapshot.data();
      const stock = Number(product.stock || 0);
      if (stock < qty) throw new HttpsError('failed-precondition', `Only ${stock} unit(s) remain for ${product.name || 'this product'}.`);
      transaction.update(snapshot.ref, { stock: stock - qty, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { id, name: String(product.name || 'Firework Item'), category: String(product.category || ''), price: Number(product.price || 0), qty, image: String(product.image || '') };
    });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const isTamilNadu = delivery.state.toLowerCase() === 'tamil nadu';
    const cgst = isTamilNadu ? subtotal * 0.09 : 0;
    const sgst = isTamilNadu ? subtotal * 0.09 : 0;
    const igst = isTamilNadu ? 0 : subtotal * 0.18;
    order = {
      id: orderId,
      orderNumber: orderId,
      userId: request.auth.uid,
      type: 'order_request',
      status: 'Pending',
      items,
      itemCount: items.reduce((sum, item) => sum + item.qty, 0),
      subtotal,
      taxes: { type: isTamilNadu ? 'intra-state' : 'inter-state', cgst, sgst, igst, taxTotal: cgst + sgst + igst },
      total: subtotal + cgst + sgst + igst,
      delivery,
      customerEmail: delivery.email,
      adminNotificationEmail: ADMIN_EMAIL,
      createdAt: new Date().toISOString()
    };
    transaction.set(orderRef, { ...order, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });

  return { order };
});

exports.emailOrderRequest = onDocumentCreated({ document: 'orders/{orderId}', secrets: [smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom] }, async event => {
  const order = event.data?.data();
  if (!order?.customerEmail) return;
  const transporter = nodemailer.createTransport({ host: smtpHost.value(), port: Number(smtpPort.value() || 587), secure: Number(smtpPort.value()) === 465, auth: { user: smtpUser.value(), pass: smtpPassword.value() } });
  const rows = (order.items || []).map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${Number(item.price || 0).toFixed(2)}</td><td>${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#172033"><h1>Sukhi Fireworks</h1><p>Order request <strong>${order.id}</strong></p><p>Customer: ${order.delivery?.name || ''}<br>Email: ${order.customerEmail}<br>Phone: ${order.delivery?.phone || ''}</p><table style="border-collapse:collapse;width:100%"><tr><th align="left">Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr>${rows}</table><p><strong>Total: INR ${Number(order.total || 0).toFixed(2)}</strong></p><p>Status: Pending confirmation</p></div>`;
  await transporter.sendMail({ from: smtpFrom.value(), to: ADMIN_EMAIL, cc: order.customerEmail, subject: `Sukhi Fireworks order request ${order.id}`, html, attachments: [{ filename: `sukhi-invoice-${order.id}.html`, content: html, contentType: 'text/html' }] });
});
