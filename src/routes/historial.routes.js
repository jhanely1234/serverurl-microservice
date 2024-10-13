import express from "express";
import {
  getHistorialMedicoPorPaciente,
  getDetallesConsultaPorReserva
} from "../controllers/historial.controller.js";
import { checkAuth } from "../middlewares/auth.middlleware.js";
const router = express.Router();

//get historial con respuesta OK
// Ruta GET para obtener todos los médicos
router.get('/', (req, res) => {
  res.status(200).json('ok');
});

router.get("/:pacienteId", getHistorialMedicoPorPaciente);

router.get("/reserva/:reservaId", getDetallesConsultaPorReserva);



export default router;
