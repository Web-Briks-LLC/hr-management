import { model, Schema, Types } from 'mongoose';

export interface IWorkExperience {
    company: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    isCurrent: boolean;
}

export interface ICVFile {
    url: string;
    publicId: string;
    fileName: string;
}

export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';

export interface IJobApplication {
    jobPosition: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    facebook?: string;
    linkedin?: string;
    portfolio?: string;
    hasExperience: boolean;
    experiences?: IWorkExperience[];
    cvFile: ICVFile;
    coverLetter?: string;
    status: ApplicationStatus;
    statusUpdatedBy?: Types.ObjectId;
    statusUpdatedAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const workExperienceSchema = new Schema<IWorkExperience>(
    {
        company: {
            type: String,
            required: true,
            trim: true,
        },
        position: {
            type: String,
            required: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
        },
        isCurrent: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const cvFileSchema = new Schema<ICVFile>(
    {
        url: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

const jobApplicationSchema = new Schema<IJobApplication>(
    {
        jobPosition: {
            type: Schema.Types.ObjectId,
            ref: 'JobPosition',
            required: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        facebook: {
            type: String,
            trim: true,
        },
        linkedin: {
            type: String,
            trim: true,
        },
        portfolio: {
            type: String,
            trim: true,
        },
        hasExperience: {
            type: Boolean,
            required: true,
            default: false,
        },
        experiences: {
            type: [workExperienceSchema],
            default: [],
        },
        cvFile: {
            type: cvFileSchema,
            required: true,
        },
        coverLetter: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
            default: 'pending',
        },
        statusUpdatedBy: {
            type: Schema.Types.ObjectId,
        },
        statusUpdatedAt: {
            type: Date,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
jobApplicationSchema.index({ jobPosition: 1, status: 1 });
jobApplicationSchema.index({ email: 1 });
jobApplicationSchema.index({ hasExperience: 1 });
jobApplicationSchema.index({ createdAt: -1 });

const JobApplicationModel = model<IJobApplication>('JobApplication', jobApplicationSchema);

export default JobApplicationModel;
