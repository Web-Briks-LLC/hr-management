import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// ── Reusable Patterns ──────────────────────────────────────────────────
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
const monthFormat = z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM format");

// ── Schemas ────────────────────────────────────────────────────────────

export const payrollPreviewSchema = z.object({
    month: monthFormat,
    branchId: z
        .union([objectId, z.literal("all")])
        .optional()
        .default("all"),
});

export const processPaymentSchema = z.object({
    staffId: objectId,
    month: monthFormat,
    amount: z.number().positive("Amount must be positive"),
    paymentMethod: z
        .enum(["cash", "bank_transfer", "bkash", "nagad"])
        .default("cash"),
    note: z.string().max(500).optional(),
    bonus: z.number().min(0).default(0),
    deduction: z.number().min(0).default(0),
    paymentType: z.enum(["salary", "overtime"]).default("salary"),
});

export const bulkProcessSchema = z.object({
    month: monthFormat,
    payments: z
        .array(
            z.object({
                staffId: objectId,
                amount: z.number().positive(),
                bonus: z.number().min(0).optional().default(0),
                deduction: z.number().min(0).optional().default(0),
                note: z.string().max(500).optional(),
            }),
        )
        .min(1, "At least one payment is required"),
    paymentMethod: z
        .enum(["cash", "bank_transfer", "bkash", "nagad"])
        .default("cash"),
    paymentType: z.enum(["salary", "overtime"]).default("salary"),
});

export const graceSchema = z.object({
    staffId: objectId,
    date: z.string().datetime({ offset: true }).or(z.string().date()),
    note: z.string().max(500).optional(),
});

export const undoPaymentSchema = z.object({
    staffId: objectId,
    month: monthFormat,
    paymentType: z.enum(["salary", "overtime"]).default("salary"),
});

export const absentDatesSchema = z.object({
    staffId: objectId,
    month: monthFormat,
});

export const lockMonthSchema = z.object({
    month: monthFormat,
});

// ── Validation Middleware Factory ───────────────────────────────────────

type Source = "body" | "query";

export const validate =
    (schema: z.ZodSchema, source: Source = "body") =>
    (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            const errors = result.error.issues.map((e: z.ZodIssue) => ({
                field: e.path.join("."),
                message: e.message,
            }));

            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
            return;
        }

        // Replace with parsed (coerced + defaulted) data
        if (source === "body") {
            req.body = result.data;
        } else {
            (req as any).validatedQuery = result.data;
        }

        next();
    };
