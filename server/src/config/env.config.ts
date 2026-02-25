import path from "path";
import dotenv from "dotenv";

dotenv.config({
    path: path.join(process.cwd(), ".env"),
});

// Validate required environment variables at startup
const requiredVars = [
    "MONGO_URI",
    "DB_NAME",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "TRUSTED_ORIGINS",
    "PORT",
    "NODE_ENV",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "CLOUDINARY_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_PATH",
] as const;

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missing.join(", ")}. ` +
            "Check your .env file.",
    );
}

const envConfig = {
    node_env: process.env.NODE_ENV!,
    port: Number(process.env.PORT),

    mongo_uri: process.env.MONGO_URI!,
    db_name: process.env.DB_NAME!,

    // better-auth
    better_auth_secret: process.env.BETTER_AUTH_SECRET!,
    better_auth_url: process.env.BETTER_AUTH_URL!,
    trusted_origins: process.env.TRUSTED_ORIGINS!,

    // client
    client_url: process.env.CLIENT_URL || "http://localhost:3000",

    // nodemailer
    smtp_user: process.env.SMTP_USER!,
    smtp_pass: process.env.SMTP_PASS!,
    smtp_host: process.env.SMTP_HOST!,
    smtp_port: Number(process.env.SMTP_PORT),
    smtp_secure: process.env.SMTP_SECURE!,

    // cloudinary
    cloudinary_name: process.env.CLOUDINARY_NAME!,
    cloudinary_api_key: process.env.CLOUDINARY_API_KEY!,
    cloudinary_secret: process.env.CLOUDINARY_API_SECRET!,
    cloudinary_upload_path: process.env.CLOUDINARY_UPLOAD_PATH!,
};
export default envConfig;
