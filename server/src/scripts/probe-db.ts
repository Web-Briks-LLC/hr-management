import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseModel from '../models/expense.model.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri!);
    console.log("Connected to DB.");

    const expense = await ExpenseModel.findOne({ createdBy: { $exists: true } }).lean();
    console.log("Expense sample:", {
        _id: expense?._id,
        title: expense?.title,
        createdBy: expense?.createdBy,
        createdBy_type: typeof expense?.createdBy,
        createdBy_constructor: expense?.createdBy?.constructor?.name
    });

    const userCol = mongoose.connection.collection("user");
    const user = await userCol.findOne();
    console.log("User sample:", {
        _id: user?._id,
        name: user?.name,
        _id_type: typeof user?._id,
        _id_constructor: user?._id?.constructor?.name
    });

    // Let's test a lookup query
    console.log("Testing lookup...");
    const pipeline = [
        { $match: expense ? { _id: expense._id } : {} },
        {
            $lookup: {
                from: "user",
                let: { creatorId: "$createdBy" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ["$_id", "$$creatorId"] },
                                    { $eq: ["$_id", { $toString: "$$creatorId" }] },
                                    { $eq: [{ $toString: "$_id" }, { $toString: "$$creatorId" }] }
                                ]
                            }
                        }
                    }
                ],
                as: "creator"
            }
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } }
    ];

    const result = await ExpenseModel.aggregate(pipeline);
    console.log("Lookup result sample:", result[0]?.creator);

    await mongoose.disconnect();
}

run().catch(console.error);
