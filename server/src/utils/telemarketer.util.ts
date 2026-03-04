import StaffModel from "../models/staff.model.js";

/**
 * Check if a user (by userId) has the Telemarketer designation.
 * Returns the staff record if true, or null if not a telemarketer.
 */
export async function getTelemarketerStaff(userId: string) {
    const staff = await StaffModel.findOne({
        userId,
        designation: { $regex: /^telemarketer$/i },
        status: "active",
    }).lean();
    return staff;
}

/**
 * Check if a user is a telemarketer (boolean shorthand).
 */
export async function isTelemarketer(userId: string): Promise<boolean> {
    const staff = await getTelemarketerStaff(userId);
    return !!staff;
}
