import { connect, disconnect } from "mongoose";
import envConfig from "../config/env.config.js";
import ClientModel from "../models/client.model.js";
import OrderModel from "../models/order.model.js";
import User from "../models/user.model.js";
import ServiceModel from "../models/service.model.js";
import ReturnFileFormatModel from "../models/return-file-format.model.js";

async function seedTestData() {
    try {
        console.log("Connecting to database...");
        await connect(envConfig.mongo_uri);
        console.log("Connected.");

        // 1. Get required references
        const user = await User.findOne({ role: "admin" });
        if (!user)
            throw new Error("No admin user found to attribute records to.");

        const service = await ServiceModel.findOne();
        if (!service) throw new Error("No service found in DB.");

        const returnFileFormat = await ReturnFileFormatModel.findOne();
        if (!returnFileFormat) throw new Error("No return file format found.");

        // 2. Create fake client
        const clientEmail = "fuyad56@gmail.com";
        let client = await ClientModel.findOne({ email: clientEmail });

        if (!client) {
            client = new ClientModel({
                clientId: "CL-FAKE-" + Date.now(),
                name: "Fuyad Test Client",
                email: clientEmail,
                phone: "+1234567890",
                address: "123 Fake Street, NY",
                currency: "USD",
                createdBy: user._id,
            });
            await client.save();
            console.log("Created test client:", client.name);
        } else {
            console.log("Using existing test client:", client.name);
        }

        // 3. Create 50 fake orders for Feb 2026
        console.log("Creating 50 fake orders for Feb 2026...");
        const orders = [];

        for (let i = 1; i <= 50; i++) {
            // Random day in Feb 2026 (1 to 28)
            const day = Math.floor(Math.random() * 28) + 1;
            const orderDate = new Date(
                `2026-02-${day.toString().padStart(2, "0")}T10:00:00Z`,
            );
            const deadline = new Date(
                orderDate.getTime() + 24 * 60 * 60 * 1000,
            ); // +1 day

            const imageQuantity = Math.floor(Math.random() * 50) + 10; // 10 to 60 images
            const perImagePrice = 0.5;
            const price = imageQuantity * perImagePrice;

            const order = new OrderModel({
                orderName: `Test Order Feb 2026 #${i}`,
                clientId: client._id,
                orderDate,
                deadline,
                imageQuantity,
                perImagePrice,
                totalPrice: price,
                services: [service._id],
                returnFileFormat: returnFileFormat._id,
                status: "completed",
                priority: "normal",
                createdBy: user._id,
            });
            orders.push(order);
        }

        await OrderModel.insertMany(orders);
        console.log(
            "50 completed orders specifically for February 2026 generated successfully for " +
                client.name,
        );
    } catch (err) {
        console.error("Error generating test data:", err);
    } finally {
        await disconnect();
        process.exit(0);
    }
}

seedTestData();
