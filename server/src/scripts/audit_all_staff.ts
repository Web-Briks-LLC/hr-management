import mongoose from 'mongoose';
import envConfig from '../config/env.config.js';
import StaffModel from '../models/staff.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(envConfig.mongo_uri);
        console.log('Connected.');

        console.log('Fetching all active staff...');
        console.log('Fetching all active staff...');
        const activeStaff = await StaffModel.find({
            status: 'active',
        });
        console.log(`Found ${activeStaff.length} active staff members.`);

        const usersCollection = mongoose.connection.collection('user');

        const janStart = new Date('2026-01-01T00:00:00.000Z');
        const janEnd = new Date('2026-01-31T23:59:59.999Z');

        const issues: string[] = [];
        const warnings: string[] = [];

        console.log('\n--- Starting Audit ---\n');

        for (const staff of activeStaff) {
            // @ts-ignore
            const user = await usersCollection.findOne({ _id: staff.userId });
            const userName = user
                ? user.name
                : 'Unknown User (' + staff.userId + ')';
            const staffId = staff.staffId;

            // 1. Check Shift Assignment
            const assignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id,
                isActive: true,
            });

            if (!assignment) {
                issues.push(
                    `[CRITICAL] ${userName} (${staffId}): NO ACTIVE SHIFT ASSIGNMENT.`,
                );
                continue;
            }

            // 2. Check Attendance for Jan 2026 (Skip if joined after Jan)
            if (staff.joinDate > janEnd) {
                // warnings.push(`[INFO] ${userName} (${staffId}): Joined after Jan 2026. Skipping attendance check.`);
                continue;
            }

            // If joined in Jan, adjust check
            let checkStart = janStart;
            if (staff.joinDate > janStart) checkStart = staff.joinDate;

            const records = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: checkStart, $lte: janEnd },
            });

            if (records.length === 0) {
                // If joined very recently (e.g. Jan 31), maybe 0 is okay? but unlikely.
                issues.push(
                    `[CRITICAL] ${userName} (${staffId}): ZERO attendance records found for Jan 2026.`,
                );
            } else {
                // Check for Wazed-like issues (High Late count but suspicious)
                let lateCount = 0;
                let absentCount = 0;
                let presentCount = 0;

                for (const r of records) {
                    if (r.status === 'late') lateCount++;
                    if (r.status === 'absent') absentCount++;
                    if (r.status === 'present') presentCount++;
                }

                // Thresholds
                const total = records.length;
                if (lateCount > total * 0.8) {
                    warnings.push(
                        `[WARN] ${userName} (${staffId}): High Late Count (${lateCount}/${total}). Might miss check-ins.`,
                    );
                }
                if (absentCount > total * 0.5) {
                    warnings.push(
                        `[WARN] ${userName} (${staffId}): High Absent Count (${absentCount}/${total}). Check status.`,
                    );
                }
            }
        }

        console.log('\n--- Audit Results ---\n');

        if (issues.length > 0) {
            console.log('ISSUES FOUND:');
            issues.forEach((i) => console.log(i));
        } else {
            console.log('No CRITICAL issues found.');
        }

        if (warnings.length > 0) {
            console.log('\nWARNINGS:');
            warnings.forEach((w) => console.log(w));
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

run();
