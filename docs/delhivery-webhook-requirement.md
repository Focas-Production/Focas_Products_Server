# Delhivery Scan Push / Webhook Requirement Document

**To:** lastmile-integration@delhivery.com  
**Subject:** Webhook Enablement Request — FOCAS Edu (46c424-FOCASEdu-do)

---

## Account Name

| Environment | Account Name        |
|-------------|---------------------|
| Dev         | *(not applicable)*  |
| Prod        | 46c424-FOCASEdu-do  |

---

## Webhook API Details

### Production Endpoint

| Field    | Value                                              |
|----------|----------------------------------------------------|
| Method   | POST                                               |
| Endpoint | `https://api.focasedu.com/api/delivery/webhook`    |
| Header   | `Content-Type: application/json`                   |

> **Note:** No authorization header required. Our endpoint is publicly accessible and responds with `200 OK` immediately.

---

## Webhook API Response Time

- Expected P99 response time: **< 100 ms**
- Our server responds with `200 OK` **before** processing (fire-and-forget pattern), so there is zero risk of timeout on Delhivery's end.

---

## Payload

**Default payload: Yes**

We accept the standard Delhivery scan push payload:

```json
{
  "Shipment": {
    "Status": {
      "Status": "Delivered",
      "StatusDateTime": "2026-04-02T17:10:42.767",
      "StatusType": "UD",
      "StatusLocation": "Namakkal_KonguNgr_D (Tamil Nadu)",
      "Instructions": "Delivered to consignee"
    },
    "PickUpDate": "2026-04-02 10:00:00.000",
    "NSLCode": "X-UCI",
    "Sortcode": "SLE/RGH",
    "ReferenceNo": "order_SYxxxxxx",
    "AWB": "48214610006005"
  }
}
```

**Custom payload: No**

---

## Webhook API Response

Our server responds with:

```
HTTP/1.1 200 OK
```

---

## Required Shipment Scans

**All scans/Status needed: Yes**

We require push notifications for all the following statuses:

| Status                   | Description                        |
|--------------------------|------------------------------------|
| Manifested               | Order created / picked up          |
| In Transit               | Package moving between hubs        |
| Out for Delivery         | With delivery agent                |
| Delivered                | Successfully delivered             |
| Failed Delivery Attempt  | Delivery attempt failed            |
| RTO Initiated            | Return to origin started           |
| RTO In Transit           | Package returning to seller        |
| RTO Delivered            | Package returned to seller         |
| Cancelled                | Order cancelled                    |

---

## IP Whitelisting

No IP whitelisting required on our end. Our server accepts requests from all IPs.

Delhivery Production IPs (for reference):
- 13.229.195.68
- 18.139.238.62
- 52.76.70.1
- 3.108.106.65
- 13.127.20.101
- 13.126.12.240
- 35.154.161.83
- 3.6.106.39
- 18.61.175.16

---

## Escalation Matrix

| Level | Contact Name | Email               | Phone       |
|-------|-------------|---------------------|-------------|
| L1    | KVR         | kvr@focasedu.com    |             |
| L2    | KVR         | kvr@focasedu.com    |             |
| L3    | KVR         | kvr@focasedu.com    |             |

---

## Volume Estimate

| Metric              | Value            |
|---------------------|------------------|
| Daily orders        | ~20–50 orders/day |
| Monthly orders      | ~500–1000/month   |
| Peak expected load  | < 10 req/sec     |

---

## Technical Notes

- Our server is built on **Node.js / Express**
- The webhook endpoint processes each scan asynchronously and stores status + full history in MongoDB
- We track `trackingStatus`, `trackingLocation`, `lastStatusAt`, and a complete `statusHistory[]` array per shipment
- `fulfillmentStatus` is automatically updated on `Delivered`, `RTO Delivered`, and `Cancelled` events
