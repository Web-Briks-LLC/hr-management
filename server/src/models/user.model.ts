import mongoose from "mongoose";

// The 'user' collection is managed by better-auth, not Mongoose.
// We use a raw collection reference here for direct queries (e.g., $lookup).
// Do NOT create a Mongoose schema for this collection — it would conflict
// with better-auth's own schema management.
const UserModel = mongoose.connection.collection("user");
export default UserModel;
