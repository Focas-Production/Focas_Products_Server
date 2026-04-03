// controllers/shopifyController.js
import crypto from "crypto"
import Product from "../models/Product.js"
import Purchase from "../models/Purchase.js"
import { getOrCreateUser, recordPurchase } from "../services/accessService.js"
import * as delhivery from "../services/delhiveryService.js"

// Verify the webhook is genuinely from Shopify
function verifyShopifyWebhook(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!hmac || !secret) return false;

  const digest = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody) // rawBody must be set by middleware (see routes)
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
}

/**
 * POST /api/shopify/webhook/order-paid
 *
 * Shopify calls this when an order is paid.
 * In Shopify Admin → Settings → Notifications → Webhooks
 * Event: Order payment  |  URL: https://yourserver.com/api/shopify/webhook/order-paid
 */
export async function orderPaidWebhook(req, res) {
  // Always respond 200 quickly so Shopify doesn't retry
  res.sendStatus(200);

  try {
    if (!verifyShopifyWebhook(req)) {
      console.error('[Shopify] Invalid webhook signature');
      return;
    }

    const order = req.body;

    // Extract customer info from the Shopify order
    const customer = order.customer || {};
    const email = customer.email || order.email;

    // Shopify can put phone in multiple places — check all of them
    const phoneNumber =
      customer.phone ||
      order.phone ||
      order.billing_address?.phone ||
      order.shipping_address?.phone ||
      null;

    const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
    const shopifyId = customer.id ? String(customer.id) : null;

    if (!phoneNumber) {
      console.error(`[Shopify] Order ${order.id} has no phone number — cannot create user. Customer must provide phone at checkout.`);
      return;
    }

    const shippingAddress = order.shipping_address || order.billing_address || null;
    const address = shippingAddress ? {
      line1: shippingAddress.address1 || undefined,
      line2: shippingAddress.address2 || undefined,
      city: shippingAddress.city || undefined,
      state: shippingAddress.province || undefined,
      pincode: shippingAddress.zip || undefined,
      country: shippingAddress.country || 'India',
    } : undefined;

    const user = await getOrCreateUser({
      phoneNumber,
      email: email || null,
      name: name || null,
      shopifyId
    });

    // Resolve all line items into products
    const products = [];
    for (const lineItem of order.line_items || []) {
      const shopifyProductId = String(lineItem.product_id);

      // lineItem.grams is the weight Shopify stores per unit (in grams)
      const weightInGrams = lineItem.grams || null;

      let product = await Product.findOneAndUpdate(
        { shopifyProductId },
        {
          $setOnInsert: {
            name: lineItem.title,
            price: parseFloat(lineItem.price),
            shopifyProductId,
            category: lineItem.product_type || null,
            subCategory: lineItem.variant_title || null,
            grants: { courses: [lineItem.title], features: [] }
          },
          // Always sync weight from Shopify (even for existing products)
          ...(weightInGrams && { $set: { weight: weightInGrams } }),
        },
        { upsert: true, new: true }
      );

      if (!product.grants?.courses?.length) {
        product = await Product.findByIdAndUpdate(
          product._id,
          { $set: { 'grants.courses': [product.name] } },
          { new: true }
        );
      }

      console.log(`[Shopify] Product resolved: ${product.name} (${shopifyProductId})`);

      products.push({
        productId: product._id,
        name: product.name,
        amount: parseFloat(lineItem.price),
        category: product.category,
        subCategory: product.subCategory
      });
    }

    // Map Shopify fulfillment_status → our enum
    // Shopify sends: null/"unfulfilled"/"partial"/"fulfilled"/"restocked"
    const fulfillmentStatus = order.fulfillment_status || 'unfulfilled';

    // Record all products in one purchase document for this order
    // order.name is the human-readable Shopify order name like "#1001"
    const orderId = order.name || String(order.id);

    await recordPurchase({
      userId: user._id,
      products,
      source: 'shopify',
      orderId,
      currency: order.currency,
      address,
      fulfillmentStatus,
    });

    console.log(`[Shopify] Access granted: user=${user._id} order=${order.id} items=${products.length}`);

    // Auto-sync to Delhivery if pickup location is configured
    const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION;
    if (pickupLocation && address?.pincode && user.phoneNumber) {
      try {
        const purchase = await Purchase.findOne({ userId: user._id, orderId, source: 'shopify' });
        if (purchase && !purchase.shipment?.awb) {
          const addParts = [address.line1, address.line2].filter(Boolean);
          const fullAdd  = addParts.join(', ') || address.city || '';

          const result = await delhivery.createShipment(
            {
              order:         orderId,
              name:          user.name || 'Customer',
              phone:         user.phoneNumber,
              add:           fullAdd,
              pin:           parseInt(address.pincode),
              city:          address.city   || '',
              state:         address.state  || '',
              country:       address.country || 'India',
              payment_mode:  'Prepaid',
              total_amount:  products.reduce((sum, p) => sum + (p.amount || 0), 0),
              products_desc: products.map(p => p.name).join(', '),
            },
            { name: pickupLocation }
          );

          const pkg = result?.packages?.[0];
          if (pkg?.status === 'Success') {
            purchase.shipment = {
              awb:            pkg.waybill,
              sortCode:       pkg.sort_code || '',
              trackingStatus: 'Manifested',
              createdAt:      new Date(),
            };
            await purchase.save();
            console.log(`[Delhivery] Shipment created AWB=${pkg.waybill} for order=${orderId}`);
          } else {
            console.error(`[Delhivery] Shipment failed for order=${orderId}:`, result);
          }
        }
      } catch (err) {
        console.error(`[Delhivery] Auto-sync error for order=${orderId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Shopify] Webhook error:', err.message);
  }
}
