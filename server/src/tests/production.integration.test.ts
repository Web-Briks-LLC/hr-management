import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose, { Types } from 'mongoose';
import production from '../services/production.service.js';
import Staff from '../models/staff.model.js';
import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import Image from '../models/order-image.model.js';
import Session from '../models/production-session.model.js';
import Event from '../models/production-event.model.js';
import Client from '../models/client.model.js';
import Log from '../models/shift-production.model.js';
import { flagImageRevisionSchema } from '../validators/production.validator.js';
import {
    inspectProductionLocks,
    repairProductionLocks,
} from '../services/production-repair.service.js';
import '../models/service.model.js';
import '../models/return-file-format.model.js';

// Deliberately ignores MONGO_URI / app .env. Runs ONLY in a disposable local database.
const uri =
    process.env.PRODUCTION_TEST_MONGO ||
    'mongodb://127.0.0.1:27017/?directConnection=true';
const dbName = `production_test_${Date.now()}`;
test('production lifecycle and competing requests on a real replica set', async (t) => {
    await mongoose.connect(uri, { dbName, autoIndex: false });
    try {
        await Image.createIndexes();
        await Event.createIndexes();
        const userA = new Types.ObjectId(),
            userB = new Types.ObjectId(),
            admin = new Types.ObjectId();
        const staffA = new Types.ObjectId(),
            staffB = new Types.ObjectId();
        await User.collection.insertMany([
            { _id: userA, name: 'Editor A', role: 'staff' },
            { _id: userB, name: 'Editor B', role: 'staff' },
            { _id: admin, name: 'Supervisor', role: 'admin' },
        ]);
        await Staff.collection.insertMany([
            {
                _id: staffA,
                userId: userA,
                staffId: 'A',
                status: 'active',
                inactivePeriods: [],
            },
            {
                _id: staffB,
                userId: userB,
                staffId: 'B',
                status: 'active',
                inactivePeriods: [],
            },
        ]);
        const clientId = new Types.ObjectId();
        await Client.collection.insertOne({
            _id: clientId,
            clientId: 'CLIENT+[1]',
            name: 'Test client',
        });
        const makeOrder = async (quantity: number) => {
            const id = new Types.ObjectId();
            await Order.collection.insertOne({
                _id: id,
                clientId,
                orderName: `ORDER-${id}`,
                status: 'pending',
                orderDate: new Date(),
                deadline: new Date(),
                perImagePrice: 1,
                totalPrice: quantity,
                returnFileFormat: new Types.ObjectId(),
                createdBy: admin,
                imageQuantity: quantity,
                requiredSteps: [
                    { name: 'Edit', code: 'edit' },
                    { name: 'Retouch', code: 'retouch' },
                ],
                services: [],
                timeline: [],
            });
            return String(id);
        };
        const take = (orderId: string, names: string[], user = userA) =>
            production.startWorkSession(
                { orderId, imageNames: names },
                String(user),
            );
        const cancel = (id: unknown, user = userA) =>
            production.cancelWorkSession(
                String(id),
                String(user),
                'Test handover',
            );
        await t.test(
            '500 images allowed; order capacity enforced; release and retake by both editors',
            async () => {
                const orderId = await makeOrder(500);
                const names = Array.from({ length: 500 }, (_, i) => `${i}.jpg`);
                const a = await take(orderId, names);
                assert.equal(a.lockedCount, 500);
                await cancel(a.session._id);
                const again = await take(orderId, names);
                await cancel(again.session._id);
                const b = await take(orderId, names, userB);
                await cancel(b.session._id, userB);
                await assert.rejects(take(orderId, ['extra.jpg']), /at most/);
                assert.equal(await Image.countDocuments({ orderId }), 500);
                assert.equal(await Event.countDocuments({ orderId }), 6);
            },
        );
        await t.test('released JPG can be taken as PSD without using another slot', async () => {
            const orderId = await makeOrder(1);
            const first = await take(orderId, ['photo.jpg']);
            await cancel(first.session._id);
            const second = await take(orderId, ['photo.psd'], userB);
            assert.deepEqual(second.session.imageNames, ['photo.jpg']);
            assert.equal(await Image.countDocuments({ orderId }), 1);
            const latest = await Event.findOne({ orderId, action: 'taken' }).sort({ createdAt: -1 }).lean();
            assert.deepEqual(latest?.imageNames, ['photo.jpg']);
            assert.equal(latest?.previousImages?.[0]?.imageName, 'photo.jpg');
            await cancel(second.session._id, userB);
            await assert.rejects(take(orderId, ['photo.jpg', 'photo.psd']), /same image more than once/);
            await assert.rejects(take(orderId, ['new.jpg', 'new.psd']), /multiple filenames for the same image/);
        });
        await t.test('submitted JPG cannot be reopened through a PSD alias', async () => {
            const orderId = await makeOrder(1);
            const first = await take(orderId, ['photo.jpg']);
            await production.finishWorkSession(
                { sessionId: String(first.session._id), completedSteps: ['Edit', 'Retouch'] },
                String(userA),
            );
            await assert.rejects(take(orderId, ['photo.psd'], userB), /already submitted/);
            assert.equal(await Image.countDocuments({ orderId }), 1);
        });
        await t.test('historical JPG/PSD copies count once and preserve both records', async () => {
            const orderId = await makeOrder(2);
            const first = await take(orderId, ['photo.jpg']);
            await cancel(first.session._id);
            await Image.collection.insertOne({
                orderId: new Types.ObjectId(orderId), imageName: 'photo.psd',
                status: 'unassigned', requiredSteps: [], completedSteps: [],
            });
            const before = await production.getOrderImageStatus(orderId);
            assert.equal(before.summary.totalRegistered, 1);
            assert.equal(before.summary.unassignedCount, 2);
            await assert.rejects(take(orderId, ['photo.tif']), /multiple registered filenames/);
            await Image.updateOne({ orderId, imageName: 'photo.psd' }, { $set: { status: 'pending_qc' } });
            await assert.rejects(take(orderId, ['photo.jpg']), /another registered copy/);
            const second = await take(orderId, ['new.jpg'], userB);
            assert.equal(await Image.countDocuments({ orderId }), 3);
            assert.equal((await production.getOrderImageStatus(orderId)).summary.totalRegistered, 2);
            await cancel(second.session._id, userB);
        });
        await t.test(
            'simultaneous claim has exactly one winner and no orphan session',
            async () => {
                const orderId = await makeOrder(1);
                const outcomes = await Promise.allSettled([
                    take(orderId, ['same.jpg']),
                    take(orderId, ['same.jpg'], userB),
                ]);
                assert.equal(
                    outcomes.filter((r) => r.status === 'fulfilled').length,
                    1,
                );
                const session = await Session.findOne({
                    orderId,
                    status: 'active',
                });
                assert.ok(session);
                assert.equal(await Session.countDocuments({ orderId }), 1);
                assert.equal(await Event.countDocuments({ orderId }), 1);
                const img = await Image.findOne({ orderId });
                assert.equal(
                    String(img?.currentSessionId),
                    String(session._id),
                );
                await cancel(
                    session._id,
                    String(session.staffId) === String(staffA) ? userA : userB,
                );
            },
        );
        await t.test(
            'concurrent distinct filenames cannot exceed order capacity',
            async () => {
                const orderId = await makeOrder(1);
                const outcomes = await Promise.allSettled([
                    take(orderId, ['a.jpg']),
                    take(orderId, ['b.jpg'], userB),
                ]);
                assert.equal(
                    outcomes.filter((r) => r.status === 'fulfilled').length,
                    1,
                );
                assert.equal(await Image.countDocuments({ orderId }), 1);
                const session = await Session.findOne({
                    orderId,
                    status: 'active',
                });
                assert.ok(session);
                await cancel(
                    session._id,
                    String(session.staffId) === String(staffA) ? userA : userB,
                );
            },
        );
        await t.test(
            'one editor cannot start two orders concurrently',
            async () => {
                const ids = [await makeOrder(1), await makeOrder(1)];
                const results = await Promise.allSettled(
                    ids.map((id) => take(id, ['x.jpg'])),
                );
                assert.equal(
                    results.filter((r) => r.status === 'fulfilled').length,
                    1,
                );
                const active = await Session.findOne({
                    staffId: staffA,
                    status: 'active',
                });
                assert.ok(active);
                await cancel(active._id);
            },
        );
        await t.test(
            'hold reserves images; partial work survives handover; old owner cannot finish',
            async () => {
                const orderId = await makeOrder(1);
                const first = await take(orderId, ['x.jpg']);
                await production.pauseWorkSession(
                    String(first.session._id),
                    String(userA),
                );
                await assert.rejects(take(orderId, ['x.jpg'], userB), /locked/);
                await assert.rejects(take(orderId, ['x.jpg']), /held session/);
                await production.resumeWorkSession(
                    String(first.session._id),
                    String(userA),
                );
                await production.finishWorkSession(
                    {
                        sessionId: String(first.session._id),
                        completedSteps: ['Edit'],
                    },
                    String(userA),
                );
                assert.equal(
                    (await Image.findOne({ orderId }))?.status,
                    'partially_completed',
                );
                const second = await take(orderId, ['x.jpg'], userB);
                await production.reassignWorkSession(
                    {
                        sessionId: String(second.session._id),
                        newStaffId: String(staffA),
                    },
                    String(admin),
                );
                await assert.rejects(
                    production.finishWorkSession(
                        {
                            sessionId: String(second.session._id),
                            completedSteps: ['Retouch'],
                        },
                        String(userB),
                    ),
                    /closed/,
                );
                const next = await Session.findOne({
                    orderId,
                    status: 'active',
                });
                assert.ok(next);
                await production.finishWorkSession(
                    {
                        sessionId: String(next._id),
                        completedSteps: ['Retouch'],
                    },
                    String(userA),
                );
                const img = await Image.findOne({ orderId });
                assert.equal(img?.completedSteps.length, 2);
                assert.equal(img?.status, 'pending_qc');
                await assert.rejects(
                    take(orderId, ['x.jpg']),
                    /already submitted/,
                );
                await production.qcApproveImages(
                    { orderId, imageNames: ['x.jpg'] },
                    String(admin),
                );
                assert.equal(
                    (await Order.findById(orderId))?.status,
                    'completed',
                );
                await production.flagImageRevision(
                    {
                        orderId,
                        imageNames: ['x.jpg'],
                        instruction: 'Fix edges',
                    },
                    String(admin),
                );
                assert.equal(
                    (await Image.findOne({ orderId }))?.completedSteps.length,
                    0,
                );
                const rev = await take(orderId, ['x.jpg']);
                await cancel(rev.session._id);
                assert.equal(
                    (await Image.findOne({ orderId }))?.status,
                    'in_revision',
                );
                const partialRevision = await take(orderId, ['x.jpg']);
                await production.finishWorkSession(
                    {
                        sessionId: String(partialRevision.session._id),
                        completedSteps: ['Edit'],
                    },
                    String(userA),
                );
                const stillRevision = await Image.findOne({ orderId });
                assert.equal(stillRevision?.isRevision, true);
                assert.equal(
                    stillRevision?.revisionHistory.at(-1)?.resolvedAt,
                    undefined,
                );
                const remainingRevision = await take(orderId, ['x.jpg'], userB);
                await production.finishWorkSession(
                    {
                        sessionId: String(remainingRevision.session._id),
                        completedSteps: ['Retouch'],
                    },
                    String(userB),
                );
                assert.equal(
                    (await Image.findOne({ orderId }))?.isRevision,
                    false,
                );
                const activity = await production.getOrderActivity(orderId);
                assert.equal(activity.contributorCount, 2);
                const firstPage = await production.getOrderActivity(orderId, 1, undefined, 10);
                const secondPage = await production.getOrderActivity(orderId, 2, undefined, 10);
                assert.ok(firstPage.total > 10);
                assert.equal(firstPage.events.length, 10);
                assert.equal(secondPage.page, 2);
                assert.ok(secondPage.events.length > 0);
                assert.ok(!firstPage.events.some((a) => secondPage.events.some((b) => String(a._id) === String(b._id))));
                const lastPage = await production.getOrderActivity(orderId, 999, undefined, 10);
                assert.equal(lastPage.page, lastPage.totalPages);
                const emptyPage = await production.getOrderActivity(orderId, 2, 'missing.jpg', 10);
                assert.equal(emptyPage.page, 1);
                assert.equal(emptyPage.total, 0);

                assert.ok(
                    activity.events.some((e) => e.action === 'reassigned'),
                );
            },
        );
        await t.test(
            'revision cannot unlock active work; stale finish cannot overwrite a new owner',
            async () => {
                const orderId = await makeOrder(1);
                const a = await take(orderId, ['x.jpg']);
                await assert.rejects(
                    production.flagImageRevision(
                        {
                            orderId,
                            imageNames: ['x.jpg'],
                            instruction: 'Wrong',
                        },
                        String(admin),
                    ),
                    /submitted or approved/,
                );
                await Image.updateOne(
                    { orderId },
                    {
                        $set: {
                            currentSessionId: new Types.ObjectId(),
                            currentAssignedStaffId: staffB,
                        },
                    },
                );
                await assert.rejects(
                    production.finishWorkSession(
                        {
                            sessionId: String(a.session._id),
                            completedSteps: ['Edit'],
                        },
                        String(userA),
                    ),
                    /no longer belong/,
                );
                assert.equal(
                    (await Image.findOne({ orderId }))?.completedSteps.length,
                    0,
                );
                await cancel(a.session._id);
                assert.equal(
                    String(
                        (await Image.findOne({ orderId }))
                            ?.currentAssignedStaffId,
                    ),
                    String(staffB),
                );
            },
        );
        await t.test(
            'invalid steps rollback; client ID search is literal and status filtered',
            async () => {
                const orderId = await makeOrder(1);
                const a = await take(orderId, ['x.jpg']);
                await assert.rejects(
                    production.finishWorkSession(
                        {
                            sessionId: String(a.session._id),
                            completedSteps: ['Made up step'],
                        },
                        String(userA),
                    ),
                    /valid work steps/,
                );
                assert.equal(
                    (await Session.findById(a.session._id))?.status,
                    'active',
                );
                await cancel(a.session._id);
                const matches = await production.getSanitizedActiveOrders(
                    'CLIENT+[1]',
                    false,
                    'in_progress',
                );
                assert.ok(matches.length);
                assert.ok(matches.every((o) => o.status === 'in_progress'));
                assert.equal(
                    (await production.getSanitizedActiveOrders('CLIENT+[2]'))
                        .length,
                    0,
                );
            },
        );
        await t.test(
            'stale lock inspection is read-only; repair preserves progress and is audited',
            async () => {
                const issues = await inspectProductionLocks();
                assert.ok(issues.length);
                const issue = issues.find((i) => i.repairable)!;
                assert.ok(issue);
                assert.ok(
                    (
                        await Image.findOne({
                            orderId: issue.orderId,
                            imageName: issue.imageName,
                        })
                    )?.currentSessionId,
                );
                await repairProductionLocks(
                    {
                        orderId: issue.orderId,
                        imageNames: [issue.imageName],
                        note: 'Test repair',
                    },
                    String(admin),
                );
                assert.equal(
                    (
                        await Image.findOne({
                            orderId: issue.orderId,
                            imageName: issue.imageName,
                        })
                    )?.currentSessionId,
                    null,
                );
                assert.equal(
                    await Event.countDocuments({
                        orderId: issue.orderId,
                        action: 'locks_repaired',
                    }),
                    1,
                );
            },
        );
        await t.test('legacy QC and patch cannot let an editor approve their own work', async () => {
            const orderId = await makeOrder(1);
            const logId = new Types.ObjectId();
            await Log.collection.insertOne({ _id: logId, orderId: new Types.ObjectId(orderId), teamLeaderId: userA, completedQuantity: 1, status: 'in_progress' });
            await assert.rejects(production.submitQCReview(String(logId), { passedCount: 1, rejectedCount: 0 }, String(userA)), /supervisors/);
            await assert.rejects(production.updateProductionLog(String(logId), { qc: { passedCount: 1, rejectedCount: 0 } } as any, String(userA), 'staff'), /supervisors/);
            await assert.rejects(production.submitQCReview(String(logId), { passedCount: 2, rejectedCount: 0 }, String(admin)), /cannot exceed/);
            await assert.rejects(production.submitQCReview(String(logId), { passedCount: 0.5, rejectedCount: 0 }, String(admin)), /whole numbers/);
            assert.equal((await Log.findById(logId))?.status, 'in_progress');
            assert.equal(flagImageRevisionSchema.safeParse({ orderId, imageNames: ['x.jpg'], instruction: '   ' }).success, false);
        });
        await t.test('QC normalizes names and concurrent duplicate approval records one event', async () => {
            const orderId = await makeOrder(1);
            const session = await take(orderId, ['photo[1]+.jpg', ' photo[1]+.jpg ']);
            assert.equal(session.lockedCount, 1);
            await production.finishWorkSession({ sessionId: String(session.session._id), completedSteps: ['Edit', 'Retouch'] }, String(userA));
            const results = await Promise.allSettled([
                production.qcApproveImages({ orderId, imageNames: [' photo[1]+.jpg '] }, String(admin)),
                production.qcApproveImages({ orderId, imageNames: [' photo[1]+.jpg '] }, String(admin)),
            ]);
            assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
            assert.equal((await Image.findOne({ orderId }))?.status, 'completed');
            assert.equal(await Event.countDocuments({ orderId, action: 'approved' }), 1);
        });
        await t.test('image search treats regex symbols as literal filenames', async () => {
            const orderId = await makeOrder(2);
            const session = await take(orderId, ['photo[1]+.jpg', 'photo11.jpg']);
            await cancel(session.session._id);
            const result = await production.getOrderImageStatus(orderId, undefined, '[');
            assert.equal(result.images.length, 1);
            assert.equal(result.images[0]?.imageName, 'photo[1]+.jpg');
        });
        await t.test('simultaneous submit and release has one winner without duplicate history', async () => {
            const orderId = await makeOrder(1);
            const session = await take(orderId, ['x.jpg']);
            const results = await Promise.allSettled([
                production.finishWorkSession({ sessionId: String(session.session._id), completedSteps: ['Edit', 'Retouch'] }, String(userA)),
                cancel(session.session._id),
            ]);
            assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
            const image = await Image.findOne({ orderId });
            const closed = await Session.findById(session.session._id);
            assert.equal(image?.currentSessionId, null);
            assert.equal(image?.status, closed?.status === 'completed' ? 'pending_qc' : 'unassigned');
            assert.equal(await Event.countDocuments({ orderId }), 2);
        });
        await t.test('another editor cannot release, submit or resume an owned session', async () => {
            const orderId = await makeOrder(1);
            const session = await take(orderId, ['x.jpg']);
            await assert.rejects(cancel(session.session._id, userB), /authorized/);
            await assert.rejects(production.finishWorkSession({ sessionId: String(session.session._id), completedSteps: ['Edit'] }, String(userB)), /authorized/);
            await production.pauseWorkSession(String(session.session._id), String(userA));
            await assert.rejects(production.resumeWorkSession(String(session.session._id), String(userB)), /own/);
            await cancel(session.session._id);
        });
        await t.test(
            'audit insert failure rolls back images and session',
            async () => {
                const orderId = await makeOrder(1);
                const original = Event.create;
                Event.create = (async () => {
                    throw new Error('Injected audit failure');
                }) as typeof Event.create;
                try {
                    await assert.rejects(
                        take(orderId, ['rollback.jpg']),
                        /Injected audit failure/,
                    );
                } finally {
                    Event.create = original;
                }
                assert.equal(await Session.countDocuments({ orderId }), 0);
                assert.equal(await Image.countDocuments({ orderId }), 0);
            },
        );
    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});
