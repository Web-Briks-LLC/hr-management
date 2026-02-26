import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Must be exactly 32 bytes for aes-256. We hash the input to guarantee 32 bytes.
const RAW_KEY =
    process.env.ENCRYPTION_KEY || "your-default-32-byte-secret-key-!";
const ENCRYPTION_KEY = crypto
    .createHash("sha256")
    .update(String(RAW_KEY))
    .digest();
const IV_LENGTH = 16;

export function encryptPayload(payload: Record<string, unknown>): string {
    const text = JSON.stringify(payload);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const hash = iv.toString("hex") + ":" + encrypted.toString("hex");
    return Buffer.from(hash).toString("base64url");
}

export function decryptPayload(
    hashBase64: string,
): Record<string, unknown> | null {
    try {
        const text = Buffer.from(hashBase64, "base64url").toString("utf-8");
        const textParts = text.split(":");
        const iv = Buffer.from(textParts.shift()!, "hex");
        const encryptedText = Buffer.from(textParts.join(":"), "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString());
    } catch (error) {
        console.error("Decryption failed:", error);
        return null;
    }
}
