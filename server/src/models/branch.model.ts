import { model, Schema, Types, type Document } from "mongoose";

export interface IBranch extends Document {
    name: string;
    code: string;
    address?: string;
    isActive: boolean;
    createdBy: Types.ObjectId;
}

const branchSchema = new Schema<IBranch>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        code: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            unique: true,
        },

        address: {
            type: String,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

const BranchModel = model("Branch", branchSchema);
export default BranchModel;
