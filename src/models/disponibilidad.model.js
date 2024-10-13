import mongoose from "mongoose";

const disponibilidadSchema = new mongoose.Schema({
    medico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    dia: {
        type: String,
        enum: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
        required: true,
    },
    inicio: {
        type: String,
        required: true,
    },
    fin: {
        type: String,
        required: true,
    },
    turno: {
        type: String,
        enum: ["mañana", "tarde", "ambos"],
        required: true,
    },
    especialidad: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Especialidades",
        required: true,
    }
}, {
    timestamps: true,
});

export const Disponibilidad = mongoose.model("Disponibilidad", disponibilidadSchema);
