import express from "express";
import rateLimit from "express-rate-limit";
import {
    createPaymentIntent,
    confirmPayment,
} from "../controllers/payment.controller.js";

const router = express.Router();

// SECURITY: Strict rate limiting for payment endpoints to prevent abuse
const paymentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // max 5 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many payment requests. Please wait and try again.",
    },
});

router.post("/create-intent", paymentLimiter, createPaymentIntent);
router.post("/confirm", paymentLimiter, confirmPayment);

export default router;
