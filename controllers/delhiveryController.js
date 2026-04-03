// controllers/delhiveryController.js
import Purchase from "../models/Purchase.js"
import * as delhivery from "../services/delhiveryService.js"

// ---------------------------------------------------------------------------
// GET /api/delivery/shipments
// Admin dashboard — all purchases with shipment info.
// Query params:
//   status   : filter by trackingStatus (e.g. "Delivered", "Manifested", "In Transit")
//   page     : page number (default 1)
//   limit    : per page (default 20)
// ---------------------------------------------------------------------------
export async function getShipments(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.status) query['shipment.trackingStatus'] = req.query.status;

    const [orders, total] = await Promise.all([
      Purchase.find(query)
        .populate('userId', 'name phoneNumber email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(query),
    ]);

    res.json({
      orders,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/delivery/track/:awb
// Track a shipment by AWB — syncs latest status into Purchase.
// ---------------------------------------------------------------------------
export async function trackShipment(req, res) {
  try {
    const { awb } = req.params;
    if (!awb) return res.status(400).json({ error: 'awb is required' });

    const result = await delhivery.trackShipment(awb);

    if (!result.length) {
      return res.status(404).json({ error: 'No tracking data found for this AWB' });
    }

    const shipmentData = result[0]?.Shipment;

    // Sync latest status into our Purchase record
    const purchase = await Purchase.findOne({ 'shipment.awb': awb });
    if (purchase && shipmentData?.Status?.Status) {
      purchase.shipment.trackingStatus   = shipmentData.Status.Status;
      purchase.shipment.trackingLocation = shipmentData.Status.StatusLocation;
      purchase.shipment.lastStatusAt     = new Date(shipmentData.Status.StatusDateTime);
      await purchase.save();
    }

    res.json({ shipment: shipmentData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/delivery/label/:awb
// Download shipping label PDF. Supports comma-separated AWBs.
// ---------------------------------------------------------------------------
export async function getLabel(req, res) {
  try {
    const { awb } = req.params;
    if (!awb) return res.status(400).json({ error: 'awb is required' });

    const pdfBuffer = await delhivery.getLabel(awb);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="label-${awb}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/delivery/webhook
// Delhivery pushes real-time status updates here.
// Configure this URL in Delhivery One → Settings → Webhooks
// ---------------------------------------------------------------------------
export async function delhiveryWebhook(req, res) {
  // Always respond 200 immediately so Delhivery doesn't retry
  res.sendStatus(200);

  try {
    const { Shipment } = req.body;
    if (!Shipment) return;

    const awb    = Shipment.AWB;
    const status = Shipment.Status?.Status;

    if (!awb || !status) return;

    const purchase = await Purchase.findOne({ 'shipment.awb': awb });
    if (!purchase) {
      console.warn(`[Delhivery Webhook] No purchase found for AWB: ${awb}`);
      return;
    }

    const location  = Shipment.Status?.StatusLocation || '';
    const statusAt  = new Date(Shipment.Status?.StatusDateTime || Date.now());

    // Update latest status
    purchase.shipment.trackingStatus   = status;
    purchase.shipment.trackingLocation = location;
    purchase.shipment.lastStatusAt     = statusAt;

    // Push to history (avoid duplicates)
    const alreadyLogged = purchase.shipment.statusHistory?.some(
      h => h.status === status && h.timestamp?.getTime() === statusAt.getTime()
    );
    if (!alreadyLogged) {
      purchase.shipment.statusHistory.push({ status, location, timestamp: statusAt });
    }

    // Map Delhivery status → fulfillmentStatus
    if (status === 'Delivered') {
      purchase.fulfillmentStatus = 'fulfilled';
    } else if (['RTO', 'RTO Delivered', 'Returned', 'Cancelled'].includes(status)) {
      purchase.fulfillmentStatus = 'unfulfilled';
    }

    await purchase.save();
    console.log(`[Delhivery Webhook] AWB ${awb} → ${status} @ ${location}`);
  } catch (err) {
    console.error('[Delhivery Webhook] Error:', err.message);
  }
}
