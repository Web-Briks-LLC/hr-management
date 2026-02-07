import { startOfDay, endOfDay } from 'date-fns';
import AttendanceDayModel from '../models/attendance-day.model.js';
import OvertimeModel from '../models/overtime.model.js';
import LeaveApplicationModel from '../models/leave_application.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import StaffModel from '../models/staff.model.js';
import notificationService from './notification.service.js';

// ============================================
// ATTENDANCE AUTO-CHECK (Every 30 minutes)
// ============================================

async function processAttendanceCheck() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    let lateCount = 0;
    let absentCount = 0;

    try {
        // Get all active shift assignments for today
        const activeAssignments = await ShiftAssignmentModel.aggregate([
            {
                $match: {
                    isActive: true,
                    startDate: { $lte: now },
                    $or: [{ endDate: null }, { endDate: { $gte: todayStart } }],
                },
            },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staffId',
                    foreignField: '_id',
                    as: 'staff',
                },
            },
            { $unwind: '$staff' },
            {
                $match: {
                    'staff.status': 'active',
                },
            },
            {
                $lookup: {
                    from: 'shifts',
                    localField: 'shiftId',
                    foreignField: '_id',
                    as: 'shift',
                },
            },
            { $unwind: '$shift' },
            {
                $match: {
                    'shift.isActive': true,
                    'shift.workDays': currentDayOfWeek,
                },
            },
            {
                $lookup: {
                    from: 'user',
                    localField: 'staff.userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    staffId: '$staff._id',
                    userId: '$staff.userId',
                    shiftId: '$shift._id',
                    shiftName: '$shift.name',
                    startTime: '$shift.startTime',
                    gracePeriodMinutes: '$shift.gracePeriodMinutes',
                    halfDayAfterMinutes: '$shift.halfDayAfterMinutes',
                    lateAfterMinutes: '$shift.lateAfterMinutes',
                },
            },
        ]);

        for (const assignment of activeAssignments) {
            try {
                // Check if attendance already exists for today
                const existingAttendance = await AttendanceDayModel.findOne({
                    staffId: assignment.staffId,
                    date: { $gte: todayStart, $lte: todayEnd },
                });

                if (existingAttendance) {
                    // Check if we need to upgrade 'late' to 'absent'
                    if (
                        existingAttendance.status === 'late' &&
                        !existingAttendance.checkInAt
                    ) {
                        const halfDayMinutes =
                            assignment.halfDayAfterMinutes || 240;
                        const [shiftHour, shiftMinute] = assignment.startTime
                            .split(':')
                            .map(Number);
                        const shiftStartTime = new Date(now);
                        shiftStartTime.setHours(shiftHour, shiftMinute, 0, 0);

                        const absentThreshold = new Date(
                            shiftStartTime.getTime() +
                                halfDayMinutes * 60 * 1000,
                        );

                        if (now >= absentThreshold) {
                            // Upgrade to absent
                            existingAttendance.status = 'absent';
                            existingAttendance.isAutoAbsent = true;
                            existingAttendance.notes =
                                (existingAttendance.notes || '') +
                                ' | Auto-upgraded to Absent by system';
                            existingAttendance.processedAt = now;
                            await existingAttendance.save();
                            absentCount++;

                            // Send notification
                            if (assignment.userId) {
                                await notificationService.createNotification({
                                    userId: assignment.userId,
                                    title: 'Marked Absent',
                                    message: `You have been marked absent for today (No check-in). Shift: ${assignment.shiftName}`,
                                    type: 'attendance',
                                    priority: 'high',
                                    resourceType: 'attendance',
                                });
                            }
                            console.log(
                                `[Scheduler] Upgraded staff ${assignment.staffId} from Late to Absent`,
                            );
                        }
                    }
                    continue;
                }

                // Parse shift start time (format: "HH:mm")
                const [shiftHour, shiftMinute] = assignment.startTime
                    .split(':')
                    .map(Number);
                const shiftStartTime = new Date(now);
                shiftStartTime.setHours(shiftHour, shiftMinute, 0, 0);

                // Calculate thresholds
                const graceMinutes = assignment.gracePeriodMinutes || 10;
                const lateThreshold = new Date(
                    shiftStartTime.getTime() + graceMinutes * 60 * 1000,
                );
                const halfDayMinutes = assignment.halfDayAfterMinutes || 240;
                const absentThreshold = new Date(
                    shiftStartTime.getTime() + halfDayMinutes * 60 * 1000,
                );

                // Determine status based on current time
                let status: 'late' | 'absent' | null = null;

                if (now >= absentThreshold) {
                    status = 'absent';
                    absentCount++;
                } else if (now >= lateThreshold) {
                    status = 'late';
                    lateCount++;
                }

                if (status) {
                    // Create auto attendance record
                    await AttendanceDayModel.create({
                        staffId: assignment.staffId,
                        shiftId: assignment.shiftId,
                        date: todayStart,
                        status,
                        isAutoAbsent: true,
                        notes: `Auto-marked as ${status} by system`,
                        processedAt: now,
                    });

                    // Send notification to staff
                    if (assignment.userId) {
                        await notificationService.createNotification({
                            userId: assignment.userId,
                            title:
                                status === 'absent'
                                    ? 'Marked Absent'
                                    : 'Marked Late',
                            message:
                                status === 'absent'
                                    ? `You have been marked absent for today. Shift: ${assignment.shiftName}`
                                    : `You have been marked late for today. Shift: ${assignment.shiftName}`,
                            type: 'attendance',
                            priority: status === 'absent' ? 'high' : 'medium',
                            resourceType: 'attendance',
                        });
                    }
                }
            } catch (staffError) {
                console.error(
                    `[Scheduler] Error processing attendance for staff ${assignment.staffId}:`,
                    staffError,
                );
            }
        }

        if (lateCount > 0 || absentCount > 0) {
            console.log(
                `[Scheduler] Attendance check: ${lateCount} staff marked late, ${absentCount} marked absent`,
            );
        }

        return { lateCount, absentCount };
    } catch (error) {
        console.error('[Scheduler] Error in attendance check:', error);
        throw error;
    }
}

// ============================================
// OVERTIME AUTO-CLOSE (Every 30 minutes)
// ============================================

async function processOvertimeAutoClose() {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    let closedCount = 0;

    try {
        // Find overtime entries that need auto-close
        const overtimeToClose = await OvertimeModel.aggregate([
            {
                $match: {
                    actualStartTime: { $ne: null, $lt: twelveHoursAgo },
                    endTime: null,
                },
            },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staffId',
                    foreignField: '_id',
                    as: 'staff',
                },
            },
            { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    staffId: 1,
                    userId: '$staff.userId',
                    actualStartTime: 1,
                    date: 1,
                },
            },
        ]);

        for (const ot of overtimeToClose) {
            try {
                const durationMinutes = Math.floor(
                    (now.getTime() - new Date(ot.actualStartTime).getTime()) /
                        (1000 * 60),
                );

                await OvertimeModel.findByIdAndUpdate(ot._id, {
                    endTime: now,
                    durationMinutes,
                    reason:
                        (ot.reason || '') +
                        ' [Auto-closed by system after 12 hours]',
                });

                closedCount++;

                // Send notification
                if (ot.userId) {
                    await notificationService.createNotification({
                        userId: ot.userId,
                        title: 'Overtime Auto-Closed',
                        message: `Your overtime was automatically closed after 12 hours. Duration: ${Math.floor(
                            durationMinutes / 60,
                        )}h ${durationMinutes % 60}m`,
                        type: 'overtime',
                        priority: 'medium',
                        resourceType: 'overtime',
                        resourceId: ot._id,
                    });
                }
            } catch (otError) {
                console.error(
                    `[Scheduler] Error closing overtime ${ot._id}:`,
                    otError,
                );
            }
        }

        if (closedCount > 0) {
            console.log(
                `[Scheduler] Overtime auto-close: ${closedCount} overtime entries closed`,
            );
        }

        return { closedCount };
    } catch (error) {
        console.error('[Scheduler] Error in overtime auto-close:', error);
        throw error;
    }
}

// ============================================
// LEAVE EXPIRY (Daily at 11:59 PM)
// ============================================

async function processLeaveExpiry() {
    const now = new Date();
    let expiredCount = 0;
    let notificationCount = 0;

    try {
        // Find all expired pending leave applications
        const expiredLeaves = await LeaveApplicationModel.aggregate([
            {
                $match: {
                    status: 'pending',
                    expiresAt: { $lt: now },
                },
            },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staffId',
                    foreignField: '_id',
                    as: 'staff',
                },
            },
            { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'user',
                    localField: 'staff.userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    staffId: 1,
                    userId: '$staff.userId',
                    userName: '$user.name',
                    leaveType: 1,
                    startDate: 1,
                    endDate: 1,
                },
            },
        ]);

        // Get admin user IDs for notifications
        const adminUsers = await StaffModel.aggregate([
            {
                $lookup: {
                    from: 'user',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $match: {
                    'user.role': {
                        $in: ['super_admin', 'admin', 'hr_manager'],
                    },
                },
            },
            {
                $project: {
                    userId: 1,
                },
            },
        ]);

        const adminUserIds = adminUsers.map((a) => a.userId);

        for (const leave of expiredLeaves) {
            try {
                // Expire the leave application
                await LeaveApplicationModel.findByIdAndUpdate(leave._id, {
                    status: 'expired',
                });
                expiredCount++;

                const startDateStr = new Date(
                    leave.startDate,
                ).toLocaleDateString('en-GB');
                const endDateStr = new Date(leave.endDate).toLocaleDateString(
                    'en-GB',
                );

                // Notify the staff member
                if (leave.userId) {
                    await notificationService.createNotification({
                        userId: leave.userId,
                        title: 'Leave Application Expired',
                        message: `Your ${leave.leaveType} leave request (${startDateStr} - ${endDateStr}) has expired without admin action.`,
                        type: 'leave',
                        priority: 'medium',
                        resourceType: 'leave',
                        resourceId: leave._id,
                    });
                    notificationCount++;
                }

                // Notify all admins
                for (const adminId of adminUserIds) {
                    await notificationService.createNotification({
                        userId: adminId,
                        title: 'Leave Application Expired',
                        message: `${leave.userName || 'A staff member'}'s ${
                            leave.leaveType
                        } leave request (${startDateStr} - ${endDateStr}) has expired.`,
                        type: 'leave',
                        priority: 'medium',
                        resourceType: 'leave',
                        resourceId: leave._id,
                    });
                    notificationCount++;
                }
            } catch (leaveError) {
                console.error(
                    `[Scheduler] Error expiring leave ${leave._id}:`,
                    leaveError,
                );
            }
        }

        if (expiredCount > 0) {
            console.log(
                `[Scheduler] Leave expiry: ${expiredCount} applications expired, ${notificationCount} notifications sent`,
            );
        }

        return { expiredCount, notificationCount };
    } catch (error) {
        console.error('[Scheduler] Error in leave expiry:', error);
        throw error;
    }
}

// ============================================
// SCHEDULER MANAGER
// ============================================

const THIRTY_MINUTES = 30 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

let attendanceInterval: NodeJS.Timeout | null = null;
let overtimeInterval: NodeJS.Timeout | null = null;
let leaveExpiryInterval: NodeJS.Timeout | null = null;

function startAllSchedulers() {
    console.log('[Scheduler] Starting all schedulers...');

    // Attendance check - every 30 minutes
    processAttendanceCheck().catch(console.error);
    attendanceInterval = setInterval(() => {
        processAttendanceCheck().catch(console.error);
    }, THIRTY_MINUTES);
    console.log('[Scheduler] Attendance check: Running every 30 minutes');

    // Overtime auto-close - every 30 minutes
    processOvertimeAutoClose().catch(console.error);
    overtimeInterval = setInterval(() => {
        processOvertimeAutoClose().catch(console.error);
    }, THIRTY_MINUTES);
    console.log('[Scheduler] Overtime auto-close: Running every 30 minutes');

    // Leave expiry - check every minute, but only run at 11:59 PM
    const runLeaveExpiryIfTime = () => {
        const now = new Date();
        if (now.getHours() === 23 && now.getMinutes() === 59) {
            processLeaveExpiry().catch(console.error);
        }
    };
    runLeaveExpiryIfTime(); // Run immediately if it's 11:59 PM
    leaveExpiryInterval = setInterval(runLeaveExpiryIfTime, ONE_MINUTE);
    console.log('[Scheduler] Leave expiry: Running daily at 11:59 PM');

    console.log('[Scheduler] All schedulers started successfully');
}

function stopAllSchedulers() {
    if (attendanceInterval) {
        clearInterval(attendanceInterval);
        attendanceInterval = null;
    }
    if (overtimeInterval) {
        clearInterval(overtimeInterval);
        overtimeInterval = null;
    }
    if (leaveExpiryInterval) {
        clearInterval(leaveExpiryInterval);
        leaveExpiryInterval = null;
    }
    console.log('[Scheduler] All schedulers stopped');
}

export default {
    processAttendanceCheck,
    processOvertimeAutoClose,
    processLeaveExpiry,
    startAllSchedulers,
    stopAllSchedulers,
};
