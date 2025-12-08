import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import connectDB from "./config/connectDB.js"
import paymentRoute from "./routes/paymentRoute.js"
dotenv.config()
connectDB()

const PORT=process.env.PORT || 4000
const app=express()
app.use(express())
app.use(cookieParser());
// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5174',
    'https://kit.focasedu.com',
    'https://focasedu.com',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/payment', paymentRoute)


// Health check endpoint
app.get("/", (_req, res) => {
  res.json({ 
    message: "Focas Ad Server API is running...",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

/* app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
}); */


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Focas Ad Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log(`Health Check: http://localhost:${PORT}`);
});
