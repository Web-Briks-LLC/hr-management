import JobPositionModel from '../models/job-position.model.js';
import { Types } from 'mongoose';

interface CreatePositionInput {
    slug: string;
    title: string;
    company: string;
    location: string;
    vacancies: number;
    officeTime?: string;
    jobType: string;
    salary: string;
    deadline: Date;
    companyHistory?: string;
    description: string;
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    shift?: string;
    gender?: string;
    applyInstruction?: string;
    isOpened?: boolean;
    createdBy: string;
}

interface UpdatePositionInput {
    slug?: string;
    title?: string;
    company?: string;
    location?: string;
    vacancies?: number;
    officeTime?: string;
    jobType?: string;
    salary?: string;
    deadline?: Date;
    companyHistory?: string;
    description?: string;
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    shift?: string;
    gender?: string;
    applyInstruction?: string;
    isOpened?: boolean;
    updatedBy: string;
}

interface GetAllFilters {
    isOpened?: boolean;
    page?: number;
    limit?: number;
}

// Create a new job position
async function createPosition(data: CreatePositionInput) {
    const position = new JobPositionModel({
        ...data,
        createdBy: new Types.ObjectId(data.createdBy),
    });
    return position.save();
}

// Update a job position
async function updatePosition(id: string, data: UpdatePositionInput) {
    const updateData = {
        ...data,
        ...(data.updatedBy && { updatedBy: new Types.ObjectId(data.updatedBy) }),
    };
    
    return JobPositionModel.findByIdAndUpdate(id, updateData, { new: true });
}

// Toggle position open/closed
async function togglePosition(id: string, userId: string) {
    const position = await JobPositionModel.findById(id);
    if (!position) return null;
    
    position.isOpened = !position.isOpened;
    position.updatedBy = new Types.ObjectId(userId);
    return position.save();
}

// Delete a job position
async function deletePosition(id: string) {
    return JobPositionModel.findByIdAndDelete(id);
}

// Get all positions (admin)
async function getAllPositions(filters: GetAllFilters) {
    const { isOpened, page = 1, limit = 20 } = filters;
    
    const query: Record<string, unknown> = {};
    if (isOpened !== undefined) {
        query.isOpened = isOpened;
    }
    
    const skip = (page - 1) * limit;
    
    const [positions, total] = await Promise.all([
        JobPositionModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        JobPositionModel.countDocuments(query),
    ]);
    
    return {
        positions,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

// Get open positions only (public)
async function getOpenPositions() {
    return JobPositionModel.find({ isOpened: true })
        .sort({ createdAt: -1 })
        .lean();
}

// Get position by ID
async function getPositionById(id: string) {
    return JobPositionModel.findById(id).lean();
}

// Get position by slug (public - only open positions)
async function getPositionBySlug(slug: string) {
    return JobPositionModel.findOne({ slug, isOpened: true }).lean();
}

// Get position by slug (admin - any status)
async function getPositionBySlugAdmin(slug: string) {
    return JobPositionModel.findOne({ slug }).lean();
}

// Create position from external source (WebBriks)
interface ExternalPositionData {
    slug: string;
    title: string;
    company?: string;
    location?: string;
    vacancies?: number;
    officeTime?: string;
    jobType?: string;
    salary?: string;
    deadline?: Date;
    companyHistory?: string;
    description?: string;
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    shift?: string;
    gender?: string;
    applyInstruction?: string;
    isOpened?: boolean;
}

async function createPositionFromExternal(data: ExternalPositionData) {
    const position = new JobPositionModel({
        slug: data.slug,
        title: data.title,
        company: data.company || 'Web Briks LLC',
        location: data.location || 'Remote',
        vacancies: data.vacancies || 1,
        officeTime: data.officeTime,
        jobType: data.jobType || 'Full-time',
        salary: data.salary || 'Negotiable',
        deadline: data.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        companyHistory: data.companyHistory,
        description: data.description || '',
        responsibilities: data.responsibilities || [],
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        shift: data.shift,
        gender: data.gender,
        applyInstruction: data.applyInstruction,
        isOpened: data.isOpened !== undefined ? data.isOpened : true,
    });
    return position.save();
}

// Generate unique slug from title
async function generateSlug(title: string): Promise<string> {
    let slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    
    // Check if slug exists
    const existing = await JobPositionModel.findOne({ slug });
    if (existing) {
        // Add timestamp to make unique
        slug = `${slug}-${Date.now()}`;
    }
    
    return slug;
}

export default {
    createPosition,
    updatePosition,
    togglePosition,
    deletePosition,
    getAllPositions,
    getOpenPositions,
    getPositionById,
    getPositionBySlug,
    getPositionBySlugAdmin,
    createPositionFromExternal,
    generateSlug,
};
