/** Idempotent demo orders and earnings; never modifies imported records. */
import mongoose from 'mongoose';
import envConfig from '../config/env.config.js';
import Client from '../models/client.model.js';
import Order from '../models/order.model.js';
import Service from '../models/service.model.js';
import FileFormat from '../models/return-file-format.model.js';
import Earning from '../models/earning.model.js';
import User from '../models/user.model.js';
import type { OrderStatus } from '../types/order.type.js';

if (envConfig.db_name !== 'hr-management-local' ||
    !/^mongodb:\/\/(mongo|127\.0\.0\.1|localhost):27017\/hr-management-local(?:\?.*)?$/.test(envConfig.mongo_uri) ||
    process.env.NODE_ENV === 'production') throw new Error('Local database required.');
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { email } = JSON.parse(input);
await mongoose.connect(envConfig.mongo_uri);
try {
    const admin = await User.findOne({ email, role: 'super_admin' });
    if (!admin) throw new Error('Run make local-admin first.');
    const service = await Service.findOneAndUpdate({ name: 'Local Demo Retouching' }, {
        $setOnInsert: { name: 'Local Demo Retouching', price: 2, isActive: true, createdBy: admin._id },
    }, { upsert: true, new: true, runValidators: true });
    const format = await FileFormat.findOneAndUpdate({ name: 'LOCAL-DEMO-JPG' }, {
        $setOnInsert: { name: 'LOCAL-DEMO-JPG', extension: 'jpg', createdBy: admin._id },
    }, { upsert: true, new: true, runValidators: true });
    const clients = [];
    for (let i = 1; i <= 20; i++) {
        clients.push(await Client.findOneAndUpdate({ clientId: `LOCAL-DEMO-${i}` }, {
            $setOnInsert: {
                clientId: `LOCAL-DEMO-${i}`, name: `Local Demo Client ${i}`,
                emails: [`client${i}@example.test`], currency: 'USD', status: 'active',
                createdBy: admin._id, assignedServices: [{ service: service._id, price: 2 }],
            },
        }, { upsert: true, new: true, runValidators: true }));
    }
    const statuses: OrderStatus[] = ['pending', 'in_progress', 'quality_check', 'revision',
        'ready_to_deliver', 'completed', 'delivered', 'cancelled'];
    const now = new Date();
    let added = 0;
    for (let i = 0; i < 1000; i++) {
        const name = `LOCAL-DEMO-${String(i + 1).padStart(4, '0')}`;
        if (await Order.exists({ orderName: name })) continue;
        const orderDate = new Date(now.getTime() - (i % 90) * 86400000);
        const status = statuses[i % statuses.length]!;
        const quantity = 10 + (i % 50);
        await Order.create({
            orderName: name, clientId: clients[i % clients.length]!._id,
            orderDate, deadline: new Date(orderDate.getTime() + 7 * 86400000),
            imageQuantity: quantity, perImagePrice: 2, totalPrice: quantity * 2,
            services: [service._id], returnFileFormat: format._id,
            status, priority: ['low', 'normal', 'high', 'urgent'][i % 4],
            instruction: 'Local demo data for development and testing.',
            notes: 'LOCAL DEMO — not a production order', createdBy: admin._id,
            timeline: [{ status, timestamp: orderDate, changedBy: admin._id, note: 'Local demo seed' }],
            ...(status === 'completed' || status === 'delivered' ? { completedAt: orderDate } : {}),
            ...(status === 'delivered' ? { deliveredAt: orderDate } : {}),
        });
        added++;
    }
    const groups = await Order.aggregate([
        { $match: { orderName: /^LOCAL-DEMO-/, status: { $in: ['completed', 'delivered'] } } },
        { $group: {
            _id: { clientId: '$clientId', month: { $month: '$orderDate' }, year: { $year: '$orderDate' } },
            orderIds: { $push: '$_id' }, imageQty: { $sum: '$imageQuantity' }, totalAmount: { $sum: '$totalPrice' },
        } },
    ]);
    for (const group of groups) {
        const { clientId, month, year } = group._id;
        const paid = month % 2 === 0;
        await Earning.findOneAndUpdate({ clientId, month, year }, { $set: {
            orderIds: group.orderIds, imageQty: group.imageQty, totalAmount: group.totalAmount,
            currency: 'USD', conversionRate: 120, netAmount: group.totalAmount,
            amountInBDT: group.totalAmount * 120, status: paid ? 'paid' : 'unpaid',
            paidAmount: paid ? group.totalAmount : 0,
            paidAmountBDT: paid ? group.totalAmount * 120 : 0,
            createdBy: admin._id, notes: 'LOCAL DEMO — simulated earnings',
        } }, { upsert: true, runValidators: true });
    }
    console.log(JSON.stringify({ addedOrders: added, totalDemoOrders: await Order.countDocuments({ orderName: /^LOCAL-DEMO-/ }), demoClients: clients.length, demoEarnings: groups.length }));
} finally {
    await mongoose.disconnect();
}
