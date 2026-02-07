import { startOfDay, endOfDay } from 'date-fns';
import { Types } from 'mongoose';
import ShiftOffDateModel from '../models/shift-off-date.model.js';
import ShiftModel from '../models/shift.model.js';
import StaffModel from '../models/staff.model.js';

// Add off dates to a shift
async function addOffDates(
    shiftId: string,
    dates: string[],
    reason: string | undefined,
    userId: string,
) {
    // Verify shift exists
    const shift = await ShiftModel.findById(shiftId);
    if (!shift) {
        throw new Error('Shift not found');
    }

    // Convert string dates to Date objects (start of day)
    const parsedDates = dates.map((d) => startOfDay(new Date(d)));

    // Find existing record or create new one
    let offDateRecord = await ShiftOffDateModel.findOne({
        shiftId: new Types.ObjectId(shiftId),
        isActive: true,
    });

    if (offDateRecord) {
        // Merge new dates with existing ones (avoid duplicates)
        const existingDates = offDateRecord.dates.map((d) => d.getTime());
        const newDates = parsedDates.filter(
            (d) => !existingDates.includes(d.getTime()),
        );
        offDateRecord.dates = [...offDateRecord.dates, ...newDates];
        if (reason) {
            offDateRecord.reason = reason;
        }
        await offDateRecord.save();
    } else {
        const createPayload: {
            shiftId: Types.ObjectId;
            dates: Date[];
            reason?: string;
            createdBy: Types.ObjectId;
            isActive: boolean;
        } = {
            shiftId: new Types.ObjectId(shiftId),
            dates: parsedDates,
            createdBy: new Types.ObjectId(userId),
            isActive: true,
        };

        if (reason) {
            createPayload.reason = reason;
        }

        offDateRecord = await ShiftOffDateModel.create(createPayload);
    }

    return offDateRecord;
}

// Remove specific off dates from a shift
async function removeOffDates(shiftId: string, dates: string[]) {
    const parsedDates = dates.map((d) => startOfDay(new Date(d)).getTime());

    const offDateRecord = await ShiftOffDateModel.findOne({
        shiftId: new Types.ObjectId(shiftId),
        isActive: true,
    });

    if (!offDateRecord) {
        throw new Error('No off dates found for this shift');
    }

    // Filter out the dates to remove
    offDateRecord.dates = offDateRecord.dates.filter(
        (d) => !parsedDates.includes(d.getTime()),
    );

    await offDateRecord.save();

    return offDateRecord;
}

// Get all off dates for a shift
async function getOffDates(shiftId: string) {
    const offDateRecord = await ShiftOffDateModel.findOne({
        shiftId: new Types.ObjectId(shiftId),
        isActive: true,
    }).lean();

    if (!offDateRecord) {
        return { dates: [], reason: null };
    }

    // Filter out past dates (only show current and future)
    const today = startOfDay(new Date());
    const futureDates = offDateRecord.dates.filter((d) => new Date(d) >= today);

    return {
        dates: futureDates,
        reason: offDateRecord.reason || null,
    };
}

// Check if a specific date is off for a shift
async function isDateOff(
    shiftId: string | Types.ObjectId,
    date: Date,
): Promise<boolean> {
    const checkDate = startOfDay(date);

    const offDateRecord = await ShiftOffDateModel.findOne({
        shiftId: new Types.ObjectId(shiftId.toString()),
        isActive: true,
        dates: {
            $elemMatch: {
                $gte: checkDate,
                $lt: endOfDay(checkDate),
            },
        },
    }).lean();

    return !!offDateRecord;
}

// Get off dates for a staff member's current shift
async function getMyShiftOffDates(userId: string) {
    const staff = await StaffModel.findOne({ userId }).select('_id').lean();

    if (!staff) {
        throw new Error('Staff not found');
    }

    // Import dynamically to avoid circular dependency
    const ShiftAssignmentModel = (
        await import('../models/shift-assignment.model.js')
    ).default;

    const assignment = await ShiftAssignmentModel.findOne({
        staffId: staff._id,
        isActive: true,
    }).lean();

    if (!assignment) {
        throw new Error('No active shift assignment found');
    }

    return getOffDates(assignment.shiftId.toString());
}

export default {
    addOffDates,
    removeOffDates,
    getOffDates,
    isDateOff,
    getMyShiftOffDates,
};
