import mongoose from "mongoose";

const especialidadSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

export const Especialidades = mongoose.model("Especialidades", especialidadSchema);
