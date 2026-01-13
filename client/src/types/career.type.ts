// Job Position Types
export interface IJobPosition {
    _id: string;
    slug: string;
    isOpened: boolean;
    title: string;
    company: string;
    location: string;
    vacancies: number;
    officeTime: string;
    jobType: string;
    salary: string;
    deadline: string;
    companyHistory: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    benefits: string[];
    shift?: string;
    gender?: string;
    applyInstruction?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateJobPositionInput {
    slug?: string;
    title: string;
    company: string;
    location: string;
    vacancies?: number;
    officeTime?: string;
    jobType?: string;
    salary?: string;
    deadline: string;
    companyHistory?: string;
    description: string;
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    shift?: string;
    gender?: string;
    applyInstruction?: string;
    isOpened?: boolean;
}

export interface UpdateJobPositionInput
    extends Partial<CreateJobPositionInput> {}

// Job Application Types
export type ApplicationStatus =
    | 'pending'
    | 'reviewed'
    | 'shortlisted'
    | 'rejected'
    | 'hired';

export interface IWorkExperience {
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
}

export interface ICVFile {
    url: string;
    publicId: string;
    fileName: string;
}

export interface IJobApplication {
    _id: string;
    jobPosition: {
        _id: string;
        title: string;
        company: string;
        slug: string;
        location?: string;
        deadline?: string;
    };
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
    statusUpdatedBy?: string;
    statusUpdatedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// Filters
export interface JobPositionFilters {
    isOpened?: boolean;
    page?: number;
    limit?: number;
}

export interface JobApplicationFilters {
    jobPosition?: string;
    status?: ApplicationStatus;
    hasExperience?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

// Status Labels and Colors
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
    pending: 'Pending',
    reviewed: 'Reviewed',
    shortlisted: 'Shortlisted',
    rejected: 'Rejected',
    hired: 'Hired',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    reviewed: 'bg-blue-100 text-blue-800',
    shortlisted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    hired: 'bg-purple-100 text-purple-800',
};
