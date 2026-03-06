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
