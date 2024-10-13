import mongoose from "mongoose";

export const ROLE = ["paciente", "admin", "medico", "recepcionista"];

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            enum: ROLE,
            required: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

export const Role = mongoose.model("Role", roleSchema);
