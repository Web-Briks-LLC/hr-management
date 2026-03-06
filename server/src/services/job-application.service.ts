import JobApplicationModel, {
    type ApplicationStatus,
} from '../models/job-application.model.js';
import cloudinary from '../lib/cloudinary.js';
import envConfig from '../config/env.config.js';
import { Types } from 'mongoose';
import { Readable } from 'stream';
import { escapeRegex } from '../lib/sanitize.js';
import emailService from './email.service.js';

interface CreateApplicationInput {
    jobPosition: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    facebook?: string;
    linkedin?: string;
    portfolio?: string;
    hasExperience: boolean;
    experiences?: {
        company: string;
        position: string;
        startDate: Date;
        endDate?: Date;
        isCurrent: boolean;
    }[];
    coverLetter?: string;
}

interface GetAllFilters {
    jobPosition?: string;
    status?: ApplicationStatus;
    hasExperience?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

// Upload CV to Cloudinary
async function uploadCV(
    file: Express.Multer.File,
): Promise<{ url: string; publicId: string; fileName: string }> {
    return new Promise((resolve, reject) => {
        // Sanitize filename and create unique public_id with extension
        const originalName = file.originalname;
        const ext = originalName.split('.').pop();
        const nameWithoutExt = originalName
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const publicId = `${nameWithoutExt}-${uniqueSuffix}.${ext}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `${envConfig.cloudinary_upload_path}/career-applications`,
                resource_type: 'raw' as const,
                public_id: publicId,
                use_filename: true,
                unique_filename: false,
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error('Upload failed'));
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        fileName: file.originalname,
                    });
                }
            },
        );

        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
    });
}

// Delete CV from Cloudinary
async function deleteCV(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}

// Create a new application (public)
async function createApplication(
    data: CreateApplicationInput,
    cvFile: Express.Multer.File,
) {
    // Upload CV to Cloudinary
    const cvData = await uploadCV(cvFile);

    const application = new JobApplicationModel({
        ...data,
        jobPosition: new Types.ObjectId(data.jobPosition),
        cvFile: cvData,
    });

    return application.save();
}

// Get all applications (admin)
async function getAllApplications(filters: GetAllFilters) {
    const {
        jobPosition,
        status,
        hasExperience,
        search,
        page = 1,
        limit = 20,
    } = filters;

    const query: Record<string, unknown> = {};

    if (jobPosition) {
        query.jobPosition = new Types.ObjectId(jobPosition);
    }
    if (status) {
        query.status = status;
    }
    if (hasExperience !== undefined) {
        query.hasExperience = hasExperience;
    }
    if (search) {
        const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
        ];
    }

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
        JobApplicationModel.find(query)
            .populate('jobPosition', 'title company slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        JobApplicationModel.countDocuments(query),
    ]);

    return {
        applications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

// Get application by ID
async function getApplicationById(id: string) {
    return JobApplicationModel.findById(id)
        .populate('jobPosition', 'title company slug location deadline')
        .lean();
}

// Update application status and send email notification
async function updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    userId: string,
    notes?: string,
) {
    const application = await JobApplicationModel.findByIdAndUpdate(
        id,
        {
            status,
            statusUpdatedBy: new Types.ObjectId(userId),
            statusUpdatedAt: new Date(),
            ...(notes !== undefined && { notes }),
        },
        { new: true },
    ).populate('jobPosition', 'title company slug');

    // Send email notification if application exists
    if (application) {
        await sendStatusEmail(application, status);
    }

    return application;
}

// Email templates for different statuses
async function sendStatusEmail(application: any, status: ApplicationStatus) {
    try {
        await emailService.sendApplicationStatusEmail({
            to: application.email,
            applicantName: `${application.firstName} ${application.lastName}`,
            positionTitle: application.jobPosition?.title || 'the position',
            status: status,
        });
        console.log(
            `Status email sent to ${application.email} for status: ${status}`,
        );
    } catch (error) {
        console.error('Error sending status email:', error);
    }
}

// Delete application
async function deleteApplication(id: string) {
    const application = await JobApplicationModel.findById(id);
    if (!application) return null;

    // Delete CV from Cloudinary
    if (application.cvFile?.publicId) {
        try {
            await deleteCV(application.cvFile.publicId);
        } catch (error) {
            console.error('Error deleting CV from Cloudinary:', error);
        }
    }

    return JobApplicationModel.findByIdAndDelete(id);
}

// Get applications count by position
async function getApplicationsCountByPosition(positionId: string) {
    return JobApplicationModel.countDocuments({
        jobPosition: new Types.ObjectId(positionId),
    });
}

// Get applications stats
async function getApplicationsStats() {
    const stats = await JobApplicationModel.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const experienceStats = await JobApplicationModel.aggregate([
        {
            $group: {
                _id: '$hasExperience',
                count: { $sum: 1 },
            },
        },
    ]);

    return {
        byStatus: stats.reduce(
            (acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            },
            {} as Record<string, number>,
        ),
        byExperience: {
            experienced:
                experienceStats.find((s) => s._id === true)?.count || 0,
            fresher: experienceStats.find((s) => s._id === false)?.count || 0,
        },
    };
}

export default {
    uploadCV,
    deleteCV,
    createApplication,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    deleteApplication,
    getApplicationsCountByPosition,
    getApplicationsStats,
};
