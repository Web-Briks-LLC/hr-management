import { Types } from 'mongoose';
import StaffModel from '../models/staff.model.js';
import ShiftModel from '../models/shift.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';

const assignShift = async ({
    staffIds,
    shiftId,
    startDate,
    assignedBy,
}: {
    staffIds: string[];
    shiftId: string;
    startDate: string;
    assignedBy: string;
}) => {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const staffs = await StaffModel.find({ _id: { $in: staffIds } })
            .session(session)
            .lean();

        if (staffs.length !== staffIds.length) {
            throw new Error('One or more staff IDs are invalid');
        }

        const shift = await ShiftModel.findById(shiftId)
            .session(session)
            .lean();

        if (!shift || !shift.isActive) {
            throw new Error('Invalid or inactive Shift');
        }

        const results: {
            staffId: string;
            assignmentId: Types.ObjectId;
            success: boolean;
        }[] = [];

        // We throw on error to abort transaction, so "errors" array isn't needed for partial success anymore
        // But if we want to support partial success, we can't use a transaction for ALL.
        // Logic suggests "All or Nothing" is safer for bulk actions to avoid inconsistent states.

        for (const staffId of staffIds) {
            const start = new Date(startDate);

            const existing = await ShiftAssignmentModel.findOne({
                staffId: new Types.ObjectId(staffId),
                isActive: true,
            }).session(session);

            if (existing) {
                const end = new Date(start);
                end.setDate(end.getDate() - 1);

                // Use updateOne to avoid validation errors on legacy data (missing assignedBy)
                await ShiftAssignmentModel.updateOne(
                    { _id: existing._id },
                    {
                        $set: {
                            endDate: end,
                            isActive: false,
                        },
                    },
                    { session },
                );
            }

            const newAssignment = await ShiftAssignmentModel.create(
                [
                    {
                        staffId: new Types.ObjectId(staffId),
                        shiftId: new Types.ObjectId(shiftId),
                        startDate: start,
                        endDate: null,
                        assignedBy: new Types.ObjectId(assignedBy),
                        isActive: true,
                    },
                ],
                { session },
            );

            if (!newAssignment || !newAssignment[0]) {
                throw new Error('Failed to create assignment');
            }

            results.push({
                staffId,
                assignmentId: newAssignment[0]._id as Types.ObjectId,
                success: true,
            });
        }

        await session.commitTransaction();

        return {
            successCount: results.length,
            failureCount: 0,
            results,
            errors: [],
        };
    } catch (error: any) {
        await session.abortTransaction();
        // Return failure for all since we aborted
        return {
            successCount: 0,
            failureCount: staffIds.length,
            results: [],
            errors: staffIds.map((id) => ({
                staffId: id,
                error: error.message || 'Transaction aborted',
                success: false,
            })),
        };
    } finally {
        session.endSession();
    }
};

const shiftAssignmentService = {
    assignShift,
};
export default shiftAssignmentService;
