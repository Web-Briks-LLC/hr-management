import type { Request, Response } from 'express';
import jobApplicationService from '../services/job-application.service.js';
import jobPositionService from '../services/job-position.service.js';
import type { ApplicationStatus } from '../models/job-application.model.js';

// Submit a new application (public - no auth)
async function submitApplication(req: Request, res: Response) {
    try {
        const {
            // Position data (from WebBriks)
            position,
            // Applicant data
            firstName,
            lastName,
            email,
            phone,
            facebook,
            linkedin,
            portfolio,
            hasExperience,
            experiences,
            coverLetter,
        } = req.body;

        // Validate required fields
        if (!position || !firstName || !lastName || !email || !phone) {
            return res.status(400).json({
                message:
                    'Position info, first name, last name, email, and phone are required',
            });
        }

        // Parse position if it's a string
        let positionData;
        try {
            positionData =
                typeof position === 'string' ? JSON.parse(position) : position;
        } catch {
            return res
                .status(400)
                .json({ message: 'Invalid position data format' });
        }

        // Validate position has required fields
        if (!positionData.slug || !positionData.title) {
            return res.status(400).json({
                message: 'Position must have slug and title',
            });
        }

        // Check for CV file
        const cvFile = req.file;
        if (!cvFile) {
            return res.status(400).json({ message: 'CV file is required' });
        }

        // Find or create position
        let jobPosition = await jobPositionService.getPositionBySlugAdmin(
            positionData.slug
        );

        if (!jobPosition) {
            // Create new position from WebBriks data
            jobPosition = await jobPositionService.createPositionFromExternal({
                slug: positionData.slug,
                title: positionData.title,
                company: positionData.company || 'Web Briks LLC',
                location: positionData.location || 'Remote',
                vacancies: positionData.vacancies || 1,
                officeTime: positionData.officeTime,
                jobType: positionData.jobType || 'Full-time',
                salary: positionData.salary || 'Negotiable',
                deadline: positionData.deadline
                    ? new Date(positionData.deadline)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                companyHistory: positionData.companyHistory,
                description: positionData.description || '',
                responsibilities: positionData.responsibilities || [],
                requirements: positionData.requirements || [],
                benefits: positionData.benefits || [],
                shift: positionData.shift,
                gender: positionData.gender,
                applyInstruction: positionData.applyInstruction,
                isOpened: true,
            });
        }

        // Parse experiences if provided as string
        let parsedExperiences;
        if (experiences) {
            try {
                parsedExperiences =
                    typeof experiences === 'string'
                        ? JSON.parse(experiences)
                        : experiences;
            } catch {
                parsedExperiences = [];
            }
        }

        const application = await jobApplicationService.createApplication(
            {
                jobPosition: jobPosition._id.toString(),
                firstName,
                lastName,
                email,
                phone,
                facebook,
                linkedin,
                portfolio,
                hasExperience:
                    hasExperience === 'true' || hasExperience === true,
                experiences: parsedExperiences,
                coverLetter,
            },
            cvFile
        );

        return res.status(201).json({
            message: 'Application submitted successfully',
            data: {
                _id: application._id,
                firstName: application.firstName,
                lastName: application.lastName,
                email: application.email,
                positionTitle: jobPosition.title,
            },
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get all applications (admin)
async function getAllApplications(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { jobPosition, status, hasExperience, search, page, limit } =
            req.query;

        const result = await jobApplicationService.getAllApplications({
            jobPosition: jobPosition as string,
            status: status as ApplicationStatus,
            ...(hasExperience !== undefined && {
                hasExperience: hasExperience === 'true',
            }),
            search: search as string,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        });

        return res.status(200).json({
            message: 'Applications retrieved successfully',
            data: result.applications,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error getting applications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get application by ID (admin)
async function getApplicationById(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        const application = await jobApplicationService.getApplicationById(id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        return res.status(200).json({
            message: 'Application retrieved successfully',
            data: application,
        });
    } catch (error) {
        console.error('Error getting application:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Update application status (admin)
async function updateApplicationStatus(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        const { status, notes } = req.body;

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const validStatuses: ApplicationStatus[] = [
            'pending',
            'reviewed',
            'shortlisted',
            'rejected',
            'hired',
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const application = await jobApplicationService.updateApplicationStatus(
            id,
            status,
            userId,
            notes
        );

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        return res.status(200).json({
            message: 'Application status updated successfully',
            data: application,
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Delete application (admin)
async function deleteApplication(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        const result = await jobApplicationService.deleteApplication(id);

        if (!result) {
            return res.status(404).json({ message: 'Application not found' });
        }

        return res.status(200).json({
            message: 'Application deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get applications stats (admin)
async function getApplicationsStats(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const stats = await jobApplicationService.getApplicationsStats();

        return res.status(200).json({
            message: 'Stats retrieved successfully',
            data: stats,
        });
    } catch (error) {
        console.error('Error getting applications stats:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default {
    submitApplication,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    deleteApplication,
    getApplicationsStats,
};
