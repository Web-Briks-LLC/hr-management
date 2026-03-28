import AuditLogModel from '../models/audit-log.model.js';

async function createLog(data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: any;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
}) {
    await (AuditLogModel.create as any)(data);
}

async function getLogs(filters?: {
    userId?: string;
    action?: string;
    entity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}) {
    const query: any = {};
    
    if (filters?.userId) query.userId = filters.userId as any;
    if (filters?.action) query.action = filters.action;
    if (filters?.entity) query.entity = filters.entity;
    
    if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }
    
    return await AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 100);
}

export default {
    createLog,
    getLogs,
};
