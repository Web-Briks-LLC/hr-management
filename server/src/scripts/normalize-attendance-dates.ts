import { connect, disconnect } from 'mongoose';
import envConfig from '../config/env.config.js';
import AttendanceDayModel from '../models/attendance-day.model.js';

async function normalizeAttendanceDates() {
    try {
        console.log('Connecting to database...');
        await connect(envConfig.mongo_uri);
        console.log('Connected.');

        const records = await AttendanceDayModel.find({});
        console.log(`Found ${records.length} records to process.`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const record of records) {
            const currentDate = new Date(record.date);
            
            // Calculate UTC midnight for the recorded date
            // We assume the original 'local midnight' was intending to represent that specific calendar day.
            // If the time is not 00:00:00 UTC, it was likely shifted by a timezone.
            
            const year = currentDate.getUTCFullYear();
            const month = currentDate.getUTCMonth();
            const day = currentDate.getUTCDate();
            
            // If the original date had hours > 12, it might have shifted from the previous day's local midnight.
            // If hours < 12, it might have shifted from the same day's local midnight.
            // However, most reliable is to just take the "nearest" midnight or the calendar date it currently represents.
            
            const utcMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

            if (currentDate.getTime() !== utcMidnight.getTime()) {
                record.date = utcMidnight;
                await record.save();
                updatedCount++;
                if (updatedCount % 50 === 0) console.log(`Processed ${updatedCount} records...`);
            } else {
                skippedCount++;
            }
        }

        console.log(`Normalization complete!`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Already normalized: ${skippedCount}`);

    } catch (error) {
        console.error('Error during normalization:', error);
    } finally {
        await disconnect();
    }
}

normalizeAttendanceDates();
