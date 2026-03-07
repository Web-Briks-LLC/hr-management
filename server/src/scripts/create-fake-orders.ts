import mongoose from 'mongoose';
import 'dotenv/config';

// Import models
import OrderModel from '../models/order.model.js';
import ClientModel from '../models/client.model.js';
import ServiceModel from '../models/service.model.js';
import ReturnFileFormatModel from '../models/return-file-format.model.js';
import UserModel from '../models/user.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hr-management';

async function createOrders() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Find the client
        const client = await ClientModel.findOne({ clientId: 'CLIENT-NUMBER-012223' });
        if (!client) {
            console.error('Client CLIENT-NUMBER-012223 not found');
            process.exit(1);
        }
        console.log(`Found client: ${client.name} (${client._id})`);

        // 2. Find a service and return format
        const service = await ServiceModel.findOne({});
        const format = await ReturnFileFormatModel.findOne({});
        const user = await UserModel.findOne({ role: 'admin' });

        if (!service || !format || !user) {
            console.error(`Missing dependencies: 
                Service: ${service ? 'OK' : 'MISSING'}
                Format: ${format ? 'OK' : 'MISSING'}
                Admin: ${user ? 'OK' : 'MISSING'}`);
            process.exit(1);
        }

        const orders: any[] = [];

        // 10 orders for February 2026
        for (let i = 1; i <= 10; i++) {
            const date = new Date(2026, 1, i + 5); // Feb 2026
            orders.push({
                orderName: `Fake-Order-Feb-${i}`,
                clientId: client._id,
                orderDate: date,
                deadline: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                imageQuantity: 10 + i,
                perImagePrice: 1.5,
                totalPrice: (10 + i) * 1.5,
                services: [service._id],
                returnFileFormat: format._id,
                status: 'completed',
                createdBy: user._id,
                isPaid: false
            });
        }

        // 10 orders for March 2026
        for (let i = 1; i <= 10; i++) {
            const date = new Date(2026, 2, i + 5); // March 2026
            orders.push({
                orderName: `Fake-Order-Mar-${i}`,
                clientId: client._id,
                orderDate: date,
                deadline: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                imageQuantity: 15 + i,
                perImagePrice: 2.0,
                totalPrice: (15 + i) * 2.0,
                services: [service._id],
                returnFileFormat: format._id,
                status: 'completed',
                createdBy: user._id,
                isPaid: false
            });
        }

        console.log(`Creating ${orders.length} orders...`);
        const result = await OrderModel.insertMany(orders);
        console.log(`Successfully created ${result.length} orders.`);

        process.exit(0);
    } catch (error) {
        console.error('Failed to create orders:', error);
        process.exit(1);
    }
}

createOrders();
