import { Document, Types } from 'mongoose';

export interface IClient extends Document {
    clientId: string;
    name: string;
    emails: string[];
    phone?: string;
    address?: string;
    officeAddress?: string;
    description?: string;
    currency?: string; // USD, EUR, GBP, etc.
    status: 'active' | 'inactive';
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClientQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    createdBy?: string; // Ownership filter: restrict to clients created by a specific user
    hasOrdersOnly?: boolean;
}
