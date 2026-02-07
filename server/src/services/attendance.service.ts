import { endOfDay, startOfDay } from 'date-fns';
import AttendanceEventModel from '../models/attendance-event.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import type { IShift } from '../types/shift.type.js';
import StaffModel from '../models/staff.model.js';
import ShiftOffDateService from './shift-off-date.service.js';

const checkInInDB = async ({
    userId,
    ip,
    userAgent,
    source = 'web',
}: {
    userId: string;
    ip: string;
    userAgent: string;
    source?: 'web' | 'mobile' | 'manual';
}) => {
    const now = new Date();
    // Debug log
    console.log(`[CheckIn] Attempt for user ${userId} at ${now.toISOString()}`);

    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        console.error(`[CheckIn] Staff not found for user ${userId}`);
        throw new Error('Staff not found for the user.');
    }

    const staffId = staff._id;

    const lastEvent = await AttendanceEventModel.findOne({
        staffId,
        at: { $gte: dayStart, $lte: dayEnd },
    })
        .sort({ at: -1 })
        .lean();

    if (lastEvent?.type === 'check_in') {
        throw new Error('You are already checked in.');
    }

    const shiftAssignment = await ShiftAssignmentModel.findOne({
        staffId,
        startDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gte: now } }],
        isActive: true,
    })
        .populate('shiftId')
        .lean();

    if (!shiftAssignment || !shiftAssignment.shiftId) {
        console.error(`[CheckIn] No active shift for staff ${staffId}`);
        throw new Error('No active shift assignment found.');
    }

    const shift = shiftAssignment.shiftId as unknown as IShift;
    console.log(
        `[CheckIn] Found shift: ${shift.name} (${shift.startTime} - ${shift.endTime})`,
    );

    const todayDay = now.getDay();
    if (!shift.workDays.includes(todayDay as any)) {
        console.error(
            `[CheckIn] Not a working day. Today: ${todayDay}, WorkDays: ${shift.workDays}`,
        );
        throw new Error('Today is not a working day for your shift.');
    }

    // Check if today is a shift off date
    const isOffDay = await ShiftOffDateService.isDateOff(shift._id, now);
    if (isOffDay) {
        console.error(
            `[CheckIn] Today is a shift off date for shift ${shift._id}`,
        );
        throw new Error('আজ আপনার shift বন্ধ আছে। Check-in করা সম্ভব নয়।');
    }

    const shiftStart = new Date(now);
    const [h, m] = shift.startTime.split(':');
    shiftStart.setHours(Number(h), Number(m), 0, 0);

    const shiftEnd = new Date(now);
    const [eh, em] = shift.endTime.split(':');
    shiftEnd.setHours(Number(eh), Number(em), 0, 0);

    // Allow 15 minutes buffer before shift start
    const EARLY_BUFFER_MINUTES = 15;
    const earliestCheckIn = new Date(
        shiftStart.getTime() - EARLY_BUFFER_MINUTES * 60000,
    );

    console.log(
        `[CheckIn] Time check: Now=${now.toLocaleTimeString()}, Start=${shiftStart.toLocaleTimeString()}, Window=${earliestCheckIn.toLocaleTimeString()}`,
    );

    if (now < earliestCheckIn) {
        throw new Error(
            `Shift has not started yet. You can check in from ${earliestCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        );
    }

    if (now > shiftEnd) {
        throw new Error('Shift time is over. You can no longer check in.');
    }

    const event = await AttendanceEventModel.create({
        staffId,
        shiftId: shift._id,
        type: 'check_in',
        at: now,
        source,
        ip,
        userAgent,
        isManual: false,
        remarks: null,
    });

    // Logic: If checking in early OR within strict grace period (5 mins), snap to Shift Start.
    // This handles Time Sync issues (Client vs Server) and ensures "Check In Now" counts from start.
    const TOLERANCE_MINUTES = 5;
    const diffFromStartMinutes = (now.getTime() - shiftStart.getTime()) / 60000;

    // Snap if early (< 0) OR within tolerance (<= 5)
    const officialCheckInTime =
        diffFromStartMinutes <= TOLERANCE_MINUTES ? shiftStart : now;

    let attendanceDay = await AttendanceDayModel.findOne({
        staffId,
        date: dayStart,
    });

    if (!attendanceDay) {
        attendanceDay = new AttendanceDayModel({
            staffId,
            shiftId: shift._id,
            date: dayStart,
            status: 'present',
            checkInAt: officialCheckInTime,
            totalMinutes: 0,
            lateMinutes: 0,
            earlyExitMinutes: 0,
            otMinutes: 0,
            isAutoAbsent: false,
            isManual: false,
            notes: null,
        });
    } else {
        attendanceDay.status = 'present';
        attendanceDay.shiftId = shift._id;
        if (!attendanceDay.checkInAt) {
            attendanceDay.checkInAt = officialCheckInTime;
        }
    }

    // Calculate late minutes based on actual shift start vs official check-in
    // Since we snap to shiftStart if early, diff will be 0.
    const diffMinutes = Math.round(
        (officialCheckInTime.getTime() - shiftStart.getTime()) / 60000,
    );

    if (diffMinutes > 0) {
        attendanceDay.lateMinutes = diffMinutes;

        if (diffMinutes >= shift.halfDayAfterMinutes) {
            attendanceDay.status = 'half_day';
        } else if (diffMinutes >= shift.lateAfterMinutes) {
            attendanceDay.status = 'late';
        } else if (diffMinutes <= shift.gracePeriodMinutes) {
            attendanceDay.status = 'present';
            attendanceDay.lateMinutes = 0;
        }
    } else {
        // Early check-in or on time
        attendanceDay.lateMinutes = 0;
        attendanceDay.status = 'present';
    }

    await attendanceDay.save();

    console.log(
        `[CheckIn] Success for user ${userId}. Time snapped to ${officialCheckInTime.toLocaleTimeString()}`,
    );

    return {
        event,
        attendanceDay,
        shift,
    };
};

async function checkOutInDB({
    userId,
    ip,
    userAgent,
    source = 'web',
}: {
    userId: string;
    ip: string;
    userAgent: string;
    source?: 'web' | 'mobile' | 'manual';
}) {
    const now = new Date();

    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff not found for the user.');
    }

    const staffId = staff._id;

    const lastEvent = await AttendanceEventModel.findOne({
        staffId,
        at: { $gte: dayStart, $lte: dayEnd },
    })
        .sort({ at: -1 })
        .lean();

    if (!lastEvent || lastEvent.type !== 'check_in') {
        throw new Error('You must check in before checking out.');
    }

    let attendanceDay = await AttendanceDayModel.findOne({
        staffId,
        date: dayStart,
    });

    // Handle Overnight Shift: If checking out in the morning (e.g. 7:30 AM) for a shift started yesterday (e.g. 10 PM)
    if (!attendanceDay) {
        const yesterdayStart = new Date(dayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        attendanceDay = await AttendanceDayModel.findOne({
            staffId,
            date: yesterdayStart,
            checkOutAt: null, // Look for open session
        });
    }

    if (!attendanceDay) {
        throw new Error('No check-in record found.');
    }

    if (!attendanceDay.checkInAt) {
        throw new Error('No valid check-in found for today.');
    }

    const event = await AttendanceEventModel.create({
        staffId,
        shiftId: attendanceDay.shiftId,
        type: 'check_out',
        at: now,
        source,
        ip,
        userAgent,
        isManual: false,
        remarks: null,
    });

    attendanceDay.checkOutAt = now;

    const shiftAssignment = await ShiftAssignmentModel.findOne({
        staffId,
        startDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gte: now } }],
        isActive: true,
    })
        .populate('shiftId')
        .lean();

    if (shiftAssignment?.shiftId) {
        const shiftData = shiftAssignment.shiftId as unknown as IShift;

        const shiftEnd = new Date(now);
        const [eh, em] = shiftData.endTime.split(':');
        shiftEnd.setHours(Number(eh), Number(em), 0, 0);

        if (now > shiftEnd) {
            const otMinutes = Math.round(
                (now.getTime() - shiftEnd.getTime()) / 60000,
            );
            attendanceDay.otMinutes = otMinutes;
        } else {
            const earlyExitMinutes = Math.round(
                (shiftEnd.getTime() - now.getTime()) / 60000,
            );
            attendanceDay.earlyExitMinutes = earlyExitMinutes;

            if (earlyExitMinutes >= shiftData.halfDayAfterMinutes) {
                attendanceDay.status = 'half_day';
            } else if (earlyExitMinutes > 0) {
                // Only set to early_exit if it was previously present/late,
                // otherwise keep as half_day if check-in already triggered it.
                // However, usually we might want to flag it.
                // For now, let's stick to the requested consistency: if early exit > 0, status could be 'early_exit'
                // OR we can leave it as 'present' with earlyExitMinutes > 0.
                // But typically 'early_exit' is a status.
                if (
                    attendanceDay.status === 'present' ||
                    attendanceDay.status === 'late'
                ) {
                    attendanceDay.status = 'early_exit';
                }
            }
        }
    }

    const totalMinutes = Math.round(
        (now.getTime() - attendanceDay.checkInAt.getTime()) / 60000,
    );
    attendanceDay.totalMinutes = totalMinutes;

    await attendanceDay.save();

    return {
        event,
        attendanceDay,
    };
}

async function getTodayAttendanceFromDB(userId: string) {
    const now = new Date();

    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff not found for the user.');
    }

    const staffId = staff._id;

    const attendanceDay = await AttendanceDayModel.findOne({
        staffId,
        date: dayStart,
    }).lean();

    const attendanceEvents = await AttendanceEventModel.find({
        staffId,
        at: { $gte: dayStart, $lte: dayEnd },
    })
        .sort({ at: 1 })
        .lean();

    return {
        attendanceDay,
        attendanceEvents,
    };
}

//     };
// }

async function getMonthlyStatsInDB(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
    );

    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff not found for the user.');
    }
    const staffId = staff._id;

    // Get Attendance Stats
    const attendanceStats = await AttendanceDayModel.aggregate([
        {
            $match: {
                staffId: staffId,
                date: { $gte: startOfMonth, $lte: endOfMonth },
            },
        },
        {
            $group: {
                _id: null,
                presentCount: { $sum: 1 },
                lateCount: {
                    $sum: {
                        $cond: [{ $gt: ['$lateMinutes', 0] }, 1, 0],
                    },
                },
            },
        },
    ]);

    const { default: OvertimeModel } =
        await import('../models/overtime.model.js');

    // Get Overtime Stats
    const overtimeStats = await OvertimeModel.aggregate([
        {
            $match: {
                staffId: staffId,
                date: { $gte: startOfMonth, $lte: endOfMonth },
                // status: 'approved' // Should we only count approved? Or all? User just said dynamic.
                // Usually "Total OT" implies verified or at least completed.
                // Let's include all for now or maybe just those with endTime?
                // Let's stick to simple sum of durationMinutes.
            },
        },
        {
            $group: {
                _id: null,
                totalMinutes: { $sum: '$durationMinutes' },
            },
        },
    ]);

    const present = attendanceStats[0]?.presentCount || 0;
    const late = attendanceStats[0]?.lateCount || 0;
    const totalOvertimeMinutes = overtimeStats[0]?.totalMinutes || 0;

    const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];
    const month = monthNames[now.getMonth()];

    return {
        month,
        present,
        late,
        totalOvertimeMinutes,
    };
}

async function getMyAttendanceHistoryInDB(userId: string, days: number = 7) {
    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff not found for the user.');
    }

    const staffId = staff._id;

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Find attendance days with shift details
    const attendanceDays = await AttendanceDayModel.find({
        staffId,
        date: {
            $gte: startDate,
            $lte: endDate,
        },
    })
        .populate('shiftId', 'name')
        .sort({ date: -1 })
        .lean();

    return attendanceDays;
}

async function getAllAttendanceFromDB({
    startDate,
    endDate,
    staffId,
    status,
    branchId,
    page = 1,
    limit = 50,
    search,
}: {
    startDate?: string;
    endDate?: string;
    staffId?: string;
    status?: string;
    branchId?: string;
    page?: number;
    limit?: number;
    search?: string;
}) {
    const query: any = {};
    const { default: UserModel } = await import('../models/user.model.js');

    // Search filter: Find users matching name, then find staff, then filter attendance
    if (search) {
        const matchingUsers = await UserModel.find({
            name: { $regex: search, $options: 'i' },
        })
            .project({ _id: 1 })
            .toArray();

        const matchingUserIds = matchingUsers.map((u) => u._id);

        const matchingStaff = await StaffModel.find({
            userId: { $in: matchingUserIds },
        }).select('_id');

        const matchingStaffIds = matchingStaff.map((s) => s._id);

        // If staffId is also provided, intersect the lists
        if (staffId) {
            query.staffId = {
                $in: matchingStaffIds.filter((id) => id.toString() === staffId),
            };
        } else {
            query.staffId = { $in: matchingStaffIds };
        }
    } else if (staffId) {
        // Staff filter (if no search)
        query.staffId = staffId;
    }

    // Date filter
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
        query.status = status;
    }

    const skip = (page - 1) * limit;

    // Get attendance records with populated staff and shift details
    let attendanceRecords = await AttendanceDayModel.find(query)
        .populate({
            path: 'staffId',
            select: 'staffId designation department branchId userId', // Include userId for manual population
            populate: {
                path: 'branchId',
                select: 'name',
            },
        })
        .populate('shiftId', 'name startTime endTime')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    // Apply branch filter if needed (after population)
    if (branchId) {
        attendanceRecords = attendanceRecords.filter(
            (record: any) => record.staffId?.branchId?.toString() === branchId,
        );
    }

    // Manual Population of User Names
    const userIdsToFetch = attendanceRecords
        .map((r: any) => r.staffId?.userId)
        .filter((id) => id);

    if (userIdsToFetch.length > 0) {
        const users = await UserModel.find({
            _id: { $in: userIdsToFetch },
        })
            .project({ _id: 1, name: 1, email: 1 })
            .toArray();

        const userMap = new Map(users.map((u) => [u._id.toString(), u]));

        attendanceRecords = attendanceRecords.map((record: any) => {
            if (record.staffId?.userId) {
                const user = userMap.get(record.staffId.userId.toString());
                if (user) {
                    record.staffId.name = user.name;
                    record.staffId.email = user.email;
                }
            }
            return record;
        });
    }

    const total = await AttendanceDayModel.countDocuments(query);

    return {
        records: attendanceRecords,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
}

async function updateAttendanceStatusInDB({
    attendanceId,
    status,
    notes,
}: {
    attendanceId: string;
    status: string;
    notes?: string;
    updatedBy: string;
}) {
    const validStatuses = [
        'present',
        'absent',
        'on_leave',
        'weekend',
        'holiday',
        'half_day',
        'late',
        'early_exit',
    ];

    if (!validStatuses.includes(status)) {
        throw new Error(
            `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        );
    }

    const attendanceDay = await AttendanceDayModel.findById(attendanceId);

    if (!attendanceDay) {
        throw new Error('Attendance record not found');
    }

    // Update attendance
    attendanceDay.status = status as any;
    attendanceDay.isManual = true;
    if (notes) {
        attendanceDay.notes = notes;
    }

    await attendanceDay.save();

    // Log audit trail (optional - import AuditLog model if you have it)
    // await AuditLogModel.create({
    //     action: 'UPDATE_ATTENDANCE_STATUS',
    //     performedBy: updatedBy,
    //     targetId: attendanceId,
    //     changes: { from: oldStatus, to: status },
    //     notes,
    // });

    return attendanceDay;
}

export default {
    checkInInDB,
    checkOutInDB,
    getTodayAttendanceFromDB,
    getMonthlyStatsInDB,
    getMyAttendanceHistoryInDB,
    getAllAttendanceFromDB,
    updateAttendanceStatusInDB,
};
