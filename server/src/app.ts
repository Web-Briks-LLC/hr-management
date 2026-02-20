import express, {
    type Application,
    type Response,
    type Request,
} from "express";
import cors from "cors";
import envConfig from "./config/env.config.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import router from "./routes/index.js";

const { trusted_origins } = envConfig;

const app: Application = express();

app.use(
    cors({
        origin: trusted_origins.split(","),
        credentials: true,
    }),
);

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

        if (
            isPublicInvitationRoute ||
            isPublicMetadataRoute ||
            isPublicCareerRoute
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
