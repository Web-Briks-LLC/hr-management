import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI is not defined in the environment variables.");
    process.exit(1);
}

async function migrateBankInfo() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI as string);
        console.log("Connected successfully!");

        const StaffModel = mongoose.connection.collection("staffs");

        // Find all staff who still have the old bank fields
        const staffsToUpdate = await StaffModel.find({
            $or: [
                { bankAccountNo: { $exists: true } },
                { bankAccountName: { $exists: true } },
                { bankName: { $exists: true } },
            ],
        }).toArray();

        console.log(`Found ${staffsToUpdate.length} staff records to migrate.`);

        for (const staff of staffsToUpdate) {
            const bankObject = {
                bankName: staff.bankName || "",
                accountNumber: staff.bankAccountNo || "",
                accountHolderName: staff.bankAccountName || "",
                branch: "",
                routingNumber: "",
            };

            await StaffModel.updateOne(
                { _id: staff._id },
                {
                    $set: { bank: bankObject },
                    $unset: {
                        bankAccountNo: "",
                        bankAccountName: "",
                        bankName: "",
                    },
                },
            );
            console.log(`Migrated staff with ID: ${staff.staffId}`);
        }

        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

migrateBankInfo();
