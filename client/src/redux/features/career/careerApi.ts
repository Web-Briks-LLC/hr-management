import { apiSlice } from '../../api/apiSlice';
import type {
    IJobPosition,
    IJobApplication,
    CreateJobPositionInput,
    UpdateJobPositionInput,
    JobPositionFilters,
    JobApplicationFilters,
    ApplicationStatus,
} from '@/types/career.type';

// Response types
interface PositionsResponse {
    message: string;
    data: IJobPosition[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

interface PositionResponse {
    message: string;
    data: IJobPosition;
}

interface ApplicationsResponse {
    message: string;
    data: IJobApplication[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

interface ApplicationResponse {
    message: string;
    data: IJobApplication;
}

interface ApplicationStatsResponse {
    message: string;
    data: {
        byStatus: Record<string, number>;
        byExperience: {
            experienced: number;
            fresher: number;
        };
    };
}

export const careerApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // ============================================
        // JOB POSITIONS
        // ============================================

        // Get all positions (admin)
        getAllPositions: builder.query<
            PositionsResponse,
            JobPositionFilters | void
        >({
            query: (filters) => {
                const params = new URLSearchParams();
                if (filters?.isOpened !== undefined)
                    params.append('isOpened', String(filters.isOpened));
                if (filters?.page) params.append('page', String(filters.page));
                if (filters?.limit)
                    params.append('limit', String(filters.limit));
                return `/careers/positions?${params.toString()}`;
            },
            providesTags: ['JobPosition'],
        }),

        // Get position by ID
        getPositionById: builder.query<PositionResponse, string>({
            query: (id) => `/careers/positions/${id}`,
            providesTags: (_result, _error, id) => [
                { type: 'JobPosition', id },
            ],
        }),

        // Create position
        createPosition: builder.mutation<
            PositionResponse,
            CreateJobPositionInput
        >({
            query: (data) => ({
                url: '/careers/positions',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['JobPosition'],
        }),

        // Update position
        updatePosition: builder.mutation<
            PositionResponse,
            { id: string } & UpdateJobPositionInput
        >({
            query: ({ id, ...data }) => ({
                url: `/careers/positions/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'JobPosition', id },
                'JobPosition',
            ],
        }),

        // Toggle position open/closed
        togglePosition: builder.mutation<PositionResponse, string>({
            query: (id) => ({
                url: `/careers/positions/${id}/toggle`,
                method: 'PATCH',
            }),
            invalidatesTags: ['JobPosition'],
        }),

        // Delete position
        deletePosition: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/careers/positions/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['JobPosition'],
        }),

        // ============================================
        // JOB APPLICATIONS
        // ============================================

        // Get all applications (admin)
        getAllApplications: builder.query<
            ApplicationsResponse,
            JobApplicationFilters | void
        >({
            query: (filters) => {
                const params = new URLSearchParams();
                if (filters?.jobPosition)
                    params.append('jobPosition', filters.jobPosition);
                if (filters?.status) params.append('status', filters.status);
                if (filters?.hasExperience !== undefined)
                    params.append(
                        'hasExperience',
                        String(filters.hasExperience)
                    );
                if (filters?.search) params.append('search', filters.search);
                if (filters?.page) params.append('page', String(filters.page));
                if (filters?.limit)
                    params.append('limit', String(filters.limit));
                return `/careers/applications?${params.toString()}`;
            },
            providesTags: ['JobApplication'],
        }),

        // Get application by ID
        getApplicationById: builder.query<ApplicationResponse, string>({
            query: (id) => `/careers/applications/${id}`,
            providesTags: (_result, _error, id) => [
                { type: 'JobApplication', id },
            ],
        }),

        // Update application status
        updateApplicationStatus: builder.mutation<
            ApplicationResponse,
            { id: string; status: ApplicationStatus; notes?: string }
        >({
            query: ({ id, ...data }) => ({
                url: `/careers/applications/${id}/status`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'JobApplication', id },
                'JobApplication',
            ],
        }),

        // Delete application
        deleteApplication: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/careers/applications/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['JobApplication'],
        }),

        // Get applications stats
        getApplicationsStats: builder.query<ApplicationStatsResponse, void>({
            query: () => '/careers/applications/stats',
            providesTags: ['JobApplication'],
        }),
    }),
});

export const {
    // Positions
    useGetAllPositionsQuery,
    useGetPositionByIdQuery,
    useCreatePositionMutation,
    useUpdatePositionMutation,
    useTogglePositionMutation,
    useDeletePositionMutation,
    // Applications
    useGetAllApplicationsQuery,
    useGetApplicationByIdQuery,
    useUpdateApplicationStatusMutation,
    useDeleteApplicationMutation,
    useGetApplicationsStatsQuery,
} = careerApi;
