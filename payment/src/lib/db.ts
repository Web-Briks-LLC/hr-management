import mongoose from "mongoose";

declare global {
    var mongoose: {
        conn: mongoose.Mongoose | null;
        promise: Promise<mongoose.Mongoose> | null;
    };
}

const MONGODB_URI = (process.env.MONGO_URI ||
    process.env.MONGODB_URI) as string;
const DB_NAME = process.env.DB_NAME!;

if (!MONGODB_URI) {
    throw new Error(
        "Please define the MONGO_URI environment variable inside .env.local",
    );
}

if (!DB_NAME) {
    throw new Error(
        "Please define the DB_NAME environment variable inside .env.local",
    );
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            dbName: DB_NAME,
        };

        cached.promise = mongoose
            .connect(MONGODB_URI, opts)
            .then((mongoose) => {
                return mongoose;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
