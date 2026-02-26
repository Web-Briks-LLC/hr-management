import { connect, disconnect } from "mongoose";
import envConfig from "../config/env.config.js";
import ClientModel from "../models/client.model.js";
import OrderModel from "../models/order.model.js";

async function check() {
    await connect(envConfig.mongo_uri);
    const client = await ClientModel.findOne({ email: "fuyad56@gmail.com" });
    if (client) {
        console.log("Client found:", client.name, "ID:", client.clientId);
        const orders = await OrderModel.find({ clientId: client._id });
        console.log(`Found ${orders.length} orders for this client.`);
    } else {
        console.log("Client not found.");
    }
    await disconnect();
}
check();
