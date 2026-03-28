export interface TeamMember {
    _id?: string;
    name: string;
    email: string;
    phone?: string;
    designation?: string;
}

export interface ClientEmail {
    email: string;
    label: string;
    type: string;
}

export interface Client {
    _id: string;
    clientId: string;
    name: string;
    emails: string[];
    phone?: string;
    address?: string;
    officeAddress?: string;
    description?: string;
    currency?: string;
    status: 'active' | 'inactive';
    teamMembers?: TeamMember[];
    assignedServices?: string[];
    assignedServicesDetails?: { _id: string; name: string }[];
    createdBy?: { _id: string; name: string };
    createdAt: string;
    updatedAt: string;
}

export interface ClientQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
}

export interface ClientsResponse {
    clients: Client[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
