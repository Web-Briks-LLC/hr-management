import mongoose, { Schema, model } from "mongoose";

// The 'user' collection is managed by better-auth with collection name 'user' (singular).
// We register a Mongoose model named "User" bound explicitly to the 'user' collection
// so that Mongoose populate (ref: 'User') and Mongoose queries work seamlessly without schema conflicts.
const UserSchema = new Schema(
    {
        name: { type: String },
        email: { type: String },
        emailVerified: { type: Boolean },
        image: { type: String },
        role: { type: String },
        banned: { type: Boolean },
        banReason: { type: String },
        banExpires: { type: Date },
        createdAt: { type: Date },
        updatedAt: { type: Date },
    },
    {
        collection: "user", // Explicitly binds to better-auth's singular 'user' collection
        strict: false,       // Allows all better-auth dynamic fields without validation errors
        timestamps: false,  // better-auth manages timestamps
    }
);

const UserModel = mongoose.models.User || model("User", UserSchema);
export default UserModel;
