import AttendanceDayModel from '../models/attendance-day.model.js';
import OvertimeModel from '../models/overtime.model.js';
import LeaveApplicationModel from '../models/leave_application.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import StaffModel from '../models/staff.model.js';
import UserModel from '../models/user.model.js';
import notificationService from './notification.service.js';
import analyticsService from './analytics.service.js';
import { sendBulkSMS } from '../utils/sms.util.js';
import {
    getBDNow,
    getBDStartOfDay,
    getBDEndOfDay,
    getBDWeekDay,
    getPreviousMonthRange,
} from '../utils/date.util.js';
import envConfig from '../config/env.config.js';

// ============================================
// ATTENDANCE AUTO-CHECK (Every 10 minutes)
// ============================================

async function processAttendanceCheck() {
    const now = getBDNow();
    const todayStart = getBDStartOfDay(now);
    const todayEnd = getBDEndOfDay(now);
    
    // Day of week in Bangladesh
    const currentDayOfWeek = getBDWeekDay(now);

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
                        
                        const shiftStartTime = getBDStartOfDay(now);
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
                
                const shiftStartTime = getBDStartOfDay(now);
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
// OVERTIME AUTO-STOP (Every 1 minute)
// ============================================

async function processOvertimeAutoStop() {
    const now = getBDNow();
    let closedCount = 0;

    try {
        // Find all active overtimes (checked in but not ended)
        const activeOvertimes = await OvertimeModel.find({
            actualStartTime: { $exists: true, $ne: null },
            endTime: { $exists: false },
            durationMinutes: { $gt: 0 } // Must have an allowed duration
        }).populate('staffId');

        for (const ot of activeOvertimes) {
            try {
                const actualStartTime = new Date(ot.actualStartTime!);
                // Calculate when this OT should stop based on its allowed duration
                const scheduledEndTime = new Date(actualStartTime.getTime() + (ot.durationMinutes * 60 * 1000));

                if (now >= scheduledEndTime) {
                    // Time to auto-stop!
                    const actualDurationMinutes = Math.floor(
                        (now.getTime() - actualStartTime.getTime()) / (1000 * 60)
                    );

                    ot.endTime = now;
                    ot.actualDurationMinutes = actualDurationMinutes;
                    ot.isAutoStopped = true;
                    ot.reason = (ot.reason || '') + ' [Auto-stopped by system]';
                    
                    await ot.save();
                    closedCount++;

                    // Send notification
                    const staff = ot.staffId as any;
                    if (staff?.userId) {
                        await notificationService.createNotification({
                            userId: staff.userId,
                            title: 'Overtime Auto-Stopped',
                            message: `Your overtime session automatically ended after ${ot.durationMinutes} minutes.`,
                            type: 'overtime',
                            priority: 'medium',
                            resourceType: 'overtime',
                            resourceId: ot._id,
                        });
                    }
                }
            } catch (otError) {
                console.error(`[Scheduler] Error auto-stopping overtime ${ot._id}:`, otError);
            }
        }

        if (closedCount > 0) {
            console.log(`[Scheduler] Overtime auto-stop: ${closedCount} overtime entries completed.`);
        }

        return { closedCount };
    } catch (error) {
        console.error('[Scheduler] Error in overtime auto-stop:', error);
        throw error;
    }
}

// ============================================
// LEAVE EXPIRY (Daily at 11:59 PM)
// ============================================

async function processLeaveExpiry() {
    const now = getBDNow();
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
// MONTHLY FINANCE SMS REPORT (10th at 10:00 AM)
// ============================================

async function processMonthlyFinanceSMSReport() {
    console.log('[Scheduler] Starting monthly finance SMS report processing...');
    
    try {
        const { year, month, monthName } = getPreviousMonthRange();
        
        // 1. Get Financial Totals
        const { totalEarnings, totalExpenses } = await analyticsService.getFinanceTotalsForPeriod(year, month);
        
        // 2. Identify Recipients
        // a. Admins (Super Admins, Admins, HR Managers)
        await UserModel.find({
            role: { $in: ['super_admin', 'admin'] }
        }).toArray();

        // b. Shift Assigned Staff
        await ShiftAssignmentModel.find({ isActive: true }).select('staffId');
        
        // c. Fetch all staff to get phone numbers
        const allStaff = await StaffModel.find({ status: 'active' }).select('phone userId');
        
        // d. Filtering & Deduplication
        const recipientNumbers = new Set<string>();
        
        for (const staff of allStaff) {
            // Criteria: Everyone with a phone number gets the monthly report
            if (staff.phone) {
                recipientNumbers.add(staff.phone);
            }
        }

        const phoneList = Array.from(recipientNumbers);
        if (phoneList.length === 0) {
            console.warn('[Scheduler] No recipients found for monthly finance SMS.');
            return { success: false, reason: 'No recipients' };
        }

        // 3. Construct Message
        const message = `Finance Report (${monthName} ${year}):\nTotal Earnings: ৳${totalEarnings.toLocaleString()}\nTotal Expenses: ৳${totalExpenses.toLocaleString()}\nNet Profit: ৳${(totalEarnings - totalExpenses).toLocaleString()}.\n- HR Management System`;

        // 4. Send Bulk SMS
        console.log(`[Scheduler] Sending finance report to ${phoneList.length} recipients.`);
        const response = await sendBulkSMS({ number: phoneList, message });
        
        console.log('[Scheduler] Monthly finance SMS response:', JSON.stringify(response));
        return { success: true, recipientCount: phoneList.length };

    } catch (error) {
        console.error('[Scheduler] Error in monthly finance SMS report:', error);
        throw error;
    }
}

// ============================================
// SCHEDULER MANAGER
// ============================================

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

let attendanceInterval: NodeJS.Timeout | null = null;
let overtimeInterval: NodeJS.Timeout | null = null;
let monthlySMSInterval: NodeJS.Timeout | null = null;

function startAllSchedulers() {
    console.log('[Scheduler] Starting all schedulers...');

    // Attendance check - every 10 minutes
    processAttendanceCheck().catch(console.error);
    attendanceInterval = setInterval(() => {
        processAttendanceCheck().catch(console.error);
    }, TEN_MINUTES);
    console.log('[Scheduler] Attendance check: Running every 10 minutes');

    // Overtime auto-stop - every 1 minute
    processOvertimeAutoStop().catch(console.error);
    overtimeInterval = setInterval(() => {
        processOvertimeAutoStop().catch(console.error);
    }, ONE_MINUTE);
    console.log('[Scheduler] Overtime auto-stop: Running every 1 minute');

    // Monthly Finance SMS and Leave Expiry - check every minute
    const runScheduledTasksIfTime = () => {
        const now = getBDNow();
        const bdParts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Dhaka',
            hour: 'numeric',
            minute: 'numeric',
            day: 'numeric',
            hour12: false
        }).formatToParts(now);

        const hour = Number(bdParts.find(p => p.type === 'hour')?.value);
        const minute = Number(bdParts.find(p => p.type === 'minute')?.value);
        const day = Number(bdParts.find(p => p.type === 'day')?.value);

        // Daily Leave Expiry at 11:59 PM (23:59)
        if (hour === 23 && minute === 59) {
            processLeaveExpiry().catch(console.error);
        }

        // Monthly Finance SMS from ENV (Default: 10th at 10:00 AM)
        if (
            day === (envConfig.monthly_report_day || 10) &&
            hour === (envConfig.monthly_report_hour || 10) &&
            minute === (envConfig.monthly_report_minute || 0)
        ) {
            processMonthlyFinanceSMSReport().catch(console.error);
        }
    };
    
    // Check every minute for scheduled tasks
    runScheduledTasksIfTime();
    monthlySMSInterval = setInterval(runScheduledTasksIfTime, ONE_MINUTE);
    const scheduleDay = envConfig.monthly_report_day || 10;
    const scheduleHour = envConfig.monthly_report_hour || 10;
    const scheduleMinute = String(envConfig.monthly_report_minute || 0).padStart(2, '0');

    console.log(`[Scheduler] Monthly finance SMS: Scheduled for ${scheduleDay}th at ${scheduleHour}:${scheduleMinute}`);
    console.log('[Scheduler] Leave expiry: Scheduled for daily at 11:59 PM');

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
    if (monthlySMSInterval) {
        clearInterval(monthlySMSInterval);
        monthlySMSInterval = null;
    }
    console.log('[Scheduler] All schedulers stopped');
}

export default {
    processAttendanceCheck,
    processOvertimeAutoStop,
    processLeaveExpiry,
    processMonthlyFinanceSMSReport,
    startAllSchedulers,
    stopAllSchedulers,
};
