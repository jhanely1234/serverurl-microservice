import mongoose from "mongoose";

const { Schema } = mongoose;

const historialMedicoSchema = new Schema({
    paciente: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true, // Un solo historial médico por paciente
    },
    consultas: [
        {
            type: Schema.Types.ObjectId,
            ref: "Consulta",
        },
    ],
});

export const HistorialMedico = mongoose.model("HistorialMedico", historialMedicoSchema);
