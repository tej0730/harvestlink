const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // Gmail App Password
  }
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"HarvestLink 🌿" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

// ── Email templates ───────────────────────────────────────────────────────────
function orderConfirmedEmail(buyerName, listingTitle, totalAmount) {
  return `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
      <h2 style="color:#16a34a;">🌿 HarvestLink</h2>
      <h3>Order Confirmed!</h3>
      <p>Hi ${buyerName},</p>
      <p>Your order for <strong>${listingTitle}</strong> has been confirmed.</p>
      <p>Total: <strong>₹${totalAmount}</strong></p>
      <p>You'll get another email when it's ready for pickup.</p>
      <hr/>
      <p style="color:#9ca3af;font-size:12px;">HarvestLink — Fresh from your neighbourhood</p>
    </div>
  `;
}

function orderReadyEmail(buyerName, listingTitle, pickupTime) {
  return `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
      <h2 style="color:#16a34a;">🌿 HarvestLink</h2>
      <h3>Your order is ready for pickup! 🎉</h3>
      <p>Hi ${buyerName},</p>
      <p><strong>${listingTitle}</strong> is ready for you to collect.</p>
      ${pickupTime ? `<p>Pickup time: <strong>${pickupTime}</strong></p>` : ''}
      <p>Head over to the grower's location and confirm pickup in the app.</p>
      <hr/>
      <p style="color:#9ca3af;font-size:12px;">HarvestLink — Fresh from your neighbourhood</p>
    </div>
  `;
}

function newOrderEmail(growerName, buyerName, listingTitle, quantity) {
  return `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
      <h2 style="color:#16a34a;">🌿 HarvestLink</h2>
      <h3>New Order Received!</h3>
      <p>Hi ${growerName},</p>
      <p><strong>${buyerName}</strong> wants to order <strong>${quantity}</strong>
         of your <strong>${listingTitle}</strong>.</p>
      <p>Log in to accept or decline within 30 minutes.</p>
      <hr/>
      <p style="color:#9ca3af;font-size:12px;">HarvestLink — Fresh from your neighbourhood</p>
    </div>
  `;
}

module.exports = { sendEmail, orderConfirmedEmail, orderReadyEmail, newOrderEmail };
