import express, {
    type Application,
    type Response,
    type Request,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import envConfig from "./config/env.config.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import router from "./routes/index.js";

const { trusted_origins } = envConfig;

const app: Application = express();

// SECURITY: Add security headers (XSS, clickjacking, MIME-sniffing protection)
app.use(helmet());

app.use(
    cors({
        origin: trusted_origins.split(","),
        credentials: true,
    }),
);

// SECURITY: Global rate limiter — 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});
app.use(globalLimiter);

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());

app.use(
    "/api",
    (req: Request, res: Response, next: any) => {
        // Allow public access to invitation validation and acceptance
        const isPublicInvitationRoute =
            (req.method === "GET" &&
                /^\/invitations\/[^/]+\/validate$/.test(req.path)) ||
            (req.method === "POST" &&
                /^\/invitations\/[^/]+\/accept$/.test(req.path));

        // Allow public access to metadata type routes (for invite dialog dropdowns)
        const isPublicMetadataRoute =
            req.method === "GET" &&
            /^\/metadata\/type\/(department|designation)$/.test(req.path);

        // Allow public access to career routes
        const isPublicCareerRoute =
            (req.method === "GET" &&
                /^\/careers\/positions\/public/.test(req.path)) ||
            (req.method === "POST" &&
                req.path === "/careers/applications/public");

        // Allow public access to read invoice data (for payment portal)
        // SECURITY: Removed POST /invoices/record from public routes — it now requires auth
        const isPublicInvoiceRoute =
            req.method === "GET" && /^\/invoices\/public\//.test(req.path);

        // Allow public access to create/confirm payments
        const isPublicPaymentRoute =
            req.method === "POST" &&
            /^\/payments\/(create-intent|confirm)$/.test(req.path);

        if (
            isPublicInvitationRoute ||
            isPublicMetadataRoute ||
            isPublicCareerRoute ||
            isPublicInvoiceRoute ||
            isPublicPaymentRoute
        ) {
            return next();
        }

        return requireAuth(req, res, next);
    },
    router,
);

app.get("/", (_req: Request, res: Response) => {
    res.send("Hello World!");
});

// Centralized error handler — catches unhandled errors from all routes.
// Logs the full error server-side, returns a sanitized message to the client.
app.use((err: Error, _req: Request, res: Response, _next: any) => {
    console.error("[Unhandled Error]", err);

    const statusCode = (err as any).statusCode || 500;
    const message =
        envConfig.node_env === "production"
            ? "An internal server error occurred."
            : err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        message,
    });
});

export default app;
