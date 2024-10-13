import express from "express";
import {
  registerMedico,
  getMedicos,
  getMedicoById,
  updateMedico,
  deleteMedico,
  getCalendarioMedicoPorEspecialidad,
  buscarMedicosPorEspecialidadId,
  getDisponibilidadesOrganizadas,
  buscarMedicosPorEspecialidadIdcompleto


} from "../controllers/medico.controller.js";
import { checkAuth } from "../middlewares/auth.middlleware.js";

const router = express.Router();

router.post("/register", registerMedico);
router.get("/", getMedicos);
router.get("/:id", getMedicoById);
router.put("/:id", checkAuth, updateMedico);
router.delete("/:id", deleteMedico);
router.get("/datos/:id", getDisponibilidadesOrganizadas);
router.get("/calendario/:medicoId/:especialidadId", getCalendarioMedicoPorEspecialidad);



router.get("/especialidad/:especialidadId", buscarMedicosPorEspecialidadId);

router.get("/especialidadcompleto/:especialidadId", buscarMedicosPorEspecialidadIdcompleto);


export default router;
