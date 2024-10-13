import mongoose from "mongoose";

const notificacionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tipo: {
            type: String,
            enum: ["email", "sms", "push"],
            required: true,
        },
        mensaje: {
            type: String,
            required: true,
        },
        estado: {
            type: String,
            enum: ["pendiente", "enviado", "fallido"],
            default: "pendiente",
        },
        fechaEnvio: {
            type: Date,
        },
    },
    { timestamps: true }
);

export const Notificacion = mongoose.model("Notificacion", notificacionSchema);
