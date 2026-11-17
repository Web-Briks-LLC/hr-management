import Image from '../models/order-image.model.js';
import Session from '../models/production-session.model.js';
import { productionMutation } from './production-transaction.js';

/** Never infer ownership from status alone. Only release locks whose session is
 * missing or closed. Live mismatches require human review and remain untouched. */
export async function inspectProductionLocks(orderId?: string) {
    const images = await Image.find({
        ...(orderId ? { orderId } : {}),
        $or: [
            { currentSessionId: { $ne: null } },
            { currentAssignedStaffId: { $ne: null } },
            { status: 'in_progress' },
        ],
    }).lean();
    const sessions = await Session.find({
        _id: {
            $in: images.flatMap((i) =>
                i.currentSessionId ? [i.currentSessionId] : [],
            ),
        },
    }).lean();
    const byId = new Map(sessions.map((s) => [String(s._id), s]));
    const issues = images.flatMap((image) => {
        const session = byId.get(String(image.currentSessionId));
        const live = session && ['active', 'paused'].includes(session.status);
        const matches =
            live &&
            String(session.orderId) === String(image.orderId) &&
            String(session.staffId) === String(image.currentAssignedStaffId) &&
            session.imageNames.includes(image.imageName);
        if (matches && image.status === 'in_progress') return [];
        return [
            {
                orderId: String(image.orderId),
                imageName: image.imageName,
                sessionId: image.currentSessionId
                    ? String(image.currentSessionId)
                    : null,
                repairable:
                    !live &&
                    !['completed', 'pending_qc'].includes(image.status),
                reason: live
                    ? 'Live session ownership or status mismatch; review manually'
                    : 'Missing or closed session',
            },
        ];
    });
    const liveSessions = await Session.find({
        ...(orderId ? { orderId } : {}),
        status: { $in: ['active', 'paused'] },
    }).lean();
    const owned = new Map<string, Set<string>>();
    for (const image of images) {
        const key = `${image.currentSessionId}:${image.currentAssignedStaffId}:${image.orderId}`;
        if (!owned.has(key)) owned.set(key, new Set());
        owned.get(key)!.add(image.imageName);
    }
    for (const session of liveSessions) {
        const names =
            owned.get(`${session._id}:${session.staffId}:${session.orderId}`) ||
            new Set();
        for (const imageName of session.imageNames)
            if (!names.has(imageName))
                issues.push({
                    orderId: String(session.orderId),
                    imageName,
                    sessionId: String(session._id),
                    repairable: false,
                    reason: 'Live session no longer owns this image; supervisor must review and release the old session',
                });
    }
    return issues;
}

export const repairProductionLocks = productionMutation(
    'locks_repaired',
    async (
        payload: { orderId: string; imageNames: string[]; note: string },
        _actorId: string,
    ) => {
        const issues = await inspectProductionLocks(payload.orderId);
        const safe = new Set(
            issues.filter((i) => i.repairable).map((i) => i.imageName),
        );
        if (payload.imageNames.some((name) => !safe.has(name)))
            throw new Error(
                'Ownership changed or a live session exists. Inspect again before repairing.',
            );
        const images = await Image.find({
            orderId: payload.orderId,
            imageName: { $in: payload.imageNames },
        });
        for (const image of images) {
            image.currentSessionId = null;
            image.currentAssignedStaffId = null;
            image.lockedAt = null;
            image.status = image.isRevision
                ? 'in_revision'
                : image.completedSteps.length
                  ? 'partially_completed'
                  : 'unassigned';
            await image.save();
        }
        return { repaired: images.length };
    },
);
