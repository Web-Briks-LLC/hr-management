import { model, Schema, Types, type Document } from "mongoose";

export interface IDepartment extends Document {
    name: string;
    code?: string;
    description?: string;
    isActive: boolean;
    createdBy?: Types.ObjectId;
}

const departmentSchema = new Schema<IDepartment>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        code: {
            type: String,
            trim: true,
            uppercase: true,
        },
        description: {
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
        },
    },
    { timestamps: true }
);

const DepartmentModel = model<IDepartment>("Department", departmentSchema);
export default DepartmentModel;
