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
  
  // Send notification to Admin
  await transporter.sendMail({ from: smtpFrom.value(), to: ADMIN_EMAIL, subject: `New Order Request ${order.id} - Sukhi Fireworks`, html, attachments: [{ filename: `sukhi-invoice-${order.id}.html`, content: html, contentType: 'text/html' }] });

  // Also send confirmation copy to Customer
  if (order.customerEmail) {
    try {
      const customerHtml = `
        <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
          <h2 style="color:#ea580c;margin-top:0;">Sukhi Fireworks (Pencil Brand)</h2>
          <p>Dear <strong>${order.delivery?.name || 'Customer'}</strong>,</p>
          <p>Thank you for choosing Sukhi Fireworks! We have received your order request <strong>#${order.id}</strong>.</p>
          <p>Our sales team in Sivakasi is reviewing your request and will contact you shortly to confirm stock availability and arrange dispatch.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
            <thead>
              <tr style="background:#fff7ed;border-bottom:2px solid #fdba74;">
                <th align="left" style="padding:8px;">Item</th>
                <th align="center" style="padding:8px;">Qty</th>
                <th align="right" style="padding:8px;">Price</th>
                <th align="right" style="padding:8px;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="text-align:right;font-size:15px;margin-top:12px;"><strong>Grand Total: INR ${Number(order.total || 0).toFixed(2)}</strong></p>
          <p style="margin-top:20px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;">
            Delivery Address: ${order.delivery?.unit ? order.delivery.unit + ', ' : ''}${order.delivery?.street || order.delivery?.address || ''}, ${order.delivery?.city || ''}, ${order.delivery?.state || 'Tamil Nadu'} ${order.delivery?.pincode || ''}<br>
            For assistance, contact our support team at ${ADMIN_EMAIL}.
          </p>
        </div>
      `;
      await transporter.sendMail({
        from: smtpFrom.value(),
        to: order.customerEmail,
        subject: `Your Order Request #${order.id} - Sukhi Fireworks`,
        html: customerHtml,
        attachments: [{ filename: `sukhi-invoice-${order.id}.html`, content: html, contentType: 'text/html' }]
      });
    } catch (custErr) {
      console.error('Failed to send order email to customer:', custErr);
    }
  }
});

exports.resendOrderEmail = onCall({ secrets: [smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom] }, async request => {
  const { orderId, targetEmail, note, subject, sendToAdmin, sendToCustomer = true } = request.data || {};
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required.');
  }

  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    throw new HttpsError('not-found', 'Order not found.');
  }
  const order = orderDoc.data();
  const recipient = (targetEmail || order.customerEmail || order.delivery?.email || '').trim();

  if (sendToCustomer && !recipient) {
    throw new HttpsError('invalid-argument', 'A valid customer email address is required.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost.value(),
    port: Number(smtpPort.value() || 587),
    secure: Number(smtpPort.value()) === 465,
    auth: { user: smtpUser.value(), pass: smtpPassword.value() }
  });

  const rows = (order.items || []).map(item => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #eee">${item.qty}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee">₹${Number(item.price || 0).toFixed(2)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee">₹${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</td></tr>`).join('');
  const noteHtml = note ? `<div style="background:#fff7ed;border-left:4px solid #ea580c;padding:12px;margin:16px 0;font-size:14px;color:#9a3412;"><strong>Message from Sukhi Fireworks:</strong><br>${note}</div>` : '';

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#ea580c;margin-top:0;">Sukhi Fireworks</h2>
      <p style="font-size:15px;font-weight:bold;">Order #${orderId} - Invoice &amp; Status Update</p>
      <p>Hello <strong>${order.delivery?.name || 'Customer'}</strong>,</p>
      <p>Here is an update regarding your order request (Current Status: <strong style="color:#ea580c;">${order.status || 'Pending'}</strong>):</p>
      ${noteHtml}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #cbd5e1;">
            <th align="left" style="padding:8px;">Product</th>
            <th align="center" style="padding:8px;">Qty</th>
            <th align="right" style="padding:8px;">Price</th>
            <th align="right" style="padding:8px;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:right;font-size:14px;margin-top:12px;">
        <p style="margin:4px 0;">Subtotal: ₹${Number(order.subtotal || 0).toFixed(2)}</p>
        <p style="margin:4px 0;">Taxes: ₹${Number(order.taxes?.taxTotal || 0).toFixed(2)}</p>
        <p style="margin:4px 0;font-size:16px;font-weight:bold;color:#ea580c;">Grand Total: INR ${Number(order.total || 0).toFixed(2)}</p>
      </div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
        <p>Delivery: ${order.delivery?.unit ? order.delivery.unit + ', ' : ''}${order.delivery?.street || order.delivery?.address || ''}, ${order.delivery?.city || ''}, ${order.delivery?.state || 'Tamil Nadu'} ${order.delivery?.pincode || ''}</p>
        <p>Contact Phone: ${order.delivery?.phone || 'N/A'}</p>
        <p>Sukhi Fireworks (Pencil Brand), 227, Amman Kovil Patti Middle Street, Sivakasi</p>
      </div>
    </div>
  `;

  const recipients = [];
  if (sendToCustomer && recipient) recipients.push(recipient);
  if (sendToAdmin && !recipients.includes(ADMIN_EMAIL)) recipients.push(ADMIN_EMAIL);

  const finalSubject = subject || `Sukhi Fireworks - Order #${orderId} Details & Invoice`;

  await transporter.sendMail({
    from: smtpFrom.value(),
    to: recipients.join(', '),
    subject: finalSubject,
    html: emailHtml
  });

  await db.collection('orders').doc(orderId).update({
    lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    lastEmailSentTo: recipient,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, recipients, orderId };
});

// ============================================
// PERMANENT DATABASE DELETION & EDITING API
// ============================================

exports.adminDeleteProduct = onCall(async request => {
  const productId = String(request.data?.productId || '').trim();
  if (!productId) {
    throw new HttpsError('invalid-argument', 'Product ID is required.');
  }
  const docRef = db.collection('products').doc(productId);
  const snap = await docRef.get();
  if (snap.exists) {
    await docRef.delete();
  }
  return { success: true, productId, deleted: true };
});

exports.adminSaveProduct = onCall(async request => {
  const productId = String(request.data?.productId || '').trim();
  const data = request.data?.data;
  if (!productId || !data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Product ID and valid product data are required.');
  }
  const cleanData = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await db.collection('products').doc(productId).set(cleanData, { merge: true });
  return { success: true, productId };
});

exports.adminDeleteOrder = onCall(async request => {
  const orderId = String(request.data?.orderId || '').trim();
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required.');
  }
  const docRef = db.collection('orders').doc(orderId);
  const snap = await docRef.get();
  if (snap.exists) {
    await docRef.delete();
  }
  return { success: true, orderId, deleted: true };
});

exports.adminUpdateOrderStatus = onCall(async request => {
  const orderId = String(request.data?.orderId || '').trim();
  const status = String(request.data?.status || '').trim();
  if (!orderId || !status) {
    throw new HttpsError('invalid-argument', 'Order ID and status are required.');
  }
  await db.collection('orders').doc(orderId).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { success: true, orderId, status };
});


