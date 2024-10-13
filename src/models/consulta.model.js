import mongoose from "mongoose";

const { Schema } = mongoose;

const consultaSchema = new Schema({
  citaMedica: {
    type: Schema.Types.ObjectId,
    ref: "ReservaCita",
  },
  motivo_consulta: {
    type: String,
    default: "",
  },
  signos_vitales: [
    {
      Fc: {
        type: String,
        default: "",
      },
      Fr: {
        type: String,
        default: "",
      },
      Temperatura: {
        type: String,
        default: "",
      },
      peso: {
        type: String,
        default: "",
      },
      talla: {
        type: String,
        default: "",
      },
    },
  ],
  examen_fisico: {
    type: String,
  },
  diagnostico: {
    type: String,
    default: "",
  },
  conducta: {
    type: String,
    default: "",
  },
  fechaHora: {
    type: Date,
    default: Date.now,

  },
  receta: {
    type: String,
    default: "", // Asignar valor por defecto como una cadena vacía
  },
  horaInicio: {
    type: String,
    required: true,
  },
  horaFin: {
    type: String,
    default: null, // Asignar valor por defecto como una cadena vacía
  },
  calificacion: {
    type: Number,
    min: 0,
    max: 5,
    required: false,
  },
});

export const Consulta = mongoose.model("Consulta", consultaSchema);
