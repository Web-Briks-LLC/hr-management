import { model, Schema } from 'mongoose';

export interface IAuditLog {
    userId: Schema.Types.ObjectId;
    action: string;
    entity: string;
    entityId?: Schema.Types.ObjectId;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                'CREATE', 'UPDATE', 'DELETE', 'VIEW',
                'LOGIN', 'LOGOUT',
                'SALARY_VIEW', 'SALARY_UPDATE',
                'INVITATION_CREATE', 'INVITATION_ACCEPT',
                'PROFILE_UPDATE', 'PASSWORD_CHANGE',
                'ATTENDANCE_UPDATE', 'GRACE_ATTENDANCE',
                'PAYMENT_PROCESS', 'PAYMENT_UNDO',
                'PAYROLL_LOCK', 'PAYROLL_UNLOCK'
            ],
        },
        entity: {
            type: String,
            required: true,
        },
        entityId: Schema.Types.ObjectId,
        details: Schema.Types.Mixed,
        ipAddress: String,
        userAgent: String,
    },
    { timestamps: true }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });

const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLogModel;
