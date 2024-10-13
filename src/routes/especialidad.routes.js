import express from "express";
import {
  createEspecialidad,
  getEspecialidades,
  getEspecialidad,
  updateEspecialidad,
  deleteEspecialidad
} from "../controllers/especialidad.controller.js";
import { checkAuth } from "../middlewares/auth.middlleware.js";
const router = express.Router();

router.post("/create", createEspecialidad);
router.get("/", getEspecialidades);
router.get("/:id", getEspecialidad);
router.put("/:id", updateEspecialidad);
router.delete("/:id", deleteEspecialidad);

export default router;
