import { Types } from "mongoose";
import DesignationModel, { type IDesignation } from "../models/designation.model.js";

const DEFAULT_DESIGNATIONS = [
    { title: "Telemarketer", code: "TLM", description: "Telemarketing Specialist" },
    { title: "Team Leader", code: "TL", description: "Team Leader / Supervisor" },
    { title: "HR Executive", code: "HRE", description: "HR & Talent Operations" },
    { title: "Software Engineer", code: "SWE", description: "Software Developer" },
    { title: "Quality Assurance", code: "QA", description: "QA Analyst" },
    { title: "Graphic Designer", code: "GD", description: "Graphic Design Specialist" },
    { title: "Photo Editor", code: "PE", description: "Image & Photo Editing" },
    { title: "Video Editor", code: "VE", description: "Video Production & Editing" },
    { title: "Administrative Assistant", code: "AA", description: "Admin Operations Support" },
    { title: "Office Boy", code: "OB", description: "Office Assistance & Support" },
    { title: "Other", code: "OTH", description: "Other Designation" },
];

const seedDefaultsIfNeeded = async () => {
    const count = await DesignationModel.countDocuments();
    if (count === 0) {
        await DesignationModel.insertMany(
            DEFAULT_DESIGNATIONS.map((d) => ({ ...d, isActive: true }))
        );
    }
};

const createDesignation = async (payload: Partial<IDesignation>, userId: string) => {
    if (!payload.title?.trim()) {
        throw new Error("Designation title is required");
    }

    const title = payload.title.trim();
    const existing = await DesignationModel.findOne({
        title: { $regex: new RegExp(`^${title}$`, "i") },
    });

    if (existing) {
        throw new Error("Designation with this title already exists");
    }

    const createData: Record<string, any> = {
        title,
        isActive: payload.isActive ?? true,
        createdBy: new Types.ObjectId(userId),
    };
    if (payload.code?.trim()) createData.code = payload.code.trim().toUpperCase();
    if (payload.departmentId) createData.departmentId = new Types.ObjectId(payload.departmentId);
    if (payload.description?.trim()) createData.description = payload.description.trim();

    const designation = await DesignationModel.create(createData);
    return designation;
};

const getAllDesignations = async () => {
    await seedDefaultsIfNeeded();
    return await DesignationModel.find()
        .populate("departmentId", "name code")
        .sort({ createdAt: -1 });
};

const updateDesignation = async (id: string, payload: Partial<IDesignation>) => {
    if (payload.title) {
        const existing = await DesignationModel.findOne({
            _id: { $ne: id },
            title: { $regex: new RegExp(`^${payload.title.trim()}$`, "i") },
        });

        if (existing) {
            throw new Error("Another designation with this title already exists");
        }
    }

    const designation = await DesignationModel.findByIdAndUpdate(
        id,
        {
            ...payload,
            ...(payload.title && { title: payload.title.trim() }),
            ...(payload.code && { code: payload.code.trim().toUpperCase() }),
        },
        { new: true, runValidators: true }
    ).populate("departmentId", "name code");

    if (!designation) {
        throw new Error("Designation not found");
    }

    return designation;
};

const deleteDesignation = async (id: string) => {
    const designation = await DesignationModel.findByIdAndDelete(id);
    if (!designation) {
        throw new Error("Designation not found");
    }
    return true;
};

const DesignationServices = {
    seedDefaultsIfNeeded,
    createDesignation,
    getAllDesignations,
    updateDesignation,
    deleteDesignation,
};

export default DesignationServices;
