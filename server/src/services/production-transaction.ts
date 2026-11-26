import mongoose, { Schema, model } from 'mongoose';
import { AsyncLocalStorage } from 'node:async_hooks';
import WorkSession from '../models/production-session.model.js';
import Staff from '../models/staff.model.js';
import Event from '../models/production-event.model.js';
import Image from '../models/order-image.model.js';

// All Mongoose operations invoked inside connection.transaction inherit its session.
mongoose.set('transactionAsyncLocalStorage', true);
const Guard = model(
    'ProductionGuard',
    new Schema({ _id: String, version: Number }),
);
export const productionNotifications = new AsyncLocalStorage<
    Array<() => void>
>();

export function resolveImageNames(requested: string[], existing: string[]): string[] {
    const names = new Set(existing);
    const byStem = new Map<string, string[]>();
    for (const name of names) {
        const stem = name.replace(/\.[^.]+$/, '');
        if (!byStem.has(stem)) byStem.set(stem, []);
        byStem.get(stem)!.push(name);
    }
    const resolved = requested.map((raw) => {
        const name = raw.trim();
        if (names.has(name)) return name;
        const matches = byStem.get(name.replace(/\.[^.]+$/, '')) || [];
        if (matches.length > 1)
            throw new Error(`"${name}" matches multiple registered filenames. Select the exact image from the available list.`);
        return matches[0] || name;
    });
    if (new Set(resolved).size !== resolved.length)
        throw new Error('This batch contains the same image more than once under different filenames. Remove the duplicate and try again.');
    if (new Set(resolved.map((name) => name.replace(/\.[^.]+$/, ''))).size !== resolved.length)
        throw new Error('This batch contains multiple filenames for the same image. Take each image only once.');
    return resolved;
}

/** Serializes conflicting order/editor operations across server instances. Unrelated
 * orders remain concurrent. Requires a replica set; never falls back to unsafe writes. */
export function productionMutation<T extends (...args: any[]) => Promise<any>>(
    action: string,
    fn: T,
): T {
    return (async (...args: Parameters<T>) => {
        const payload = args[0];
        const actorId = args[1];
        const sessionId =
            typeof payload === 'string' ? payload : payload.sessionId;
        const previous = sessionId
            ? await WorkSession.findById(sessionId).lean()
            : null;
        const orderId = previous?.orderId || payload.orderId;
        if (!orderId) throw new Error('Work session or order not found');
        const actor = await Staff.findOne({ userId: actorId })
            .select('_id')
            .lean();
        const keys = [
            ...new Set([
                `order:${orderId}`,
                ...(actor ? [`staff:${actor._id}`] : []),
                ...(previous ? [`staff:${previous.staffId}`] : []),
                ...(payload.newStaffId ? [`staff:${payload.newStaffId}`] : []),
            ]),
        ].sort();
        for (const key of keys) {
            try {
                await Guard.updateOne(
                    { _id: key },
                    { $setOnInsert: { version: 0 } },
                    { upsert: true },
                );
            } catch (error: any) {
                if (error.code !== 11000) throw error;
            }
        }
        let callbacks: Array<() => void> = [];
        const result = await mongoose.connection.transaction(async () => {
            callbacks = []; // withTransaction may retry; discard events from aborted attempts.
            return productionNotifications.run(callbacks, async () => {
                for (const key of keys)
                    await Guard.updateOne(
                        { _id: key },
                        { $inc: { version: 1 } },
                    );
                const current = sessionId
                    ? await WorkSession.findById(sessionId).lean()
                    : null;
                if (action === 'taken') {
                    const existing = await Image.find({ orderId })
                        .select('imageName')
                        .lean();
                    args[0] = { ...payload, imageNames: resolveImageNames(payload.imageNames, existing.map((image) => image.imageName)) };
                }
                const imageNames = [
                    ...new Set<string>(
                        (current?.imageNames || args[0].imageNames || [])
                            .map((n: string) => n.trim())
                            .filter(Boolean),
                    ),
                ];
                const previousImages = await Image.find({
                    orderId,
                    imageName: { $in: imageNames },
                })
                    .select(
                        'imageName status currentAssignedStaffId currentSessionId completedSteps isRevision',
                    )
                    .lean();
                const value = await fn(...args);
                await Event.create({
                    orderId,
                    sessionId: sessionId || value.session?._id,
                    action,
                    actorId,
                    fromStaffId: current?.staffId || null,
                    toStaffId:
                        payload.newStaffId ||
                        (action === 'taken' ? actor?._id : undefined),
                    imageNames:
                        action === 'released' && current
                            ? previousImages
                                  .filter(
                                      (image) =>
                                          String(image.currentSessionId) ===
                                              String(current._id) &&
                                          String(
                                              image.currentAssignedStaffId,
                                          ) === String(current.staffId),
                                  )
                                  .map((image) => image.imageName)
                            : imageNames,
                    note:
                        payload.notes ||
                        payload.note ||
                        payload.instruction ||
                        args[2],
                    completedSteps: payload.completedSteps || [],
                    previousImages,
                });
                return value;
            });
        });
        callbacks.forEach((callback) => callback());
        return result;
    }) as T;
}
