// server.js
import 'dotenv/config'
import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import authRoutes from "./routes/auth.js"
import shopifyRoutes from "./routes/shopify.js"
import purchaseRoutes from "./routes/purchase.js"
import adminRoutes from "./routes/admin.js"
import deliveryRoutes from "./routes/delivery.js"

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:3000",
    "https://september-subphenoid-celia.ngrok-free.dev"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


app.use('/api/shopify', shopifyRoutes);


app.use(express.json());

// Handle malformed JSON bodies (e.g. bad webhook payloads)
app.use((err, _req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  next(err);
});

// Database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/focas')
  .then(() => {
    console.log('✅ MongoDB Connected');
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', authRoutes);

app.use('/api/purchase', purchaseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok HealtH' }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));