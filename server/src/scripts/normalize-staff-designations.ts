import mongoose from 'mongoose';
import MainStaffModel from '../models/staff.model.js';
import DepartmentModel from '../models/department.model.js';
import DesignationModel from '../models/designation.model.js';
import envConfig from '../config/env.config.js';
import DepartmentServices from '../services/department.service.js';
import DesignationServices from '../services/designation.service.js';

// Mapping dictionary for legacy / lowercase enum values to clean formal Titles
const DEPARTMENT_MAPPINGS: Record<string, string> = {
    production: 'Production',
    prod: 'Production',
    marketing: 'Marketing',
    mkt: 'Marketing',
    sales: 'Sales',
    sls: 'Sales',
    human_resources: 'Human Resources',
    hr: 'Human Resources',
    administration: 'Administration',
    admin: 'Administration',
    adm: 'Administration',
    information_technology: 'Information Technology',
    it: 'Information Technology',
    finance: 'Finance',
    fin: 'Finance',
    other: 'Other',
    oth: 'Other',
};

const DESIGNATION_MAPPINGS: Record<string, string> = {
    telemarketer: 'Telemarketer',
    tlm: 'Telemarketer',
    team_leader: 'Team Leader',
    tl: 'Team Leader',
    hr_executive: 'HR Executive',
    hre: 'HR Executive',
    software_engineer: 'Software Engineer',
    swe: 'Software Engineer',
    quality_assurance: 'Quality Assurance',
    qa: 'Quality Assurance',
    graphic_designer: 'Graphic Designer',
    gd: 'Graphic Designer',
    photo_editor: 'Photo Editor',
    pe: 'Photo Editor',
    video_editor: 'Video Editor',
    ve: 'Video Editor',
    administrative_assistant: 'Administrative Assistant',
    aa: 'Administrative Assistant',
    office_boy: 'Office Boy',
    ob: 'Office Boy',
    head_of_business: 'Head of Business',
    co_founder: 'Co-Founder',
    founder: 'Founder',
    ceo: 'CEO',
    cto: 'CTO',
    cmo: 'CMO',
    coo: 'COO',
    other: 'Other',
    oth: 'Other',
};

function toTitleCase(str: string): string {
    return str
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

async function normalizeStaffDepartmentAndDesignation() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(envConfig.mongo_uri as string);
        console.log('Connected to MongoDB successfully.');

        // 1. Ensure default departments & designations are seeded
        console.log('Checking & seeding default departments and designations...');
        await DepartmentServices.seedDefaultsIfNeeded();
        await DesignationServices.seedDefaultsIfNeeded();

        // 2. Fetch all departments & designations
        const departments = await DepartmentModel.find();
        const designations = await DesignationModel.find();
        console.log(`Found ${departments.length} departments and ${designations.length} designations in database.`);

        // Build lookup sets (case-insensitive)
        const depLookup = new Map<string, string>();
        for (const dep of departments) {
            depLookup.set(dep.name.toLowerCase().trim(), dep.name);
            if (dep.code) depLookup.set(dep.code.toLowerCase().trim(), dep.name);
        }

        const desLookup = new Map<string, string>();
        for (const des of designations) {
            desLookup.set(des.title.toLowerCase().trim(), des.title);
            if (des.code) desLookup.set(des.code.toLowerCase().trim(), des.title);
        }

        // 3. Scan all staff records
        const staffs = await MainStaffModel.find();
        console.log(`Total staff records to inspect: ${staffs.length}`);

        let updatedCount = 0;

        for (const staff of staffs) {
            let hasChanges = false;
            const currentDept = staff.department?.trim() || '';
            const currentDesig = staff.designation?.trim() || '';

            // Resolve normalized department
            let targetDept = currentDept;
            if (currentDept) {
                const lowerDept = currentDept.toLowerCase();
                if (DEPARTMENT_MAPPINGS[lowerDept]) {
                    targetDept = DEPARTMENT_MAPPINGS[lowerDept];
                } else if (depLookup.has(lowerDept)) {
                    targetDept = depLookup.get(lowerDept)!;
                } else if (currentDept.includes('_')) {
                    targetDept = toTitleCase(currentDept);
                }
            }

            // Resolve normalized designation
            let targetDesig = currentDesig;
            if (currentDesig) {
                const lowerDesig = currentDesig.toLowerCase();
                if (DESIGNATION_MAPPINGS[lowerDesig]) {
                    targetDesig = DESIGNATION_MAPPINGS[lowerDesig];
                } else if (desLookup.has(lowerDesig)) {
                    targetDesig = desLookup.get(lowerDesig)!;
                } else if (currentDesig.includes('_')) {
                    targetDesig = toTitleCase(currentDesig);
                }
            }

            if (targetDept !== currentDept) {
                staff.department = targetDept;
                hasChanges = true;
            }

            if (targetDesig !== currentDesig) {
                staff.designation = targetDesig;
                hasChanges = true;
            }

            if (hasChanges) {
                await staff.save();
                updatedCount++;
                console.log(
                    `Updated Staff [${staff.staffId}] -> Dept: "${currentDept}" => "${targetDept}", Designation: "${currentDesig}" => "${targetDesig}"`
                );
            }
        }

        console.log(`\nMigration completed successfully! Total staff records normalized: ${updatedCount} / ${staffs.length}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Normalization error:', err);
        process.exit(1);
    }
}

normalizeStaffDepartmentAndDesignation();
