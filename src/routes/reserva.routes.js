import express from "express";
import {
  registrarReserva,
  getCitaById,
  getCitas,
  eliminarCita,
  confirmarOCancelarReserva
} from "../controllers/reserva.controller.js";
import {
  getCalendarioMedicoPorEspecialidad,
  buscarMedicosPorEspecialidadId
} from "../controllers/medico.controller.js";
import {
  registrarConsulta,
  obtenerTodasLasConsultas,
  obtenerConsultaPorId,
  actualizarConsulta,
  eliminarConsulta,
  calificarMedico
} from "../controllers/consulta.controller.js";
import { checkAuth } from "../middlewares/auth.middlleware.js";

const router = express.Router();

// Rutas de reservas
router.post("/create", registrarReserva);
router.get("/", getCitas);
router.get("/:citaId", getCitaById);
router.delete("/:citaId", eliminarCita);
router.put("/:reservaId/confirmacion", confirmarOCancelarReserva);

// Rutas de médicos
router.get("/medico/calendario/:medicoId/:especialidadId", getCalendarioMedicoPorEspecialidad);
router.get("/medico/especialidad/:especialidadId", buscarMedicosPorEspecialidadId);

// Rutas de consultas
router.post("/consulta/calificar", calificarMedico);
router.post("/consulta/create", registrarConsulta);
router.get("/consulta", obtenerTodasLasConsultas);
router.get("/consulta/:id", obtenerConsultaPorId);
router.put("/consulta/:consultaId", actualizarConsulta);
router.delete("/consulta/:id", eliminarConsulta);

export default router;
