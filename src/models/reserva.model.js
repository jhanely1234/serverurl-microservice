import mongoose from "mongoose";

const reservaCitaSchema = new mongoose.Schema(
  {
    paciente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    medico: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    especialidad_solicitada: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Especialidades",
      required: true,
    },
    fechaReserva: {
      type: Date,
      required: true,
    },
    horaInicio: {
      type: String,
      required: true,
    },
    horaFin: {
      type: String,
      required: true,
    },
    fechaActual: {
      type: Date,
      default: Date.now,
    },
    estado_reserva: {
      type: String,
      enum: ["atendido", "pendiente", "cancelado"],
      default: "pendiente",
    },
    estadoConfirmacionPaciente: {
      type: String,
      enum: ["confirmado", "pendiente", "cancelado"],
      default: "pendiente",
    },
    estadoConfirmacionMedico: {
      type: String,
      enum: ["confirmado", "pendiente", "cancelado"],
      default: "pendiente",
    },
    consulta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consulta", // Este campo es opcional y se añadirá cuando la consulta médica sea registrada
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const ReservaCita = mongoose.model("ReservaCita", reservaCitaSchema);
