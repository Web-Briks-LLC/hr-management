import { z } from "zod";

export const profileSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters long"),

    email: z.email("Please enter a valid email address"),

    phone: z.string().min(11, "Phone number is required"),

    dateOfBirth: z.date("Date of birth is required"),

    nationalId: z.string().min(5, "National ID is required"),

    bloodGroup: z.string().min(1, "Blood group is required"),

    address: z.string().min(5, "Address is required"),

    emergencyContact: z.object({
        name: z.string().min(2, "Emergency contact name is required"),
        relation: z.string().min(1, "Relation is required"),
        phone: z.string().min(6, "Emergency phone is required"),
    }),

    fathersName: z.string().min(2, "Father's name is required"),
    mothersName: z.string().min(2, "Mother's name is required"),

    spouseName: z.string().optional(),

    bank: z
        .object({
            bankName: z.string().min(2, "Bank name is required"),
            accountNumber: z.string().min(5, "Account number is required"),
            accountHolderName: z
                .string()
                .min(2, "Account holder name is required"),
            branch: z.string().optional(),
            routingNumber: z.string().optional(),
        })
        .optional(),

    joinDate: z.date("Join date is required"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
