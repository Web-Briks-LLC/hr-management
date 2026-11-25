import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose, { Types } from 'mongoose';
import Order, { AUTO_COMPLETE_NOTE } from '../models/order.model.js';
import '../models/client.model.js';

// Deliberately ignores MONGO_URI / app .env. Runs ONLY in a disposable local database.
// Needs a replica set (transactions), e.g.:
//   docker run -d --rm --name tmp-mongo -p 27017:27017 mongo:7 --replSet rs0
//   docker exec tmp-mongo mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
//   cd server && npx tsx --test src/tests/order-autocomplete.test.ts
const uri =
    process.env.ORDER_TEST_MONGO ||
    'mongodb://127.0.0.1:27017/?directConnection=true';
const dbName = `order_autocomplete_test_${Date.now()}`;
const user = new Types.ObjectId();

const seed = async (
    status: string,
    extra: Record<string, unknown> = {},
) => {
    const _id = new Types.ObjectId();
    await Order.collection.insertOne({
        _id,
        orderName: `order-${_id}`,
        status,
        isPaid: false,
        createdBy: user,
        timeline: [
            {
                status,
                timestamp: new Date('2026-01-01'),
                changedBy: user,
                note: 'seed',
            },
        ],
        ...extra,
    });
    return _id;
};
const load = (id: Types.ObjectId) => Order.findById(id).lean() as Promise<any>;
const lastNote = (order: any) => order.timeline[order.timeline.length - 1]?.note;

test('paid orders auto-complete, with corner cases', async (t) => {
    await mongoose.connect(uri, { dbName, autoIndex: false });
    try {
        await t.test('save(): pending order that becomes paid is completed', async () => {
            const id = await seed('pending');
            const doc = await Order.findById(id);
            doc!.isPaid = true;
            await doc!.save();
            const order = await load(id);
            assert.equal(order.status, 'completed');
            assert.ok(order.completedAt);
            assert.equal(lastNote(order), AUTO_COMPLETE_NOTE);
            assert.equal(String(order.timeline.at(-1).changedBy), String(user));
        });

        await t.test('save(): completed, delivered and cancelled are left alone', async () => {
            const completedAt = new Date('2026-02-02');
            for (const status of ['completed', 'delivered', 'cancelled']) {
                const id = await seed(status, { completedAt });
                const doc = await Order.findById(id);
                doc!.isPaid = true;
                await doc!.save();
                const order = await load(id);
                assert.equal(order.status, status);
                assert.equal(order.timeline.length, 1, `${status} got no new timeline entry`);
                if (status === 'completed')
                    assert.equal(order.completedAt.toISOString(), completedAt.toISOString());
            }
        });

        await t.test('save(): saving other fields on a paid order does nothing', async () => {
            const id = await seed('in_progress', { isPaid: true });
            const doc = await Order.findById(id);
            doc!.notes = 'edited';
            await doc!.save();
            assert.equal((await load(id)).status, 'in_progress');
        });

        await t.test('updateMany(): every open status completes, final ones do not', async () => {
            const statuses = [
                'pending',
                'in_progress',
                'quality_check',
                'revision',
                'ready_to_deliver',
                'completed',
                'delivered',
                'cancelled',
            ];
            const ids = await Promise.all(statuses.map((s) => seed(s)));
            await Order.updateMany({ _id: { $in: ids } }, { $set: { isPaid: true } });
            for (const [i, status] of statuses.entries()) {
                const order = await load(ids[i]!);
                const expected = ['delivered', 'cancelled'].includes(status)
                    ? status
                    : 'completed';
                assert.equal(order.status, expected, `${status} -> ${expected}`);
                assert.equal(order.isPaid, true);
                const auto = lastNote(order) === AUTO_COMPLETE_NOTE;
                assert.equal(
                    auto,
                    !['completed', 'delivered', 'cancelled'].includes(status),
                    `${status} timeline note`,
                );
            }
        });

        await t.test('updateMany(): running it twice adds no duplicate timeline entry', async () => {
            const id = await seed('pending');
            await Order.updateMany({ _id: id }, { $set: { isPaid: true } });
            await Order.updateMany({ _id: id }, { $set: { isPaid: true } });
            assert.equal((await load(id)).timeline.length, 2);
        });

        await t.test('updateMany(): orders outside the filter are untouched', async () => {
            const inside = await seed('pending');
            const outside = await seed('pending');
            await Order.updateMany({ _id: inside }, { $set: { isPaid: true } });
            assert.equal((await load(outside)).status, 'pending');
            assert.equal((await load(outside)).isPaid, false);
        });

        await t.test('updateMany(): update that changes the filtered field still works', async () => {
            const id = await seed('pending');
            await Order.updateMany(
                { _id: id, invoiceNumber: { $exists: false } },
                { $set: { isPaid: true, invoiceNumber: 'INV-1' } },
            );
            const order = await load(id);
            assert.equal(order.status, 'completed');
            assert.equal(order.invoiceNumber, 'INV-1');
        });

        await t.test('updateOne() and findOneAndUpdate() trigger it too', async () => {
            const a = await seed('in_progress');
            await Order.updateOne({ _id: a }, { isPaid: true });
            assert.equal((await load(a)).status, 'completed');
            const b = await seed('quality_check');
            const returned = await Order.findOneAndUpdate(
                { _id: b },
                { $set: { isPaid: true } },
                { new: true },
            );
            assert.ok(returned);
            assert.equal((await load(b)).status, 'completed');
        });

        await t.test('aggregation-pipeline update sets isPaid and completes', async () => {
            const id = await seed('pending');
            await Order.updateOne({ _id: id }, [{ $set: { isPaid: true } }]);
            assert.equal((await load(id)).status, 'completed');
        });

        await t.test('updates that do not touch isPaid, or set it false, change nothing', async () => {
            const id = await seed('pending');
            await Order.updateMany({ _id: id }, { $set: { notes: 'hello' } });
            await Order.updateMany({ _id: id }, { $set: { isPaid: false } });
            const order = await load(id);
            assert.equal(order.status, 'pending');
            assert.equal(order.timeline.length, 1);
        });

        await t.test('no matching order: no error, nothing happens', async () => {
            const result = await Order.updateMany(
                { _id: new Types.ObjectId() },
                { $set: { isPaid: true } },
            );
            assert.equal(result.matchedCount, 0);
            await Order.updateOne({ _id: new Types.ObjectId() }, { isPaid: true });
        });

        await t.test('inside a transaction: commit completes, abort leaves it untouched', async () => {
            const committed = await seed('in_progress');
            const aborted = await seed('in_progress');
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    await Order.updateMany(
                        { _id: committed },
                        { $set: { isPaid: true } },
                        { session },
                    );
                });
                await assert.rejects(
                    session.withTransaction(async () => {
                        await Order.updateMany(
                            { _id: aborted },
                            { $set: { isPaid: true } },
                            { session },
                        );
                        throw new Error('rollback');
                    }),
                    /rollback/,
                );
            } finally {
                await session.endSession();
            }
            assert.equal((await load(committed)).status, 'completed');
            const rolledBack = await load(aborted);
            assert.equal(rolledBack.status, 'in_progress');
            assert.equal(rolledBack.isPaid, false);
            assert.equal(rolledBack.timeline.length, 1);
        });

        await t.test('payment reversal: auto-completed order goes back to its old status', async () => {
            const id = await seed('quality_check');
            await Order.updateMany({ _id: id }, { $set: { isPaid: true } });
            assert.equal((await load(id)).status, 'completed');
            await Order.updateMany({ _id: id }, { $set: { isPaid: false } });
            const order = await load(id);
            assert.equal(order.status, 'quality_check');
            assert.equal(order.completedAt, undefined);
            assert.equal(order.isPaid, false);
        });

        await t.test('payment reversal via save() behaves the same', async () => {
            const id = await seed('revision');
            const doc = await Order.findById(id);
            doc!.isPaid = true;
            await doc!.save();
            const again = await Order.findById(id);
            again!.isPaid = false;
            await again!.save();
            assert.equal((await load(id)).status, 'revision');
        });

        await t.test('payment reversal does NOT undo a manual completion', async () => {
            const id = await seed('in_progress');
            await Order.updateMany({ _id: id }, { $set: { status: 'completed' } });
            await Order.updateMany({ _id: id }, { $set: { isPaid: true } });
            await Order.updateMany({ _id: id }, { $set: { isPaid: false } });
            assert.equal((await load(id)).status, 'completed');
        });

        await t.test('a manual status change after auto-complete is respected on reversal', async () => {
            const id = await seed('pending');
            await Order.updateMany({ _id: id }, { $set: { isPaid: true } });
            await Order.updateOne(
                { _id: id },
                {
                    $set: { status: 'delivered' },
                    $push: {
                        timeline: {
                            status: 'delivered',
                            timestamp: new Date(),
                            changedBy: user,
                            note: 'manual',
                        },
                    },
                },
            );
            await Order.updateMany({ _id: id }, { $set: { isPaid: false } });
            assert.equal((await load(id)).status, 'delivered');
        });
    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});
