export interface IMetadataCreate {
    type: 'department' | 'designation';
    value: string;
    label: string;
    createdBy?: string;
}

export interface IMetadataResponse {
    _id: string;
    type: 'department' | 'designation';
    value: string;
    label: string;
    isActive: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
