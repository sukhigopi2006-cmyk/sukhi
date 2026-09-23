/**
 * Sukhi Fireworks - Premium Invoice Generator
 * Generates luxury, print-ready, professional HTML invoices & email text templates
 */
const InvoiceGenerator = {
  ADMIN_EMAIL: 'sukhigopi2006@gmail.com',
  COMPANY_NAME: 'Sukhi Fireworks',
  TRADEMARK_NAME: 'Pencil Trademark',
  COMPANY_ADDRESS: '227, Amman Kovil Patti Middle Street, Sivakasi - 626 189, Tamil Nadu, India',
  COMPANY_PHONE: '+91 98765 43210',

  formatCurrency(amount) {
    const val = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  },

  calculateTaxes(subtotal, state) {
    const sub = Number(subtotal) || 0;
    const isTamilNadu = (state || '').trim().toLowerCase() === 'tamil nadu';
    if (isTamilNadu) {
      const cgst = sub * 0.09;
      const sgst = sub * 0.09;
      return {
        isDomestic: true,
        type: 'intra-state',
        cgst,
        sgst,
        igst: 0,
        taxTotal: cgst + sgst,
        grandTotal: sub + cgst + sgst
      };
    } else {
      const igst = sub * 0.18;
      return {
        isDomestic: true,
        type: 'inter-state',
        cgst: 0,
        sgst: 0,
        igst,
        taxTotal: igst,
        grandTotal: sub + igst
      };
    }
  },

  generateHtml(order) {
    const orderId = order.id || 'SK-REQ-' + Date.now().toString().slice(-6);
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const delivery = order.delivery || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
    const taxes = this.calculateTaxes(subtotal, delivery.state);
    const grandTotal = order.total ? Number(order.total) : taxes.grandTotal;

    const itemRows = items.map((item, idx) => `
      <tr>
        <td style="padding: 12px 14px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">${idx + 1}</td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9;">
          <strong style="color: #0f172a; font-size: 14px; display: block;">${item.name || 'Firework Product'}</strong>
          ${item.category ? `<span style="font-size: 11px; color: #ea580c; text-transform: uppercase; font-weight: 600;">${item.category}</span>` : ''}
        </td>
        <td style="padding: 12px 14px; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">${item.qty || 1}</td>
        <td style="padding: 12px 14px; text-align: right; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px;">${this.formatCurrency(item.price || 0)}</td>
        <td style="padding: 12px 14px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a; font-size: 14px;">${this.formatCurrency((Number(item.price || 0) * Number(item.qty || 1)))}</td>
      </tr>
    `).join('');

    const taxBreakdownHtml = taxes.type === 'intra-state' ? `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">CGST (9%):</td>
        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #334155; font-size: 13px;">${this.formatCurrency(taxes.cgst)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">SGST (9%):</td>
        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #334155; font-size: 13px;">${this.formatCurrency(taxes.sgst)}</td>
      </tr>
    ` : `
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">IGST (18%):</td>
        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #334155; font-size: 13px;">${this.formatCurrency(taxes.igst)}</td>
      </tr>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice - ${orderId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 30px 15px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      padding: 40px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #fff7ed;
      padding-bottom: 25px;
      margin-bottom: 30px;
    }
    .brand-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #ea580c;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9a3412;
      margin-top: 4px;
    }
    .company-info {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
      max-width: 320px;
      line-height: 1.45;
    }
    .invoice-meta-box {
      text-align: right;
    }
    .invoice-badge {
      display: inline-block;
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #ffedd5;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    .invoice-number {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }
    .invoice-date {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .customer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      background: #fafaf9;
      border: 1px solid #f5f5f4;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #ea580c;
      margin-bottom: 6px;
    }
    .client-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .client-detail {
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead th {
      background: #fff7ed;
      color: #9a3412;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 14px;
      border: none;
    }
    thead th:first-child { border-top-left-radius: 10px; border-bottom-left-radius: 10px; }
    thead th:last-child { border-top-right-radius: 10px; border-bottom-right-radius: 10px; }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-table {
      width: 320px;
    }
    .grand-total-row td {
      border-top: 2px solid #fed7aa;
      padding-top: 10px;
      padding-bottom: 6px;
      font-size: 18px;
      font-weight: 800;
      color: #ea580c;
    }
    .notes-box {
      border-top: 1px dashed #cbd5e1;
      padding-top: 20px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .print-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 30px;
    }
    .btn {
      padding: 10px 22px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #ea580c;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);
    }
    .btn-primary:hover {
      background: #c2410c;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 20px; max-width: 100%; }
      .print-actions { display: none !important; }
    }
    @media (max-width: 640px) {
      .invoice-card { padding: 20px; }
      .header-bar { flex-direction: column; gap: 20px; }
      .invoice-meta-box { text-align: left; }
      .customer-grid { grid-template-columns: 1fr; }
      .totals-table { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header-bar">
      <div>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <img src="${window.location.origin}/pics/pencil_trademark_transparent.png" alt="Sukhi Logo" style="height: 48px; width: auto; object-fit: contain;"/>
          <div>
            <div class="brand-title">Sukhi</div>
            <div class="brand-sub">Pencil Trademark</div>
          </div>
        </div>
        <div class="company-info">
          227, Amman Kovil Patti Middle Street<br/>
          Sivakasi - 626 189, Tamil Nadu, India<br/>
          <strong>Admin Email:</strong> ${this.ADMIN_EMAIL}
        </div>
      </div>
      <div class="invoice-meta-box">
        <span class="invoice-badge">Official Order Request</span>
        <div class="invoice-number">${orderId}</div>
        <div class="invoice-date">Date: ${dateStr}</div>
        <div class="invoice-date" style="color: #ea580c; font-weight: 600;">Status: Pending Confirmation</div>
      </div>
    </div>

    <div class="customer-grid">
      <div>
        <div class="section-title">Customer Details</div>
        <div class="client-name">${delivery.name || 'Customer'}</div>
        <div class="client-detail"><strong>Email:</strong> ${delivery.email || 'N/A'}</div>
        <div class="client-detail"><strong>Phone:</strong> ${delivery.phone || 'N/A'}</div>
        ${delivery.alternatePhone ? `<div class="client-detail"><strong>Alt Phone:</strong> ${delivery.alternatePhone}</div>` : ''}
      </div>
      <div>
        <div class="section-title">Shipping &amp; Delivery Address</div>
        <div class="client-detail" style="font-weight: 500; color: #1e293b;">
          ${delivery.unit ? delivery.unit + ', ' : ''}${delivery.street || delivery.address || 'Address on file'}<br/>
          ${delivery.landmark ? 'Landmark: ' + delivery.landmark + '<br/>' : ''}
          ${delivery.city ? delivery.city + ', ' : ''}${delivery.district ? delivery.district + ', ' : ''}${delivery.state || 'Tamil Nadu'}${delivery.pincode ? ' - ' + delivery.pincode : ''}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th style="text-align: left;">Product Item</th>
          <th style="width: 80px; text-align: center;">Qty</th>
          <th style="width: 120px; text-align: right;">Unit Price</th>
          <th style="width: 130px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No items in this request</td></tr>'}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tbody>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Items Subtotal:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${this.formatCurrency(subtotal)}</td>
          </tr>
          ${taxBreakdownHtml}
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Shipping &amp; Handling:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 13px;">FREE DELIVERY</td>
          </tr>
          <tr class="grand-total-row">
            <td>Grand Total:</td>
            <td style="text-align: right;">${this.formatCurrency(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="notes-box">
      <p style="font-weight: 700; color: #334155; margin-bottom: 4px;">Important Note &amp; Next Steps:</p>
      <p>1. This document serves as an automated Order Request confirmation from <strong>Sukhi Fireworks (Pencil Trademark)</strong>.</p>
      <p>2. Our sales administrator will review stock availability and contact you via phone or email to confirm dispatch and arrange payment.</p>
      <p>3. Direct pyrotechnic supplies are packaged safely from our Sivakasi manufacturing hub in compliance with explosive safety norms.</p>
      <p style="margin-top: 10px; font-weight: 600; color: #ea580c;">Thank you for celebrating with Sukhi Fireworks!</p>
    </div>

    <div class="print-actions">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-4-6h.01M6 14h12v8H6v-8z"/></svg>
        Print / Save PDF
      </button>
      <a href="shop.html" class="btn btn-secondary">
        Return to Shop
      </a>
    </div>
  </div>
</body>
</html>`;
  },

  generateEmailText(order) {
    const orderId = order.id || 'SK-REQ-' + Date.now().toString().slice(-6);
    const delivery = order.delivery || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
    const taxes = this.calculateTaxes(subtotal, delivery.state);
    const grandTotal = order.total ? Number(order.total) : taxes.grandTotal;

    const itemLines = items.map((i, idx) => `${idx + 1}. ${i.name || 'Product'} x ${i.qty || 1} @ ${this.formatCurrency(i.price || 0)} = ${this.formatCurrency((Number(i.price || 0) * Number(i.qty || 1)))}`).join('\n');

    return `SUKHI FIREWORKS - NEW ORDER REQUEST
Order ID: ${orderId}
Date: ${new Date().toLocaleString('en-IN')}

CUSTOMER DETAILS:
Name: ${delivery.name || 'Customer'}
Email: ${delivery.email || 'N/A'}
Phone: ${delivery.phone || 'N/A'}
${delivery.alternatePhone ? 'Alt Phone: ' + delivery.alternatePhone + '\n' : ''}
SHIPPING ADDRESS:
${delivery.unit ? delivery.unit + ', ' : ''}${delivery.street || delivery.address || ''}
${delivery.landmark ? 'Landmark: ' + delivery.landmark + '\n' : ''}${delivery.city ? delivery.city + ', ' : ''}${delivery.district ? delivery.district + ', ' : ''}${delivery.state || 'Tamil Nadu'}${delivery.pincode ? ' - ' + delivery.pincode : ''}

ORDER ITEMS:
---------------------------------------------
${itemLines || 'No items'}
---------------------------------------------
Subtotal: ${this.formatCurrency(subtotal)}
Taxes (GST): ${this.formatCurrency(taxes.taxTotal)}
Shipping: FREE
TOTAL AMOUNT: ${this.formatCurrency(grandTotal)}

STATUS: Pending Verification
Admin Notification: sukhigopi2006@gmail.com`;
  },

  download(order, filename) {
    const html = this.generateHtml(order);
    const safeName = filename || `sukhi_invoice_${order.id || Date.now()}.html`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
};

window.InvoiceGenerator = InvoiceGenerator;
