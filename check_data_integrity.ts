import mongoose from "mongoose";
import AttendanceDayModel from "./server/src/models/attendance-day.model.js";
import envConfig from "./server/src/config/env.config.js";

const checkData = async () => {
    try {
        await mongoose.connect(
            process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hr-management",
        );
        // Check for records with OT > 0 in Jan 2026
        const startDate = new Date(Date.UTC(2026, 0, 1));
        const endDate = new Date(Date.UTC(2026, 1, 0, 23, 59, 59));

        const count = await AttendanceDayModel.countDocuments({
            date: { $gte: startDate, $lte: endDate },
            otMinutes: { $gt: 0 },
        });

        console.log(`Found ${count} records with otMinutes > 0 in Jan 2026.`);

        if (count > 0) {
            const sample = await AttendanceDayModel.findOne({
                date: { $gte: startDate, $lte: endDate },
                otMinutes: { $gt: 0 },
            });
            console.log("Sample:", {
                id: sample?._id,
                otMinutes: sample?.otMinutes,
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
checkData();
