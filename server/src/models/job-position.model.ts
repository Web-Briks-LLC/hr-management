import { model, Schema, Types } from 'mongoose';

export interface IJobPosition {
    slug: string;
    isOpened: boolean;
    title: string;
    company: string;
    location: string;
    vacancies: number;
    officeTime: string;
    jobType: string;
    salary: string;
    deadline: Date;
    companyHistory: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    benefits: string[];
    shift?: string;
    gender?: string;
    applyInstruction?: string;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const jobPositionSchema = new Schema<IJobPosition>(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        isOpened: {
            type: Boolean,
            default: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        company: {
            type: String,
            required: true,
            trim: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        vacancies: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        officeTime: {
            type: String,
            default: 'N/A',
        },
        jobType: {
            type: String,
            required: true,
            default: 'Work at office',
        },
        salary: {
            type: String,
            required: true,
            default: 'Negotiable',
        },
        deadline: {
            type: Date,
            required: true,
        },
        companyHistory: {
            type: String,
            default: '',
        },
        description: {
            type: String,
            default: '',
        },
        responsibilities: {
            type: [String],
            default: [],
        },
        requirements: {
            type: [String],
            default: [],
        },
        benefits: {
            type: [String],
            default: [],
        },
        shift: {
            type: String,
        },
        gender: {
            type: String,
        },
        applyInstruction: {
            type: String,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            required: false,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
jobPositionSchema.index({ isOpened: 1, deadline: -1 });
jobPositionSchema.index({ slug: 1 });

const JobPositionModel = model<IJobPosition>('JobPosition', jobPositionSchema);

export default JobPositionModel;
