import { connect, disconnect } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import StaffModel from '../models/staff.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import { eachDayOfInterval } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function run() {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not set in .env');
        }

        console.log(`Connecting to: ${mongoUri.substring(0, 40)}...`);
        await connect(mongoUri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            dbName: process.env.DB_NAME || 'hr-management',
        });
        console.log('Connected Successfully.');

        const startDate = new Date(Date.UTC(2026, 1, 1)); // Feb 1
        const endDate = new Date(Date.UTC(2026, 1, 28, 23, 59, 59, 999)); // Feb 28

        console.log(`Fixing attendance for February 2026 (${startDate.toISOString()} to ${endDate.toISOString()})`);

        const staffList = await StaffModel.aggregate([
            {
                $lookup: {
                    from: 'user',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' }
        ]);

        console.log(`Found ${staffList.length} staff members.`);
        
        let processedCount = 0;
        let updateCount = 0;

        // Lamia Tabassum: 4 days absent (last 4 working days of Feb)
        const LAMIA_ABSENT_DAYS = 4;

        for (const staff of staffList) {
            const userName = staff.user.name || 'Unknown';
            const isLamia = userName.toLowerCase().includes('lamia tabassum');

            // Fetch all shift assignments overlapping Feb 2026
            const assignments = await ShiftAssignmentModel.find({
                staffId: staff._id,
                $or: [
                    { endDate: null },
                    { endDate: { $gte: startDate } }
                ],
                startDate: { $lte: endDate }
            }).populate('shiftId').lean();

            const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

            // For Lamia: first collect all working days, then mark last 4 as absent
            if (isLamia) {
                // Collect all working days with their shift info
                const workingDays: { day: Date; shift: any }[] = [];
                for (const day of daysInMonth) {
                    const dayStr = day.toISOString().split('T')[0]!;
                    const dayValue = day.getUTCDay();

                    const dayAssignment = (assignments as any[]).find(sa => {
                        const s = sa.startDate.toISOString().split('T')[0]!;
                        const saEnd = sa.endDate as Date | null | undefined;
                        const e = saEnd ? saEnd.toISOString().split('T')[0] : '9999-12-31';
                        return dayStr >= s && dayStr <= e!;
                    });

                    const shift: any = dayAssignment?.shiftId;
                    if (!shift) continue;

                    if (shift.workDays.includes(dayValue)) {
                        workingDays.push({ day, shift });
                    }
                }

                const totalWorkDays = workingDays.length;
                const absentDays = workingDays.slice(totalWorkDays - LAMIA_ABSENT_DAYS);
                const absentDateStrs = new Set(absentDays.map(d => d.day.toISOString().split('T')[0]));

                let presentCount = 0;
                let absentCount = 0;

                for (const { day, shift } of workingDays) {
                    const dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
                    const dayStr = day.toISOString().split('T')[0]!;

                    if (absentDateStrs.has(dayStr)) {
                        // Mark as absent
                        await AttendanceDayModel.findOneAndUpdate(
                            { staffId: staff._id, date: dayStart },
                            {
                                $set: {
                                    status: 'absent',
                                    shiftId: shift._id,
                                    lateMinutes: 0,
                                    earlyExitMinutes: 0,
                                    isAutoAbsent: false,
                                    isManual: true,
                                    notes: 'System correction for Feb 2026 - absent'
                                }
                            },
                            { upsert: true, new: true }
                        );
                        absentCount++;
                    } else {
                        // Mark as present
                        await AttendanceDayModel.findOneAndUpdate(
                            { staffId: staff._id, date: dayStart },
                            {
                                $set: {
                                    status: 'present',
                                    shiftId: shift._id,
                                    lateMinutes: 0,
                                    earlyExitMinutes: 0,
                                    isAutoAbsent: false,
                                    isManual: true,
                                    notes: 'System correction for Feb 2026'
                                }
                            },
                            { upsert: true, new: true }
                        );
                        presentCount++;
                    }
                    updateCount++;
                }

                console.log(`Updated Lamia Tabassum: ${presentCount} present, ${absentCount} absent (total working days: ${totalWorkDays})`);
            } else {
                // Everyone else: all working days = present, late=0, absent=0
                let staffUpdateCount = 0;
                for (const day of daysInMonth) {
                    const dayStr = day.toISOString().split('T')[0]!;
                    const dayValue = day.getUTCDay();

                    const dayAssignment = (assignments as any[]).find(sa => {
                        const s = sa.startDate.toISOString().split('T')[0]!;
                        const saEnd = sa.endDate as Date | null | undefined;
                        const e = saEnd ? saEnd.toISOString().split('T')[0] : '9999-12-31';
                        return dayStr >= s && dayStr <= e!;
                    });

                    const shift: any = dayAssignment?.shiftId;
                    if (!shift) continue;

                    if (shift.workDays.includes(dayValue)) {
                        const dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
                        
                        await AttendanceDayModel.findOneAndUpdate(
                            { staffId: staff._id, date: dayStart },
                            {
                                $set: {
                                    status: 'present',
                                    shiftId: shift._id,
                                    lateMinutes: 0,
                                    earlyExitMinutes: 0,
                                    isAutoAbsent: false,
                                    isManual: true,
                                    notes: 'System correction for Feb 2026'
                                }
                            },
                            { upsert: true, new: true }
                        );
                        updateCount++;
                        staffUpdateCount++;
                    }
                }
                
                // Clear any absent or late days for this staff that might exist but are NOT in the standard `present` days we just forced above
                await AttendanceDayModel.updateMany(
                   {
                      staffId: staff._id,
                      date: { $gte: startDate, $lte: endDate },
                      status: { $ne: 'present' }
                   },
                   {
                      $set: {
                         status: 'weekend', // Treat remaining non-working days as something benign, or remove entirely. 
                         // But we know we just populated the real working days as 'present'.
                         // If there are existing 'absent' records on weekends or something, we can ensure they're 'weekend' and not 0 absent/0 late affecting.
                         lateMinutes: 0,
                         earlyExitMinutes: 0
                      }
                   }
                )
                
                if (staffUpdateCount > 0) {
                    console.log(`Updated ${userName}: ${staffUpdateCount} present records.`);
                } else {
                    console.log(`WARNING: ${userName} has NO SHIFTS assigned for February.`);
                }
            }

            processedCount++;
            if (processedCount % 5 === 0) {
                console.log(`Processed ${processedCount} staffs...`);
            }
        }

        console.log(`\nFix completed!`);
        console.log(`Total Staffs Processed: ${processedCount}`);
        console.log(`Total Records Updated/Created: ${updateCount}`);

    } catch (error) {
        console.error('Error during fix:', error);
    } finally {
        await disconnect();
        process.exit(0);
    }
}

run();
