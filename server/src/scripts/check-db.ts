import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;

async function check() {
  await mongoose.connect(uri as string);
  const db = mongoose.connection.db;
  const clients = await db?.collection('clients').find().sort({createdAt: -1}).limit(5).toArray();
  console.log(JSON.stringify(clients, null, 2));
  process.exit(0);
}
check();
