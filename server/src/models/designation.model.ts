import { model, Schema, Types, type Document } from "mongoose";

export interface IDesignation extends Document {
    title: string;
    code?: string;
    departmentId?: Types.ObjectId;
    description?: string;
    isActive: boolean;
    createdBy?: Types.ObjectId;
}

const designationSchema = new Schema<IDesignation>(
    {
        title: {
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
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: false,
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

const DesignationModel = model<IDesignation>("Designation", designationSchema);
export default DesignationModel;
