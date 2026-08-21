import { Types } from "mongoose";
import DepartmentModel, { type IDepartment } from "../models/department.model.js";

const DEFAULT_DEPARTMENTS = [
    { name: "Production", code: "PROD", description: "Production & Operations" },
    { name: "Marketing", code: "MKT", description: "Marketing & Growth" },
    { name: "Sales", code: "SLS", description: "Sales & Client Acquisition" },
    { name: "Human Resources", code: "HR", description: "HR & People Ops" },
    { name: "Administration", code: "ADM", description: "General Administration" },
    { name: "Information Technology", code: "IT", description: "IT & Software" },
    { name: "Finance", code: "FIN", description: "Finance & Accounts" },
    { name: "Other", code: "OTH", description: "Miscellaneous" },
];

const seedDefaultsIfNeeded = async () => {
    const count = await DepartmentModel.countDocuments();
    if (count === 0) {
        await DepartmentModel.insertMany(
            DEFAULT_DEPARTMENTS.map((d) => ({ ...d, isActive: true }))
        );
    }
};

const createDepartment = async (payload: Partial<IDepartment>, userId: string) => {
    if (!payload.name?.trim()) {
        throw new Error("Department name is required");
    }

    const name = payload.name.trim();
    const existing = await DepartmentModel.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existing) {
        throw new Error("Department with this name already exists");
    }

    const createData: Record<string, any> = {
        name,
        isActive: payload.isActive ?? true,
        createdBy: new Types.ObjectId(userId),
    };
    if (payload.code?.trim()) createData.code = payload.code.trim().toUpperCase();
    if (payload.description?.trim()) createData.description = payload.description.trim();

    const department = await DepartmentModel.create(createData);
    return department;
};

const getAllDepartments = async () => {
    await seedDefaultsIfNeeded();
    return await DepartmentModel.find().sort({ createdAt: -1 });
};

const updateDepartment = async (id: string, payload: Partial<IDepartment>) => {
    if (payload.name) {
        const existing = await DepartmentModel.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
        });

        if (existing) {
            throw new Error("Another department with this name already exists");
        }
    }

    const department = await DepartmentModel.findByIdAndUpdate(
        id,
        {
            ...payload,
            ...(payload.name && { name: payload.name.trim() }),
            ...(payload.code && { code: payload.code.trim().toUpperCase() }),
        },
        { new: true, runValidators: true }
    );

    if (!department) {
        throw new Error("Department not found");
    }

    return department;
};

const deleteDepartment = async (id: string) => {
    const department = await DepartmentModel.findByIdAndDelete(id);
    if (!department) {
        throw new Error("Department not found");
    }
    return true;
};

const DepartmentServices = {
    seedDefaultsIfNeeded,
    createDepartment,
    getAllDepartments,
    updateDepartment,
    deleteDepartment,
};

export default DepartmentServices;
