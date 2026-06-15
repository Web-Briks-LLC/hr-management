import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseModel from '../models/expense.model.js';
dotenv.config();
async function run() {
    await mongoose.connect(process.env.MONGO_URI as string);
    const exps = await ExpenseModel.find({ amount: 178000 });
    console.log('Expenses found:', exps.map(e => ({ title: e.title, amount: e.amount, status: e.status, date: e.date, id: e._id })));
    await mongoose.disconnect();
}
run().catch(console.error);
