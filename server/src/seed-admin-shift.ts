import mongoose from 'mongoose';
import MainStaffModel from './models/staff.model.js';
import ShiftModel from './models/shift.model.js';
import ShiftAssignmentModel from './models/shift-assignment.model.js';
import BranchModel from './models/branch.model.js';
import UserModel from './models/user.model.js';
import envConfig from './config/env.config.js';

async function seedAdminShift() {
    try {
        await mongoose.connect(envConfig.mongo_uri as string);
        console.log('Connected to MongoDB');

        let primaryBranch = await BranchModel.findOne();
        if (!primaryBranch) {
            console.log('No branches exist, creating a dummy branch...');
            primaryBranch = await BranchModel.create({
                name: 'Head Office',
                address: 'HQ',
            });
        }

        let adminShift: any = await ShiftModel.findOne({ name: 'Administrations' });

        // Since createdBy needs ObjectId, use a valid one from Branch or just generic
        const dummyUser = new mongoose.Types.ObjectId();

        if (!adminShift) {
            console.log('Creating Administrations Shift...');
            adminShift = await ShiftModel.create({
                name: 'Administrations',
                code: 'ADMIN',
                branchId: primaryBranch._id,
                timeZone: 'Asia/Dhaka',
                workDays: [0, 1, 2, 3, 4, 5, 6],
                isFlexible: true,
                gracePeriodMinutes: 0,
                lateAfterMinutes: 0,
                halfDayAfterMinutes: 0,
                minOtMinutes: 0,
                roundOtTo: 0,
                otEnabled: false,
                isActive: true,
                createdBy: dummyUser,
            });
            console.log(`Created Administrations Shift with ID: ${adminShift._id}`);
        } else {
            console.log('Administrations Shift already exists');
        }

        // Using better-auth raw user collection
        const adminUsers = await UserModel.find({
            role: { $in: ['admin', 'super_admin'] }
        }).toArray();
        const adminUserIds = adminUsers.map((u: any) => u._id ? u._id.toString() : u.id);
        
        console.log(`Found ${adminUserIds.length} admin/super_admin users in auth DB`);

        // Fallback or attempt to retrieve by ObjectIds if string ids fail
        const staffFilters: any = [{ userId: { $in: adminUserIds } }];
        
        try {
            const objectIds = adminUserIds.map((id:string) => new mongoose.Types.ObjectId(id));
            staffFilters.push({ userId: { $in: objectIds } });
        } catch (e) {
            // Ignore ObjectId cast errors if 'id' is standard uuid
        }

        const adminStaffs = await MainStaffModel.find({
            $or: staffFilters
        });
        console.log(`Found ${adminStaffs.length} Staff records linked to admin users`);

        let assignmentCount = 0;
        for (const staff of adminStaffs) {
            await ShiftAssignmentModel.updateMany({
                staffId: staff._id,
                isActive: true
            }, {
                $set: { isActive: false, endDate: new Date() }
            });

            await ShiftAssignmentModel.create({
                staffId: staff._id,
                shiftId: adminShift._id,
                startDate: new Date(),
                endDate: null,
                isActive: true,
                assignedBy: dummyUser,
            });
            assignmentCount++;
        }

        console.log(`Successfully assigned Administrations shift to ${assignmentCount} administrators.`);
        
        await mongoose.disconnect();
        console.log('Database seeded and disconnected.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedAdminShift();
