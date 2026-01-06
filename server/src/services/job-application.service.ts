import JobApplicationModel, { type ApplicationStatus } from '../models/job-application.model.js';
import cloudinary from '../lib/cloudinary.js';
import envConfig from '../config/env.config.js';
import { Types } from 'mongoose';
import { Readable } from 'stream';

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
    page?: number;
    limit?: number;
}

// Upload CV to Cloudinary
async function uploadCV(file: Express.Multer.File): Promise<{ url: string; publicId: string; fileName: string }> {
    return new Promise((resolve, reject) => {
        // Sanitize filename and create unique public_id with extension
        const originalName = file.originalname;
        const ext = originalName.split('.').pop();
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
            }
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
async function createApplication(data: CreateApplicationInput, cvFile: Express.Multer.File) {
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
    const { jobPosition, status, hasExperience, page = 1, limit = 20 } = filters;
    
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
    notes?: string
) {
    const application = await JobApplicationModel.findByIdAndUpdate(
        id,
        {
            status,
            statusUpdatedBy: new Types.ObjectId(userId),
            statusUpdatedAt: new Date(),
            ...(notes !== undefined && { notes }),
        },
        { new: true }
    ).populate('jobPosition', 'title company slug');

    // Send email notification if application exists
    if (application) {
        await sendStatusEmail(application, status);
    }

    return application;
}

// Email templates for different statuses
async function sendStatusEmail(application: any, status: ApplicationStatus) {
    const { sendMail } = await import('../lib/nodemailer.js');
    
    const applicantName = `${application.firstName} ${application.lastName}`;
    const positionTitle = application.jobPosition?.title || 'the position';
    const companyName = application.jobPosition?.company || 'Web Briks LLC';

    const emailTemplates: Record<ApplicationStatus, { subject: string; body: string }> = {
        pending: {
            subject: `Application Received - ${positionTitle}`,
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Application Received</h2>
                    <p>Dear ${applicantName},</p>
                    <p>Thank you for applying for the <strong>${positionTitle}</strong> position at ${companyName}.</p>
                    <p>We have received your application and will review it shortly.</p>
                    <p>Best regards,<br/>HR Team<br/>${companyName}</p>
                </div>
            `,
        },
        reviewed: {
            subject: `Your Application is Under Review - ${positionTitle}`,
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Application Under Review</h2>
                    <p>Dear ${applicantName},</p>
                    <p>We wanted to let you know that your application for the <strong>${positionTitle}</strong> position is currently being reviewed by our team.</p>
                    <p>We will get back to you soon with an update.</p>
                    <p>Best regards,<br/>HR Team<br/>${companyName}</p>
                </div>
            `,
        },
        shortlisted: {
            subject: `🎉 Congratulations! You've Been Shortlisted - ${positionTitle}`,
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #16a34a;">Congratulations! You've Been Shortlisted</h2>
                    <p>Dear ${applicantName},</p>
                    <p>We are pleased to inform you that you have been <strong>shortlisted</strong> for the <strong>${positionTitle}</strong> position at ${companyName}!</p>
                    <p>Our HR team will contact you soon to schedule an interview.</p>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                        <strong>Next Steps:</strong>
                        <ul>
                            <li>Prepare for an interview</li>
                            <li>Keep your phone accessible</li>
                            <li>Review the job requirements</li>
                        </ul>
                    </div>
                    <p>Best regards,<br/>HR Team<br/>${companyName}</p>
                </div>
            `,
        },
        rejected: {
            subject: `Update on Your Application - ${positionTitle}`,
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Application Update</h2>
                    <p>Dear ${applicantName},</p>
                    <p>Thank you for your interest in the <strong>${positionTitle}</strong> position at ${companyName}.</p>
                    <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
                    <p>We encourage you to apply for future openings that match your qualifications.</p>
                    <p>We wish you all the best in your career journey.</p>
                    <p>Best regards,<br/>HR Team<br/>${companyName}</p>
                </div>
            `,
        },
        hired: {
            subject: `🎉 Congratulations! You're Hired - ${positionTitle}`,
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #7c3aed;">🎉 Congratulations! You're Hired!</h2>
                    <p>Dear ${applicantName},</p>
                    <p>We are thrilled to inform you that you have been <strong>selected</strong> for the <strong>${positionTitle}</strong> position at ${companyName}!</p>
                    <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
                        <p style="margin: 0;"><strong>Welcome to the team!</strong></p>
                        <p style="margin: 10px 0 0 0;">Our HR team will contact you shortly with the onboarding details.</p>
                    </div>
                    <p>We look forward to having you on our team!</p>
                    <p>Best regards,<br/>HR Team<br/>${companyName}</p>
                </div>
            `,
        },
    };

    const template = emailTemplates[status];
    
    try {
        await sendMail({
            to: application.email,
            subject: template.subject,
            body: template.body,
        });
        console.log(`Status email sent to ${application.email} for status: ${status}`);
    } catch (error) {
        console.error('Error sending status email:', error);
        // Don't throw - we don't want email failure to break the status update
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
    return JobApplicationModel.countDocuments({ jobPosition: new Types.ObjectId(positionId) });
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
        byStatus: stats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {} as Record<string, number>),
        byExperience: {
            experienced: experienceStats.find(s => s._id === true)?.count || 0,
            fresher: experienceStats.find(s => s._id === false)?.count || 0,
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
