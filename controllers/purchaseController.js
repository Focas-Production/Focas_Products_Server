// controllers/purchaseController.js
import crypto from "crypto"
import Razorpay from "razorpay"
import Product from "../models/Product.js"
import Purchase from "../models/Purchase.js"
import { recordPurchase, getOrCreateUser } from "../services/accessService.js"
import * as delhivery from "../services/delhiveryService.js"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/purchase/create-order
 *
 * Creates a Razorpay order for the given products.
 * The user must be logged in (auth middleware).
 *
 * Body: { productIds: string[] }
 * Response: { orderId, amount, currency, key }
 */
export async function createOrder(req, res) {
  try {
    const { productIds, name, phoneNumber } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds is required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    const ids = Array.isArray(productIds) ? productIds : [productIds];

    const products = await Product.find({ _id: { $in: ids } });
    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found' });
    }

    const totalAmount = products.reduce((sum, p) => sum + (p.price || 0), 0);

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        productIds: ids.join(','),
        phoneNumber,
        ...(name && { name }),
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/purchase/verify
 *
 * Verifies the Razorpay payment signature and grants access.
 * The user must be logged in (auth middleware).
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, productIds, currency }
 */
export async function verifyAndGrantAccess(req, res) {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      productIds, currency,
      name, phoneNumber, address,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !productIds) {
      return res.status(400).json({ error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature and productIds are required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const ids = Array.isArray(productIds) ? productIds : [productIds];

    const products = await Product.find({ _id: { $in: ids } });
    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found' });
    }

    // Find or create user from form data
    const user = await getOrCreateUser({ phoneNumber, name });

    // Fetch actual amount paid from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const amountPaid = payment.amount / 100; // paise → rupees

    await recordPurchase({
      userId: user._id,
      products: products.map(p => ({
        productId: p._id,
        name: p.name,
        amount: amountPaid / products.length,
        category: p.category,
        subCategory: p.subCategory,
        level: p.level,
      })),
      source: 'website',
      orderId: razorpay_order_id,
      currency: currency || 'INR',
      address: address || undefined,
      fulfillmentStatus: 'unfulfilled',
    });

    const grants = products.flatMap(p => p.grants?.courses ?? []);

    res.json({
      success: true,
      message: 'Payment verified and access granted',
      userId: user._id,
      grants,
    });
    console.log(`✅ Purchase recorded for user ${user._id} with products ${ids.join(',')}`);

    // Auto-sync to Delhivery if any product requires physical shipment
    const needsShipping = products.some(p => p.shipToHome);
    const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION;

    if (needsShipping) {
      if (!pickupLocation)   console.error(`[Delhivery] DELHIVERY_PICKUP_LOCATION env not set`);
      if (!address?.pincode) console.error(`[Delhivery] No address/pincode for order=${razorpay_order_id} — cannot sync`);
      if (!user.phoneNumber) console.error(`[Delhivery] No phone for user=${user._id} — cannot sync`);
    }

    if (needsShipping && pickupLocation && address?.pincode && user.phoneNumber) {
      try {
        const purchase = await Purchase.findOne({ userId: user._id, orderId: razorpay_order_id, source: 'website' });
        if (!purchase) {
          console.error(`[Delhivery] Purchase not found in DB for order=${razorpay_order_id}`);
        } else if (purchase.shipment?.awb) {
          console.log(`[Delhivery] Already has AWB=${purchase.shipment.awb}, skipping`);
        } else {
          const shippableProducts = products.filter(p => p.shipToHome);
          const totalWeight = shippableProducts.reduce((sum, p) => sum + (p.weight || 0), 0);
          const addParts = [address.line1, address.line2].filter(Boolean);
          const fullAdd  = addParts.join(', ') || address.city || '';

          const shipmentPayload = {
            order:         razorpay_order_id,
            name:          user.name || name || 'Customer',
            phone:         user.phoneNumber,
            add:           fullAdd,
            pin:           parseInt(address.pincode),
            city:          address.city  || '',
            state:         address.state || '',
            country:       address.country || 'India',
            payment_mode:  'Prepaid',
            total_amount:  amountPaid,
            products_desc: shippableProducts.map(p => p.name).join(', '),
            weight:        totalWeight > 0 ? String(totalWeight) : '500',
            pending_awb:   1,
          };

          console.log(`[Delhivery] Creating shipment:`, JSON.stringify(shipmentPayload));
          console.log(`[Delhivery] Pickup location: "${pickupLocation}"`);

          const result = await delhivery.createShipment(shipmentPayload, { name: pickupLocation });

          console.log(`[Delhivery] API response:`, JSON.stringify(result));

          const pkg = result?.packages?.[0];
          if (pkg?.status === 'Success') {
            purchase.shipment = {
              awb:            pkg.waybill,
              sortCode:       pkg.sort_code || '',
              trackingStatus: 'Manifested',
              createdAt:      new Date(),
            };
            await purchase.save();
            console.log(`[Delhivery] ✅ Shipment created AWB=${pkg.waybill} for website order=${razorpay_order_id}`);
          } else {
            console.error(`[Delhivery] ❌ Shipment failed for website order=${razorpay_order_id}:`, JSON.stringify(result));
          }
        }
      } catch (err) {
        console.error(`[Delhivery] ❌ Auto-sync error for website order=${razorpay_order_id}:`, err.message, err.response?.data);
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/purchase/my-purchases
 * Returns all purchases for the logged-in user.
 */
export async function getMyPurchases(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const query = { userId };
    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('items.productId', 'name description price grants')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(query),
    ]);

    res.json({
      purchases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/purchase/products
 * Public — list all available products.
 */
export async function listProducts(_req, res) {
  try {
    const products = await Product.find({}, 'name description price');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCourseByLevel(req, res) {
  try {
    const { level } = req.query;
    if (!level) {
      return res.status(400).json({ error: 'level query parameter is required' });
    }
    const products = await Product.find({ level });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCourseById(req, res) { 
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}